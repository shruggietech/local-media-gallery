// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {GitHubReleaseClient} from '../scripts/github-release.mjs';import {ReleasePublisher} from '../scripts/release-publication.mjs';import {githubService} from './fixtures/releases/github-service.mjs';import {candidateFixture,gateFixture} from './fixtures/releases/record-fixture.mjs';import {createCandidate,releaseHash,attachGate} from '../scripts/release-record.mjs';
async function setup(t){const service=await githubService();t.after(service.close);const directory=await mkdtemp(path.join(os.tmpdir(),'lmg-publisher-'));t.after(()=>rm(directory,{recursive:true,force:true}));const seed=candidateFixture();seed.repository='o/r';for(const a of seed.artifacts){a.url=a.url.replace('shruggietech/local-media-gallery','o/r');const bytes=Buffer.from(a.name);a.bytes=String(bytes.length);a.sha256=releaseHash(bytes);await writeFile(path.join(directory,a.name),bytes);}let record=createCandidate(seed,{allowFixture:true});record=attachGate(record,gateFixture(record,'candidate'),{allowFixture:true});const client=new GitHubReleaseClient({repository:'o/r',apiOrigin:service.origin,fixture:true,observation:{attempts:4,intervalMs:0,timeoutMs:1000}});const publisher=new ReleasePublisher({client,artifactRoot:directory,fixtureGateVerifier:async()=>true});return {service,publisher,record};}
test('Lost create/upload/publish acknowledgements reconcile and exact repeat preserves bytes',async t=>{const {service,publisher,record}=await setup(t);Object.assign(service.state.failures,{createLost:1,uploadLost:1,publishLost:1});const staged=await publisher.stage(record,'Fixture delivery');assert.equal(staged.state,'staged');const observed=await publisher.publish(staged);assert.ok(observed.publication);assert.equal(service.state.latest,null);const qualified=attachGate(observed,gateFixture(observed,'publication'),{allowFixture:true});const promoted=await publisher.promote(qualified);assert.equal(promoted.state,'published');const before=service.state.writes.length;assert.deepEqual(await publisher.promote(promoted),promoted);assert.equal(service.state.writes.length,before);});
test('Owned empty starter can recover; foreign bytes and failed publication keep prior pointer',async t=>{const {service,publisher,record}=await setup(t);service.state.failures.uploadStarter=1;await assert.rejects(publisher.stage(record,'Fixture'));const staged=await publisher.stage(record,'Fixture');service.state.failures.publishBefore=1;await assert.rejects(publisher.publish(staged));assert.equal(service.state.latest,null);const list=[...service.state.assets.values()][0];list[0].body=Buffer.from('foreign');list[0].size=7;await assert.rejects(publisher.stage(record,'Fixture'),/asset|digest|bytes/i);assert.equal(service.state.latest,null);});
test('Stale gate, foreign draft, wrong tag and concurrent latest selection refuse before promotion',async t=>{const {service,publisher,record}=await setup(t);const stale=structuredClone(record);stale.gates.before.candidateId='f'.repeat(64);await assert.rejects(publisher.stage(stale,'Fixture'));assert.equal(service.state.writes.length,0);const staged=await publisher.stage(record,'Fixture');service.state.releases[0].body='foreign';await assert.rejects(publisher.stage(record,'Fixture'),/owned/);service.state.releases[0].body='<!-- local-media-gallery candidate '+record.candidateId+' -->';const observed=await publisher.publish(staged),qualified=attachGate(observed,gateFixture(observed,'publication'),{allowFixture:true});service.state.latest=999;service.state.releases.push({id:999,tag_name:'v9.0.0'});await assert.rejects(publisher.promote(qualified),/previous|selection/i);assert.equal(service.state.latest,999);service.state.tag='c'.repeat(40);await assert.rejects(publisher.publish(staged),/tag/i);});

test('Foreign starter is retained and an already qualified canonical record is not overwritten on retry',async t=>{const {service,publisher,record}=await setup(t);const staged=await publisher.stage(record,'Fixture');const observed=await publisher.publish(staged);let qualified=attachGate(observed,gateFixture(observed,'publication'),{allowFixture:true});const published=await publisher.promote(qualified);qualified.gates.after.checkedAt='2026-11-01T00:00:00Z';const before=service.state.writes.length;assert.deepEqual(await publisher.promote(qualified),published);assert.equal(service.state.writes.length,before);});

test('Unattributed empty starter assets are never deleted',async t=>{const {service,publisher,record}=await setup(t);await publisher.stage(record,'Fixture');const asset=[...service.state.assets.values()][0][0];asset.state='starter';asset.size=0;asset.body=Buffer.alloc(0);const before=service.state.writes.length;await assert.rejects(publisher.stage(record,'Fixture'),/attributable/);assert.equal(service.state.writes.length,before);});
test('Canonical starter and lost upload acknowledgement recover through a fresh publisher and retained journal',async t=>{const {service,publisher,record}=await setup(t);const staged=await publisher.stage(record,'Fixture'),observed=await publisher.publish(staged),qualified=attachGate(observed,gateFixture(observed,'publication'),{allowFixture:true});service.state.failures.uploadStarter=1;await assert.rejects(publisher.promote(qualified));assert.equal(service.state.latest,null);const resumed=new ReleasePublisher({client:publisher.client,artifactRoot:publisher.artifactRoot,fixtureGateVerifier:async()=>true});service.state.failures.uploadLost=1;const published=await resumed.promote(qualified);assert.equal(published.state,'published');assert.deepEqual(await resumed.promote(qualified),published);});

test('Temporary draft URLs are accepted only with exact API asset identity; final URLs remain strict',async t=>{
 const {service,publisher,record}=await setup(t);
 const staged=await publisher.stage(record,'Draft URLs');
 const assets=[...service.state.assets.values()][0];assert.ok(assets.every(a=>a.browser_download_url.includes('/untagged-')));
 const saved=assets[0].url;assets[0].url=service.origin+'/repos/other/repo/releases/assets/'+assets[0].id;
 await assert.rejects(publisher.stage(record,'Draft URLs'),/API|identity|URL/);assets[0].url=saved;
 service.state.failures.finalUrl=1;await assert.rejects(publisher.publish(staged),/URL/);assert.equal(service.state.latest,null);
});
test('Delayed committed mutations and lost acknowledgements reconcile with exactly one write each',async t=>{
 const {service,publisher,record}=await setup(t);
 Object.assign(service.state.delays,{create:2,upload:2,publish:2,tag:2,promote:2});
 Object.assign(service.state.failures,{createLost:1,uploadLost:1,publishLost:1,promoteLost:1});
 const staged=await publisher.stage(record,'Delayed'),observed=await publisher.publish(staged);
 const published=await publisher.promote(attachGate(observed,gateFixture(observed,'publication'),{allowFixture:true}));
 assert.equal(published.state,'published');
 assert.equal(service.state.writes.filter(w=>w.route==='/releases'&&w.method==='POST').length,1);
 assert.equal(service.state.writes.filter(w=>w.route.startsWith('/uploads/')).length,record.artifacts.length+1);
 assert.equal(service.state.writes.filter(w=>w.body?.draft===false).length,1);
 assert.equal(service.state.writes.filter(w=>w.body?.make_latest==='true').length,1);
});
test('Unobserved create exhausts its bound without a duplicate write and a fresh publisher resumes',async t=>{
 const {service,publisher,record}=await setup(t);service.state.delays.create=50;
 await assert.rejects(publisher.stage(record,'Pending'),/observ|deadline/i);
 assert.equal(service.state.writes.length,1);service.state.delays.create=0;
 // Existing delayed snapshots eventually become visible, without another create.
 for(let i=0;i<50;i++)await publisher.client.releases();
 await publisher.stage(record,'Resume');assert.equal(service.state.writes.filter(w=>w.route==='/releases').length,1);
});
test('Observation conflicts are terminal and request deadlines inherit the remaining global limit',async t=>{
 const {publisher}=await setup(t);let calls=0;
 await assert.rejects(publisher.client.observe(async()=>{calls++;throw Error('foreign state');},'conflict'),/foreign/);assert.equal(calls,1);
 publisher.client.deadline=Date.now()-1;
 await assert.rejects(publisher.client.observe(async()=>{calls++;return undefined;},'expired'),/deadline|observ/i);assert.equal(calls,1);
});
test('Starter deletion visibility is observed before one replacement upload',async t=>{
 const {service,publisher,record}=await setup(t);service.state.failures.uploadStarter=1;
 await assert.rejects(publisher.stage(record,'Starter'));
 Object.assign(service.state.delays,{delete:2,upload:2});service.state.failures.deleteLost=1;
 await publisher.stage(record,'Recovery');
 assert.equal(service.state.writes.filter(w=>w.method==='DELETE').length,1);
 assert.equal(service.state.writes.filter(w=>w.route.startsWith('/uploads/')).length,record.artifacts.length+1);
});

test('A foreign latest selection appearing after promotion is not retried away',async t=>{
 const {service,publisher,record}=await setup(t);const staged=await publisher.stage(record,'Fixture'),observed=await publisher.publish(staged);
 const qualified=attachGate(observed,gateFixture(observed,'publication'),{allowFixture:true}),original=publisher.client.editRelease.bind(publisher.client);
 publisher.client.editRelease=async(id,body)=>{const result=await original(id,body);if(body.make_latest==='true'){service.state.latest=999;service.state.releases.push({id:999,tag_name:'v9.0.0'});}return result;};
 await assert.rejects(publisher.promote(qualified),/selection/);assert.equal(service.state.latest,999);
 assert.equal(service.state.writes.filter(w=>w.body?.make_latest==='true').length,1);
});
test('Duplicate asset identities fail and authorization errors do not enter reconciliation',async t=>{
 const {service,publisher,record}=await setup(t);await publisher.stage(record,'Fixture');
 const assets=[...service.state.assets.values()][0];assets[1].id=assets[0].id;await assert.rejects(publisher.stage(record,'Fixture'),/Duplicate asset identity/);
 let reads=0;await assert.rejects(publisher.reconcile(async()=>{throw Object.assign(Error('forbidden'),{status:403});},async()=>{reads++;return true;},'pending'),/forbidden/);assert.equal(reads,0);
});
