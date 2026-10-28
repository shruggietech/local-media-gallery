// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function unsupportedVideoError(code){
 assert.ok([3,4].includes(code),'Native video transport, aborted or unknown load failure (MediaError '+code+')');
 return code;
}
export function signalObservation(samples,sampleRate){
 assert.ok(samples.length>0&&samples.length<=65536);assert.ok(Number.isFinite(sampleRate)&&sampleRate>0);
 let energy=0,crossings=0;
 for(let i=0;i<samples.length;i++){assert.ok(Number.isFinite(samples[i]));energy+=samples[i]**2;if(i&&samples[i-1]<=0&&samples[i]>0)crossings++;}
 return {rms:Math.sqrt(energy/samples.length),peakHz:crossings*sampleRate/samples.length};
}
export function validateAudioProgress(state,before,after){
 assert.equal(state,'running','Native audio graph is suspended');
 assert.ok(Number.isFinite(before)&&before>=0&&Number.isFinite(after)&&after>before,'Native audio graph clock did not advance');
 return {before,after};
}
export function validateRuntimeReceipt(r,expected){
 assert.equal(r.formatVersion,1);assert.equal(r.result,'pass');assert.deepEqual(r.source,expected.source);
 assert.notEqual(r.acceptance,false);assert.equal(r.diagnosticStyle,undefined);assert.equal(r.diagnosticReload,undefined);
 assert.equal(r.edition,expected.edition);assert.equal(r.environment.platform,expected.platform);
 assert.equal(r.binary.sha256,expected.binarySha256);assert.match(r.binary.bytes,/^(0|[1-9][0-9]*)$/);
 assert.equal(r.fixture.sha256,expected.fixtureSha256);assert.ok(r.environment.userAgent.length>0);
 assert.ok(Number.isFinite(r.environment.devicePixelRatio)&&r.environment.devicePixelRatio>0);
 assert.ok(Number.isFinite(Date.parse(r.terminalFinished)));
 for(const name of ['images','video','keyboard','presentation','nativeAccessibility','integrity'])assert.ok(r.checks.some(c=>c.name===name&&c.result==='pass'),'Missing native check '+name);
 assert.ok(r.checks.every(c=>c.result==='pass'));assert.equal(r.input.trusted,true);assert.ok(r.input.method.length>0);
 assert.ok(['UIAutomation','AT-SPI','AppKit/WKWebView provider','WebKit remote-token/ApplicationServices native AX client (test-only SPI)'].includes(r.accessibility.method));
 assert.equal(r.accessibility.overflow,false);assert.ok(r.accessibility.nodes>0&&r.accessibility.nodes<=2048);
 for(const name of ['Refresh','Controls','Thumbnails','Diagnostics'])assert.ok(r.accessibility.essentialNames.includes(name),'Missing native accessible '+name);
 if(expected.platform==='win32'){
  assert.equal(r.screenReader.name,'NVDA');assert.ok(r.screenReader.version);assert.equal(r.screenReader.overflow,false);
  assert.ok(r.screenReader.speech.length>0&&r.screenReader.speech.length<=256);assert.match(r.screenReader.bytes,/^(0|[1-9][0-9]*)$/);assert.ok(BigInt(r.screenReader.bytes)<=262144n);
 }
 for(const media of r.media){
  assert.ok(['supported','unsupported'].includes(media.outcome));assert.equal(media.retained,true);assert.equal(media.inspectable,true);
  if(media.type==='video'&&media.outcome==='supported'){
   const audio=media.audio;assert.ok(['media-element','native-original-buffer'].includes(audio.method));assert.equal(audio.state,'running');if(audio.clock)validateAudioProgress(audio.state,audio.clock.before,audio.clock.after);
   assert.ok(Number.isFinite(audio.sampleRate)&&audio.sampleRate>0);assert.ok(Number.isFinite(audio.rms)&&audio.rms>=0);assert.ok(Number.isFinite(audio.fftPeakHz));
   if(media.frequency){assert.ok(audio.rms>0.01);assert.ok(Math.abs(audio.fftPeakHz-media.frequency)<30);}else assert.ok(audio.rms<0.0001);
   if(audio.method==='native-original-buffer'){
    assert.equal(expected.platform,'darwin');assert.equal(media.codec,'vp9');
    assert.equal(digest(Buffer.from(JSON.stringify(r.fixture.files))),expected.fixtureSha256);
    const original=r.fixture.files.find(f=>f.name===media.name);assert.ok(original);
    assert.equal(audio.decodedSource.sha256,original.sha256);assert.equal(audio.decodedSource.bytes,original.bytes);
   }
  }
  if(media.outcome==='unsupported'){
   assert.ok(typeof media.reason==='string'&&media.reason.trim().length>0);
   if(media.type==='video')unsupportedVideoError(media.errorCode);
  }
 }
 return r;
}
