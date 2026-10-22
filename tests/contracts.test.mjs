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

const settings = {version:'0.0.0',formatVersion:1,pageSize:48,cardSize:'medium',controlsExpanded:false,scrollIndicator:'auto',metadataExpanded:false,filter:'all',sort:'name',direction:'asc'};
test('master settings contract validates preferences and preserves compatible unknown fields', () => {
  const ajv = new Ajv2020({strict:true}).addKeyword('x-release-version').addSchema(schema);
  const valid = ajv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/settings'});
  assert.ok(valid(settings), JSON.stringify(valid.errors));
  assert.ok(valid({...settings,futurePreference:{enabled:true}}));
  for(const changed of [{...settings,pageSize:4},{...settings,pageSize:1000},{...settings,metadataExpanded:'yes'},{...settings,formatVersion:2},{...settings,version:'0.0.1'},{...settings,sort:'random'}]) assert.equal(valid(changed),false);
});

test('font scale contract accepts legacy settings and exactly three supported presets', () => {
  const ajv = new Ajv2020({strict:true}).addKeyword('x-release-version').addSchema(schema);
  const valid = ajv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/settings'});
  assert.ok(valid(settings), 'Existing settings without fontScale remain compatible');
  assert.equal(schema.$defs.settings.properties.fontScale?.default,100);
  for(const fontScale of [80,90,100]) assert.ok(valid({...settings,fontScale}), JSON.stringify(valid.errors));
  for(const fontScale of [0,79,95,101,80.5,-1,'90',null,true]) assert.equal(valid({...settings,fontScale}),false, 'Invalid fontScale '+JSON.stringify(fontScale));
});
