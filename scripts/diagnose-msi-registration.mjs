// SPDX-License-Identifier: Apache-2.0
// Isolated diagnostic evidence only. Original failure remains a recorded failure.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir,stat,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {root,environment,execute,python} from './run.mjs';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
import {parseReleaseRecord} from './release-record.mjs';
import {publishedWindowsInputs} from './published-windows-input.mjs';
import {digest,verifyPayload,packageGuid} from './windows-packages.mjs';
import {msiCommandArguments} from './windows-msi-command.mjs';
import {buildLegacyMsiPatch} from './legacy-msi-patch.mjs';
import {buildDiagnosticPatch} from './diagnose-msi-patch-build.mjs';
import {registrationCase,registrationLocation,recordMsiOutcome} from './msi-registration.mjs';
requireIsolatedDesktop();assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.platform,'win32');
const selected=registrationCase(process.env.GALLERY_MSI_UPGRADE_CASE);
const call=promisify(execFile),work=path.join(root,'.local/msi-registration-diagnostic');await mkdir(work,{recursive:true});
const capture=(file,args,extra={})=>{const task=call(file,args,{cwd:work,env:environment,windowsHide:true,shell:false,timeout:180000,maxBuffer:8*1024*1024,...extra});task.child.stdin.end();return task;};
async function shell(script,arg={}){const encoded=Buffer.from(JSON.stringify(arg)).toString('base64');return capture('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-Command',"[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);$ErrorActionPreference='Stop';$arg=ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('"+encoded+"')));"+script]);}
async function download(url,sha,bytes){const response=await fetch(url,{signal:AbortSignal.timeout(180000)});assert.ok(response.ok,url+': '+response.status);const data=Buffer.from(await response.arrayBuffer());assert.equal(digest(data),sha);if(bytes)assert.equal(String(data.length),String(bytes));return data;}
const pins={'0.2.0':'9f95fbfce0b46fc946f38a2bad6f22fa8284451bccfb258e82d667603cfec039','0.2.1':'1fe581cf724c1aab9c3451c40efd94cac78eba997112e9423aa03e29e5fbb5ce','0.2.2':'91093fac720854e1b6d6d637777453b50285846665398f776e37fc67cff1dae8'};
async function published(version){
 const canonical=version==='0.1.0'?await readFile(path.join(root,'crates/gallery-preparation/tests/fixtures/release-0.1.0.json')):await download('https://github.com/shruggietech/local-media-gallery/releases/download/v'+version+'/release.json',pins[version]);
 assert.equal(digest(canonical),version==='0.1.0'?'079615f3ff8434b32c3c632190b544c6c32e17513fa125ec7e07f679a1c65f1f':pins[version]);
 const record=parseReleaseRecord(canonical,{requirePublished:true});assert.equal(record.version,version);const artifact=record.artifacts.find(a=>a.role==='package'&&a.platform==='windows'&&a.edition==='full'&&a.architecture==='x86_64');assert.ok(artifact);
 const bytes=await download(artifact.url,artifact.sha256,artifact.bytes),file=path.join(work,version+'.msi');let payload;
 if(version==='0.1.0'){
  const zip=path.join(work,version+'.zip'),directory=path.join(work,version);await writeFile(zip,bytes);await execute(python,[path.join(root,'scripts/extract-build-input.py'),zip,directory]);
  const bundle=JSON.parse(await readFile(path.join(directory,'bundle.json'))),machine=bundle.packages.find(p=>p.scope==='machine');assert.ok(machine);const msi=await readFile(path.join(directory,machine.path));assert.equal(digest(msi),machine.sha256);assert.equal(String(msi.length),machine.bytes);await writeFile(file,msi);payload=bundle.payload;
 }else if(version==='0.2.0'){
  const input=publishedWindowsInputs(bytes);await writeFile(file,input.get('local-media-gallery-machine.msi').data);payload=JSON.parse(input.get('source/payload.json').data);
 }else await writeFile(file,bytes);
 if(payload){assert.equal(payload.version,version);assert.equal(payload.source.sha256,record.source.sha256);}
 return {version,file,payload,canonicalSha256:digest(canonical),artifact,msiSha256:digest(await readFile(file))};
}
const SNAPSHOT=String.raw`
Add-Type -TypeDefinition @"
using System;using System.Text;using System.Runtime.InteropServices;
public static class MsiRegistrationProbe {
 [DllImport("msi.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern int MsiGetComponentPathExW(string p,string c,IntPtr sid,uint context,StringBuilder value,ref uint size);
 [DllImport("msi.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern int MsiGetComponentPathW(string p,string c,StringBuilder value,ref uint size);
 [DllImport("msi.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern uint MsiQueryComponentStateW(string p,IntPtr sid,uint context,string c,out int state);
 [DllImport("msi.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern uint MsiQueryFeatureStateExW(string p,IntPtr sid,uint context,string f,out int state);
 [DllImport("msi.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern uint MsiEnumClientsExW(string c,IntPtr sid,uint context,uint index,StringBuilder p,out uint actualContext,StringBuilder actualSid,ref uint size);
}
"@
$engine=New-Object -ComObject WindowsInstaller.Installer
$identity=[Security.Principal.WindowsIdentity]::GetCurrent()
$value=@{product=$arg.product;component=$arg.component;process=$PID;bits=[IntPtr]::Size*8;sid=$identity.User.Value;administrator=([Security.Principal.WindowsPrincipal]$identity).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)}
$buffer=[Text.StringBuilder]::new(32768);[uint32]$length=32768
$state=[MsiRegistrationProbe]::MsiGetComponentPathExW($arg.product,$arg.component,[IntPtr]::Zero,4,$buffer,[ref]$length)
$value.componentPath=@{state=$state;length=$length;path=$buffer.ToString()}
$value.pathBuffers=@();foreach($capacity in @(260,1024,32767,32768)){$text=[Text.StringBuilder]::new($capacity);[uint32]$count=$capacity;$found=[MsiRegistrationProbe]::MsiGetComponentPathExW($arg.product,$arg.component,[IntPtr]::Zero,4,$text,[ref]$count);$value.pathBuffers+=@{capacity=$capacity;state=$found;length=$count;path=$text.ToString()}}
$text=[Text.StringBuilder]::new(260);[uint32]$count=260;$found=[MsiRegistrationProbe]::MsiGetComponentPathW($arg.product,$arg.component,$text,[ref]$count);$value.nonExPath=@{state=$found;length=$count;path=$text.ToString()}
function PackedGuid([string]$guid){$s=$guid.Replace('-','').Replace('{','').Replace('}','');$parts=@($s.Substring(0,8),$s.Substring(8,4),$s.Substring(12,4));$result='';foreach($part in $parts){$letters=$part.ToCharArray();[array]::Reverse($letters);$result+=-join $letters};for($n=16;$n -lt 32;$n+=2){$result+=$s[$n+1];$result+=$s[$n]};return $result}
try{$key='Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\UserData\S-1-5-18\Components\'+(PackedGuid $arg.component);$entry=Get-Item -LiteralPath $key;$registered=$entry.GetValue((PackedGuid $arg.product));$value.componentRegistry=@{key=$key;value=$registered;exists=if($registered){Test-Path -LiteralPath $registered}else{$false};names=@($entry.GetValueNames())}}catch{$value.componentRegistry=@{error=$_.Exception.Message}}

[int]$installedState=0;$errorCode=[MsiRegistrationProbe]::MsiQueryComponentStateW($arg.product,[IntPtr]::Zero,4,$arg.component,[ref]$installedState)
$value.componentState=@{error=$errorCode;state=$installedState}
$value.features=@{};foreach($feature in @('Application','Payload','Notices')){[int]$featureState=0;$errorCode=[MsiRegistrationProbe]::MsiQueryFeatureStateExW($arg.product,[IntPtr]::Zero,4,$feature,[ref]$featureState);$value.features[$feature]=@{error=$errorCode;state=$featureState}}
$clients=@();for([uint32]$index=0;$index -lt 16;$index++){$client=[Text.StringBuilder]::new(39);$sid=[Text.StringBuilder]::new(1024);[uint32]$size=1024;[uint32]$context=0;$errorCode=[MsiRegistrationProbe]::MsiEnumClientsExW($arg.component,[IntPtr]::Zero,4,$index,$client,[ref]$context,$sid,[ref]$size);if($errorCode -eq 259){break};$clients+=@{error=$errorCode;product=$client.ToString();context=$context;sid=$sid.ToString()};if($errorCode -ne 0){break}};$value.clients=$clients
foreach($name in @('VersionString','PackageCode','InstallLocation','LocalPackage')){try{$value[$name]=$engine.ProductInfo($arg.product,$name)}catch{$value[$name]=@{error=$_.Exception.Message}}}
$value.drives=@();foreach($drive in @('C:\','D:\')){try{$info=[IO.DriveInfo]::new($drive);$value.drives+=@{name=$info.Name;format=$info.DriveFormat;type=$info.DriveType.ToString()}}catch{$value.drives+=@{name=$drive;error=$_.Exception.Message}}};$dll=Get-Item -LiteralPath ($env:SystemRoot+'\System32\msi.dll');$value.engine=@{version=$dll.VersionInfo.FileVersion;sha256=(Get-FileHash -LiteralPath $dll.FullName -Algorithm SHA256).Hash;image=$env:ImageVersion};$value|ConvertTo-Json -Depth 8 -Compress
`;

const report={kind:'native-registration-investigation',acceptance:false,case:selected,started:new Date().toISOString(),inputs:[],actions:[],snapshots:[]};
const persist=()=>writeFile(path.join(root,'.local/windows-registration-diagnostic.json'),JSON.stringify(report,null,2)+'\n');
let product,component;
async function snapshot(phase){const row=JSON.parse((await shell(SNAPSHOT,{product,component})).stdout);report.snapshots.push({phase,...row});await persist();return row;}
async function msi(label,args){
 const log=path.join(work,label+'.log');let error=null;try{await capture(path.join(environment.SystemRoot,'System32/msiexec.exe'),msiCommandArguments([...args,'/qn','/norestart','/L*v',log]),{windowsVerbatimArguments:true});}catch(e){error=e;}
 const outcome={label,...recordMsiOutcome(error),log,...(error?{message:error.message,stdout:error.stdout,stderr:error.stderr}:{})};report.actions.push(outcome);await persist();return outcome;
}
function success(row){assert.ok(row.terminal&&[0,3010].includes(row.code),JSON.stringify(row));}


async function guardRepair(old,destination){
 const payloadText=JSON.stringify(old.payload,null,2)+'\n';
 assert.equal(packageGuid('machine',digest(payloadText)),report.identity.packageCode.toUpperCase());
 const manifest=path.join(work,'legacy-guard-payload.json');await writeFile(manifest,payloadText);
 await execute('cargo',['build','--locked','--release','-p','gallery-windows-package','--lib'],{env:{...environment,LMG_PACKAGE_PAYLOAD:manifest,RUSTFLAGS:'-C target-feature=+crt-static -C link-arg=/DEPENDENTLOADFLAG:0x800'}});
 const guard=path.join(root,'target/release/gallery_windows_package.dll');
 const pins=JSON.parse(await readFile(path.join(root,'packaging/windows/inputs.json'))).wix;
 const zip=path.join(work,'wix.zip');await writeFile(zip,await download(pins.url,pins.sha256,pins.bytes));const wix=path.join(work,'wix');await execute(python,[path.join(root,'scripts/extract-build-input.py'),zip,wix]);
 report.patch=await buildLegacyMsiPatch({old:{version:old.version,file:old.file,sha256:old.msiSha256,productCode:product,packageCode:report.identity.packageCode,scope:'machine'},guard,wix,work:path.join(work,'guard-patch'),msi,shell,capture,generation:'03700000000000000000000000000000'});
 report.patch.outcome=await msi('guard-patch-apply',['/i',old.file,'PATCH='+report.patch.path,'REINSTALL=ALL','REINSTALLMODE=omus','ALLUSERS=1','INSTALLDIR='+destination]);await snapshot('after-guard-patch');success(report.patch.outcome);
 await verifyPayload(destination,old.payload);
 const changed=path.join(destination,old.payload.binary),saved=await readFile(changed);await writeFile(changed,Buffer.concat([saved,Buffer.from('changed owned fixture')]));
 const refusal=await msi('guard-changed-owned-refusal',['/x',product]);assert.equal(refusal.code,1603);assert.equal(refusal.terminal,true);await snapshot('after-changed-owned-refusal');await writeFile(changed,saved);await verifyPayload(destination,old.payload);
 report.patch.removal=await msi('guard-ordinary-remove',['/x',product]);await snapshot('after-guard-removal');success(report.patch.removal);
 assert.equal(digest(await readFile(path.join(destination,'independent.txt'))),report.retainedSha256);await persist();
}

async function aliasRepair(old,destination){
 assert.ok(old.payload&&['0.1.0','0.2.0'].includes(old.version));
 await verifyPayload(destination,old.payload);
 const alias=selected.patch?destination:JSON.parse((await shell("\nAdd-Type @\"\nusing System;using System.Text;using System.Runtime.InteropServices;using Microsoft.Win32.SafeHandles;\npublic static class OwnedShortAlias {\n [DllImport(\"kernel32.dll\",CharSet=CharSet.Unicode,SetLastError=true)] static extern SafeFileHandle CreateFileW(string path,uint access,uint share,IntPtr security,uint disposition,uint flags,IntPtr template);\n [DllImport(\"kernel32.dll\",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool SetFileShortNameW(SafeFileHandle file,string name);\n [DllImport(\"kernel32.dll\",CharSet=CharSet.Unicode,SetLastError=true)] static extern uint GetShortPathNameW(string path,StringBuilder buffer,uint size);\n public static string Create(string path){\n  var before=new StringBuilder(32768);if(GetShortPathNameW(path,before,32768)==0)throw new Exception(\"GetShortPathName: \"+Marshal.GetLastWin32Error());\n  if(before.ToString().Length<path.Length)return before.ToString();\n  using(var h=CreateFileW(path,0x10000|0x80,3,IntPtr.Zero,3,0x02000000|0x00200000,IntPtr.Zero)){\n   if(h.IsInvalid)throw new Exception(\"Open alias handle: \"+Marshal.GetLastWin32Error());\n   if(!SetFileShortNameW(h,\"LMG037~1\"))throw new Exception(\"SetFileShortName: \"+Marshal.GetLastWin32Error());\n  }\n  var after=new StringBuilder(32768);if(GetShortPathNameW(path,after,32768)==0)throw new Exception(\"Read alias: \"+Marshal.GetLastWin32Error());return after.ToString();\n }\n}\n\"@\n[OwnedShortAlias]::Create($arg.directory)|ConvertTo-Json -Compress\n",{directory:destination})).stdout);
 assert.ok(selected.patch||alias.length<destination.length);await verifyPayload(alias,old.payload);
 const proof=await Promise.all([stat(destination,{bigint:true}),stat(alias,{bigint:true})]);assert.equal(proof[0].dev,proof[1].dev);assert.equal(proof[0].ino,proof[1].ino);
 report.alias={directory:alias,device:String(proof[0].dev),inode:String(proof[0].ino)};
 const base=path.join(environment.ProgramData,'local-media-gallery','updates','s037-repair-'+process.env.GITHUB_RUN_ID);
 const candidate={native:{kind:'windows-msi',scope:'machine',packageCode:report.identity.packageCode.toUpperCase(),productCode:product}};
 const identity={formatVersion:1,transaction:base,directory:alias,prior:candidate,next:candidate,state:null};
 await mkdir(base);await privateAcl(base,true);
 for(const side of ['prior','next']){
  const at=path.join(base,side);await mkdir(at);await privateAcl(at,true);
  for(const f of [...old.payload.files,{path:'payload.json'}]){
   const target=path.join(at,...f.path.split('/'));await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(destination,...f.path.split('/')),target);
  }
 }
 await shell("$items=@(Get-ChildItem -LiteralPath $arg.base -Recurse -Force);foreach($i in $items){if($i.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked private fixture'};$s=if($i.PSIsContainer){[Security.AccessControl.DirectorySecurity]::new()}else{[Security.AccessControl.FileSecurity]::new()};$f=if($i.PSIsContainer){'OICI'}else{''};$s.SetSecurityDescriptorSddlForm(('O:BAG:BAD:P(A;'+$f+';FA;;;SY)(A;'+$f+';FA;;;BA)'));Set-Acl -LiteralPath $i.FullName -AclObject $s};@{files=$items.Count}|ConvertTo-Json -Compress",{base});
 const identityBytes=JSON.stringify(identity);await writeFile(path.join(base,'identity.json'),identityBytes);await privateAcl(path.join(base,'identity.json'),false);
 const journal=path.join(base,'journal.json');await writeFile(journal,JSON.stringify({...identity,binding:digest(identityBytes),phase:'restoring',targetPrior:true}));await privateAcl(journal,false);
 report.alias.journal=journal;await persist();
 if(selected.patch){
  report.patch=await buildDiagnosticPatch({old,work,msi,shell,capture,download});
  report.patch.outcome=await msi('metadata-patch-apply',['/p',report.patch.path,'ALLUSERS=1','INSTALLDIR='+destination,'LMG_RECOVERY='+journal,'REINSTALL=ALL','REINSTALLMODE=omus']);
  await snapshot('after-metadata-patch');await persist();return;
 }
 const repair=await msi('alias-repair',['/i',old.file,'ALLUSERS=1','INSTALLDIR='+alias,'LMG_RECOVERY='+journal,'REINSTALL=ALL','REINSTALLMODE=vamus']);
 await snapshot('after-alias-repair');report.alias.repair=repair;
 if(repair.terminal&&[0,3010].includes(repair.code)){
  await verifyPayload(destination,old.payload);
  report.alias.removal=await msi('alias-ordinary-remove',['/x',product]);await snapshot('after-alias-removal');
  assert.equal(digest(await readFile(path.join(destination,'independent.txt'))),report.retainedSha256);
 }
 await persist();
}
async function privateAcl(file,directory){
 await shell("$s=if($arg.directory){[Security.AccessControl.DirectorySecurity]::new()}else{[Security.AccessControl.FileSecurity]::new()};$flags=if($arg.directory){'OICI'}else{''};$s.SetSecurityDescriptorSddlForm(('O:BAG:BAD:P(A;'+$flags+';FA;;;SY)(A;'+$flags+';FA;;;BA)'));Set-Acl -LiteralPath $arg.file -AclObject $s;@{secured=$true}|ConvertTo-Json -Compress",{file,directory});
}

try{
 const current=await published('0.2.2');report.inputs.push(current);
 success(await msi('bootstrap-install',['/i',current.file,'ALLUSERS=1','INSTALLDIR=C:\\s037-bootstrap']));success(await msi('bootstrap-remove',['/x',current.file,'ALLUSERS=1']));
 const old=selected.version==='0.2.2'?current:await published(selected.version);if(old!==current)report.inputs.push(old);
 const metadata=JSON.parse((await capture('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'scripts/inspect-windows-package.ps1'),'-File',old.file])).stdout);product=metadata.productCode;assert.equal(metadata.version,selected.version);
 component=JSON.parse((await shell("$e=New-Object -ComObject WindowsInstaller.Installer;$db=$e.OpenDatabase($arg.file,0);$v=$db.OpenView('SELECT FileName,Component_ FROM File');$v.Execute();$name=$null;while($null -ne ($r=$v.Fetch())){if(($r.StringData(1).Split('|')[-1]) -eq 'local-media-gallery.exe'){$name=$r.StringData(2)}};if(!$name){throw 'Executable component missing'};$v=$db.OpenView('SELECT Component,ComponentId FROM Component');$v.Execute();$id=$null;while($null -ne ($r=$v.Fetch())){if($r.StringData(1) -eq $name){$id=$r.StringData(2)}};if(!$id){throw 'Executable component GUID missing'};$id|ConvertTo-Json -Compress",{file:old.file})).stdout);
 report.identity={...metadata,component};const destination=registrationLocation(selected,'C:\\s037');report.location={destination,executableLength:path.join(destination,'local-media-gallery.exe').length};
 await snapshot('initial');success(await msi('legacy-install',['/i',old.file,'ALLUSERS=1','INSTALLDIR='+destination]));
 if(old.payload)await verifyPayload(destination,old.payload);
 await writeFile(path.join(destination,'independent.txt'),'retained independent fixture\n');report.retainedSha256=digest(await readFile(path.join(destination,'independent.txt')));
 await snapshot('installed');
 const removal=await msi('legacy-remove-by-product',['/x',product]);await snapshot('after-registered-removal');
 assert.equal(digest(await readFile(path.join(destination,'independent.txt'))),report.retainedSha256);
 assert.equal(removal.terminal,true,'Uncertain worker termination is not a native result');
 report.originalRemovalSucceeded=[0,3010].includes(removal.code);
 if(!report.originalRemovalSucceeded)report.cleanup={result:'retained',reason:'Original MSI refuses removal. No registration surgery or guard bypass attempted on ephemeral hosted runner.'};
 if(selected.repair&&!report.originalRemovalSucceeded){if(selected.guard)await guardRepair(old,destination);else await aliasRepair(old,destination);}
 report.terminalFinished=new Date().toISOString();await persist();console.log(JSON.stringify({case:selected,identity:report.identity,actions:report.actions.map(({label,code,terminal})=>({label,code,terminal})),snapshots:report.snapshots.map(({phase,componentPath,componentState,nonExPath})=>({phase,componentPath,componentState,nonExPath}))}));
}catch(error){report.failure={message:error.message,stack:error.stack};await persist();throw error;}
