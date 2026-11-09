// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline';
import {EventEmitter,once} from 'node:events';
import {availableLoopbackPort,observeChild,readyDriver,stopOwnedChild,settingsControlsReady} from '../scripts/native-driver-lifecycle.mjs';
const launch=(script,nonce)=>spawn(process.execPath,['-e',script],{windowsHide:true,shell:false,stdio:['ignore','pipe','pipe'],env:{...process.env,GALLERY_TEST_DRIVER_NONCE:nonce}});
const fixture=port=>`require('node:http').createServer((q,r)=>{r.setHeader('content-type','application/json');r.end(JSON.stringify({value:q.url==='/status'?{ready:true}:q.url==='/session'?{sessionId:'owned'}:{pid:process.pid,nonce:process.env.GALLERY_TEST_DRIVER_NONCE,port:${port}}}));}).listen(${port},'127.0.0.1')`;
test('Owned driver readiness proves nonce and PID through actual listener',async()=>{
 const port=await availableLoopbackPort(),nonce=randomUUID(),child=launch(fixture(port),nonce);
 try{assert.equal(await readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),5000,{nonce}),'owned');}finally{await stopOwnedChild(child);}assert.ok(child.exitCode!==null||child.signalCode!==null);
});
test('Failed driver retains separate bounded output, identity and early exit',async()=>{
 const nonce=randomUUID(),child=launch("console.log('x'.repeat(50000));console.error('fixture-driver-startup-failure');process.exit(17)",nonce);const state=observeChild(child);const started=Date.now();
 try{await assert.rejects(readyDriver(child,'http://127.0.0.1:'+await availableLoopbackPort(),state,5000,{nonce,context:{trial:3,edition:'full',source:'fixture'}}),e=>e.message.includes('fixture-driver-startup-failure')&&e.message.includes('17')&&e.message.includes('trial')&&e.message.includes('full'));assert.ok(Date.now()-started<4500);assert.ok(state().stdout.length<=16384);assert.ok(state().stderr.length<=16384);}finally{await stopOwnedChild(child);}
});
test('An unrelated answering listener cannot certify a live owned child',async()=>{
 const server=createServer((q,r)=>r.end(JSON.stringify({value:q.url==='/status'?{ready:true}:q.url==='/session'?{sessionId:'unrelated'}:{pid:process.pid,nonce:'unrelated'}})));const port=await availableLoopbackPort();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});const nonce=randomUUID(),child=launch('setTimeout(()=>process.exit(19),1200)',nonce);
 try{await assert.rejects(readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),3000,{nonce}),/ownership mismatch/);assert.equal(child.exitCode,null);assert.ok(server.listening);}finally{await stopOwnedChild(child);await new Promise(r=>server.close(r));}
});
test('status false waits for a real ready response before creating any session',async()=>{
 const port=await availableLoopbackPort(),nonce=randomUUID(),script=`let statuses=0,ready=false;require('node:http').createServer((q,r)=>{let value;if(q.url==='/status'){ready=++statuses>=3;console.log('status:'+ready);value={ready,message:ready?'webview initialized':'waiting for webview initialization'};}else if(q.url==='/session'){console.log(ready?'session-after-ready':'PREMATURE-SESSION');value={sessionId:'owned'};}else value={pid:process.pid,nonce:process.env.GALLERY_TEST_DRIVER_NONCE,port:${port}};r.end(JSON.stringify({value}));}).listen(${port},'127.0.0.1')`,child=launch(script,nonce),observation=observeChild(child),timeline=[];
 try{assert.equal(await readyDriver(child,'http://127.0.0.1:'+port,observation,3000,{nonce,timeline}),'owned');assert.doesNotMatch(observation().stdout,/PREMATURE/);assert.ok(timeline.some(e=>e.phase==='listener-status'&&!e.ready&&e.message==='waiting for webview initialization'));const ready=timeline.findIndex(e=>e.phase==='listener-status'&&e.ready),session=timeline.findIndex(e=>e.phase==='request-started'&&e.route==='/session');assert.ok(ready>=0&&session>ready);}finally{await stopOwnedChild(child);}
});
test('HTTP200 with false or missing ready cannot create a session or certify an external owner',async()=>{
 for(const status of [{ready:false,message:'waiting for webview initialization'},{}]){const port=await availableLoopbackPort(),nonce=randomUUID(),child=launch(`require('node:http').createServer((q,r)=>{console.log(q.url);r.end(JSON.stringify({value:${JSON.stringify(status)}}));}).listen(${port},'127.0.0.1',()=>console.log('fixture-listening'))`,nonce),observation=observeChild(child),timeline=[];let ownerCalls=0;try{const [listening]=await once(child.stdout,'data',{signal:AbortSignal.timeout(10000)});assert.match(listening.toString(),/fixture-listening/);const began=Date.now();await assert.rejects(readyDriver(child,'http://127.0.0.1:'+port,observation,400,{timeline,listenerOwner:async()=>{ownerCalls++;return{pid:child.pid,port};}}),/readiness deadline/);assert.equal(ownerCalls,0);assert.doesNotMatch(observation().stdout,/\/session/);assert.ok(timeline.some(e=>e.phase==='listener-status'&&e.ready===false));assert.ok(Date.now()-began<1500);}finally{await stopOwnedChild(child);}}
});
test('Unavailable listener deadline retains port and live-child status',async()=>{
 const port=await availableLoopbackPort(),nonce=randomUUID(),child=launch('setTimeout(()=>{},10000)',nonce);const started=Date.now();try{await assert.rejects(readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),400,{nonce}),e=>e.message.includes('deadline')&&e.message.includes(String(port))&&e.message.includes('exitCode'));assert.ok(Date.now()-started<2000);}finally{await stopOwnedChild(child);}
});

test('Legacy baseline ownership uses listener PID without a new native command',async()=>{
 const port=await availableLoopbackPort(),child=launch(`require('node:http').createServer((q,r)=>{if(q.url.includes('execute'))process.exit(29);r.end(JSON.stringify({value:q.url==='/session'?{sessionId:'legacy'}:{ready:true}}));}).listen(${port},'127.0.0.1')`,'');
 try{assert.equal(await readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),3000,{listenerOwner:async()=>({pid:child.pid,port})}),'legacy');await assert.rejects(readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),3000,{listenerOwner:async()=>({pid:process.pid,port})}),/ownership mismatch/);}finally{await stopOwnedChild(child);}
});
test('Legacy listener ownership cannot overrun the original readiness deadline',async()=>{
 const port=await availableLoopbackPort(),child=launch(fixture(port),''),began=Date.now();try{await assert.rejects(readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),400,{listenerOwner:async()=>new Promise(()=>{})}),/deadline/);assert.ok(Date.now()-began<1600);}finally{await stopOwnedChild(child);}
});

// A timed-out unframed observer cannot be reused: its late reply has no request ID.
function listenerQueries(observer){
 const lines=createInterface({input:observer.stdout});let pending=null,failed=null,stderr='';
 observer.stderr.on('data',b=>stderr=(stderr+b).slice(-4096));observer.stdin.on('error',fail);observer.on('error',fail);observer.on('exit',()=>fail(Error('Listener observer exited '+stderr)));
 function fail(error){failed??=error;if(pending){clearTimeout(pending.timer);pending.reject(failed);pending=null;}}
 lines.on('line',line=>{if(!pending)return;const current=pending;pending=null;clearTimeout(current.timer);try{const result=JSON.parse(line);assert.equal(result.error,undefined);assert.equal(result.provider,'GetExtendedTcpTable');current.resolve(result);}catch(error){fail(error);current.reject(error);}});
 return {query(port,timeout=5000){if(failed)return Promise.reject(failed);if(pending)return Promise.reject(Error('Concurrent listener observer query'));return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{fail(Error('Listener observer deadline '+stderr));observer.kill();},timeout);pending={resolve,reject,timer};observer.stdin.write(JSON.stringify({action:'listener',port})+'\n');});},close(){lines.close();}};
}
test('Timed-out listener observer cannot accept a stale response for another request',async()=>{
 const observer=spawn(process.execPath,['-e',"require('node:readline').createInterface({input:process.stdin}).on('line',()=>setTimeout(()=>console.log(JSON.stringify({provider:'GetExtendedTcpTable',owners:[123]})),500))"],{windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});const rpc=listenerQueries(observer);
 try{await assert.rejects(rpc.query(1234,50),/observer deadline/);await assert.rejects(rpc.query(1234),/observer deadline/);}finally{await stopOwnedChild(observer);rpc.close();}
});

test('Windows persistent observer verifies the actual legacy listener PID',{skip:process.platform!=='win32',timeout:50000},async()=>{
 const port=await availableLoopbackPort(),child=launch(`require('node:http').createServer((q,r)=>{if(q.url.includes('execute'))process.exit(29);r.end(JSON.stringify({value:q.url==='/session'?{sessionId:'legacy'}:{ready:true}}));}).listen(${port},'127.0.0.1',()=>console.log('fixture-listening'))`,'');
 const observer=spawn('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-File','scripts/measure-processes.ps1'],{windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});const rpc=listenerQueries(observer);
 try{const [listening]=await once(child.stdout,'data',{signal:AbortSignal.timeout(10000)});assert.match(listening.toString(),/fixture-listening/);const warm=await rpc.query(port,30000);assert.equal(warm.method,'Windows TCP listener table');assert.deepEqual(warm.owners,[child.pid]);assert.equal(await readyDriver(child,'http://127.0.0.1:'+port,observeChild(child),12000,{listenerOwner:async()=>{const result=await rpc.query(port);assert.equal(result.method,'Windows TCP listener table');assert.deepEqual(result.owners,[child.pid]);return {...result,pid:Number(result.owners[0])};}}),'legacy');}finally{observer.stdin.end();await stopOwnedChild(child);await stopOwnedChild(observer);rpc.close();}
});

test('Slow session creation uses the original deadline without duplicate creation',async()=>{
 const port=await availableLoopbackPort(),nonce=randomUUID();const script="let sessions=0;require('node:http').createServer((q,r)=>{const send=value=>{r.setHeader('content-type','application/json');r.end(JSON.stringify({value}));};if(q.url==='/status')send({ready:true});else if(q.url==='/session'){sessions++;console.log('session-create');setTimeout(()=>send({sessionId:'owned'}),2400);}else send({pid:process.pid,nonce:process.env.GALLERY_TEST_DRIVER_NONCE,port:"+port+"});}).listen("+port+",'127.0.0.1')";const child=launch(script,nonce),observation=observeChild(child),started=Date.now();
 try{assert.equal(await readyDriver(child,'http://127.0.0.1:'+port,observation,5000,{nonce}),'owned');assert.equal(observation().stdout.split('session-create').length-1,1);assert.ok(Date.now()-started<5000);}finally{await stopOwnedChild(child);}
});

function scriptTimeoutFixture(port,{foreign=false,stallSetter=false,refuseRestore=false,navigation=true,malformedFirst=false}={}){
 return `let script=9876,executions=0,sessions=0;const prior={script:9876,pageLoad:4321,implicit:7};require('node:http').createServer((q,r)=>{const send=(value,status=200)=>{r.writeHead(status,{'content-type':'application/json'});r.end(JSON.stringify({value}));};if(q.url==='/status')return send({ready:true});if(q.url==='/session'){sessions++;console.log('session-created');return send({sessionId:${malformedFirst}&&sessions===1?'../invalid':'owned'});}if(!q.url.startsWith('/session/owned/'))console.log('invalid-session-route:'+q.url);if(q.url.endsWith('/timeouts')){if(q.method==='GET'){console.log('timeout-read:'+script);return send({...prior,script});}let body='';q.on('data',b=>body+=b);q.on('end',()=>{const requested=JSON.parse(body).script;console.log('timeout-set:'+requested);if(${stallSetter})return;script=${refuseRestore}&&requested===9876?17:requested;send(null);});return;}executions++;console.log('identity-start:'+executions+':'+script);if(${navigation}&&executions===1){setTimeout(()=>{console.log('native-timeout-complete');send({error:'script timeout',message:'Navigation discarded the temporary script result'},500);},script);return;}send({pid:process.pid,port:${port},nonce:${foreign}?"foreign-driver-nonce":process.env.GALLERY_TEST_DRIVER_NONCE});}).listen(${port},'127.0.0.1')`;
}
test('malformed session identity is never persisted into timeout or execution routes',async()=>{
 const port=await availableLoopbackPort(),nonce=randomUUID(),child=launch(scriptTimeoutFixture(port,{malformedFirst:true,navigation:false}),nonce),observation=observeChild(child);
 try{assert.equal(await readyDriver(child,'http://127.0.0.1:'+port,observation,3000,{nonce,readinessScriptTimeoutMs:100}),'owned');assert.equal(observation().stdout.split('session-created').length-1,2);assert.doesNotMatch(observation().stdout,/invalid-session-route/);}finally{await stopOwnedChild(child);}
});
test('native script deadline finishes uncancelled navigation work before identity retry and restores actual session settings',async()=>{
 const port=await availableLoopbackPort(),nonce=randomUUID(),child=launch(scriptTimeoutFixture(port),nonce),observation=observeChild(child),timeline=[];
 try{
  assert.equal(await readyDriver(child,'http://127.0.0.1:'+port,observation,3000,{nonce,readinessScriptTimeoutMs:100,timeline}),'owned');
  const output=observation().stdout;assert.equal(output.split('session-created').length-1,1);assert.equal(output.split('identity-start:').length-1,2);assert.match(output,/timeout-set:100/);assert.match(output,/native-timeout-complete/);assert.match(output,/timeout-set:9876/);assert.match(output,/timeout-read:9876/);
  assert.ok(timeline.some(e=>e.phase==='native-script-timeout-ready'&&e.script===100));assert.ok(timeline.some(e=>e.phase==='native-script-timeout-restored'&&e.script===9876));assert.equal(timeline.at(-1).phase,'owned-driver-ready');assert.ok(timeline.some(e=>e.phase==='request-failed'&&e.route.endsWith('/execute/sync')));assert.ok(timeline.some(e=>e.phase==='response-body-complete'&&e.route==='/session'));assert.ok(timeline.every(e=>e.elapsedMilliseconds>=0));
 }finally{await stopOwnedChild(child);}
});
test('unbounded native work reproduces the client deadline failure without certifying its listener',async()=>{
 const port=await availableLoopbackPort(),nonce=randomUUID(),child=launch(scriptTimeoutFixture(port),nonce),observation=observeChild(child),timeline=[],began=Date.now();
 try{await assert.rejects(readyDriver(child,'http://127.0.0.1:'+port,observation,700,{nonce,timeline}),error=>{assert.ok(error.readinessDiagnostics.timeline.some(e=>e.phase==='request-failed'&&e.route.endsWith('/execute/sync')));assert.equal(error.readinessDiagnostics.listener.route,'/session');return /readiness deadline/.test(error.message);});assert.ok(Date.now()-began<1600);assert.match(observation().stdout,/identity-start:1:9876/);assert.doesNotMatch(observation().stdout,/native-timeout-complete/);}finally{await stopOwnedChild(child);}
});
test('native timeout setup cannot certify wrong ownership, stalled setters or failed restoration',async()=>{
 for(const options of [{foreign:true,navigation:false},{stallSetter:true},{refuseRestore:true,navigation:false}]){
  const port=await availableLoopbackPort(),nonce=randomUUID(),child=launch(scriptTimeoutFixture(port,options),nonce),observation=observeChild(child),timeline=[],began=Date.now();
  try{await assert.rejects(readyDriver(child,'http://127.0.0.1:'+port,observation,700,{nonce,readinessScriptTimeoutMs:100,timeline}),options.foreign?/ownership mismatch/:/readiness deadline/);assert.ok(Date.now()-began<1700);assert.ok(!timeline.some(e=>e.phase==='owned-driver-ready'));if(options.foreign){assert.match(observation().stdout,/timeout-set:9876/);assert.ok(timeline.some(e=>e.phase==='native-script-timeout-restored'));}if(options.refuseRestore)assert.ok(timeline.some(e=>e.phase==='request-failed'||e.phase==='native-script-timeout-ready'));}finally{await stopOwnedChild(child);}
 }
});
test('native timeout election refuses external ownership paths and client-budget violations',async()=>{
 const child={pid:process.pid,exitCode:null,signalCode:null},observation=()=>({pid:process.pid});
 for(const options of [{listenerOwner:async()=>({}),readinessScriptTimeoutMs:100},{nonce:randomUUID(),readinessScriptTimeoutMs:1000},{nonce:randomUUID(),readinessScriptTimeoutMs:0}])await assert.rejects(readyDriver(child,'http://127.0.0.1:1',observation,500,options),/Bounded native script readiness/);
});

test('Ordinary settings readiness rejects disabled or hidden controls without waiting for a preferred value',()=>{
 for(const visibility of [{showing:true},{offscreen:false},{}]){
  const disabled={name:'Show controls',enabled:false,...visibility};assert.equal(settingsControlsReady([disabled]),false);
  assert.equal(settingsControlsReady([{...disabled,name:'Hide controls'}]),false);
  assert.equal(settingsControlsReady([{...disabled,enabled:true}]),true);
  assert.equal(settingsControlsReady([{...disabled,name:'Hide controls',enabled:true}]),true);
 }
 assert.equal(settingsControlsReady([{name:'Hide controls'}]),false);
 assert.equal(settingsControlsReady([{name:'Hide controls',enabled:true,showing:false}]),false);
 assert.equal(settingsControlsReady([{name:'Hide controls',enabled:true,offscreen:true}]),false);
});

test('Expected presentation waits through default observations and rejects persistent mismatch',()=>{
 const observation=name=>[{name,enabled:true,offscreen:false}];
 const sequence=[observation('Show controls'),observation('Show controls'),observation('Hide controls')];
 assert.deepEqual(sequence.map(records=>settingsControlsReady(records,{controlsExpanded:true})),[false,false,true]);
 assert.equal(Array.from({length:20},()=>settingsControlsReady(observation('Show controls'),{controlsExpanded:true})).some(Boolean),false);
 assert.equal(settingsControlsReady(observation('Show controls'),{controlsExpanded:false}),true);
 assert.equal(settingsControlsReady(observation('Hide controls'),{controlsExpanded:false}),false);
 assert.equal(settingsControlsReady([{name:'Hide controls',enabled:false}],{controlsExpanded:true}),false);
});

function portCandidates(candidates){
 const state={created:0,closed:0,live:0,events:[]};
 const serverFactory=()=>{
  const candidate=candidates[state.created++];assert.notEqual(candidate,undefined,'Unexpected extra allocation');
  const options=typeof candidate==='number'?{address:{port:candidate}}:candidate;
  const server=new EventEmitter();
  server.listen=(port,host,ready)=>{
   assert.equal(port,0);assert.equal(host,'127.0.0.1');assert.equal(state.live,0,'Previous listener must close before retry');
   state.events.push('listen');if(options.listenThrow)throw options.listenThrow;
   queueMicrotask(()=>{if(options.bindError)server.emit('error',options.bindError);else{state.live++;ready();}});return server;
  };
  server.address=()=>{if(options.addressThrow)throw options.addressThrow;return options.address;};
  server.close=done=>{state.closed++;state.live--;state.events.push('close');queueMicrotask(()=>done(options.closeError));};
  return server;
 };
 return {state,serverFactory};
}

test('Port allocator skips every pinned restricted candidate after releasing it',async()=>{
 // Independent contract fixture from Node v24.11.0 deps/undici/src/lib/web/fetch/constants.js.
 const restricted=[1,7,9,11,13,15,17,19,20,21,22,23,25,37,42,43,53,69,77,79,87,95,101,102,103,104,109,110,111,113,115,117,119,123,135,137,139,143,161,179,389,427,465,512,513,514,515,526,530,531,532,540,548,554,556,563,587,601,636,989,990,993,995,1719,1720,1723,2049,3659,4045,4190,5060,5061,6000,6566,6665,6666,6667,6668,6669,6679,6697,10080];
 for(const port of restricted){
  const {state,serverFactory}=portCandidates([port,49152]);
  assert.equal(await availableLoopbackPort({serverFactory}),49152,'Restricted '+port);
  assert.deepEqual(state.events,['listen','close','listen','close']);assert.equal(state.live,0);
 }
});

test('Port allocator preserves allowed boundaries and closes before return',async()=>{
 for(const port of [2,80,443,6001,6664,6670,10081,49152,65535]){
  const {state,serverFactory}=portCandidates([port]);
  assert.equal(await availableLoopbackPort({serverFactory}),port);assert.equal(state.created,1);assert.equal(state.closed,1);assert.equal(state.live,0);
 }
});

test('Port allocator exhaustion stops at the finite default or reduced attempt bound',async()=>{
 for(const maxAttempts of [1,3,32]){
  const {state,serverFactory}=portCandidates(Array(maxAttempts).fill(6669));
  const options=maxAttempts===32?{serverFactory}:{serverFactory,maxAttempts};
  await assert.rejects(availableLoopbackPort(options),new RegExp('allocation exhausted after '+maxAttempts+' attempts'));
  assert.equal(state.created,maxAttempts);assert.equal(state.closed,maxAttempts);assert.equal(state.live,0);
 }
});

test('Port allocator rejects invalid attempt controls before creating a listener',async()=>{
 let created=0;const serverFactory=()=>{created++;throw Error('must not allocate');};
 for(const maxAttempts of [0,-1,1.5,33,Infinity,NaN,'2',null])await assert.rejects(availableLoopbackPort({serverFactory,maxAttempts}),/attempt limit/);
 assert.equal(created,0);
 await assert.rejects(availableLoopbackPort({serverFactory:null}),/server factory/);
});

test('Port allocator refuses malformed addresses and still closes every bound listener',async()=>{
 for(const address of [null,'pipe',{}, {port:0},{port:-1},{port:65536},{port:1.5},{port:'49152'}]){
  const {state,serverFactory}=portCandidates([{address}]);
  await assert.rejects(availableLoopbackPort({serverFactory}),/Invalid allocated loopback port/);
  assert.equal(state.created,1);assert.equal(state.closed,1);assert.equal(state.live,0);
 }
 const error=Error('address lookup failed');const {state,serverFactory}=portCandidates([{addressThrow:error}]);
 await assert.rejects(availableLoopbackPort({serverFactory}),e=>e===error);assert.equal(state.closed,1);assert.equal(state.live,0);
});

test('Port allocator propagates factory and bind failures without retrying unbound listeners',async()=>{
 const error=Object.assign(Error('fixture bind denied'),{code:'EACCES'});
 await assert.rejects(availableLoopbackPort({serverFactory:()=>{throw error;}}),e=>e===error);
 for(const fault of [{bindError:error},{listenThrow:error}]){
  const {state,serverFactory}=portCandidates([fault]);
  await assert.rejects(availableLoopbackPort({serverFactory}),e=>e===error);
  assert.equal(state.created,1);assert.equal(state.closed,0);assert.equal(state.live,0);
 }
});

test('Port allocator close failures cannot return a port or begin a retry',async()=>{
 for(const port of [49152,6669]){
  const error=Error('fixture close failed');const {state,serverFactory}=portCandidates([{address:{port},closeError:error}]);
  await assert.rejects(availableLoopbackPort({serverFactory}),e=>e===error);
  assert.equal(state.created,1);assert.equal(state.closed,1);
 }
});

test('Port allocator default OS candidate can be rebound by an owned HTTP fixture',async()=>{
 const port=await availableLoopbackPort();assert.ok(Number.isInteger(port)&&port>=1&&port<=65535);
 const server=createServer((q,r)=>r.end('owned fixture'));
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 try{const response=await fetch('http://127.0.0.1:'+port,{signal:AbortSignal.timeout(2000)});assert.equal(response.status,200);assert.equal(await response.text(),'owned fixture');}
 finally{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});

test('Direct TCP ownership remains available without CIM and refuses a foreign answering process',{skip:process.platform!=='win32',timeout:40000},async()=>{
 const server=createServer((q,r)=>r.end(JSON.stringify({value:{ready:true}})));await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const port=server.address().port;
 const observer=spawn('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-Command',"function Get-NetTCPConnection { throw 'Unavailable CIM must not be called' }; & './scripts/measure-processes.ps1'"],{windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});const rpc=listenerQueries(observer);const query=(port,timeout)=>rpc.query(port,timeout);let foreign;
 try{const result=await query(port,30000);assert.deepEqual(result.owners,[process.pid]);assert.deepEqual(result.addresses,['127.0.0.1']);foreign=launch('setTimeout(()=>{},10000)','');await assert.rejects(readyDriver(foreign,'http://127.0.0.1:'+port,observeChild(foreign),2000,{listenerOwner:async()=>{const r=await query(port);return {...r,pid:r.owners[0]};}}),/ownership mismatch/);
  const ipv6=createServer();let enabled=false;try{await new Promise((resolve,reject)=>{ipv6.once('error',reject);ipv6.listen({port:0,host:'::',ipv6Only:true},resolve);});enabled=true;const r=await query(ipv6.address().port);assert.deepEqual(r.owners,[process.pid]);assert.deepEqual(r.addresses,['::']);}catch(e){if(!['EAFNOSUPPORT','EADDRNOTAVAIL'].includes(e.code))throw e;}finally{if(enabled)await new Promise(resolve=>ipv6.close(resolve));}
 }finally{observer.stdin.end();if(foreign)await stopOwnedChild(foreign);await stopOwnedChild(observer);rpc.close();await new Promise(resolve=>server.close(resolve));}
});
