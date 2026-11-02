// SPDX-License-Identifier: Apache-2.0
import {createServer} from 'node:net';
export function settingsControlsReady(records,expected){
 return records.some(r=>(expected===undefined?['Hide controls','Show controls'].includes(r.name):r.name===(expected.controlsExpanded?'Hide controls':'Show controls'))&&r.enabled===true&&r.showing!==false&&r.offscreen!==true);
}
export async function availableLoopbackPort(){const s=createServer();await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});const port=s.address().port;await new Promise((resolve,reject)=>s.close(e=>e?reject(e):resolve()));return port;}
export function observeChild(child){
 let stdout='',stderr='',failure=null;
 child.stdout?.on('data',b=>stdout=(stdout+b).slice(-16384));child.stderr?.on('data',b=>stderr=(stderr+b).slice(-16384));child.once('error',e=>failure=e);
 return ()=>({pid:child.pid,exitCode:child.exitCode,signal:child.signalCode,error:failure?.message??null,stdout,stderr});
}
// HTTP status is only listener availability. The secret is supplied exclusively
// through the owned child's environment, never in a request to an unknown server.
export async function readyDriver(child,origin,observation,timeout=15000,{nonce,context={},listenerOwner,readinessScriptTimeoutMs,timeline=[]}={}){
 if(typeof listenerOwner!=='function'&&(typeof nonce!=='string'||nonce.length<16))throw new Error('Owned driver nonce required');
 if(readinessScriptTimeoutMs!==undefined&&(listenerOwner||!Number.isInteger(readinessScriptTimeoutMs)||readinessScriptTimeoutMs<=0||readinessScriptTimeoutMs>400))throw new Error('Bounded native script readiness is available only for nonce ownership (1-400ms)');
 const started=Date.now(),end=started+timeout;let last=null,listener=null,session,requestId=0,originalTimeouts,scriptConfigured=false,scriptMayDiffer=false,scriptRestored=false,ownedIdentity;
 const note=event=>{timeline.push({...event,elapsedMilliseconds:Date.now()-started});if(timeline.length>512)timeline.splice(16,1);};
 const failure=message=>{const details={context,origin,listener,...observation(),last,timeline};const error=new Error(message+': '+JSON.stringify(details));error.readinessDiagnostics=details;return error;};
 const alive=()=>{const s=observation();if(s.error||child.exitCode!==null||child.signalCode!==null)throw failure('Native driver exited before readiness');};
 async function request(route,body){
  const remaining=end-Date.now();if(remaining<=0)throw failure('Native driver readiness deadline');
  const id=++requestId,began=Date.now(),allowance=Math.max(1,route==='/session'?remaining:Math.min(2000,remaining)),method=body===undefined?'GET':'POST';note({phase:'request-started',id,route,method,timeoutMs:allowance});
  try{
   const response=await fetch(origin+route,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(allowance)});
   listener={status:response.status,route};note({phase:'response-headers',id,route,status:response.status,requestMilliseconds:Date.now()-began});if(!response.ok){await response.body?.cancel();throw new Error('Driver HTTP '+response.status);}
   // Keep untrusted listener responses bounded, including a peer that streams forever.
   const reader=response.body.getReader();let bytes=0;const chunks=[];
   try{for(;;){const next=await reader.read();if(next.done)break;bytes+=next.value.length;if(bytes>65536)throw new Error('Driver readiness response budget');chunks.push(Buffer.from(next.value));}}finally{await reader.cancel().catch(()=>{});}
   note({phase:'response-body-complete',id,route,bytes,requestMilliseconds:Date.now()-began});const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(result.value?.error)throw new Error(String(result.value.message??result.value.error).slice(0,1024));return result.value;
  }catch(error){note({phase:'request-failed',id,route,requestMilliseconds:Date.now()-began,error:String(error.message).slice(0,1024)});throw error;}
 }
 async function owner(){
  let timer;try{return await Promise.race([listenerOwner({port:Number(new URL(origin).port),deadline:end}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(failure('Native driver listener ownership deadline')),Math.max(1,end-Date.now()));})]);}finally{clearTimeout(timer);}
 }
 const matches=identity=>identity?.pid===child.pid&&identity?.port===Number(new URL(origin).port)&&(listenerOwner||identity?.nonce===nonce);
 async function configureScript(){
  const route='/session/'+session+'/timeouts';
  if(!originalTimeouts){const actual=await request(route);if(!actual||!['script','pageLoad','implicit'].every(key=>Number.isSafeInteger(actual[key])&&actual[key]>=0))throw new Error('Invalid original driver timeouts');originalTimeouts={script:actual.script,pageLoad:actual.pageLoad,implicit:actual.implicit};note({phase:'native-script-timeout-original',script:actual.script});}
  if(!scriptConfigured){const script=Math.min(originalTimeouts.script,readinessScriptTimeoutMs);scriptMayDiffer=script!==originalTimeouts.script;await request(route,{script});const observed=await request(route);if(observed?.script!==script||observed?.pageLoad!==originalTimeouts.pageLoad||observed?.implicit!==originalTimeouts.implicit)throw new Error('Native readiness script timeout readback differs');scriptConfigured=true;note({phase:'native-script-timeout-ready',script});}
 }
 async function restoreScript(){
  if(!originalTimeouts||scriptRestored)return;const route='/session/'+session+'/timeouts';await request(route,{script:originalTimeouts.script});const observed=await request(route);if(!['script','pageLoad','implicit'].every(key=>observed?.[key]===originalTimeouts[key]))throw new Error('Original native script timeout restoration differs');scriptRestored=true;note({phase:'native-script-timeout-restored',script:originalTimeouts.script});
 }
 try{
  while(Date.now()<end){
   alive();let identity;
   try{
    const status=await request('/status');note({phase:'listener-status',ready:status?.ready===true,message:typeof status?.message==='string'?status.message.slice(0,256):null});
    if(status?.ready!==true)throw new Error(status?.ready===false?'Native WebView initialization is not ready':'Invalid driver readiness status');
    if(listenerOwner){const observed=await owner();listener={...listener,ownership:observed};if(!matches(observed))throw failure('Native driver ownership mismatch');}
    if(!session){const candidateSession=(await request('/session',{capabilities:{alwaysMatch:{'wdio:tauriServiceOptions':{windowLabel:'main'}}}}))?.sessionId;if(typeof candidateSession!=='string'||!/^[a-zA-Z0-9-]{1,128}$/.test(candidateSession))throw new Error('Invalid driver session identity');session=candidateSession;note({phase:'session-created'});}
    if(readinessScriptTimeoutMs!==undefined&&!ownedIdentity)await configureScript();
    identity=ownedIdentity??(listenerOwner?await owner():await request('/session/'+session+'/execute/sync',{script:'return await window.__TAURI_INTERNALS__.invoke("test_native_qualification",{action:"identity"});',args:[]}));
    if(identity!==undefined){
     listener={...listener,pid:identity?.pid??null,port:identity?.port??null,nonceMatched:listenerOwner?null:identity?.nonce===nonce,method:listenerOwner?'OS listener PID':'child-only nonce/PID'};
     if(!matches(identity))throw failure('Native driver ownership mismatch');
     ownedIdentity=identity;
     if(readinessScriptTimeoutMs!==undefined)await restoreScript();
     alive();if(Date.now()>=end)break;note({phase:'owned-driver-ready'});return session;
    }
   }catch(e){if(e.message.startsWith('Native driver ownership mismatch'))throw e;last=String(e.message).slice(0,2048);}
   alive();await new Promise(r=>setTimeout(r,Math.max(0,Math.min(100,end-Date.now()))));
  }
  throw failure('Native driver readiness deadline');
 }finally{
  // A refused identity must not leave our session's temporary setting behind.
  // Restoration shares the original deadline and never delays failure beyond it.
  if(scriptMayDiffer&&!scriptRestored&&Date.now()<end)try{await restoreScript();}catch(error){note({phase:'native-script-timeout-restoration-failed',error:String(error.message).slice(0,1024)});}
 }
}
export async function stopOwnedChild(child,timeout=5000){if(child.pid===undefined||child.exitCode!==null||child.signalCode!==null)return;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.off('exit',done);reject(new Error('Owned child exit deadline for PID '+child.pid));},timeout);function done(){clearTimeout(timer);resolve();}child.once('exit',done);child.kill();});}
