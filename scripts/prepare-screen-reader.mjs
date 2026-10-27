// SPDX-License-Identifier: Apache-2.0
import {mkdir,readFile,writeFile,stat,readdir,open,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root,execute} from './run.mjs';
import {digest} from './runtime-evidence.mjs';
const pin={version:'2026.3',url:'https://download.nvaccess.org/releases/2026.3/nvda_2026.3.exe',sha256:'a8a87cb823da0c62cfbae4a444ae5ae238d54dc82ad6d46d3fdb3fef082799b2'};
export async function prepareScreenReader(){
 if(process.platform!=='win32')return null;
 const base=path.join(root,'.local');await mkdir(base,{recursive:true});const receipt=path.join(base,'nvda-tool.json');
 try{const r=JSON.parse(await readFile(receipt));if(r.download.sha256!==pin.sha256)throw new Error('NVDA pin mismatch');for(const f of r.files){const b=await readFile(path.join(r.directory,f.name));if(String(b.length)!==f.bytes||digest(b)!==f.sha256)throw new Error('Prepared NVDA payload changed: '+f.name);}return r;}catch(e){if(e.code!=='ENOENT')throw e;}
 const installer=path.join(base,'nvda-'+pin.version+'.exe');let bytes;
 try{bytes=await readFile(installer);}catch(e){if(e.code!=='ENOENT')throw e;const response=await fetch(pin.url,{signal:AbortSignal.timeout(90000)});if(!response.ok)throw new Error('NVDA download HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>100*1024*1024)throw new Error('NVDA download exceeds bound');if(digest(bytes)!==pin.sha256)throw new Error('NVDA publisher checksum mismatch');await writeFile(installer,bytes,{flag:'wx'});}
 if(digest(bytes)!==pin.sha256)throw new Error('NVDA publisher checksum mismatch');
 const directory=await mkdtemp(path.join(base,'nvda-portable-'));const config=await mkdtemp(path.join(base,'nvda-prepare-config-'));
 await execute(installer,['--minimal','--create-portable-silent','--portable-path='+directory,'--config-path='+config]);
 const files=[];async function inventory(dir,prefix=''){for(const entry of await readdir(dir,{withFileTypes:true})){const name=prefix+entry.name;const full=path.join(dir,entry.name);if(entry.isSymbolicLink())throw new Error('Unexpected NVDA payload link');if(entry.isDirectory())await inventory(full,name+'/');else {const b=await readFile(full);files.push({name,bytes:String(b.length),sha256:digest(b)});}}}await inventory(directory);files.sort((a,b)=>a.name.localeCompare(b.name));
 const binary=path.join(directory,'nvda.exe');await stat(binary);const license=files.filter(f=>/licen[sc]e|copying/i.test(f.name));if(!license.length)throw new Error('NVDA license payload missing');
 const result={...pin,directory,binary,download:{url:pin.url,bytes:String(bytes.length),sha256:pin.sha256},files,license,payloadBytes:files.reduce((n,f)=>n+BigInt(f.bytes),0n).toString()};await writeFile(receipt,JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const r=await prepareScreenReader();console.log(JSON.stringify(r?{version:r.version,binary:r.binary,download:r.download,payloadBytes:r.payloadBytes,files:r.files.length}:null));}
