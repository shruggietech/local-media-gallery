// SPDX-License-Identifier: Apache-2.0
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
requireIsolatedDesktop();
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes} from 'node:crypto';
import {mkdir,mkdtemp,readFile,writeFile,cp,copyFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {root,node,execute,python,environment,exportInterface} from './run.mjs';
import {sourceIdentity} from './provenance.mjs';
import {collectPayload} from './proof.mjs';
import {digest,validatePayload,verifyPayload,packageGuid,productCodes,upgradeCodes,xml,validateNativeAudit,authorInstaller} from './windows-packages.mjs';
assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');
const call=promisify(execFile);
const capture=async(file,args,options={})=>{const p=call(file,args,{cwd:root,env:environment,windowsHide:true,shell:false,timeout:180000,maxBuffer:16*1024*1024,...options});p.child.stdin.end();return p;};
const source=await sourceIdentity();const revision=(await capture('git',['rev-parse','HEAD'])).stdout.trim();
const directory=await mkdtemp(path.join(root,'.local/windows-packages-'));const inputs=JSON.parse(await readFile(path.join(root,'packaging/windows/inputs.json')));
// A new generation changes every MSI PackageCode even if source/payload match.
// Stable ProductCode/component identities remain separate from package identity.
const generation=randomBytes(16).toString('hex');
const buildEnv={...environment,RUSTFLAGS:[environment.RUSTFLAGS??'','-C link-arg=/DEPENDENTLOADFLAG:0x800'].join(' ').trim()};
async function cargo(args,extra={}){await execute('cargo',args,{env:{...buildEnv,...extra}});}
async function support(args,extra={}){await cargo([...args,'--target','x86_64-pc-windows-msvc'],{...extra,RUSTFLAGS:buildEnv.RUSTFLAGS+' -C target-feature=+crt-static'});}
async function input(name){const record=inputs[name],file=path.join(directory,name+'.'+(name==='wix'?'zip':'exe'));const response=await fetch(record.url,{signal:AbortSignal.timeout(120000)});assert.ok(response.ok,'Pinned '+name+' download '+response.status);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(String(bytes.length),record.bytes);assert.equal(digest(bytes),record.sha256);await writeFile(file,bytes);return file;}
const wixZip=await input('wix');const vendor=await input('bootstrapper');
const wix=path.join(directory,'wix');await execute(python,[path.join(root,'scripts/extract-build-input.py'),wixZip,wix]);
const inspect=async file=>JSON.parse((await capture('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'scripts/inspect-windows-package.ps1'),'-File',file])).stdout);
const vendorAudit=await inspect(vendor);assert.equal(vendorAudit.signature.status,'Valid');assert.match(vendorAudit.signature.subject,/(?:^|,\s*)O=Microsoft Corporation(?:,|$)/);assert.equal(vendorAudit.fileVersion,inputs.bootstrapper.version);assert.equal(vendorAudit.machine,0x14c);
await exportInterface();const binaries={};
for(const edition of ['full','lite']){await cargo(['build','--locked','--release','-p','local-media-gallery',...(edition==='lite'?['--features','lite']:[])]);const file=path.join(directory,'compiled-'+edition+'.exe');await copyFile(path.join(root,'target/release/local-media-gallery.exe'),file);binaries[edition]=file;}
await node(path.join(root,'scripts/build-proof.mjs'),['--full',binaries.full,'--lite',binaries.lite,'--output',path.join(directory,'normal-assembly.json')]);
const assembly=JSON.parse(await readFile(path.join(directory,'normal-assembly.json')));const payloads={};const records=[];
async function archive(payload,name){const files=await collectPayload(payload);const inventory=path.join(directory,name+'-inventory.json');await writeFile(inventory,JSON.stringify(files));const file=path.join(directory,name+'.zip');await execute(python,[path.join(root,'scripts/proof-archive.py'),'create',file,payload,inventory]);const bytes=await readFile(file);return {path:path.relative(root,file).replaceAll('\\','/'),bytes:String(bytes.length),sha256:digest(bytes),files};}
for(const edition of ['full','lite']){
 const proof=assembly.records.find(r=>r.edition===edition);assert.equal(proof.buildProfile,'release');const payload=path.join(directory,edition+'-payload');await cp(path.join(root,proof.payloadDirectory),payload,{recursive:true});await rm(path.join(payload,'proof.json'));
 await writeFile(path.join(payload,'PREREQUISITES.txt'),`Local Media Gallery ${edition} Windows x86_64 candidate 0.0.0 (unpublished).\nRelease-profile native application, bundled interface and SQLite state. Windows 10 22H2 or Windows 11 x64 client baseline; hosted Windows Server qualification does not imply client or clean-machine verification.\nMicrosoft Edge WebView2 Evergreen Runtime is shared and remains installed after application removal. Full setup verifies it and invokes the pinned Microsoft online bootstrapper if needed; Internet is required for provisioning. Lite requires the host runtime and never installs Full.\nNo Node, Python, Rust, chosen browser or FFmpeg is required for browsing. Optional video thumbnail jobs use a separately selected FFmpeg helper. All notices are included.\nLite: place local-media-gallery.exe beside gallery media, then double-click, or use open ABSOLUTE_PATH. Move the complete payload and gallery together; use Refresh after changing media. Settings/history are retained independently.\nFull: extract the complete Full ZIP. setup.exe installs for this user; setup-machine.exe explicitly requests administrator scope. Optional --directory ABSOLUTE_PATH selects an empty destination. --remove removes only owned application files/integration; keep the matching candidate for removal. Close gallery processes before installation/removal. Same-candidate repetition is supported; other candidates must be removed with their matching package. Galleries, sidecars, user state, foreign files and shared runtime are retained.\nCandidates are unsigned; trust prompts are not qualified. These are CI artifacts, not a GitHub release.\n`);
 const files=await collectPayload(payload);const manifest={generation,product:'local-media-gallery',kind:'windows-application-payload',formatVersion:1,version:'0.0.0',edition,os:'windows',arch:'x86_64',targetTriple:'x86_64-pc-windows-msvc',buildProfile:'release',source,revision,binary:'local-media-gallery.exe',files};validatePayload(manifest);await verifyPayload(payload,manifest);await writeFile(path.join(payload,'payload.json'),JSON.stringify(manifest,null,2)+'\n');payloads[edition]={directory:payload,manifest};
 const audit=await inspect(path.join(payload,manifest.binary));validateNativeAudit(audit);
 records.push({edition,payload:manifest,native:audit,archive:edition==='lite'?await archive(payload,'local-media-gallery-0.0.0-lite-x86_64-windows-candidate'):null});
}
const full=payloads.full;const payloadFile=path.join(full.directory,'payload.json');const payloadSha=digest(await readFile(payloadFile));
await support(['build','--locked','--release','-p','gallery-windows-package','--lib'],{LMG_PACKAGE_PAYLOAD:payloadFile});
const helper=path.join(directory,'ownership.dll');await copyFile(path.join(root,'target/x86_64-pc-windows-msvc/release/gallery_windows_package.dll'),helper);const helperAudit=await inspect(helper);validateNativeAudit(helperAudit);
const bundle=path.join(directory,'full-bundle');await mkdir(bundle);await copyFile(vendor,path.join(bundle,'MicrosoftEdgeWebview2Setup.exe'));await copyFile(path.join(full.directory,'PREREQUISITES.txt'),path.join(bundle,'PREREQUISITES.txt'));
const msiRecords=[];const template=await readFile(path.join(root,'packaging/windows/installer.wxs'),'utf8');
for(const scope of ['user','machine']){
 const machine=scope==='machine',files=await collectPayload(full.directory);const out=path.join(bundle,'local-media-gallery-'+scope+'.msi');const {wxs,code}=authorInstaller({scope,files,payloadDirectory:full.directory,helper,payloadSha,template});
 const sourceFile=path.join(directory,scope+'.wxs');await writeFile(sourceFile,wxs);const object=path.join(directory,scope+'.wixobj');await execute(path.join(wix,'candle.exe'),['-nologo','-arch','x64','-out',object,sourceFile]);
 // ICE38: explicit file keypaths receive native ownership checks. ICE64: the
 // shared user Programs parent is retained. Machine-only ICE43: the common
 // shortcut deliberately uses machine HKLM ownership, not a user profile key.
 await execute(path.join(wix,'light.exe'),['-nologo','-sice:ICE38','-sice:ICE64',...(machine?['-sice:ICE43']:[]),'-out',out,object]);
 const actual=await inspect(out);assert.equal(actual.productCode,productCodes[scope]);assert.equal(actual.packageCode.toUpperCase(),code);assert.equal(actual.version,'0.0.0');assert.match(actual.template,/^x64;/);assert.equal(actual.allUsers??null,machine?'1':null);const bytes=await readFile(out);msiRecords.push({actual,scope,productCode:productCodes[scope],packageCode:code,path:path.basename(out),bytes:String(bytes.length),sha256:digest(bytes)});
 const setupInput={scope,msi:msiRecords.at(-1),bootstrapper:{...inputs.bootstrapper,path:'MicrosoftEdgeWebview2Setup.exe'}};const setupFile=path.join(directory,scope+'-setup.json');await writeFile(setupFile,JSON.stringify(setupInput));
 await support(['build','--locked','--release','-p','gallery-windows-package','--bin','gallery-setup'],{LMG_PACKAGE_PAYLOAD:payloadFile,LMG_SETUP_INPUT:setupFile,...(machine?{LMG_SETUP_MACHINE:'1'}:{})});await copyFile(path.join(root,'target/x86_64-pc-windows-msvc/release/gallery-setup.exe'),path.join(bundle,machine?'setup-machine.exe':'setup.exe'));
}
const manifest={kind:'windows-full-bundle',formatVersion:1,version:'0.0.0',publication:'candidate',source,revision,targetTriple:'x86_64-pc-windows-msvc',buildProfile:'release',payload:full.manifest,packages:msiRecords,bootstrapper:{...inputs.bootstrapper,audit:vendorAudit},helper:helperAudit,entrypoints:[]};
for(const name of ['setup.exe','setup-machine.exe']){const audit=await inspect(path.join(bundle,name));validateNativeAudit(audit);assert.equal(audit.requestedExecutionLevel,name==='setup.exe'?'asInvoker':'requireAdministrator');manifest.entrypoints.push({path:name,sha256:digest(await readFile(path.join(bundle,name))),audit});}
await writeFile(path.join(bundle,'bundle.json'),JSON.stringify(manifest,null,2)+'\n');records.find(r=>r.edition==='full').archive=await archive(bundle,'local-media-gallery-0.0.0-full-x86_64-windows-candidate');
assert.deepEqual(await sourceIdentity(),source);const receipt={generation,formatVersion:1,source,revision,helperBuild:{targetTriple:'x86_64-pc-windows-msvc',crt:'static',dllSearch:'System32 dependent imports'},directory:path.relative(root,directory).replaceAll('\\','/'),inputs,bundle:manifest,records};await writeFile(path.join(root,'.local/windows-package-build.json'),JSON.stringify(receipt,null,2)+'\n');console.log('Built exact release Full/Lite candidate archives.');
