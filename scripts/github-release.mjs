// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {AsyncLocalStorage} from 'node:async_hooks';
const observationDeadline=new AsyncLocalStorage();
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {releaseScopes} from './release-record.mjs';
const loopback=url=>url.protocol==='http:'&&url.hostname==='127.0.0.1';
export function validateQualificationRun({run,workflow,jobs,comparison},record,repository){
 assert.equal(run.repository?.full_name,repository);assert.equal(run.head_repository?.full_name,repository);assert.equal(run.name,'Qualification');assert.equal(run.path,'.github/workflows/ci.yml');assert.equal(workflow.path,'.github/workflows/ci.yml');assert.equal(run.event,'push');assert.equal(run.head_branch,'main');assert.equal(run.head_sha,record.source.revision);assert.equal(run.status,'completed');assert.equal(run.conclusion,'success');assert.ok(['ahead','identical'].includes(comparison.status),'Qualified source is not retained on main');
 for(const scope of [...releaseScopes,'release-validation']){const matches=jobs.filter(j=>j.name===scope||j.name==='native-proof ('+scope+')');assert.equal(matches.length,1,'Required qualification job '+scope);assert.equal(matches[0].conclusion,'success');}return run;
}
export class GitHubReleaseClient {
 constructor({repository,token,apiOrigin='https://api.github.com',fixture=false,deadline=Date.now()+840000,maxJsonBytes=4*1024*1024,timeoutMs=30000,observation}={}){
  assert.match(repository,/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);const url=new URL(apiOrigin);assert.ok(fixture?loopback(url):url.href==='https://api.github.com/','Unexpected API origin');this.repository=repository;this.token=token??(fixture?undefined:process.env.GH_TOKEN??process.env.GITHUB_TOKEN);this.origin=url.origin;this.fixture=fixture;this.deadline=deadline;this.maxJsonBytes=maxJsonBytes;this.timeoutMs=timeoutMs;assert.ok(!observation||fixture,'Observation overrides are fixture-only');this.observation=observation??{attempts:8,intervalMs:1000,timeoutMs:30000};for(const key of ['attempts','intervalMs','timeoutMs'])assert.ok(Number.isSafeInteger(this.observation[key])&&this.observation[key]>=(key==='intervalMs'?0:1));this.prefix='/repos/'+repository;
 }
 signal(){const remaining=Math.min(this.deadline,observationDeadline.getStore()??Infinity)-Date.now();assert.ok(remaining>0,'GitHub operation deadline reached');return AbortSignal.timeout(Math.max(1,Math.min(this.timeoutMs,remaining)));}
 async observe(read,label,failure){
  const {attempts,intervalMs,timeoutMs}=this.observation,deadline=Math.min(this.deadline,Date.now()+timeoutMs);
  return observationDeadline.run(deadline,async()=>{
   for(let attempt=0;attempt<attempts&&Date.now()<deadline;attempt++){
    let result;
    try{result=await read();}catch(error){
     if(Date.now()>=deadline&&(['AbortError','TimeoutError'].includes(error.name)||error.message==='GitHub operation deadline reached'))break;
     throw error;
    }
    if(result!==undefined)return result;
    if(attempt+1<attempts&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,Math.min(intervalMs,Math.max(0,deadline-Date.now()))));
   }
   throw failure??Error(label+' (observation bound/deadline reached)');
  });
 }
 async request(method,route,{body,bytes,allow404=false,upload=false}={}){
  const url=new URL(route,this.origin);assert.ok(upload?(this.fixture?url.origin===this.origin:url.origin==='https://uploads.github.com'):url.origin===this.origin,'Unexpected credential destination');assert.ok(!url.username&&!url.password&&!url.hash);
  const headers={'cache-control':'no-cache',accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'local-media-gallery-release',...(this.token?{authorization:'Bearer '+this.token}:{})};if(body!==undefined)headers['content-type']='application/json';if(bytes!==undefined)headers['content-type']='application/octet-stream';
  const response=await fetch(url,{method,headers,body:bytes??(body===undefined?undefined:JSON.stringify(body)),redirect:'manual',signal:this.signal()});if(allow404&&response.status===404){await response.body?.cancel();return {data:null,headers:response.headers,status:404};}
  if(!response.ok){await response.body?.cancel();const error=Error(`GitHub ${method} ${url.pathname}: ${response.status}`);error.status=response.status;throw error;}
  const chunks=[];let size=0;for await(const chunk of response.body??[]){size+=chunk.length;assert.ok(size<=this.maxJsonBytes,'GitHub JSON response bound exceeded');chunks.push(chunk);}const data=size?JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))):null;return {data,headers:response.headers,status:response.status};
 }
 async json(method,route,options){return (await this.request(method,route,options)).data;}
 async list(route,collection){const items=[];let next=route+(route.includes('?')?'&':'?')+'page=1&per_page=100';for(let page=0;next;page++){assert.ok(page<100,'GitHub pagination bound');const result=await this.request('GET',next);const entries=collection?result.data[collection]:result.data;assert.ok(Array.isArray(entries));items.push(...entries);const link=result.headers.get('link')?.match(/<([^>]+)>;\s*rel="next"/);next=link?.[1]??null;}return items;}
 releases(){return this.list(this.prefix+'/releases');}
 assets(id){assert.ok(Number.isSafeInteger(id)&&id>0);return this.list(this.prefix+'/releases/'+id+'/assets');}
 latest(){return this.json('GET',this.prefix+'/releases/latest',{allow404:true});}
 release(id){return this.json('GET',this.prefix+'/releases/'+id);}
 async resolveTag(tag){assert.match(tag,/^v(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/);let ref=await this.json('GET',this.prefix+'/git/ref/tags/'+encodeURIComponent(tag),{allow404:true});if(!ref)return null;for(let depth=0;depth<8;depth++){assert.match(ref.object?.sha,/^[a-f0-9]{40}$/);if(ref.object.type==='commit')return ref.object.sha;assert.equal(ref.object.type,'tag');ref=await this.json('GET',this.prefix+'/git/tags/'+ref.object.sha);}throw Error('Annotated tag depth exceeded');}
 createDraft(body){return this.json('POST',this.prefix+'/releases',{body});}
 editRelease(id,body){return this.json('PATCH',this.prefix+'/releases/'+id,{body});}
 async upload(release,name,bytes){const template=release.upload_url;assert.equal(typeof template,'string');const url=new URL(template.replace(/\{[^}]*\}$/,''));url.search='';url.searchParams.set('name',name);return this.json('POST',url.href,{bytes,upload:true});}
 deleteAsset(id){return this.json('DELETE',this.prefix+'/releases/assets/'+id);}
 async download(address,{collect=false,maxBytes=1073741824}={}){
  let url=new URL(address,this.origin),authorized=url.origin===this.origin;
  const actionsPath=this.prefix+'/actions/artifacts/';
  const artifactId=url.pathname.slice(actionsPath.length).split('/')[0];
  const actionsArtifact=authorized&&url.pathname===actionsPath+artifactId+'/zip'&&/^[1-9][0-9]*$/.test(artifactId);
  const signal=this.signal();for(let hop=0;hop<=5;hop++){
   assert.ok(!url.username&&!url.password&&!url.hash);assert.ok(this.fixture?loopback(url):url.protocol==='https:'&&(['api.github.com','github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(url.hostname)||(/^productionresultssa[0-9]+\.blob\.core\.windows\.net$/.test(url.hostname)&&actionsArtifact)),'Unexpected binary destination');const headers={accept:actionsArtifact&&url.origin===this.origin?'application/vnd.github+json':'application/octet-stream',...(url.origin===this.origin?{'x-github-api-version':'2022-11-28','user-agent':'local-media-gallery-release'}:{}),...(authorized&&this.token?{authorization:'Bearer '+this.token}:{})};const response=await fetch(url,{headers,redirect:'manual',signal});
   if([301,302,303,307,308].includes(response.status)){assert.ok(hop<5,'Binary redirect bound');const target=new URL(response.headers.get('location'),url);if(target.origin!==url.origin)authorized=false;await response.body?.cancel();url=target;continue;}
   if(!response.ok){await response.body?.cancel();throw Error('GitHub binary readback: '+response.status);}const hash=createHash('sha256'),chunks=[];let bytes=0;for await(const chunk of response.body??[]){bytes+=chunk.length;assert.ok(bytes<=maxBytes,'Binary response bound exceeded');hash.update(chunk);if(collect)chunks.push(chunk);}return {bytes:String(bytes),sha256:hash.digest('hex'),...(collect?{data:Buffer.concat(chunks)}:{})};
  }throw Error('Binary redirect bound');
 }
 async verifyQualification(record){
  assert.ok(!this.fixture,'Fixture transport cannot authorize production');const run=await this.json('GET',this.prefix+'/actions/runs/'+record.qualification.runId);
  const workflow=await this.json('GET',this.prefix+'/actions/workflows/'+run.workflow_id),comparison=await this.json('GET',this.prefix+'/compare/'+record.source.revision+'...main'),jobs=await this.list(this.prefix+'/actions/runs/'+run.id+'/jobs?filter=latest','jobs');
  validateQualificationRun({run,workflow,jobs,comparison},record,this.repository);const artifacts=await this.json('GET',this.prefix+'/actions/runs/'+run.id+'/artifacts?per_page=100');assert.ok(!artifacts.total_count||artifacts.total_count<=100);const matching=artifacts.artifacts.filter(a=>a.name==='release-validation-evidence-'+run.head_sha&&!a.expired);assert.equal(matching.length,1,'Missing/ambiguous release qualification artifact');const artifact=matching[0];assert.match(artifact.digest,/^sha256:[a-f0-9]{64}$/);const zip=await this.download(this.prefix+'/actions/artifacts/'+artifact.id+'/zip',{collect:true,maxBytes:64*1024*1024});assert.equal('sha256:'+zip.sha256,artifact.digest,'CI artifact digest differs');
  const {root,python}=await import('./run.mjs');const directory=await mkdtemp(path.join(os.tmpdir(),'lmg-ci-provenance-'));let retained;try{const file=path.join(directory,'evidence.zip');await writeFile(file,zip.data);const call=promisify(execFile),operation=call(python,[path.join(root,'scripts/read-release-evidence.py'),file],{windowsHide:true,shell:false,timeout:30000,maxBuffer:64*1024*1024});operation.child.stdin.end();retained=JSON.parse((await operation).stdout);}finally{await rm(directory,{recursive:true,force:true});}
  const qualified=retained['release-assembly.json'],receipt=retained['ci-release-validation.json'];assert.equal(receipt.result,'pass');assert.equal(receipt.context.revision,record.source.revision);assert.equal(receipt.context.source.sha256,record.source.sha256);assert.ok(receipt.steps.length&&receipt.steps.every(s=>s.result==='pass'));assert.ok(receipt.qualificationSeconds<885);for(const key of ['repository','version','previousVersion','source','artifacts','qualification','documentation'])assert.deepEqual(record[key],qualified[key],'Record differs from accepted CI '+key);return {run,artifact};
 }
}
