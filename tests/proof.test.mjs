// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {thirdPartyPackages,collectPayload,verifyPayload,validateProof} from '../scripts/proof.mjs';
const base=new URL('../.local/',import.meta.url);
test('proof inventory rejects mutation, extras and unsafe relative entries',async t=>{
 const dir=await mkdtemp(path.join(base.pathname.replace(/^\/([A-Za-z]:)/,'$1'),'proof-unit-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));await mkdir(path.join(dir,'bin'));await writeFile(path.join(dir,'bin','gallery'),'original');
 const entries=await collectPayload(dir);assert.equal(entries.length,1);assert.equal(entries[0].bytes,'8');await verifyPayload(dir,entries);
 await writeFile(path.join(dir,'bin','gallery'),'mutated');await assert.rejects(verifyPayload(dir,entries));await writeFile(path.join(dir,'bin','gallery'),'original');await writeFile(path.join(dir,'extra'),'x');await assert.rejects(verifyPayload(dir,entries));
 await assert.rejects(verifyPayload(dir,[{...entries[0],path:'../outside'}]));
});
test('proof evidence never coerces unknown runtime or installer footprint to zero',()=>{
 const good={formatVersion:1,version:'0.0.0',edition:'full',source:{sha256:'a'.repeat(64),files:1},revision:'b'.repeat(40),binary:{sha256:'c'.repeat(64),bytes:'12'},archive:{sha256:'d'.repeat(64),bytes:'9'},payload:[{path:'bin/gallery',sha256:'c'.repeat(64),bytes:'12',mode:null}],footprints:{archive:{status:'measured',bytes:'9',basis:'proof archive'},extracted:{status:'measured',bytes:'12',basis:'owned payload logical bytes'},runtime:{status:'unavailable',bytes:null,basis:'not attributable'},installer:{status:'unavailable',bytes:null,basis:'not produced'},optionalTools:{status:'not-applicable',bytes:null,basis:'not bundled'}}};
 validateProof(good);assert.throws(()=>validateProof({...good,footprints:{...good.footprints,runtime:{status:'unavailable',bytes:'0',basis:'unknown'}}}));assert.throws(()=>validateProof({...good,binary:{...good.binary,bytes:12}}));
});

test('License inventory includes vendored path dependencies and excludes owned workspace crates',()=>{
 const registry={id:'registry+glib-sys',source:'registry+crates.io'},vendored={id:'path+vendor/glib',source:null},owned={id:'path+gallery-core',source:null};
 assert.deepEqual(thirdPartyPackages({packages:[registry,vendored,owned],workspace_members:[owned.id]}),[registry,vendored]);
 assert.throws(()=>thirdPartyPackages({packages:[registry]}));
});
