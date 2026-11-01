// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {root} from '../scripts/run.mjs';
import {fileInventory} from '../scripts/release-docs.mjs';
import {productVersion} from '../scripts/product-version.mjs';
import {PRODUCT_VERSION} from '../apps/gallery/src/lib/product-version.ts';
import {defaults} from '../apps/gallery/src/lib/use-gallery-state.ts';
import {preparationValidators} from '../scripts/preparation-acceptance.mjs';
test('Every retained baseline source, schema and captured-reference byte remains unchanged',async()=>{
 const expected=JSON.parse(await readFile(new URL('./fixtures/releases/baseline-inventory.json',import.meta.url),'utf8'));const actual=[];for(const dir of ['docs/v0.0.0','schemas/v0.0.0','site/snapshots/v0.0.0'])actual.push(...await fileInventory(root,dir));actual.sort((a,b)=>a.path.localeCompare(b.path,'en'));assert.deepEqual(actual,expected.files);
});
test('Frontend metadata and initial settings share the native elected product version',()=>{
 assert.equal(PRODUCT_VERSION,productVersion);assert.equal(defaults.version,productVersion);assert.equal(defaults.formatVersion,1);
});
test('Preparation diagnostics use the elected version schema, with no baseline fallback',async t=>{
 const base=await mkdtemp(path.join(root,'.local/preparation-schema-'));t.after(()=>rm(base,{recursive:true,force:true}));const version='1.2.3';const schema=JSON.parse(await readFile(path.join(root,'schemas/v0.0.0/local-media-gallery.schema.json'),'utf8'));schema.$id='urn:local-media-gallery:'+version;schema['x-release-version']=version;schema.properties.version.const=version;const directory=path.join(base,'schemas/v'+version);await mkdir(directory,{recursive:true});schema.$defs.diagnosticReport={type:'object',additionalProperties:false,required:['version'],properties:{version:{const:version}}};await writeFile(path.join(directory,'local-media-gallery.schema.json'),JSON.stringify(schema));const {validReport}=await preparationValidators({base,version});assert.ok(validReport({version}));assert.equal(validReport({version:'0.0.0'}),false);await assert.rejects(preparationValidators({base,version:'1.2.4'}),/ENOENT/);
});
