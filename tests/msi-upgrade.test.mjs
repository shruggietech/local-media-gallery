// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkUpgradeChoices,upgradePageReady} from '../scripts/windows-msi-upgrade.mjs';
import {readFile} from 'node:fs/promises';
import {authorInstaller} from '../scripts/windows-packages.mjs';

const expected={scope:'machine',directory:'C:\\Program Files\\Local Media Gallery\\',startMenu:true,commandPath:true};
const records=[{name:'Create a &Start menu shortcut',toggle:'On'},{name:'Add the application to command PATH',toggle:'On'},{name:null,value:'c:\\PROGRAM FILES\\Local Media Gallery'}];
test('ordinary upgrade follows inherited machine choices instead of imposing fresh defaults',()=>{
 assert.doesNotThrow(()=>checkUpgradeChoices(records,expected));
 assert.throws(()=>checkUpgradeChoices(records,{...expected,commandPath:false}),/PATH choice/);
 assert.throws(()=>checkUpgradeChoices(records,{...expected,startMenu:false}),/Start menu choice/);
 assert.throws(()=>checkUpgradeChoices(records,{...expected,directory:'C:\\Elsewhere'}),/installed location/);
});
test('a missing location or ambiguous absent label cannot grant an inherited upgrade pass',()=>{
 assert.throws(()=>checkUpgradeChoices(records.slice(0,2),expected),/installed location/);
 assert.throws(()=>checkUpgradeChoices([{name:null,toggle:'On'},...records.slice(1)],expected),/Start menu choice/);
});
test('wizard action readiness requires the actual enabled button, not instructional text',()=>{
 const text={name:'Click Next to continue',role:'ControlType.Text',enabled:true,offscreen:false};
 const button={name:'&Next >',role:'ControlType.Button',enabled:true,offscreen:false};
 assert.equal(upgradePageReady([text,{...button,enabled:false}],'Next'),false);
 assert.equal(upgradePageReady([text,{...button,offscreen:true}],'Next'),false);
 assert.equal(upgradePageReady([text,button],'Next'),true);
});
test('generated MSI authorizes legacy machine UI before execution without adding a second execute action',async()=>{
 const template=await readFile(new URL('../packaging/windows/installer.wxs',import.meta.url),'utf8');
 const {wxs}=authorInstaller({files:[{path:'local-media-gallery.exe'},{path:'payload.json'}],payloadDirectory:'fixture',helper:'owned-helper.dll',runtime:'offline-sdk.exe',payloadSha:'a'.repeat(64),template});
 const ui=wxs.match(/<InstallUISequence>([\s\S]*?)<\/InstallUISequence>/)?.[1];
 const execute=wxs.match(/<InstallExecuteSequence>([\s\S]*?)<\/InstallExecuteSequence>/)?.[1];
 assert.match(wxs,/<CustomAction Id="ElevateLegacyMachine" BinaryKey="Ownership" DllEntry="ElevateLegacyMachine" Execute="immediate" Return="check"/);
 assert.match(ui,/<Custom Action="Configure" Before="ElevateLegacyMachine">NOT Installed<\/Custom>/);
 assert.match(ui,/<Custom Action="ElevateLegacyMachine" Before="FindRelatedProducts">NOT Installed<\/Custom>/);
 assert.ok(!execute.includes('ElevateLegacyMachine'),'Native handoff must precede execution, never run inside its mutex');
 assert.equal((execute.match(/<RemoveExistingProducts /g)??[]).length,1,'Only one native replacement action is authored');
});
