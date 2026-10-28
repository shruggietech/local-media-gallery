// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {validatePayload,verifyPayload,packageGuid,validateNativeAudit} from '../scripts/windows-packages.mjs';
import Ajv from 'ajv/dist/2020.js';
import {readFile} from 'node:fs/promises';
const hash='a'.repeat(64);
const payload=()=>({generation:'c'.repeat(32),product:'local-media-gallery',kind:'windows-application-payload',formatVersion:1,version:'0.0.0',edition:'lite',os:'windows',arch:'x86_64',targetTriple:'x86_64-pc-windows-msvc',buildProfile:'release',revision:'b'.repeat(40),source:{sha256:hash,files:1},binary:'local-media-gallery.exe',files:[{path:'local-media-gallery.exe',bytes:'1',sha256:hash}]});
test('Windows payload identity rejects ambiguous paths, duplicate aliases and invalid source',()=>{
 assert.ok(validatePayload(payload()));
 for(const name of ['../x','a/../x','C:/x','/x','a\\x','AUX.txt','x.','x ','a:stream','a//x']){const p=payload();p.files[0].path=name;p.binary=name;assert.throws(()=>validatePayload(p),name);}
 const p=payload();p.files.push({...p.files[0],path:'LOCAL-MEDIA-GALLERY.EXE'});assert.throws(()=>validatePayload(p));
 for(const field of ['revision','arch','buildProfile']){const p=payload();p[field]='wrong';assert.throws(()=>validatePayload(p));}
 const q=payload();q.files[0].bytes='1073741825';assert.throws(()=>validatePayload(q));
});
test('Actual payload bytes must match manifest; foreign extras are outside owned inventory',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'lmg-package-contract-'));
 try{const p=payload();await writeFile(path.join(dir,p.binary),'x');await assert.rejects(verifyPayload(dir,p));}
 finally{await rm(dir,{recursive:true,force:true});}
});
test('Package identities distinguish scope and inputs deterministically',()=>{
 assert.equal(packageGuid('user',hash),packageGuid('user',hash));assert.notEqual(packageGuid('user',hash),packageGuid('machine',hash));assert.notEqual(packageGuid('user',hash),packageGuid('user','b'.repeat(64)));
});
test('Published payload schema accepts the same typed candidate identity',async()=>{const schema=JSON.parse(await readFile(new URL('../schemas/v0.0.0/windows-packages.schema.json',import.meta.url)));const ajv=new Ajv({strict:true}).addKeyword('x-release-version');const valid=ajv.compile(schema);assert.ok(valid(payload()),JSON.stringify(valid.errors));const p=payload();p.buildProfile='debug';assert.equal(valid(p),false);});
test('Recipient dependency closure checks both ordinary and delay imports',()=>{const audit={machine:0x8664,imports:['kernel32.dll','bcryptprimitives.dll'],delayImports:[],signature:{status:'NotSigned'}};assert.ok(validateNativeAudit(audit));assert.throws(()=>validateNativeAudit({...audit,delayImports:['VCRUNTIME140.dll']}));assert.throws(()=>validateNativeAudit({...audit,machine:0x14c}));});
