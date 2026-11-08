// SPDX-License-Identifier: Apache-2.0
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {settleOwnedChild} from './observer-command.mjs';

// Native progress controls may have no accessible name while their text changes.
export function msiControlLabel(value){
 if(value===null||value===undefined)return '';
 if(typeof value!=='string')throw new TypeError('MSI accessible label must be text or absent');
 return value.replaceAll('&','').replaceAll('>','').replaceAll('<','').trim();
}

// Only code is retained between requests. Every native query still runs afresh.
export async function observerSession(child,sources,{startupTimeout=20000,shutdownTimeout=10000,maxBytes=8*1024*1024,deadline=null,hardDeadline=deadline===null?null:deadline+15000,checkpoint=async()=>{}}={}){
 let pending=null,buffer=Buffer.alloc(0),stderr='',failure=null,sequence=0,tail=Promise.resolve(),closing=false,closeWork=null,handshake=null;
 const closingSignal=new AbortController();let readyResolve,readyReject;
 const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
 const actor=()=>({pid:child.pid??null,creationTime:handshake?.creationTime??null,...(handshake?.executablePath?{executablePath:handshake.executablePath,sha256:handshake.executableSha256}:{} )});
 const fail=error=>{if(failure)return;failure=Error(error.message+': '+JSON.stringify({pid:child.pid,exitCode:child.exitCode,stderr}));readyReject(failure);pending?.reject(failure);pending=null;if(child.exitCode===null&&child.signalCode===null)child.kill();};
 async function record(event,until,allowClosing=false){
  let timer,aborted;try{return await Promise.race([checkpoint(event),new Promise((_,reject)=>{
   timer=setTimeout(()=>reject(Error('Observer checkpoint deadline')),Math.max(0,until-Date.now()));
   if(!allowClosing){aborted=()=>reject(Error('Observer is closing'));closingSignal.signal.addEventListener('abort',aborted,{once:true});if(closingSignal.signal.aborted)aborted();}
  })]);}finally{clearTimeout(timer);if(aborted)closingSignal.signal.removeEventListener('abort',aborted);}
 }
 child.stderr.on('data',bytes=>stderr=(stderr+bytes.toString('utf8')).slice(-16384));child.on('error',fail);child.stdin.on('error',fail);
 child.on('exit',(code,signal)=>{if(!closing||pending||code!==0||buffer.length)fail(Error('Observer exited '+code+'/'+signal));});
 child.stdout.on('data',chunk=>{
  try{
   buffer=Buffer.concat([buffer,chunk]);if(buffer.length>maxBytes)throw Error('Observer output exceeds its bound');
   for(let end;(end=buffer.indexOf(10))>=0;){
    const value=JSON.parse(buffer.subarray(0,end).toString('utf8'));buffer=buffer.subarray(end+1);
    if(!handshake){
     if(value.type!=='ready'||value.protocolVersion!==1||value.pid!==child.pid||JSON.stringify(Object.entries(value.sources??{}).sort())!==JSON.stringify(Object.entries(sources).sort()))throw Error('Observer handshake identity/source mismatch');
     if(value.creationTime!==undefined&&!/^[1-9][0-9]{0,24}$/.test(value.creationTime))throw Error('Observer creation identity mismatch');
     handshake=value;readyResolve(value);
    }else{
     if(!pending||value.id!==pending.id||value.pid!==child.pid||typeof value.ok!=='boolean'||(handshake.creationTime!==undefined&&value.creationTime!==handshake.creationTime))throw Error('Observer response identity mismatch');
     const current=pending;pending=null;if(value.ok)current.resolve(value.result);else current.reject(Error('Native observer: '+String(value.error).slice(0,4096)));
    }
   }
  }catch(error){fail(error);}
 });
 const startupEnd=Math.min(Date.now()+startupTimeout,deadline??Infinity),timer=setTimeout(()=>fail(Error('Observer startup deadline')),Math.max(0,startupEnd-Date.now()));
 try{await ready;await record({phase:'observer',status:'started',actor:actor()},startupEnd);}catch(error){
  closing=true;closingSignal.abort();try{await settleOwnedChild(child,{label:'Observer exited during startup',deadline:Math.min(Date.now()+shutdownTimeout,hardDeadline??Infinity),hardDeadline,collect:false});}catch{}throw error;
 }finally{clearTimeout(timer);}
 return {
  identity:handshake,
  request(route,parameters={},timeout=20000){
   const operation=tail.then(async()=>{
    if(failure)throw failure;if(closing)throw Error('Observer is closing');
    const id=++sequence,until=Math.min(Date.now()+timeout,deadline??Infinity);let clock,result,primary=null;
    const event={phase:'request',status:'pending',route,requestId:id,actor:actor(),...(Number.isSafeInteger(parameters.processId)&&parameters.processId>0?{targetActor:{pid:parameters.processId,creationTime:null}}:{}),...(route==='msi'&&typeof parameters.name==='string'?{action:parameters.name.slice(0,256)}:{}),deadline:new Date(until).toISOString()};
    try{
     if(Date.now()>=until)throw Error('Observer request deadline before admission');
     await record(event,until);
     if(failure)throw failure;if(closing)throw Error('Observer is closing');if(Date.now()>=until)throw Error('Observer request deadline before admission');
     result=await new Promise((resolve,reject)=>{
      pending={id,resolve,reject};clock=setTimeout(()=>fail(Error('Observer request deadline for '+route)),Math.max(0,until-Date.now()));
      const line=JSON.stringify({...parameters,id,route})+'\n';if(Buffer.byteLength(line)>65536){pending=null;reject(Error('Observer request exceeds its bound'));return;}
      child.stdin.write(line,error=>{if(error)fail(error);});
     });
    }catch(error){primary=error;}finally{clearTimeout(clock);}
    try{await record({...event,status:primary?'failed':'complete',...(primary?{errorCode:'native_request_failed'}:{})},Math.min(Date.now()+1000,hardDeadline??Infinity));}catch(error){primary??=error;}
    if(primary)throw primary;return result;
   });
   tail=operation.catch(()=>{});return operation;
  },
  close(){
   if(closeWork)return closeWork;
   // Retire admission immediately. Never wait behind a blocked request queue.
   closing=true;closingSignal.abort();if(pending)fail(Error('Observer closing with pending request'));
   closeWork=(async()=>{
    const until=Math.min(Date.now()+shutdownTimeout,hardDeadline??Infinity);let cleanupError=null;
    try{await record({phase:'observer',status:'closing',actor:actor()},until,true);}catch(error){cleanupError=error;}
    const ended=settleOwnedChild(child,{label:'Observer exited',deadline:until,hardDeadline,collect:false});child.stdin.end();
    try{await ended;}catch(error){cleanupError??=error;}
    try{await record({phase:'observer',status:failure||cleanupError?'failed':'closed',actor:actor(),exitCode:child.exitCode??null},Math.min(Date.now()+500,hardDeadline??Infinity),true);}catch(error){cleanupError??=error;}
    if(failure){if(cleanupError)failure.cleanupError=cleanupError.message;throw failure;}if(cleanupError)throw cleanupError;
   })();return closeWork;
  }
 };
}
export async function openWindowsPackageObserver(root,{cwd,env,...options}={}){
 const sources={};for(const [route,file]of Object.entries({ui:'windows-package-ui.ps1',inspect:'inspect-windows-package.ps1',msi:'windows-msi-ui.ps1',input:'native-input.ps1',state:'Get-WindowsPackageSnapshot.ps1',runtime:'Get-WindowsPackageSnapshot.ps1'}))sources[route]=createHash('sha256').update(await readFile(path.join(root,'scripts',file))).digest('hex');
 const child=spawn('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-Mta','-File',path.join(root,'scripts/Invoke-WindowsPackageObserver.ps1')],{cwd,env,windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});
 const session=await observerSession(child,sources,options);
 const serverSha256=createHash('sha256').update(await readFile(path.join(root,'scripts/Invoke-WindowsPackageObserver.ps1'))).digest('hex');
 if(session.identity.serverSha256!==serverSha256||!/^[1-9][0-9]{0,24}$/.test(session.identity.creationTime??'')||!/^[a-f0-9]{64}$/.test(session.identity.executableSha256??'')){await session.close();throw Error('Native observer creation/source identity missing');}
 if(session.identity.apartment!=='MTA'){await session.close();throw Error('Native UI observer requires an actual MTA thread');}
 return session;
}
