// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
import {root,node,environment} from './run.mjs';
import {sourceIdentity} from './provenance.mjs';
import {digest} from './runtime-evidence.mjs';
requireIsolatedDesktop();
assert.equal(process.platform,'win32');
assert.match(process.env.GALLERY_DIAGNOSTIC_RUN??'',/^[1-9][0-9]*$/);
const input=path.join(root,'.local/diagnostic-input');
const prior=JSON.parse(await readFile(path.join(input,'ci-product-windows.json')));
const receipt={kind:'isolated-legacy-windows-diagnostic',acceptance:false,artifactRun:process.env.GALLERY_DIAGNOSTIC_RUN,artifactSource:prior.context.source,harnessSource:await sourceIdentity(),binaries:{},checks:[],started:new Date().toISOString()};
const binaries={full:path.join(input,'bin/local-media-gallery-native-tests.exe'),lite:path.join(input,'bin/local-media-gallery-lite-native-tests.exe')};
try{
 for(const edition of ['full','lite']){
  const record=JSON.parse(await readFile(path.join(input,'runtime-results-'+edition+'.json')));
  const bytes=await readFile(binaries[edition]);assert.equal(digest(bytes),record.binary.sha256);assert.equal(String(bytes.length),record.binary.bytes);assert.deepEqual(record.source,prior.context.source);
  receipt.binaries[edition]=record.binary;
 }
 await node(path.join(root,'scripts/create-fixture.mjs'));
 for(const [script,args] of [['test-native.mjs',[]],['test-preparation.mjs',[]],['test-launch.mjs',['--full',binaries.full,'--lite',binaries.lite]],['measure-native.mjs',['--binary',binaries.full,'--label','adaptive','--output',path.join(root,'.local/measurement.json')]]]){
  await node(path.join(root,'scripts',script),args,{env:{...environment,GALLERY_TEST_BINARY:binaries.full}});receipt.checks.push(script);
 }
 for(const edition of ['full','lite'])assert.equal(digest(await readFile(binaries[edition])),receipt.binaries[edition].sha256);
 receipt.result='diagnostic-pass';
}catch(error){receipt.result='diagnostic-fail';receipt.failure=error.stack;process.exitCode=1;}
finally{receipt.terminalFinished=new Date().toISOString();await writeFile(path.join(root,'.local/legacy-diagnostic.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));}
