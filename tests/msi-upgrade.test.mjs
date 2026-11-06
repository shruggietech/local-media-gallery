// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkUpgradeChoices} from '../scripts/windows-msi-upgrade.mjs';

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
