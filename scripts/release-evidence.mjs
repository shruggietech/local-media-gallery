// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './run.mjs';
import {fileInventory,verifyDocumentationGate} from './release-docs.mjs';
import {validateRelease,validateGate,releaseHash,canonical} from './release-record.mjs';
import {sourceIdentity} from './provenance.mjs';

async function gateContext({record,phase,manifest,base=root,rendererRoot=root,outputRoot,allowFixture=false,fixtureGateVerifier}){
 assert.ok(!fixtureGateVerifier||allowFixture,'Injected gate verifier is fixture-only');
 validateRelease(record,{allowFixture});assert.ok(['candidate','publication'].includes(phase));
 const gate=record.gates[phase==='candidate'?'before':'after'];validateGate(record,gate,phase);
 assert.equal((await sourceIdentity(rendererRoot)).sha256,gate.rendererSha256,'Evidence renderer source differs');
 const inventory=await fileInventory(outputRoot);
 assert.equal(releaseHash({phase,latest:manifest.latest,release:phase==='publication'?record.publication:null,output:inventory}),gate.projectionSha256,'Evidence projection differs');
 if(fixtureGateVerifier)await fixtureGateVerifier(record,phase);
 else await verifyDocumentationGate({record,phase,base,manifest,rendererRoot,outputRoot,allowFixture});
 return inventory;
}
export async function retainGateEvidence(options){
 assert.ok(!options.fixtureGateVerifier||options.allowFixture,'Injected gate verifier is fixture-only');
 const inventory=await gateContext(options),directory=path.resolve(options.directory);
 await mkdir(directory,{recursive:false});await cp(options.outputRoot,path.join(directory,'export'),{recursive:true,errorOnExist:true,force:false});
 const evidence={formatVersion:1,phase:options.phase,record:options.record,manifest:options.manifest,inventory};
 await writeFile(path.join(directory,'gate-evidence.json'),canonical(evidence)+'\n',{flag:'wx'});
 await verifyGateEvidence({...options,directory});return evidence;
}
export async function verifyGateEvidence({directory,base=root,rendererRoot=root,allowFixture=false,fixtureGateVerifier}){
 assert.ok(!fixtureGateVerifier||allowFixture,'Injected gate verifier is fixture-only');
 const evidence=JSON.parse(await readFile(path.join(directory,'gate-evidence.json'),'utf8'));
 assert.deepEqual(Object.keys(evidence).sort(),['formatVersion','phase','record','manifest','inventory'].sort());assert.equal(evidence.formatVersion,1);
 const outputRoot=path.join(directory,'export');
 assert.deepEqual(await fileInventory(outputRoot),evidence.inventory,'Evidence inventory differs');
 await gateContext({...evidence,base,rendererRoot,outputRoot,allowFixture,fixtureGateVerifier});
 return {result:'pass',phase:evidence.phase,candidateId:evidence.record.candidateId,files:evidence.inventory.length,projectionSha256:evidence.record.gates[evidence.phase==='candidate'?'before':'after'].projectionSha256};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.ok(process.argv[2]&&process.argv.length<=4,'Use release-evidence.mjs RETAINED_GATE_DIRECTORY [SOURCE_ROOT]');
 console.log(JSON.stringify(await verifyGateEvidence({directory:path.resolve(process.argv[2]),base:process.argv[3]?path.resolve(process.argv[3]):root}),null,2));
}
