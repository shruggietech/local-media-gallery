// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {floatPcm,collectPcm,ownedLinuxProcess} from '../scripts/native-pcm.mjs';
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
