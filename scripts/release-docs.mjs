// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,readdir,lstat,mkdir,writeFile,copyFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {releaseHash,canonical,validateRelease,validateGate,documentationChecks,publicationDigest} from './release-record.mjs';
import {validateProductVersion} from './product-version.mjs';
import {sourceIdentity} from './provenance.mjs';
import {portablePath} from './windows-packages.mjs';
import {snapshotTopics,switchTopic,searchEntries} from '../apps/site/src/lib/navigation.mjs';

export async function fileInventory(base,relative=''){
 const files=[],physical=await realpath(base);
 async function visit(rel){const at=path.join(physical,rel),s=await lstat(at);assert.ok(!s.isSymbolicLink(),'Snapshot/output links refused');assert.equal(await realpath(at),at);if(s.isDirectory()){for(const name of (await readdir(at)).sort())await visit(rel?rel+'/'+name:name);}else{assert.ok(s.isFile());portablePath(rel);const bytes=await readFile(at);files.push({path:rel,bytes:String(bytes.length),sha256:releaseHash(bytes)});}}
 if(relative)portablePath(relative);await visit(relative);return files;
}
export async function snapshotInventory(base,snapshot){
 validateProductVersion(snapshot.version.slice(1));assert.equal(snapshot.version,'v'+snapshot.version.slice(1));assert.equal(snapshot.source,'docs/'+snapshot.version);
 const files=[];for(const directory of [snapshot.source,'schemas/'+snapshot.version,'site/snapshots/'+snapshot.version]){try{files.push(...await fileInventory(base,directory));}catch(e){if(e.code==='ENOENT'&&directory.startsWith('site/'))continue;throw e;}}
 files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);assert.ok(files.length);return {version:snapshot.version,snapshot:structuredClone(snapshot),files,sha256:releaseHash({snapshot,files})};
}
function glossaryRows(text){return text.split('\n').filter(s=>s.startsWith('|')&&!/^\|[ -]+\|/.test(s)&&!s.startsWith('| Term |')).map(line=>{const cells=line.split('|').slice(1,-1).map(x=>x.trim());return {term:cells[0],definition:cells[1],references:cells.slice(2).join('|')};});}
export function validateVocabularyReview(review,inventory){
 assert.equal(review.version,inventory.version);assert.equal(review.inventorySha256,inventory.sha256,'Stale vocabulary review');assert.match(review.reviewedAt,/^\d{4}-\d\d-\d\d$/);assert.ok(Number.isFinite(Date.parse(review.reviewedAt)));assert.ok(review.reviewer?.trim()&&review.notes?.trim());assert.ok(review.terms?.length);assert.equal(new Set(review.terms.map(t=>t.term)).size,review.terms.length);for(const row of review.terms){assert.ok(row.term&&row.definition&&/\]\((?!https?:)[^)]+\)/.test(row.references),'Definition and local usage required');if(review.major)assert.match(row.references,/\]\(https:\/\/[^)]+\)/,'Major refresh requires primary reference for every term');}return review;
}
export async function reviewVocabulary(base,snapshot,{reviewer,reviewedAt,notes,major}){
 assert.equal(typeof major,'boolean');const inventory=await snapshotInventory(base,snapshot);const glossary=await readFile(path.join(base,snapshot.source,'glossary.md'),'utf8');return validateVocabularyReview({version:snapshot.version,inventorySha256:inventory.sha256,reviewer,reviewedAt,notes,major,terms:glossaryRows(glossary)},inventory);
}
async function writeExact(file,bytes){try{assert.equal(await readFile(file,'utf8'),bytes,'Retained record differs');}catch(e){if(e.code!=='ENOENT')throw e;await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes,{flag:'wx'});}}
export async function retainSnapshot({fromRoot,toRoot,snapshot,sourceRevision,review}){
 assert.match(sourceRevision,/^[a-f0-9]{40}$/);const inventory=await snapshotInventory(fromRoot,snapshot);validateVocabularyReview(review,inventory);const receipt={formatVersion:1,sourceRevision,inventory,review};
 for(const file of inventory.files){const destination=path.join(toRoot,file.path);await mkdir(path.dirname(destination),{recursive:true});const bytes=await readFile(path.join(fromRoot,file.path));try{assert.deepEqual(await readFile(destination),bytes,'Historical snapshot differs; use dated correction');}catch(e){if(e.code!=='ENOENT')throw e;await writeFile(destination,bytes,{flag:'wx'});}}
 await writeExact(path.join(toRoot,'site/retained',snapshot.version+'.json'),canonical(receipt)+'\n');return receipt;
}
export async function correctSnapshot(args){
 const {fromRoot,toRoot,snapshot,date,reason,oldSha256}=args;assert.match(date,/^\d{4}-\d\d-\d\d$/);assert.ok(Number.isFinite(Date.parse(date))&&reason?.trim());const before=await snapshotInventory(toRoot,snapshot);assert.equal(before.sha256,oldSha256);const after=await snapshotInventory(fromRoot,snapshot);assert.notEqual(after.sha256,oldSha256);assert.deepEqual(before.files.map(f=>f.path),after.files.map(f=>f.path),'Corrections preserve the complete retained path set');validateVocabularyReview(args.review,after);const changelog=await readFile(path.join(toRoot,'CHANGELOG.md'),'utf8');
 const correction={date,version:snapshot.version,reason,oldSha256,newSha256:after.sha256};await writeExact(path.join(toRoot,'site/corrections',snapshot.version+'-'+date+'-'+after.sha256+'.json'),canonical(correction)+'\n');
 for(const file of after.files)await copyFile(path.join(fromRoot,file.path),path.join(toRoot,file.path));const receipt={formatVersion:1,sourceRevision:args.sourceRevision,inventory:after,review:args.review};await writeFile(path.join(toRoot,'site/retained',snapshot.version+'.json'),canonical(receipt)+'\n');await writeFile(path.join(toRoot,'CHANGELOG.md'),changelog+`\nDocumentation correction ${date}, ${snapshot.version}: ${reason}. Previous digest ${oldSha256}; corrected digest ${after.sha256}.\n`);return receipt;
}
export async function documentationIdentity(base,manifest,version,revision,{previousVersion=null}={}){
 const inventories=[];for(const snapshot of manifest.snapshots)inventories.push(await snapshotInventory(base,snapshot));const selected=inventories.find(i=>i.version==='v'+version);assert.ok(selected,'Missing elected documentation snapshot');const receipt=JSON.parse(await readFile(path.join(base,'site/retained','v'+version+'.json'),'utf8'));assert.match(receipt.sourceRevision,/^[a-f0-9]{40}$/);assert.deepEqual(receipt.inventory,selected);validateVocabularyReview(receipt.review,selected);
 const major=Number(version.split('.')[0])>Number((previousVersion??'0.0.0').split('.')[0]);if(major)assert.equal(receipt.review.major,true,'Major version requires complete glossary refresh');
 const schema=JSON.parse(await readFile(path.join(base,selected.snapshot.schema),'utf8'));assert.equal(schema['x-release-version'],version);assert.equal(schema.$id,'urn:local-media-gallery:'+version);
 return {version:'v'+version,snapshotSha256:selected.sha256,retainedSha256:releaseHash(inventories),schemaSha256:releaseHash(await readFile(path.join(base,selected.snapshot.schema))),reviewSha256:releaseHash(receipt.review)};
}
async function gateInputs({record,base,manifest,rendererRoot,outputRoot,phase,allowFixture}){
 validateRelease(record,{allowFixture});const identity=await documentationIdentity(base,manifest,record.version,record.source.revision,{previousVersion:record.previousVersion});assert.deepEqual(identity,record.documentation,'Documentation identity changed');
 const rendererSha256=(await sourceIdentity(rendererRoot)).sha256,output=await fileInventory(outputRoot);assert.ok(output.some(f=>f.path==='index.html'));const projectionSha256=releaseHash({phase,latest:manifest.latest,release:phase==='publication'?record.publication:null,output});
 return {identity,rendererSha256,projectionSha256};
}
export async function qualifyDocumentation({record,base,manifest,rendererRoot,outputRoot,phase,allowFixture=false}){
 assert.ok(['candidate','publication'].includes(phase));if(phase==='candidate')assert.notEqual(manifest.latest,'v'+record.version,'Candidate cannot advance current docs');else{assert.ok(record.publication);assert.equal(manifest.latest,'v'+record.version);}
 const {buildSite}=await import('./build-site.mjs'),{checkSite}=await import('./check-site.mjs');const options={base,manifest,outputRoot,allowFixture,...(phase==='publication'?{releaseRecord:record,publicationProjection:true}:{})};
 const model=await buildSite(options);await checkSite(options);
 for(const snapshot of manifest.snapshots){for(const topic of snapshotTopics(snapshot))assert.ok(model.pages.some(p=>p.version===snapshot.version&&p.topic===topic));for(const other of manifest.snapshots)for(const topic of snapshotTopics(snapshot)){const switched=switchTopic(manifest.snapshots,other.version,topic);assert.equal(switched.missing,!snapshotTopics(other).includes(topic));}assert.ok(searchEntries(model.search,'',snapshot.version).length===0);}
 const {testReleaseSite}=await import('./test-release-site.mjs');await testReleaseSite({outputRoot,manifest,record:phase==='publication'?record:null});
 const inputs=await gateInputs({record,base,manifest,rendererRoot,outputRoot,phase,allowFixture});return {phase,result:'pass',candidateId:record.candidateId,sourceRevision:record.source.revision,sourceSha256:record.source.sha256,snapshotsSha256:inputs.identity.retainedSha256,rendererSha256:inputs.rendererSha256,projectionSha256:inputs.projectionSha256,publicationSha256:phase==='publication'?publicationDigest(record.publication):null,checkedAt:new Date().toISOString(),checks:documentationChecks.map(name=>({name,result:'pass'}))};
}
export async function verifyDocumentationGate({record,phase,base,manifest,rendererRoot,outputRoot,allowFixture=false}){
 const gate=record.gates[phase==='candidate'?'before':'after'];assert.ok(gate,'Missing documentation gate');validateGate(record,gate,phase);const inputs=await gateInputs({record,base,manifest,rendererRoot,outputRoot,phase,allowFixture});assert.equal(gate.rendererSha256,inputs.rendererSha256,'Renderer changed after qualification');assert.equal(gate.projectionSha256,inputs.projectionSha256,'Static projection changed after qualification');return gate;
}
