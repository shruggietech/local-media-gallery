// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,readdir,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function verifyVendor(directory,manifest){
 assert.ok(Array.isArray(manifest.files)&&manifest.files.length>0,'Invalid vendor inventory');
 const expected=new Map();
 for(const entry of manifest.files){
  assert.ok(typeof entry.path==='string'&&entry.path.split('/').every(p=>p&&p!=='.'&&p!=='..'&&!/[\\:\x00-\x1f]/.test(p))&&!expected.has(entry.path)&&Number.isSafeInteger(entry.bytes)&&entry.bytes>=0&&/^[a-f0-9]{64}$/.test(entry.sha256),'Invalid vendor entry');expected.set(entry.path,entry);
 }
 const actual=[];
 async function walk(relative=''){
  for(const entry of await readdir(path.join(directory,relative),{withFileTypes:true})){
   const name=relative?relative+'/'+entry.name:entry.name;const target=path.join(directory,name);
   assert.ok(!(await lstat(target)).isSymbolicLink(),'Vendor link '+name);
   if(entry.isDirectory())await walk(name);else{assert.ok(entry.isFile(),'Vendor file type '+name);actual.push(name);}
  }
 }
 await walk();assert.deepEqual(actual.sort(),[...expected.keys()].sort(),'Vendor inventory disagreement');
 for(const name of actual){const bytes=await readFile(path.join(directory,name)),entry=expected.get(name);assert.equal(bytes.length,entry.bytes,'Vendor bytes '+name);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,'Vendor digest '+name);}
 return actual.length;
}
export async function checkGlibVendor(){
 const manifest=JSON.parse(await readFile(path.join(root,'vendor/glib-0.18.5.provenance.json'),'utf8'));
 assert.equal(manifest.archiveSha256,'233daaf6e83ae6a12a52055f568f9d7cf4671dabb78ff9560ab6da230ce00ee5');assert.equal(manifest.fixCommit,'b5a4071e439bef2b5eea76c3aa25e5ae84839e34');
 assert.equal(manifest.patch.sha256,'a0f5ee8acb8faa089bcdfbc9a57372609fce7654026ccef7d9a224d05a654ccc');
 assert.equal(manifest.files.find(e=>e.path===manifest.patch.path)?.sha256,manifest.patch.sha256);
 for(const license of ['LICENSE','COPYRIGHT'])assert.ok(manifest.files.some(e=>e.path===license));
 return verifyVendor(path.join(root,'vendor/glib-0.18.5'),manifest);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log('Verified '+await checkGlibVendor()+' provenance-bound GLib source files.');
