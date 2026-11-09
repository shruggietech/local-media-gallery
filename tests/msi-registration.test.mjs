// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {registrationCase,registrationLocation,recordMsiOutcome} from '../scripts/msi-registration.mjs';
test('Registration controls vary structure independently at exact UTF-16 executable lengths',()=>{
 for(const length of [76,127,128,129,130,131])for(const structure of ['flat','nested']){
  const c=registrationCase(`registration-010-${structure}-${length}`), location=registrationLocation(c,'C:\\s037');
  assert.equal(path.win32.join(location,'local-media-gallery.exe').length,length);
  assert.equal(location.split('\\').length,structure==='flat'?4:7);
 }
 assert.throws(()=>registrationCase('registration-010-flat-132'));
 assert.throws(()=>registrationLocation(registrationCase('registration-010-flat-76'),'relative'));
});
test('Version, drive and character controls are explicit and invalid selections refuse',()=>{
 for(const version of ['010','020','021','022'])assert.equal(registrationCase(`registration-${version}-nested-131`).version,`0.${Number(version[1])}.${Number(version[2])}`);
 const c=registrationCase('registration-010-original-131');assert.equal(registrationLocation(c,'C:\\s037').length+24,131);
 assert.throws(()=>registrationCase('registration-999-nested-131'));
});
test('Diagnostic terminal outcomes preserve failure and never turn a timeout into an exit',()=>{
 assert.deepEqual(recordMsiOutcome(null),{code:0,killed:false,signal:null,terminal:true});
 assert.equal(recordMsiOutcome({code:1603,killed:false}).code,1603);
 assert.equal(recordMsiOutcome({code:3010,killed:false}).terminal,true);
 for(const error of [{code:'ETIMEDOUT',killed:true},{code:0,killed:true},{code:null,signal:'SIGTERM'}])assert.equal(recordMsiOutcome(error).terminal,false);
});
