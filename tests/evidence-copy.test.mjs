// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,symlink} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {copyEvidenceTree} from '../scripts/evidence-copy.mjs';

test('Evidence snapshot retains complete nested bytes and empty directories without overwriting',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'lmg-evidence-'));try{const source=path.join(root,'source'),destination=path.join(root,'snapshot');await mkdir(path.join(source,'nested 雪','empty'),{recursive:true});const files=Array.from({length:37},(_,i)=>[path.join('nested 雪',String(i)+'.bin'),Buffer.from([i,0,255,10])]);for(const [name,bytes]of files)await writeFile(path.join(source,name),bytes);await copyEvidenceTree(source,destination);for(const [name,bytes]of files)assert.deepEqual(await readFile(path.join(destination,name)),bytes);assert.deepEqual(await readdir(path.join(destination,'nested 雪','empty')),[]);await writeFile(path.join(destination,'foreign'),'retain');await assert.rejects(copyEvidenceTree(source,destination));assert.equal(await readFile(path.join(destination,'foreign'),'utf8'),'retain');}finally{await rm(root,{recursive:true,force:true});}
});

test('Evidence snapshot rejects recursive output before creating it',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'lmg-evidence-'));try{await writeFile(path.join(root,'original'),'retain');await assert.rejects(copyEvidenceTree(root,path.join(root,'nested-output')),/outside/);assert.deepEqual(await readdir(root),['original']);}finally{await rm(root,{recursive:true,force:true});}
});

test('Evidence snapshot refuses a linked source without copying external bytes',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'lmg-evidence-'));try{const outside=path.join(root,'outside'),source=path.join(root,'source');await mkdir(outside);await mkdir(source);await writeFile(path.join(outside,'private'),'retain');await symlink(outside,path.join(source,'redirect'),process.platform==='win32'?'junction':'dir');await assert.rejects(copyEvidenceTree(source,path.join(root,'snapshot')),/physical|regular|link/i);assert.equal(await readFile(path.join(outside,'private'),'utf8'),'retain');await assert.rejects(readFile(path.join(root,'snapshot','redirect','private')),{code:'ENOENT'});await assert.rejects(copyEvidenceTree(path.join(source,'redirect'),path.join(root,'root-link-snapshot')),/physical|regular|link/i);}finally{await rm(root,{recursive:true,force:true});}
});
