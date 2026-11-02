// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {retainedPath,verifyRetained,qualificationReceipt,validatePayloadNotices} from '../scripts/release-assembly.mjs';
import {releaseHash} from '../scripts/release-record.mjs';
test('Retained inputs reject traversal, links, changed bytes and missing inputs',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'lmg-release-input-'));t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(path.join(root,'.local'));const file='.local/ordinary.zip';await writeFile(path.join(root,file),'accepted');const entry={path:file,bytes:'8',sha256:releaseHash('accepted')};assert.equal((await verifyRetained(root,entry)).toString(),'accepted');
 for(const name of ['../outside','/absolute','C:/outside','.local/../outside','.local\\..\\outside','.local/a:stream'])await assert.rejects(retainedPath(root,name));
 await writeFile(path.join(root,file),'changed');await assert.rejects(verifyRetained(root,entry));await assert.rejects(verifyRetained(root,{...entry,path:'.local/missing'}));
 if(process.platform!=='win32'){await symlink(file,path.join(root,'.local/link'));await assert.rejects(retainedPath(root,'.local/link'));}
});
test('Qualification receipts bind terminal results, exact source and separated clocks',()=>{
 const source={sha256:'a'.repeat(64),files:1},revision='b'.repeat(40);const r={result:'pass',context:{scope:'repository',source,revision},preparationSeconds:2,qualificationSeconds:3,combinedSeconds:5,hardLimitSeconds:900,provisionalFinalizationReserveSeconds:15,preparationStarted:'2026-10-31T00:00:00Z',readinessVerified:'2026-10-31T00:00:02Z',terminalFinished:'2026-10-31T00:00:05Z',steps:[{result:'pass'}]};assert.equal(qualificationReceipt(r,'repository',source,revision).qualificationSeconds,3);
 for(const mutate of [q=>q.result='fail',q=>q.context.revision='c'.repeat(40),q=>q.qualificationSeconds=886,q=>q.terminalFinished=null,q=>q.steps[0].result='not-run',q=>q.combinedSeconds=4]){const q=structuredClone(r);mutate(q);assert.throws(()=>qualificationReceipt(q,'repository',source,revision));}
});

test('Release assembly accepts independently verified indexed notices while retaining the historical inventory contract',()=>{
 const legacy={payload:{files:[{path:'app/NOTICE'},{path:'app/licenses/dependencies/inventory.json'}]}};assert.equal(validatePayloadNotices(legacy,'0.1.0','macos'),true);assert.equal(validatePayloadNotices(legacy,'0.2.0','macos'),true);
 const indexed={payload:{files:[{path:'app/NOTICE'},{path:'app/licenses/dependencies.json',sha256:'a'.repeat(64),bytes:'100',mode:'644'}]},noticeBundle:{path:'app/licenses/dependencies.json',files:1281,sha256:'a'.repeat(64),inventorySha256:'b'.repeat(64)}};for(const platform of ['windows','linux'])assert.equal(validatePayloadNotices(indexed,'0.2.0',platform),true);assert.throws(()=>validatePayloadNotices(indexed,'0.1.0','linux'));assert.throws(()=>validatePayloadNotices(indexed,'0.2.0','macos'));
 for(const mutate of [r=>delete r.noticeBundle,r=>r.noticeBundle.path='elsewhere.json',r=>r.noticeBundle.sha256='c'.repeat(64),r=>r.noticeBundle.files=0,r=>r.noticeBundle.inventorySha256='bad',r=>r.payload.files.shift(),r=>r.payload.files.push({path:'app/licenses/dependencies/loose.txt'})]){const bad=structuredClone(indexed);mutate(bad);assert.throws(()=>validatePayloadNotices(bad,'0.2.0','linux'));}
});
