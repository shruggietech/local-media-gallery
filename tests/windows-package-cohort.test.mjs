// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {windowsCohortClock,validateWindowsCohortClock,windowsReadyName,windowsBuildDigest,selectWindowsCampaignArtifact,combineWindowsCampaigns,validateWindowsInputInventory,normalizeWindowsEvidence} from '../scripts/windows-package-cohort.mjs';
import {qualification} from '../scripts/qualification.mjs';
const source={sha256:'a'.repeat(64),files:3},revision='b'.repeat(40),build={source,revision,products:[{edition:'full',artifact:{sha256:'c'.repeat(64)}}]};
const context={source,revision,shaLabel:'d'.repeat(40),runId:'123',attempt:'2',buildSha256:windowsBuildDigest(build),preparationStarted:'2026-01-01T00:00:00.000Z'};
const artifacts=['experience','lifecycle'].map((profile,index)=>({id:index+1,name:windowsReadyName(profile,context.shaLabel,context.attempt),created_at:`2026-01-01T00:00:0${index+1}Z`,expired:false,workflow_run:{id:123,head_sha:revision}}));
function fixture(){
 const clock=windowsCohortClock(context,artifacts),started=clock.readinessVerified,terminal='2026-01-01T00:00:20.000Z';
 const fragments=['experience','lifecycle'].map(campaign=>({formatVersion:1,kind:'windows-package-fragment',campaign,result:'pass',acceptance:false,source,revision,buildSha256:context.buildSha256,fullMsiSha256:'c'.repeat(64),clock,started,terminalFinished:terminal,native:[],host:{platform:'win32'},observer:{},checks:Array.from({length:29},()=>({result:'pass'})),installerChoices:Array(8).fill({}),cachedMaintenance:[{},{}],ordinaryUpgrade:{kind:'published-legacy-ordinary-msi-upgrade',result:'pass'},publishedRecovery:[{version:'0.1.0'},{version:'0.2.0'}]}));
 const receipts=['experience','lifecycle'].map(campaign=>({context:{scope:'windows-'+campaign,campaign,source,revision},result:'pass',steps:[{result:'pass',started,terminalFinished:terminal}],targetSeconds:660,hardLimitSeconds:900,provisionalFinalizationReserveSeconds:15,preparationStarted:context.preparationStarted,readinessVerified:started,terminalFinished:terminal,preparationSeconds:17,qualificationSeconds:3,combinedSeconds:20}));
 return {clock,fragments,receipts};
}
test('Both Windows workers derive one immutable source-bound deadline after readiness',()=>{
 const clock=windowsCohortClock(context,artifacts);assert.equal(clock.readinessVerified,'2026-01-01T00:00:17.000Z');assert.equal(clock.activeDeadline,'2026-01-01T00:15:02.000Z');assert.equal(clock.hardDeadline,'2026-01-01T00:15:17.000Z');assert.equal(validateWindowsCohortClock(clock,context),true);
 for(const change of [{hardLimitSeconds:1800},{readinessVerified:'2026-01-01T00:00:18.000Z'},{revision:'e'.repeat(40)}])assert.throws(()=>validateWindowsCohortClock({...clock,...change},context));
});
test('Ready markers reject missing, duplicate, stale-attempt and foreign-run inputs',()=>{
 for(const markers of [artifacts.slice(0,1),[...artifacts,artifacts[0]],artifacts.map(a=>({...a,name:a.name.replace(/-2$/,'-1')})),artifacts.map(a=>({...a,workflow_run:{id:999,head_sha:revision}}))])assert.throws(()=>windowsCohortClock(context,markers));
});
test('A retried gate waits past retained same-name packets until its current worker uploads',()=>{
 const {clock}=fixture(),name='windows-lifecycle-evidence-'+context.shaLabel;
 const stale={id:50,name,created_at:context.preparationStarted,expired:false,digest:'sha256:'+'e'.repeat(64),size_in_bytes:1024,workflow_run:{id:123,head_sha:revision}};
 assert.equal(selectWindowsCampaignArtifact(context,clock,'lifecycle',[stale]),undefined);
 const current={...stale,id:51,created_at:'2026-01-01T00:00:20.000Z'};
 assert.equal(selectWindowsCampaignArtifact(context,clock,'lifecycle',[current,stale]),current);
 // Even misleading ID order cannot make a packet from before readiness fresh.
 assert.equal(selectWindowsCampaignArtifact(context,clock,'lifecycle',[current,{...stale,id:99}]),current);
});
test('Worker transfer selection retains the shared deadline, provider provenance and immutable identity',()=>{
 const {clock}=fixture(),packet={id:51,name:'windows-experience-evidence-'+context.shaLabel,created_at:clock.readinessVerified,expired:false,digest:'sha256:'+'e'.repeat(64),size_in_bytes:1024,workflow_run:{id:123,head_sha:revision}};
 assert.equal(selectWindowsCampaignArtifact(context,clock,'experience',[packet]),packet);
 for(const change of [{created_at:clock.activeDeadline},{created_at:'not-a-time'},{expired:true},{digest:null},{name:'windows-lifecycle-evidence-'+context.shaLabel}])assert.equal(selectWindowsCampaignArtifact(context,clock,'experience',[{...packet,...change}]),undefined);
 const later={...packet,id:52,created_at:'2026-01-01T00:00:21.000Z'};assert.equal(selectWindowsCampaignArtifact(context,clock,'experience',[packet,later]).id,52);
 for(const change of [{id:0},{size_in_bytes:0},{size_in_bytes:5*1024**3+1},{workflow_run:{id:999,head_sha:revision}},{workflow_run:{id:123,head_sha:'f'.repeat(40)}}])assert.throws(()=>selectWindowsCampaignArtifact(context,clock,'experience',[{...packet,...change}]));
 assert.throws(()=>selectWindowsCampaignArtifact(context,{...clock,attempt:'1'},'experience',[packet]));
 assert.throws(()=>selectWindowsCampaignArtifact(context,clock,'other',[packet]));
});
test('Campaign reconciliation remains non-accepting until complete byte validation',()=>{
 const {fragments,receipts}=fixture();const combined=combineWindowsCampaigns(build,fragments,receipts,context);assert.equal(combined.acceptance,false);assert.equal(combined.cohort.workers.length,2);assert.equal(combined.checks.length,29);assert.deepEqual(combined.ordinaryUpgrade,fragments.find(f=>f.campaign==='experience').ordinaryUpgrade);
});
test('Reconciliation rejects partial, mixed-source, mixed-build, mixed-clock and failed campaigns',()=>{
 for(const mutate of [x=>x.fragments.pop(),x=>x.fragments[1].campaign='experience',x=>x.fragments[0].acceptance=true,x=>x.fragments[0].source={...source,sha256:'f'.repeat(64)},x=>x.fragments[0].buildSha256='f'.repeat(64),x=>x.fragments[0].clock={...x.fragments[0].clock,activeDeadline:'2026-01-01T00:16:00.000Z'},x=>x.receipts[0].result='fail',x=>x.fragments[1].checks.pop(),x=>x.receipts[0].qualificationSeconds=0,x=>x.receipts[0].steps[0].started=context.preparationStarted,x=>x.receipts[0].terminalFinished='2026-01-01T00:16:00.000Z']){const value=structuredClone(fixture());mutate(value);assert.throws(()=>combineWindowsCampaigns(build,value.fragments,value.receipts,context));}
});
test('A late gate includes elapsed worker and transport time instead of restarting qualification',async()=>{
 let clock=800000;const record=await qualification({now:()=>clock,preparationStartedAt:0,readinessVerifiedAt:()=>100000,identify:async()=>({scope:'windows-packages'}),prepare:async()=>{},steps:[{name:'readback',run:async()=>{clock=810000;}}]});
 assert.equal(record.preparationSeconds,100);assert.equal(record.qualificationSeconds,710);assert.equal(record.combinedSeconds,810);assert.equal(record.targetAdvisory,true);assert.equal(record.result,'pass');assert.equal(record.terminalFinished,new Date(810000).toISOString());
 clock=990000;let ran=false;const expired=await qualification({now:()=>clock,preparationStartedAt:0,readinessVerifiedAt:()=>100000,prepare:async()=>{},steps:[{name:'readback',run:async()=>{ran=true;}}]});assert.equal(expired.result,'timeout');assert.equal(expired.qualificationSeconds,890);assert.equal(ran,false);
});
test('Shared readiness cannot precede preparation or move into the future',async()=>{
 for(const ready of [50,300]){let ran=false;const record=await qualification({now:()=>200,preparationStartedAt:100,readinessVerifiedAt:()=>ready,prepare:async()=>{},steps:[{name:'native',run:async()=>{ran=true;}}]});assert.equal(record.result,'preparation-failed');assert.equal(ran,false);assert.equal(record.qualificationSeconds,0);}
});

test('Independent Windows readback preserves the complete byte inventory without claiming POSIX permissions',()=>{
 const expected=[{path:'application.msi',bytes:'4',sha256:'a'.repeat(64),mode:null}];
 assert.equal(validateWindowsInputInventory([{...expected[0],mode:'644'}],expected),true);
 for(const actual of [[],[{...expected[0],sha256:'b'.repeat(64)}],[{...expected[0],bytes:'5'}],[{...expected[0],path:'other.msi'}],[...expected,expected[0]]])assert.throws(()=>validateWindowsInputInventory(actual,expected));
 assert.throws(()=>validateWindowsInputInventory(expected,[{...expected[0],mode:'755'}]));
});
test('Independent readback normalizes only retained relative Windows paths without rewriting native observations',()=>{
 const value={path:'.local\\evidence\\file.log',logs:['.local\\scope\\a.log'],native:'C:\\Owner\\App',source:{sha256:'a'.repeat(64)}};
 const normalized=normalizeWindowsEvidence(value);assert.equal(normalized.path,'.local/evidence/file.log');assert.deepEqual(normalized.logs,['.local/scope/a.log']);assert.equal(normalized.native,value.native);assert.equal(value.path,'.local\\evidence\\file.log');
});
