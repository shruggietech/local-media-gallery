// SPDX-License-Identifier: Apache-2.0
import {verifyMsiCommandReadiness} from './windows-msi-command.mjs';
import {prepareWindowsDiagnosticFixtures} from './windows-package-fixtures.mjs';
import {prepareCargoDependencies} from './cargo-readiness.mjs';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
requireIsolatedDesktop();
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,lstat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {root,node,execute,environment,python} from './run.mjs';
import {sourceIdentity} from './provenance.mjs';
import {qualification} from './qualification.mjs';
import {validatePackageEvidence} from './windows-package-evidence.mjs';
import {joinedChecks} from './joined-checks.mjs';
await mkdir(path.join(root,'.local'),{recursive:true});let build,concurrentChecks,diagnosticFixtures,msiCommandReadiness,runtimeTestEnvironment;
const record=await qualification({
 identify:async()=>({scope:'windows-packages',source:await sourceIdentity(),revision:(await promisify(execFile)('git',['rev-parse','HEAD'],{cwd:root,windowsHide:true})).stdout.trim()}),
 prepare:async context=>{msiCommandReadiness=await verifyMsiCommandReadiness({root,env:environment});await prepareCargoDependencies();await node(path.join(root,'scripts/build-windows-packages.mjs'));build=JSON.parse(await readFile(path.join(root,'.local/windows-package-build.json')));assert.deepEqual(build.source,context.source);assert.equal(build.revision,context.revision);runtimeTestEnvironment={...environment,LMG_RUNTIME_INPUT:path.resolve(root,build.runtimeInput.path),LMG_RUNTIME_SHA256:build.runtimeInput.sha256};await execute('cargo',['test','--locked','-p','gallery-windows-package','-p','gallery-update','--no-run'],{env:runtimeTestEnvironment});diagnosticFixtures=await prepareWindowsDiagnosticFixtures({root,build,extract:(archive,destination,inventory)=>execute(python,[path.join(root,'scripts/proof-archive.py'),'extract',archive,destination,inventory])});},
 steps:[
  {name:'Exact published MSI administrative retention in isolated protected storage',run:()=>execute('cargo',['test','--locked','-p','gallery-update','actual_native_admin_retention','--','--ignored'],{env:{...runtimeTestEnvironment,GALLERY_MSI_ADMIN_DESCRIPTOR:path.join(root,build.publishedPredecessor.directory,'machine.msi.update.json'),GALLERY_MSI_ADMIN_FAILURE:path.join(root,'.local/windows-admin-retention-failure.log'),GALLERY_MSI_ADMIN_LOG:path.join(root,'.local/windows-admin-retention-native.log')}})},
  {name:'Targeted exact published MSI recovery diagnostic',run:()=>node(path.join(root,'scripts/test-windows-packages.mjs'),['--recovery-probe'])},
  {name:'Joined Windows ownership units and actual ordinary package campaign',run:async()=>{
   // Units mutate unique disposable roots and MSI copies. Actual prepared MSIs
   // are read-only inputs; these units never install or share a native window.
   // Both branches retain the same absolute qualification process deadline.
   concurrentChecks=await joinedChecks([
    {name:'Windows package native ownership units',run:async()=>{await execute('cargo',['test','--locked','-p','gallery-windows-package','-p','gallery-update'],{env:runtimeTestEnvironment});const physicalPairs=build.upgrades.pairs.filter(p=>p.edition==='full').map(p=>[path.resolve(root,path.dirname(p.from.path),p.from.descriptor.native.installer.path),path.resolve(root,path.dirname(p.to.path),p.to.descriptor.native.installer.path)]);const pairs=JSON.stringify([...new Map(physicalPairs.map(pair=>[JSON.stringify(pair),pair])).values()]);await execute('cargo',['test','--locked','-p','gallery-windows-package','actual_native_','--','--ignored'],{env:{...runtimeTestEnvironment,GALLERY_MSI_LAYOUT_PAIRS:pairs}});}},
    {name:'Actual ordinary Full/Lite install, native use, collision and selective removal',run:()=>node(path.join(root,'scripts/test-windows-packages.mjs'))},
   ]);
   if(concurrentChecks.result!=='pass')throw Error(concurrentChecks.checks.filter(check=>check.result!=='pass').map(check=>check.name+': '+check.failure).join('; '));
  }},
  {name:'Independent exact-source package/native receipt and governed bytes read-back',run:async()=>{const result=JSON.parse(await readFile(path.join(root,'.local/windows-package-results.json')));await validatePackageEvidence(build,result,root);assert.deepEqual(await sourceIdentity(),recordContextSource());await node(path.join(root,'scripts/sync-brand-kit.mjs'),['--verify']);}},
 ]
});
record.msiCommandReadiness=msiCommandReadiness;record.concurrentChecks=concurrentChecks;record.diagnosticFixtureReadiness=diagnosticFixtures;
function recordContextSource(){return build.source;}
if(process.env.CI_PREPARATION_STARTED){const start=new Date(process.env.CI_PREPARATION_STARTED).getTime();assert.ok(start<=new Date(record.preparationStarted).getTime());record.preparationStarted=new Date(start).toISOString();record.preparationSeconds=((new Date(record.readinessVerified??record.terminalFinished).getTime())-start)/1000;record.combinedSeconds=(new Date(record.terminalFinished).getTime()-start)/1000;}
if(record.result==='pass'){record.packages=JSON.parse(await readFile(path.join(root,'.local/windows-package-results.json')));record.artifacts=build.products.map(p=>p.artifact);record.internalCampaignArchives=build.records.map(r=>r.archive);}
if(record.result!=='pass'){
 let detail=record.failure??record.result;
 try{const file=path.join(root,'.local/windows-package-failure.json');const entry=await lstat(file);if(entry.isFile()&&!entry.isSymbolicLink()&&entry.size<=1024*1024){const failed=JSON.parse(await readFile(file,'utf8'));detail+='\n'+String(failed.error??'').slice(0,3000);}}catch{}
 const message=detail.slice(0,4096).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
 console.error('::error title=Windows package qualification::'+message);
}
await writeFile(path.join(root,'.local/ci-windows-packages.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record,null,2));if(record.result!=='pass')process.exitCode=1;
