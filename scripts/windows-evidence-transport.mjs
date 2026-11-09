// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream,constants} from 'node:fs';
import {lstat,mkdir,readdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {payloadPath} from './proof.mjs';

export const windowsTransportFormat='sha256-blobs-v1';
const manifestPath='.local/windows-update-evidence-transport.json',blobPath='.local/windows-update-evidence-blobs';
const maxManifest=32*1024**2,maxFile=512*1024**2,maxLogical=8*1024**3,maxUnique=2*1024**3,maxEntries=20000;
function portable(value){
 payloadPath(value);assert.ok(value.length<=2048);
 for(const segment of value.split('/')){assert.doesNotMatch(segment,/[<>"|?*]|[. ]$/);assert.doesNotMatch(segment,/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i);}
 return value;
}
function budget({deadline=null}={}){return ()=>{if(deadline!==null){assert.ok(Number.isFinite(deadline));assert.ok(Date.now()<deadline,'Qualification deadline for Windows evidence transport');}return deadline;};}
async function physical(root,relative='',create=false){
 const base=await lstat(root);assert.ok(base.isDirectory()&&!base.isSymbolicLink(),'Physical evidence workspace required');
 let directory=root;if(relative)for(const segment of portable(relative).split('/')){directory=path.join(directory,segment);let info;try{info=await lstat(directory);}catch(error){if(error.code!=='ENOENT'||!create)throw error;try{await mkdir(directory,{mode:0o700});}catch(e){if(e.code!=='EEXIST')throw e;}info=await lstat(directory);}assert.ok(info.isDirectory()&&!info.isSymbolicLink(),'Redirected evidence parent');}return directory;
}
async function fileDigest(file,check){
 const deadline=check(),info=await lstat(file);assert.ok(info.isFile()&&!info.isSymbolicLink(),'Regular evidence file required');assert.ok(info.size<=maxFile,'Evidence file exceeds bound');
 const hash=createHash('sha256');let size=0;const stream=createReadStream(file,{...(deadline===null?{}:{signal:AbortSignal.timeout(Math.max(1,deadline-Date.now()))})});
 for await(const bytes of stream){check();size+=bytes.length;assert.ok(size<=maxFile);hash.update(bytes);}check();assert.equal(size,info.size,'Evidence changed while reading');return {bytes:String(size),sha256:hash.digest('hex')};
}
function rootsFor(result){
 assert.ok(Array.isArray(result.updates?.transitions)&&result.updates.transitions.length>0&&result.updates.transitions.length<=32);
 const roots=result.updates.transitions.map(t=>{assert.equal(typeof t.evidenceDirectory,'string');const dir=portable(t.evidenceDirectory.replaceAll('\\','/'));assert.match(dir,/^\.local\/windows-package-test-[A-Za-z0-9_-]+\/update-evidence-[a-f0-9]{16}$/);return dir;});assert.equal(new Set(roots.map(r=>r.toLowerCase())).size,roots.length);return roots;
}
async function inventory(root,relative,check){
 const directory=await physical(root,relative),directories=[],files=[],seen=new Set();
 async function visit(dir,base=''){
  check();for(const entry of await readdir(dir,{withFileTypes:true})){const rel=portable(base?base+'/'+entry.name:entry.name),key=rel.toLowerCase();assert.equal(seen.has(key),false,'Windows evidence path alias');seen.add(key);assert.ok(seen.size<=maxEntries);const file=path.join(dir,entry.name),info=await lstat(file);assert.equal(info.isSymbolicLink(),false,'Evidence links are not permitted');if(info.isDirectory()){directories.push(rel);await visit(file,rel);}else{assert.ok(info.isFile(),'Regular evidence entry required');files.push({path:rel,...await fileDigest(file,check)});}}
 }
 await visit(directory);directories.sort();files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);return {path:relative,directories,files};
}
export function validateWindowsTransportReference(build,result){
 if(!Object.hasOwn(build,'windowsUpdateEvidenceTransport'))return false;
 assert.equal(build.windowsUpdateEvidenceTransport,windowsTransportFormat,'Unknown Windows update evidence transport');assert.deepEqual(result.source,build.source);assert.equal(result.revision,build.revision);const ref=result.updateEvidenceTransport;
 assert.equal(ref?.format,windowsTransportFormat,'Windows update evidence transport required');assert.equal(ref.path,manifestPath);assert.match(ref.bytes??'',/^[1-9][0-9]*$/);assert.ok(BigInt(ref.bytes)<=BigInt(maxManifest));assert.match(ref.sha256??'',/^[a-f0-9]{64}$/);return true;
}
function validateManifest(value,result){
 assert.match(result.source?.sha256??'',/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(result.source.files)&&result.source.files>0);assert.match(result.revision??'',/^[a-f0-9]{40}$/);assert.equal(value.formatVersion,1);assert.equal(value.kind,windowsTransportFormat);assert.deepEqual(value.source,result.source);assert.equal(value.revision,result.revision);assert.deepEqual(value.roots?.map(r=>r.path),rootsFor(result));
 let logical=0,count=0;const blobs=new Map();
 for(const root of value.roots){assert.ok(Array.isArray(root.directories)&&Array.isArray(root.files)&&root.files.length>0);const names=new Set();
  for(const name of [...root.directories,...root.files.map(f=>f.path)]){portable(name);assert.equal(names.has(name.toLowerCase()),false,'Windows evidence path alias');names.add(name.toLowerCase());assert.ok(++count<=maxEntries);}
  assert.deepEqual(root.directories,[...root.directories].sort());assert.deepEqual(root.files.map(f=>f.path),root.files.map(f=>f.path).sort());const dirs=new Set(root.directories);
  for(const name of [...root.directories,...root.files.map(f=>f.path)]){const segments=name.split('/');segments.pop();while(segments.length){assert.ok(dirs.has(segments.join('/')),'Missing evidence parent directory');segments.pop();}}
  for(const file of root.files){assert.match(file.bytes??'',/^(0|[1-9][0-9]*)$/);const size=BigInt(file.bytes);assert.ok(size<=BigInt(maxFile));assert.match(file.sha256??'',/^[a-f0-9]{64}$/);logical+=Number(size);assert.ok(logical<=maxLogical);if(blobs.has(file.sha256))assert.equal(blobs.get(file.sha256),file.bytes);else blobs.set(file.sha256,file.bytes);}
 }
 assert.ok([...blobs.values()].reduce((n,size)=>n+Number(size),0)<=maxUnique);return blobs;
}
export async function packWindowsUpdateEvidence(result,root,options={}){
 const check=budget(options);check();const roots=[];for(const dir of rootsFor(result))roots.push(await inventory(root,dir,check));
 const manifest={formatVersion:1,kind:windowsTransportFormat,source:result.source,revision:result.revision,roots},expected=validateManifest(manifest,result),directory=await physical(root,blobPath,true);assert.deepEqual(await readdir(directory),[],'Fresh evidence blob directory required');const written=new Set();
 for(const tree of roots)for(const file of tree.files){check();if(written.has(file.sha256))continue;const output=path.join(directory,file.sha256);await copyFile(path.join(root,tree.path,file.path),output,constants.COPYFILE_EXCL);assert.deepEqual(await fileDigest(output,check),{bytes:file.bytes,sha256:file.sha256});written.add(file.sha256);}
 assert.equal(written.size,expected.size);const raw=Buffer.from(JSON.stringify(manifest,null,2)+'\n');assert.ok(raw.length<=maxManifest);check();await writeFile(path.join(root,manifestPath),raw,{flag:'wx',mode:0o600});check();return {format:windowsTransportFormat,path:manifestPath,bytes:String(raw.length),sha256:createHash('sha256').update(raw).digest('hex')};
}
export async function materializeWindowsUpdateEvidence(build,result,root,options={}){
 if(!validateWindowsTransportReference(build,result))return false;const check=budget(options);check();const ref=result.updateEvidenceTransport;await physical(root,'.local');const manifestFile=path.join(root,manifestPath),info=await lstat(manifestFile);assert.ok(info.isFile()&&!info.isSymbolicLink());assert.equal(String(info.size),ref.bytes);assert.ok(info.size<=maxManifest);const raw=await readFile(manifestFile);assert.equal(createHash('sha256').update(raw).digest('hex'),ref.sha256,'Evidence manifest digest mismatch');const manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)),blobs=validateManifest(manifest,result),directory=await physical(root,blobPath);
 assert.deepEqual((await readdir(directory)).sort(),[...blobs.keys()].sort(),'Complete exact evidence blob set required');for(const [sha256,bytes]of blobs){check();assert.deepEqual(await fileDigest(path.join(directory,sha256),check),{bytes,sha256},'Evidence blob differs');}
 for(const tree of manifest.roots){await physical(root,tree.path,true);for(const dir of tree.directories)await physical(root,tree.path+'/'+dir,true);for(const file of tree.files){check();const target=path.join(root,tree.path,file.path);let exists=true;try{await lstat(target);}catch(error){if(error.code!=='ENOENT')throw error;exists=false;}if(!exists){try{await copyFile(path.join(directory,file.sha256),target,constants.COPYFILE_EXCL);}catch(error){if(error.code!=='EEXIST')throw error;}}assert.deepEqual(await fileDigest(target,check),{bytes:file.bytes,sha256:file.sha256},'Existing or restored evidence differs');}assert.deepEqual(await inventory(root,tree.path,check),tree,'Complete restored evidence inventory differs');}
 check();return true;
}
