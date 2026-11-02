import {parseReleaseRecord,releaseHash} from './release-record.mjs';
import {readSingleFile} from './single-file.mjs';
import {validatePreparedRecipient} from './prepared-recipients.mjs';
import {validateProductVersion,productVersion} from './product-version.mjs';
// SPDX-License-Identifier: Apache-2.0
import {validateUpdateEvidence} from './update-packages.mjs';
import assert from 'node:assert/strict';
import {readFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {hash,payloadPath,verifyPayload,collectPayload} from './proof.mjs';
export {hash};
export function validateMacPayload(p){
 assert.equal(p.formatVersion,1);assert.equal(p.product,'local-media-gallery');assert.equal(p.kind,'macos-application-payload');validateProductVersion(p.version);assert.ok(['full','lite'].includes(p.edition));assert.equal(p.os,'macos');assert.equal(p.arch,'aarch64');assert.equal(p.targetTriple,'aarch64-apple-darwin');assert.equal(p.buildProfile,'release');assert.match(p.generation,/^[a-f0-9]{32}$/);assert.match(p.source.sha256,/^[a-f0-9]{64}$/);assert.match(p.revision,/^[a-f0-9]{40}$/);
 payloadPath(p.bundle);assert.equal(p.bundle.includes('/'),false);assert.ok(p.bundle.endsWith('.app'));assert.equal(p.binary,'Contents/MacOS/local-media-gallery');assert.ok(p.files.length>0);assert.equal(new Set(p.files.map(f=>f.path)).size,p.files.length);
 for(const f of p.files){payloadPath(f.path);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.bytes,/^(0|[1-9][0-9]*)$/);assert.ok(['644','755'].includes(f.mode));}
 for(const f of [p.binary,'Contents/Info.plist'])assert.ok(p.files.some(e=>e.path===f));assert.equal(p.files.find(e=>e.path===p.binary).mode,'755');return p;
}
export async function validateMacEvidence(build,result,root){
 if(!['0.0.0','0.1.0'].includes(build.records[0].payload.version)){assert.ok(result.preparedRecipient,'Prepared published recipient evidence required');assert.deepEqual(result.preparedRecipient.source,result.source);assert.equal(result.preparedRecipient.revision,result.revision);await validatePreparedRecipient(result.preparedRecipient,root);}

 await validateUpdateEvidence(build,result.updates,root);assert.deepEqual(result.source,build.source);assert.equal(result.revision,build.revision);assert.equal(result.result,'pass');assert.deepEqual(result.host.os,'darwin');assert.equal(result.host.arch,'arm64');
 if(build.products){
  await validatePublishedMacPredecessor(build,result,root);
  assert.equal(build.products.length,2);assert.equal(new Set(build.products.map(p=>p.edition)).size,2);assert.equal(result.productChecks?.length,2,'Literal product acceptance required');
  for(const product of build.products){const artifact=validateMacProduct(product.artifact,product.edition),record=build.records.find(r=>r.edition===product.edition);assert.deepEqual(record.artifact,artifact);const bytes=await readFile(path.join(root,artifact.path));assert.equal(hash(bytes),artifact.sha256);assert.equal(String(bytes.length),artifact.bytes);assert.equal(path.basename(artifact.path).includes('candidate'),false);const receipt=result.productChecks.find(r=>r.edition===product.edition);assert.equal(receipt.result,'pass');assert.deepEqual(receipt.artifact,artifact);
   if(product.edition==='lite'){const decoded=await readSingleFile(path.join(root,artifact.path));assert.deepEqual(decoded.metadata.source,{sha256:build.source.sha256,files:build.source.files});assert.equal(decoded.metadata.revision,build.revision);assert.equal(decoded.metadata.executableSha256,record.payload.files.find(f=>f.path===record.payload.binary).sha256);assert.deepEqual(receipt.distributionFiles,artifact.files);assert.deepEqual(receipt.maintenance.map(r=>r.status),['complete','already-current','restored']);assert.equal(receipt.foreignRefusal,'preserved exact foreign target bytes');for(const label of ['single-executable-in-place','single-executable-updated','single-executable-relocated'])assert.ok(result.native.some(n=>n.delivery==='single-file'&&n.label===label));}
   else{assert.equal(bytes.subarray(0,4).toString('ascii'),'xar!');assert.match(receipt.network.rules,/block drop out/);assert.equal(receipt.prerequisites.externalFFmpeg,null);assert.ok(receipt.video.provider.startsWith('ffmpeg:'));assert.deepEqual(receipt.installerResults.map(r=>r.operation),['install','upgrade','rollback','repeat','uninstall']);const initial=receipt.installerResults.find(r=>r.operation==='install').freshInterruption;assert.equal(initial.result,'interrupted');assert.equal(initial.phase,'install-intent-with-partial-app');assert.equal(initial.liveAuthority.result,'refused');assert.equal(initial.helperSha256,record.installerHelperSha256);assert.notEqual(initial.installerExit,0);const upgrade=receipt.installerResults.find(r=>r.operation==='upgrade');assert.equal(upgrade.interrupted.result,'interrupted');assert.ok(['prepared','applying','activated'].includes(upgrade.interrupted.phase));assert.equal(upgrade.interrupted.liveAuthority.result,'refused');assert.notEqual(upgrade.interrupted.installerExit,0);assert.equal(upgrade.interrupted.helperSha256,record.productUpgrade.helperSha256);assert.ok(result.native.some(n=>n.label==='single-pkg-offline'));assert.ok(record.dependencies.bundled.some(d=>d.feature==='video thumbnails'));}
  }
 }
 const names=['containers','user lifecycle','system lifecycle','collisions and retention','Lite in place','Lite explicit','Lite relocation Refresh','quarantine disposition'];for(const name of names)assert.ok(result.checks.some(c=>c.name===name&&c.result==='pass'),'Missing native case '+name);
 for(const r of build.records){validateMacPayload(r.payload);const b=await readFile(path.join(root,r.archive.path));assert.equal(hash(b),r.archive.sha256);assert.equal(String(b.length),r.archive.bytes);assert.equal(r.footprints.download.bytes,r.archive.bytes);assert.equal(r.footprints.runtime.bytes,null);assert.ok(r.footprints.runtime.basis.length>0);assert.equal(BigInt(r.footprints.application.bytes),r.payload.files.reduce((s,e)=>s+BigInt(e.bytes),0n));}
 assert.ok(result.native.length>=4);for(const n of result.native){const p=build.records.find(r=>r.edition===n.edition).payload;assert.equal(n.binarySha256,n.delivery==='single-file'?(n.label==='single-executable-updated'?build.records.find(r=>r.edition===n.edition).singleFileUpgrade.sha256:build.records.find(r=>r.edition===n.edition).artifact.sha256):p.files.find(f=>f.path===p.binary).sha256);assert.ok(n.pid>0);assert.ok(n.records.some(v=>v.name==='Open red.png'));assert.ok(n.frames.length>0);for(const f of n.frames){const b=await readFile(path.join(root,f.path));assert.equal(hash(b),f.sha256);assert.equal(String(b.length),f.bytes);assert.ok(f.pixels[f.color]>1500);}}
 assert.ok(result.native.some(n=>n.label==='relocated'&&n.frames.some(f=>f.color==='green')));assert.deepEqual(result.retained.before,result.retained.after);assert.equal(result.trust.quarantineApplied,true);assert.ok(Number.isInteger(result.trust.assessmentExit));return true;
}
export const verifyMacPayload=(directory,p)=>verifyPayload(directory,validateMacPayload(p).files);

export function macInstallerScript(operation){
 assert.ok(['managed-install','managed-remove','managed-rollback'].includes(operation));
 return '#!/bin/sh\nset -eu\ncd "$(/usr/bin/dirname "$0")"\nexec ./lmg-setup '+operation+'\n';
}
export function macProductDistribution(version,installedBytes=0n){
 assert.match(version,/^\d+\.\d+\.\d+$/);assert.ok(typeof installedBytes==='bigint'&&installedBytes>=0n);
 return `<?xml version="1.0" encoding="UTF-8"?>
<installer-gui-script minSpecVersion="2"><title>Local Media Gallery Full ${version}</title>
<domains enable_anywhere="false" enable_currentUserHome="false" enable_localSystem="true"/>
<options customize="allow" require-scripts="true" rootVolumeOnly="true"/>
<volume-check script="true"><allowed-os-versions><os-version min="15.0"/></allowed-os-versions></volume-check>
<choices-outline><line choice="install"/><line choice="remove"/><line choice="rollback"/></choices-outline>
<choice id="install" title="Install or update Local Media Gallery Full" description="Install the bundled application, video-thumbnail helper and system integration offline." visible="false" enabled="false" selected="!(choices.remove.selected || choices.rollback.selected)"><pkg-ref id="tech.shruggie.local-media-gallery.full.install"/></choice>
<choice id="remove" title="Uninstall Local Media Gallery Full (retain media and user settings)" description="Remove unchanged owned application files and command, retaining galleries and user data." enabled="!choices.rollback.selected" start_selected="false"><pkg-ref id="tech.shruggie.local-media-gallery.full.remove"/></choice>
<choice id="rollback" title="Roll back to the prior owned application" description="Restore the verified predecessor retained by the last update, retaining media and user settings." enabled="!choices.remove.selected" start_selected="false"><pkg-ref id="tech.shruggie.local-media-gallery.full.rollback"/></choice>
<pkg-ref id="tech.shruggie.local-media-gallery.full.install" version="${version}" installKBytes="${(installedBytes+1023n)/1024n}">install.pkg</pkg-ref>
<pkg-ref id="tech.shruggie.local-media-gallery.full.remove" version="${version}">remove.pkg</pkg-ref>
<pkg-ref id="tech.shruggie.local-media-gallery.full.rollback" version="${version}">rollback.pkg</pkg-ref>
</installer-gui-script>\n`;
}
export function macMaintenanceChoices(operation){
 assert.ok(['install','remove','rollback'].includes(operation));
 return '<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><array>'+['remove','rollback','install'].map(id=>'<dict><key>choiceIdentifier</key><string>'+id+'</string><key>choiceAttribute</key><string>selected</string><key>attributeSetting</key><integer>'+(id===operation?'1':'0')+'</integer></dict>').join('')+'</array></plist>\n';
}
export function validateMacProduct(artifact,edition){
 assert.ok(['full','lite'].includes(edition));assert.equal(artifact.format,edition==='full'?'pkg':'mach-o');assert.ok(Array.isArray(artifact.files)&&artifact.files.length===1,'Exactly one delivered product file');
 const file=artifact.files[0];assert.equal(file.path,path.basename(artifact.path));assert.equal(file.bytes,artifact.bytes);assert.equal(file.sha256,artifact.sha256);assert.equal(artifact.binary,file.path);assert.match(file.sha256,/^[a-f0-9]{64}$/);assert.match(file.bytes,/^[1-9][0-9]*$/);assert.equal(file.mode,edition==='full'?'644':'755');return artifact;
}

// DMG filesystems may expose OS bookkeeping alongside the source-folder payload.
// Canonical release inventories bind these exact product roots, not volume metadata.
export async function macContainerInventory(directory,payload){
 validateMacPayload(payload);const files=(await collectPayload(path.join(directory,payload.bundle))).map(file=>({...file,path:payload.bundle+'/'+file.path}));
 for(const name of ['candidate.json','PREREQUISITES.txt','lmg-setup']){const file=path.join(directory,name),metadata=await lstat(file);assert.ok(metadata.isFile()&&!metadata.isSymbolicLink());const bytes=await readFile(file);files.push({path:name,bytes:String(bytes.length),sha256:hash(bytes),mode:(metadata.mode&0o777).toString(8).padStart(3,'0')});}
 return files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}

export async function validatePublishedMacPredecessor(build,result,root){
 const p=build.publishedPredecessor,r=result.publishedPredecessor;assert.ok(p&&r,'Actual published Full predecessor campaign required');assert.equal(r.result,'pass');assert.equal(r.version,'0.1.0');
 const canonical=await readFile(path.join(root,p.releaseRecord.path));assert.equal(hash(canonical),'079615f3ff8434b32c3c632190b544c6c32e17513fa125ec7e07f679a1c65f1f');assert.equal(p.releaseRecord.sha256,hash(canonical));assert.equal(r.canonicalReleaseSha256,hash(canonical));const release=parseReleaseRecord(canonical,{requirePublished:true});const artifact=release.artifacts.find(a=>a.role==='package'&&a.edition==='full'&&a.platform==='macos'&&a.architecture==='aarch64');assert.deepEqual(p.artifact,artifact);assert.deepEqual(r.artifact,artifact);assert.deepEqual(r.archive,p.archive);
 const archive=await readFile(path.join(root,p.archive.path));assert.equal(hash(archive),artifact.sha256);assert.equal(String(archive.length),artifact.bytes);assert.equal(p.archive.sha256,artifact.sha256);assert.equal(p.archive.bytes,artifact.bytes);
 assert.equal(p.inventory.length,artifact.inventory.files);assert.equal(releaseHash(p.inventory),artifact.inventory.sha256);assert.equal(p.inventory.reduce((n,f)=>n+BigInt(f.bytes),0n).toString(),artifact.inventory.bytes);
 const payloadBytes=await readFile(path.join(root,p.payloadRecord.path)),payload=validateMacPayload(JSON.parse(payloadBytes));assert.deepEqual(p.payload,payload);const payloadFile=p.inventory.find(f=>f.path==='candidate.json');assert.equal(hash(payloadBytes),payloadFile.sha256);assert.equal(String(payloadBytes.length),payloadFile.bytes);assert.equal(p.payloadRecord.sha256,payloadFile.sha256);assert.equal(payload.version,'0.1.0');assert.equal(payload.edition,'full');assert.equal(payload.source.sha256,release.source.sha256);assert.equal(payload.revision,release.source.revision);
 assert.deepEqual(p.inventory.filter(f=>f.path.startsWith(payload.bundle+'/')).map(f=>({...f,path:f.path.slice(payload.bundle.length+1)})),payload.files);assert.deepEqual(p.helper,p.inventory.find(f=>f.path==='lmg-setup'));const helperBytes=await readFile(path.join(root,p.helperRecord.path));assert.equal(hash(helperBytes),p.helper.sha256);assert.equal(String(helperBytes.length),p.helper.bytes);assert.equal(p.helperRecord.sha256,p.helper.sha256);assert.equal(p.native.version,'0.1.0');
 const current=build.records.find(record=>record.edition==='full');assert.deepEqual(r.identities.map(i=>i.label),['published-initial','current-upgraded','current-repeated','published-restored','current-reactivated','published-restored-again']);assert.equal(r.native.length,2);assert.deepEqual(r.native.map(n=>n.label),['published-0.1-initial','published-0.1-restored']);
 for(let index=0;index<6;index++){
  const expected=[1,2,4].includes(index)?current.payload:payload,identity=r.identities[index];assert.equal(identity.identity.version,expected.version);assert.equal(identity.identity.edition,'full');assert.equal(identity.identity.os,'macos');assert.equal(identity.identity.arch,'aarch64');assert.equal(identity.identity.data.buildProfile,'release');assert.equal(identity.binarySha256,expected.files.find(f=>f.path===expected.binary).sha256);assert.deepEqual(identity.inventory,expected.files);
  const receipt=[r.priorReceipt,r.upgradedReceipt,r.repeatedReceipt,r.restoredReceipt,r.reactivatedReceipt,r.restoredAgainReceipt][index],bytes=await readFile(path.join(root,receipt.path));assert.equal(hash(bytes),receipt.sha256);assert.equal(String(bytes.length),receipt.bytes);const installed=JSON.parse(bytes);assert.equal(installed.scope,'system');assert.equal(installed.directory,'/Applications/'+expected.bundle);assert.equal(installed.command,'/usr/local/bin/local-media-gallery');assert.deepEqual(installed.payload,expected);
 }
 for(const [record,operation] of [[r.repeat,'install'],[r.rollback,'rollback'],[r.reactivation,'install'],[r.secondRollback,'rollback'],[r.removal,'remove']]){
  const selection=record.selection;assert.equal(selection.operation,operation);const input=await readFile(path.join(root,selection.choices),'utf8');assert.equal(input,macMaintenanceChoices(operation));const resolved=await readFile(path.join(root,selection.resolved));assert.match(resolved.toString('utf8'),/<plist/);assert.equal(hash(resolved),selection.resolvedSha256);assert.deepEqual(JSON.parse(await readFile(path.join(root,selection.stateFile))),selection.state);for(const id of ['install','remove','rollback']){const state=selection.state.find(item=>item.choiceIdentifier===id&&item.choiceAttribute==='selected');assert.ok(state);assert.equal(Number(state.attributeSetting),id===operation?1:0);}
 }
 assert.deepEqual(r.removal.remainder.entries,[]);assert.deepEqual(JSON.parse(await readFile(path.join(root,r.removal.remainder.path))).entries,[]);
 for(const native of r.native){assert.ok(native.pid>0);assert.equal(native.binarySha256,payload.files.find(f=>f.path===payload.binary).sha256);assert.ok(native.records.some(record=>record.name==='Open red.png'));assert.ok(native.frames.some(frame=>frame.color==='red'&&frame.pixels.red>1500));for(const frame of native.frames){const bytes=await readFile(path.join(root,frame.path));assert.equal(hash(bytes),frame.sha256);assert.equal(String(bytes.length),frame.bytes);}}
 assert.ok(result.native.some(n=>n.edition==='full'&&n.binarySha256===current.payload.files.find(f=>f.path===current.payload.binary).sha256),'Current Full GUI is covered by the independent product campaign');
 assert.deepEqual(r.profileSnapshots.map(p=>p.label),['before-upgrade','before-rollback']);for(const snapshot of r.profileSnapshots){assert.ok(snapshot.files.some(f=>f.path.endsWith('history.sqlite3')));for(const file of snapshot.files){const bytes=await readFile(path.join(root,file.evidence));assert.equal(hash(bytes),file.sha256);assert.equal(String(bytes.length),file.bytes);if(file.path==='settings.json')assert.equal(JSON.parse(bytes).version,'0.1.0');if(file.path.endsWith('history.sqlite3')){assert.equal(bytes.subarray(0,16).toString('ascii'),'SQLite format 3\0');assert.equal(bytes.readUInt32BE(60),1,'Published-compatible actual history schema');assert.equal(bytes.readUInt32BE(68),0x4c4d4701,'Actual owned history database identity');}}}
 assert.deepEqual(r.profileSnapshots[0].files.map(({evidence,...file})=>file),r.profileSnapshots[1].files.map(({evidence,...file})=>file),'Actual old profile bytes remain unchanged across upgrade');
 assert.match(r.network.rules,/block drop out/);assert.equal(r.network.externalProbe,'blocked');assert.deepEqual(r.preservation,{upgrade:true,rollback:true,removal:true,media:true});assert.equal(r.upgrade.artifactSha256,current.artifact.sha256);assert.equal(r.rollback.artifactSha256,current.artifact.sha256);assert.equal(r.upgrade.operation,'ordinary copied PKG install');assert.equal(r.rollback.operation,'ordinary same PKG Roll back choice');return true;
}
