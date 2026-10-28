// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {digest,validatePayload} from './windows-packages.mjs';
export async function validatePackageEvidence(build,result,root){
 assert.equal(result.result,'pass');assert.equal(result.acceptance,true);assert.equal(result.formatVersion,1);assert.deepEqual(result.source,build.source);assert.equal(result.revision,build.revision);assert.ok(new Date(result.terminalFinished)>=new Date(result.started));assert.equal(result.host.platform,'win32');assert.equal(result.host.arch,'x64');
 assert.deepEqual(result.installations.map(i=>i.scope),['user','machine']);assert.deepEqual(result.native.map(i=>i.label),['user-full','machine-full','lite-in-place','lite-relocated','lite-explicit']);
 assert.equal(result.checks.length,26);assert.ok(result.checks.every(c=>c.result==='pass'&&c.terminalFinished));
 for(const edition of ['full','lite']){
  const record=build.records.find(r=>r.edition===edition);validatePayload(record.payload);assert.deepEqual(record.payload.source,build.source);assert.equal(record.payload.revision,build.revision);assert.deepEqual(result.extracted[edition],record.archive);
  const bytes=await readFile(path.join(root,record.archive.path));assert.equal(digest(bytes),record.archive.sha256);assert.equal(String(bytes.length),record.archive.bytes);
  for(const native of result.native.filter(n=>n.edition===edition)){assert.equal(native.binarySha256,record.payload.files.find(f=>f.path===record.payload.binary).sha256);assert.ok(native.accessibility.some(n=>n.name==='Open red.png'));assert.ok(native.pixels.red>1500);assert.equal(native.pixels.stride,4);const screenshot=await readFile(path.join(root,native.screenshot));assert.equal(digest(screenshot),native.screenshotSha256);assert.equal(String(screenshot.length),native.screenshotBytes);assert.ok(screenshot.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));if(native.label==='lite-relocated'){assert.ok(native.refreshedPixels.green>1500);const bytes=await readFile(path.join(root,native.refreshScreenshot.path));assert.equal(digest(bytes),native.refreshScreenshot.sha256);assert.equal(String(bytes.length),native.refreshScreenshot.bytes);}}
 }
 for(const install of result.installations){const pkg=build.bundle.packages.find(p=>p.scope===install.scope);assert.equal(install.observed.registered.package.toUpperCase(),pkg.packageCode);assert.equal(install.observed.integration.product,pkg.productCode);assert.equal(install.removed.observed.registered,null);assert.equal(install.removed.observed.integration,null);assert.ok(install.removed.retained.length>0);assert.match(install.installedBytes,/^[1-9][0-9]*$/);}
 assert.equal(build.bundle.bootstrapper.audit.signature.status,'Valid');assert.match(build.bundle.bootstrapper.audit.signature.subject,/Microsoft Corporation/);return true;
}
