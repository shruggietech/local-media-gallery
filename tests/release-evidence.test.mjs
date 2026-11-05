// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {retainGateEvidence,verifyGateEvidence} from '../scripts/release-evidence.mjs';
import {candidateFixture,gateFixture} from './fixtures/releases/record-fixture.mjs';
import {createCandidate,attachGate,releaseHash} from '../scripts/release-record.mjs';
import {fileInventory} from '../scripts/release-docs.mjs';
import {sourceIdentity} from '../scripts/provenance.mjs';
test('Retained gate inventory rejects missing, modified and extra export files',async t=>{
 const base=await mkdtemp(path.join(os.tmpdir(),'lmg-gate-evidence-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const outputRoot=path.join(base,'export');await mkdir(outputRoot);await writeFile(path.join(outputRoot,'index.html'),'Gate bytes\n');
 const manifest={latest:'v0.1.0',snapshots:[]};let record=createCandidate(candidateFixture(),{allowFixture:true});
 const gate=gateFixture(record,'candidate');gate.rendererSha256=(await sourceIdentity()).sha256;
 gate.projectionSha256=releaseHash({phase:'candidate',latest:manifest.latest,release:null,output:await fileInventory(outputRoot)});
 record=attachGate(record,gate,{allowFixture:true});
 const args={directory:path.join(base,'retained'),record,phase:'candidate',manifest,outputRoot,allowFixture:true,fixtureGateVerifier:async()=>{}};
 await retainGateEvidence(args);await verifyGateEvidence({...args,outputRoot:undefined});
 const file=path.join(args.directory,'export/index.html');await writeFile(file,'changed\n');await assert.rejects(verifyGateEvidence({...args,outputRoot:undefined}),/inventory|projection|hash/i);
 await writeFile(file,'Gate bytes\n');await writeFile(path.join(args.directory,'export/extra'),'extra');await assert.rejects(verifyGateEvidence({...args,outputRoot:undefined}),/inventory/i);
 await rm(path.join(args.directory,'export/extra'));await rm(file);await assert.rejects(verifyGateEvidence({...args,outputRoot:undefined}),/inventory/i);
});
test('Fixture gate verifier cannot authorize production evidence',async()=>{
 await assert.rejects(retainGateEvidence({fixtureGateVerifier:async()=>{}}),/fixture/i);
});

// The publisher must bind private supporting packets to the already accepted gate.
import {selectWindowsSupportingArtifacts,verifyWindowsSupportingEvidence,downloadQualificationArtifact,downloadQualificationInputs} from '../scripts/release-inputs.mjs';
import {windowsCohortClock,windowsReadyName,windowsBuildDigest,combineWindowsCampaigns,normalizeWindowsEvidence} from '../scripts/windows-package-cohort.mjs';
import {qualificationReceipt} from '../scripts/release-assembly.mjs';

function supportingFixture(){
 const source={sha256:'a'.repeat(64),files:3,exclusions:['specs/progress.md']},revision='b'.repeat(40),shaLabel='d'.repeat(40);
 const build={source,revision,products:[{edition:'full',artifact:{sha256:'c'.repeat(64),path:'.local\\candidate\\full.msi'}}]};
 const context={source,revision,shaLabel,runId:'123',attempt:'1',buildSha256:windowsBuildDigest(build),preparationStarted:'2026-01-01T00:00:00.000Z'};
 const markers=['experience','lifecycle'].map((role,index)=>({id:index+1,name:windowsReadyName(role,shaLabel,'1'),created_at:'2026-01-01T00:00:0'+(index+1)+'.000Z',expired:false,workflow_run:{id:123,head_sha:revision}}));
 const clock=windowsCohortClock(context,markers),started=clock.readinessVerified,terminal='2026-01-01T00:00:20.000Z';
 const receipts=['experience','lifecycle'].map(campaign=>({context:{scope:'windows-'+campaign,campaign,source,revision,cohortClock:clock},clock,result:'pass',steps:[{name:'actual cases',result:'pass',started,terminalFinished:terminal}],targetSeconds:660,hardLimitSeconds:900,provisionalFinalizationReserveSeconds:15,preparationStarted:context.preparationStarted,readinessVerified:started,terminalFinished:terminal,preparationSeconds:17,qualificationSeconds:3,combinedSeconds:20}));
 const fragments=['experience','lifecycle'].map(campaign=>({formatVersion:1,kind:'windows-package-fragment',campaign,result:'pass',acceptance:false,source,revision,buildSha256:context.buildSha256,fullMsiSha256:'c'.repeat(64),clock,started,terminalFinished:terminal,native:[],host:{platform:'win32',arch:'x64'},observer:{path:'.local\\observer\\'+campaign},checks:Array.from({length:29},()=>({result:'pass'})),installerChoices:Array(8).fill({}),cachedMaintenance:[{},{}],publishedRecovery:[{version:'0.1.0'},{version:'0.2.0'}]}));
 const artifacts=['experience','lifecycle'].map((role,index)=>({id:100+index,name:'windows-'+role+'-evidence-'+shaLabel,digest:'sha256:'+String(index+1).repeat(64),size_in_bytes:32+index,expired:false,workflow_run:{id:123,head_sha:revision}}));
 const transfers=artifacts.map((artifact,index)=>({campaign:['experience','lifecycle'][index],clock,observed:'2026-01-01T00:00:21.000Z',artifact:{id:artifact.id,name:artifact.name,digest:artifact.digest,bytes:artifact.size_in_bytes}}));
 const packages=JSON.parse(JSON.stringify({...combineWindowsCampaigns(build,fragments,receipts,context),acceptance:true,terminalFinished:'2026-01-01T00:00:25.000Z'}));
 const gate={context:{scope:'windows-packages',source,revision},result:'pass',steps:[{name:'complete readback',result:'pass',started:'2026-01-01T00:00:22.000Z',terminalFinished:'2026-01-01T00:00:25.000Z'}],targetSeconds:660,hardLimitSeconds:900,provisionalFinalizationReserveSeconds:15,preparationStarted:context.preparationStarted,readinessVerified:started,terminalFinished:'2026-01-01T00:00:25.000Z',preparationSeconds:17,qualificationSeconds:8,combinedSeconds:25,packages,cohort:{clock,receipts,transfers}};
 const record={source:{revision,sha256:source.sha256,files:source.files},qualification:{runId:'123',scopes:[qualificationReceipt(normalizeWindowsEvidence(gate),'windows-packages',source,revision)]}};
 // Each wire JSON is independent; a changed downloaded packet must not also
 // mutate the already accepted gate through an in-memory fixture alias.
 return JSON.parse(JSON.stringify({record,gate,build,fragments,receipts,artifacts,run:{id:123,head_sha:revision,run_attempt:2}}));
}

test('Supporting Windows evidence follows the accepted normalized gate and immutable IDs across partial reruns',()=>{
 const f=supportingFixture();assert.notEqual(releaseHash(f.gate),f.record.qualification.scopes[0].sha256);
 const newer={...f.artifacts[0],id:999,digest:'sha256:'+'f'.repeat(64)};
 assert.deepEqual(selectWindowsSupportingArtifacts({...f,artifacts:[newer,...f.artifacts]}).map(x=>x.id),[100,101]);
 assert.equal(verifyWindowsSupportingEvidence(f),true);
 assert.notEqual(windowsBuildDigest(normalizeWindowsEvidence(f.build)),f.gate.cohort.clock.buildSha256);
 const optional=structuredClone(f);optional.artifacts.forEach(a=>delete a.workflow_run);assert.equal(selectWindowsSupportingArtifacts(optional).length,2);
});

test('A canonical gate hash must grant supporting authority before any worker reference is trusted',()=>{
 for(const mutate of [x=>x.gate.cohort.transfers[0].artifact.id=999,x=>x.gate.result='fail',x=>x.gate.steps[0].result='not-run',x=>x.record.source.sha256='f'.repeat(64),x=>x.record.qualification.scopes[0].sha256=releaseHash(x.gate),x=>x.record.qualification.runId='456']){const f=supportingFixture();mutate(f);assert.throws(()=>selectWindowsSupportingArtifacts(f));}
});

test('Supporting artifact election rejects missing, expired, duplicated, foreign and changed metadata',()=>{
 for(const mutate of [x=>x.artifacts.shift(),x=>x.artifacts[0].expired=true,x=>x.artifacts.push(x.artifacts[0]),x=>x.artifacts[0].name='other',x=>x.artifacts[0].digest='sha256:'+'f'.repeat(64),x=>x.artifacts[0].size_in_bytes++,x=>x.artifacts[0].workflow_run.id=456,x=>x.artifacts[0].workflow_run.head_sha='f'.repeat(40),x=>x.run.head_sha='f'.repeat(40)]){const f=supportingFixture();mutate(f);assert.throws(()=>selectWindowsSupportingArtifacts(f));}
 const f=supportingFixture();f.gate.cohort.transfers[1].artifact.bytes=5*1024**3+1;f.artifacts[1].size_in_bytes=5*1024**3+1;f.record.qualification.scopes[0]=qualificationReceipt(normalizeWindowsEvidence(f.gate),'windows-packages',f.gate.context.source,f.record.source.revision);assert.throws(()=>selectWindowsSupportingArtifacts(f),/bound|size/i);
});

test('Worker reconstruction rejects changed clocks, fragments, observations and receipts',()=>{
 for(const mutate of [x=>x.receipts[0].clock.attempt='2',x=>x.receipts[0].result='fail',x=>x.receipts[0].steps[0].result='not-run',x=>x.fragments[0].acceptance=true,x=>x.fragments[0].fullMsiSha256='f'.repeat(64),x=>x.fragments[1].observer.path='.local/changed',x=>x.build.products[0].artifact.path='.local/changed.msi',x=>x.fragments.pop()]){
  const f=supportingFixture(),acceptedHash=releaseHash(normalizeWindowsEvidence(f.gate));
  mutate(f);assert.equal(releaseHash(normalizeWindowsEvidence(f.gate)),acceptedHash);
  assert.throws(()=>verifyWindowsSupportingEvidence(f));
 }
});

test('Historical non-cohort gates require no invented worker packets',()=>{
 const f=supportingFixture();delete f.gate.cohort;delete f.gate.packages.cohort;f.record.qualification.scopes[0]=qualificationReceipt(normalizeWindowsEvidence(f.gate),'windows-packages',f.gate.context.source,f.record.source.revision);assert.deepEqual(selectWindowsSupportingArtifacts(f),[]);
});

test('Streamed qualification archives enforce exact declared bytes/digest and scoped bounds before extraction',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'lmg-input-archive-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const bytes=Buffer.from('original ZIP transport fixture'),artifact={id:10,name:'worker',size_in_bytes:bytes.length,digest:'sha256:'+releaseHash(bytes)};
 let observed;const client={prefix:'/repos/o/r',downloadFile:async(route,target,options)=>{observed={route,options};await writeFile(target,bytes,{flag:'wx'});return {bytes:String(bytes.length),sha256:releaseHash(bytes)};}};
 const file=await downloadQualificationArtifact({client,artifact,directory,filename:'worker.zip',maxBytes:5*1024**3});assert.deepEqual(await readFile(file),bytes);assert.equal(observed.options.maxBytes,bytes.length);
 await assert.rejects(downloadQualificationArtifact({client,artifact:{...artifact,size_in_bytes:bytes.length+1},directory,filename:'short.zip',maxBytes:5*1024**3}),/size|byte/i);
 await assert.rejects(downloadQualificationArtifact({client,artifact:{...artifact,digest:'sha256:'+'f'.repeat(64)},directory,filename:'changed.zip',maxBytes:5*1024**3}),/digest/i);
 await assert.rejects(downloadQualificationArtifact({client,artifact:{...artifact,size_in_bytes:5*1024**3+1},directory,filename:'large.zip',maxBytes:5*1024**3}),/bound|size/i);
});

async function publisherInputFixture({overwriteCanonical=false}={}){
 const f=supportingFixture(),{releaseScopes}=await import('../scripts/release-record.mjs');
 const packets=new Map(),artifacts=[];
 for(const [index,campaign] of ['experience','lifecycle'].entries()){
  const bytes=Buffer.from('packet-'+campaign);
  f.artifacts[index].digest='sha256:'+releaseHash(bytes);f.artifacts[index].size_in_bytes=bytes.length;
  Object.assign(f.gate.cohort.transfers[index].artifact,{digest:f.artifacts[index].digest,bytes:bytes.length});
  packets.set(100+index,{bytes,campaign});
 }
 const canonical=new Map();
 for(const [index,scope] of releaseScopes.entries()){
  const value=scope==='windows-packages'?f.gate:{...f.gate,context:{...f.gate.context,scope}};
  if(scope!=='windows-packages'){delete value.cohort;delete value.packages;}
  canonical.set(scope,value);
  const bytes=Buffer.from('canonical-'+scope),artifact={id:10+index,name:scope+'-evidence-'+f.run.head_sha,size_in_bytes:bytes.length,digest:'sha256:'+releaseHash(bytes),expired:false};
  artifacts.push(artifact);packets.set(artifact.id,{bytes,scope});
 }
 f.record.qualification.scopes=releaseScopes.map(scope=>qualificationReceipt(normalizeWindowsEvidence(canonical.get(scope)),scope,f.gate.context.source,f.record.source.revision));
 artifacts.push(...f.artifacts);
 const downloaded=[];let verified=false;
 const client={
  fixture:true,prefix:'/repos/o/r',
  verifyQualification:async record=>{assert.deepEqual(record,f.record);verified=true;return {run:f.run};},
  json:async(method,route)=>{assert.equal(method,'GET');assert.equal(route,'/repos/o/r/actions/runs/123/artifacts?per_page=100');return {total_count:artifacts.length,artifacts};},
  downloadFile:async(route,target,options)=>{
   assert.equal(verified,true);const parts=route.split('/'),id=Number(parts.at(-2)),packet=packets.get(id);
   assert.equal(parts.at(-1),'zip');assert.ok(packet);downloaded.push(id);assert.equal(options.maxBytes,packet.bytes.length);
   await writeFile(target,packet.bytes,{flag:'wx'});return {bytes:String(packet.bytes.length),sha256:releaseHash(packet.bytes)};
  },
 };
 const extractArchive=async(file,destination)=>{
  const bytes=await readFile(file),packet=[...packets.values()].find(p=>p.bytes.equals(bytes));assert.ok(packet);
  await mkdir(destination,{recursive:true});
  if(packet.scope){
   await writeFile(path.join(destination,'ci-'+packet.scope+'.json'),JSON.stringify(canonical.get(packet.scope)));
   if(packet.scope==='windows-packages')await writeFile(path.join(destination,'windows-package-build.json'),JSON.stringify(f.build));
  }else{
   const campaign=packet.campaign;
   await writeFile(path.join(destination,'windows-campaign-'+campaign+'.json'),JSON.stringify(f.fragments.find(p=>p.campaign===campaign)));
   await writeFile(path.join(destination,'windows-campaign-'+campaign+'-qualification.json'),JSON.stringify(f.receipts.find(p=>p.context.campaign===campaign)));
   if(overwriteCanonical&&campaign==='lifecycle')await writeFile(path.join(destination,'ci-repository.json'),JSON.stringify({...canonical.get('repository'),result:'fail'}));
  }
 };
 return {...f,client,extractArchive,downloaded};
}

test('Actual publisher input orchestration retrieves both immutable workers before reassembly',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'lmg-publisher-inputs-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const f=await publisherInputFixture();
 assert.equal(await downloadQualificationInputs(f.client,f.record,directory,{extractArchive:f.extractArchive}),directory);
 assert.deepEqual(f.downloaded.slice(-2),[100,101]);
 assert.equal(JSON.parse(await readFile(path.join(directory,'.local/windows-campaign-lifecycle.json'),'utf8')).acceptance,false);
});

test('Supporting packets cannot replace accepted canonical scope authority',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'lmg-publisher-authority-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const f=await publisherInputFixture({overwriteCanonical:true});
 await assert.rejects(downloadQualificationInputs(f.client,f.record,directory,{extractArchive:f.extractArchive}),/pass|canonical|accepted/i);
 await assert.rejects(downloadQualificationInputs({...f.client,fixture:false},f.record,directory,{extractArchive:f.extractArchive}),/fixture/i);
});
