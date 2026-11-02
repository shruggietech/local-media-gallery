// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,chmod,mkdir,readdir,lstat} from 'node:fs/promises';
import path from 'node:path';
import {root} from './run.mjs';

const magic=Buffer.from('LMG-SINGLE-FILE1\0','ascii');
const hash=b=>createHash('sha256').update(b).digest('hex');
const bound=16*1024*1024;
export function nativeFormat(b){
 if(b.length>=64&&b.subarray(0,4).equals(Buffer.from([0x7f,0x45,0x4c,0x46])))return {format:'elf',os:'linux'};
 if(b.length>=64&&b.subarray(0,2).toString('ascii')==='MZ')return {format:'exe',os:'windows'};
 if(b.length>=32&&[0xfeedfacf,0xcffaedfe].includes(b.readUInt32LE(0)))return {format:'mach-o',os:'macos'};
 throw Error('Expected one native PE, ELF or Mach-O executable');
}
function validateMetadata(m){
 assert.equal(m.kind,'local-media-gallery-single-file');assert.equal(m.formatVersion,1);assert.equal(m.product,'local-media-gallery');assert.match(m.version,/^\d+\.\d+\.\d+$/);assert.equal(m.edition,'lite');assert.ok(['windows','linux','macos'].includes(m.os));assert.ok(['x86_64','aarch64'].includes(m.arch));assert.match(m.generation,/^[A-Za-z0-9-]{1,128}$/);assert.match(m.source?.sha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(m.source.files)&&m.source.files>0);assert.match(m.revision,/^[a-f0-9]{40}$/);
 assert.ok(Array.isArray(m.notices)&&m.notices.length>0&&m.notices.length<=8192);const seen=new Set();for(const n of m.notices){assert.ok(n&&typeof n.path==='string'&&n.path.length<1024&&!/[\\:\x00-\x1f]/.test(n.path)&&n.path.split('/').every(p=>p&&p!=='.'&&p!=='..'),'Unsafe notice path');assert.ok(!seen.has(n.path.toLowerCase()),'Duplicate notice');seen.add(n.path.toLowerCase());assert.ok(typeof n.text==='string'&&!n.text.includes('\u0000')&&!n.text.startsWith('\ufeff'));}
 assert.ok(Array.isArray(m.prerequisites)&&m.prerequisites.every(p=>typeof p==='string'));
 assert.match(m.executableSha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(m.executableBytes)&&m.executableBytes>=32);
}
export function encodeSingleFile(executable,metadata){
 assert.ok(Buffer.isBuffer(executable));assert.ok(!executable.subarray(-magic.length).equals(magic),'Executable already contains single-file metadata');
 const native=nativeFormat(executable);assert.equal(native.os,metadata.os,'Native executable platform mismatch');
 const m={...metadata,kind:'local-media-gallery-single-file',formatVersion:1,product:'local-media-gallery',prerequisites:metadata.prerequisites??[],executableBytes:executable.length,executableSha256:hash(executable)};
 validateMetadata(m);const json=Buffer.from(JSON.stringify(m)+'\n','utf8');assert.ok(json.length<=bound,'Embedded metadata exceeds bound');
 const tail=Buffer.alloc(8+32+magic.length);tail.writeBigUInt64LE(BigInt(json.length));Buffer.from(hash(json),'hex').copy(tail,8);magic.copy(tail,40);
 return Buffer.concat([executable,json,tail]);
}
export function decodeSingleFile(bytes){
 assert.ok(Buffer.isBuffer(bytes)&&bytes.length>40+magic.length);assert.ok(bytes.subarray(-magic.length).equals(magic),'Missing single-file metadata footer');
 const at=bytes.length-40-magic.length,length=bytes.readBigUInt64LE(at);assert.ok(length>0n&&length<=BigInt(bound)&&length<BigInt(at),'Invalid metadata size');
 const start=at-Number(length),json=bytes.subarray(start,at);assert.equal(hash(json),bytes.subarray(at+8,at+40).toString('hex'),'Embedded metadata digest mismatch');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(json),m=JSON.parse(text);assert.equal(text,JSON.stringify(m)+'\n','Canonical embedded metadata required');validateMetadata(m);
 const executable=bytes.subarray(0,start);assert.equal(executable.length,m.executableBytes);assert.equal(hash(executable),m.executableSha256,'Embedded executable digest mismatch');assert.equal(nativeFormat(executable).os,m.os);
 return {metadata:m,executable};
}
export async function readSingleFile(file){return decodeSingleFile(await readFile(file));}
async function noticeTree(directory,prefix=''){
 const notices=[];for(const e of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,e.name),name=prefix+e.name;assert.equal(e.isSymbolicLink(),false,'Redirected embedded notice');if(e.isDirectory())notices.push(...await noticeTree(file,name+'/'));else if(e.isFile())notices.push({path:name,text:new TextDecoder('utf-8',{fatal:true}).decode(await readFile(file)).replace(/^\ufeff/,'').replaceAll('\r\n','\n')});}return notices;
}
export async function writeLiteArtifact({binary,output,metadata,noticesDirectory}){
 assert.ok((await lstat(binary)).isFile()&&!(await lstat(binary)).isSymbolicLink());
 let notices=metadata.notices;if(!notices){assert.ok(noticesDirectory,'Complete dependency notices directory required');notices=await noticeTree(noticesDirectory,'licenses/dependencies/');for(const [name,file] of [['LICENSE','LICENSE'],['NOTICE','NOTICE'],['licenses/brand.md','brand/kit/LICENSE-BRAND.md'],['licenses/OFL-Geist.txt','brand/kit/fonts/licenses/OFL-Geist.txt'],['licenses/OFL-Space-Grotesk.txt','brand/kit/fonts/licenses/OFL-Space-Grotesk.txt']])notices.push({path:name,text:(await readFile(path.join(root,file),'utf8')).replaceAll('\r\n','\n')});}
 const bytes=encodeSingleFile(await readFile(binary),{...metadata,notices});await mkdir(path.dirname(output),{recursive:true});await writeFile(output,bytes);await chmod(output,0o755);const result=decodeSingleFile(await readFile(output));
 const name=path.basename(output),digest=hash(bytes),size=String(bytes.length);return {path:path.relative(root,output).replaceAll('\\','/'),bytes:size,sha256:digest,format:nativeFormat(bytes).format,binary:name,files:[{path:name,bytes:size,sha256:digest,mode:metadata.os==='windows'?null:'755'}],metadata:result.metadata};
}
