// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {retainGateEvidence,verifyGateEvidence} from '../scripts/release-evidence.mjs';
import {candidateFixture,gateFixture} from './fixtures/releases/record-fixture.mjs';
import {createCandidate,attachGate,releaseHash} from '../scripts/release-record.mjs';
import {fileInventory} from '../scripts/release-docs.mjs';
import {sourceIdentity} from '../scripts/provenance.mjs';
test('Retained gate inventory rejects missing, modified and extra export files',async t=>{
 const base=await mkdtemp(path.join(os.tmpdir(),'lmg-gate-evidence-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const outputRoot=path.join(base,'export');await mkdir(outputRoot);await writeFile(path.join(outputRoot,'index.html'),'Gate bytes\n');
 const manifest={latest:'v0.1.0',snapshots:[]};let record=createCandidate(candidateFixture(),{allowFixture:true});
 const gate=gateFixture(record,'candidate');gate.rendererSha256=(await sourceIdentity()).sha256;
 gate.projectionSha256=releaseHash({phase:'candidate',latest:manifest.latest,release:null,output:await fileInventory(outputRoot)});
 record=attachGate(record,gate,{allowFixture:true});
 const args={directory:path.join(base,'retained'),record,phase:'candidate',manifest,outputRoot,allowFixture:true,fixtureGateVerifier:async()=>{}};
 await retainGateEvidence(args);await verifyGateEvidence({...args,outputRoot:undefined});
 const file=path.join(args.directory,'export/index.html');await writeFile(file,'changed\n');await assert.rejects(verifyGateEvidence({...args,outputRoot:undefined}),/inventory|projection|hash/i);
 await writeFile(file,'Gate bytes\n');await writeFile(path.join(args.directory,'export/extra'),'extra');await assert.rejects(verifyGateEvidence({...args,outputRoot:undefined}),/inventory/i);
 await rm(path.join(args.directory,'export/extra'));await rm(file);await assert.rejects(verifyGateEvidence({...args,outputRoot:undefined}),/inventory/i);
});
test('Fixture gate verifier cannot authorize production evidence',async()=>{
 await assert.rejects(retainGateEvidence({fixtureGateVerifier:async()=>{}}),/fixture/i);
});
