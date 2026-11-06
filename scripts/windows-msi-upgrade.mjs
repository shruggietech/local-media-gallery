// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
import {msiControlLabel} from './windows-package-observer.mjs';
import {msiCommandArguments} from './windows-msi-command.mjs';
import {stopOwnedChild} from './native-driver-lifecycle.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function upgradePageReady(records,label){return records.some(n=>!n.offscreen&&(['Next','Install','Finish'].includes(label)?n.role==='ControlType.Button'&&msiControlLabel(n.name)===label&&n.enabled:msiControlLabel(n.name).includes(label)));}
export function checkUpgradeChoices(records,{scope,directory,startMenu,commandPath}){
 const label=n=>msiControlLabel(n.name);
 assert.ok(records.some(n=>label(n)==='Create a Start menu shortcut'&&n.toggle===(startMenu?'On':'Off')),'Upgrade must inherit Start menu choice');
 assert.ok(records.some(n=>label(n)==='Add the application to command PATH'&&n.toggle===(commandPath?'On':'Off')),'Upgrade must inherit PATH choice');
 assert.ok(records.some(n=>typeof n.value==='string'&&n.value.replace(/[\\/]$/,'').toLowerCase()===directory.replace(/[\\/]$/,'').toLowerCase()),'Upgrade must inherit its installed location');
 assert.ok(['user','machine'].includes(scope));
}

// A full-UI native launch with no installer property overrides models opening
// the downloaded MSI. Log/no-restart affect diagnostics, not selected choices.
export async function observeMsiUpgrade({file,work,root,observer,environment,expected,label='ordinary-upgrade',timeout=240000,clientToken='current',cancelAt=null}){
 requireIsolatedDesktop(environment);assert.equal(process.platform,'win32');
 const began=new Date().toISOString(),log=path.join(work,label+'.log'),screens=[],observations=[];
 const executable=path.join(environment.SystemRoot,'System32/msiexec.exe');
 const arguments_=msiCommandArguments(['/i',file,'/norestart','/L*v',log]);
 assert.ok(['current','limited'].includes(clientToken));
 const launcher=clientToken==='limited'?'C:/Program Files/PowerShell/7/pwsh.exe':executable;
 const launchArgs=clientToken==='limited'?['-NoProfile','-NonInteractive','-File',path.join(root,'scripts/Start-MsiLimitedToken.ps1'),'-MsiFile',file,'-LogPath',log]:arguments_;
 const child=spawn(launcher,launchArgs,{cwd:work,env:environment,windowsHide:true,shell:false,windowsVerbatimArguments:clientToken==='current',stdio:['ignore','pipe','pipe']});
 let output='',launchError;child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.on('error',e=>launchError=e);
 const end=Date.now()+timeout,read=()=>observer.request('msi'),input=name=>observer.request('msi',{name});
 const name=n=>msiControlLabel(n.name),visible=(r,text)=>upgradePageReady(r.records,text);
 const until=async(fn,description)=>{let last;const phaseEnd=Math.min(end,Date.now()+30000);while(Date.now()<phaseEnd){if(launchError)throw launchError;if(child.exitCode!==null)throw Error('MSI exited '+child.exitCode+' before '+description);try{const value=await fn();if(value)return value;}catch(e){last=e;}await new Promise(r=>setTimeout(r,150));}throw Error('Upgrade readiness deadline: '+description+(last?': '+last.message:''));};
 const wait=label=>until(async()=>{const r=await read();return visible(r,label)?r:null;},label);
 async function capture(label,r=undefined){assert.ok(observations.length<32,'Upgrade observation bound exceeded');r??=await read();observations.push({label,...r});for(const window of r.windows){const screenshot=path.join(work,label+'-'+window.handle+'-'+screens.length+'.png');const image=await observer.request('msi',{screenshot,screenshotWindow:window.handle});const bytes=await readFile(screenshot);screens.push({label,window,observation:image,path:path.relative(root,screenshot).replaceAll('\\','/'),bytes:String(bytes.length),sha256:hash(bytes)});}return r;}
 let failureDialog=null,progress=false;
 try{
  if(clientToken==='limited'){
   while(!output.includes('"clientTokenType":3')&&Date.now()<end){if(child.exitCode!==null)throw Error('Limited client readiness failed: '+output);await new Promise(r=>setTimeout(r,100));}
   assert.ok(output.includes('"clientTokenType":3'),'Actual limited-client startup receipt required');
  }
  await wait('Next');await input('Next');const license=await wait('License Agreement');
  if(cancelAt==='license'){await input('Cancel');await wait('Yes');await input('Yes');}
  else{
   assert.equal(cancelAt,null);
   const accept=license.records.find(n=>n.role==='ControlType.CheckBox'&&name(n).includes('accept'));assert.ok(accept);await input(name(accept));await input('Next');
   const scope=await wait('Choose who');assert.ok(scope.records.some(n=>name(n)===(expected.scope==='machine'?'For all users':'Only for me')&&n.selected===true),'Upgrade must retain predecessor scope');await capture('scope',scope);await input('Next');
   const options=await wait('Choose location');checkUpgradeChoices(options.records,expected);await capture('options',options);await input('Next');await wait('Install');await input('Install');
  }
  while(child.exitCode===null&&Date.now()<end){
   let r;try{r=await read();}catch{await new Promise(r=>setTimeout(r,150));continue;}
   const error=r.records.find(n=>/Cannot bind actual machine common Programs directory|Local Media Gallery:/.test(name(n)));
   if(error&&!failureDialog){failureDialog=name(error);await capture('failure',r);if(r.records.some(n=>name(n)==='OK'&&n.enabled))await input('OK');}
   if(!progress&&r.records.some(n=>n.role==='ControlType.ProgressBar')){progress=true;await capture('progress',r);}
   if(r.records.some(n=>name(n)==='Finish'&&n.enabled)){
    await capture('terminal',r);await input('Finish');const handles=r.windows.map(w=>w.handle).join(',');const closeEnd=Math.min(end,Date.now()+15000);
    while(child.exitCode===null&&Date.now()<closeEnd){let next;try{next=await read();}catch{break;}if(next.windows.map(w=>w.handle).join(',')!==handles)break;await new Promise(r=>setTimeout(r,100));}
   }
   await new Promise(r=>setTimeout(r,150));
  }
  while(child.exitCode===null&&Date.now()<end)await new Promise(r=>setTimeout(r,100));
  assert.notEqual(child.exitCode,null,'Upgrade has no terminal result');
  const logBytes=await readFile(log),logText=logBytes.toString(logBytes[0]===255&&logBytes[1]===254?'utf16le':'utf8');
  const token=clientToken==='limited'?JSON.parse(output.trim()):{kind:'runner-client'};
  const fixture=clientToken==='limited'?JSON.parse(await readFile(log+'.fixture.json','utf8')):null;
  if(fixture){assert.equal(fixture.policy.restored,true);assert.ok(fixture.private?.before?.length>=2);assert.deepEqual(fixture.private.after,fixture.private.before,'Initiating limited user settings/history bytes retained');}
  const result={kind:'ordinary-full-ui-msi-upgrade',started:began,terminalFinished:new Date().toISOString(),exitCode:child.exitCode,failureDialog,reported267:/Cannot bind actual machine common Programs directory: 267/.test(logText),expected,clientToken,token,fixture,cancelAt,invocation:{executable,arguments:arguments_},msi:{bytes:String((await readFile(file)).length),sha256:hash(await readFile(file))},log:{path:path.relative(root,log).replaceAll('\\','/'),bytes:String(logBytes.length),sha256:hash(logBytes)},screens,observations,progress};
  await writeFile(path.join(work,label+'.json'),JSON.stringify(result,null,2)+'\n');return result;
 }catch(error){await writeFile(path.join(work,label+'-incomplete.json'),JSON.stringify({started:began,terminalFinished:new Date().toISOString(),error:error.stack,exitCode:child.exitCode,output,screens,observations},null,2)+'\n');throw error;}
 finally{await stopOwnedChild(child);}
}
