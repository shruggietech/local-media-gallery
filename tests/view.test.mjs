// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import { viewItems, naturalCompare, reconcileSelection, mediaUrl, formatBytes } from '../apps/gallery/src/lib/view.ts';

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
