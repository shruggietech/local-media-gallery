// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';import {digest,portablePath} from './windows-packages.mjs';
// Read the immutable legacy Rust embedded container without running the EXE.
export function publishedWindowsInputs(bytes){
 for(const prefix of ['{"files":[','{"format_version":1,"files":[']){
  let at=0;
  while((at=bytes.indexOf(Buffer.from(prefix),at))>=0){const begin=at;at+=prefix.length;if(begin<8)continue;const n=bytes.readBigUInt64LE(begin-8);if(n>16777216n||n<20n||begin+Number(n)>bytes.length)continue;let index;try{index=JSON.parse(bytes.subarray(begin,begin+Number(n)));}catch{continue;}
   if(index.format_version!==1||!Array.isArray(index.files)||!index.files.length)continue;
   assert.ok(index.files.length<=4096);let cursor=begin+Number(n);const found=new Map();
   for(const record of index.files){portablePath(record.path);assert.ok(!found.has(record.path.toLowerCase()));assert.match(record.bytes,/^(0|[1-9][0-9]*)$/);const size=Number(record.bytes);assert.ok(Number.isSafeInteger(size)&&size<=1073741824&&cursor+size<=bytes.length);const data=bytes.subarray(cursor,cursor+size);assert.equal(digest(data),record.sha256,record.path);found.set(record.path.toLowerCase(),{record,data});cursor+=size;}
   return found;
  }
 }
 throw Error('No verified legacy installer container was found');
}
