// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,cp,rm} from 'node:fs/promises';
import path from 'node:path';
import {root} from '../scripts/run.mjs';
import {documentationFixture} from './fixtures/releases/documentation.mjs';
import {createModel} from '../scripts/site-content.mjs';
test('Controlled documentation fixtures isolate a real pending same-version snapshot and published pointer',async t=>{
 const dir=await mkdtemp(path.join(root,'.local/release-doc-fixture-'));t.after(()=>rm(dir,{recursive:true,force:true}));const renderer=path.join(dir,'renderer'),output=path.join(dir,'output');await mkdir(renderer);await mkdir(output);
 for(const name of ['CHANGELOG.md','SECURITY.md','LICENSE','docs/v0.0.0','schemas/v0.0.0','site/snapshots/v0.0.0'])await cp(path.join(root,name),path.join(renderer,name),{recursive:true});
 const manifest=JSON.parse(await readFile(path.join(root,'site/versions.json'),'utf8'));const baseline=manifest.snapshots.find(s=>s.version==='v0.0.0');await mkdir(path.join(renderer,'site'),{recursive:true});await writeFile(path.join(renderer,'site/versions.json'),JSON.stringify({latest:'v0.1.0',releaseRecord:'site/published-release.json',snapshots:[baseline,{version:'v0.1.0',status:'released',source:'docs/v0.1.0',topics:['index']}]}));
 const controlled=await documentationFixture(renderer,output,'b'.repeat(40));assert.equal(controlled.latest,'v0.0.0');assert.equal(Object.hasOwn(controlled,'releaseRecord'),false);assert.deepEqual(controlled.snapshots.map(s=>s.version),['v0.0.0','v0.1.0','v0.2.0']);const model=await createModel(output,controlled);assert.ok(model.pages.some(p=>p.version==='v0.1.0'&&p.topic==='old-only'));assert.equal(model.release,null);
});
