// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRuntimeReceipt, signalObservation} from '../scripts/runtime-evidence.mjs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {python,root} from '../scripts/run.mjs';
import {requireIsolatedDesktop} from '../scripts/desktop-isolation.mjs';

const source={sha256:'a'.repeat(64),files:100,exclusions:[]};
const expected={source,binarySha256:'b'.repeat(64),fixtureSha256:'c'.repeat(64),edition:'full',platform:'win32'};
function receipt(){return {formatVersion:1,result:'pass',source,edition:'full',binary:{sha256:expected.binarySha256,bytes:'100'},fixture:{sha256:expected.fixtureSha256},environment:{platform:'win32',arch:'x64',userAgent:'actual native runtime',devicePixelRatio:1},checks:['images','video','keyboard','presentation','nativeAccessibility','integrity'].map(name=>({name,result:'pass'})),input:{method:'Windows SendKeys',trusted:true},accessibility:{method:'UIAutomation',nodes:7,overflow:false,essentialNames:['Refresh','Controls','Thumbnails','Diagnostics']},screenReader:{name:'NVDA',version:'2026.3',speech:['Refresh button','photo.png dialog'],overflow:false,bytes:'100'},media:[{name:'image.tiff',outcome:'unsupported',reason:'Native decoder reported an unsupported image.',retained:true,inspectable:true}],terminalFinished:new Date().toISOString()};}
test('native receipt binds exact source, compiled artifact, fixture and edition',()=>{
 const r=receipt();validateRuntimeReceipt(r,expected);
 for(const [key,mutate] of [['source',r=>r.source={...source,sha256:'d'.repeat(64)}],['binary',r=>r.binary.sha256='d'.repeat(64)],['fixture',r=>r.fixture.sha256='d'.repeat(64)],['edition',r=>r.edition='lite']]){const changed=receipt();mutate(changed);assert.throws(()=>validateRuntimeReceipt(changed,expected),undefined,key);}
});
test('missing native checks, untrusted keyboard and overflow cannot certify acceptance',()=>{
 for(const mutate of [r=>r.checks.pop(),r=>r.checks[0].result='unavailable',r=>r.input.trusted=false,r=>r.accessibility.overflow=true,r=>r.accessibility.nodes=2049,r=>r.accessibility.method='DOM aria',r=>r.screenReader.overflow=true,r=>r.screenReader.speech=[],r=>r.screenReader.bytes='262145']){const r=receipt();mutate(r);assert.throws(()=>validateRuntimeReceipt(r,expected));}
});
test('unsupported format is evidence only with retained inspectable item and a reason',()=>{
 for(const mutate of [r=>r.media[0].reason='',r=>r.media[0].retained=false,r=>r.media[0].inspectable=false,r=>r.media[0].outcome='unavailable']){const r=receipt();mutate(r);assert.throws(()=>validateRuntimeReceipt(r,expected));}
});

test('aborted and network video loads cannot become successful codec evidence',()=>{
 for(const errorCode of [1,2,0,5,undefined]){const r=receipt();r.media=[{name:'tone.mp4',type:'video',outcome:'unsupported',errorCode,reason:'Load failed',retained:true,inspectable:true}];assert.throws(()=>validateRuntimeReceipt(r,expected),undefined,'Native media error '+errorCode);}
 for(const errorCode of [3,4]){const r=receipt();r.media=[{name:'tone.mp4',type:'video',outcome:'unsupported',errorCode,reason:'Native decoding unsupported',retained:true,inspectable:true}];validateRuntimeReceipt(r,expected);}
});
test('silent fixture and suspended audio graph cannot pass a decoded tone observation',()=>{
 const tone=Float32Array.from({length:4096},(_,i)=>0.125*Math.sin(2*Math.PI*440*i/48000));
 const observation=signalObservation(tone,48000);assert.ok(observation.rms>0.08);assert.ok(Math.abs(observation.peakHz-440)<20);
 assert.equal(signalObservation(new Float32Array(4096),48000).rms,0);
 assert.throws(()=>signalObservation([NaN],48000));
});
test('actual NVDA capture policy excludes unrelated queued text and enforces storage bounds',async()=>{
 await promisify(execFile)(process.platform==='win32'?python:'python3',['tests/nvda-qualification.test.py'],{cwd:root,windowsHide:true,shell:false,timeout:15000});
});
test('focus-changing suites refuse the active workstation before launching a GUI',async()=>{
 assert.throws(()=>requireIsolatedDesktop({}),/isolated CI desktop/);
 assert.throws(()=>requireIsolatedDesktop({GITHUB_ACTIONS:'true'}),/isolated CI desktop/);
 for(const script of ['test-runtime-platform','test-runtime','test-native','test-preparation','test-launch','test-normal','measure-native','qualify'])await assert.rejects(promisify(execFile)(process.execPath,['scripts/'+script+'.mjs'],{cwd:root,windowsHide:true,shell:false,timeout:10000,env:{...process.env,GITHUB_ACTIONS:'false',GALLERY_ISOLATED_DESKTOP:''}}),e=>e.stderr.includes('isolated CI desktop'));
});
