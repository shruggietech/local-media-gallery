// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const windowsCampaigns=Object.freeze(['experience','lifecycle']);
export const windowsBuildDigest=build=>createHash('sha256').update(JSON.stringify(build)).digest('hex');
export function windowsReadyName(profile,sha,attempt){
 assert.ok(windowsCampaigns.includes(profile));assert.match(sha,/^[a-f0-9]{40}$/);assert.match(String(attempt),/^[1-9][0-9]*$/);
 return `windows-${profile}-ready-${sha}-${attempt}`;
}
function contextValid(context){
 assert.match(context.revision,/^[a-f0-9]{40}$/);assert.match(context.shaLabel,/^[a-f0-9]{40}$/);
 assert.match(String(context.runId),/^[1-9][0-9]*$/);assert.match(String(context.attempt),/^[1-9][0-9]*$/);
 assert.match(context.source.sha256,/^[a-f0-9]{64}$/);assert.match(context.buildSha256,/^[a-f0-9]{64}$/);
 assert.ok(Number.isSafeInteger(context.source.files)&&context.source.files>0);assert.ok(Number.isFinite(Date.parse(context.preparationStarted)));
}
export function windowsCohortClock(context,artifacts){
 contextValid(context);
 const markers=windowsCampaigns.map(profile=>{
  const name=windowsReadyName(profile,context.shaLabel,context.attempt),matches=artifacts.filter(a=>a.name===name&&!a.expired);
  assert.equal(matches.length,1,'One current ready marker per Windows campaign required');const marker=matches[0];
  assert.ok(Number.isSafeInteger(marker.id)&&marker.id>0);const created=Date.parse(marker.created_at);assert.ok(Number.isFinite(created)&&created>=Date.parse(context.preparationStarted));
  if(marker.workflow_run){assert.equal(String(marker.workflow_run.id),String(context.runId));assert.equal(marker.workflow_run.head_sha,context.revision);}
  return {profile,id:marker.id,name,createdAt:new Date(created).toISOString()};
 });
 const ready=Math.max(...markers.map(m=>Date.parse(m.createdAt)))+15000;
 return {formatVersion:1,runId:String(context.runId),attempt:String(context.attempt),shaLabel:context.shaLabel,revision:context.revision,source:context.source,buildSha256:context.buildSha256,preparationStarted:context.preparationStarted,markers,coordinationSeconds:15,readinessVerified:new Date(ready).toISOString(),activeDeadline:new Date(ready+885000).toISOString(),hardDeadline:new Date(ready+900000).toISOString(),targetSeconds:660,hardLimitSeconds:900,provisionalFinalizationReserveSeconds:15};
}
export function validateWindowsCohortClock(clock,context){
 const artifacts=clock.markers.map(m=>({id:m.id,name:m.name,created_at:m.createdAt,expired:false,workflow_run:{id:Number(clock.runId),head_sha:clock.revision}}));
 assert.deepEqual(clock,windowsCohortClock(context,artifacts),'Windows workers must share the same source-bound absolute clock');return true;
}
export function selectWindowsCampaignArtifact(context,clock,campaign,artifacts){
 assert.ok(windowsCampaigns.includes(campaign));validateWindowsCohortClock(clock,context);
 const ready=Date.parse(clock.readinessVerified),deadline=Date.parse(clock.activeDeadline);
 // Names are reused across attempts. An earlier completed or failed packet
 // cannot satisfy this cohort while its fresh worker is still running.
 const selected=artifacts.filter(a=>a.name==='windows-'+campaign+'-evidence-'+context.shaLabel&&!a.expired&&/^sha256:[a-f0-9]{64}$/.test(a.digest??'')&&Date.parse(a.created_at)>=ready&&Date.parse(a.created_at)<deadline).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||b.id-a.id)[0];
 if(!selected)return undefined;
 assert.ok(Number.isSafeInteger(selected.id)&&selected.id>0);
 assert.ok(Number.isSafeInteger(selected.size_in_bytes)&&selected.size_in_bytes>0&&selected.size_in_bytes<=5*1024**3);
 if(selected.workflow_run){assert.equal(String(selected.workflow_run.id),String(context.runId));assert.equal(selected.workflow_run.head_sha,context.revision);}
 return selected;
}
export function combineWindowsCampaigns(build,fragments,receipts,context){
 contextValid(context);assert.equal(context.buildSha256,windowsBuildDigest(build));assert.deepEqual(context.source,build.source);assert.equal(context.revision,build.revision);
 assert.equal(fragments.length,2);assert.equal(receipts.length,2);
 const parts=new Map(),records=new Map();
 for(const part of fragments){
  assert.equal(part.kind,'windows-package-fragment');assert.ok(windowsCampaigns.includes(part.campaign));assert.equal(part.result,'pass');assert.equal(part.acceptance,false,'Partial campaigns cannot grant product acceptance');assert.equal(parts.has(part.campaign),false);
  assert.deepEqual(part.source,build.source);assert.equal(part.revision,build.revision);assert.equal(part.buildSha256,context.buildSha256);assert.equal(part.fullMsiSha256,build.products.find(p=>p.edition==='full').artifact.sha256);validateWindowsCohortClock(part.clock,context);if(build.observerProtocol==='bounded-observer-v1'){assert.equal(part.diagnostics?.protocol,'bounded-observer-v1');assert.deepEqual(part.diagnostics.context,{...context,campaign:part.campaign,clock:part.clock});assert.deepEqual(part.diagnostics.files.map(file=>file.path).sort(),['windows-campaign-checkpoints-','windows-campaign-latest-','windows-observer-checkpoint-'].map(prefix=>'.local/'+prefix+part.campaign+'.json').concat(['.local/windows-campaign-native-'+part.campaign+'.stdout.log','.local/windows-campaign-native-'+part.campaign+'.stderr.log']).sort());for(const file of part.diagnostics.files){assert.match(file.path,/^\.local\/windows-(campaign|observer)-[A-Za-z0-9.-]+$/);assert.match(file.sha256,/^[a-f0-9]{64}$/);assert.match(file.bytes,/^[0-9]+$/);}}parts.set(part.campaign,part);
 }
 for(const record of receipts){
  const campaign=record.context.campaign;assert.ok(windowsCampaigns.includes(campaign));assert.equal(records.has(campaign),false);assert.equal(record.context.scope,'windows-'+campaign);assert.deepEqual(record.context.source,build.source);assert.equal(record.context.revision,build.revision);assert.equal(record.result,'pass');assert.ok(record.steps.length>0&&record.steps.every(s=>s.result==='pass'));
  assert.equal(record.targetSeconds,660);assert.equal(record.hardLimitSeconds,900);assert.equal(record.provisionalFinalizationReserveSeconds,15);assert.ok(record.qualificationSeconds>=0&&record.qualificationSeconds<=900);
  assert.equal(record.preparationStarted,context.preparationStarted);assert.equal(record.readinessVerified,parts.get(campaign).clock.readinessVerified);
  const began=Date.parse(record.preparationStarted),ready=Date.parse(record.readinessVerified),ended=Date.parse(record.terminalFinished);
  assert.ok(Number.isFinite(ended)&&ended>=ready&&ended<=Date.parse(parts.get(campaign).clock.activeDeadline));
  assert.equal(record.preparationSeconds,(ready-began)/1000);assert.equal(record.qualificationSeconds,(ended-ready)/1000);assert.equal(record.combinedSeconds,(ended-began)/1000);
  for(const step of record.steps){const start=Date.parse(step.started),finish=Date.parse(step.terminalFinished);assert.ok(Number.isFinite(start)&&Number.isFinite(finish)&&start>=ready&&finish>=start&&finish<=ended);}
  records.set(campaign,record);
 }
 assert.deepEqual([...parts.keys()].sort(),[...windowsCampaigns].sort());assert.deepEqual([...records.keys()].sort(),[...windowsCampaigns].sort());
 const experience=parts.get('experience'),lifecycle=parts.get('lifecycle');assert.deepEqual(experience.clock,lifecycle.clock);
 for(const part of parts.values()){assert.ok(Date.parse(part.started)>=Date.parse(part.clock.readinessVerified));assert.ok(Date.parse(part.terminalFinished)>=Date.parse(part.started));assert.ok(Date.parse(part.terminalFinished)<=Date.parse(records.get(part.campaign).terminalFinished));}
 assert.equal(lifecycle.checks.length,29);assert.ok(lifecycle.checks.every(c=>c.result==='pass'));assert.equal(experience.installerChoices.length,8);assert.equal(experience.cachedMaintenance.length,2);assert.deepEqual(experience.publishedRecovery.map(r=>r.version),['0.1.0','0.2.0']);
 // This draft is deliberately non-accepting. The gate must run the complete
 // existing evidence/byte validator and source readback before publishing it.
 return {...lifecycle,kind:undefined,campaign:undefined,buildSha256:undefined,fullMsiSha256:undefined,clock:undefined,acceptance:false,started:experience.clock.readinessVerified,singleFile:experience.singleFile,installerChoices:experience.installerChoices,cachedMaintenance:experience.cachedMaintenance,publishedRecovery:experience.publishedRecovery,standardUser:experience.standardUser,ordinaryUpgrade:experience.ordinaryUpgrade,ordinaryUpgrades:experience.ordinaryUpgrades,wizardEvidence:experience.wizardEvidence,native:[...experience.native,...lifecycle.native],cohort:{clock:experience.clock,workers:windowsCampaigns.map(campaign=>({campaign,host:parts.get(campaign).host,observer:parts.get(campaign).observer,qualification:records.get(campaign)}))}};
}

// Windows does not declare POSIX modes. Read back every Windows-origin file
// and byte on the independent host without inventing a permission observation.
export function validateWindowsInputInventory(actual,expected){
 assert.ok(expected.length>0&&expected.every(file=>file.mode===null));
 assert.deepEqual(actual.map(file=>({...file,mode:null})),expected,'Complete Windows input path/size/hash inventory differs');return true;
}
export function normalizeWindowsEvidence(value){
 if(Array.isArray(value))return value.map(normalizeWindowsEvidence);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,normalizeWindowsEvidence(item)]));
 return typeof value==='string'&&value.startsWith('.local\\')?value.replaceAll('\\','/'):value;
}
