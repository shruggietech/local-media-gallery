// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptSnapshot, anchoredPage, viewItems } from '../apps/gallery/src/lib/view.ts';

const item = (id, size = id) => ({ id, name: `image${id}.jpg`, kind: 'image', size, modifiedMs: '0', revision: id, stale: false });
test('global publication sequence rejects retired roots and command responses exactly', () => {
  const current = { sequence: '9007199254740993', sessionId: 'new' };
  assert.equal(acceptSnapshot(current, { sequence: '9007199254740992', sessionId: 'old' }), false);
  assert.equal(acceptSnapshot(current, { sequence: '9007199254740994', sessionId: null }), true);
  assert.equal(acceptSnapshot(current, { sequence: '9007199254740993', sessionId: 'new' }), true);
});
test('incremental collection-wide sorting keeps the surviving page anchor visible', () => {
  const before = [4, 5, 6, 7, 8, 9].map(n => item(String(n)));
  const next = viewItems([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => item(String(n))), 'all', 'size', 'desc');
  const previous = viewItems(before, 'all', 'size', 'desc');
  const anchored = anchoredPage(previous, next, 2, 2, null, '7');
  assert.equal(anchored.anchor, '7'); assert.equal(anchored.page, 2);
  const ascending = viewItems(next, 'all', 'name', 'asc');
  assert.equal(anchoredPage(before, ascending, 2, 2, null, '6').page, 4);
  assert.equal(anchoredPage(before, ascending, 2, 2, '8', '6').page, 5);
});
test('anchor removal selects nearest surviving old neighbor and handles empty view', () => {
  const before = [0, 1, 2, 3, 4, 5].map(n => item(String(n)));
  const next = before.filter(x => !['2', '3'].includes(x.id));
  const result = anchoredPage(before, next, 2, 2, null, '2');
  assert.equal(result.anchor, '1'); assert.equal(result.removed, true); assert.equal(result.page, 1);
  assert.deepEqual(anchoredPage(before, [], 3, 2, null, '4'), { page: 1, anchor: null, removed: true });
});
