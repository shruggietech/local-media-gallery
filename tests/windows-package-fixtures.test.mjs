// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,access} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {hash,collectPayload} from '../scripts/proof.mjs';
import {consolidateDependencyNotices,decodeDependencyNotices,prepareWindowsDiagnosticFixtures,verifyWindowsDiagnosticFixture,verifyEmbeddedSetup} from '../scripts/windows-package-fixtures.mjs';

test('installed dependency notice bundle preserves every original path and exact bytes including BOM, CRLF and Unicode',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'lmg-notices-'));const directory=path.join(root,'licenses/dependencies');
 try{
  await mkdir(path.join(directory,'nested'),{recursive:true});for(const [name,bytes]of [['LICENSE',Buffer.from('Copyright owner\r\nAll text retained\r\n')],['nested/NOTICE',Buffer.from('\ufeffNotice ü 雪\n')],['inventory.json',Buffer.from('{"original":true}\n')]])await writeFile(path.join(directory,name),bytes);
  const original=await collectPayload(directory),bytes=await Promise.all(original.map(f=>readFile(path.join(directory,f.path))));const receipt=await consolidateDependencyNotices(root);const bundle=decodeDependencyNotices(await readFile(path.join(root,receipt.path)));
  assert.equal(receipt.files,original.length);assert.equal(receipt.inventorySha256,hash(JSON.stringify(original)));assert.deepEqual(bundle.files.map(({text,...file})=>file),original);for(let i=0;i<bytes.length;i++)assert.ok(Buffer.from(bundle.files[i].text,'utf8').equals(bytes[i]));await assert.rejects(access(directory),{code:'ENOENT'});
  const changed=structuredClone(bundle);changed.files[0].text+='changed';assert.throws(()=>decodeDependencyNotices(JSON.stringify(changed)));const duplicate=structuredClone(bundle);duplicate.files.push({...duplicate.files[0],path:duplicate.files[0].path.toUpperCase()});assert.throws(()=>decodeDependencyNotices(JSON.stringify(duplicate)));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('undecodable notices stop consolidation before removing original obligations',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'lmg-notices-'));const directory=path.join(root,'licenses/dependencies');try{await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'LICENSE'),Buffer.from([0xff]));await assert.rejects(consolidateDependencyNotices(root));assert.deepEqual(await readFile(path.join(directory,'LICENSE')),Buffer.from([0xff]));}finally{await rm(root,{recursive:true,force:true});}
});
test('diagnostic fixture readiness requires fresh exact source/archive/inventory verification in qualification',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'lmg-windows-fixtures-'));try{
  await mkdir(path.join(root,'.local'));const records=[];
  for(const edition of ['full','lite']){const original=path.join(root,edition);await mkdir(original);await writeFile(path.join(original,'fixture.txt'),edition);const files=await collectPayload(original),bytes=Buffer.from(edition+' archive fixture');await writeFile(path.join(root,'.local',edition+'.zip'),bytes);records.push({edition,archive:{path:'.local/'+edition+'.zip',bytes:String(bytes.length),sha256:hash(bytes),files}});}
  const build={source:{sha256:'a'.repeat(64),files:3},revision:'b'.repeat(40),records};let extractions=0;const fixtures=await prepareWindowsDiagnosticFixtures({root,build,extract:async(archive,destination)=>{extractions++;await mkdir(destination);await writeFile(path.join(destination,'fixture.txt'),path.basename(archive,'.zip'));}});assert.equal(extractions,2);assert.ok(fixtures.elapsedSeconds>=0);assert.match(fixtures.records[0].directory,/雪/);
  const args={root,build,fixtures,edition:'full'},directory=await verifyWindowsDiagnosticFixture(args);assert.equal(extractions,2,'Qualification rechecks original bytes without repeating fixture inflation');
  await writeFile(path.join(directory,'fixture.txt'),'changed');await assert.rejects(verifyWindowsDiagnosticFixture(args));await writeFile(path.join(directory,'fixture.txt'),'full');
  await writeFile(path.join(directory,'foreign.txt'),'retain');await assert.rejects(verifyWindowsDiagnosticFixture(args));await rm(path.join(directory,'foreign.txt'));
  const archive=path.join(root,'.local/full.zip'),original=await readFile(archive);await writeFile(archive,'changed');await assert.rejects(verifyWindowsDiagnosticFixture(args));await writeFile(archive,original);
  const wrong=structuredClone(fixtures);wrong.revision='c'.repeat(40);await assert.rejects(verifyWindowsDiagnosticFixture({...args,fixtures:wrong}));wrong.revision=fixtures.revision;wrong.records[0].directory='../foreign';await assert.rejects(verifyWindowsDiagnosticFixture({...args,fixtures:wrong}));assert.equal(await verifyWindowsDiagnosticFixture(args),directory);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('setup readback checks index and every embedded member before loose diagnostic companions are omitted',()=>{
 const parts=[Buffer.from('actual MSI fixture'),Buffer.from('offline runtime fixture'),Buffer.from('source payload')],records=parts.map((bytes,i)=>({path:'member-'+i,bytes:String(bytes.length),sha256:hash(bytes)}));
 for(const index of [{files:records,format_version:1},{format_version:1,files:records}]){const header=Buffer.from(JSON.stringify(index)),length=Buffer.alloc(8);length.writeBigUInt64LE(BigInt(header.length));const bytes=Buffer.concat([Buffer.from('PE fixture'),length,header,...parts]);assert.equal(verifyEmbeddedSetup(bytes,records,parts[0]),true);const changed=Buffer.from(bytes);changed[changed.length-1]^=1;assert.throws(()=>verifyEmbeddedSetup(changed,records,parts[0]));const badIndex=structuredClone(records);badIndex[1].path='changed';assert.throws(()=>verifyEmbeddedSetup(bytes,badIndex,parts[0]));}
});
