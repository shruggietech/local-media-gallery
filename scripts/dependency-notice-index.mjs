// SPDX-License-Identifier: Apache-2.0
// Lossless indexed dependency notices with original paths, text, lengths and hashes.
import assert from 'node:assert/strict';
import {readFile,writeFile,rm,chmod} from 'node:fs/promises';
import path from 'node:path';
import {collectPayload,hash} from './proof.mjs';

export function decodeDependencyNotices(bytes){
 const bundle=JSON.parse(bytes);assert.equal(bundle.kind,'dependency-notices');assert.equal(bundle.formatVersion,1);assert.ok(bundle.files.length>0);
 const paths=new Set();for(const file of bundle.files){assert.ok(typeof file.path==='string'&&file.path.split('/').every(p=>p&&p!=='.'&&p!=='..')&&!/[\\:\x00-\x1f]/.test(file.path));assert.ok(!paths.has(file.path.toLowerCase()));paths.add(file.path.toLowerCase());assert.equal(typeof file.text,'string');const data=Buffer.from(file.text,'utf8');assert.equal(String(data.length),file.bytes);assert.equal(hash(data),file.sha256);}
 return bundle;
}
export async function consolidateDependencyNotices(payload){
 const source=path.resolve(payload,'licenses/dependencies');assert.equal(path.relative(path.resolve(payload),source),path.join('licenses','dependencies'));
 const inventory=await collectPayload(source),files=[];assert.ok(inventory.length>0);
 for(const file of inventory){const bytes=await readFile(path.join(source,file.path));const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);assert.ok(Buffer.from(text,'utf8').equals(bytes),'Notice encoding must preserve complete original bytes');files.push({...file,text});}
 const output=path.join(payload,'licenses/dependencies.json'),bytes=Buffer.from(JSON.stringify({kind:'dependency-notices',formatVersion:1,files})+'\n');
 await writeFile(output,bytes,{flag:'wx',mode:0o644});await chmod(output,0o644);const restored=decodeDependencyNotices(await readFile(output));assert.deepEqual(restored.files.map(({text,...record})=>record),inventory);
 // Only the exact freshly copied payload subtree is removed after lossless readback.
 await rm(source,{recursive:true});
 return{path:'licenses/dependencies.json',files:inventory.length,sha256:hash(bytes),inventorySha256:hash(JSON.stringify(inventory))};
}
