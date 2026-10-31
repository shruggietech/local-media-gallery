// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {constants} from 'node:fs';
import {readdir,mkdir,lstat,copyFile,chmod} from 'node:fs/promises';
import path from 'node:path';

// Snapshot a completed, immutable private campaign tree. The receipt validator
// still binds every retained byte to the original transaction authority.
export async function copyEvidenceTree(source,destination){
 const relative=path.relative(path.resolve(source),path.resolve(destination));
 assert.ok(relative&&(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)),'Evidence destination must stay outside its source');
 const root=await lstat(source);assert.ok(root.isDirectory()&&!root.isSymbolicLink(),'Evidence source must be a physical directory');
 await mkdir(destination);const files=[];
 async function collect(from,to){
  for(const entry of await readdir(from,{withFileTypes:true})){
   const input=path.join(from,entry.name),output=path.join(to,entry.name);
   assert.ok(!entry.isSymbolicLink(),'Evidence source contains a link');
   if(entry.isDirectory()){await mkdir(output);await collect(input,output);}
   else{assert.ok(entry.isFile(),'Evidence source must contain regular files');files.push([input,output]);}
  }
 }
 await collect(source,destination);let cursor=0;
 const results=await Promise.allSettled(Array.from({length:Math.min(8,files.length)},async()=>{
  for(;;){const pair=files[cursor++];if(!pair)return;await copyFile(pair[0],pair[1],constants.COPYFILE_EXCL);if(process.platform!=='win32')await chmod(pair[1],(await lstat(pair[0])).mode&0o777);}
 }));
 for(const result of results)if(result.status==='rejected')throw result.reason;return files.length;
}
