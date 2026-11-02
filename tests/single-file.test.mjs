// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {encodeSingleFile,decodeSingleFile,writeLiteArtifact} from '../scripts/single-file.mjs';

const metadata={version:'0.2.0',edition:'lite',os:'linux',arch:'x86_64',generation:'unit-test',source:{sha256:'a'.repeat(64),files:1},revision:'b'.repeat(40),notices:[{path:'NOTICE',text:'Application notice\n'}],prerequisites:['Declared host runtime']};
const elf=Buffer.concat([Buffer.from([0x7f,0x45,0x4c,0x46,2,1]),Buffer.alloc(58)]);
elf.writeUInt16LE(62,18);
test('single-file metadata binds executable and preserves native bytes',()=>{
 const file=encodeSingleFile(elf,{...metadata,source:{...metadata.source,exclusions:['specs/internal-evidence.md']}}),read=decodeSingleFile(file);
 assert.deepEqual(read.executable,elf);assert.equal(read.metadata.version,'0.2.0');assert.equal(read.metadata.notices[0].text,'Application notice\n');assert.equal(read.metadata.os,'linux');
 assert.deepEqual(read.metadata.source,metadata.source,'Public embedded source contract excludes private tracking/exclusion paths');
});
test('single-file decoder rejects corruption, truncation and platform mismatch',()=>{
 const file=encodeSingleFile(elf,metadata);for(const index of [10,64,file.length-1]){const bad=Buffer.from(file);bad[index]^=1;assert.throws(()=>decodeSingleFile(bad));}
 assert.throws(()=>decodeSingleFile(file.subarray(0,-1)));assert.throws(()=>encodeSingleFile(elf,{...metadata,os:'windows'}));assert.throws(()=>encodeSingleFile(file,metadata),'Nested executable metadata refused');
 assert.throws(()=>encodeSingleFile(elf,{...metadata,arch:'aarch64'}));
 assert.throws(()=>encodeSingleFile(elf,{...metadata,notices:[{path:'../NOTICE',text:'wrong'}]}));
});
test('direct Lite artifact inventory describes only final downloaded file',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'lmg-single-file-'));try{const binary=path.join(dir,'compiled'),output=path.join(dir,'local-media-gallery-0.2.0-lite-x86_64-linux');await writeFile(binary,elf);const a=await writeLiteArtifact({binary,output,metadata});assert.equal(a.format,'elf');assert.equal(a.files.length,1);assert.equal(a.files[0].path,path.basename(output));assert.equal(a.files[0].sha256,a.sha256);assert.equal(a.bytes,String((await readFile(output)).length));}finally{await rm(dir,{recursive:true,force:true});}
});
