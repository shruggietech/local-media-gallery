// SPDX-License-Identifier: Apache-2.0
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
requireIsolatedDesktop();
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {root,node,execute,environment,python} from './run.mjs';
import {sourceIdentity} from './provenance.mjs';
import {collectPayload,verifyPayload} from './proof.mjs';
import {prepareCargoDependencies} from './cargo-readiness.mjs';
import {prepareMediaTool} from './prepare-media-tool.mjs';
import {qualification} from './qualification.mjs';
import {joinedChecks} from './joined-checks.mjs';
import {verifyMsiCommandReadiness} from './windows-msi-command.mjs';
import {prepareWindowsDiagnosticFixtures} from './windows-package-fixtures.mjs';
import {validatePackageEvidence,validateSingleFileWindows} from './windows-package-evidence.mjs';
import {windowsCampaigns,windowsBuildDigest,windowsReadyName,windowsCohortClock,validateWindowsCohortClock,combineWindowsCampaigns} from './windows-package-cohort.mjs';

const [operation,campaign]=process.argv.slice(2),local=path.join(root,'.local'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.ok(['build','prepare','run','gate'].includes(operation));if(['prepare','run'].includes(operation))assert.ok(windowsCampaigns.includes(campaign));
const json=async name=>JSON.parse(await readFile(path.join(local,name),'utf8'));
const save=(name,value)=>writeFile(path.join(local,name),JSON.stringify(value,null,2)+'\n');
const revision=async()=>(await promisify(execFile)('git',['rev-parse','HEAD'],{cwd:root,windowsHide:true,shell:false})).stdout.trim();
await mkdir(local,{recursive:true});

async function inputs(verify=false){
 const info=await json('windows-package-inputs.json'),raw=await readFile(path.join(local,'windows-package-build.json')),build=JSON.parse(raw);
 assert.equal(info.kind,'windows-package-inputs');assert.equal(info.result,'ready');assert.deepEqual(info.source,await sourceIdentity());assert.equal(info.revision,await revision());
 assert.equal(info.workspace.toLowerCase(),root.toLowerCase(),'Shared Windows inputs require the same workspace namespace');assert.match(info.directory,/^\.local\/windows-packages-[A-Za-z0-9_-]+$/);assert.equal(info.directory,build.directory);assert.equal(info.rawBuildSha256,hash(raw));assert.equal(info.buildSha256,windowsBuildDigest(build));assert.deepEqual(build.source,info.source);assert.equal(build.revision,info.revision);
 if(verify)await verifyPayload(path.join(root,info.directory),info.inventory);
 const context={source:info.source,revision:info.revision,shaLabel:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,buildSha256:info.buildSha256,preparationStarted:info.preparationStarted};
 assert.equal(String(info.runId),String(context.runId));
 return {info,build,context};
}
function runtimeEnvironment(build){return {...environment,LMG_RUNTIME_INPUT:path.resolve(root,build.runtimeInput.path),LMG_RUNTIME_SHA256:build.runtimeInput.sha256};}
async function api(route){
 assert.ok(process.env.GH_TOKEN,'Actions read token required');const repository=process.env.GITHUB_REPOSITORY;assert.match(repository,/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
 const response=await fetch('https://api.github.com/repos/'+repository+route,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Actions readiness API returned '+response.status);return response.json();
}
async function commonClock(context,ready){
 const run=await api('/actions/runs/'+context.runId);assert.equal(run.head_sha,context.revision);assert.equal(String(run.run_attempt),String(context.attempt));
 const end=Date.now()+900000;
 while(Date.now()<end){
  const artifacts=(await api('/actions/runs/'+context.runId+'/artifacts?per_page=100')).artifacts;
  if(windowsCampaigns.every(role=>artifacts.some(a=>a.name===windowsReadyName(role,context.shaLabel,context.attempt)&&!a.expired))){
   const clock=windowsCohortClock(context,artifacts);assert.ok(Date.parse(ready.verifiedAt)<=Date.parse(clock.readinessVerified));
   const delay=Date.parse(clock.readinessVerified)-Date.now();if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));return clock;
  }
  await new Promise(resolve=>setTimeout(resolve,5000));
 }
 throw Error('Both fresh Windows workers must finish preparation for the same attempt; inherited fragments cannot restart a cohort');
}

if(operation==='build'){
 const preparationStarted=new Date(process.env.CI_PREPARATION_STARTED??Date.now()).toISOString(),source=await sourceIdentity(),head=await revision();
 await node(path.join(root,'scripts/build-windows-packages.mjs'));
 const raw=await readFile(path.join(local,'windows-package-build.json')),build=JSON.parse(raw);assert.deepEqual(build.source,source);assert.equal(build.revision,head);assert.deepEqual(await sourceIdentity(),source);
 await copyFile(path.join(root,'target/release/gallery-preparation.exe'),path.join(root,build.directory,'preparation-driver.exe'));
 await save('windows-package-inputs.json',{formatVersion:1,kind:'windows-package-inputs',result:'ready',source,revision:head,runId:process.env.GITHUB_RUN_ID,workspace:root,directory:build.directory,buildSha256:windowsBuildDigest(build),rawBuildSha256:hash(raw),preparationStarted,ready:new Date().toISOString(),inventory:await collectPayload(path.join(root,build.directory))});
}else if(operation==='prepare'){
 const {build,context}=await inputs(true),msiCommandReadiness=await verifyMsiCommandReadiness({root,env:environment});
 const mediaTool=campaign==='experience'?await prepareMediaTool({download:true}):null;
 await mkdir(path.join(root,'target/release'),{recursive:true});await copyFile(path.join(root,build.directory,'preparation-driver.exe'),path.join(root,'target/release/gallery-preparation.exe'));
 if(campaign==='lifecycle'){
  await prepareCargoDependencies();const env=runtimeEnvironment(build);
  for(const profile of [[],['--release']])await execute('cargo',['test',...profile,'--locked','-p','gallery-windows-package','-p','gallery-update','--no-run'],{env});
 }
 const fixtures=await prepareWindowsDiagnosticFixtures({root,build,extract:(archive,destination,inventory)=>execute(python,[path.join(root,'scripts/proof-archive.py'),'extract',archive,destination,inventory])});
 await save('windows-package-fixtures-'+campaign+'.json',fixtures);
 await save('windows-campaign-ready-'+campaign+'.json',{formatVersion:1,campaign,context,verifiedAt:new Date().toISOString(),msiCommandReadiness,mediaTool});
}else if(operation==='run'){
 const {build,context}=await inputs(),ready=await json('windows-campaign-ready-'+campaign+'.json');assert.equal(ready.campaign,campaign);assert.deepEqual(ready.context,context);
 let clock,concurrentChecks;const env=runtimeEnvironment(build);
 const record=await qualification({preparationStartedAt:Date.parse(context.preparationStarted),readinessVerifiedAt:prepared=>Date.parse(prepared.cohortClock.readinessVerified),identify:async()=>({scope:'windows-'+campaign,campaign,source:context.source,revision:context.revision}),prepare:async()=>{clock=await commonClock(context,ready);await save('windows-campaign-clock-'+campaign+'.json',clock);return {cohortClock:clock};},steps:[
  ...(campaign==='lifecycle'?[{name:'Exact published MSI administrative retention in isolated protected storage',run:()=>execute('cargo',['test','--release','--locked','-p','gallery-update','actual_native_admin_retention','--','--ignored'],{env:{...env,GALLERY_MSI_ADMIN_DESCRIPTOR:path.join(root,build.publishedPredecessor.directory,'machine.msi.update.json'),GALLERY_MSI_ADMIN_FAILURE:path.join(local,'windows-admin-retention-failure.log'),GALLERY_MSI_ADMIN_LOG:path.join(local,'windows-admin-retention-native.log')}})}]:[]),
  {name:campaign==='experience'?'Actual offline MSI, standard user, wizard, choices, cached repair and published recovery':'Joined Windows ownership units and ordinary Full/Lite lifecycle',run:async()=>{
   const actual=()=>node(path.join(root,'scripts/test-windows-packages.mjs'),[],{env:{...environment,GALLERY_WINDOWS_CAMPAIGN:campaign,GALLERY_WINDOWS_COHORT_FILE:path.join(local,'windows-campaign-clock-'+campaign+'.json')}});
   if(campaign==='experience'){await actual();return;}
   concurrentChecks=await joinedChecks([{name:'Windows package native ownership units',run:async()=>{
    await execute('cargo',['test','--locked','-p','gallery-windows-package','-p','gallery-update'],{env});
    const pairs=build.upgrades.pairs.filter(p=>p.edition==='full').map(p=>[path.resolve(root,path.dirname(p.from.path),p.from.descriptor.native.installer.path),path.resolve(root,path.dirname(p.to.path),p.to.descriptor.native.installer.path)]);
    await execute('cargo',['test','--release','--locked','-p','gallery-windows-package','actual_native_','--','--ignored'],{env:{...env,GALLERY_MSI_LAYOUT_PAIRS:JSON.stringify([...new Map(pairs.map(pair=>[JSON.stringify(pair),pair])).values()])}});
   }},{name:'Actual ordinary Full/Lite install, native use, collision and selective removal',run:actual}]);
   if(concurrentChecks.result!=='pass')throw Error(concurrentChecks.checks.filter(c=>c.result!=='pass').map(c=>c.name+': '+c.failure).join('; '));
  }},
  {name:'Independent source, shared recipient bytes and governed kit readback',run:async()=>{
   const fragment=await json('windows-campaign-'+campaign+'.json');assert.equal(fragment.result,'pass');assert.equal(fragment.acceptance,false);assert.deepEqual(fragment.clock,clock);assert.deepEqual(fragment.source,context.source);assert.equal(fragment.revision,context.revision);
   for(const product of build.products){const bytes=await readFile(path.join(root,product.artifact.path));assert.equal(hash(bytes),product.artifact.sha256);assert.equal(String(bytes.length),product.artifact.bytes);}
   if(campaign==='experience')validateSingleFileWindows(build,fragment);
   assert.deepEqual(await sourceIdentity(),context.source);await node(path.join(root,'scripts/sync-brand-kit.mjs'),['--verify']);
  }}
 ]});
 record.clock=clock;record.concurrentChecks=concurrentChecks;record.msiCommandReadiness=ready.msiCommandReadiness;record.mediaTool=ready.mediaTool;
 try{await copyFile(path.join(local,'windows-package-failure.json'),path.join(local,'windows-campaign-failure-'+campaign+'.json'));}catch(error){if(error.code!=='ENOENT')throw error;}
 await save('windows-campaign-'+campaign+'-qualification.json',record);console.log(JSON.stringify(record,null,2));if(record.result!=='pass')process.exitCode=1;
}else{
 const {info,build,context}=await inputs(),fragments=await Promise.all(windowsCampaigns.map(role=>json('windows-campaign-'+role+'.json'))),receipts=await Promise.all(windowsCampaigns.map(role=>json('windows-campaign-'+role+'-qualification.json')));
 const clock=fragments[0].clock;validateWindowsCohortClock(clock,context);let combined;
 const record=await qualification({preparationStartedAt:Date.parse(context.preparationStarted),readinessVerifiedAt:()=>Date.parse(clock.readinessVerified),identify:async()=>({scope:'windows-packages',source:context.source,revision:context.revision}),prepare:async()=>{},steps:[
  {name:'Both isolated Windows campaigns share one source, recipient and absolute clock',run:async()=>{combined=combineWindowsCampaigns(build,fragments,receipts,context);await verifyPayload(path.join(root,info.directory),info.inventory);}},
  {name:'Independent complete package, native, retained-source and governed-byte readback',run:async()=>{await validatePackageEvidence(build,{...combined,acceptance:true},root);assert.deepEqual(await sourceIdentity(),context.source);await node(path.join(root,'scripts/sync-brand-kit.mjs'),['--verify']);}}
 ]});
 if(record.result==='pass'){
  combined.acceptance=true;combined.terminalFinished=record.terminalFinished;await save('windows-package-results.json',combined);
  record.packages=combined;record.artifacts=build.products.map(p=>p.artifact);record.internalCampaignArchives=build.records.map(r=>r.archive);
 }
 record.cohort={clock,receipts};record.concurrentChecks=receipts.find(r=>r.context.campaign==='lifecycle').concurrentChecks;
 await save('ci-windows-packages.json',record);console.log(JSON.stringify(record,null,2));if(record.result!=='pass')process.exitCode=1;
}
