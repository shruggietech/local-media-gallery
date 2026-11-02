// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rename,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {observeReadyDirectory} from '../scripts/linux-clean-recipient.mjs';

test('Direct recipient observer proves readiness before a fast native-style rename',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'lmg-directory-observer-'));let watcher;let resolveObserved;const observed=new Promise(resolve=>{resolveObserved=resolve;});let timer;
 try{const ready=await observeReadyDirectory(directory,(event,name)=>{if(event==='rename'&&name?.toString()==='application')resolveObserved();});watcher=ready.watcher;assert.equal(ready.readiness.observedBeforeLaunch,true);assert.equal(ready.readiness.event,'rename');assert.deepEqual(await readdir(directory),[]);await writeFile(path.join(directory,'application.dpkg-new'),'complete native file');await rename(path.join(directory,'application.dpkg-new'),path.join(directory,'application'));await Promise.race([observed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Ready observer missed fast publish')),3000);})]);}finally{clearTimeout(timer);watcher?.close();assert.ok(path.basename(directory).startsWith('lmg-directory-observer-'));await rm(directory,{recursive:true,force:true});}
});
