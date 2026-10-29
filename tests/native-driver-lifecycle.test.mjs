// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {availableLoopbackPort,observeChild,readyDriver,stopOwnedChild} from '../scripts/native-driver-lifecycle.mjs';
const launch=(script,nonce)=>spawn(process.execPath,['-e',script],{windowsHide:true,shell:false,stdio:['ignore','pipe','pipe'],env:{...process.env,GALLERY_TEST_DRIVER_NONCE:nonce}});
const fixture=port=>`require('node:http').createServer((q,r)=>{r.setHeader('content-type','application/json');r.end(JSON.stringify({value:q.url==='/status'?{ready:true}:q.url==='/session'?{sessionId:'owned'}:{pid:process.pid,nonce:process.env.GALLERY_TEST_DRIVER_NONCE,port:${port}}}));}).listen(${port},'127.0.0.1')`;
test('Owned driver readiness proves nonce and PID through actual listener',async()=>{
 const port=await availableLoopbackPort(),nonce=randomUUID(),child=launch(fixture(port),nonce);
 try{assert.equal(await readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),5000,{nonce}),'owned');}finally{await stopOwnedChild(child);}assert.ok(child.exitCode!==null||child.signalCode!==null);
});
test('Failed driver retains separate bounded output, identity and early exit',async()=>{
 const nonce=randomUUID(),child=launch("console.log('x'.repeat(50000));console.error('fixture-driver-startup-failure');process.exit(17)",nonce);const state=observeChild(child);const started=Date.now();
 try{await assert.rejects(readyDriver(child,'http://127.0.0.1:'+await availableLoopbackPort(),state,5000,{nonce,context:{trial:3,edition:'full',source:'fixture'}}),e=>e.message.includes('fixture-driver-startup-failure')&&e.message.includes('17')&&e.message.includes('trial')&&e.message.includes('full'));assert.ok(Date.now()-started<4500);assert.ok(state().stdout.length<=16384);assert.ok(state().stderr.length<=16384);}finally{await stopOwnedChild(child);}
});
test('An unrelated answering listener cannot certify a live owned child',async()=>{
 const server=createServer((q,r)=>r.end(JSON.stringify({value:q.url==='/session'?{sessionId:'unrelated'}:{pid:process.pid,nonce:'unrelated'}})));await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port,nonce=randomUUID(),child=launch('setTimeout(()=>process.exit(19),1200)',nonce);
 try{await assert.rejects(readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),3000,{nonce}),/ownership mismatch/);assert.equal(child.exitCode,null);assert.ok(server.listening);}finally{await stopOwnedChild(child);await new Promise(r=>server.close(r));}
});
test('Unavailable listener deadline retains port and live-child status',async()=>{
 const port=await availableLoopbackPort(),nonce=randomUUID(),child=launch('setTimeout(()=>{},10000)',nonce);const started=Date.now();try{await assert.rejects(readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),400,{nonce}),e=>e.message.includes('deadline')&&e.message.includes(String(port))&&e.message.includes('exitCode'));assert.ok(Date.now()-started<2000);}finally{await stopOwnedChild(child);}
});
