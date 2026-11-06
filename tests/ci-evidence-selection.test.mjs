// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectCiEvidence,electCiEvidence} from '../scripts/ci-evidence-selection.mjs';
import {releaseScopes} from '../scripts/release-record.mjs';
const label='a'.repeat(40),revision='b'.repeat(40);
const inputs=()=>[...releaseScopes,'windows-lifecycle','windows-experience'].map((scope,i)=>({id:i+10,name:scope+'-evidence-'+label,created_at:'2026-11-06T18:00:00Z',size_in_bytes:1024,expired:false}));
test('Rerun election uses creation time, including when the newer artifact has a lower ID',()=>{
 const artifacts=inputs(),name='product-linux-evidence-'+label;
 artifacts.push({id:1,name,created_at:'2026-11-06T18:28:58Z',size_in_bytes:2048,expired:false});
 assert.equal(selectCiEvidence(artifacts,label).find(a=>a.name===name).id,1);
 assert.equal(selectCiEvidence(artifacts.reverse(),label).find(a=>a.name===name).id,1);
});
test('Election retains all canonical and worker scopes while excluding previous aggregate output and other revisions',()=>{
 const artifacts=inputs();artifacts.push({id:999,name:'release-validation-evidence-'+label,created_at:'2026-11-06T19:00:00Z'},{id:1000,name:'product-linux-evidence-'+revision,created_at:'2026-11-06T19:00:00Z'});
 const selected=selectCiEvidence(artifacts,label);assert.equal(selected.length,10);assert.deepEqual(selected.map(a=>a.name),inputs().map(a=>a.name));
});
test('The newest observation is elected even when failed; validation must never fall back to an older pass',()=>{
 const artifacts=inputs();artifacts[0].result='pass';artifacts.push({...artifacts[0],id:1,created_at:'2026-11-06T19:00:00Z',result:'fail'});
 assert.equal(selectCiEvidence(artifacts,label)[0].result,'fail');
});
test('Missing, expired or malformed elected evidence refuses selection',()=>{
 assert.throws(()=>selectCiEvidence(inputs().slice(1),label),/Missing qualification artifact/);
 const expired=inputs();expired[0].expired=true;assert.throws(()=>selectCiEvidence(expired,label),/Missing qualification artifact/);
 for(const change of [{created_at:undefined},{created_at:'invalid'},{created_at:0},{size_in_bytes:0},{id:0}]){const bad=inputs();Object.assign(bad[0],change);assert.throws(()=>selectCiEvidence(bad,label));}
});
test('Election binds API artifacts to the current qualification head before any download',async()=>{
 const client={prefix:'/repos/o/r',json:async()=>({head_sha:revision}),list:async()=>inputs()};
 const selected=await electCiEvidence(client,{runId:'123',label,revision});assert.equal(selected.artifacts.length,10);assert.equal(selected.revision,revision);
 client.json=async()=>({head_sha:label});client.list=async()=>assert.fail('Retired run must not list artifacts');await assert.rejects(electCiEvidence(client,{runId:'123',label,revision}),/Retired qualification revision/);
});
test('Aggregate workflow downloads elected IDs and retains the election receipt',async()=>{
 const yaml=await readFile(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');const block=yaml.split('  release-validation:')[1].split('  deploy-pages:')[0];
 assert.ok(block.indexOf('run: node scripts/ci-evidence-selection.mjs')<block.indexOf('artifact-ids:'));
 assert.ok(block.includes('artifact-ids: $'+'{{ steps.evidence.outputs.artifact_ids }}'));
 assert.ok(!block.includes("pattern: '*-evidence-"));assert.ok(block.includes('.local/ci-evidence-selection.json'));
});
