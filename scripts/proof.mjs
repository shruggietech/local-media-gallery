// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {lstat,readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Cargo path patches are third-party dependencies even though source is null.
export function thirdPartyPackages(metadata){
 assert.ok(Array.isArray(metadata.packages)&&Array.isArray(metadata.workspace_members),'Cargo package/workspace identities required');
 const owned=new Set(metadata.workspace_members);
 return metadata.packages.filter(pkg=>pkg.source||!owned.has(pkg.id));
}
export function payloadPath(value){
 assert.equal(typeof value,'string');assert.ok(value.length>0&&!value.includes('\\')&&!/[\x00-\x1f:]/.test(value));
 assert.ok(!path.posix.isAbsolute(value)&&value.split('/').every(p=>p!==''&&p!=='.'&&p!=='..'),'Unsafe proof payload path');return value;
}
export async function collectPayload(directory){
 const entries=[];
 async function visit(relative){
  const names=await readdir(path.join(directory,relative),{withFileTypes:true});
  for(const entry of names){const rel=payloadPath(relative?relative+'/'+entry.name:entry.name);const file=path.join(directory,...rel.split('/'));const info=await lstat(file);assert.equal(info.isSymbolicLink(),false,'Proof payload links are not permitted');
   if(info.isDirectory())await visit(rel);else {assert.ok(info.isFile(),'Proof payload must be regular files/directories');const bytes=await readFile(file);entries.push({path:rel,bytes:String(bytes.length),sha256:hash(bytes),mode:process.platform==='win32'?null:(info.mode&0o777).toString(8).padStart(3,'0')});}
  }
 }
 await visit('');return entries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
export async function verifyPayload(directory,entries){
 assert.ok(Array.isArray(entries)&&entries.length>0);for(const e of entries)payloadPath(e.path);assert.equal(new Set(entries.map(e=>e.path)).size,entries.length);
 const actual=await collectPayload(directory);assert.deepEqual(actual,entries,'Extracted proof payload inventory/hash/permissions mismatch');return actual;
}
function digest(v){assert.match(v,/^[a-f0-9]{64}$/);}
function size(v){assert.equal(typeof v,'string');assert.match(v,/^(0|[1-9][0-9]*)$/);return BigInt(v);}
export function validateProof(record){
 assert.equal(record.formatVersion,1);assert.equal(record.version,'0.0.0');assert.ok(['full','lite'].includes(record.edition));digest(record.source.sha256);assert.ok(Number.isInteger(record.source.files)&&record.source.files>0);assert.match(record.revision,/^[a-f0-9]{40}$/);
 digest(record.binary.sha256);size(record.binary.bytes);digest(record.archive.sha256);size(record.archive.bytes);assert.ok(record.payload.length>0);
 let total=0n;for(const file of record.payload){payloadPath(file.path);digest(file.sha256);total+=size(file.bytes);assert.ok(file.mode===null||/^[0-7]{3}$/.test(file.mode));}
 assert.equal(new Set(record.payload.map(e=>e.path)).size,record.payload.length);
 for(const name of ['archive','extracted','runtime','installer','optionalTools']){const value=record.footprints[name];assert.ok(value.basis?.length>0);assert.ok(['measured','unavailable','not-applicable'].includes(value.status));if(value.status==='measured')size(value.bytes);else assert.equal(value.bytes,null,'Unknown/inapplicable footprint is not measured zero');}
 assert.equal(record.footprints.archive.bytes,record.archive.bytes);assert.equal(BigInt(record.footprints.extracted.bytes),total);
 return record;
}
