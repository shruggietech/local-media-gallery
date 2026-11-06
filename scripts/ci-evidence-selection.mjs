// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {appendFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GitHubReleaseClient,latestQualificationArtifact} from './github-release.mjs';
import {releaseScopes} from './release-record.mjs';

export function selectCiEvidence(artifacts,label){
 assert.match(label,/^[a-f0-9]{40}$/);
 // Keep both original Windows worker packets as well as every canonical scope.
 return [...releaseScopes,'windows-lifecycle','windows-experience'].map(scope=>{
  const name=scope+'-evidence-'+label;
  const matches=artifacts.filter(a=>a.name===name&&!a.expired);
  for(const artifact of matches){
   assert.ok(typeof artifact.created_at==='string'&&Number.isFinite(Date.parse(artifact.created_at)),'Missing artifact creation time: '+name);
   assert.ok(Number.isSafeInteger(artifact.size_in_bytes)&&artifact.size_in_bytes>0,'Invalid artifact extent: '+name);
  }
  return latestQualificationArtifact(matches,name);
 });
}
export async function electCiEvidence(client,{runId,label,revision}){
 assert.match(runId,/^[1-9][0-9]*$/);assert.match(revision,/^[a-f0-9]{40}$/);
 const run=await client.json('GET',client.prefix+'/actions/runs/'+runId);
 assert.equal(run.head_sha,revision,'Retired qualification revision');
 const selected=selectCiEvidence(await client.list(client.prefix+'/actions/runs/'+runId+'/artifacts','artifacts'),label);
 return {formatVersion:1,runId,revision,label,artifacts:selected.map(a=>({id:a.id,name:a.name,createdAt:a.created_at,bytes:a.size_in_bytes,digest:a.digest??null}))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.ok(process.env.GITHUB_OUTPUT,'Missing workflow output file');
 const record=await electCiEvidence(new GitHubReleaseClient({repository:process.env.GITHUB_REPOSITORY}),{runId:process.env.GITHUB_RUN_ID,label:process.env.GITHUB_SHA,revision:process.env.QUALIFIED_REVISION});
 await mkdir('.local',{recursive:true});
 await writeFile('.local/ci-evidence-selection.json',JSON.stringify(record,null,2)+'\n');
 await appendFile(process.env.GITHUB_OUTPUT,'artifact_ids='+record.artifacts.map(a=>a.id).join(',')+'\n');
 console.log('Elected '+record.artifacts.length+' newest upstream evidence packets by creation time.');
}
