// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {hidden,subprocessFailure,nativeInputStages,windowsStartupDiagnostics} from '../scripts/runtime-driver.mjs';
test('native subprocess receipts retain terminal failure output and capture allowance',async()=>{
 await assert.rejects(hidden(process.execPath,['-e',"process.stdout.write('before failure');process.stderr.write('native reason');process.exit(7)"],{timeout:5000}),error=>{const receipt=JSON.parse(JSON.stringify(subprocessFailure(error)));assert.equal(receipt.code,7);assert.equal(receipt.killed,false);assert.equal(receipt.signal,null);assert.equal(receipt.stdout,'before failure');assert.equal(receipt.stderr,'native reason');assert.equal(receipt.timeoutMs,5000);return true;});
});
test('failure-only Windows observations are isolated, PID-attributed and explicitly bounded without UI execution in this test',async()=>{
 const env={GITHUB_ACTIONS:'true',GALLERY_ISOLATED_DESKTOP:'1'};let calls=0;
 const capture=async(file,args,options)=>{calls++;assert.equal(file,'C:/Program Files/PowerShell/7/pwsh.exe');assert.ok(args[args.indexOf('-File')+1].endsWith('windows-native-startup.ps1'));assert.equal(args.at(-1),'42');assert.equal(options.timeout,3000);return{stdout:JSON.stringify({result:'observed',kind:'windows-native-startup',targetPid:42,windows:[],processes:[]})};};
 assert.equal((await windowsStartupDiagnostics(42,{capture,env,platform:'win32'})).targetPid,42);assert.equal(calls,1);
 for(const options of [{capture,env:{...env,GITHUB_ACTIONS:'false'},platform:'win32'},{capture,env:{...env,GALLERY_ISOLATED_DESKTOP:'0'},platform:'win32'},{capture,env,platform:'linux'}])await assert.rejects(windowsStartupDiagnostics(42,options));assert.equal(calls,1);
 await assert.rejects(windowsStartupDiagnostics(42,{capture:async()=>({stdout:JSON.stringify({result:'observed',kind:'windows-native-startup',targetPid:99})}),env,platform:'win32'}));
});
test('killed native helper retains its actual PID and last flushed initialization or Win32 phase',async()=>{
 const stages=[{event:'native-input-stage',stage:'compile-win32-complete',targetPid:42},{event:'native-input-win32',stage:'set-foreground-start'}];
 const program="process.stderr.write(process.argv[1]+'\\n');setTimeout(()=>{},60000)";
 await assert.rejects(hidden(process.execPath,['-e',program,stages.map(s=>JSON.stringify(s)).join('\n')],{timeout:1000}),error=>{const receipt=subprocessFailure(error);assert.ok(Number.isSafeInteger(receipt.pid)&&receipt.pid>0);assert.equal(receipt.killed,true);assert.equal(receipt.timeoutMs,1000);assert.deepEqual(receipt.nativeInputStages,stages);assert.equal(receipt.nativeInputStages.at(-1).stage,'set-foreground-start');return true;});
 assert.deepEqual(nativeInputStages('compiler text\n{"event":"unrelated","stage":"ignore"}\n{"event":"native-input-stage","stage":"key-admission-complete"}\ntruncated {'),[{event:'native-input-stage',stage:'key-admission-complete'}]);
});
test('native subprocess receipts distinguish killed timeout from normal command refusal',async()=>{
 await assert.rejects(hidden(process.execPath,['-e','setTimeout(()=>{},60000)'],{timeout:100}),error=>{const receipt=JSON.parse(JSON.stringify(subprocessFailure(error)));assert.equal(receipt.code,null);assert.equal(receipt.killed,true);assert.equal(receipt.signal,'SIGTERM');assert.equal(typeof receipt.stdout,'string');assert.equal(typeof receipt.stderr,'string');assert.equal(receipt.timeoutMs,100);return true;});
});
