// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,copyFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {observerSession,openWindowsPackageObserver} from '../scripts/windows-package-observer.mjs';
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
 try{assert.deepEqual(await observer.request('ping'),{pong:true});await assert.rejects(observer.request('arbitrary'),/Unknown observer route/);await assert.rejects(observer.request('ui',{processId:123}),/requires isolated CI/);await assert.rejects(observer.request('inspect',{file:'C:/unwanted.exe'}),/Absolute shortcut path required/);assert.deepEqual(await observer.request('ping'),{pong:true});}finally{await observer.close();}
});
test('Real server reuses only unchanged child code and releases script scopes',{skip:process.platform!=='win32'},async()=>{
 const work=await mkdtemp(path.join(os.tmpdir(),'gallery-observer-'));
 try{
  await copyFile(path.resolve(import.meta.dirname,'../scripts/Invoke-WindowsPackageObserver.ps1'),path.join(work,'server.ps1'));
  // This fixture never invokes UI, COM, registry or native methods. An exit in
  // a child script must return to the server, and child variables must be fresh.
  const fixture="$ErrorActionPreference='Stop';if ($null -ne $fixtureOld) {throw 'Leaked child scope'};$fixtureOld='owned';@{fresh=$true}|ConvertTo-Json -Compress;exit 0\n";
  for(const name of ['windows-package-ui.ps1','inspect-windows-package.ps1'])await writeFile(path.join(work,name),fixture);
  const hashes={ui:createHash('sha256').update(fixture).digest('hex'),inspect:createHash('sha256').update(fixture).digest('hex')};
  const child=spawn('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-File',path.join(work,'server.ps1')],{windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});
  const observer=await observerSession(child,hashes);
  try{
   assert.deepEqual(await observer.request('ui',{processId:123}),{fresh:true});assert.deepEqual(await observer.request('ui',{processId:123}),{fresh:true});
   assert.deepEqual(await observer.request('inspect',{file:path.join(work,'雪.lnk')}),{fresh:true});
   await writeFile(path.join(work,'windows-package-ui.ps1'),fixture+'# changed\n');await assert.rejects(observer.request('ui',{processId:123}),/source changed/);
   assert.deepEqual(await observer.request('ping'),{pong:true});
  }finally{await observer.close();}
 }finally{await rm(work,{recursive:true,force:true});}
});
