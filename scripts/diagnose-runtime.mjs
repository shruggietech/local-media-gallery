// SPDX-License-Identifier: Apache-2.0
// Mixed-source diagnosis only. This file never produces an acceptance receipt.
import assert from 'node:assert/strict';
import {readFile,writeFile,chmod} from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {root,node,environment} from './run.mjs';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
import {sourceIdentity} from './provenance.mjs';
import {digest,signalObservation} from './runtime-evidence.mjs';
import {openRuntime,until,pause} from './runtime-driver.mjs';
import {prepareRuntimeDesktop} from './runtime-environment.mjs';
import {verifyRuntimeFixture} from './create-runtime-fixture.mjs';
requireIsolatedDesktop();
assert.match(process.env.GALLERY_DIAGNOSTIC_RUN??'',/^[1-9][0-9]*$/);
const scope={win32:'product-windows',linux:'product-linux',darwin:'product-macos'}[process.platform];
const input=path.join(root,'.local/diagnostic-input');
const prior=JSON.parse(await readFile(path.join(input,'ci-'+scope+'.json')));
const fixture=JSON.parse(await readFile(path.join(root,'.local/runtime-fixture.json')));
const binary=path.join(input,'bin/local-media-gallery-native-tests'+(process.platform==='win32'?'.exe':''));
const bytes=await readFile(binary);
if(process.platform!=='win32')await chmod(binary,0o755);
let rebuilt;try{rebuilt=JSON.parse(await readFile(path.join(root,'.local/diagnostic-rebuilt.json')));assert.deepEqual(rebuilt.source,await sourceIdentity());assert.equal(digest(bytes),rebuilt.binary.sha256);}catch(e){if(e.code!=='ENOENT')throw e;}
if(!rebuilt)try{const r=JSON.parse(await readFile(path.join(input,'runtime-results-full.json')));assert.equal(digest(bytes),r.binary.sha256);}catch(e){if(e.code!=='ENOENT')throw e;}
const receipt={kind:'isolated-runtime-diagnostic',acceptance:false,artifactRun:process.env.GALLERY_DIAGNOSTIC_RUN,rebuilt,artifactSource:rebuilt?.source??prior.context.source,harnessSource:await sourceIdentity(),binary:{sha256:digest(bytes),bytes:String(bytes.length)},observations:[],started:new Date().toISOString()};
let restore;
console.log('DIAGNOSTIC ONLY: prior compiled application and current harness; not final-source qualification.');
try{
 restore=await prepareRuntimeDesktop();
 try{await node(path.join(root,'scripts/test-runtime.mjs'),['--diagnostic-style'],{env:{...environment,GALLERY_TEST_BINARY:binary,GALLERY_TEST_EDITION:'full'}});}catch(e){receipt.campaignFailure=e.message;}
 receipt.campaign=JSON.parse(await readFile(path.join(root,'.local/runtime-results-full.json')));
 if(process.platform==='darwin')await diagnoseMacVideo();
 await verifyRuntimeFixture(fixture);assert.equal(digest(await readFile(binary)),receipt.binary.sha256);
}catch(e){receipt.failure=e.stack;process.exitCode=1;}
finally{try{await restore?.();}catch(e){receipt.restorationFailure=e.stack;process.exitCode=1;}receipt.terminalFinished=new Date().toISOString();await writeFile(path.join(root,'.local/runtime-diagnostic.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({acceptance:false,campaign:receipt.campaign?.checks.map(c=>c.name),observations:receipt.observations.map(o=>({mode:o.mode,state:o.state,failure:o.failure})),failure:receipt.failure}));}

async function diagnoseMacVideo(){
 const app=await openRuntime(binary,fixture);
 const js=(fn,...args)=>app.js('return await ('+fn.toString()+')(...arguments);',args);
 try{
  await until(()=>js(()=>document.querySelectorAll('.media-card').length>0),'Diagnostic gallery');
  await app.click('Settings');await until(()=>js(()=>Boolean(document.getElementById('page-size'))),'Diagnostic settings');
  await js(()=>{const s=document.getElementById('page-size');s.value='24';s.dispatchEvent(new Event('change',{bubbles:true}));return true;});
  await until(()=>js(()=>document.querySelectorAll('.media-card').length===22),'Diagnostic corpus');await app.click('Hide controls');
  try{receipt.platformAccessibility=await app.accessibility();}catch(e){receipt.platformAccessibility={failure:e.stack};}
  await js(()=>{document.addEventListener('keydown',e=>{window.__diagnosticKey={key:e.key,trusted:e.isTrusted};if(e.isTrusted&&e.key===' '&&window.__runtimeAudio)void window.__runtimeAudio.context.resume();},true);return true;});
  const media=await readFile(path.join(fixture.directory,'tone.webm'));
  assert.equal(digest(media),fixture.files.find(f=>f.name==='tone.webm').sha256);
  for(const mode of ['original-without-graph','original-without-graph-information','original-scroll-information','independent-without-graph','independent-with-graph','independent-conditional-cors-with-graph']){
   const result={mode,delivery:[]};receipt.observations.push(result);let server;
   try{
    await js(scroll=>{const card=document.querySelector('.media-card[data-name="tone.webm"]');if(scroll)card.scrollIntoView({block:'center'});card.querySelector('button').click();return true;},mode==='original-scroll-information');await until(()=>js(()=>document.querySelector('dialog[open] h2')?.textContent==='tone.webm'),'Diagnostic WebM viewer');
    if(mode==='original-without-graph-information'||mode==='original-scroll-information')await app.click('Information');
    if(mode.startsWith('independent')){
     const origin=await js(()=>location.origin);server=http.createServer((req,res)=>{
      if(result.delivery.length>=128){res.writeHead(503);res.end();return;}
      const trace={method:req.method,range:req.headers.range?.slice(0,64)??null,originPresent:req.headers.origin!==undefined,originMatches:req.headers.origin===origin||req.headers.origin===undefined};result.delivery.push(trace);
      if(!trace.originMatches||req.url!=='/fixture'||!['GET','HEAD'].includes(req.method)){trace.status=403;res.writeHead(403);res.end();return;}
      let start=0,end=media.length-1,status=200;
      if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m||(!m[1]&&!m[2])){trace.status=416;res.writeHead(416,{'Content-Range':'bytes */'+media.length});res.end();return;}if(!m[1])start=Math.max(0,media.length-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}if(start>end||start>=media.length){trace.status=416;res.writeHead(416,{'Content-Range':'bytes */'+media.length});res.end();return;}status=206;}
      const body=media.subarray(start,end+1);trace.status=status;trace.bytes=String(body.length);trace.sha256=digest(body);trace.complete=false;
      res.on('finish',()=>{trace.complete=true;});res.on('close',()=>{trace.closed=true;});
      res.writeHead(status,{'Content-Type':'video/webm','Content-Length':String(body.length),'Accept-Ranges':'bytes',...((mode!=='independent-conditional-cors-with-graph'||req.headers.origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Expose-Headers':'Content-Length, Content-Range, Accept-Ranges'}:{}),'Cache-Control':'no-store','Vary':'Origin',...(status===206?{'Content-Range':`bytes ${start}-${end}/${media.length}`}:{})});res.end(req.method==='HEAD'?undefined:body);
     });await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
     await js(url=>{const v=document.querySelector('dialog video');v.src=url;v.load();return true;},'http://127.0.0.1:'+server.address().port+'/fixture');
    }
    if(mode.endsWith('with-graph'))await js(()=>{const v=document.querySelector('dialog video');const context=new AudioContext();const source=context.createMediaElementSource(v);const analyser=context.createAnalyser();analyser.fftSize=4096;const gain=context.createGain();gain.gain.value=0;source.connect(analyser).connect(gain).connect(context.destination);window.__runtimeAudio={context,source,analyser};return true;});
    await app.focus('Play');await app.nativeKey('Space');
    const state=()=>js(()=>{const v=document.querySelector('dialog video');return {readyState:v.readyState,networkState:v.networkState,errorCode:v.error?.code??null,errorMessage:v.error?.message?.slice(0,512)??null,time:v.currentTime,paused:v.paused,width:v.videoWidth,height:v.videoHeight,key:window.__diagnosticKey,graph:window.__runtimeAudio?.context.state??null};});
    try{await until(async()=>{const s=await state();return s.errorCode||s.time>0.5?s:false;},'Diagnostic WebM playback',12000);}catch(e){result.failure=e.message;}
    result.state=await state();
    if(result.state.time>0.5&&!result.state.errorCode){const a=result.state.time;await pause(250);result.later=await state();assert.ok(result.later.time>a);}
    if(mode.endsWith('with-graph')&&result.state.graph==='running'){const sample=await js(()=>{const {context,analyser}=window.__runtimeAudio;const samples=new Float32Array(4096);analyser.getFloatTimeDomainData(samples);return {samples:[...samples],rate:context.sampleRate};});result.pcm=signalObservation(sample.samples,sample.rate);}
    if(mode==='original-without-graph'){
     result.standaloneAudioDecode=await js(async raw=>{const context=new AudioContext();try{const buffer=await context.decodeAudioData(Uint8Array.from(raw).buffer);const pcm=buffer.getChannelData(0);return {rate:buffer.sampleRate,channels:buffer.numberOfChannels,samples:[...pcm.subarray(0,4096)]};}catch(e){return {failure:String(e)};}finally{await context.close();}},[...media]);
     if(result.standaloneAudioDecode.samples){const s=result.standaloneAudioDecode;result.standaloneAudioDecode={rate:s.rate,channels:s.channels,...signalObservation(s.samples,s.rate)};}
    }
   }catch(e){result.failure=e.stack;}
   finally{await js(async()=>{if(window.__runtimeAudio){await window.__runtimeAudio.context.close();delete window.__runtimeAudio;}return true;}).catch(()=>{});await app.click('Close viewer').catch(()=>{});if(server)await new Promise(resolve=>{server.closeAllConnections();server.close(resolve);});}
  }
 }finally{receipt.nativeOutput=app.output();await app.close();}
}
