// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import path from 'node:path';
import {GitHubReleaseClient} from './github-release.mjs';import {resolvePublishedRelease} from './release-publication.mjs';import {parseReleaseRecord} from './release-record.mjs';import {verifySnapshotHistory} from './release-docs.mjs';
// Source snapshots describe retained content. Only observed canonical releases
// elect released public versions and current downloads. Pending snapshots stay
// available to private qualification, without advertising a published version.
export async function publicSiteInputs(base,{client=new GitHubReleaseClient({repository:'shruggietech/local-media-gallery'})}={}){
 const source=JSON.parse(await readFile(path.join(base,'site/versions.json'),'utf8')),current=await resolvePublishedRelease(client),releases=await client.releases(),snapshots=[];
 for(const snapshot of source.snapshots){if(snapshot.version==='v0.0.0'){assert.equal(snapshot.status,'specification');snapshots.push(snapshot);continue;}const remote=releases.filter(r=>r.tag_name===snapshot.version&&!r.draft&&!r.prerelease&&r.published_at);assert.ok(remote.length<=1);if(!remote.length)continue;const assets=(await client.assets(remote[0].id)).filter(a=>a.name==='release.json');if(!assets.length)continue;assert.equal(assets.length,1);const result=await client.download(assets[0].url,{collect:true,maxBytes:32*1024*1024}),record=parseReleaseRecord(result.data,{requirePublished:true});assert.equal(record.repository,client.repository);assert.equal(record.publication.id,remote[0].id);assert.equal(record.documentation.version,snapshot.version);await verifySnapshotHistory(base,snapshot,record.documentation);snapshots.push({...snapshot,status:'released'});}
 const latest=current?'v'+current.version:'v0.0.0';assert.ok(snapshots.some(s=>s.version===latest),'Published release lacks a complete retained snapshot');return {manifest:{...source,snapshots,latest,releaseRecord:undefined},releaseRecord:current??undefined};
}
