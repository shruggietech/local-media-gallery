// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from './run.mjs';
import {validateRelease,validateGate,attachGate,canonical} from './release-record.mjs';
import {qualifyDocumentation} from './release-docs.mjs';
import {validateManifest} from './site-content.mjs';
import {portablePath} from './windows-packages.mjs';
export function validateCandidateDocumentation(receipt,record,options={}){
 validateRelease(record,options);assert.equal(record.state,'candidate');assert.equal(record.publication,null);assert.notEqual(record.version,'0.0.0');
 assert.deepEqual(Object.keys(receipt).sort(),['formatVersion','result','mode','version','directory','manifest','record'].sort());
 assert.equal(receipt.formatVersion,1);assert.equal(receipt.result,'pass');assert.equal(receipt.mode,'actual-candidate-documentation');assert.equal(receipt.version,record.version);
 portablePath(receipt.directory);assert.ok(receipt.directory.startsWith('.local/'),'Candidate export must remain private');
 const manifest=validateManifest(receipt.manifest);assert.notEqual(manifest.latest,'v'+record.version,'Candidate cannot advance public selection');assert.ok(manifest.snapshots.some(s=>s.version==='v'+record.version),'Missing actual candidate snapshot');
 validateRelease(receipt.record,options);assert.deepEqual({...receipt.record,gates:record.gates},record,'Candidate documentation changed native assembly');assert.equal(receipt.record.gates.after,record.gates.after);validateGate(receipt.record,receipt.record.gates.before,'candidate');return receipt;
}
export async function qualifyCandidateDocumentation({record,base=root,rendererRoot=root,manifest,outputRoot=path.join(root,'.local/release-candidate-site'),receiptPath=path.join(root,'.local/release-candidate-docs.json'),allowFixture=false}={}){
 const selected=manifest??JSON.parse(await readFile(path.join(base,'site/versions.json'),'utf8'));
 const directory=path.relative(root,outputRoot).replaceAll('\\','/');portablePath(directory);assert.ok(directory.startsWith('.local/'),'Candidate export must remain private');
 const before=await qualifyDocumentation({record,base,manifest:selected,rendererRoot,outputRoot,phase:'candidate',allowFixture});
 const receipt=validateCandidateDocumentation({formatVersion:1,result:'pass',mode:'actual-candidate-documentation',version:record.version,directory,manifest:selected,record:attachGate(record,before,{allowFixture})},record,{allowFixture});
 await writeFile(receiptPath,canonical(receipt)+'\n');return receipt;
}
