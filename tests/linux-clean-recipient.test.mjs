// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rename,readdir,rm,mkdir,chmod,lstat,readFile,link,unlink,realpath,chown,copyFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {observeReadyDirectory,stageRecipientInstaller,isolateRecipientProfile} from '../scripts/linux-clean-recipient.mjs';

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
