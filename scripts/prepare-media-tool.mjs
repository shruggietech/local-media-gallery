// SPDX-License-Identifier: Apache-2.0
// Maintainer-only proof prerequisite. The product never downloads or searches PATH for tools.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,chmod,stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {root} from './run.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const base='https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/';
const pins={
 'win32-x64':{compressedBytes:29581307,compressed:'8883a3dffbd0a16cf4ef95206ea05283f78908dbfb118f73c83f4951dcc06d77',bytes:82797568,binary:'04e1307997530f9cf2fe35cba2ca7e8875ca91da02f89d6c7243df819c94ad00',license:'8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903',readme:'a636a7183c58006351acbaf35303c0ed85c6e1320fd4e80de453ba6157de6311'},
 'linux-x64':{compressedBytes:29354986,compressed:'bfe8a8fc511530457b528c48d77b5737527b504a3797a9bc4866aeca69c2dffa',bytes:79826272,binary:'e7e7fb30477f717e6f55f9180a70386c62677ef8a4d4d1a5d948f4098aa3eb99',license:'8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903',readme:'72f4b1b06d419d22ace6e7cc75f06826f90737345aa0b1736158929f4aacc537'},
 'darwin-arm64':{compressedBytes:19246198,compressed:'8923876afa8db5585022d7860ec7e589af192f441c56793971276d450ed3bbfa',bytes:45568216,binary:'a90e3db6a3fd35f6074b013f948b1aa45b31c6375489d39e572bea3f18336584',license:'cb48bf09a11f5fb576cddb0431c8f5ed0a60157a9ec942adffc13907cbe083f2',readme:'05ba4b92c96605434b1aaae3eedf5a2c280c9607bf78ffca9a5b536d9af2dc6a'},
};
async function run(binary,args){const promise=promisify(execFile)(binary,args,{windowsHide:true,shell:false,timeout:10000,maxBuffer:1024*1024});promise.child?.stdin?.end();return (await promise).stdout;}
export async function prepareMediaTool({download=false}={}){
 const key=process.platform+'-'+process.arch;const pin=pins[key];assert.ok(pin,'No elected proof provider for '+key);const directory=path.join(root,'.local/tools/ffmpeg-b6.1.1',key);const configured=process.env.GALLERY_FFMPEG??process.env.FFMPEG;let binary=configured;let receipt;
 if(configured){assert.ok(path.isAbsolute(configured),'Configured maintainer helper must be absolute');const bytes=await readFile(configured);receipt={source:'explicit maintainer executable',downloadBytes:null,extractedBytes:bytes.length,sha256:hash(bytes),associatedPayloadBytes:null,payloads:[],closure:'Dynamic/neighbor dependency closure unobserved'};}
 else{binary=path.join(directory,'ffmpeg'+(process.platform==='win32'?'.exe':''));let bytes;try{bytes=await readFile(binary);}catch{assert.ok(download,'Run npm run prepare:local before qualification to fetch elected media proof tool');await mkdir(directory,{recursive:true});const name='ffmpeg-'+key+'.gz';const response=await fetch(base+name);assert.ok(response.ok,'Tool download '+response.status);const compressed=Buffer.from(await response.arrayBuffer());assert.equal(compressed.length,pin.compressedBytes);assert.equal(hash(compressed),pin.compressed);bytes=gunzipSync(compressed,{maxOutputLength:pin.bytes});assert.equal(bytes.length,pin.bytes);assert.equal(hash(bytes),pin.binary);await writeFile(path.join(directory,name),compressed);await writeFile(binary,bytes);await chmod(binary,0o755);}
 assert.equal(bytes.length,pin.bytes);assert.equal(hash(bytes),pin.binary);const payloads=[];for(const [ext,digest]of [['LICENSE',pin.license],['README',pin.readme]]){const name=key+'.'+ext;const file=path.join(directory,name);let payload;try{payload=await readFile(file);}catch{assert.ok(download,'Missing proof tool license/readme prerequisite');const response=await fetch(base+name);assert.ok(response.ok);payload=Buffer.from(await response.arrayBuffer());assert.equal(hash(payload),digest);await writeFile(file,payload);}assert.equal(hash(payload),digest);payloads.push({name,bytes:payload.length,sha256:digest,source:base+name});}
 receipt={source:base+'ffmpeg-'+key+'.gz',downloadBytes:pin.compressedBytes,downloadSha256:pin.compressed,extractedBytes:pin.bytes,sha256:pin.binary,associatedPayloadBytes:payloads.reduce((n,p)=>n+p.bytes,0),payloads,closure:'Published static executable plus elected LICENSE/README; host runtime libraries remain external'};
 }
 const version=(await run(binary,['-version'])).split(/\r?\n/)[0];const protocols=await run(binary,['-hide_banner','-protocols']);assert.ok(protocols.split(/\r?\n/).some(line=>line.trim()==='fd'),'Proof helper needs seekable fd protocol');const encoders=await run(binary,['-hide_banner','-encoders']);for(const codec of ['libx264','aac','png'])assert.ok(encoders.includes(codec),'Fixture/proof encoder '+codec);receipt={...receipt,binary,version,protocols:['fd','pipe'],prepared:new Date().toISOString(),selection:'Maintainer qualification only; never bundled or auto-installed by product'};await mkdir(path.join(root,'.local'),{recursive:true});await writeFile(path.join(root,'.local/media-tool.json'),JSON.stringify(receipt,null,2)+'\n');return receipt;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){console.log(JSON.stringify(await prepareMediaTool({download:true}),null,2));}
