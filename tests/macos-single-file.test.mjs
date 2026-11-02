// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {macProductDistribution,macMaintenanceChoices,macInstallerScript,validateMacProduct} from '../scripts/macos-packages.mjs';
test('Full installer selects system scope and only embedded maintenance packages',()=>{
 const xml=macProductDistribution('0.2.0');
 assert.match(xml,/enable_anywhere="false" enable_currentUserHome="false" enable_localSystem="true"/);
 assert.match(xml,/<volume-check script="true"><allowed-os-versions>/);
 assert.match(xml,/selected="!\(choices.remove.selected \|\| choices.rollback.selected\)"/);assert.match(xml,/>rollback.pkg</);assert.match(xml,/enabled="!choices.remove.selected"/);assert.match(xml,/enabled="!choices.rollback.selected"/);assert.doesNotMatch(xml,/ active=/);assert.match(macInstallerScript('managed-rollback'),/lmg-setup managed-rollback/);assert.match(xml,/>install.pkg</);assert.match(xml,/>remove.pkg</);assert.doesNotMatch(xml,/https?:/);
 assert.throws(()=>macProductDistribution('0.2.0<injected>'));
 const install=macInstallerScript('managed-install');assert.match(install,/exec \.\/lmg-setup managed-install/);assert.doesNotMatch(install,/--scope|--prior|--transaction|--state|curl|wget/);
 assert.throws(()=>macInstallerScript('install; malicious'));
});
test('product records reject diagnostic archives, companions and mismatched inventory',()=>{
 const digest='a'.repeat(64),file={path:'lite',bytes:'123',sha256:digest,mode:'755'};
 const lite={path:'.local/lite',bytes:'123',sha256:digest,format:'mach-o',binary:'lite',files:[file]};
 assert.equal(validateMacProduct(lite,'lite'),lite);
 assert.throws(()=>validateMacProduct({...lite,format:'zip'},'lite'));
 assert.throws(()=>validateMacProduct({...lite,files:[file,{...file,path:'NOTICE'}]},'lite'));
 assert.throws(()=>validateMacProduct({...lite,files:[{...file,sha256:'b'.repeat(64)}]},'lite'));
 assert.throws(()=>validateMacProduct({...lite,format:'pkg'},'lite'));
});
test('native maintenance choice changes explicitly select exactly one action',()=>{
 for(const operation of ['install','remove','rollback']){const xml=macMaintenanceChoices(operation);assert.equal((xml.match(/<integer>1<\/integer>/g)||[]).length,1);assert.equal((xml.match(/<integer>0<\/integer>/g)||[]).length,2);assert.match(xml,new RegExp('<string>'+operation+'</string><key>choiceAttribute</key><string>selected</string><key>attributeSetting</key><integer>1</integer>'));}
 assert.throws(()=>macMaintenanceChoices('foreign'));
});
