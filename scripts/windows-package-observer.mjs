// SPDX-License-Identifier: Apache-2.0
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {stopOwnedChild} from './native-driver-lifecycle.mjs';

// Only code is retained between requests. Every native query still runs afresh.
export async function observerSession(child,sources,{startupTimeout=20000,maxBytes=8*1024*1024}={}){
 let pending=null,buffer=Buffer.alloc(0),stderr='',failure=null,sequence=0,tail=Promise.resolve(),closing=false;
 let readyResolve,readyReject;
 const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
 const fail=error=>{if(failure)return;failure=Error(error.message+': '+JSON.stringify({pid:child.pid,exitCode:child.exitCode,stderr}));readyReject(failure);pending?.reject(failure);pending=null;if(child.exitCode===null&&child.signalCode===null)child.kill();};
 child.stderr.on('data',b=>stderr=(stderr+b.toString('utf8')).slice(-16384));
 child.on('error',fail);
 child.on('exit',(code,signal)=>{if(!closing||pending||code!==0||buffer.length)fail(Error('Observer exited '+code+'/'+signal));});
 child.stdin.on('error',fail);
 let handshake=null;
 child.stdout.on('data',chunk=>{
  try{
   buffer=Buffer.concat([buffer,chunk]);if(buffer.length>maxBytes)throw Error('Observer output exceeds its bound');
   for(let end;(end=buffer.indexOf(10))>=0;){
    const record=JSON.parse(buffer.subarray(0,end).toString('utf8'));buffer=buffer.subarray(end+1);
    if(!handshake){
     if(record.type!=='ready'||record.protocolVersion!==1||record.pid!==child.pid||JSON.stringify(Object.entries(record.sources??{}).sort())!==JSON.stringify(Object.entries(sources).sort()))throw Error('Observer handshake identity/source mismatch');
     handshake=record;readyResolve(record);
    }else{
     if(!pending||record.id!==pending.id||record.pid!==child.pid||typeof record.ok!=='boolean')throw Error('Observer response identity mismatch');
     const current=pending;pending=null;
     if(record.ok)current.resolve(record.result);else current.reject(Error('Native observer: '+String(record.error).slice(0,4096)));
    }
   }
  }catch(error){fail(error);}
 });
 const timer=setTimeout(()=>fail(Error('Observer startup deadline')),startupTimeout);
 try{await ready;}catch(error){await stopOwnedChild(child);throw error;}finally{clearTimeout(timer);}
 return {
  identity:handshake,
  request(route,parameters={},timeout=20000){
   const operation=tail.then(async()=>{
    if(failure)throw failure;if(closing)throw Error('Observer is closing');
    const id=++sequence;
    let clock;
    try{return await new Promise((resolve,reject)=>{
     pending={id,resolve,reject};clock=setTimeout(()=>fail(Error('Observer request deadline for '+route)),timeout);
     const line=JSON.stringify({...parameters,id,route})+'\n';if(Buffer.byteLength(line)>65536){pending=null;reject(Error('Observer request exceeds its bound'));return;}
     child.stdin.write(line,error=>{if(error)fail(error);});
    });}finally{clearTimeout(clock);}
   });
   tail=operation.catch(()=>{});return operation;
  },
  async close(){
   await tail;closing=true;
   if(child.exitCode===null&&child.signalCode===null){
    let timer;const exited=new Promise(resolve=>child.once('exit',resolve));child.stdin.end();
    try{await Promise.race([exited,new Promise(resolve=>{timer=setTimeout(resolve,2000);})]);}finally{clearTimeout(timer);}
    await stopOwnedChild(child);
   }
   if(failure)throw failure;
  }
 };
}
export async function openWindowsPackageObserver(root,{cwd,env}={}){
 const sources={};for(const [route,file]of Object.entries({ui:'windows-package-ui.ps1',inspect:'inspect-windows-package.ps1'}))sources[route]=createHash('sha256').update(await readFile(path.join(root,'scripts',file))).digest('hex');
 const child=spawn('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'scripts/Invoke-WindowsPackageObserver.ps1')],{cwd,env,windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});
 return observerSession(child,sources);
}
