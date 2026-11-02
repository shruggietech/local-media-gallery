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
 const names=['containers','user lifecycle','system lifecycle','collisions and retention','Lite in place','Lite explicit','Lite relocation Refresh','quarantine disposition'];for(const name of names)assert.ok(result.checks.some(c=>c.name===name&&c.result==='pass'),'Missing native case '+name);
 for(const r of build.records){validateMacPayload(r.payload);const b=await readFile(path.join(root,r.archive.path));assert.equal(hash(b),r.archive.sha256);assert.equal(String(b.length),r.archive.bytes);assert.equal(r.footprints.download.bytes,r.archive.bytes);assert.equal(r.footprints.runtime.bytes,null);assert.ok(r.footprints.runtime.basis.length>0);assert.equal(BigInt(r.footprints.application.bytes),r.payload.files.reduce((s,e)=>s+BigInt(e.bytes),0n));}
 assert.ok(result.native.length>=4);for(const n of result.native){const p=build.records.find(r=>r.edition===n.edition).payload;assert.equal(n.binarySha256,p.files.find(f=>f.path===p.binary).sha256);assert.ok(n.pid>0);assert.ok(n.records.some(v=>v.name==='Open red.png'));assert.ok(n.frames.length>0);for(const f of n.frames){const b=await readFile(path.join(root,f.path));assert.equal(hash(b),f.sha256);assert.equal(String(b.length),f.bytes);assert.ok(f.pixels[f.color]>1500);}}
 assert.ok(result.native.some(n=>n.label==='relocated'&&n.frames.some(f=>f.color==='green')));assert.deepEqual(result.retained.before,result.retained.after);assert.equal(result.trust.quarantineApplied,true);assert.ok(Number.isInteger(result.trust.assessmentExit));return true;
}
export const verifyMacPayload=(directory,p)=>verifyPayload(directory,validateMacPayload(p).files);
