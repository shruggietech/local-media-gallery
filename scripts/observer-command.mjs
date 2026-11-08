// SPDX-License-Identifier: Apache-2.0
import {spawn} from 'node:child_process';
import path from 'node:path';

export function terminateWindowsChildTree(child,{launch=spawn,graceMilliseconds=3000}={}) {
  if(!Number.isSafeInteger(child.pid)||child.pid<=0)throw new Error('Owned child PID required');
  if(child.exitCode!==null||child.signalCode!==null)return;
  let terminator,watchdog,finished=false;
  const finish=()=>{
    if(finished)return;finished=true;clearTimeout(watchdog);
    if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');
  };
  try {
    terminator=launch('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,shell:false,stdio:'ignore'});
    terminator.once('error',finish);terminator.once('exit',finish);
    watchdog=setTimeout(()=>{if(terminator.exitCode===null&&terminator.signalCode===null)terminator.kill('SIGKILL');finish();},graceMilliseconds);
  } catch {finish();}
}

// Exit and inherited pipe closure are separate observations. A failed kill is
// not evidence of exit, and neither can retain the controller indefinitely.
export function settleOwnedChild(child,{label='Owned command',deadline=null,hardDeadline=null,drainMilliseconds=1000,terminationMilliseconds=3500,maxBuffer=8*1024*1024,collect=true,abortSignal,deadlineMessage,terminate=process.platform==='win32'?terminateWindowsChildTree:c=>c.kill('SIGKILL')}={}){
 return new Promise((resolve,reject)=>{
  let settled=false,exited=child.exitCode!=null||child.signalCode!=null,closed=false,code=child.exitCode??null,signal=child.signalCode??null,primary=null,terminationRequested=false,terminationError=null;
  let operationTimer,drainTimer,terminationTimer;const output={stdout:[],stderr:[]},sizes={stdout:0,stderr:0};
  const drained=()=>[child.stdout,child.stderr].every(stream=>!stream||stream.readableEnded||stream.destroyed);
  const terminal=()=>({pid:child.pid??null,exitObserved:exited,stdioClosed:closed||drained(),exitCode:code,signal,terminationRequested,terminationError,finished:new Date().toISOString()});
  const onError=error=>{if(!settled)abort(error);};
  function finish(){
   if(settled)return;settled=true;clearTimeout(operationTimer);clearTimeout(drainTimer);clearTimeout(terminationTimer);
   child.off('exit',onExit);child.off('close',onClose);abortSignal?.removeEventListener('abort',onAbort);
   for(const [name,stream]of [['stdout',child.stdout],['stderr',child.stderr]])if(stream){stream.off('data',handlers[name]);stream.off('end',onEnd);stream.off('error',onError);}
   const result={code,signal,stdout:Buffer.concat(output.stdout).toString('utf8'),stderr:Buffer.concat(output.stderr).toString('utf8'),terminal:terminal()};
   child.stdout?.destroy();child.stderr?.destroy();
   if(closed)child.off('error',onError);else child.once('close',()=>child.off('error',onError));
   const error=primary??(code===0?null:new Error(label+' exited '+(code??signal??'without terminal status')));
   if(error){error.code??=code;error.signal=signal;error.killed=terminationRequested;error.stdout=result.stdout;error.stderr=result.stderr;error.terminal=result.terminal;reject(error);}else resolve(result);
  }
  function abort(error){
   if(settled)return;primary??=error;clearTimeout(operationTimer);
   if(!terminationRequested&&!exited&&Number.isSafeInteger(child.pid)&&child.pid>0){terminationRequested=true;try{const pending=terminate(child);if(pending?.catch)pending.catch(e=>{terminationError=e.message;});}catch(e){terminationError=e.message;}}
   const remaining=hardDeadline===null?terminationMilliseconds:Math.max(0,Math.min(terminationMilliseconds,hardDeadline-Date.now()));
   terminationTimer??=setTimeout(finish,remaining);
   if(exited&&(closed||drained()))finish();
  }
  function onAbort(){abort(abortSignal.reason instanceof Error?abortSignal.reason:new Error(label+' aborted'));}
  function onEnd(){if(exited&&(closed||drained()))finish();}
  function onExit(value,reason){
   exited=true;code=value;signal=reason;clearTimeout(operationTimer);
   if(closed||drained()){finish();return;}
   const remaining=hardDeadline===null?drainMilliseconds:Math.max(0,Math.min(drainMilliseconds,hardDeadline-Date.now()));
   drainTimer??=setTimeout(()=>{primary??=new Error(label+' output drain deadline after process exit');finish();},remaining);
  }
  function onClose(value,reason){closed=true;if(!exited){exited=true;code=value;signal=reason;}finish();}
  const handlers=Object.fromEntries(['stdout','stderr'].map(name=>[name,bytes=>{
   if(settled)return;const take=bytes.subarray(0,Math.max(0,maxBuffer-sizes[name]));output[name].push(take);sizes[name]+=take.length;
   if(bytes.length>take.length){const error=new Error(label+' output exceeds its bound');error.code='ERR_CHILD_PROCESS_STDIO_MAXBUFFER';abort(error);}
  }]));
  child.on('error',onError);child.once('exit',onExit);child.once('close',onClose);
  for(const [name,stream]of [['stdout',child.stdout],['stderr',child.stderr]])if(stream){if(collect)stream.on('data',handlers[name]);stream.on('end',onEnd);stream.on('error',onError);}
  if(deadline!==null)operationTimer=setTimeout(()=>{const error=new Error(deadlineMessage??(label+' deadline'));error.code='ETIMEDOUT';abort(error);},Math.max(0,deadline-Date.now()));
  if(abortSignal){abortSignal.addEventListener('abort',onAbort,{once:true});if(abortSignal.aborted)queueMicrotask(onAbort);}
  if(exited)queueMicrotask(()=>onExit(code,signal));
 });
}
export async function captureObserverCommand(file,args,{cwd,env,timeout=180000,deadline=null,hardDeadline=null,maxBuffer=8*1024*1024,drainMilliseconds=1000,terminationMilliseconds=3500,launch=spawn,terminate,checkpoint=async()=>{},windowsVerbatimArguments=false}={}){
 const end=Math.min(Date.now()+timeout,deadline??Infinity),controller=new AbortController();
 const record=async(event,until=end)=>{let timer;try{return await Promise.race([checkpoint(event),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Observer checkpoint deadline')),Math.max(0,until-Date.now()));})]);}finally{clearTimeout(timer);}};
 if(Date.now()>=end)throw new Error('Owned command deadline before admission');
 const action=path.basename(file);
 await record({phase:'command',status:'pending',action,deadline:new Date(end).toISOString()});
 if(Date.now()>=end)throw new Error('Owned command deadline before admission');
 const child=launch(file,args,{cwd,env,windowsHide:true,shell:false,windowsVerbatimArguments,stdio:['pipe','pipe','pipe']});
 const work=settleOwnedChild(child,{label:action,deadline:end,hardDeadline,maxBuffer,drainMilliseconds,terminationMilliseconds,abortSignal:controller.signal,...(terminate?{terminate}:{})});work.catch(()=>{});
 child.stdin?.on('error',()=>{});child.stdin?.end();
 try{
  await record({phase:'command',status:'started',action,actor:{pid:child.pid??null,creationTime:null}});
  const result=await work;await record({phase:'command',status:'complete',action,actor:{pid:child.pid??null,creationTime:null},exitCode:result.code},Math.min(hardDeadline??Infinity,Date.now()+1000));return result;
 }catch(error){
  controller.abort(error);const terminal=await work.catch(failure=>failure);error.terminal??=terminal.terminal;
  await record({phase:'command',status:'failed',action,actor:{pid:child.pid??null,creationTime:null},exitCode:error.terminal?.exitCode??null,errorCode:String(error.code??'command_failure')},Math.min(hardDeadline??Infinity,Date.now()+1000)).catch(()=>{error.checkpointFailure=true;});throw error;
 }
}
