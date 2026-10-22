// SPDX-License-Identifier: Apache-2.0
// One queue combines image source/decode admission and video metadata probes.
export function createAdmissionQueue(limit = 4) {
  type Job = { start: (settled: () => void) => (() => void); cleanup?: () => void; priority: number; state: 'waiting' | 'active' | 'settled' | 'cancelled' };
  const jobs = new Set<Job>();
  const listeners = new Set<() => void>();
  let active = 0; let peak = 0; let disposed = false; let pumping = false;
  const notify = () => { for (const listener of listeners) listener(); };
  const pump = () => {
    if (pumping || disposed) return;
    pumping = true;
    try {
      while (active < limit) {
        const job = [...jobs].filter(candidate => candidate.state === 'waiting').sort((a, b) => a.priority - b.priority)[0];
        if (!job) break;
        job.state = 'active'; active += 1; peak = Math.max(peak, active);
        const settled = () => {
          if (job.state !== 'active') return;
          job.state = 'settled'; active -= 1; notify(); pump();
        };
        try { job.cleanup = job.start(settled); } catch (error) { settled(); throw error; }
      }
    } finally { pumping = false; notify(); }
  };
  const cancel = (job: Job) => {
    if (job.state === 'cancelled') return;
    const wasActive = job.state === 'active';
    job.state = 'cancelled';
    // Stop source work before allowing its replacement to acquire a slot.
    job.cleanup?.();
    if (wasActive) active -= 1;
    jobs.delete(job); notify(); pump();
  };
  return {
    request(start: Job['start'], priority = 0) {
      if (disposed) return () => {};
      const job: Job = { start, priority, state: 'waiting' };
      jobs.add(job); pump(); return () => cancel(job);
    },
    snapshot() { return { active, peak, pending: [...jobs].filter(job => job.state === 'waiting').length }; },
    subscribe(listener: () => void) { listeners.add(listener); listener(); return () => { listeners.delete(listener); }; },
    cancelAll() { disposed = true; for (const job of [...jobs]) cancel(job); },
  };
}
