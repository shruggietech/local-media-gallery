// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,copyFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyVendor} from '../scripts/check-vendor.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
test('Vendor inventory rejects changed, missing and additional source bytes',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'lmg-vendor-'));
 try{const bytes=Buffer.from('trusted source\n');await writeFile(path.join(directory,'source.rs'),bytes);const manifest={files:[{path:'source.rs',bytes:bytes.length,sha256:sha(bytes)}]};await verifyVendor(directory,manifest);await writeFile(path.join(directory,'source.rs'),'changed\n');await assert.rejects(verifyVendor(directory,manifest),/Vendor (bytes|digest)/);await writeFile(path.join(directory,'source.rs'),bytes);await writeFile(path.join(directory,'extra.rs'),'extra');await assert.rejects(verifyVendor(directory,manifest),/Vendor inventory/);await rm(path.join(directory,'extra.rs'));await rm(path.join(directory,'source.rs'));await assert.rejects(verifyVendor(directory,manifest),/Vendor inventory/);}finally{await rm(directory,{recursive:true,force:true});}
});
test('Vendor inventory rejects traversal, duplicate and incomplete hash entries',async()=>{
 for(const files of [[{path:'../outside',bytes:0,sha256:'0'.repeat(64)}],[{path:'a',bytes:0,sha256:'bad'}],[{path:'a',bytes:0,sha256:'0'.repeat(64)},{path:'a',bytes:0,sha256:'0'.repeat(64)}]])await assert.rejects(verifyVendor('.', {files}),/Invalid vendor/);
});
