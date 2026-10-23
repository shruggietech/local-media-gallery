// SPDX-License-Identifier: Apache-2.0
import { setExecutionDeadline } from './run.mjs';

export async function qualification({ identify = async () => undefined, prepare, steps, now = Date.now, targetSeconds = 660, hardLimitSeconds = 900, reserveSeconds = 15 }) {
  const started = now(); const timestamp = value => new Date(value).toISOString();
  const record = { preparationStarted: timestamp(started), readinessVerified: null, terminalFinished: null, preparationSeconds: 0, qualificationSeconds: 0, combinedSeconds: 0, targetSeconds, hardLimitSeconds, provisionalFinalizationReserveSeconds: reserveSeconds, targetAdvisory: false, result: 'preparation-failed', steps: steps.map(step => ({ name: step.name, result: 'not-run' })), failure: null };
  let ready = null;
  try {
    record.context = await identify();
    const prepared = await prepare(record.context);
    if (prepared !== undefined) record.context = { ...record.context, ...prepared };
    ready = now(); record.readinessVerified = timestamp(ready); record.result = 'pass';
    const deadline = ready + (hardLimitSeconds - reserveSeconds) * 1000;
    // The real process runner terminates the child tree before finalization reserve.
    if (now === Date.now) setExecutionDeadline(deadline);
    for (const [index, step] of steps.entries()) {
      if (now() >= deadline) { record.result = 'timeout'; record.failure = 'Qualification finalization reserve reached'; break; }
      const entry = record.steps[index]; entry.started = timestamp(now());
      try {
        await step.run();
        entry.result = now() >= deadline ? 'timeout' : 'pass';
        if (entry.result === 'timeout') throw new Error('Qualification deadline reached at terminal completion');
      } catch (error) {
        entry.result = /deadline|timeout/i.test(error.message) ? 'timeout' : 'fail'; entry.failure = error.message;
        record.result = entry.result; record.failure = error.message;
      } finally { entry.terminalFinished = timestamp(now()); }
      if (record.result !== 'pass') break;
    }
  } catch (error) { record.failure = error.message; }
  finally { setExecutionDeadline(null); }
  const finished = now();
  record.terminalFinished = timestamp(finished);
  record.preparationSeconds = ((ready ?? finished) - started) / 1000;
  record.qualificationSeconds = ready === null ? 0 : (finished - ready) / 1000;
  record.combinedSeconds = (finished - started) / 1000;
  record.targetAdvisory = record.qualificationSeconds > targetSeconds;
  if (record.qualificationSeconds > hardLimitSeconds) { record.result = 'timeout'; record.failure ??= 'Qualification exceeded hard limit'; }
  return record;
}
