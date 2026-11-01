// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {validateProductVersion,readProductVersion,packageProvenanceText} from '../scripts/product-version.mjs';
test('Native product versions preserve the elected numeric-triplet domain',()=>{
 for(const version of ['0.0.0','1.2.3','255.255.65535'])assert.equal(validateProductVersion(version,{windows:true}),version);
 for(const version of ['','v1.2.3','01.2.3','1.2','1.2.3.4','1.2.3-rc.1','1.2.3+build','1.2.3\n','../1.2.3'])assert.throws(()=>validateProductVersion(version),/version/i);
 for(const version of ['256.1.1','1.256.1','1.1.65536'])assert.throws(()=>validateProductVersion(version,{windows:true}),/MSI/);
 assert.equal(validateProductVersion('256.1.1'),'256.1.1');
});
test('VERSION authority refuses mixed package/workspace/native identities',async()=>{
 const base=await mkdtemp(path.join(os.tmpdir(),'lmg-version-'));
 try{
  await mkdir(path.join(base,'apps/gallery/src-tauri'),{recursive:true});
  await writeFile(path.join(base,'VERSION'),'1.2.3\n');await writeFile(path.join(base,'package.json'),JSON.stringify({version:'1.2.3'}));
  await writeFile(path.join(base,'Cargo.toml'),'[workspace.package]\nversion = "1.2.3"\n');
  await writeFile(path.join(base,'apps/gallery/src-tauri/tauri.conf.json'),JSON.stringify({version:'1.2.3'}));
  assert.equal(await readProductVersion(base),'1.2.3');
  await writeFile(path.join(base,'package.json'),JSON.stringify({version:'1.2.4'}));await assert.rejects(readProductVersion(base),/package.*version/i);
  await writeFile(path.join(base,'package.json'),JSON.stringify({version:'1.2.3'}));await writeFile(path.join(base,'apps/gallery/src-tauri/tauri.conf.json'),JSON.stringify({version:'1.2.4'}));await assert.rejects(readProductVersion(base),/native.*version/i);
 }finally{await rm(base,{recursive:true,force:true});}
});
test('Package prose keeps baseline truthful without embedding later publication state',()=>{
 assert.match(packageProvenanceText('0.0.0'),/unreleased specification baseline/);
 const future=packageProvenanceText('1.2.3');assert.match(future,/verified release record/);assert.doesNotMatch(future,/is published|not a GitHub release|unpublished candidate/);
});

import {readProductSchema} from '../scripts/product-version.mjs';
test('Current native consumers select the elected schema without falling back to the baseline',async t=>{
 const base=await mkdtemp(path.join(os.tmpdir(),'lmg-schema-version-'));t.after(()=>rm(base,{recursive:true,force:true}));const directory=path.join(base,'schemas/v1.2.3');await mkdir(directory,{recursive:true});const file=path.join(directory,'local-media-gallery.schema.json');const schema={$id:'urn:local-media-gallery:1.2.3','x-release-version':'1.2.3',properties:{version:{const:'1.2.3'}}};await writeFile(file,JSON.stringify(schema));assert.deepEqual(await readProductSchema({base,version:'1.2.3'}),schema);await assert.rejects(readProductSchema({base,version:'1.2.4'}),/ENOENT/);schema.$id='urn:local-media-gallery:0.0.0';await writeFile(file,JSON.stringify(schema));await assert.rejects(readProductSchema({base,version:'1.2.3'}),/schema identity/i);
});
