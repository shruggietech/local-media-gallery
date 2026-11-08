// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,copyFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {observerSession,openWindowsPackageObserver,msiControlLabel} from '../scripts/windows-package-observer.mjs';
const sources={ui:'a'.repeat(64),inspect:'b'.repeat(64)};
const launch=body=>spawn(process.execPath,['-e',`const send=x=>console.log(JSON.stringify(x));const sources=${JSON.stringify(sources)};${body}`],{windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});
const handshake="send({type:'ready',protocolVersion:1,pid:process.pid,sources});";
const input="require('node:readline').createInterface({input:process.stdin}).on('line',line=>{const q=JSON.parse(line);";
test('Owned observer serializes fresh requests and releases its pipe process',async()=>{
 const child=launch(handshake+`let count=0;${input}setTimeout(()=>send({id:q.id,pid:process.pid,ok:true,result:{count:++count,id:q.id,route:q.route,file:q.file}}),30);});`);
 const observer=await observerSession(child,sources);
 try{
  assert.equal(observer.identity.pid,child.pid);
  const result=await Promise.all([observer.request('inspect',{file:'C:/雪.lnk'}),observer.request('ui')]);
  assert.deepEqual(result,[{count:1,id:1,route:'inspect',file:'C:/雪.lnk'},{count:2,id:2,route:'ui'}]);
 }finally{await observer.close();}
 assert.equal(child.exitCode,0);
});
test('An individual native error is returned without caching or poisoning later observations',async()=>{
 const child=launch(handshake+input+"send({id:q.id,pid:process.pid,ok:q.id!==1,error:'not ready',result:{fresh:q.id}});});");
 const observer=await observerSession(child,sources);
 try{await assert.rejects(observer.request('ui'),/not ready/);assert.deepEqual(await observer.request('ui'),{fresh:2});}finally{await observer.close();}
});
test('Observer rejects wrong handshake PID and changed source hash',async()=>{
 for(const change of ["pid:process.pid+1,sources","pid:process.pid,sources:{...sources,ui:'changed'}"]){
  const child=launch(`send({type:'ready',protocolVersion:1,${change}});setInterval(()=>{},10000);`);
  await assert.rejects(observerSession(child,sources),/handshake identity\/source mismatch/);
  assert.ok(child.exitCode!==null||child.signalCode!==null);
 }
});
test('Observer rejects mismatched responses, bounded output and indeterminate action timeouts',async()=>{
 const cases=[
  [input+"send({id:q.id+1,pid:process.pid,ok:true,result:{}});});",/response identity mismatch/,1000],
  [input+"process.stdout.write('x'.repeat(2048));});",/output exceeds its bound/,1000],
  [input+"/* no response; must not retry an action */});",/request deadline/,100],
  [input+"console.error('owned failure');process.exit(17);});",/owned failure/,1000]
 ];
 for(const [body,expected,timeout]of cases){
  const child=launch(handshake+body),observer=await observerSession(child,sources,{maxBytes:1024});
  await assert.rejects(observer.request('ui',{},timeout),expected);await assert.rejects(observer.close(),expected);
  assert.ok(child.exitCode!==null||child.signalCode!==null);
 }
});
test('Observer bounds readiness and handles early exit without an unhandled pipe rejection',async()=>{
 for(const [body,expected]of [["setInterval(()=>{},10000)",/startup deadline/],["console.error('startup failed');process.exit(19)",/startup failed/]]){
  const child=launch(body);await assert.rejects(observerSession(child,sources,{startupTimeout:1500}),expected);assert.ok(child.exitCode!==null||child.signalCode!==null);
 }
});
test('Real PowerShell session pings, refuses unknown commands and joins cleanly without native calls',{skip:process.platform!=='win32'},async()=>{
 const root=path.resolve(import.meta.dirname,'..'),observer=await openWindowsPackageObserver(root,{env:{...process.env,GITHUB_ACTIONS:'false',GALLERY_ISOLATED_DESKTOP:'0'}});
 try{assert.equal(observer.identity.apartment,'MTA');assert.deepEqual(await observer.request('ping'),{pong:true});await assert.rejects(observer.request('arbitrary'),/Unknown observer route/);await assert.rejects(observer.request('ui',{processId:123}),/requires isolated CI/);await assert.rejects(observer.request('inspect',{file:'C:/unwanted.exe'}),/Absolute shortcut path required/);await assert.rejects(observer.request('msi'),/requires isolated CI/);await assert.rejects(observer.request('input',{processId:123,action:'compile'}),/requires an explicitly isolated CI/);assert.deepEqual(await observer.request('ping'),{pong:true});}finally{await observer.close();}
});
test('Real server reuses only unchanged child code and releases script scopes',{skip:process.platform!=='win32'},async()=>{
 const work=await mkdtemp(path.join(os.tmpdir(),'gallery-observer-'));
 try{
  await copyFile(path.resolve(import.meta.dirname,'../scripts/Invoke-WindowsPackageObserver.ps1'),path.join(work,'server.ps1'));
  // This fixture never invokes UI, COM, registry or native methods. An exit in
  // a child script must return to the server, and child variables must be fresh.
  const fixture="$ErrorActionPreference='Stop';if ($null -ne $fixtureOld) {throw 'Leaked child scope'};$fixtureOld='owned';@{fresh=$true}|ConvertTo-Json -Compress;exit 0\n";
  for(const name of ['windows-package-ui.ps1','inspect-windows-package.ps1','windows-msi-ui.ps1','native-input.ps1'])await writeFile(path.join(work,name),fixture);
  const snapshot="Param([string]$Mode,[string]$Scope,[string[]]$Products=@());$ErrorActionPreference='Stop';if($null -ne $fixtureOld){throw 'Leaked child scope'};$fixtureOld='owned';@{mode=$Mode;scope=$Scope;products=@($Products);value=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'snapshot.txt'));pid=$PID}|ConvertTo-Json -Compress;exit 0\n";
  await writeFile(path.join(work,'Get-WindowsPackageSnapshot.ps1'),snapshot);await writeFile(path.join(work,'snapshot.txt'),'before');
  const hashes={input:createHash('sha256').update(fixture).digest('hex'),msi:createHash('sha256').update(fixture).digest('hex'),ui:createHash('sha256').update(fixture).digest('hex'),inspect:createHash('sha256').update(fixture).digest('hex'),state:createHash('sha256').update(snapshot).digest('hex'),runtime:createHash('sha256').update(snapshot).digest('hex')};
  const child=spawn('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-File',path.join(work,'server.ps1')],{windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});
  const observer=await observerSession(child,hashes);
  try{
   assert.deepEqual(await observer.request('ui',{processId:123}),{fresh:true});assert.deepEqual(await observer.request('ui',{processId:123}),{fresh:true});
   assert.deepEqual(await observer.request('inspect',{file:path.join(work,'雪.lnk')}),{fresh:true});
   const products=['{00000000-0000-0000-0000-000000000001}'];
   assert.deepEqual(await observer.request('state',{scope:'user',products}),{mode:'state',scope:'user',products,value:'before',pid:child.pid});
   await writeFile(path.join(work,'snapshot.txt'),'after');
   assert.deepEqual(await observer.request('state',{scope:'machine',products}),{mode:'state',scope:'machine',products,value:'after',pid:child.pid});
   assert.deepEqual(await observer.request('runtime',{scope:'user'}),{mode:'runtime',scope:'user',products:[],value:'after',pid:child.pid});
   for(const parameters of [{scope:'foreign',products},{scope:'user',products:'not-an-array'},{scope:'user',products:['not-a-guid']},{scope:'user',products:[]}])await assert.rejects(observer.request('state',parameters),/Snapshot scope|Product GUID/);
   await assert.rejects(observer.request('runtime',{scope:'foreign'}),/Snapshot scope/);
   await writeFile(path.join(work,'windows-package-ui.ps1'),fixture+'# changed\n');await assert.rejects(observer.request('ui',{processId:123}),/source changed/);
   await writeFile(path.join(work,'Get-WindowsPackageSnapshot.ps1'),snapshot+'# changed\n');await assert.rejects(observer.request('state',{scope:'user',products}),/source changed/);await assert.rejects(observer.request('runtime',{scope:'user'}),/source changed/);
   assert.deepEqual(await observer.request('ping'),{pong:true});
  }finally{await observer.close();}
 }finally{await rm(work,{recursive:true,force:true});}
});

test('Unnamed native progress records do not hide a later named phase or completion button',()=>{
 const records=[{name:null,role:'ControlType.ProgressBar'},{name:undefined,role:'ControlType.Pane'},{name:'Installing bundled Microsoft WebView2',role:'ControlType.Text'},{name:'&Finish >',role:'ControlType.Button',enabled:true}];
 assert.equal(records.some(n=>msiControlLabel(n.name).includes('Installing bundled Microsoft WebView2')),true);
 assert.equal(records.some(n=>msiControlLabel(n.name)==='Finish'&&n.enabled),true);
 assert.equal(records.slice(0,2).some(n=>msiControlLabel(n.name).includes('Installing')),false);
 assert.throws(()=>msiControlLabel(42),/must be text or absent/);
});

test('Observer lets cooperative native teardown finish beyond the former two-second grace',async()=>{
 const child=launch(handshake+input+"send({id:q.id,pid:process.pid,ok:true,result:{}});});process.stdin.on('end',()=>setTimeout(()=>process.exit(0),2500));");
 const observer=await observerSession(child,sources);await observer.request('ui');await observer.close();assert.equal(child.exitCode,0);assert.equal(child.signalCode,null);
});

test('A stuck observer remains bounded and cannot be reported as a normal terminal exit',async()=>{
 const child=launch(handshake+"process.stdin.resume();setInterval(()=>{},10000);");const observer=await observerSession(child,sources,{shutdownTimeout:100});await assert.rejects(observer.close(),/Observer exited/);assert.ok(child.exitCode!==null||child.signalCode!==null);assert.notEqual(child.exitCode,0);
});

test('Closing immediately retires pending and queued requests instead of awaiting their long timeouts',async()=>{const child=launch(handshake+input+'/* deliberately blocked */});'),observer=await observerSession(child,sources,{shutdownTimeout:100});const first=observer.request('msi',{},180000),second=observer.request('ui',{},180000);first.catch(()=>{});second.catch(()=>{});await new Promise(r=>setTimeout(r,30));let timeout;try{await assert.rejects(Promise.race([observer.close(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('fixture close remained blocked')),500);})]),/pending|closing|Observer exited/);await assert.rejects(first);await assert.rejects(second);}finally{clearTimeout(timeout);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}});
test('Requests are clipped to the absolute campaign deadline and checkpoint before admission',async()=>{const records=[],child=launch(handshake+input+'/* deliberately blocked */});');let observer;let timeout;try{observer=await observerSession(child,sources,{deadline:Date.now()+500,shutdownTimeout:100,checkpoint:async record=>{records.push(record);}});await assert.rejects(Promise.race([observer.request('msi',{name:'Install'},180000),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('fixture request remained blocked')),1500);})]),/deadline/);assert.ok(records.some(r=>r.phase==='request'&&r.status==='pending'&&r.route==='msi'));await assert.rejects(observer.close());}finally{clearTimeout(timeout);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}});
