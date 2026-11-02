// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {withPreparedArchive} from '../scripts/prepared-recipients.mjs';
import {releaseHash} from '../scripts/release-record.mjs';
import {execute,python,root} from '../scripts/run.mjs';
for(const format of ['zip','tar.gz'])test('Prepared '+format+' retains and verifies executable modes across artifact transport',async t=>{
 const base=await mkdtemp(path.join(os.tmpdir(),'lmg-mode-packet-'));t.after(()=>rm(base,{recursive:true,force:true}));await mkdir(path.join(base,'.local'));const gallery=path.join(base,'gallery');await mkdir(gallery);const bytes=Buffer.from('fixture executable bytes');await writeFile(path.join(gallery,'program'),bytes);
 const files=[{path:'program',bytes:String(bytes.length),sha256:releaseHash(bytes),mode:'755'}],inventory=path.join(base,'inventory.json');await writeFile(inventory,JSON.stringify(files));const archive=path.join(base,'.local','prepared.'+format);await execute(python,[path.join(root,'scripts/proof-archive.py'),'create',archive,gallery,inventory]);const encoded=await readFile(archive);const record={path:'.local/prepared.'+format,bytes:String(encoded.length),sha256:releaseHash(encoded),files};
 await withPreparedArchive(record,base,async({base:decoded,files:actual})=>{assert.deepEqual(actual,files);assert.deepEqual(await readFile(path.join(decoded,'program')),bytes);});
 const wrongMode=structuredClone(record);wrongMode.files[0].mode='644';await assert.rejects(withPreparedArchive(wrongMode,base,()=>assert.fail('Wrong raw mode reached acceptance')),/exited/);
 const wrongDigest=structuredClone(record);wrongDigest.sha256='0'.repeat(64);await assert.rejects(withPreparedArchive(wrongDigest,base,()=>assert.fail('Changed archive reached acceptance')),/strictly equal/);
});
