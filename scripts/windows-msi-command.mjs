// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,mkdtemp,readFile,writeFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';

export function msiCommandArguments(args){
 assert.ok(Array.isArray(args));let operand=false;
 return args.map(arg=>{
  assert.equal(typeof arg,'string');assert.equal(/["\r\n\0]/.test(arg),false);
  if(operand){operand=false;return /^\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}$/i.test(arg)?arg:'"'+arg.replace(/(\\+)$/,'$1$1')+'"';}
  if(/^\/(?:i|package|x|uninstall|a|p|update|f[a-z]*|l[a-z*+!]*)$/i.test(arg))operand=true;
  const property=/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(arg);
  if(property)return property[1]+'="'+property[2]+'"';
  return arg===''||/\s/.test(arg)?'"'+arg.replace(/(\\+)$/,'$1$1')+'"':arg;
 });
}
export function verifyMissingPackageOutcome(error,log){
 assert.equal(error?.code,1619,'Expected native missing-package exit 1619');
 assert.equal(error.killed,false,'Readiness must not be a killed help dialog');
 assert.equal(error.signal,null,'Readiness must have a native terminal exit');
 assert.ok(Buffer.isBuffer(log)&&log.length>0,'Native verbose log must exist');
}
export async function verifyMsiCommandReadiness({root,env=process.env}){
 requireIsolatedDesktop(env);assert.equal(process.platform,'win32');
 const local=path.join(root,'.local');await mkdir(local,{recursive:true});
 const directory=await mkdtemp(path.join(local,'msi-command-ready-')),missing=path.join(directory,'absent = 雪.msi'),log=path.join(directory,'native command.log');
 await assert.rejects(lstat(missing),{code:'ENOENT'});
 const args=msiCommandArguments(['/i',missing,'/qn','/norestart','/L*v',log,'LMG_PATH=','LMG_STARTMENU=1']);let failure;
 const began=new Date().toISOString();
 try{const pending=promisify(execFile)(path.join(env.SystemRoot,'System32/msiexec.exe'),args,{cwd:root,env,windowsHide:true,shell:false,windowsVerbatimArguments:true,timeout:15000,maxBuffer:1024*1024});pending.child.stdin.end();await pending;}catch(error){failure=error;}
 const entry=await lstat(log).catch(()=>null);const bytes=entry?.isFile()&&!entry.isSymbolicLink()&&entry.size<=1024*1024?await readFile(log):Buffer.alloc(0);
 const record={result:'pending',started:began,finished:new Date().toISOString(),code:failure?.code??0,killed:failure?.killed??false,signal:failure?.signal??null,log:path.relative(root,log).replaceAll('\\','/'),logBytes:bytes.length,input:'Intentionally absent package; expected failure before product execution'};
 try{verifyMissingPackageOutcome(failure,bytes);await assert.rejects(lstat(missing),{code:'ENOENT'});record.result='ready';}catch(error){record.result='fail';record.failure=error.message;await writeFile(path.join(local,'windows-msi-command-readiness.json'),JSON.stringify(record,null,2)+'\n');throw Error('Windows Installer command readiness failed: '+JSON.stringify(record),{cause:error});}
 await writeFile(path.join(local,'windows-msi-command-readiness.json'),JSON.stringify(record,null,2)+'\n');
 console.log('::notice title=Windows Installer command readiness::Native missing-package exit 1619 and verbose logging observed.');return record;
}
