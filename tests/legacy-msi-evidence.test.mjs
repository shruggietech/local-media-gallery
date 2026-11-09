// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLegacyRecoveryContract} from '../scripts/legacy-msi-evidence.mjs';
function fixture(){
 const identity='a'.repeat(64),patch={version:'0.1.0',sha256:'b'.repeat(64),bytes:'123'};
 const input={binding:identity,record:{sha256:patch.sha256,bytes:patch.bytes},alreadyApplied:false,job:'protected/native-job.json'};
 const native={job:input.job,terminal:true,code:0,pid:12,clientPid:13};
 const value={version:'0.1.0',location:{executableLength:131},originalRemoval:{code:1603,killed:false,signal:null},wrongVersion:{code:1642,killed:false,signal:null},changedInput:{code:2,killed:false,signal:null},interruption:{event:{clientPid:13},coordinator:{killed:true,terminal:{code:1}},native},standaloneRepair:{exitCode:0,patchSha256:patch.sha256},changedOwned:{code:1603,killed:false,signal:null},removed:{state:-1,ownedPathSegments:0,shortcut:false},update:{status:'complete'},rollback:{status:'restored'},recovered:{status:'restored'},before:{retained:'data'},after:{retained:'data'},outerIdentitySha256:identity,patchSteps:[{kind:'verified-legacy-msi-repair',binding:identity,version:'0.1.0',exitCode:0,input,native},{kind:'verified-legacy-msi-repair',binding:identity,version:'0.1.0',exitCode:0,input:{...input,alreadyApplied:true},native:{...native,clientPid:null}}]};
 return{value:JSON.parse(JSON.stringify(value)),patch};
}
test('Legacy recovery acceptance requires actual affected failure, native interruption, repair and removal',()=>{const{value,patch}=fixture();assert.equal(validateLegacyRecoveryContract(value,patch),true);});
test('Missing execution, mismatched patch bytes and incomplete native outcomes cannot qualify',()=>{
 for(const mutate of [v=>delete v.interruption,v=>v.interruption.coordinator.terminal={},v=>v.patchSteps=[],v=>v.patchSteps[0].native.terminal=false,v=>v.patchSteps[0].input.record.sha256='c'.repeat(64),v=>v.originalRemoval.code=0,v=>v.changedOwned.killed=true,v=>v.removed.state=5,v=>v.removed.ownedPathSegments=1,v=>v.after={changed:true},v=>v.interruption.coordinator.killed=false]){
  const{value,patch}=fixture();mutate(value);assert.throws(()=>validateLegacyRecoveryContract(value,patch));
 }
});
