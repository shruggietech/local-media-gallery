// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {createHash} from 'node:crypto';
import {floatPcm,collectPcm,ownedLinuxProcess,captureLinuxOutput} from '../scripts/native-pcm.mjs';
test('Captured actual float PCM distinguishes tone, silence, missing and corrupt samples',()=>{
 const bytes=Buffer.alloc(16384*4);for(let i=0;i<16384;i++)bytes.writeFloatLE(0.1*Math.sin(2*Math.PI*440*i/48000),i*4);const tone=floatPcm(bytes);assert.ok(tone.rms>0.01);assert.ok(Math.abs(tone.frequencyHz-440)<30);assert.equal(floatPcm(Buffer.alloc(16384*4)).rms,0);assert.throws(()=>floatPcm(Buffer.alloc(0)));assert.throws(()=>floatPcm(Buffer.alloc(5)));bytes.writeFloatLE(NaN);assert.throws(()=>floatPcm(bytes));
});
test('Finite PCM capture observes actual child output and rejects early exit or absent stream',async()=>{
 const start=code=>spawn(process.execPath,['-e',code],{windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});
 const result=await collectPcm(start("process.stdout.write(Buffer.alloc(65536));setInterval(()=>{},1000)"));assert.equal(result.samples,16384);assert.equal(result.rms,0);
 await assert.rejects(collectPcm(start("console.error('capture-unavailable');process.exit(23)")),/capture-unavailable/);
 await assert.rejects(collectPcm(start('setInterval(()=>{},1000)'),{timeout:150}),/capture deadline/);
});
test('Sink input ownership requires the real app process ancestry',async()=>{
 const proc=async p=>p.includes('/42/')?'42 (WebKit audio child) S 17 0':p.includes('/17/')?'17 (app) S 1 0':Promise.reject(new Error('missing'));
 assert.equal(await ownedLinuxProcess(42,17,proc),true);assert.equal(await ownedLinuxProcess(42,99,proc),false);assert.equal(await ownedLinuxProcess(444,17,proc),false);
});

function recorder(){
 const child=new EventEmitter();Object.assign(child,{pid:321,exitCode:null,signalCode:null,stdout:new PassThrough(),stderr:new PassThrough()});
 child.kill=signal=>{child.signalCode=signal??'SIGTERM';child.emit('exit',null,child.signalCode);return true;};return child;
}
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
test('PCM retains the final 20 and 16 bytes and arbitrary split frames before its original deadline',async()=>{
 for(const short of [20,16,3]){const child=recorder(),capture=collectPcm(child,{timeout:150});child.stdout.write(Buffer.alloc(65536-short));setTimeout(()=>child.stdout.write(Buffer.alloc(short)),10);const r=await capture;assert.equal(r.bytes,65536);assert.equal(r.samples,16384);assert.equal(r.delivery.requiredBytes,65536);assert.equal(r.delivery.chunkCount,2);assert.ok(r.delivery.lastDataAt);assert.ok(child.stdout.destroyed);}
});
test('PCM timeout retains exact short-window diagnostics and never accepts partial silence',async()=>{
 for(const missing of [20,16]){const child=recorder(),bytes=Buffer.alloc(65536-missing),capture=collectPcm(child,{timeout:25});child.stdout.write(bytes);child.stderr.write('bounded-capture-context');await assert.rejects(capture,error=>{assert.match(error.message,/capture deadline/);assert.equal(error.captureDiagnostics.bytes,bytes.length);assert.equal(error.captureDiagnostics.requiredBytes,65536);assert.equal(error.captureDiagnostics.partialSha256,digest(bytes));assert.equal(error.captureDiagnostics.chunkCount,1);assert.match(error.captureDiagnostics.stderr,/bounded-capture-context/);return true;});assert.ok(child.stdout.destroyed);assert.ok(child.stderr.destroyed);assert.equal(child.signalCode,'SIGTERM');}
});
test('PCM drains final output after a successful process exit and handles duplicate terminals once',async()=>{
 const child=recorder(),capture=collectPcm(child,{timeout:100});child.exitCode=0;child.emit('exit',0,null);child.stdout.write(Buffer.alloc(65516));child.stdout.end(Buffer.alloc(20));child.stderr.end();child.emit('close',0,null);const r=await capture;assert.equal(r.samples,16384);child.emit('close',0,null);assert.equal(child.listenerCount('exit'),0);assert.equal(child.listenerCount('close'),0);
});
test('PCM spawn and early-exit errors keep drained stderr and bounded primary plus cleanup failures',async()=>{
 const child=recorder(),capture=collectPcm(child,{timeout:100});child.exitCode=23;child.emit('exit',23,null);child.stderr.end('final-recorder-error');child.stdout.end(Buffer.alloc(5));child.emit('close',23,null);await assert.rejects(capture,error=>{assert.match(error.message,/final-recorder-error/);assert.equal(error.captureDiagnostics.exitCode,23);assert.equal(error.captureDiagnostics.bytes,5);return true;});
 const spawned=recorder(),failed=collectPcm(spawned,{timeout:100});spawned.emit('error',new Error('recorder spawn refused'));await assert.rejects(failed,/spawn refused/);
 const cleanup=recorder(),primary=collectPcm(cleanup,{timeout:20,stop:async()=>{throw Error('owned cleanup refused');}});cleanup.stdout.write(Buffer.alloc(7));await assert.rejects(primary,error=>{assert.match(error.message,/capture deadline/);assert.match(error.message,/owned cleanup refused/);assert.equal(error.captureDiagnostics.bytes,7);return true;});assert.ok(cleanup.stdout.destroyed);assert.ok(cleanup.stderr.destroyed);
});
test('PCM already-exited child settles after ended streams rather than waiting the whole bound',async()=>{
 const child=recorder();child.exitCode=5;child.stdout.end();child.stderr.end('already-exited');child.emit('close',5,null);await assert.rejects(collectPcm(child,{timeout:100}),/already-exited|exited/);
});
test('Native recorder requests recording latency for tone and no-input silence and preserves final attribution',async()=>{
 for(const hasAudio of [false,true]){const sink={name:'lmg_qualification',index:7,monitor_source_name:'owned.monitor'},input={index:9,sink:7,corked:false,properties:{'application.process.id':'17'}};let queries=0,spawned;
  const hidden=async(_file,args)=>({stdout:JSON.stringify(args.at(-1)==='sinks'?[sink]:(queries++,[...(hasAudio?[input]:[])]))});
  const spawnRecorder=(file,args,options)=>{spawned={file,args,options};const child=recorder();queueMicrotask(()=>child.stdout.write(Buffer.alloc(65536)));return child;};
  const r=await captureLinuxOutput({appPid:17,environment:{CI:'true'},hidden,hasAudio,spawnRecorder});assert.equal(r.samples,16384);assert.equal(queries,2);assert.equal(spawned.file,'parec');assert.ok(spawned.args.includes('--latency-msec=50'));assert.equal(spawned.args.includes('--monitor-stream=9'),hasAudio);assert.equal(spawned.options.windowsHide,true);assert.equal(spawned.options.shell,false);assert.equal(r.stream.index,hasAudio?9:null);
 }
 const input={index:9,sink:7,corked:false,properties:{'application.process.id':'17'}};let calls=0;const hidden=async(_file,args)=>({stdout:JSON.stringify(args.at(-1)==='sinks'?[{name:'lmg_qualification',index:7}]:[calls++?{...input,corked:true}:input])});
 await assert.rejects(captureLinuxOutput({appPid:17,hidden,environment:{},spawnRecorder:()=>{const child=recorder();queueMicrotask(()=>child.stdout.write(Buffer.alloc(65536)));return child;}}),/stream changed/);
});
