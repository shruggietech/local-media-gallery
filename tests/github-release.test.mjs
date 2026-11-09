// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';
import {GitHubReleaseClient} from '../scripts/github-release.mjs';
async function service(handler){const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));return {url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(r=>server.close(r))};}
test('Production transport follows pages and strips authorization across binary origins',async t=>{let leaked;const remote=await service((req,res)=>{leaked=req.headers.authorization;res.end('accepted');});t.after(remote.close);const local=await service((req,res)=>{if(req.url==='/bytes'){res.writeHead(302,{location:remote.url+'/raw'});res.end();}else if(req.url.startsWith('/repos/o/r/releases?')){const next=req.url.includes('page=1&');res.writeHead(200,{'content-type':'application/json',...(next?{link:'<'+local.url+'/repos/o/r/releases?page=2&per_page=100>; rel="next"'}:{})});res.end(JSON.stringify(next?[{id:1}]:[{id:2}]));}else{res.writeHead(500);res.end('do not retain response secrets');}});t.after(local.close);const client=new GitHubReleaseClient({repository:'o/r',token:'fixture-secret',apiOrigin:local.url,fixture:true});assert.deepEqual(await client.releases(),[{id:1},{id:2}]);const bytes=await client.download(local.url+'/bytes',{collect:true});assert.equal(bytes.data.toString(),'accepted');assert.equal(leaked,undefined);await assert.rejects(client.json('GET','/error'),/GitHub GET \/error: 500/);assert.throws(()=>new GitHubReleaseClient({repository:'o/r',apiOrigin:local.url}));});
test('Response bounds, deadline and tag identity are enforced',async t=>{const local=await service((req,res)=>{if(req.url.includes('/git/ref/'))res.end(JSON.stringify({object:{type:'tag',sha:'a'.repeat(40)}}));else if(req.url.includes('/git/tags/'))res.end(JSON.stringify({object:{type:'commit',sha:'b'.repeat(40)}}));else res.end('x'.repeat(1024));});t.after(local.close);const client=new GitHubReleaseClient({repository:'o/r',apiOrigin:local.url,fixture:true,maxJsonBytes:100});await assert.rejects(client.json('GET','/large'),/bound/);const normal=new GitHubReleaseClient({repository:'o/r',apiOrigin:local.url,fixture:true});assert.equal(await normal.resolveTag('v1.2.3'),'b'.repeat(40));const expired=new GitHubReleaseClient({repository:'o/r',apiOrigin:local.url,fixture:true,deadline:Date.now()-1});await assert.rejects(expired.json('GET','/any'),/deadline/);});

test('Publication qualification rejects PR, foreign, incomplete, wrong source and failed native jobs',async()=>{const {validateQualificationRun}=await import('../scripts/github-release.mjs');const {releaseScopes}=await import('../scripts/release-record.mjs');const record={source:{revision:'b'.repeat(40)}};const valid={run:{repository:{full_name:'o/r'},head_repository:{full_name:'o/r'},name:'Qualification',path:'.github/workflows/ci.yml',event:'push',head_branch:'main',head_sha:record.source.revision,status:'completed',conclusion:'success'},workflow:{path:'.github/workflows/ci.yml'},jobs:[...releaseScopes,'release-validation'].map(name=>({name,conclusion:'success'})),comparison:{status:'ahead'}};validateQualificationRun(valid,record,'o/r');for(const change of [q=>q.run.event='pull_request',q=>q.run.head_repository.full_name='foreign/r',q=>q.run.head_branch='feature',q=>q.run.head_sha='c'.repeat(40),q=>q.run.conclusion='failure',q=>q.jobs.pop(),q=>q.jobs[0].conclusion='failure',q=>q.comparison.status='diverged',q=>q.workflow.path='other.yml']){const q=structuredClone(valid);change(q);assert.throws(()=>validateQualificationRun(q,record,'o/r'));}});

test('Actions jobs pagination reads the jobs collection rather than treating the envelope as an array',async t=>{const service=await (async()=>{const server=createServer((req,res)=>res.end(JSON.stringify({total_count:1,jobs:[{name:'repository',conclusion:'success'}]})));await new Promise(r=>server.listen(0,'127.0.0.1',r));return {url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(r=>server.close(r))};})();t.after(service.close);const client=new GitHubReleaseClient({repository:'o/r',apiOrigin:service.url,fixture:true});assert.deepEqual(await client.list('/jobs','jobs'),[{name:'repository',conclusion:'success'}]);});
test('Actions ZIP endpoints negotiate the REST media type before following the binary redirect',async t=>{let leaked;const blob=await service((req,res)=>{leaked=req.headers.authorization;res.end('zip-bytes');});t.after(blob.close);const api=await service((req,res)=>{if(req.headers.accept!=='application/vnd.github+json'){res.writeHead(415);res.end();return;}assert.equal(req.headers['x-github-api-version'],'2022-11-28');res.writeHead(302,{location:blob.url+'/artifact.zip'});res.end();});t.after(api.close);const client=new GitHubReleaseClient({repository:'o/r',apiOrigin:api.url,token:'fixture-secret',fixture:true});const result=await client.download('/repos/o/r/actions/artifacts/1/zip',{collect:true});assert.equal(result.data.toString(),'zip-bytes');assert.equal(leaked,undefined);});

test('Observation timeout aborts slow requests and preserves the original mutation failure',async t=>{
 const local=await service((req,res)=>setTimeout(()=>res.end('{}'),200));t.after(local.close);
 const client=new GitHubReleaseClient({repository:'o/r',apiOrigin:local.url,fixture:true,observation:{attempts:3,intervalMs:0,timeoutMs:30}});
 const failure=Error('lost mutation response');
 await assert.rejects(client.observe(()=>client.json('GET','/slow'),'pending',failure),error=>error===failure);
 let calls=0;await assert.rejects(client.observe(async()=>{calls++;throw Object.assign(Error('API forbidden'),{status:403});},'pending'),/forbidden/);
 assert.equal(calls,1);
});


test('Latest terminal-run evidence selects the newest unexpired exact-name artifact',async()=>{
 const {latestQualificationArtifact}=await import('../scripts/github-release.mjs');
 const old={id:10,name:'scope-sha',created_at:'2026-11-01T00:00:00Z'},current={...old,id:12,created_at:'2026-11-02T00:00:00Z'};
 assert.equal(latestQualificationArtifact([{...current,id:99,expired:true},{...current,id:100,name:'foreign'},old,current],'scope-sha'),current);
 assert.equal(latestQualificationArtifact([current,{...current,id:13}],'scope-sha').id,13);
 assert.equal(latestQualificationArtifact([{id:1,name:'fixture'},{id:2,name:'fixture'}],'fixture').id,2);
 assert.throws(()=>latestQualificationArtifact([old],'missing'),/Missing qualification artifact/);
 assert.throws(()=>latestQualificationArtifact([{...old,created_at:'invalid'}],'scope-sha'),/creation time/);
 assert.throws(()=>latestQualificationArtifact([{...old,id:-1}],'scope-sha'),/identity/);
});

test('Evidence download streams exact bytes and refuses existing or oversized targets',async t=>{
 const {mkdtemp,readFile,writeFile,stat,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');const {createHash}=await import('node:crypto');
 const directory=await mkdtemp(path.join(tmpdir(),'lmg-stream-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const chunk=Buffer.alloc(65536,0xa5),bytes=chunk.length*32;let leaked;
 const remote=await service((req,res)=>{leaked=req.headers.authorization;for(let i=0;i<32;i++)res.write(chunk);res.end();});t.after(remote.close);
 const local=await service((req,res)=>{res.writeHead(302,{location:remote.url+'/bytes'});res.end();});t.after(local.close);
 const client=new GitHubReleaseClient({repository:'o/r',apiOrigin:local.url,fixture:true,token:'fixture-secret'}),file=path.join(directory,'accepted.partial');
 const result=await client.downloadFile('/redirect',file,{maxBytes:bytes});assert.equal(result.bytes,String(bytes));assert.equal(Object.hasOwn(result,'data'),false);assert.equal(leaked,undefined);
 const actual=await readFile(file);assert.equal(actual.length,bytes);assert.equal(result.sha256,createHash('sha256').update(actual).digest('hex'));assert.ok(actual.every(v=>v===0xa5));
 const foreign=path.join(directory,'foreign');await writeFile(foreign,'foreign');await assert.rejects(client.downloadFile('/redirect',foreign),/EEXIST/);assert.equal(await readFile(foreign,'utf8'),'foreign');
 const partial=path.join(directory,'oversized.partial');await assert.rejects(client.downloadFile('/redirect',partial,{maxBytes:1024}),/Binary response bound/);assert.ok((await stat(partial)).size<=1024);await assert.rejects(stat(path.join(directory,'oversized')),error=>error.code==='ENOENT');
});

test('Evidence transfer timeout remains bounded by global and observation deadlines',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');
 const directory=await mkdtemp(path.join(tmpdir(),'lmg-stream-timeout-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const local=await service((req,res)=>setTimeout(()=>res.end('slow bytes'),200));t.after(local.close);
 const client=new GitHubReleaseClient({repository:'o/r',apiOrigin:local.url,fixture:true,timeoutMs:80,observation:{attempts:1,intervalMs:0,timeoutMs:60}});
 await assert.rejects(client.downloadFile('/slow',path.join(directory,'normal.partial')),error=>['AbortError','TimeoutError'].includes(error.name));
 assert.equal((await client.downloadFile('/slow',path.join(directory,'elected.partial'),{timeoutMs:1000})).bytes,'10');
 client.deadline=Date.now()+60;await assert.rejects(client.downloadFile('/slow',path.join(directory,'global.partial'),{timeoutMs:1000}),error=>['AbortError','TimeoutError'].includes(error.name));
 client.deadline=Date.now()+5000;const original=Error('observation expired');await assert.rejects(client.observe(()=>client.downloadFile('/slow',path.join(directory,'observed.partial'),{timeoutMs:1000}),'pending',original),error=>error===original);
});


test('Large upload timeout inherits global and mutation-observation deadlines',async t=>{
 const local=await service((req,res)=>{req.resume();setTimeout(()=>res.end('{}'),200);});t.after(local.close);
 const client=new GitHubReleaseClient({repository:'o/r',apiOrigin:local.url,fixture:true,timeoutMs:60,observation:{attempts:1,intervalMs:0,timeoutMs:60}}),release={upload_url:local.url+'/upload{?name}'};
 assert.deepEqual(await client.upload(release,'source.tar.xz',Buffer.from('source')),{});
 client.deadline=Date.now()+60;await assert.rejects(client.upload(release,'source.tar.xz',Buffer.from('source')),error=>['AbortError','TimeoutError'].includes(error.name));
 client.deadline=Date.now()+5000;const failure=Error('observation expired');await assert.rejects(client.observe(()=>client.upload(release,'source.tar.xz',Buffer.from('source')),'pending',failure),error=>error===failure);
});

test('Idempotent GitHub reads recover temporary responses while every mutation stays one-shot',async t=>{
 const calls=new Map();const local=await service((req,res)=>{const key=req.method+' '+req.url;calls.set(key,(calls.get(key)??0)+1);if(req.method==='GET'&&req.url==='/eventual'&&calls.get(key)>1){res.end('{"ready":true}');return;}res.writeHead(503);res.end('private response');});t.after(local.close);const client=new GitHubReleaseClient({repository:'o/r',apiOrigin:local.url,fixture:true});assert.deepEqual(await client.json('GET','/eventual'),{ready:true});assert.equal(calls.get('GET /eventual'),2);
 for(const method of ['POST','PATCH','DELETE']){await assert.rejects(client.json(method,'/mutation',{body:method==='DELETE'?undefined:{value:1}}));assert.equal(calls.get(method+' /mutation'),1);}
 await assert.rejects(client.upload({upload_url:local.url+'/upload{?name}'},'fixture.bin',Buffer.from('bytes')));assert.equal(calls.get('POST /upload?name=fixture.bin'),1);
});
test('An interrupted owned file stream retries from byte zero with a new digest',async t=>{
 const {mkdtemp,readFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');const {createHash}=await import('node:crypto');const directory=await mkdtemp(path.join(tmpdir(),'lmg-replay-'));t.after(()=>rm(directory,{recursive:true,force:true}));let calls=0;
 const local=await service((req,res)=>{calls++;if(calls===1){res.writeHead(200);res.write('stale prefix');setTimeout(()=>res.destroy(),10);}else res.end('complete replacement');});t.after(local.close);const client=new GitHubReleaseClient({repository:'o/r',apiOrigin:local.url,fixture:true});const file=path.join(directory,'candidate.partial'),result=await client.downloadFile('/bytes',file,{maxBytes:1024});const actual=await readFile(file);assert.equal(calls,2);assert.equal(actual.toString(),'complete replacement');assert.equal(result.bytes,String(actual.length));assert.equal(result.sha256,createHash('sha256').update(actual).digest('hex'));
});
test('An irreversible custom chunk sink is not replayed after delivered bytes',async t=>{
 let calls=0,delivered='';const local=await service((req,res)=>{calls++;res.writeHead(200);res.write('only once');setTimeout(()=>res.destroy(),10);});t.after(local.close);const client=new GitHubReleaseClient({repository:'o/r',apiOrigin:local.url,fixture:true});await assert.rejects(client.download('/bytes',{onChunk:async chunk=>{delivered+=Buffer.from(chunk).toString();}}));assert.equal(calls,1);assert.equal(delivered,'only once');
});

test('Binary delivery requests revalidation on the initial URL and every redirect',async t=>{
 const observed=[];const local=await service((req,res)=>{observed.push(req.headers['cache-control']);if(req.url==='/redirect'){res.writeHead(302,{location:'/body'});res.end();}else res.end('pinned');});t.after(local.close);const client=new GitHubReleaseClient({repository:'o/r',apiOrigin:local.url,fixture:true});assert.equal((await client.download('/redirect',{collect:true})).data.toString(),'pinned');assert.deepEqual(observed,['no-cache','no-cache']);
});
