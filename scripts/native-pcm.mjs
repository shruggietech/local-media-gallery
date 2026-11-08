// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {signalObservation} from './runtime-evidence.mjs';
import {stopOwnedChild} from './native-driver-lifecycle.mjs';

export function floatPcm(bytes,sampleRate=48000){
 assert.ok(bytes.length>0&&bytes.length%4===0&&bytes.length<=65536*4,'PCM byte count');
 const samples=Array.from({length:bytes.length/4},(_,i)=>bytes.readFloatLE(i*4));
 const signal=signalObservation(samples,sampleRate);
 return {samples: samples.length,sampleRate,rms:signal.rms,frequencyHz:signal.peakHz,frequencyMethod:'positive zero crossings of captured PCM'};
}
export async function collectPcm(child,{frames=16384,timeout=4000,stop=stopOwnedChild}={}){
 assert.ok(Number.isInteger(frames)&&frames>=4096&&frames<=65536);
 assert.ok(Number.isInteger(timeout)&&timeout>0&&timeout<=4000,'PCM observation bound');
 const chunks=[],chunkSizes=[];let count=0,chunkCount=0,stderr=Buffer.alloc(0),firstDataAt=null,lastDataAt=null,childError=null;
 const began=Date.now(),started=new Date(began).toISOString(),requiredBytes=frames*4;
 let result,primary=null,cleanupFailure=null,delivery;
 const diagnostic=()=>({started,pid:child.pid??null,requiredFrames:frames,requiredBytes,bytes:count,receivedSamples:Math.floor(count/4),timeoutMilliseconds:timeout,elapsedMilliseconds:Date.now()-began,chunkCount,chunkSizes,firstDataAt,lastDataAt,partialSha256:createHash('sha256').update(Buffer.concat(chunks)).digest('hex'),stderr:stderr.toString('utf8'),exitCode:child.exitCode??null,signal:child.signalCode??null,childError:childError?.message??null});
 let failed;
 try{
  await new Promise((resolve,reject)=>{
   let settled=false,exitKnown=child.exitCode!=null||child.signalCode!=null,exitCode=child.exitCode,exitSignal=child.signalCode;
   const timer=setTimeout(()=>finish(new Error('Native PCM capture deadline')),timeout);
   function finish(error){if(settled)return;settled=true;clearTimeout(timer);child.stdout.off('data',data);child.stderr.off('data',stderrData);child.stdout.off('end',ended);child.stderr.off('end',ended);child.off('exit',exited);child.off('close',closed);error?reject(error):resolve();}
   function data(bytes){const now=new Date().toISOString();firstDataAt??=now;lastDataAt=now;chunkCount++;if(chunkSizes.length===32)chunkSizes.splice(16,1);chunkSizes.push(bytes.length);const take=bytes.subarray(0,Math.max(0,requiredBytes-count));chunks.push(take);count+=take.length;if(count===requiredBytes&&(!exitKnown||(exitCode===0&&!exitSignal)))finish();}
   function stderrData(bytes){stderr=Buffer.concat([stderr,bytes]).subarray(-4096);}
   failed=error=>{childError=error;finish(error);};
   function ended(){if(exitKnown&&(child.stdout.readableEnded||child.stdout.destroyed)&&(child.stderr.readableEnded||child.stderr.destroyed))finish(new Error('Native PCM capture exited '+JSON.stringify({code:exitCode,signal:exitSignal})));}
   function exited(code,signal){exitKnown=true;exitCode=code;exitSignal=signal;ended();}
   function closed(code,signal){exited(code,signal);}
   // Process exit can precede delivery of the final pipe bytes and stderr.
   child.stdout.on('data',data);child.stderr.on('data',stderrData);child.stdout.on('end',ended);child.stderr.on('end',ended);child.on('error',failed);child.once('exit',exited);child.once('close',closed);ended();
  });
  result=floatPcm(Buffer.concat(chunks));
 }catch(error){primary=error;}
 finally{
  delivery=diagnostic();
  try{await stop(child);}catch(error){cleanupFailure=error;}
  // An inherited pipe must not retain the controller after owned cleanup settles.
  child.stdout.destroy();child.stderr.destroy();if(failed)child.off('error',failed);
 }
 if(primary||cleanupFailure||childError){const cause=primary??cleanupFailure??childError,error=new Error(cause.message+'; '+JSON.stringify(delivery)+(cleanupFailure?'; cleanup: '+cleanupFailure.message:''),{cause});error.captureDiagnostics=delivery;error.cleanupFailure=cleanupFailure?.message??null;throw error;}
 return {...result,started,terminalFinished:new Date().toISOString(),bytes:count,delivery};
}
export async function ownedLinuxProcess(pid,rootPid,read=readFile){
 for(let depth=0;depth<16&&Number.isInteger(pid)&&pid>1;depth++){
  if(pid===rootPid)return true;
  const stat=await read('/proc/'+pid+'/stat','utf8').catch(()=>null);if(!stat)return false;
  const end=stat.lastIndexOf(')');if(end<0)return false;pid=Number(stat.slice(end+2).split(' ')[1]);
 }
 return false;
}
export async function captureLinuxOutput({appPid,hidden,environment,sinkName='lmg_qualification',hasAudio=true,spawnRecorder=spawn}){
 const sinkList=JSON.parse((await hidden('pactl',['--format=json','list','sinks'])).stdout);
 const sink=sinkList.find(s=>s.name===sinkName);assert.ok(sink,'Isolated native audio sink unavailable');
 let input,lastInputs=[];const end=Date.now()+5000;
 while(Date.now()<end){
  lastInputs=JSON.parse((await hidden('pactl',['--format=json','list','sink-inputs'])).stdout);
  if(!hasAudio){assert.equal(lastInputs.filter(s=>s.sink===sink.index).length,0,'Silent no-audio fixture has an unexpected sink input');break;}
  const candidates=[];
  for(const candidate of lastInputs){const pid=Number(candidate.properties?.['application.process.id']);if(candidate.sink===sink.index&&!candidate.corked&&await ownedLinuxProcess(pid,appPid))candidates.push({...candidate,observedPid:pid});}
  if(candidates.length===1){input=candidates[0];break;}
  assert.ok(candidates.length<=1,'Multiple owned native audio streams require explicit attribution');
  await new Promise(r=>setTimeout(r,100));
 }
 if(hasAudio)assert.ok(input,'Owned native audio stream unavailable: '+JSON.stringify(lastInputs.slice(0,16).map(s=>({index:s.index,sink:s.sink,corked:s.corked,pid:s.properties?.['application.process.id']}))));
 const source=sink.monitor_source_name??sinkName+'.monitor';
 const child=spawnRecorder('parec',['--raw','--format=float32le','--rate=48000','--channels=1','--latency-msec=50','--device='+source,...(hasAudio?['--monitor-stream='+input.index]:[])],{windowsHide:true,shell:false,stdio:['ignore','pipe','pipe'],env:environment});
 const pcm=await collectPcm(child);
 const finalInputs=JSON.parse((await hidden('pactl',['--format=json','list','sink-inputs'])).stdout);
 if(hasAudio){const after=finalInputs.find(s=>s.index===input.index);assert.ok(after&&!after.corked&&after.sink===sink.index&&Number(after.properties?.['application.process.id'])===input.observedPid&&await ownedLinuxProcess(input.observedPid,appPid),'Native audio stream changed during capture');}
 else assert.equal(finalInputs.filter(s=>s.sink===sink.index).length,0,'Silent no-audio fixture gained an unexpected sink input');
 return {...pcm,state:'running',method:'native-output-monitor',sink:{name:sink.name,index:sink.index,monitor:source},stream:hasAudio?{index:input.index,pid:input.observedPid,ownedRootPid:appPid}:{index:null,pid:null,ownedRootPid:appPid,absence:'No sink inputs before and after no-audio fixture capture'},output:'Actual selected application stream PCM from isolated PulseAudio sink monitor; physical speakers not tested.'};
}
