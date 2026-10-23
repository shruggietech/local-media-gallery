// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import { qualification } from '../scripts/qualification.mjs';

test('qualification separates preparation and retains failed terminal step', async () => {
  let time = 0;
  const record = await qualification({ now: () => time, prepare: async () => { time += 100; }, steps: [{ name: 'failing', run: async () => { time += 50; throw new Error('broken'); } }] });
  assert.equal(record.result, 'fail'); assert.equal(record.preparationSeconds, 0.1); assert.equal(record.qualificationSeconds, 0.05); assert.equal(record.combinedSeconds, 0.15);
  assert.equal(record.steps[0].result, 'fail'); assert.equal(record.steps[0].failure, 'broken'); assert.ok(record.steps[0].terminalFinished);
});

test('deadline prevents later admission and late success is not on-time success', async () => {
  let time = 0; let admitted = false;
  const record = await qualification({ now: () => time, prepare: async () => {}, hardLimitSeconds: 1, reserveSeconds: 0.1, steps: [{ name: 'late', run: async () => { time = 1200; } }, { name: 'never', run: async () => { admitted = true; } }] });
  assert.equal(admitted, false); assert.equal(record.result, 'timeout'); assert.equal(record.steps[0].result, 'timeout'); assert.equal(record.steps[1].result, 'not-run');
});

test('preparation failures do not claim qualification readiness', async () => {
  const context = { revision: 'abc123', source: { sha256: 'digest' } };
  const record = await qualification({ identify: async () => context, prepare: async () => { throw new Error('missing tool'); }, steps: [] });
  assert.equal(record.readinessVerified, null); assert.equal(record.result, 'preparation-failed'); assert.equal(record.qualificationSeconds, 0);
  assert.deepEqual(record.context, context, 'Preparation failure must retain source identity');
});
