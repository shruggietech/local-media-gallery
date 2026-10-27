// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {availableLoopbackPort,observeChild,readyDriver,stopOwnedChild} from '../scripts/native-driver-lifecycle.mjs';
test('Owned driver readiness checks an actual listener and shutdown observes exit',async()=>{
 const port=await availableLoopbackPort();const child=spawn(process.execPath,['-e',`require('node:http').createServer((q,r)=>r.end('{}')).listen(${port},'127.0.0.1')`],{windowsHide:true,stdio:['ignore','pipe','pipe']});const state=observeChild(child);
 try{await readyDriver(child,'http://127.0.0.1:'+port,state,5000);}finally{await stopOwnedChild(child);}assert.ok(child.exitCode!==null||child.signalCode!==null);
});
test('Failed driver reports owned process output and exit without waiting the full deadline',async()=>{
 const child=spawn(process.execPath,['-e',"console.error('fixture-driver-startup-failure');process.exit(17)"],{windowsHide:true,stdio:['ignore','pipe','pipe']});const state=observeChild(child);const started=Date.now();await assert.rejects(readyDriver(child,'http://127.0.0.1:'+await availableLoopbackPort(),state,5000),e=>e.message.includes('fixture-driver-startup-failure')&&e.message.includes('17'));assert.ok(Date.now()-started<4500);await stopOwnedChild(child);
});
