// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRelease,releaseDigest,attachGate,publishedView,parseReleaseRecord,canonical} from '../scripts/release-record.mjs';
import {candidateFixture,gateFixture,publicationFixture} from './fixtures/releases/record-fixture.mjs';
test('Canonical candidate binds exact immutable rows and rejects corrupt identity',()=>{
 const record=candidateFixture();assert.equal(validateRelease(record,{allowFixture:true}).candidateId,releaseDigest(record));
 const changed=structuredClone(record);changed.artifacts[0].sha256='c'.repeat(64);assert.throws(()=>validateRelease(changed,{allowFixture:true}),/identity|digest/i);
 for(const mutate of [r=>r.extra=true,r=>r.artifacts.push(structuredClone(r.artifacts[0])),r=>r.artifacts[0].name='../foreign',r=>r.artifacts[0].url='https://elsewhere.example/package',r=>r.qualification.scopes.pop(),r=>r.qualification.scopes[0].qualificationSeconds=890]){const r=structuredClone(record);mutate(r);assert.throws(()=>validateRelease(r,{allowFixture:true}));}
});
test('Published authority requires both exact documentation gates and observed bytes',()=>{
 let r=candidateFixture();assert.throws(()=>publishedView(r,{allowFixture:true}),/published/i);
 r=attachGate(r,gateFixture(r),{allowFixture:true});r.publication=publicationFixture(r);r=attachGate(r,gateFixture(r,'publication'),{allowFixture:true});r.state='published';
 assert.equal(publishedView(r,{allowFixture:true}).version,r.version);
 for(const mutate of [v=>v.gates.before=null,v=>v.gates.after.rendererSha256='',v=>v.gates.after.candidateId='c'.repeat(64),v=>v.publication.assets[0].sha256='c'.repeat(64),v=>v.publication.tag='v9.9.9',v=>v.gates.after.checks.pop()]){const v=structuredClone(r);mutate(v);assert.throws(()=>validateRelease(v,{allowFixture:true}));}
 assert.throws(()=>validateRelease(r),/fixture/i,'Controlled records cannot authorize ordinary consumers');
});
test('Gate changes preserve immutable candidate while changed source/snapshot refuses reuse',()=>{
 const r=candidateFixture(),g=gateFixture(r),next=attachGate(r,g,{allowFixture:true});assert.equal(next.candidateId,r.candidateId);
 for(const key of ['sourceRevision','sourceSha256','snapshotsSha256']){const bad=structuredClone(g);bad[key]='d'.repeat(key==='sourceRevision'?40:64);assert.throws(()=>attachGate(r,bad,{allowFixture:true}),/gate|binding/i);}
});

test('Release JSON rejects duplicate members, invalid UTF8 and BOM bytes',()=>{const record=candidateFixture(),text=canonical(record)+'\n';assert.equal(parseReleaseRecord(text,{allowFixture:true}).candidateId,record.candidateId);assert.throws(()=>parseReleaseRecord(text.replace('{','{\"extra\":1,'),{allowFixture:true}));assert.throws(()=>parseReleaseRecord(Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),Buffer.from(text)]),{allowFixture:true}));assert.throws(()=>parseReleaseRecord(Buffer.from([0xff]),{allowFixture:true}));});

test('CI and execution elect the same predecessor for ordinary and repeat releases',async()=>{const {releasePredecessor}=await import('../scripts/release-record.mjs');assert.equal(releasePredecessor('1.0.1',{version:'1.0.0',previousVersion:'0.9.0'}),'1.0.0');assert.equal(releasePredecessor('1.0.1',{version:'1.0.1',previousVersion:'1.0.0'}),'1.0.0');assert.equal(releasePredecessor('1.0.0',null),null);});
