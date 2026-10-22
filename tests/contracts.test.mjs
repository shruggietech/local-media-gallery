// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';

const schema = JSON.parse(await readFile(new URL('../schemas/v0.0.0/local-media-gallery.schema.json', import.meta.url)));
const validate = new Ajv2020({ strict: true }).addKeyword('x-release-version').compile(schema);
const snapshot = {
  version: '0.0.0', sessionId: 'a'.repeat(32), root: 'A gallery', status: 'complete', revision: '1', mediaOrigin: 'http://127.0.0.1:1234', issues: [],
  items: [{ id: 'b'.repeat(32), revision: 'c'.repeat(32), name: 'photo.jpg', relativePath: 'photo.jpg', kind: 'image', mime: 'image/jpeg', size: '18446744073709551615', modifiedMs: '-1', issue: null }],
};
test('master snapshot contract preserves exact native integer facts and version identity', () => {
  assert.ok(validate(snapshot), JSON.stringify(validate.errors));
  assert.equal(schema['x-release-version'], '0.0.0');
  for (const changed of [
    { ...snapshot, version: '0.0.1' },
    { ...snapshot, mediaOrigin: 'http://0.0.0.0:1234' },
    { ...snapshot, items: [{ ...snapshot.items[0], size: 9007199254740992 }] },
  ]) assert.equal(validate(changed), false);
});
