// SPDX-License-Identifier: Apache-2.0
// Fixture extraction is readiness. Actual product installation and all native effects
// remain under qualification; original ZIP and complete fixture bytes are checked again.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,lstat} from 'node:fs/promises';
import path from 'node:path';
import {collectPayload,verifyPayload,hash} from './proof.mjs';

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
 await writeFile(output,bytes,{flag:'wx'});const restored=decodeDependencyNotices(await readFile(output));assert.deepEqual(restored.files.map(({text,...record})=>record),inventory);
 // Only the exact freshly copied payload subtree is removed after lossless readback.
 await rm(source,{recursive:true});
 return{path:'licenses/dependencies.json',files:inventory.length,sha256:hash(bytes),inventorySha256:hash(JSON.stringify(inventory))};
}
function localPath(root,relative){assert.equal(typeof relative,'string');const absolute=path.resolve(root,relative);assert.ok(path.relative(root,absolute)&&!path.relative(root,absolute).startsWith('..')&&!path.isAbsolute(path.relative(root,absolute)),'Diagnostic fixture escapes checkout');return absolute;}
async function physicalLocalPath(root,relative){const file=localPath(root,relative);for(let at=file;;at=path.dirname(at)){assert.ok(!(await lstat(at)).isSymbolicLink(),'Redirected diagnostic fixture');if(at===path.resolve(root))break;}return file;}
async function verifyArchive(root,archive){const file=await physicalLocalPath(root,archive.path),bytes=await readFile(file);assert.equal(String(bytes.length),archive.bytes);assert.equal(hash(bytes),archive.sha256,'Diagnostic archive changed');return file;}
export async function prepareWindowsDiagnosticFixtures({root,build,extract}){
 const started=new Date(),directory=await mkdtemp(path.join(root,'.local/windows-package-fixtures-')),records=[];
 for(const edition of ['full','lite']){const record=build.records.find(r=>r.edition===edition);assert.ok(record);const archive=await verifyArchive(root,record.archive),destination=path.join(directory,edition==='full'?'Full bundle 雪':'Lite gallery 雪'),inventory=path.join(directory,edition+'-inventory.json');await writeFile(inventory,JSON.stringify(record.archive.files));await extract(archive,destination,inventory);await verifyPayload(destination,record.archive.files);records.push({edition,directory:path.relative(root,destination).replaceAll('\\','/'),archive:record.archive});}
 const terminalFinished=new Date(),receipt={kind:'legacy-diagnostic-zip-readiness',formatVersion:1,source:build.source,revision:build.revision,started:started.toISOString(),terminalFinished:terminalFinished.toISOString(),elapsedSeconds:(terminalFinished-started)/1000,records};
 await writeFile(path.join(root,'.local/windows-package-fixtures.json'),JSON.stringify(receipt,null,2)+'\n');return receipt;
}
export async function verifyWindowsDiagnosticFixture({root,build,fixtures,edition}){
 validateWindowsDiagnosticReadiness(build,fixtures);
 const fixture=fixtures.records.find(r=>r.edition===edition),expected=build.records.find(r=>r.edition===edition);assert.ok(fixture&&expected);assert.deepEqual(fixture.archive,expected.archive);await verifyArchive(root,expected.archive);const directory=await physicalLocalPath(root,fixture.directory);await verifyPayload(directory,expected.archive.files);return directory;
}
export function validateWindowsDiagnosticReadiness(build,fixtures){
 assert.equal(fixtures.kind,'legacy-diagnostic-zip-readiness');assert.equal(fixtures.formatVersion,1);assert.deepEqual(fixtures.source,build.source);assert.equal(fixtures.revision,build.revision);
 const started=Date.parse(fixtures.started),finished=Date.parse(fixtures.terminalFinished);assert.ok(Number.isFinite(started)&&Number.isFinite(finished)&&finished>=started);assert.equal(fixtures.elapsedSeconds,(finished-started)/1000);
 assert.deepEqual(fixtures.records.map(r=>r.edition).sort(),['full','lite']);for(const fixture of fixtures.records)assert.deepEqual(fixture.archive,build.records.find(r=>r.edition===fixture.edition).archive);return true;
}

export function verifyEmbeddedSetup(executable,records,firstMember){
 assert.ok(records.length&&firstMember.length>0);const begin=executable.indexOf(firstMember);assert.ok(begin>=8,'Embedded first MSI missing');
 const candidates=['{"files":[','{"format_version":1,"files":['].map(prefix=>executable.lastIndexOf(Buffer.from(prefix),begin)).filter(at=>at>=8);
 const header=candidates.find(at=>{try{return executable.readBigUInt64LE(at-8)===BigInt(begin-at)&&JSON.parse(executable.subarray(at,begin)).format_version===1;}catch{return false;}});assert.ok(header!==undefined,'Embedded container index missing');
 const index=JSON.parse(executable.subarray(header,begin));assert.deepEqual(index,{format_version:1,files:records});let cursor=begin;
 for(const record of records){const size=Number(record.bytes);assert.ok(Number.isSafeInteger(size)&&size>=0&&cursor+size<=executable.length);assert.equal(hash(executable.subarray(cursor,cursor+size)),record.sha256,record.path);cursor+=size;}
 return true;
}
