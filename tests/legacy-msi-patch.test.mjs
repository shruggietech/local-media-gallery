// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyLegacyPatchTables} from '../scripts/legacy-msi-patch.mjs';
const idt=(header,types,keys,rows)=>Buffer.from([header,types,keys,...rows].join('\r\n')+'\r\n');
function fixture(){
 const prior=new Map([
 ['File.idt',idt('File\tComponent_','s72\ts72','File\tFile',['Main\tOwned'])],
 ['Binary.idt',idt('Name\tData','s72\tv0','Binary\tName',['Ownership\tOwnership'])],
 ['CustomAction.idt',idt('Action\tType\tSource\tTarget','s72\ti2\tS72\tS255','CustomAction\tAction',['Preflight\t1\tOwnership\tPreflight','VerifyInstalled\t3073\tOwnership\tVerifyInstalled'])],
 ['InstallExecuteSequence.idt',idt('Action\tCondition\tSequence','s72\tS255\tI2','InstallExecuteSequence\tAction',['Preflight\t1\t1400'])],
 ['Binary/Ownership',Buffer.from('original owned action')]]);
 const next=new Map([...prior].map(([k,v])=>[k,Buffer.from(v)]));
 next.set('Binary.idt',idt('Name\tData','s72\tv0','Binary\tName',['Ownership\tOwnership','LegacyRecovery\tLegacyRecovery']));
 next.set('Binary/LegacyRecovery',Buffer.from('replacement guard'));
 next.set('CustomAction.idt',idt('Action\tType\tSource\tTarget','s72\ti2\tS72\tS255','CustomAction\tAction',['Preflight\t1\tLegacyRecovery\tLegacyPreflight','VerifyInstalled\t3073\tOwnership\tVerifyInstalled','LegacyConfigure\t1\tLegacyRecovery\tLegacyConfigure']));
 next.set('InstallExecuteSequence.idt',idt('Action\tCondition\tSequence','s72\tS255\tI2','InstallExecuteSequence\tAction',['Preflight\t1\t1400','LegacyConfigure\t1\t999']));
 return {prior,next};
}
test('Legacy patch permits only its compiled guard, Preflight redirect and pre-cost configuration',()=>{
 const {prior,next}=fixture();assert.doesNotThrow(()=>verifyLegacyPatchTables(prior,next,Buffer.from('replacement guard')));
});
test('Patch construction refuses payload, ownership, condition, stream and deferred verification changes',()=>{
 for(const mutate of [
 n=>n.set('File.idt',Buffer.from('changed file ownership')),
 n=>n.delete('Binary/Ownership'),
 n=>n.set('Binary/Ownership',Buffer.from('changed original action')),
 n=>n.set('Binary/LegacyRecovery',Buffer.from('foreign executable')),
 n=>n.set('Unrelated.idt',Buffer.from('extra authority')),
 n=>n.set('CustomAction.idt',Buffer.from(n.get('CustomAction.idt').toString().replace('3073','1'))),
 n=>n.set('InstallExecuteSequence.idt',Buffer.from(n.get('InstallExecuteSequence.idt').toString().replace('Preflight\t1','Preflight\t0'))),
 n=>n.set('CustomAction.idt',Buffer.from(n.get('CustomAction.idt').toString().replace('LegacyPreflight','Preflight'))),
 ]){const {prior,next}=fixture();mutate(next);assert.throws(()=>verifyLegacyPatchTables(prior,next,Buffer.from('replacement guard')));}
});
