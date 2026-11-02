// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,rename,mkdtemp,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {releaseHash,parseReleaseRecord} from './release-record.mjs';
import {collectPayload} from './proof.mjs';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
import {execute,python,root as repositoryRoot} from './run.mjs';

// Exercises the exact native library embedded in the product against actual
// published bytes. Native UI observation is supplied by each existing host campaign.
export async function exercisePreparedRecipient({root,work,platform,capture,fixture,browse,source,revision}){
 requireIsolatedDesktop();
 const directory=path.join(work,'Prepared '+platform+' gallery 雪');await fixture(directory);
 const settings=path.join(directory,'settings.json'),document=JSON.parse(await readFile(settings,'utf8'));document.version='0.1.0';await writeFile(settings,JSON.stringify(document)+'\n');
 const original=await collectPayload(directory);
 const driver=path.join(root,'target/release/gallery-preparation'+(process.platform==='win32'?'.exe':''));
 const prepared=JSON.parse((await capture(driver,[directory,platform],{timeout:240000})).stdout);
 assert.equal(prepared.platform,platform);assert.equal(prepared.disposition,'new');
 const retained=path.join(directory,`LMG-${platform}-${prepared.architecture}`),releaseBytes=await readFile(path.join(retained,'release.json')),record=parseReleaseRecord(releaseBytes,{requirePublished:true});
 assert.equal(prepared.releaseVersion,record.version);assert.equal(prepared.candidateId,record.candidateId);
 const artifact=record.artifacts.find(a=>a.role==='package'&&a.edition==='lite'&&a.platform===platform);assert.ok(artifact);
 const archive=await readFile(path.join(retained,artifact.name));assert.equal(String(archive.length),artifact.bytes);assert.equal(releaseHash(archive),artifact.sha256);
 const inventory=await collectPayload(path.join(retained,'bundle'));assert.equal(inventory.length,artifact.inventory.files);assert.equal(inventory.reduce((n,f)=>n+BigInt(f.bytes),0n).toString(),artifact.inventory.bytes);assert.equal(releaseHash(inventory),artifact.inventory.sha256);
 const before=await collectPayload(directory);const repeated=JSON.parse((await capture(driver,[directory,platform],{timeout:240000})).stdout);assert.equal(repeated.disposition,'reuse');assert.deepEqual(await collectPayload(directory),before);
 const native=[];native.push(await browse(directory,'prepared-in-place',null,inventory));
 const moved=directory+' moved';await rename(directory,moved);
 native.push(await browse(moved,'prepared-relocated-refresh',async()=>writeFile(path.join(moved,'green.png'),await readFile(path.join(work,'prepared-green.png'))),inventory));
 const after=await collectPayload(moved);for(const f of before)assert.deepEqual(after.find(n=>n.path===f.path),f,'Prepared bytes retained after relocation '+f.path);
 for(const f of original)assert.deepEqual(after.find(n=>n.path===f.path),f,'Original media/settings retained');
 const retainedArchive=path.join(work,'prepared-recipient-'+platform+(platform==='windows'?'.zip':'.tar.gz')),inventoryFile=path.join(work,'prepared-recipient-inventory.json');await writeFile(inventoryFile,JSON.stringify(after)+'\n');await execute(python,[path.join(repositoryRoot,'scripts/proof-archive.py'),'create',retainedArchive,moved,inventoryFile]);const packet=await readFile(retainedArchive);const galleryArchive={path:path.relative(root,retainedArchive).replaceAll('\\','/'),bytes:String(packet.length),sha256:releaseHash(packet),files:after};
 const receipt={formatVersion:1,result:'pass',source,revision,platform,releaseVersion:record.version,candidateId:record.candidateId,canonicalSha256:releaseHash(releaseBytes),artifact,prepared,repeated,inventory,native,directory:path.relative(root,moved).replaceAll('\\','/'),galleryArchive,original,retained:before,terminalFinished:new Date().toISOString()};
 await validatePreparedRecipient(receipt,root);
 await writeFile(path.join(root,'.local','prepared-recipient-'+platform+'.json'),JSON.stringify(receipt,null,2)+'\n');return receipt;
}
export async function validatePreparedRecipient(r,root){
 assert.equal(r.formatVersion,1);assert.equal(r.result,'pass');assert.ok(['windows','linux','macos'].includes(r.platform));assert.match(r.revision,/^[a-f0-9]{40}$/);assert.ok(r.source?.sha256);
 assert.ok(path.resolve(root,r.directory).startsWith(path.resolve(root,'.local')+path.sep));
 return withPreparedArchive(r.galleryArchive,root,async({base,files:all})=>{
 const retained=path.join(base,`LMG-${r.platform}-${r.prepared.architecture}`),bytes=await readFile(path.join(retained,'release.json')),release=parseReleaseRecord(bytes,{requirePublished:true});
 assert.equal(releaseHash(bytes),r.canonicalSha256);assert.equal(release.candidateId,r.candidateId);assert.equal(release.version,r.releaseVersion);
 assert.deepEqual(release.artifacts.find(a=>a.role==='package'&&a.edition==='lite'&&a.platform===r.platform),r.artifact);
 const archive=await readFile(path.join(retained,r.artifact.name));assert.equal(releaseHash(archive),r.artifact.sha256);assert.equal(String(archive.length),r.artifact.bytes);
 const prefix=`LMG-${r.platform}-${r.prepared.architecture}/bundle/`;const inventory=all.filter(f=>f.path.startsWith(prefix)).map(f=>({...f,path:f.path.slice(prefix.length)}));assert.deepEqual(inventory,r.inventory);assert.equal(releaseHash(inventory),r.artifact.inventory.sha256);assert.equal(inventory.length,r.artifact.inventory.files);assert.equal(inventory.reduce((n,f)=>n+BigInt(f.bytes),0n).toString(),r.artifact.inventory.bytes);
 for(const f of r.retained)assert.deepEqual(all.find(n=>n.path===f.path),f);for(const f of r.original)assert.deepEqual(all.find(n=>n.path===f.path),f);
 assert.equal(r.repeated.disposition,'reuse');assert.equal(r.native.length,2);
 const launchFiles=r.platform==='windows'?['local-media-gallery.exe']:r.platform==='linux'?['local-media-gallery','local-media-gallery.bin']:inventory.filter(f=>f.path.startsWith('Local Media Gallery Lite.app/')).map(f=>f.path);
 for(const name of launchFiles){const expected=inventory.find(f=>f.path===name),actual=all.find(f=>f.path===name);assert.ok(expected&&actual);assert.deepEqual(actual,expected,'Root launch copy equals complete published bundle');}
 assert.equal(r.native[0].label,'prepared-in-place');assert.equal(r.native[1].label,'prepared-relocated-refresh');
 for(const n of r.native){assert.ok(n.pid>0);const records=n.accessibility??n.records;assert.ok(records.some(v=>v.name==='Open red.png'));const frames=n.frames??[{path:n.screenshot,sha256:n.screenshotSha256,bytes:n.screenshotBytes,color:'red',pixels:n.pixels},...(n.refreshScreenshot?[{...n.refreshScreenshot,color:'green',pixels:n.refreshedPixels}]:[])];assert.ok(frames.some(f=>f.color==='red'&&f.pixels.red>1500));if(n.label==='prepared-relocated-refresh')assert.ok(frames.some(f=>f.color==='green'&&f.pixels.green>1500));for(const f of frames){const file=path.resolve(root,f.path);assert.ok(file.startsWith(path.resolve(root,'.local')+path.sep));const b=await readFile(file);assert.equal(releaseHash(b),f.sha256);assert.equal(String(b.length),f.bytes);}}
 const binary=r.platform==='windows'?'local-media-gallery.exe':r.platform==='linux'?'local-media-gallery.bin':'Local Media Gallery Lite.app/Contents/MacOS/local-media-gallery';for(const n of r.native)assert.equal(n.binarySha256,inventory.find(f=>f.path===binary).sha256);
 return true;
 });
}

// Actions artifact transport does not retain Unix executable modes. Keep an
// original inventory-checked tar/ZIP and validate its raw modes before decoding.
export async function withPreparedArchive(record,root,read){
 assert.ok(record&&Array.isArray(record.files)&&record.files.length>0);assert.equal(new Set(record.files.map(f=>f.path)).size,record.files.length);
 assert.ok(typeof record.path==='string'&&record.path.startsWith('.local/')&&!record.path.includes('\\')&&record.path.split('/').every(p=>p&&p!=='.'&&p!=='..'));
 const file=path.resolve(root,record.path);assert.ok(file.startsWith(path.resolve(root,'.local')+path.sep));const bytes=await readFile(file);assert.equal(String(bytes.length),record.bytes);assert.equal(releaseHash(bytes),record.sha256);
 const temporary=await mkdtemp(path.join(os.tmpdir(),'lmg-prepared-readback-'));
 try{
  const inventory=path.join(temporary,'inventory.json'),base=path.join(temporary,'gallery');await writeFile(inventory,JSON.stringify(record.files)+'\n');await mkdir(base);await execute(python,[path.join(repositoryRoot,'scripts/proof-archive.py'),'extract',file,base,inventory]);
  const actual=await collectPayload(base);assert.equal(actual.length,record.files.length);const files=actual.map(f=>{const expected=record.files.find(e=>e.path===f.path);assert.ok(expected);assert.equal(f.bytes,expected.bytes);assert.equal(f.sha256,expected.sha256);if(process.platform!=='win32'&&expected.mode!==null)assert.equal(f.mode,expected.mode);return {...f,mode:expected.mode};});
  return await read({base,files});
 }finally{await rm(temporary,{recursive:true,force:true});}
}
