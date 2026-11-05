// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,mkdir,rename,lstat} from 'node:fs/promises';
import path from 'node:path';
import {root,python,execute} from './run.mjs';
import {latestQualificationArtifact} from './github-release.mjs';
import {releaseScopes,releaseHash} from './release-record.mjs';
import {qualificationReceipt,retainedPath} from './release-assembly.mjs';
import {windowsCampaigns,validateWindowsCohortClock,combineWindowsCampaigns,normalizeWindowsEvidence} from './windows-package-cohort.mjs';

const canonicalBound=4*1024**3,supportBound=5*1024**3;
function bindReceipt(record,receipt,scope){
 const value=normalizeWindowsEvidence(receipt),expected=record.qualification.scopes.filter(row=>row.scope===scope);
 assert.equal(expected.length,1,'Exactly one accepted canonical scope required');
 assert.equal(value.context.source.sha256,record.source.sha256);assert.equal(value.context.source.files,record.source.files);
 assert.equal(value.targetSeconds,660);
 assert.deepEqual(qualificationReceipt(value,scope,value.context.source,record.source.revision),expected[0],'Canonical qualification receipt differs from accepted candidate');
 return value;
}
function bindWindowsGate(record,gate,run){
 const value=bindReceipt(record,gate,'windows-packages');
 assert.equal(String(run.id),record.qualification.runId);assert.equal(run.head_sha,record.source.revision);
 if(value.cohort===undefined){assert.equal(value.packages?.cohort,undefined,'Missing supporting cohort authority');return {value,clock:null};}
 const clock=value.cohort.clock;
 validateWindowsCohortClock(clock,{source:value.context.source,revision:record.source.revision,runId:record.qualification.runId,shaLabel:clock.shaLabel,attempt:clock.attempt,buildSha256:clock.buildSha256,preparationStarted:value.preparationStarted});
 assert.equal(clock.readinessVerified,value.readinessVerified);assert.equal(value.packages.acceptance,true);assert.equal(value.packages.terminalFinished,value.terminalFinished);
 assert.ok(Array.isArray(value.cohort.transfers)&&value.cohort.transfers.length===windowsCampaigns.length);
 assert.ok(Array.isArray(value.cohort.receipts)&&value.cohort.receipts.length===windowsCampaigns.length);
 return {value,clock};
}
function artifactSize(artifact,bound){
 assert.ok(Number.isSafeInteger(artifact.id)&&artifact.id>0,'Invalid artifact identity');
 assert.match(artifact.digest,/^sha256:[a-f0-9]{64}$/);
 assert.ok(Number.isSafeInteger(artifact.size_in_bytes)&&artifact.size_in_bytes>0&&artifact.size_in_bytes<=bound,'Artifact size exceeds elected bound');
 return artifact.size_in_bytes;
}
export function selectWindowsSupportingArtifacts({record,gate,artifacts,run}){
 const {value,clock}=bindWindowsGate(record,gate,run);if(!clock)return [];
 const selected=[],ids=new Set();
 for(const campaign of windowsCampaigns){
  const transfers=value.cohort.transfers.filter(t=>t.campaign===campaign);assert.equal(transfers.length,1,'One supporting transfer per campaign required');
  const transfer=transfers[0];assert.deepEqual(transfer.clock,clock,'Supporting transfer clock differs');
  const observed=Date.parse(transfer.observed);assert.ok(Number.isFinite(observed)&&observed>=Date.parse(clock.readinessVerified)&&observed<Date.parse(clock.activeDeadline)&&observed<=Date.parse(value.terminalFinished));
  const reference=transfer.artifact;assert.ok(reference&&!ids.has(reference.id),'Duplicate supporting artifact identity');ids.add(reference.id);
  assert.equal(reference.name,'windows-'+campaign+'-evidence-'+clock.shaLabel);
  const matches=artifacts.filter(a=>a.id===reference.id);assert.equal(matches.length,1,'Missing or duplicate exact supporting artifact');
  const artifact=matches[0];assert.equal(artifact.expired,false,'Supporting artifact expired');
  assert.equal(artifact.name,reference.name);assert.equal(artifact.digest,reference.digest,'Supporting artifact digest differs');
  assert.equal(artifactSize(artifact,supportBound),reference.bytes,'Supporting artifact size differs');
  // The run-scoped list establishes membership; workflow_run is optional in
  // GitHub's schema, but any supplied provenance must agree.
  if(artifact.workflow_run!=null){assert.equal(String(artifact.workflow_run.id),String(run.id));assert.equal(artifact.workflow_run.head_sha,record.source.revision);}
  selected.push(artifact);
 }
 return selected;
}
export function verifyWindowsSupportingEvidence({record,gate,build,fragments,receipts,run}){
 const {value,clock}=bindWindowsGate(record,gate,run);assert.ok(clock,'Supporting evidence requires accepted cohort authority');
 assert.equal(fragments.length,windowsCampaigns.length);assert.equal(receipts.length,windowsCampaigns.length);
 for(const campaign of windowsCampaigns){
  const actual=receipts.filter(r=>r.context.campaign===campaign),expected=value.cohort.receipts.filter(r=>r.context.campaign===campaign);
  assert.equal(actual.length,1);assert.equal(expected.length,1);assert.deepEqual(normalizeWindowsEvidence(actual[0]),expected[0],'Downloaded worker receipt differs from accepted gate');
 }
 const context={source:gate.context.source,revision:record.source.revision,runId:record.qualification.runId,shaLabel:clock.shaLabel,attempt:clock.attempt,buildSha256:clock.buildSha256,preparationStarted:clock.preparationStarted};
 // Build digest and fragment reconstruction use original Windows JSON. Only
 // comparison with the accepted cross-platform scope uses path normalization.
 const draft=combineWindowsCampaigns(build,fragments,receipts,context);
 const reconstructed=JSON.parse(JSON.stringify({...draft,acceptance:true,terminalFinished:value.packages.terminalFinished}));
 assert.deepEqual(normalizeWindowsEvidence(reconstructed),value.packages,'Downloaded Windows packets do not reconstruct accepted package evidence');return true;
}
export async function downloadQualificationArtifact({client,artifact,directory,filename,maxBytes=canonicalBound}){
 const size=artifactSize(artifact,maxBytes);assert.match(filename,/^[a-z0-9][a-z0-9-]*[.]zip$/);await mkdir(directory,{recursive:true});
 const file=path.join(directory,filename),partial=file+'.partial';
 try{await lstat(file);throw Error('Retained archive already exists');}catch(error){if(error.code!=='ENOENT')throw error;}
 const archive=await client.downloadFile(client.prefix+'/actions/artifacts/'+artifact.id+'/zip',partial,{maxBytes:size,timeoutMs:300000});
 const actual=await lstat(partial);assert.ok(actual.isFile()&&!actual.isSymbolicLink()&&actual.nlink===1,'Redirected retained archive');
 assert.equal(archive.bytes,String(size),'CI archive byte size differs');assert.equal(actual.size,size,'Retained archive byte size differs');
 assert.equal('sha256:'+archive.sha256,artifact.digest,'CI artifact digest differs');await rename(partial,file);return file;
}
async function evidenceJson(directory,name){
 const file=await retainedPath(directory,'.local/'+name),info=await lstat(file);assert.ok(info.isFile()&&info.size<=64*1024**2,'Oversized or nonregular evidence JSON');
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readFile(file)));
}
export async function downloadQualificationInputs(client,record,directory,{extractArchive}={}){
 assert.ok(!extractArchive||client.fixture,'Injected extraction is fixture-only');
 const verified=await client.verifyQualification(record),run=verified.run;
 const all=await client.json('GET',client.prefix+'/actions/runs/'+run.id+'/artifacts?per_page=100');assert.ok(all.total_count<=100);
 const local=path.join(directory,'.local');await mkdir(local,{recursive:true});
 const extract=extractArchive??((file,destination)=>execute(python,[path.join(root,'scripts/extract-release-evidence.py'),file,destination]));
 for(const scope of releaseScopes){
  const artifact=latestQualificationArtifact(all.artifacts,scope+'-evidence-'+run.head_sha);
  const file=await downloadQualificationArtifact({client,artifact,directory,filename:scope+'.zip'});await extract(file,local);
 }
 const gate=await evidenceJson(directory,'ci-windows-packages.json');
 const supporting=selectWindowsSupportingArtifacts({record,gate,artifacts:all.artifacts,run});
 for(const artifact of supporting){
  const file=await downloadQualificationArtifact({client,artifact,directory,filename:'support-'+artifact.id+'.zip',maxBytes:supportBound});await extract(file,local);
 }
 // Supporting ZIPs cannot replace canonical scope authority during hydration.
 for(const scope of releaseScopes)bindReceipt(record,await evidenceJson(directory,'ci-'+scope+'.json'),scope);
 if(supporting.length){
  const build=await evidenceJson(directory,'windows-package-build.json');
  const fragments=await Promise.all(windowsCampaigns.map(c=>evidenceJson(directory,'windows-campaign-'+c+'.json')));
  const receipts=await Promise.all(windowsCampaigns.map(c=>evidenceJson(directory,'windows-campaign-'+c+'-qualification.json')));
  verifyWindowsSupportingEvidence({record,gate,build,fragments,receipts,run});
 }
 return directory;
}
