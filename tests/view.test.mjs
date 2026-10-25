// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdmissionQueue } from '../apps/gallery/src/lib/admission.ts';
import { viewItems, naturalCompare, reconcileSelection, mediaUrl, formatBytes, pageItems, masonryLayout } from '../apps/gallery/src/lib/view.ts';

const item = (id, name, kind = 'image', size = '10', modifiedMs = '100') => ({
  id, name, kind, size, modifiedMs, revision: `rev-${id}`, relativePath: name,
  mime: kind === 'image' ? 'image/jpeg' : 'video/mp4', issue: null,
});
const items = [item('a', 'Image10.jpg'), item('b', 'image2.jpg'), item('c', 'clip.mp4', 'video'), item('d', 'unknown.tiff', 'image', null, null)];

test('natural name sorting is stable and case insensitive with exact tie breaks', () => {
  assert.deepEqual(viewItems(items, 'all', 'name', 'asc').map(x => x.id), ['c', 'b', 'a', 'd']);
  assert.ok(naturalCompare('frame2.jpg', 'frame10.jpg') < 0);
  assert.ok(naturalCompare('A.jpg', 'a.jpg') < 0);
  assert.ok(naturalCompare('frame99999999999999999999.jpg', 'frame100000000000000000000.jpg') < 0);
});

test('type filters and both directions retain missing facts last', () => {
  assert.equal(viewItems(items, 'image', 'name', 'asc').length, 3);
  assert.deepEqual(viewItems(items, 'video', 'name', 'asc').map(x => x.id), ['c']);
  for (const sort of ['size', 'modified']) for (const direction of ['asc', 'desc']) {
    assert.equal(viewItems(items, 'all', sort, direction).at(-1).id, 'd');
  }
  assert.equal(items[0].id, 'a', 'view sorting must not mutate the native snapshot');
});

test('integer facts are compared without JavaScript number rounding', () => {
  const large = [item('a', 'A.jpg', 'image', '9007199254740993'), item('z', 'Z.jpg', 'image', '9007199254740992')];
  assert.deepEqual(viewItems(large, 'all', 'size', 'asc').map(x => x.id), ['z', 'a']);
  assert.equal(formatBytes('18446744073709551615'), '18,446,744,073,709,551,615 bytes');
});

test('selection follows current results and disappears explicitly', () => {
  assert.equal(reconcileSelection('a', items), 'a');
  assert.equal(reconcileSelection('missing', items), null);
  assert.equal(reconcileSelection(null, items), null);
});

test('media URLs contain only opaque session and item values', () => {
  const snapshot = { sessionId: 'session-token', mediaOrigin: 'http://127.0.0.1:1234' };
  const url = mediaUrl(snapshot, item('opaque', '<img # %.jpg'));
  assert.equal(url, 'http://127.0.0.1:1234/media/session-token/opaque/rev-opaque');
  assert.ok(!url.includes('img'));
});


test('paging follows full sorting/filtering and clamps empty and removed pages', () => {
  const collection = Array.from({ length: 11 }, (_, i) => item(String(i), 'image'+i+'.jpg', i % 3 ? 'image' : 'video', String(i)));
  const sorted = viewItems(collection, 'all', 'size', 'desc');
  assert.deepEqual(pageItems(sorted, 2, 4).items.map(x => x.size), ['6', '5', '4', '3']);
  assert.equal(pageItems(sorted, 99, 4).page, 3);
  assert.equal(pageItems(sorted, -4, 4).page, 1);
  assert.deepEqual(pageItems([], 8, 48), { items: [], page: 1, pages: 1, start: 0, end: 0 });
  assert.equal(pageItems(viewItems(collection, 'video', 'size', 'desc'), 2, 4).page, 1);
  for (const size of [4, 24, 48, 96]) assert.ok(pageItems(sorted, 1, size).items.length <= size);
});

test('masonry fills shortest columns without reordering and keeps exact gaps', () => {
  const layout = masonryLayout(624, 200, [300, 100, 200, 60, 80, 90]);
  assert.equal(layout.columns, 3);
  assert.equal(layout.width, 200);
  assert.deepEqual(layout.positions.map(p => p.column), [0, 1, 2, 1, 1, 2]);
  assert.deepEqual(layout.positions.map(p => [p.x, p.y]), [[0,0], [212,0], [424,0], [212,112], [212,184], [424,212]]);
  assert.equal(layout.height, 302);
  assert.equal(masonryLayout(120, 200, [30,40]).positions[1].y, 42);
  assert.deepEqual(masonryLayout(0, 200, []).positions, []);
});

test('combined media queue admits four deferred loads and releases cancellation before replacement', async () => {
  const queue = createAdmissionQueue(4);
  const pending = []; const controls = []; const sequence = [];
  let live = 0; let peak = 0;
  for (let i = 0; i < 9; i++) {
    const deferred = Promise.withResolvers(); pending.push(deferred);
    controls.push(queue.request(done => {
      live += 1; peak = Math.max(peak, live); sequence.push('start'+i);
      let active = true;
      const finish = () => { if (active) { active = false; live -= 1; } };
      void deferred.promise.then(() => { finish(); done(); });
      return () => { sequence.push('cancel'+i); finish(); };
    }));
  }
  assert.equal(live, 4); assert.equal(queue.snapshot().active, 4);
  controls[0]();
  assert.equal(live, 4);
  assert.ok(sequence.indexOf('cancel0') < sequence.indexOf('start4'));
  pending[1].resolve(); await Promise.resolve();
  assert.equal(live, 4);
  queue.cancelAll();
  assert.equal(live, 0); assert.equal(queue.snapshot().active, 0);
  assert.equal(queue.snapshot().pending, 0); assert.equal(peak, 4); assert.equal(queue.snapshot().peak, 4);
  for (const deferred of pending) deferred.resolve(); await Promise.resolve();
  assert.equal(live, 0, 'late responses must not reopen obsolete loads');
  queue.request(() => { throw new Error('a disposed queue must not start'); });
});

test('queued visible work wins priority and queued cancellation never starts', () => {
  const queue = createAdmissionQueue(1); const started = []; let release;
  queue.request(done => { release = done; started.push('active'); return () => {}; });
  const cancel = queue.request(() => { started.push('obsolete'); return () => {}; }, 0);
  queue.request(() => { started.push('nearby'); return () => {}; }, 20);
  queue.request(() => { started.push('visible'); return () => {}; }, 1);
  cancel(); release();
  assert.deepEqual(started, ['active', 'visible']);
  queue.cancelAll();
});

test('dynamic admission drains lower caps, reprioritizes waiting work and pauses new work', () => {
  const queue = createAdmissionQueue(4); const done = []; const started = [];
  for (let i = 0; i < 4; i++) queue.request(finish => { started.push(i); done.push(finish); return () => {}; });
  queue.setLimit(1);
  const distant = queue.request(() => { started.push('distant'); return () => {}; }, 100);
  queue.request(() => { started.push('visible'); return () => {}; }, 0);
  distant.reprioritize(-1);
  for (let i = 0; i < 3; i++) done[i]();
  assert.equal(started.length, 4);
  queue.setPaused(true); done[3](); assert.equal(started.length, 4);
  queue.setPaused(false); assert.equal(started.at(-1), 'distant');
  assert.throws(() => queue.setLimit(5)); assert.throws(() => queue.setLimit(NaN));
  queue.cancelAll(); assert.equal(queue.snapshot().active, 0);
});

test('throwing cleanup or start and synchronous retirement preserve accounting and ownership', () => {
  let cleaned = 0; const outcomes = [];
  const queue = createAdmissionQueue(1, { onOutcome: event => outcomes.push(event) });
  const cancel = queue.request(() => () => { cleaned++; throw Error('cleanup failure'); });
  let replacement = false;
  queue.request(done => { replacement = true; done(); return () => { cleaned++; }; });
  cancel(); cancel(); assert.equal(replacement, true); assert.equal(queue.snapshot().active, 0);
  queue.request(() => { throw Error('start failure'); });
  queue.cancelAll(); assert.equal(cleaned, 2);
  assert.equal(outcomes.filter(e => e.outcome === 'failure').length, 1);
  const retired = createAdmissionQueue(1); let lateCleanup = 0;
  retired.request(() => { retired.cancelAll(); return () => { lateCleanup++; }; });
  assert.equal(lateCleanup, 1); assert.equal(retired.snapshot().active, 0);
});

test('queue reports actual held age, outcomes once and ignores cancelled late completion', () => {
  let time = 0; let finish; const events = [];
  const queue = createAdmissionQueue(1, { now: () => time, onOutcome: e => events.push(e) });
  const cancel = queue.request(done => { finish = done; return () => {}; });
  time = 1200; assert.equal(queue.snapshot().oldestMs, 1200);
  finish('failure'); finish(); assert.deepEqual(events, [{ duration: 1200, outcome: 'failure' }]);
  cancel(); assert.equal(queue.snapshot().active, 0);
  queue.request(done => { finish = done; return () => {}; }); queue.cancelAll(); finish();
  assert.equal(events.length, 1);
});

test('waiting viewport priority is evaluated at admission after geometry changes', () => {
  const q = createAdmissionQueue(1); let finish; let a = 0; let b = 100; const started = [];
  q.request(done => { finish = done; return () => {}; });
  q.request(() => { started.push('a'); return () => {}; }, () => a);
  q.request(() => { started.push('b'); return () => {}; }, () => b);
  a = 100; b = 0; finish(); assert.deepEqual(started, ['b']); q.cancelAll();
});
