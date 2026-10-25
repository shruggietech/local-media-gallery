// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadingPolicy } from '../apps/gallery/src/lib/loading-policy.ts';

const window = (policy, at, duration = 20, outcome = 'success', work = {}) => {
  for (let i = 0; i < 4; i++) policy.observe()(duration, outcome);
  for (let i = 0; i < 12; i++) policy.frame(16);
  policy.evaluate({ at, active: 1, pending: 1, oldestMs: 0, visible: true, ...work });
};

test('automatic pressure is sustained, recovery gradual and finite', () => {
  const p = createLoadingPolicy('automatic', 0);
  assert.equal(p.snapshot().limit, 4);
  window(p, 250, 600); assert.equal(p.snapshot().limit, 4);
  window(p, 500, 600); assert.equal(p.snapshot().limit, 2);
  window(p, 750, 600); window(p, 1000, 600); assert.equal(p.snapshot().limit, 1);
  for (const at of [1250, 1500, 1750]) window(p, at);
  assert.equal(p.snapshot().limit, 1); window(p, 2000); assert.equal(p.snapshot().limit, 2);
  for (const at of [2250, 2500, 2750, 3000]) window(p, at);
  assert.equal(p.snapshot().limit, 4);
});

test('held age, frame gaps and repeated failures can create pressure without a slow successful completion', () => {
  for (const signal of ['held', 'frames', 'failure']) {
    const p = createLoadingPolicy('automatic', 0);
    for (const at of [250, 500]) {
      if (signal === 'frames') for (let i = 0; i < 12; i++) p.frame(80);
      if (signal === 'failure') for (let i = 0; i < 4; i++) p.observe()(10, 'failure');
      p.evaluate({ at, active: 1, pending: 2, oldestMs: signal === 'held' ? 1500 : 0, visible: true });
    }
    assert.equal(p.snapshot().limit, 2, signal);
  }
});

test('idle windows cannot recover, hidden gaps do not count and observation storage is bounded', () => {
  const p = createLoadingPolicy('automatic', 0);
  window(p, 250, 600); window(p, 500, 600);
  for (let at = 750; at <= 2500; at += 250) p.evaluate({ at, active: 0, pending: 0, oldestMs: 0, visible: true });
  assert.equal(p.snapshot().limit, 2);
  for (let i = 0; i < 300; i++) { p.observe()(10, 'success'); p.frame(16); }
  assert.ok(p.snapshot().sampleCount <= 32); assert.ok(p.snapshot().frameCount <= 120);
  p.evaluate({ at: 2750, active: 1, pending: 2, oldestMs: 5000, visible: false });
  assert.equal(p.snapshot().limit, 2); assert.equal(p.snapshot().sampleCount, 0);
  p.frame(5000); assert.equal(p.snapshot().frameCount, 0);
});

test('manual modes ignore pressure and retired/mode observations cannot tune current policy', () => {
  for (const [mode, limit] of [['conservative', 2], ['standard', 4]]) {
    const p = createLoadingPolicy(mode, 0);
    for (let at = 250; at <= 2000; at += 250) window(p, at, 2000, 'failure');
    assert.equal(p.snapshot().limit, limit);
  }
  const p = createLoadingPolicy('automatic', 0); const old = p.observe();
  p.retire(100); old(2000, 'failure'); assert.equal(p.snapshot().sampleCount, 0);
  const beforeMode = p.observe(); p.setMode('conservative', 200); beforeMode(2000, 'failure');
  assert.equal(p.snapshot().sampleCount, 0); assert.equal(p.snapshot().limit, 2);
  p.setMode('automatic', 300); assert.equal(p.snapshot().limit, 4);
});

test('sparse slow frame evidence accumulates across evaluation windows rather than disappearing', () => {
  const p = createLoadingPolicy('automatic', 0);
  for (let at = 250; at <= 2000; at += 250) {
    p.frame(100); p.frame(100);
    p.evaluate({ at, active: 1, pending: 3, oldestMs: 0, visible: true });
  }
  assert.equal(p.snapshot().limit, 2);
  p.frame(100); p.frame(5000); assert.equal(p.snapshot().frameCount, 0);
});
