// SPDX-License-Identifier: Apache-2.0
// Temporary isolated investigation. Historical inputs are not candidate acceptance.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,writeFile,mkdtemp,mkdir,rm,lstat,readdir} from 'node:fs/promises';
import path from 'node:path';
import {root,environment,execute} from './run.mjs';
import {qualification} from './qualification.mjs';
import {msiCommandArguments} from './windows-msi-command.mjs';
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.GALLERY_ISOLATED_DESKTOP,'1');
assert.equal(process.platform,'win32');
const call=promisify(execFile);
const ps=path.join(process.env.ProgramFiles,'PowerShell/7/pwsh.exe');
const product='{F81110E5-48A6-4096-B065-752E0D3B61C0}';
const component='{E7908FDB-4863-5559-AA5F-FF341EDC0C71}';
const build=JSON.parse(await readFile(path.join(root,'.local/windows-package-build.json')));
assert.equal(build.revision,'c4dffe57d9636ef78c325bbba153599f5c047bfc');
assert.equal(build.source.sha256,'9488058fd292c7ad24e23c61e2e31c7b52d1541778b78d2ce0a05934646e87a2');
const full=build.products.find(row=>row.edition==='full').artifact;
const prior=build.publishedPredecessors.find(row=>row.version==='0.1.0');
const input=relative=>{const value=path.resolve(root,relative);assert.ok(value.startsWith(path.join(root,'.local')+path.sep));return value;};
async function hashFile(file){const hash=createHash('sha256');for await(const bytes of createReadStream(file))hash.update(bytes);return hash.digest('hex');}
async function shell(script,arg={}){const encoded=Buffer.from(JSON.stringify(arg)).toString('base64');const prefix="[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);$ErrorActionPreference='Stop';$arg=ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('"+encoded+"')));";return call(ps,['-NoProfile','-NonInteractive','-Command',prefix+script],{cwd:root,env:environment,windowsHide:true,shell:false,timeout:120000,maxBuffer:4*1024*1024});}
const SNAPSHOT=`
Add-Type -TypeDefinition @"
using System;using System.Text;using System.Runtime.InteropServices;
public static class MsiRegistrationProbe {
 [DllImport("msi.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern int MsiGetComponentPathExW(string p,string c,string sid,uint context,StringBuilder value,ref uint size);
 [DllImport("msi.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern uint MsiQueryComponentStateW(string p,string sid,uint context,string c,out int state);
 [DllImport("msi.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern uint MsiQueryFeatureStateExW(string p,string sid,uint context,string f,out int state);
 [DllImport("msi.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern uint MsiEnumClientsExW(string c,string sid,uint context,uint index,StringBuilder p,out uint actualContext,StringBuilder actualSid,ref uint size);
}
"@
$engine=New-Object -ComObject WindowsInstaller.Installer
$identity=[Security.Principal.WindowsIdentity]::GetCurrent()
$value=@{product=$arg.product;component=$arg.component;process=$PID;bits=[IntPtr]::Size*8;sid=$identity.User.Value;administrator=([Security.Principal.WindowsPrincipal]$identity).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)}
$buffer=[Text.StringBuilder]::new(32768);[uint32]$length=32768
$state=[MsiRegistrationProbe]::MsiGetComponentPathExW($arg.product,$arg.component,$null,4,$buffer,[ref]$length)
$value.componentPath=@{state=$state;length=$length;path=$buffer.ToString()}
[int]$installedState=0;$errorCode=[MsiRegistrationProbe]::MsiQueryComponentStateW($arg.product,$null,4,$arg.component,[ref]$installedState)
$value.componentState=@{error=$errorCode;state=$installedState}
$value.features=@{};foreach($feature in @('Application','Payload','Notices')){[int]$featureState=0;$errorCode=[MsiRegistrationProbe]::MsiQueryFeatureStateExW($arg.product,$null,4,$feature,[ref]$featureState);$value.features[$feature]=@{error=$errorCode;state=$featureState}}
$clients=@();for([uint32]$index=0;$index -lt 16;$index++){$client=[Text.StringBuilder]::new(39);$sid=[Text.StringBuilder]::new(1024);[uint32]$size=1024;[uint32]$context=0;$errorCode=[MsiRegistrationProbe]::MsiEnumClientsExW($arg.component,$null,4,$index,$client,[ref]$context,$sid,[ref]$size);if($errorCode -eq 259){break};$clients+=@{error=$errorCode;product=$client.ToString();context=$context;sid=$sid.ToString()};if($errorCode -ne 0){break}};$value.clients=$clients
foreach($name in @('VersionString','PackageCode','InstallLocation','LocalPackage')){try{$value[$name]=$engine.ProductInfo($arg.product,$name)}catch{$value[$name]=@{error=$_.Exception.Message}}}
$value|ConvertTo-Json -Depth 8 -Compress
`;
async function checkedInputs(){assert.equal(await hashFile(input(full.path)),full.sha256);assert.equal(await hashFile(input(prior.archive.path)),prior.archive.sha256);}
async function probe(){
 await checkedInputs();const work=await mkdtemp(path.join(root,'.local/msi-registration-diagnostic-'));const old=path.join(work,'published-machine.msi');
 await shell("Add-Type -AssemblyName System.IO.Compression.FileSystem;$zip=[IO.Compression.ZipFile]::OpenRead($arg.zip);try{$entries=@($zip.Entries|Where-Object {$_.FullName.EndsWith('machine.msi')});if($entries.Count -ne 1){throw 'Expected exactly one machine MSI'};[IO.Compression.ZipFileExtensions]::ExtractToFile($entries[0],$arg.output,$false)}finally{$zip.Dispose()}",{zip:input(prior.archive.path),output:old});
 assert.equal(await hashFile(old),prior.msi.sha256);
 const report={kind:'native-registration-investigation',acceptance:false,historicalRevision:build.revision,historicalSource:build.source.sha256,started:new Date().toISOString(),actions:[],snapshots:[]};
 const persist=()=>writeFile(path.join(root,'.local/windows-registration-diagnostic.json'),JSON.stringify(report,null,2)+'\n');
 async function snapshot(phase){try{report.snapshots.push({phase,...JSON.parse((await shell(SNAPSHOT,{product,component})).stdout)});}catch(error){report.snapshots.push({phase,error:error.message,stdout:error.stdout,stderr:error.stderr});}await persist();}
 async function msi(label,args){const log=path.join(work,label+'.log');let result;try{await call(path.join(process.env.SystemRoot,'System32/msiexec.exe'),msiCommandArguments([...args,'/qn','/norestart','/L*v',log]),{cwd:work,env:environment,windowsHide:true,windowsVerbatimArguments:true,shell:false,timeout:180000,maxBuffer:1024*1024});result={label,code:0,log};}catch(error){result={label,code:error.code,killed:error.killed??false,stdout:error.stdout,stderr:error.stderr,log};}report.actions.push(result);await persist();return result;}
 const current=input(full.path);const bootstrap=path.join(work,'runtime bootstrap');const destination=path.join(work,'legacy application 雪');
 await snapshot('initial');
 let action=await msi('bootstrap-install',['/i',current,'ALLUSERS=1','INSTALLDIR='+bootstrap]);assert.ok([0,3010].includes(action.code));
 action=await msi('bootstrap-remove',['/x',current,'ALLUSERS=1']);assert.ok([0,3010].includes(action.code));
 action=await msi('legacy-install',['/i',old,'ALLUSERS=1','INSTALLDIR='+destination]);assert.ok([0,3010].includes(action.code));
 await snapshot('before-administrative-retention');
 for(const [label,file]of [['prior',old],['next',current]]){const image=path.join(work,label+'-administrative');await mkdir(image);await msi(label+'-administrative',['/a',file,'TARGETDIR='+image]);await snapshot('after-'+label+'-administrative-before-cleanup');
  async function physical(at){const data=await lstat(at);assert.equal(data.isSymbolicLink(),false);if(data.isDirectory())for(const entry of await readdir(at))await physical(path.join(at,entry));}
  assert.ok(path.resolve(image).startsWith(path.resolve(work)+path.sep));await physical(image);await rm(image,{recursive:true});await snapshot('after-'+label+'-administrative-cleanup');}
 await msi('legacy-remove-by-product',['/x',product]);await snapshot('after-registered-removal');assert.ok(report.snapshots.every(row=>row.componentPath&&row.componentState),'Every native snapshot must be collected');report.terminalFinished=new Date().toISOString();await persist();console.log(JSON.stringify({diagnostic:report.kind,acceptance:false,actions:report.actions.map(({label,code})=>({label,code})),snapshots:report.snapshots.map(({phase,componentPath,componentState,features,error})=>({phase,componentPath,componentState,features,error}))}));
}
if(process.argv.includes('--native-probe')){await probe();}else{
 const record=await qualification({identify:async()=>({scope:'registration-diagnostic',acceptance:false,historicalRevision:build.revision}),prepare:checkedInputs,steps:[{name:'Observe exact historical MSI component registration through administrative retention',run:()=>execute(process.execPath,[path.join(root,'scripts/diagnose-msi-registration.mjs'),'--native-probe'])}]});
 record.acceptance=false;await writeFile(path.join(root,'.local/ci-msi-registration-diagnostic.json'),JSON.stringify(record,null,2)+'\n');if(record.result!=='pass')process.exitCode=1;
}
