import {productVersion as version,packageProvenanceText} from './product-version.mjs';
import {writeLiteArtifact} from './single-file.mjs';
import {prepareFeatureHelper} from './prepare-feature-helper.mjs';
import {prepareMediaTool} from './prepare-media-tool.mjs';
// SPDX-License-Identifier: Apache-2.0
import {prepareCargoDependencies} from './cargo-readiness.mjs';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';requireIsolatedDesktop();
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {mkdir,mkdtemp,readFile,writeFile,copyFile,cp,rm,chmod} from 'node:fs/promises';import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {root,environment,execute,node,exportInterface} from './run.mjs';
import {writeUpdateDescriptor} from './update-packages.mjs';
import {sourceIdentity} from './provenance.mjs';import {collectPayload} from './proof.mjs';import {hash,validateMacPayload,macProductDistribution,macInstallerScript,validateMacProduct} from './macos-packages.mjs';
assert.equal(process.platform,'darwin');assert.equal(process.arch,'arm64');
const call=promisify(execFile);export async function capture(file,args,options={}){const p=call(file,args,{cwd:root,env:environment,shell:false,timeout:120000,maxBuffer:16*1024*1024,...options});p.child.stdin.end();return p;}
const source=await sourceIdentity(),revision=(await capture('git',['rev-parse','HEAD'])).stdout.trim();const generation=randomBytes(16).toString('hex');const directory=await mkdtemp(path.join(root,'.local/macos-packages-'));await execute('/usr/bin/swiftc',[path.join(root,'scripts/macos-package-ui.swift'),'-o',path.join(directory,'macos-package-ui')]);
await prepareCargoDependencies();await exportInterface();
await execute('cargo',['build','--locked','--release','-p','gallery-preparation']);
const featureHelper=await prepareFeatureHelper();
const binaries={};for(const edition of ['full','lite']){await execute('cargo',['build','--locked','--release','-p','local-media-gallery',...(edition==='lite'?['--features','lite']:[])],{env:{...environment,MACOSX_DEPLOYMENT_TARGET:'15.0'}});binaries[edition]=path.join(directory,edition+'-compiled');await copyFile(path.join(root,'target/release/local-media-gallery'),binaries[edition]);await chmod(binaries[edition],0o755)}
await node(path.join(root,'scripts/build-proof.mjs'),['--full',binaries.full,'--lite',binaries.lite,'--output',path.join(directory,'assembly.json')]);const assembly=JSON.parse(await readFile(path.join(directory,'assembly.json')));const records=[];
for(const edition of ['full','lite']){
 const seed=assembly.records.find(r=>r.edition===edition),bundle='Local Media Gallery '+(edition==='full'?'Full':'Lite')+'.app';const container=path.join(directory,edition);await mkdir(container);const app=path.join(container,bundle);await cp(path.join(root,seed.payloadDirectory,bundle),app,{recursive:true});const resources=path.join(app,'Contents/Resources');
 for(const file of ['LICENSE','NOTICE','licenses'])await cp(path.join(root,seed.payloadDirectory,file),path.join(resources,file),{recursive:true});
 if(edition==='full'){
  const helperBytes=await readFile(featureHelper.binary);assert.equal(hash(helperBytes),featureHelper.sha256);assert.equal(String(helperBytes.length),featureHelper.bytes);
  await copyFile(featureHelper.binary,path.join(app,'Contents/MacOS/ffmpeg'));await chmod(path.join(app,'Contents/MacOS/ffmpeg'),0o755);
  const {archive,...sourceProvenance}=featureHelper.source;
  await writeFile(path.join(app,'Contents/MacOS/feature-helper.json'),JSON.stringify({formatVersion:1,binary:'ffmpeg',sha256:featureHelper.sha256,bytes:featureHelper.bytes,version:featureHelper.version,source:sourceProvenance},null,2)+'\n');
  await mkdir(path.join(resources,'dependency-sources'),{recursive:true});await copyFile(archive,path.join(resources,'dependency-sources','ffmpeg-'+featureHelper.version+'.tar.xz'));
  await writeFile(path.join(resources,'dependency-sources','ffmpeg-build.json'),JSON.stringify(sourceProvenance,null,2)+'\n');
  await writeFile(path.join(resources,'feature-helper-notices.json'),JSON.stringify(featureHelper.notices,null,2)+'\n');
 }

 const instructions=`Local Media Gallery ${edition} ${version} macOS15 Apple Silicon. ${packageProvenanceText(version)}
Ordinary native application with embedded interface and SQLite, OS WKWebView/AppKit and native media facilities.
${edition==='full'?'Product download: one system-level .pkg. Open it with Installer and continue for install/update. Its Uninstall choice removes unchanged owned application files and command while retaining galleries, sidecars and user settings. All required redistributable feature dependencies, including FFmpeg video-thumbnail support, are inside this installer and selected automatically. No network download or separate helper/JSON operand is required. Internal diagnostic DMG/helper material is maintainer evidence, not another product download.':'Product download: one native executable. Set executable permission if the downloading client does not retain it, put it alongside the gallery and launch directly. Move that file and gallery together and Refresh after media changes. Full installation and developer tools are unnecessary. Optional video thumbnail generation can use a separately selected FFmpeg helper; ordinary browsing uses OS facilities.'}
Project signing and notarization are not performed. Ordinary compiler/linker loader metadata remains. Actual host assessments are recorded separately, without automatic quarantine removal.
`;

 await writeFile(path.join(resources,'PREREQUISITES.txt'),instructions);await writeFile(path.join(resources,'package-generation.txt'),generation+'\n');
 const binary=path.join(app,'Contents/MacOS/local-media-gallery');const loads=(await capture('/usr/bin/otool',['-l',binary])).stdout;assert.match(loads,/\bminos 15\.0\b/);const file=(await capture('/usr/bin/file',[binary])).stdout;assert.match(file,/arm64/);const identity=JSON.parse((await capture(binary,['--version','--json'])).stdout);assert.equal(identity.data.buildProfile,'release');assert.equal(identity.edition,edition);const plist=JSON.parse((await capture('/usr/bin/plutil',['-convert','json','-o','-',path.join(app,'Contents/Info.plist')])).stdout);assert.equal(plist.LSMinimumSystemVersion,'15.0');assert.equal(plist.CFBundleIdentifier,identity.data.bundleIdentifier);assert.equal(plist.CFBundleShortVersionString,identity.version);assert.equal(plist.CFBundleExecutable,'local-media-gallery');
 const payload={formatVersion:1,product:'local-media-gallery',kind:'macos-application-payload',version,edition,os:'macos',arch:'aarch64',targetTriple:'aarch64-apple-darwin',buildProfile:'release',generation,source,revision,bundle,binary:'Contents/MacOS/local-media-gallery',files:await collectPayload(app)};validateMacPayload(payload);const payloadFile=path.join(directory,edition+'-payload.json');await writeFile(payloadFile,JSON.stringify(payload,null,2)+'\n');
 await writeFile(path.join(container,'candidate.json'),JSON.stringify(payload,null,2)+'\n');await writeFile(path.join(container,'PREREQUISITES.txt'),instructions);
 {await execute('cargo',['build','--locked','--release','-p','gallery-macos-package','--bin','lmg-setup'],{env:{...environment,LMG_MACOS_PAYLOAD:payloadFile,MACOSX_DEPLOYMENT_TARGET:'15.0'}});await copyFile(path.join(root,'target/release/lmg-setup'),path.join(container,'lmg-setup'));await chmod(path.join(container,'lmg-setup'),0o755);}
 const files=await collectPayload(container);const archive=path.join(directory,`local-media-gallery-${version}-${edition}-aarch64-macos-candidate.${edition==='full'?'dmg':'zip'}`);
 if(edition==='full')await capture('/usr/bin/hdiutil',['create','-fs','HFS+','-volname','Local Media Gallery Full','-srcfolder',container,'-format','UDZO',archive]);else await capture('/usr/bin/ditto',['-c','-k','--norsrc','--noextattr',container,archive]);
 const bytes=await readFile(archive);records.push({edition,payload,archive:{path:path.relative(root,archive),bytes:String(bytes.length),sha256:hash(bytes),files},native:{identity,plist,machO:file,loadCommands:loads,signing:'Project signing/notarization not performed by policy',compilerLoaderMetadata:/\bLC_CODE_SIGNATURE\b/.test(loads)},footprints:{download:{bytes:String(bytes.length),basis:'Exact unpublished container logical bytes'},extracted:{bytes:files.reduce((n,f)=>n+BigInt(f.bytes),0n).toString(),basis:'All container file logical bytes'},application:{bytes:payload.files.reduce((n,f)=>n+BigInt(f.bytes),0n).toString(),basis:'Owned application logical bytes'},runtime:{bytes:null,basis:'OS-provided WKWebView is shared with macOS; complete attributable marginal runtime bytes unavailable'},optionalTools:edition==='full'?{bytes:featureHelper.bytes,basis:'Pinned self-contained FFmpeg binary; included in owned application inventory'}:{bytes:null,basis:'Lite uses a user-selected optional helper; none distributed'}}});
}

// Actual product downloads are distinct from diagnostic containers used by the legacy lifecycle campaign.
const fixtureTool=await prepareMediaTool(),featureFixture=path.join(directory,'bundled-feature-input.mp4');
await capture(fixtureTool.binary,['-nostdin','-hide_banner','-loglevel','error','-f','lavfi','-i','color=red:size=160x96:rate=5:duration=1','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',featureFixture]);
const featureFixtureBytes=await readFile(featureFixture),fixtureRecord={path:path.relative(root,featureFixture),sha256:hash(featureFixtureBytes),bytes:String(featureFixtureBytes.length)};
async function buildFullPkg(container,payload,output,tag){
  const packages=path.join(directory,tag+'-pkg-components'),installScripts=path.join(directory,tag+'-pkg-install-scripts'),removeScripts=path.join(directory,tag+'-pkg-remove-scripts');
  await mkdir(packages);await mkdir(installScripts);await mkdir(removeScripts);
  await cp(path.join(container,payload.bundle),path.join(installScripts,payload.bundle),{recursive:true});
  for(const scriptDir of [installScripts,removeScripts])await copyFile(path.join(container,'lmg-setup'),path.join(scriptDir,'lmg-setup'));
  for(const [scriptDir,operation]of [[installScripts,'managed-install'],[removeScripts,'managed-remove']]){
   await chmod(path.join(scriptDir,'lmg-setup'),0o755);
   await writeFile(path.join(scriptDir,'postinstall'),macInstallerScript(operation));await chmod(path.join(scriptDir,'postinstall'),0o755);
  }
  for(const [name,scriptDir] of [['install',installScripts],['remove',removeScripts]])await capture('/usr/bin/pkgbuild',['--nopayload','--scripts',scriptDir,'--identifier','tech.shruggie.local-media-gallery.full.'+name,'--version',version,path.join(packages,name+'.pkg')]);
  const distribution=path.join(directory,tag+'-Distribution.xml');await writeFile(distribution,macProductDistribution(version,payload.files.reduce((n,f)=>n+BigInt(f.bytes),0n)));
  await capture('/usr/bin/productbuild',['--distribution',distribution,'--package-path',packages,output]);
  const bytes=await readFile(output),file={path:path.basename(output),bytes:String(bytes.length),sha256:hash(bytes),mode:'644'};
  return {path:path.relative(root,output),bytes:file.bytes,sha256:file.sha256,format:'pkg',binary:file.path,files:[file]};
}
const products=[];
for(const record of records){
 const edition=record.edition,output=path.join(directory,`local-media-gallery-${version}-${edition}-aarch64-macos${edition==='full'?'.pkg':''}`);
 if(edition==='lite'){
  record.artifact=await writeLiteArtifact({binary:binaries.lite,output,metadata:{version,edition,os:'macos',arch:'aarch64',generation,source,revision,prerequisites:['macOS15 Apple Silicon','OS WKWebView and AppKit','OS media codecs','Executable permission for direct launch']},noticesDirectory:path.join(root,assembly.records.find(r=>r.edition==='lite').payloadDirectory,'licenses/dependencies')});
 }else{
  record.artifact=await buildFullPkg(path.join(directory,'full'),record.payload,output,'product');
  record.dependencies={facilities:['macOS15 arm64','AppKit','WKWebView','system media codecs'],bundled:[{feature:'video thumbnails',binary:'Contents/MacOS/ffmpeg',sha256:featureHelper.sha256,bytes:featureHelper.bytes,source:{url:featureHelper.source.url,sha256:featureHelper.source.sha256,configuration:featureHelper.source.configuration}}],networkRequired:false};
 }
 validateMacProduct(record.artifact,edition);
 products.push({edition,artifact:record.artifact,...(record.dependencies?{dependencies:record.dependencies}:{})});
}

const upgrades={formatVersion:1,pairs:[]};
for(const record of records){
 const edition=record.edition,container=path.join(directory,edition),nextContainer=path.join(directory,'replacement-'+edition);await cp(container,nextContainer,{recursive:true});const app=path.join(nextContainer,record.payload.bundle),nextGeneration=randomBytes(16).toString('hex');await writeFile(path.join(app,'Contents/Resources/package-generation.txt'),nextGeneration+'\n');const payload={...record.payload,generation:nextGeneration,files:await collectPayload(app)};validateMacPayload(payload);const payloadFile=path.join(directory,edition+'-replacement-payload.json');await writeFile(payloadFile,JSON.stringify(payload,null,2)+'\n');await writeFile(path.join(nextContainer,'candidate.json'),JSON.stringify(payload,null,2)+'\n');await execute('cargo',['build','--locked','--release','-p','gallery-macos-package','--bin','lmg-setup'],{env:{...environment,LMG_MACOS_PAYLOAD:payloadFile,MACOSX_DEPLOYMENT_TARGET:'15.0'}});await copyFile(path.join(root,'target/release/lmg-setup'),path.join(nextContainer,'lmg-setup'));await chmod(path.join(nextContainer,'lmg-setup'),0o755);
 const from=await writeUpdateDescriptor(path.join(directory,edition+'-prior.update.json'),record.payload,record.payload.files);const to=await writeUpdateDescriptor(path.join(directory,edition+'-next.update.json'),payload,payload.files);
 const archive=path.join(directory,'replacement-'+edition+(edition==='full'?'.dmg':'.zip'));if(edition==='full')await capture('/usr/bin/hdiutil',['create','-fs','HFS+','-volname','Local Media Gallery Full Update','-srcfolder',nextContainer,'-format','UDZO',archive]);else await capture('/usr/bin/ditto',['-c','-k','--norsrc','--noextattr',nextContainer,archive]);const bytes=await readFile(archive);const pair={edition,from:{...from,path:path.relative(root,from.path)},to:{...to,path:path.relative(root,to.path)},source:path.relative(root,app),helper:path.relative(root,path.join(nextContainer,'lmg-setup')),priorManifest:path.relative(root,path.join(container,'candidate.json')),archive:{path:path.relative(root,archive),bytes:String(bytes.length),sha256:hash(bytes),files:await collectPayload(nextContainer)},applicationSha256:record.payload.files.find(f=>f.path===record.payload.binary).sha256};
 if(edition==='full'){const output=path.join(directory,'replacement-full-product.pkg');record.productUpgrade={artifact:await buildFullPkg(nextContainer,payload,output,'replacement'),payload};}
 if(edition==='full')for(const scope of ['user','system'])upgrades.pairs.push({...pair,scope});else upgrades.pairs.push(pair);
}

assert.deepEqual(await sourceIdentity(),source);await writeFile(path.join(root,'.local/macos-package-build.json'),JSON.stringify({formatVersion:1,generation,source,revision,directory:path.relative(root,directory),products,featureFixture:fixtureRecord,observer:path.relative(root,path.join(directory,'macos-package-ui')),upgrades,records},null,2)+'\n');console.log('Built ordinary macOS Full/Lite candidates.');
