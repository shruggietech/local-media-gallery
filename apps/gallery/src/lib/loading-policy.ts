// SPDX-License-Identifier: Apache-2.0
import type { LoadOutcome } from './admission';
export type LoadingMode = 'automatic' | 'conservative' | 'standard';
const limits = [1, 2, 4] as const;
const margins = [0, 10, 25] as const;
export function createLoadingPolicy(initialMode: LoadingMode = 'automatic', initialAt = 0) {
  let mode = initialMode; let tier = mode === 'conservative' ? 1 : 2;
  let generation = 0; let lastAt = initialAt; let pressureWindows = 0; let healthyWindows = 0;
  let reason = mode === 'automatic' ? 'initial' : 'manual';
  let completed: { duration: number; outcome: LoadOutcome }[] = []; let frames: number[] = [];
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of listeners) listener(); };
  const clearWindow = (at: number) => { lastAt = at; completed = []; frames = []; pressureWindows = 0; healthyWindows = 0; };
  return {
    snapshot() { return { mode, limit: limits[tier], margin: margins[tier], reason, generation, sampleCount: completed.length, frameCount: frames.length }; },
    observe() {
      const epoch = generation;
      return (duration: number, outcome: LoadOutcome) => { if (epoch !== generation || mode !== 'automatic' || !Number.isFinite(duration) || duration < 0) return; completed.push({ duration, outcome }); if (completed.length > 32) completed.shift(); };
    },
    frame(gap: number) { if (mode !== 'automatic' || !Number.isFinite(gap) || gap <= 0) return; if (gap > 1000) { frames = []; return; } frames.push(gap); if (frames.length > 120) frames.shift(); },
    evaluate({ at, active, pending, oldestMs, visible }: { at: number; active: number; pending: number; oldestMs: number; visible: boolean }) {
      if (!Number.isFinite(at) || at < lastAt) return;
      if (!visible) { generation += 1; clearWindow(at); return; }
      if (mode !== 'automatic' || at - lastAt < 250) return;
      const samples = completed; const gaps = frames.length >= 8 ? frames : []; completed = []; if (gaps.length) frames = []; lastAt = at;
      const busy = active > 0 || pending > 0 || samples.length > 0;
      if (!busy) { frames = []; pressureWindows = 0; healthyWindows = 0; return; }
      if (!samples.length && !gaps.length && !(active > 0 && oldestMs > 1000)) return;
      const failures = samples.filter(s => s.outcome === 'failure').length;
      const slow = samples.length >= 4 && samples.filter(s => s.duration > 500).length >= Math.ceil(samples.length / 2);
      const failed = samples.length >= 4 && failures >= 2 && failures / samples.length >= 0.25;
      const ordered = gaps.toSorted((a, b) => a - b);
      const framesSlow = ordered.length >= 8 && ordered[Math.ceil(ordered.length * 0.95) - 1] > 50;
      const pressure = slow || failed || framesSlow || active > 0 && oldestMs > 1000;
      const healthy = samples.length > 0 && failures === 0 && samples.every(s => s.duration <= 500) && !pressure;
      if (pressure) { pressureWindows += 1; healthyWindows = 0; }
      else if (healthy) { healthyWindows += 1; pressureWindows = 0; }
      else { pressureWindows = 0; healthyWindows = 0; }
      if (pressureWindows >= 2) { const previous = tier; tier = Math.max(0, tier - 1); reason = 'pressure'; pressureWindows = 0; if (tier !== previous) notify(); }
      else if (healthyWindows >= 4) { const previous = tier; tier = Math.min(2, tier + 1); reason = 'recovery'; healthyWindows = 0; if (tier !== previous) notify(); }
    },
    setMode(value: LoadingMode, at: number) { if (!['automatic', 'conservative', 'standard'].includes(value)) throw new Error('Unknown loading mode'); if (value === mode) return; mode = value; tier = value === 'conservative' ? 1 : 2; reason = value === 'automatic' ? 'initial' : 'manual'; generation += 1; clearWindow(at); notify(); },
    retire(at: number) { generation += 1; clearWindow(at); },
    subscribe(listener: () => void) { listeners.add(listener); listener(); return () => { listeners.delete(listener); }; },
  };
}
