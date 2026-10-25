// SPDX-License-Identifier: Apache-2.0
// Preparation is shared; settled jobs still own cleanup of retained sources.
export type LoadOutcome = 'success' | 'failure';
type Options = { now?: () => number; onOutcome?: (event: { duration: number; outcome: LoadOutcome }) => void; onStart?: () => ((duration: number, outcome: LoadOutcome) => void) };
export function createAdmissionQueue(initialLimit = 4, options: Options = {}) {
  type Job = { start: (settled: (outcome?: LoadOutcome) => void) => (() => void); cleanup?: () => void; report?: (duration: number, outcome: LoadOutcome) => void; priority: number; priorityNow?: () => number; started: number; state: 'waiting' | 'active' | 'settled' | 'cancelled' };
  const validLimit = (value: number) => { if (!Number.isInteger(value) || value < 1 || value > 4) throw new RangeError('Preparation allowance must be1..4'); return value; };
  const now = options.now ?? (() => performance.now());
  const jobs = new Set<Job>(); const listeners = new Set<() => void>();
  let limit = validLimit(initialLimit); let active = 0; let peak = 0; let errors = 0; let disposed = false; let pumping = false; let paused = false;
  const notify = () => { for (const listener of listeners) listener(); };
  const cleanup = (job: Job) => { const release = job.cleanup; job.cleanup = undefined; try { release?.(); } catch { errors += 1; } };
  const pump = () => {
    if (pumping || disposed || paused) return;
    pumping = true;
    try {
      while (!disposed && !paused && active < limit) {
        let job: Job | undefined;
        for (const candidate of jobs) if (candidate.state === 'waiting') {
          try { const value = candidate.priorityNow?.(); if (value !== undefined && Number.isFinite(value)) candidate.priority = value; } catch { errors += 1; }
          if (!job || candidate.priority < job.priority) job = candidate;
        }
        if (!job) break;
        const admitted = job; admitted.state = 'active'; admitted.started = now(); active += 1; peak = Math.max(peak, active);
        const settled = (outcome: LoadOutcome = 'success') => {
          if (admitted.state !== 'active') return;
          admitted.state = 'settled'; active -= 1;
          const duration = Math.max(0, now() - admitted.started);
          try { admitted.report?.(duration, outcome); options.onOutcome?.({ duration, outcome }); } catch { errors += 1; }
          notify(); pump();
        };
        try { admitted.report = options.onStart?.(); admitted.cleanup = admitted.start(settled); }
        catch { errors += 1; settled('failure'); }
        // Start may synchronously retire the queue before returning its cleanup.
        if ((admitted as Job).state === 'cancelled') cleanup(admitted);
      }
    } finally { pumping = false; notify(); }
  };
  const cancel = (job: Job) => {
    if (job.state === 'cancelled') return;
    const wasActive = job.state === 'active'; job.state = 'cancelled';
    // Release sources before replacement admission, even when cleanup throws.
    try { cleanup(job); } finally { if (wasActive) active -= 1; jobs.delete(job); notify(); pump(); }
  };
  return {
    request(start: Job['start'], priority: number | (() => number) = 0) {
      const job: Job = { start, priority: typeof priority === 'number' && Number.isFinite(priority) ? priority : 0, priorityNow: typeof priority === 'function' ? priority : undefined, started: 0, state: disposed ? 'cancelled' : 'waiting' };
      const release = Object.assign(() => cancel(job), { reprioritize(value: number) { if (job.state === 'waiting' && Number.isFinite(value)) { job.priority = value; job.priorityNow = undefined; pump(); } } });
      if (!disposed) { jobs.add(job); pump(); }
      return release;
    },
    setLimit(value: number) { limit = validLimit(value); pump(); },
    setPaused(value: boolean) { paused = value; if (!paused) pump(); else notify(); },
    snapshot() {
      let pending = 0; let oldestMs = 0;
      for (const job of jobs) { if (job.state === 'waiting') pending += 1; if (job.state === 'active') oldestMs = Math.max(oldestMs, now() - job.started); }
      return { active, peak, pending, oldestMs, limit, paused, errors };
    },
    subscribe(listener: () => void) { listeners.add(listener); listener(); return () => { listeners.delete(listener); }; },
    cancelAll() { disposed = true; for (const job of [...jobs]) cancel(job); },
  };
}
