// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,lstat,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {canonical,parseReleaseRecord,validateRelease,validateGate,releaseHash} from './release-record.mjs';
import {verifyDocumentationGate} from './release-docs.mjs';
const marker=record=>'<!-- local-media-gallery candidate '+record.candidateId+' -->';
export class ReleasePublisher {
 constructor({client,artifactRoot,documentation,fixtureGateVerifier}={}){
  assert.ok(client);if(fixtureGateVerifier)assert.equal(client.fixture,true,'Injected gates are fixture-only');
  Object.assign(this,{client,artifactRoot,documentation,fixtureGateVerifier});
 }
 get options(){return {allowFixture:this.client.fixture};}
 async gate(record,phase){
  validateRelease(record,this.options);assert.equal(record.repository,this.client.repository);
  assert.equal(record.qualification.mode,this.client.fixture?'fixture':'native');assert.notEqual(record.version,'0.0.0','Specification baseline is not publishable');
  validateGate(record,record.gates[phase==='candidate'?'before':'after'],phase);
  if(this.fixtureGateVerifier)await this.fixtureGateVerifier(record,phase);
  else await verifyDocumentationGate({record,phase,...this.documentation[phase],allowFixture:false});
  if(!this.client.fixture)await this.client.verifyQualification(record);
 }
 async reconcile(write,read,label){
  // A failed acknowledgement does not establish that the service rejected the write.
  // Observe once-issued mutations; only explicit undefined results are pending.
  let failure;try{await write();}catch(error){if(error.status&&error.status<500)throw error;failure=error;}
  return this.client.observe(read,label,failure);
 }
 async input(asset){
  const file=path.join(this.artifactRoot,asset.name),info=await lstat(file);assert.ok(info.isFile()&&!info.isSymbolicLink());
  const bytes=await readFile(file);assert.equal(String(bytes.length),asset.bytes,'Local asset bytes changed');assert.equal(releaseHash(bytes),asset.sha256,'Local asset digest changed');return bytes;
 }
 async locate(record){
  const matches=(await this.client.releases()).filter(r=>r.tag_name==='v'+record.version);
  assert.ok(matches.length<=1,'Ambiguous remote releases');if(!matches.length)return null;
  const release=matches[0];assert.ok(Number.isSafeInteger(release.id)&&release.id>0,'Invalid release identity');
  assert.ok(release.body?.includes(marker(record)),'Remote release is not owned by this candidate');
  assert.equal(release.prerelease,false);assert.equal(release.target_commitish,record.source.revision,'Draft target source differs');
  const tag=await this.client.resolveTag('v'+record.version);if(tag!==null)assert.equal(tag,record.source.revision,'Remote tag source differs');return release;
 }
 async listedAssets(record,release,{canonicalAllowed=false}={}){
  const assets=await this.client.assets(release.id);
  assert.equal(new Set(assets.map(a=>a.name)).size,assets.length,'Duplicate asset name');
  assert.equal(new Set(assets.map(a=>a.id)).size,assets.length,'Duplicate asset identity');
  assert.ok(assets.every(a=>record.artifacts.some(e=>e.name===a.name)||(canonicalAllowed&&a.name==='release.json')),'Foreign remote asset');
  for(const asset of assets){
   assert.ok(Number.isSafeInteger(asset.id)&&asset.id>0,'Invalid asset identity');
   assert.equal(asset.url,this.client.origin+this.client.prefix+'/releases/assets/'+asset.id,'Remote asset API identity differs');
  }
  return assets;
 }
 async bytes(asset,expected,{draft=false}={}){
  assert.equal(asset.name,expected.name,'Remote asset name differs');
  assert.ok(Number.isSafeInteger(asset.id)&&asset.id>0,'Invalid asset identity');
  assert.equal(asset.url,this.client.origin+this.client.prefix+'/releases/assets/'+asset.id,'Remote asset API identity differs');
  assert.equal(asset.state,'uploaded','Incomplete remote asset');assert.equal(String(asset.size),expected.bytes,'Remote asset bytes differ');
  // Draft browser URLs are temporary. They are never credentials or canonical metadata.
  if(!draft)assert.equal(asset.browser_download_url,expected.url,'Remote asset URL differs');
  const actual=await this.client.download(asset.url);assert.equal(actual.bytes,expected.bytes);assert.equal(actual.sha256,expected.sha256,'Remote asset digest differs');
  return {name:asset.name,id:asset.id,bytes:actual.bytes,sha256:actual.sha256,url:expected.url};
 }
 async verifyAssets(record,release,options={}){
  const assets=await this.listedAssets(record,release,options),observed=[];
  for(const expected of record.artifacts){
   const asset=assets.find(a=>a.name===expected.name);assert.ok(asset,'Missing remote asset '+expected.name);
   observed.push(await this.bytes(asset,expected,{draft:release.draft}));
  }
  return observed;
 }
 async ensureUploaded(record,release,name,input,{canonicalAsset=false}={}){
  const journalFile=path.join(this.artifactRoot,'.release-upload-attempts.json');
  let journal={candidateId:record.candidateId,starters:{}};
  try{
   const info=await lstat(journalFile);assert.ok(info.isFile()&&!info.isSymbolicLink());
   journal=JSON.parse(await readFile(journalFile,'utf8'));assert.equal(journal.candidateId,record.candidateId);assert.ok(journal.starters&&typeof journal.starters==='object');
  }catch(error){if(error.code!=='ENOENT')throw error;}
  const options={canonicalAllowed:canonicalAsset||!release.draft};
  let assets=await this.listedAssets(record,release,options),existing=assets.find(a=>a.name===name);
  if(existing?.state==='starter'&&existing.size===0){
   assert.ok(release.draft||(canonicalAsset&&name==='release.json'),'Published package assets are never replaced');
   assert.equal(journal.starters[name],existing.id,'Starter is not attributable to a retained upload attempt');
   const starter=existing;
   await this.reconcile(()=>this.client.deleteAsset(starter.id),async()=>{
    const current=await this.listedAssets(record,release,options),same=current.find(a=>a.id===starter.id);
    if(same){assert.equal(same.name,name);assert.equal(same.state,'starter');assert.equal(same.size,0);return undefined;}
    assert.ok(!current.some(a=>a.name===name),'Starter replaced by unrelated asset');return true;
   },'Starter cleanup not observed');
   delete journal.starters[name];await writeFile(journalFile+'.next',canonical(journal)+'\n');await rename(journalFile+'.next',journalFile);existing=null;
  }
  if(existing){assert.equal(existing.state,'uploaded','Incomplete remote asset');return existing;}
  return this.reconcile(()=>this.client.upload(release,name,input),async()=>{
   const current=await this.listedAssets(record,release,options),asset=current.find(a=>a.name===name);
   if(!asset)return undefined;
   if(asset.state==='starter'&&asset.size===0){
    if(journal.starters[name]!==undefined)assert.equal(journal.starters[name],asset.id,'Starter identity changed during upload observation');journal.starters[name]=asset.id;await writeFile(journalFile+'.next',canonical(journal)+'\n');await rename(journalFile+'.next',journalFile);return undefined;
   }
   assert.equal(asset.state,'uploaded','Incomplete remote asset');return asset;
  },'Upload completion not observed');
 }
 async stage(record,notes){
  await this.gate(record,'candidate');assert.ok(typeof notes==='string'&&notes.trim()&&!notes.includes('<!--'),'Release highlights required');
  let release=await this.locate(record);
  if(!release){
   const body={tag_name:'v'+record.version,target_commitish:record.source.revision,name:'Local Media Gallery '+record.version,draft:true,prerelease:false,make_latest:'false',body:notes.trim()+'\n\n'+marker(record)+'\n\n[Full changelog](https://github.com/'+record.repository+'/blob/main/CHANGELOG.md)'};
   release=await this.reconcile(()=>this.client.createDraft(body),async()=>await this.locate(record)??undefined,'Draft creation not observed');
  }
  if(!release.draft){await this.verifyAssets(record,release,{canonicalAllowed:true});return {...structuredClone(record),state:'staged'};}
  await this.listedAssets(record,release);
  for(const expected of record.artifacts){
   const input=await this.input(expected),asset=await this.ensureUploaded(record,release,expected.name,input);
   await this.bytes(asset,expected,{draft:true});
  }
  await this.verifyAssets(record,release);return {...structuredClone(record),state:'staged'};
 }
 async publish(record){
  await this.gate(record,'candidate');assert.equal(record.state,'staged');
  let release=await this.locate(record);assert.ok(release,'Staged release absent');await this.verifyAssets(record,release,{canonicalAllowed:!release.draft});
  if(release.draft){
   const id=release.id;
   release=await this.reconcile(()=>this.client.editRelease(id,{draft:false,make_latest:'false'}),async()=>{
    const current=await this.locate(record);if(!current)return undefined;
    assert.equal(current.id,id,'Release identity changed');if(current.draft)return undefined;
    assert.ok(current.published_at,'Published timestamp missing');
    const tag=await this.client.resolveTag('v'+record.version);if(tag===null)return undefined;
    assert.equal(tag,record.source.revision,'Published tag source differs');return current;
   },'Publication not observed');
  }
  assert.equal(await this.client.resolveTag('v'+record.version),record.source.revision,'Published tag source differs');
  const assets=await this.verifyAssets(record,release,{canonicalAllowed:true});
  const observed={...structuredClone(record),publication:{repository:record.repository,id:release.id,tag:release.tag_name,sourceRevision:record.source.revision,htmlUrl:release.html_url,publishedAt:release.published_at,assets:assets.sort((a,b)=>a.name.localeCompare(b.name,'en'))}};
  return validateRelease(observed,this.options);
 }
 async promote(record){
  await this.gate(record,'publication');const release=await this.locate(record);assert.ok(release&&!release.draft&&release.published_at,'Actual publication required');
  const actual=await this.publish({...record,state:'staged'});assert.deepEqual(actual.publication,record.publication,'Publication changed before promotion');
  const latest=await this.client.latest(),selected=latest?.tag_name??null,target='v'+record.version,prior=record.previousVersion===null?null:'v'+record.previousVersion;
  assert.ok(selected===prior||selected===target,'Previous public selection changed');
  const selectedId=latest?.id??null,published=validateRelease({...structuredClone(record),state:'published'},{...this.options,requirePublished:true});
  const bytes=Buffer.from(canonical(published)+'\n'),asset=await this.ensureUploaded(record,release,'release.json',bytes,{canonicalAsset:true});
  assert.equal(asset.state,'uploaded');assert.equal(asset.browser_download_url,'https://github.com/'+record.repository+'/releases/download/'+target+'/release.json','Canonical URL differs');
  const remote=await this.client.download(asset.url,{collect:true,maxBytes:32*1024*1024}),retained=parseReleaseRecord(remote.data,{...this.options,requirePublished:true});
  assert.equal(retained.candidateId,published.candidateId,'Canonical immutable candidate differs');assert.deepEqual(retained.publication,published.publication,'Canonical publication differs');
  // GitHub has no compare-and-swap. Never hide an observed concurrent selection.
  const current=await this.client.latest();assert.equal(current?.id??null,selectedId,'Public selection changed during promotion');
  if(selected!==target){
   await this.reconcile(()=>this.client.editRelease(release.id,{make_latest:'true'}),async()=>{
    const observed=await this.client.latest();
    if(observed?.id===release.id){assert.equal(observed.tag_name,target);return observed;}
    assert.equal(observed?.id??null,selectedId,'Public selection changed during promotion');return undefined;
   },'Latest promotion not observed');
  }
  return retained;
 }
}
export async function resolvePublishedRelease(client){
 const latest=await client.latest();if(!latest)return null;assert.ok(!latest.draft&&!latest.prerelease&&latest.published_at);
 const asset=(await client.assets(latest.id)).filter(a=>a.name==='release.json');assert.equal(asset.length,1,'Latest release lacks canonical verified metadata');
 assert.ok(Number.isSafeInteger(asset[0].id)&&asset[0].id>0);
 assert.equal(asset[0].url,client.origin+client.prefix+'/releases/assets/'+asset[0].id,'Canonical API identity differs');
 const bytes=await client.download(asset[0].url,{collect:true,maxBytes:32*1024*1024}),record=parseReleaseRecord(bytes.data,{requirePublished:true});
 assert.equal(record.repository,client.repository);assert.equal(record.publication.id,latest.id);assert.equal(record.publication.tag,latest.tag_name);
 assert.equal(await client.resolveTag(latest.tag_name),record.source.revision);
 const publisher=new ReleasePublisher({client,artifactRoot:''});
 assert.deepEqual((await publisher.verifyAssets(record,latest,{canonicalAllowed:true})).sort((a,b)=>a.name.localeCompare(b.name,'en')),record.publication.assets);return record;
}
