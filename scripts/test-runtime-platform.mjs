// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root,node,environment} from './run.mjs';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
import {prepareRuntimeDesktop} from './runtime-environment.mjs';
import {validateRuntimeReceipt} from './runtime-evidence.mjs';
import {sourceIdentity} from './provenance.mjs';
requireIsolatedDesktop();
const source=await sourceIdentity();const suffix=process.platform==='win32'?'.exe':'';
let restore;
try{
 restore=await prepareRuntimeDesktop();
 const records=[];const fixture=JSON.parse(await readFile(path.join(root,'.local/runtime-fixture.json')));
 for(const edition of ['full','lite']){
  const binary=path.join(root,'.local/bin/local-media-gallery'+(edition==='lite'?'-lite':'')+'-native-tests'+suffix);
  await node(path.join(root,'scripts/test-runtime.mjs'),[],{env:{...environment,GALLERY_TEST_BINARY:binary,GALLERY_TEST_EDITION:edition}});
  const r=JSON.parse(await readFile(path.join(root,'.local/runtime-results-'+edition+'.json')));validateRuntimeReceipt(r,{source,binarySha256:r.binary.sha256,fixtureSha256:fixture.sha256,edition,platform:process.platform});records.push(r);
 }
 assert.deepEqual(await sourceIdentity(),source);
 await writeFile(path.join(root,'.local/runtime-results.json'),JSON.stringify({formatVersion:1,result:'pass',source,records,terminalFinished:new Date().toISOString()},null,2)+'\n');
}finally{
 await restore?.();
}
