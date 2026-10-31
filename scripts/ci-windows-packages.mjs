// SPDX-License-Identifier: Apache-2.0
import {prepareCargoDependencies} from './cargo-readiness.mjs';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
requireIsolatedDesktop();
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {root,node,cargo,execute,environment} from './run.mjs';
import {sourceIdentity} from './provenance.mjs';
import {qualification} from './qualification.mjs';
import {validatePackageEvidence} from './windows-package-evidence.mjs';
import {joinedChecks} from './joined-checks.mjs';
await mkdir(path.join(root,'.local'),{recursive:true});let build,concurrentChecks;
const record=await qualification({
 identify:async()=>({scope:'windows-packages',source:await sourceIdentity(),revision:(await promisify(execFile)('git',['rev-parse','HEAD'],{cwd:root,windowsHide:true})).stdout.trim()}),
 prepare:async context=>{await prepareCargoDependencies();await cargo(['test','--locked','-p','gallery-windows-package','-p','gallery-update','--no-run']);await node(path.join(root,'scripts/build-windows-packages.mjs'));build=JSON.parse(await readFile(path.join(root,'.local/windows-package-build.json')));assert.deepEqual(build.source,context.source);assert.equal(build.revision,context.revision);},
 steps:[
  {name:'Joined Windows ownership units and actual ordinary package campaign',run:async()=>{
   // Units mutate unique disposable roots and MSI copies. Actual prepared MSIs
   // are read-only inputs; these units never install or share a native window.
   // Both branches retain the same absolute qualification process deadline.
   concurrentChecks=await joinedChecks([
    {name:'Windows package native ownership units',run:async()=>{await cargo(['test','--locked','-p','gallery-windows-package','-p','gallery-update']);const pairs=JSON.stringify(build.upgrades.pairs.filter(p=>p.edition==='full').map(p=>[path.resolve(root,path.dirname(p.from.path),p.from.descriptor.native.installer.path),path.resolve(root,path.dirname(p.to.path),p.to.descriptor.native.installer.path)]));await execute('cargo',['test','--locked','-p','gallery-windows-package','actual_native_','--','--ignored'],{env:{...environment,GALLERY_MSI_LAYOUT_PAIRS:pairs}});}},
    {name:'Actual ordinary Full/Lite install, native use, collision and selective removal',run:()=>node(path.join(root,'scripts/test-windows-packages.mjs'))},
   ]);
   if(concurrentChecks.result!=='pass')throw Error(concurrentChecks.checks.filter(check=>check.result!=='pass').map(check=>check.name+': '+check.failure).join('; '));
  }},
  {name:'Independent exact-source package/native receipt and governed bytes read-back',run:async()=>{const result=JSON.parse(await readFile(path.join(root,'.local/windows-package-results.json')));await validatePackageEvidence(build,result,root);assert.deepEqual(await sourceIdentity(),recordContextSource());await node(path.join(root,'scripts/sync-brand-kit.mjs'),['--verify']);}},
 ]
});
record.concurrentChecks=concurrentChecks;
function recordContextSource(){return build.source;}
if(process.env.CI_PREPARATION_STARTED){const start=new Date(process.env.CI_PREPARATION_STARTED).getTime();assert.ok(start<=new Date(record.preparationStarted).getTime());record.preparationStarted=new Date(start).toISOString();record.preparationSeconds=((new Date(record.readinessVerified??record.terminalFinished).getTime())-start)/1000;record.combinedSeconds=(new Date(record.terminalFinished).getTime()-start)/1000;}
if(record.result==='pass'){record.packages=JSON.parse(await readFile(path.join(root,'.local/windows-package-results.json')));record.artifacts=build.records.map(r=>r.archive);}
await writeFile(path.join(root,'.local/ci-windows-packages.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record,null,2));if(record.result!=='pass')process.exitCode=1;
