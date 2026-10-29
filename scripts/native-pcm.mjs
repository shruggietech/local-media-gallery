// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {signalObservation} from './runtime-evidence.mjs';
import {stopOwnedChild} from './native-driver-lifecycle.mjs';

export function floatPcm(bytes,sampleRate=48000){
 assert.ok(bytes.length>0&&bytes.length%4===0&&bytes.length<=65536*4,'PCM byte count');
 const samples=Array.from({length:bytes.length/4},(_,i)=>bytes.readFloatLE(i*4));
 const signal=signalObservation(samples,sampleRate);
 return {samples: samples.length,sampleRate,rms:signal.rms,frequencyHz:signal.peakHz,frequencyMethod:'positive zero crossings of captured PCM'};
}
export async function collectPcm(child,{frames=16384,timeout=4000}={}){
 assert.ok(Number.isInteger(frames)&&frames>=4096&&frames<=65536);
 const chunks=[];let count=0,stderr='';const started=new Date().toISOString();
 try{
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>finish(new Error('Native PCM capture deadline')),timeout);
   function finish(error){clearTimeout(timer);child.stdout.off('data',data);child.stderr.off('data',diagnostic);child.off('error',failed);child.off('exit',exited);error?reject(error):resolve();}
   function data(bytes){const take=bytes.subarray(0,Math.max(0,frames*4-count));chunks.push(take);count+=take.length;if(count===frames*4)finish();}
   function diagnostic(bytes){stderr=(stderr+bytes).slice(-4096);}
   function failed(error){finish(error);}
   function exited(code,signal){finish(new Error('Native PCM capture exited '+JSON.stringify({code,signal})));}
   child.stdout.on('data',data);child.stderr.on('data',diagnostic);child.once('error',failed);child.once('exit',exited);
  });
  return {...floatPcm(Buffer.concat(chunks)),started,terminalFinished:new Date().toISOString(),bytes:count};
 }catch(error){throw new Error(error.message+'; '+JSON.stringify({started,bytes:count,stderr,exitCode:child.exitCode,signal:child.signalCode}),{cause:error});}
 finally{await stopOwnedChild(child);}
}
export async function ownedLinuxProcess(pid,rootPid,read=readFile){
 for(let depth=0;depth<16&&Number.isInteger(pid)&&pid>1;depth++){
  if(pid===rootPid)return true;
  const stat=await read('/proc/'+pid+'/stat','utf8').catch(()=>null);if(!stat)return false;
  const end=stat.lastIndexOf(')');if(end<0)return false;pid=Number(stat.slice(end+2).split(' ')[1]);
 }
 return false;
}
export async function captureLinuxOutput({appPid,hidden,environment,sinkName='lmg_qualification',hasAudio=true}){
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
 const child=spawn('parec',['--raw','--format=float32le','--rate=48000','--channels=1','--device='+source,...(hasAudio?['--monitor-stream='+input.index]:[])],{windowsHide:true,shell:false,stdio:['ignore','pipe','pipe'],env:environment});
 const pcm=await collectPcm(child);
 const finalInputs=JSON.parse((await hidden('pactl',['--format=json','list','sink-inputs'])).stdout);
 if(hasAudio){const after=finalInputs.find(s=>s.index===input.index);assert.ok(after&&!after.corked&&after.sink===sink.index&&Number(after.properties?.['application.process.id'])===input.observedPid&&await ownedLinuxProcess(input.observedPid,appPid),'Native audio stream changed during capture');}
 else assert.equal(finalInputs.filter(s=>s.sink===sink.index).length,0,'Silent no-audio fixture gained an unexpected sink input');
 return {...pcm,state:'running',method:'native-output-monitor',sink:{name:sink.name,index:sink.index,monitor:source},stream:hasAudio?{index:input.index,pid:input.observedPid,ownedRootPid:appPid}:{index:null,pid:null,ownedRootPid:appPid,absence:'No sink inputs before and after no-audio fixture capture'},output:'Actual selected application stream PCM from isolated PulseAudio sink monitor; physical speakers not tested.'};
}
