// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
export function validateLegacyRecoveryContract(value,patch){
 assert.ok(patch);assert.equal(value.version,patch.version);assert.equal(value.location.executableLength,131);
 for(const [field,code]of [['originalRemoval',1603],['changedInput',2],['changedOwned',1603]]){assert.equal(value[field].code,code);assert.equal(value[field].killed,false);assert.equal(value[field].signal,null);}
 assert.equal(value.wrongVersion.code,1642);assert.equal(value.wrongVersion.killed,false);assert.equal(value.wrongVersion.signal,null);
 assert.equal(value.interruption.coordinator.killed,true);assert.ok((Number.isInteger(value.interruption.coordinator.terminal.code)&&value.interruption.coordinator.terminal.code!==0)||['SIGTERM','SIGKILL'].includes(value.interruption.coordinator.terminal.signal));assert.equal(value.interruption.native.terminal,true);assert.equal(value.interruption.native.clientPid,value.interruption.event.clientPid);assert.ok(Number.isInteger(value.interruption.event.clientPid)&&value.interruption.event.clientPid>0);assert.ok([0,3010].includes(value.interruption.native.code));
 assert.equal(value.update.status,'complete');assert.equal(value.rollback.status,'restored');assert.equal(value.recovered.status,'restored');assert.deepEqual(value.before,value.after);
 assert.ok([0,3010].includes(value.standaloneRepair.exitCode));assert.equal(value.standaloneRepair.patchSha256,patch.sha256);
 assert.equal(value.removed.state,-1);assert.equal(value.removed.ownedPathSegments,0);assert.equal(value.removed.shortcut,false);assert.match(value.outerIdentitySha256,/^[a-f0-9]{64}$/);
 assert.ok(value.patchSteps.length>=2);assert.ok(value.patchSteps.some(s=>s.input.alreadyApplied));assert.ok(value.patchSteps.some(s=>!s.input.alreadyApplied));
 for(const step of value.patchSteps){assert.equal(step.kind,'verified-legacy-msi-repair');assert.equal(step.binding,value.outerIdentitySha256);assert.equal(step.version,patch.version);assert.equal(step.input.binding,step.binding);assert.equal(step.input.record.sha256,patch.sha256);assert.equal(step.input.record.bytes,patch.bytes);assert.equal(step.native.job,step.input.job);assert.equal(step.native.terminal,true);assert.ok([0,3010].includes(step.exitCode));assert.equal(step.native.code,step.exitCode);assert.ok(Number.isInteger(step.native.pid)&&step.native.pid>0);if(step.input.alreadyApplied)assert.equal(step.native.clientPid,null);else assert.ok(Number.isInteger(step.native.clientPid)&&step.native.clientPid>0);}
 return true;
}
