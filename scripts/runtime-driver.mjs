// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {root,environment} from './run.mjs';
import {prepareScreenReader} from './prepare-screen-reader.mjs';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
import {availableLoopbackPort,observeChild,readyDriver} from './native-driver-lifecycle.mjs';
import {openWindowsPackageObserver} from './windows-package-observer.mjs';
export const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function until(probe,message,timeout=12000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{last=await probe();if(last)return last;}catch(e){last=e.message;}await pause(100);}throw new Error(message+': '+JSON.stringify(last));}
const call=promisify(execFile);
export function nativeInputStages(stderr){const stages=[];for(const line of String(stderr??'').split(/\r?\n/)){try{const value=JSON.parse(line);if(['native-input-stage','native-input-win32'].includes(value.event)&&typeof value.stage==='string')stages.push(value);}catch{}}return stages;}
export function subprocessFailure(error){const text=value=>value===undefined||value===null?null:Buffer.isBuffer(value)?value.toString('utf8'):String(value);return {pid:error.commandPid??null,code:error.code??null,killed:typeof error.killed==='boolean'?error.killed:null,signal:error.signal??null,stdout:text(error.stdout),stderr:text(error.stderr),timeoutMs:error.commandTimeoutMs??null,nativeInputStages:nativeInputStages(text(error.stderr))};}
export async function hidden(file,args,options={}){const capture={cwd:root,windowsHide:true,shell:false,timeout:15000,maxBuffer:4*1024*1024,env:environment,...options};let pid;try{const pending=call(file,args,capture);pid=pending.child?.pid;return await pending;}catch(error){error.commandTimeoutMs=capture.timeout;error.commandPid=pid;throw error;}}
export async function windowsStartupDiagnostics(pid,{capture=hidden,env=environment,platform=process.platform}={}){
 assert.equal(platform,'win32');assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.GALLERY_ISOLATED_DESKTOP,'1');assert.ok(Number.isSafeInteger(pid)&&pid>0);
 const result=await capture('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'scripts/windows-native-startup.ps1'),'-AppProcessId',String(pid)],{timeout:10000,env});
 const record=JSON.parse(result.stdout);assert.equal(record.result,'observed');assert.equal(record.kind,'windows-native-startup');assert.equal(record.targetPid,pid);return record;
}
async function stop(child){if(child.exitCode!==null||child.signalCode!==null)return;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Native child exit was not observed')),5000);child.once('exit',()=>{clearTimeout(timer);resolve();});child.kill();});}
export async function openRuntime(binary,fixture,{reducedMotion=true}={}){
 requireIsolatedDesktop();
 const directory=await mkdtemp(path.join(root,'.local/runtime-session-'));const port=await availableLoopbackPort();const origin='http://127.0.0.1:'+port;const nonce=randomUUID();
 let output='';const child=spawn(binary,[fixture.directory],{cwd:root,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe'],env:{...environment,TAURI_WEBDRIVER_PORT:String(port),GALLERY_TEST_DRIVER_NONCE:nonce,...(process.platform==='linux'?{PULSE_SINK:'lmg_qualification'}:{}),GALLERY_TEST_SETTINGS_DIR:path.join(directory,'settings'),GALLERY_TEST_HISTORY_DIR:path.join(directory,'history'),GALLERY_TEST_PAGE_SIZE:'4',...(process.platform==='win32'?{WEBVIEW2_USER_DATA_FOLDER:path.join(directory,'webview'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:reducedMotion?'--force-prefers-reduced-motion':''}:{})}});
 child.stdout.on('data',b=>output=(output+b).slice(-32768));child.stderr.on('data',b=>output=(output+b).slice(-32768));let spawnError;child.once('error',e=>spawnError=e);
 const observation=observeChild(child);
 async function request(route,body,method=body===undefined?'GET':'POST',timeout=15000){
  if(spawnError)throw spawnError;if(child.exitCode!==null)throw new Error('Native app exited '+child.exitCode+': '+output);
  const response=await fetch(origin+route,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});const r=await response.json();if(!response.ok||r.value?.error)throw new Error(r.value?.message??'Native WebDriver HTTP '+response.status);return r.value;
 }
 // Fresh hosted Windows profiles have reported listener readiness at 27.9 seconds.
 // Reserve ten seconds for the following session/identity handshake within one
 // fixed 40-second allowance; the aggregate qualification limit stays authoritative.
 const readinessTimeline=[];let session;try{session=await readyDriver(child,origin,observation,process.platform==='win32'?40000:20000,{nonce,timeline:readinessTimeline,...(process.platform==='win32'?{readinessScriptTimeoutMs:300}:{}),context:{operation:'native-runtime',edition:process.env.GALLERY_TEST_EDITION??'full',fixture:fixture.sha256}});await until(()=>request('/session/'+session+'/execute/sync',{script:'return document.readyState === "complete" && Boolean(document.querySelector(".app-header"));',args:[]},'POST',2000),'Native frontend readiness',20000);}catch(e){
  // Observe only after acceptance failed, before terminating its owned PID. This
  // bounded diagnostic never extends readiness or changes a failure into success.
  if(process.platform==='win32')try{e.windowsStartupDiagnostics={...await windowsStartupDiagnostics(child.pid),capturedAfterReadinessFailure:true,child:observation()};}catch(error){e.windowsStartupDiagnostics={result:'unavailable',capturedAfterReadinessFailure:true,error:error.message,...subprocessFailure(error),child:observation()};}
  try{await stop(child);}catch(error){e.shutdownFailure=error.message;}throw e;
 }
 const js=(script,args=[])=>request('/session/'+session+'/execute/sync',{script,args});
 const command=(action,extra={})=>js('return await window.__TAURI_INTERNALS__.invoke("test_native_qualification",arguments[0]);',[{action,...extra}]);
 let inputObserver;
 const inputDiagnostics=[];
 const nativeKey=async key=>{
  // Input uses Win32 only, avoiding unrelated UIA provider calls. Never retry a
  // possibly admitted key; native assertions and the aggregate deadline remain.
  if(process.platform==='win32'){assert.ok(['Tab','ShiftTab','Space','Escape','Enter'].includes(key));const started=performance.now();try{if(!inputObserver){inputObserver=await openWindowsPackageObserver(root,{cwd:root,env:environment});await inputObserver.request('input',{processId:child.pid,action:'compile'},60000);}const result=await inputObserver.request('input',{processId:child.pid,action:'scan-keys',key},20000);assert.equal(result.completed,true);inputDiagnostics.push({key,targetPid:child.pid,helperPid:inputObserver.identity.pid,result:'complete',elapsedMilliseconds:Math.round(performance.now()-started)});}catch(error){inputDiagnostics.push({key,targetPid:child.pid,result:'failed',elapsedMilliseconds:Math.round(performance.now()-started),...subprocessFailure(error)});throw error;}}
  else if(process.platform==='linux'){const found=await hidden('xdotool',['search','--onlyvisible','--pid',String(child.pid)]);const window=found.stdout.trim().split(/\s+/)[0];assert.match(window,/^[0-9]+$/);await hidden('xdotool',['windowfocus','--sync',window,'key','--clearmodifiers',({Tab:'Tab',ShiftTab:'shift+Tab',Space:'space',Escape:'Escape',Enter:'Return'})[key]]);}
  else await command('key',{key});
 };
 const click=text=>js('const scope=document.querySelector("dialog[open]")||document.querySelector("[role=dialog]")||document;const b=[...scope.querySelectorAll("button")].find(b=>b.textContent.trim()===arguments[0]||b.getAttribute("aria-label")===arguments[0]);if(!b)throw Error("Missing button "+arguments[0]);b.click();return true;',[text]);
 const focus=text=>js('return (async()=>{const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await frame();const scope=document.querySelector("dialog[open]")||document.querySelector("[role=dialog]")||document;const b=[...scope.querySelectorAll("button")].find(b=>b.textContent.trim()===arguments[0]||b.getAttribute("aria-label")===arguments[0]);if(!b||b.disabled)throw Error("Missing enabled button "+arguments[0]);b.scrollIntoView({block:"nearest"});b.focus();await frame();if(document.activeElement!==b)throw Error("Native input focus moved before key admission: "+arguments[0]);return true;})()',[text]);
 async function closeViewer(){
  const name=await js('return document.querySelector("dialog[open] h2")?.textContent');assert.ok(name);
  await click('Close viewer');
  await until(()=>js('return !document.querySelector("dialog[open]")&&document.activeElement?.getAttribute("aria-label")==="Open "+arguments[0];',[name]),'Viewer closes and returns native focus to '+name);
 }
 async function accessibility(){
  if(process.platform==='darwin')return command('accessibility');
  const out=path.join(directory,'accessibility.json');
  if(process.platform==='win32')await hidden('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-File','scripts/native-accessibility.ps1','-AppProcessId',String(child.pid),'-Output',out]);
  else await hidden('/usr/bin/python3',['scripts/native-accessibility.py',String(child.pid),out]);
  return JSON.parse(await readFile(out));
 }
 async function screenReader(){
  if(process.platform!=='win32')return null;
  const existing=await hidden('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-Command','@(Get-Process -Name nvda -ErrorAction SilentlyContinue).Count']);if(Number(existing.stdout.trim())!==0)throw new Error('A pre-existing NVDA instance is active; it was preserved.');
  const tool=await prepareScreenReader();const config=path.join(directory,'nvda-config');await mkdir(path.join(config,'scratchpad/globalPlugins'),{recursive:true});await copyFile(path.join(root,'scripts/nvda-qualification.py'),path.join(config,'scratchpad/globalPlugins/galleryQualification.py'));
  await writeFile(path.join(config,'nvda.ini'),'schemaVersion = 25\n[general]\nlanguage = en\nshowWelcomeDialogAtStartup = False\nplayStartAndExitSounds = False\naskToExit = False\nsaveConfigurationOnExit = False\n[speech]\nsynth = silence\n[audio]\nsoundVolume = 0\n[braille]\ndisplay = noBraille\n[mouse]\nenableMouseTracking = False\n[virtualBuffers]\nautoSayAllOnPageLoad = False\npassThroughAudioIndication = False\n[update]\nautoCheck = False\nstartupNotification = False\naskedAllowUsageStats = True\nallowUsageStats = False\n[development]\nenableScratchpadDir = True\n');
  const evidence=path.join(directory,'nvda-evidence.json');const handle=(await command('window')).handle;
  const labels=['Local Media Gallery','Skip to content','Choose folder','Refresh','Close folder','Show controls','Hide controls','Settings','Thumbnails','Diagnostics','Information','Close viewer','Previous','Next','Play','Pause','Close dialog',...fixture.entries.map(e=>e.name)];
  const reader=spawn(tool.binary,['--minimal','--config-path='+config,'--log-file='+path.join(directory,'nvda.log')],{cwd:tool.directory,windowsHide:true,shell:false,stdio:'ignore',env:{...environment,GALLERY_NVDA_EVIDENCE:evidence,GALLERY_NVDA_HWND:handle,GALLERY_NVDA_LABELS:JSON.stringify(labels)}});
  reader.once('error',e=>{spawnError=e;});
  try{await until(async()=>{const r=JSON.parse(await readFile(evidence));return r.ready?r:false;},'Isolated NVDA startup',20000);}catch(e){await stop(reader);throw new Error(e.message+'; '+await readFile(path.join(directory,'nvda.log'),'utf8').catch(()=>''));}
  return {read:async()=>{const b=await readFile(evidence);const r=JSON.parse(b);return {...r,bytes:String(b.length),speech:r.records.filter(x=>x.kind==='speech').map(x=>x.text),tool:{version:tool.version,download:tool.download,payloadBytes:tool.payloadBytes}};},stop:()=>stop(reader)};
 }
 return {directory,child,js,command,driverReadinessTimeline:readinessTimeline,nativeKey,nativeInputDiagnostics:()=>inputDiagnostics,click,focus,closeViewer,accessibility,screenReader,screenshot:async name=>{const pixels=await request('/session/'+session+'/screenshot');const file=path.join(directory,name+'.png');await writeFile(file,Buffer.from(pixels,'base64'));return file;},close:async()=>{try{await request('/session/'+session,undefined,'DELETE');}catch{}try{await inputObserver?.close();}finally{await stop(child);}},output:()=>output};
}
