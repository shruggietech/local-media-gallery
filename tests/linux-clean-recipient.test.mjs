// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rename,readdir,rm,mkdir,chmod,lstat,readFile,link,unlink,realpath,chown,copyFile} from 'node:fs/promises';
import os from 'node:os';
import {linuxBootstrapWgetrc,withLinuxBootstrapWgetrc} from '../scripts/linux-offline-installer.mjs';
import path from 'node:path';
import {observeReadyDirectory,stageRecipientInstaller,isolateRecipientProfile,captureRecipientState} from '../scripts/linux-clean-recipient.mjs';

test('Direct recipient observer proves readiness before a fast native-style rename',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'lmg-directory-observer-'));let watcher;let resolveObserved;const observed=new Promise(resolve=>{resolveObserved=resolve;});let timer;
 try{const ready=await observeReadyDirectory(directory,(event,name)=>{if(event==='rename'&&name?.toString()==='application')resolveObserved();});watcher=ready.watcher;assert.equal(ready.readiness.observedBeforeLaunch,true);assert.equal(ready.readiness.event,'rename');assert.deepEqual(await readdir(directory),[]);await writeFile(path.join(directory,'application.dpkg-new'),'complete native file');await rename(path.join(directory,'application.dpkg-new'),path.join(directory,'application'));await Promise.race([observed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Ready observer missed fast publish')),3000);})]);}finally{clearTimeout(timer);watcher?.close();assert.ok(path.basename(directory).startsWith('lmg-directory-observer-'));await rm(directory,{recursive:true,force:true});}
});


test('Recipient ingress reuses exact immutable bytes for repeat/adoption and replacement',async()=>{
 const directory=await realpath(await mkdtemp(path.join(os.tmpdir(),'lmg-recipient-ingress-')));const recipient=path.join(directory,'recipient');await mkdir(path.join(recipient,'tmp'),{recursive:true});const source=path.join(directory,'source.run');await writeFile(source,'verified installer input');
 try{for(const name of ['local-media-gallery-full.run','local-media-gallery-next.run']){const first=await stageRecipientInstaller({recipient,source,name});assert.equal(first.reused,false);const before=await lstat(first.target);const second=await stageRecipientInstaller({recipient,source,name});assert.equal(second.reused,true);assert.equal(second.sha256,first.sha256);assert.equal((await lstat(first.target)).ino,before.ino);assert.equal((await lstat(first.target)).mtimeMs,before.mtimeMs);if(process.getuid){assert.equal(before.uid,process.getuid());assert.equal(before.mode&0o777,0o755);}await chmod(first.target,0o755);}
  const target=path.join(recipient,'tmp/local-media-gallery-full.run');await writeFile(source,'different installer input');await assert.rejects(stageRecipientInstaller({recipient,source,name:'local-media-gallery-full.run'}),/ingress bytes differ/);assert.equal(await readFile(target,'utf8'),'verified installer input');
  await assert.rejects(stageRecipientInstaller({recipient,source,name:'../escape.run'}),/Unknown recipient ingress/);
  await unlink(target);await link(source,target);await assert.rejects(stageRecipientInstaller({recipient,source,name:'local-media-gallery-full.run'}),/single-link/);assert.equal(await readFile(source,'utf8'),'different installer input');
 }finally{assert.ok(path.basename(directory).startsWith('lmg-recipient-ingress-'));await rm(directory,{recursive:true,force:true});}
});


test('Root ingress takes ownership from an ordinary-user source before sticky-directory reuse',{skip:process.platform!=='linux'||process.getuid()!==0},async()=>{
 const directory=await realpath(await mkdtemp(path.join(os.tmpdir(),'lmg-root-ingress-'))),recipient=path.join(directory,'recipient'),temporary=path.join(recipient,'tmp');await mkdir(temporary,{recursive:true});await chmod(temporary,0o1777);const source=path.join(directory,'ordinary-user-source.run');await writeFile(source,'exact retained installer');await chown(source,65534,65534);
 try{const legacy=path.join(temporary,'legacy.run');await copyFile(source,legacy);assert.equal((await lstat(legacy)).uid,65534,'libuv copies source ownership even for root');if((await readFile('/proc/sys/fs/protected_regular','utf8')).trim()==='2')await assert.rejects(copyFile(source,legacy),{code:'EACCES'});
  for(const name of ['local-media-gallery-full.run','local-media-gallery-next.run']){const first=await stageRecipientInstaller({recipient,source,name});assert.equal((await lstat(first.target)).uid,0);assert.equal((await lstat(first.target)).gid,0);const next=await stageRecipientInstaller({recipient,source,name});assert.equal(next.reused,true);assert.equal(next.sha256,first.sha256);}assert.equal((await lstat(source)).uid,65534);
 }finally{assert.ok(path.basename(directory).startsWith('lmg-root-ingress-'));await rm(directory,{recursive:true,force:true});}
});


test('Canonical profile fixture uses the same ordinary home and restores current bytes after success or failure',async()=>{
 const directory=await realpath(await mkdtemp(path.join(os.tmpdir(),'lmg-profile-isolation-')));
 try{for(const fail of [false,true]){const profile=path.join(directory,fail?'failed':'successful'),settings=path.join(profile,'home/.config/app/settings.json');await mkdir(path.dirname(settings),{recursive:true});await writeFile(settings,'current0.2 exact retained bytes');const exercise=async({directory,saved})=>{assert.equal(directory,profile);assert.equal(await readFile(path.join(saved,'home/.config/app/settings.json'),'utf8'),'current0.2 exact retained bytes');await mkdir(path.dirname(settings),{recursive:true});await writeFile(settings,'canonical0.1 fixture bytes');if(fail)throw Error('native observation failed');return 'verified';};if(fail)await assert.rejects(isolateRecipientProfile(profile,exercise),/native observation failed/);else assert.equal((await isolateRecipientProfile(profile,exercise)).value,'verified');assert.equal(await readFile(settings,'utf8'),'current0.2 exact retained bytes');assert.equal(await readFile(path.join(profile+'-published-predecessor','home/.config/app/settings.json'),'utf8'),'canonical0.1 fixture bytes');}
 }finally{await rm(directory,{recursive:true,force:true});}
});


test('Authoritative profile capture excludes live cache symlinks/sockets while preserving regular state and the whole original profile',async()=>{
 const fs=await import('node:fs/promises'),{createServer}=await import('node:net'),{collectPayload}=await import('../scripts/proof.mjs');const work=await realpath(await mkdtemp(path.join(os.tmpdir(),'lmg-profile-state-'))),base=path.join(work,'profile'),env={HOME:path.join(base,'home'),XDG_CONFIG_HOME:path.join(base,'home/.config'),XDG_STATE_HOME:path.join(base,'home/.local/state'),XDG_DATA_HOME:path.join(base,'home/.local/share'),XDG_CACHE_HOME:path.join(base,'home/.cache')};let server;
 try{for(const [key,directory]of Object.entries(env)){await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'retained-'+key+'.txt'),'retain '+key);}const settings=path.join(env.XDG_CONFIG_HOME,'tech.shruggie.local-media-gallery/settings.json'),history=path.join(env.XDG_STATE_HOME,'tech.shruggie.local-media-gallery/history.sqlite3');await mkdir(path.dirname(settings));await mkdir(path.dirname(history));await writeFile(settings,'{"version":"0.1.0"}\n');await writeFile(history,Buffer.concat([Buffer.from('SQLite format 3\0'),Buffer.alloc(100)]));await writeFile(history+'-wal','committed WAL bytes');await writeFile(history+'-shm','derived shared index');await writeFile(path.join(env.XDG_CACHE_HOME,'derived-lock'),'derived cache state');const outside=path.join(work,'outside');await mkdir(outside);await writeFile(path.join(outside,'private'),'must not traverse');
  if(process.platform==='linux'){await fs.symlink(outside,path.join(env.XDG_CACHE_HOME,'derived-link'));server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(path.join(env.XDG_CACHE_HOME,'derived-socket'),resolve);});await assert.rejects(collectPayload(base));}
  const profile={base,env},inventory=await captureRecipientState(profile,path.join(work,'evidence'));assert.equal(inventory.length,8);assert.ok(inventory.some(file=>file.path.endsWith('history.sqlite3-wal')));assert.ok(inventory.every(file=>!file.path.endsWith('-shm')&&!file.path.includes('derived')));assert.deepEqual(await collectPayload(path.join(work,'evidence')),inventory);
  await isolateRecipientProfile(base,async({directory})=>{await writeFile(path.join(directory,'new-profile'),'canonical fixture');});assert.deepEqual(await captureRecipientState(profile),inventory);assert.equal(await readFile(history+'-wal','utf8'),'committed WAL bytes');assert.equal(await readFile(history+'-shm','utf8'),'derived shared index');if(process.platform==='linux'){assert.ok((await lstat(path.join(env.XDG_CACHE_HOME,'derived-link'))).isSymbolicLink());assert.ok((await lstat(path.join(env.XDG_CACHE_HOME,'derived-socket'))).isSocket());await fs.rename(settings,settings+'.original');await fs.symlink(path.join(outside,'private'),settings);await assert.rejects(captureRecipientState(profile),/physical single-link/);await fs.unlink(settings);await fs.rename(settings+'.original',settings);}
 }finally{if(server)await new Promise(resolve=>server.close(resolve));await rm(work,{recursive:true,force:true});}
});

test('Bootstrap Wget runs as the download account, retries finitely and preserves terminal refusals',{skip:process.platform!=='linux'||process.getuid()!==0||process.env.GALLERY_PRIVILEGED_PACKAGE_TESTS!=='1'},async()=>{
 const fs=await import('node:fs/promises'),path=await import('node:path'),os=await import('node:os'),http=await import('node:http'),{execFile}=await import('node:child_process'),{promisify}=await import('node:util');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'linux-bootstrap-wget-')),payload=Buffer.from('complete baseline package bytes');const counts=new Map();let settingsPath;
 const server=http.createServer((request,response)=>{const count=(counts.get(request.url)??0)+1;counts.set(request.url,count);if(request.url==='/missing'){response.writeHead(404);response.end('missing');return;}if(request.url==='/unavailable'||count<5){response.writeHead(503);response.end('temporary failure');return;}response.writeHead(200,{'Content-Length':payload.length});response.end(payload);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 try{await withLinuxBootstrapWgetrc(directory,async config=>{settingsPath=config;assert.equal((await fs.stat(path.dirname(config))).mode&0o777,0o755);assert.equal((await fs.stat(config)).mode&0o777,0o644);
  const download=async route=>{const operation=promisify(execFile)('/usr/bin/sudo',['-n','/usr/sbin/runuser','-u','_apt','--','/usr/bin/env','WGETRC='+config,'/usr/bin/wget','--no-proxy','--output-document=-',origin+route],{windowsHide:true,shell:false,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});operation.child.stdin.end();return operation;};
  const recovered=await download('/recover');assert.equal(counts.get('/recover'),5);assert.equal(recovered.stdout,payload.toString());await assert.rejects(download('/unavailable'),error=>Number.isInteger(error.code)&&error.code>0&&!error.killed&&!error.signal);assert.equal(counts.get('/unavailable'),5);await assert.rejects(download('/missing'),error=>Number.isInteger(error.code)&&error.code>0&&!error.killed&&!error.signal);assert.equal(counts.get('/missing'),1);
 });await assert.rejects(fs.stat(settingsPath),{code:'ENOENT'});assert.equal(await fs.readFile(path.join(directory,'bootstrap.wgetrc'),'utf8'),linuxBootstrapWgetrc);}
 finally{await new Promise(resolve=>server.close(resolve));assert.ok(path.basename(directory).startsWith('linux-bootstrap-wget-'));await fs.rm(directory,{recursive:true,force:true});}
});
