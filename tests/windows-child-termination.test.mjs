// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {EventEmitter,once} from 'node:events';
import {terminateWindowsChildTree} from '../scripts/run.mjs';
function fixture(pid=42){const c=new EventEmitter();Object.assign(c,{pid,exitCode:null,signalCode:null,kills:[],kill(signal){this.kills.push(signal);this.signalCode=signal;this.emit('exit',null,signal);return true;}});return c;}
test('Failed or unavailable tree terminator falls back to only its original child',()=>{
 for(const kind of ['throw','error','exit']){const child=fixture(),terminator=fixture(43);let calls=0;terminateWindowsChildTree(child,{launch:(file,args,options)=>{calls++;assert.equal(file,'taskkill.exe');assert.deepEqual(args,['/PID','42','/T','/F']);assert.deepEqual(options,{windowsHide:true,shell:false,stdio:'ignore'});if(kind==='throw')throw Error('missing');return terminator;}});if(kind==='error')terminator.emit('error',Error('denied'));if(kind==='exit'){terminator.exitCode=1;terminator.emit('exit',1,null);}assert.equal(calls,1);assert.deepEqual(child.kills,['SIGKILL']);}
});
test('Tree terminator error followed by exit cannot repeat the direct kill',()=>{const child=fixture(),terminator=fixture(43);terminateWindowsChildTree(child,{launch:()=>terminator});terminator.emit('error',Error('failed'));terminator.emit('exit',1,null);assert.deepEqual(child.kills,['SIGKILL']);});
test('A stalled owned terminator has a finite fallback',{timeout:3000},async()=>{const child=fixture(),terminator=fixture(43),ended=once(child,'exit');terminateWindowsChildTree(child,{launch:()=>terminator,graceMilliseconds:20});await ended;assert.deepEqual(terminator.kills,['SIGKILL']);assert.deepEqual(child.kills,['SIGKILL']);});
test('An already exited child does not admit a new terminator',()=>{const child=fixture();child.exitCode=0;terminateWindowsChildTree(child,{launch:()=>{throw Error('must not launch');}});assert.deepEqual(child.kills,[]);assert.throws(()=>terminateWindowsChildTree(fixture(0)),/Owned child PID/);});
test('A stalled helper is reclaimed even if the original child exited first',{timeout:3000},async()=>{const child=fixture(),terminator=fixture(43),ended=once(terminator,'exit');terminateWindowsChildTree(child,{launch:()=>terminator,graceMilliseconds:20});child.exitCode=0;await ended;assert.deepEqual(terminator.kills,['SIGKILL']);assert.deepEqual(child.kills,[]);});
test('A nonzero tree-tool exit cannot leave a real owned Node child alive',{timeout:15000},async()=>{
 const child=spawn(process.execPath,['-e',"process.stdout.write('ready');setInterval(()=>{},10000)"],{windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});
 try{await once(child.stdout,'data',{signal:AbortSignal.timeout(10000)});const ended=once(child,'exit',{signal:AbortSignal.timeout(5000)});const terminator=fixture(43);terminateWindowsChildTree(child,{launch:()=>{queueMicrotask(()=>{terminator.exitCode=1;terminator.emit('exit',1,null);});return terminator;}});await ended;assert.ok(child.exitCode!==null||child.signalCode!==null);}finally{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}
});
