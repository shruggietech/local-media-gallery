import {readSingleFile} from './single-file.mjs';
import {validatePreparedRecipient} from './prepared-recipients.mjs';
import {validateProductVersion,productVersion} from './product-version.mjs';
// SPDX-License-Identifier: Apache-2.0
import {validateUpdateEvidence} from './update-packages.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {hash,payloadPath,verifyPayload} from './proof.mjs';
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
 assert.ok(['managed-install','managed-remove'].includes(operation));
 return '#!/bin/sh\nset -eu\ncd "$(/usr/bin/dirname "$0")"\nexec ./lmg-setup '+operation+'\n';
}
export function macProductDistribution(version,installedBytes=0n){
 assert.match(version,/^\d+\.\d+\.\d+$/);assert.ok(typeof installedBytes==='bigint'&&installedBytes>=0n);
 return `<?xml version="1.0" encoding="UTF-8"?>
<installer-gui-script minSpecVersion="2"><title>Local Media Gallery Full ${version}</title>
<domains enable_anywhere="false" enable_currentUserHome="false" enable_localSystem="true"/>
<options customize="allow" require-scripts="true" rootVolumeOnly="true"/>
<volume-check script="true"><allowed-os-versions><os-version min="15.0"/></allowed-os-versions></volume-check>
<choices-outline><line choice="install"/><line choice="remove"/></choices-outline>
<choice id="install" title="Install or update Local Media Gallery Full" description="Install the bundled application, video-thumbnail helper and system integration offline." visible="false" enabled="false" selected="!choices.remove.selected"><pkg-ref id="tech.shruggie.local-media-gallery.full.install"/></choice>
<choice id="remove" title="Uninstall Local Media Gallery Full (retain media and user settings)" description="Remove unchanged owned application files and command, retaining galleries and user data." start_selected="false"><pkg-ref id="tech.shruggie.local-media-gallery.full.remove"/></choice>
<pkg-ref id="tech.shruggie.local-media-gallery.full.install" version="${version}" installKBytes="${(installedBytes+1023n)/1024n}">install.pkg</pkg-ref>
<pkg-ref id="tech.shruggie.local-media-gallery.full.remove" version="${version}">remove.pkg</pkg-ref>
</installer-gui-script>\n`;
}
export function validateMacProduct(artifact,edition){
 assert.ok(['full','lite'].includes(edition));assert.equal(artifact.format,edition==='full'?'pkg':'mach-o');assert.ok(Array.isArray(artifact.files)&&artifact.files.length===1,'Exactly one delivered product file');
 const file=artifact.files[0];assert.equal(file.path,path.basename(artifact.path));assert.equal(file.bytes,artifact.bytes);assert.equal(file.sha256,artifact.sha256);assert.equal(artifact.binary,file.path);assert.match(file.sha256,/^[a-f0-9]{64}$/);assert.match(file.bytes,/^[1-9][0-9]*$/);assert.equal(file.mode,edition==='full'?'644':'755');return artifact;
}
