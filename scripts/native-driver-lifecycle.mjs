// SPDX-License-Identifier: Apache-2.0
import {createServer} from 'node:net';
export async function availableLoopbackPort(){const s=createServer();await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});const port=s.address().port;await new Promise((resolve,reject)=>s.close(e=>e?reject(e):resolve()));return port;}
export function observeChild(child){
 let stdout='',stderr='',failure=null;
 child.stdout?.on('data',b=>stdout=(stdout+b).slice(-16384));child.stderr?.on('data',b=>stderr=(stderr+b).slice(-16384));child.once('error',e=>failure=e);
 return ()=>({pid:child.pid,exitCode:child.exitCode,signal:child.signalCode,error:failure?.message??null,stdout,stderr});
}
// HTTP status is only listener availability. The secret is supplied exclusively
// through the owned child's environment, never in a request to an unknown server.
export async function readyDriver(child,origin,observation,timeout=15000,{nonce,context={},listenerOwner}={}){
 if(typeof listenerOwner!=='function'&&(typeof nonce!=='string'||nonce.length<16))throw new Error('Owned driver nonce required');
 const end=Date.now()+timeout;let last=null,listener=null,session;
 const failure=message=>new Error(message+': '+JSON.stringify({context,origin,listener,...observation(),last}));
 const alive=()=>{const s=observation();if(s.error||child.exitCode!==null||child.signalCode!==null)throw failure('Native driver exited before readiness');};
 async function request(route,body){
  const remaining=end-Date.now();if(remaining<=0)throw failure('Native driver readiness deadline');
  const response=await fetch(origin+route,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(Math.max(1,Math.min(2000,remaining)))});
  listener={status:response.status,route};if(!response.ok)throw new Error('Driver HTTP '+response.status);
  // Keep untrusted listener responses bounded, including a peer that streams forever.
  const reader=response.body.getReader();let bytes=0;const chunks=[];
  try{for(;;){const next=await reader.read();if(next.done)break;bytes+=next.value.length;if(bytes>65536)throw new Error('Driver readiness response budget');chunks.push(Buffer.from(next.value));}}finally{await reader.cancel().catch(()=>{});}
  const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(result.value?.error)throw new Error(String(result.value.message??result.value.error).slice(0,1024));return result.value;
 }
 async function owner(){
  let timer;try{return await Promise.race([listenerOwner({port:Number(new URL(origin).port),deadline:end}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(failure('Native driver listener ownership deadline')),Math.max(1,end-Date.now()));})]);}finally{clearTimeout(timer);}
 }
 const matches=identity=>identity?.pid===child.pid&&identity?.port===Number(new URL(origin).port)&&(listenerOwner||identity?.nonce===nonce);
 while(Date.now()<end){
  alive();let identity;
  try{
   await request('/status');
   if(listenerOwner){const observed=await owner();listener={...listener,ownership:observed};if(!matches(observed))throw failure('Native driver ownership mismatch');}
   if(!session){session=(await request('/session',{capabilities:{alwaysMatch:{'wdio:tauriServiceOptions':{windowLabel:'main'}}}}))?.sessionId;if(typeof session!=='string'||!/^[a-zA-Z0-9-]{1,128}$/.test(session))throw new Error('Invalid driver session identity');}
   identity=listenerOwner?await owner():await request('/session/'+session+'/execute/sync',{script:'return await window.__TAURI_INTERNALS__.invoke("test_native_qualification",{action:"identity"});',args:[]});
  }catch(e){if(e.message.startsWith('Native driver ownership mismatch'))throw e;last=String(e.message).slice(0,2048);}
  alive();
  if(identity!==undefined){
   listener={...listener,pid:identity?.pid??null,port:identity?.port??null,nonceMatched:listenerOwner?null:identity?.nonce===nonce,method:listenerOwner?'OS listener PID':'child-only nonce/PID'};
   if(!matches(identity))throw failure('Native driver ownership mismatch');
   if(Date.now()>=end)break;
   return session;
  }
  await new Promise(r=>setTimeout(r,Math.max(0,Math.min(100,end-Date.now()))));
 }
 throw failure('Native driver readiness deadline');
}
export async function stopOwnedChild(child,timeout=5000){if(child.pid===undefined||child.exitCode!==null||child.signalCode!==null)return;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.off('exit',done);reject(new Error('Owned child exit deadline for PID '+child.pid));},timeout);function done(){clearTimeout(timer);resolve();}child.once('exit',done);child.kill();});}
