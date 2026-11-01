// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateFixture,gateFixture} from './fixtures/releases/record-fixture.mjs';
import {attachGate} from '../scripts/release-record.mjs';
import {validateCandidateDocumentation} from '../scripts/release-candidate-docs.mjs';
const input=()=>{const record=candidateFixture();return {record,receipt:{formatVersion:1,result:'pass',mode:'actual-candidate-documentation',version:record.version,directory:'.local/release-candidate-site',manifest:{latest:'v0.0.0',snapshots:[{version:'v0.0.0',status:'specification',source:'docs/v0.0.0',topics:['index']},{version:'v0.1.0',status:'released',source:'docs/v0.1.0',topics:['index']}]},record:attachGate(record,gateFixture(record),{allowFixture:true})}};};
test('Actual candidate docs receipt binds the unchanged native candidate and keeps public selection prior',()=>{
 const {record,receipt}=input();assert.equal(validateCandidateDocumentation(receipt,record,{allowFixture:true}),receipt);assert.equal(record.gates.before,null);assert.throws(()=>validateCandidateDocumentation(receipt,record),/fixture/i);
 for(const mutate of [r=>r.record.source.revision='c'.repeat(40),r=>r.version='0.2.0',r=>r.manifest.latest='v0.1.0',r=>r.manifest.snapshots.pop(),r=>r.directory='../release-candidate-site',r=>r.unexpected=true,r=>r.record.gates.before.sourceSha256='0'.repeat(64)]){const changed=structuredClone(receipt);mutate(changed);assert.throws(()=>validateCandidateDocumentation(changed,record,{allowFixture:true}));}
});
