// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline';
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

test('Legacy baseline ownership uses listener PID without a new native command',async()=>{
 const port=await availableLoopbackPort(),child=launch(`require('node:http').createServer((q,r)=>{if(q.url.includes('execute'))process.exit(29);r.end(JSON.stringify({value:q.url==='/session'?{sessionId:'legacy'}:{ready:true}}));}).listen(${port},'127.0.0.1')`,'');
 try{assert.equal(await readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),3000,{listenerOwner:async()=>({pid:child.pid,port})}),'legacy');await assert.rejects(readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),3000,{listenerOwner:async()=>({pid:process.pid,port})}),/ownership mismatch/);}finally{await stopOwnedChild(child);}
});
test('Legacy listener ownership cannot overrun the original readiness deadline',async()=>{
 const port=await availableLoopbackPort(),child=launch(fixture(port),''),began=Date.now();try{await assert.rejects(readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),400,{listenerOwner:async()=>new Promise(()=>{})}),/deadline/);assert.ok(Date.now()-began<1600);}finally{await stopOwnedChild(child);}
});

test('Windows persistent observer verifies the actual legacy listener PID',{skip:process.platform!=='win32',timeout:20000},async()=>{
 const port=await availableLoopbackPort(),child=launch(`require('node:http').createServer((q,r)=>{if(q.url.includes('execute'))process.exit(29);r.end(JSON.stringify({value:q.url==='/session'?{sessionId:'legacy'}:{ready:true}}));}).listen(${port},'127.0.0.1')`,'');
 const observer=spawn('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-File','scripts/measure-processes.ps1'],{windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});const lines=createInterface({input:observer.stdout});let pending;let stderr='';observer.stderr.on('data',b=>stderr=(stderr+b).slice(-4096));lines.on('line',line=>pending?.(line));
 const query=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending=null;reject(Error('Listener observer deadline '+stderr));},10000);pending=line=>{clearTimeout(timer);pending=null;try{resolve(JSON.parse(line));}catch(e){reject(e);}};observer.stdin.write(JSON.stringify({action:'listener',port})+'\n');});
 try{assert.equal(await readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),12000,{listenerOwner:async()=>{const result=await query();assert.equal(result.method,'Windows TCP listener table');assert.deepEqual(result.owners,[child.pid]);return {...result,pid:Number(result.owners[0])};}}),'legacy');}finally{observer.stdin.end();await stopOwnedChild(child);await stopOwnedChild(observer);lines.close();}
});
