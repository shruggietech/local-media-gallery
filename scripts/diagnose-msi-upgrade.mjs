// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {root,environment} from './run.mjs';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
import {parseReleaseRecord} from './release-record.mjs';
import {publishedWindowsInputs} from './published-windows-input.mjs';
import {digest,verifyPayload,productCodes} from './windows-packages.mjs';
import {openWindowsPackageObserver} from './windows-package-observer.mjs';
import {observeMsiUpgrade} from './windows-msi-upgrade.mjs';
import {randomUUID} from 'node:crypto';
import {snapshotWindowsOfflineFirewall,applyWindowsOfflineFirewall,readWindowsOfflineFirewall,restoreWindowsOfflineIntent} from './windows-offline-firewall.mjs';
import {msiCommandArguments} from './windows-msi-command.mjs';
if(process.env.GALLERY_MSI_UPGRADE_CASE?.startsWith('registration-')){await import('./diagnose-msi-registration.mjs');process.exit(0);}
requireIsolatedDesktop();assert.equal(process.platform,'win32');
const call=promisify(execFile),work=path.join(root,'.local/msi-upgrade-diagnostic');await mkdir(work,{recursive:true});
const capture=(file,args,extra={})=>call(file,args,{cwd:work,env:environment,windowsHide:true,shell:false,timeout:180000,maxBuffer:8388608,...extra});
const shell=async (code,values={})=>JSON.parse((await capture('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-Command',"[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);$ErrorActionPreference='Stop';$arg=ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('"+Buffer.from(JSON.stringify(values)).toString('base64')+"')));"+code])).stdout);
const msi=async(args)=>{try{await capture(path.join(environment.SystemRoot,'System32/msiexec.exe'),msiCommandArguments(args),{windowsVerbatimArguments:true});return 0;}catch(e){if(e.code===3010)return 3010;throw e;}};
const download=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(180000)});assert.ok(r.ok,url+': '+r.status);return Buffer.from(await r.arrayBuffer());};
const result={kind:'published-msi-upgrade-diagnostic',acceptance:false,started:new Date().toISOString(),host:{release:os.release(),version:os.version(),image:process.env.ImageVersion??null},inputs:[],cases:[]};let observer,originalAttributes,consentBefore,installerPolicyBefore,offlineIntent;
try{
 const canonical=await download('https://github.com/shruggietech/local-media-gallery/releases/download/v0.2.0/release.json');assert.equal(digest(canonical),'9f95fbfce0b46fc946f38a2bad6f22fa8284451bccfb258e82d667603cfec039');
 const old=parseReleaseRecord(canonical,{requirePublished:true});const artifact=old.artifacts.find(a=>a.role==='package'&&a.platform==='windows'&&a.edition==='full');const bytes=await download(artifact.url);assert.equal(digest(bytes),artifact.sha256);assert.equal(String(bytes.length),artifact.bytes);
 const inputs=publishedWindowsInputs(bytes),native=inputs.get('local-media-gallery-machine.msi'),payload=JSON.parse(inputs.get('source/payload.json').data);assert.ok(native);const oldFile=path.join(work,'published-0.2.0.msi');await writeFile(oldFile,native.data);
 const newFile=path.join(work,'published-0.2.1.msi'),newBytes=await download('https://github.com/shruggietech/local-media-gallery/releases/download/v0.2.1/local-media-gallery-0.2.1-full-x86_64-windows.msi');assert.equal(digest(newBytes),'f6bf1c0d500a1f55159f964144c934434882da2184631d0d7c9c923651b4a146');await writeFile(newFile,newBytes);
 result.inputs=[{version:'0.2.0',canonicalSha256:digest(canonical),artifact,msi:native.record},{version:'0.2.1',msi:{bytes:String(newBytes.length),sha256:digest(newBytes)}}];
 if(process.env.GALLERY_MSI_UPGRADE_CASE==='limited-offline'){
  const group='LMG-S025-offline-'+process.pid+'-'+randomUUID(),ownedRuleNames=['listener','worker','dns-tcp','dns-udp'].map(s=>group+'-'+s);
  const before=await shell(snapshotWindowsOfflineFirewall,{workspace:root,ownedRuleNames,ownedGroup:group});
  const intent={kind:'local-media-gallery-windows-offline-policy-intent',formatVersion:1,before,ownedRuleNames,ownedGroup:group};offlineIntent=path.join(work,'offline-restoration.json');await writeFile(offlineIntent,JSON.stringify(intent,null,2)+'\n');
  await shell(applyWindowsOfflineFirewall,intent);result.offline=await shell(readWindowsOfflineFirewall,intent);
  let failure;try{await capture(path.join(environment.SystemRoot,'System32/curl.exe'),['--noproxy','*','--connect-timeout','2','--max-time','3','--head','https://example.com'],{timeout:10000});}catch(error){failure=error;}
  assert.ok(failure&&Number.isInteger(failure.code)&&failure.code!==0&&!failure.killed,'Actual external request must be blocked');result.offline.externalProbe={code:failure.code,stdout:failure.stdout??'',stderr:failure.stderr??''};
 }
 result.initialFolder=await shell("$p=[Environment]::GetFolderPath('CommonPrograms');$i=Get-Item -LiteralPath $p -Force;@{path=$p;attributes=[int]$i.Attributes;names=$i.Attributes.ToString();administrator=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)}|ConvertTo-Json -Compress");originalAttributes=result.initialFolder.attributes;
 observer=await openWindowsPackageObserver(root,{cwd:work,env:environment});
 consentBefore=await shell("$p='HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System';$k=Get-Item -LiteralPath $p;@{present=($k.GetValueNames() -contains 'ConsentPromptBehaviorAdmin');value=$k.GetValue('ConsentPromptBehaviorAdmin');kind=if($k.GetValueNames() -contains 'ConsentPromptBehaviorAdmin'){$k.GetValueKind('ConsentPromptBehaviorAdmin').ToString()}else{$null};enableLua=$k.GetValue('EnableLUA')}|ConvertTo-Json -Compress");
 installerPolicyBefore=await shell("$p='HKLM:\\Software\\Policies\\Microsoft\\Windows\\Installer';$k=Get-Item -LiteralPath $p -ErrorAction SilentlyContinue;@{keyPresent=($null -ne $k);present=($null -ne $k -and $k.GetValueNames() -contains 'DisableMsi');value=if($k){$k.GetValue('DisableMsi')}else{$null};kind=if($k -and $k.GetValueNames() -contains 'DisableMsi'){$k.GetValueKind('DisableMsi').ToString()}else{$null}}|ConvertTo-Json -Compress");
 result.installerPolicyFixture={before:installerPolicyBefore,alwaysInstallElevated:false};
 await shell("$p='HKLM:\\Software\\Policies\\Microsoft\\Windows\\Installer';$k=Get-Item -LiteralPath $p -ErrorAction SilentlyContinue;if($k -and $k.GetValue('AlwaysInstallElevated',0) -eq 1){throw 'Elevated user MSI policy is forbidden'};if(!(Test-Path -LiteralPath $p)){[void](New-Item -Path $p -Force)};Set-ItemProperty -LiteralPath $p -Name DisableMsi -Value 0 -Type DWord;@{configured=$true}|ConvertTo-Json -Compress");
 result.consentFixture={before:consentBefore,scope:'Isolated host automatically authorizes native administrator elevation; no attended consent-UI claim'};
 await shell("Set-ItemProperty -LiteralPath 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' -Name ConsentPromptBehaviorAdmin -Value 0 -Type DWord;@{configured=$true}|ConvertTo-Json -Compress");
 const cases=['limited','limited-offline'].includes(process.env.GALLERY_MSI_UPGRADE_CASE)?[{readonly:true,clientToken:'limited'}]:[{readonly:false,clientToken:'current'},{readonly:true,clientToken:'current'},{readonly:true,clientToken:'limited'}];
 for(const {readonly,clientToken} of cases){
  await shell("$p=[Environment]::GetFolderPath('CommonPrograms');$i=Get-Item -LiteralPath $p -Force;$i.Attributes=([int]$i.Attributes -band (-bnot 1));@{attributes=[int](Get-Item -LiteralPath $p -Force).Attributes}|ConvertTo-Json -Compress");
  await msi(['/i',oldFile,'/qn','/norestart','/L*v',path.join(work,'old-install-'+readonly+'.log')]);
  const before=await observer.request('state',{scope:'machine',products:[productCodes.machine]},180000);assert.equal(before.registered.version,'0.2.0');await verifyPayload(before.registered.location,payload);
  const folder=await shell("$p=[Environment]::GetFolderPath('CommonPrograms');$i=Get-Item -LiteralPath $p -Force;"+(readonly?'$i.Attributes=([int]$i.Attributes -bor 1 -bor 8192);':'')+"@{attributes=[int](Get-Item -LiteralPath $p -Force).Attributes}|ConvertTo-Json -Compress");
  const observed=await observeMsiUpgrade({file:newFile,work,root,observer,environment,expected:{scope:'machine',directory:before.registered.location,startMenu:true,commandPath:true},label:'published-readonly-'+readonly+'-'+clientToken,clientToken});
  const after=await observer.request('state',{scope:'machine',products:[productCodes.machine]},180000);result.cases.push({readonly,clientToken,folder,before,observed,after});await writeFile(path.join(root,'.local/msi-upgrade-diagnostic.json'),JSON.stringify(result,null,2)+'\n');
  if(observed.reported267){assert.equal(observed.exitCode,1603);assert.equal(after.registered.version,'0.2.0');result.reproduced=true;break;}
  assert.ok([0,3010].includes(observed.exitCode));const installed=JSON.parse(await readFile(path.join(before.registered.location,'payload.json'),'utf8'));assert.equal(installed.version,'0.2.1');
  // Remove only this isolated fixture, using its actual registered ProductCode.
  const product=await shell("$p=Get-ItemProperty -LiteralPath 'HKLM:\\Software\\ShruggieTech\\LocalMediaGallery';@{code=$p.ProductCode}|ConvertTo-Json -Compress");await msi(['/x',product.code,'/qn','/norestart','/L*v',path.join(work,'candidate-remove-'+readonly+'.log')]);
 }
 result.result=result.reproduced?'reproduced-failure':'contrasting-pass';
}catch(error){result.result='incomplete';result.failure=error.stack;process.exitCode=1;}
finally{if(offlineIntent)await restoreWindowsOfflineIntent(offlineIntent,{invoke:(code)=>shell(code)}).catch(e=>{result.offlineRestoreFailure=e.message;process.exitCode=1;});if(installerPolicyBefore)await shell("$p='HKLM:\\Software\\Policies\\Microsoft\\Windows\\Installer';"+(installerPolicyBefore.present?'Set-ItemProperty -LiteralPath $p -Name DisableMsi -Type '+installerPolicyBefore.kind+' -Value '+installerPolicyBefore.value:'Remove-ItemProperty -LiteralPath $p -Name DisableMsi -ErrorAction SilentlyContinue')+";@{restored=$true}|ConvertTo-Json -Compress").catch(e=>{result.installerPolicyRestoreFailure=e.message;process.exitCode=1;});if(consentBefore)await shell("$p='HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System';"+(consentBefore.present?'Set-ItemProperty -LiteralPath $p -Name ConsentPromptBehaviorAdmin -Type '+consentBefore.kind+' -Value '+consentBefore.value:'Remove-ItemProperty -LiteralPath $p -Name ConsentPromptBehaviorAdmin -ErrorAction SilentlyContinue')+";@{restored=$true}|ConvertTo-Json -Compress").catch(e=>{result.consentRestoreFailure=e.message;process.exitCode=1;});if(originalAttributes!==undefined)await shell("$p=[Environment]::GetFolderPath('CommonPrograms');$i=Get-Item -LiteralPath $p -Force;$i.Attributes="+originalAttributes+";@{attributes=[int]$i.Attributes}|ConvertTo-Json -Compress").catch(e=>{result.restoreFailure=e.message;process.exitCode=1;});await observer?.close().catch(e=>{result.observerCloseFailure=e.message;process.exitCode=1;});result.terminalFinished=new Date().toISOString();await writeFile(path.join(root,'.local/msi-upgrade-diagnostic.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));}
