// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {root,execute,environment} from './run.mjs';
import {hash} from './proof.mjs';
const call=promisify(execFile);const editions=[];
for(const edition of ['full','lite']){
 const binary=path.join(root,'.local/bin/local-media-gallery'+(edition==='lite'?'-lite':'')+'.exe');
 const version=await call(binary,['--version','--json'],{windowsHide:true,shell:false});const identity=JSON.parse(version.stdout);assert.equal(identity.edition,edition);assert.equal(identity.version,'0.0.0');
 const help=await call(binary,['--help'],{windowsHide:true,shell:false});assert.ok(help.stdout.includes('[DIRECTORY]'));assert.ok(help.stdout.includes('--detach'));
 await assert.rejects(call(binary,['--unknown-option'],{windowsHide:true,shell:false}),error=>error.code===2);
 const bytes=await readFile(binary);for(const name of ['GALLERY_TEST_SETTINGS_DIR','GALLERY_TEST_HISTORY_DIR','test_discovery_control','s011_resource_snapshot','Unknown profile read test action.','Synthetic directory iterator failure','Synthetic requested root failure','Unknown metadata test action.','Unknown preparation test barrier action.'])assert.equal(bytes.includes(Buffer.from(name)),false,'Private native-test controls absent: '+name);
 const port=55000+Math.floor(Math.random()*1500);const args=edition==='full'?[]:['open',path.join(root,'.local/absent-normal-'+randomUUID()),'--wait'];
 const child=spawn(binary,args,{cwd:root,windowsHide:true,shell:false,stdio:'ignore',env:{...environment,TAURI_WEBDRIVER_PORT:String(port)}});child.once('error',error=>{throw error;});
 try{
  await new Promise(resolve=>setTimeout(resolve,2000));assert.equal(child.exitCode,null);
  await execute('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'scripts/native-input.ps1'),'-AppProcessId',String(child.pid),'-Action','window']);
  await assert.rejects(fetch('http://127.0.0.1:'+port+'/status',{signal:AbortSignal.timeout(1000)}));
  editions.push({edition,sha256:hash(bytes),checks:['ordinary native window','compiled version/edition JSON','help and invalid option exit2','native listener absent','private settings/history/barriers/counters absent',edition==='full'?'selection without history writes':'unavailable explicit root without history writes']});console.log('PASS ordinary '+edition+' native artifact and automation exclusion.');
 }finally{child.kill();await new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)resolve();else child.once('exit',resolve);});}
}
await writeFile(path.join(root,'.local/normal-results.json'),JSON.stringify({finished:new Date().toISOString(),sha256:editions[0].sha256,editions},null,2)+'\n');
