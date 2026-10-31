// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {updateDescriptor,validateUpdateEvidence} from './update-packages.mjs';
import {hash,payloadPath,verifyPayload} from './proof.mjs';
export {hash};
export function linuxGalleryReady(records){
 return records.some(r=>r.name==='Open red.png'&&r.showing&&r.enabled)&&records.some(r=>['Hide controls','Show controls'].includes(r.name)&&r.showing&&r.enabled);
}
export const packageName='local-media-gallery';
export const fullBase='usr/lib/local-media-gallery/';
export const desktop='usr/share/applications/tech.shruggie.local-media-gallery.desktop';
export const iconPaths=['48','256','512'].map(s=>'usr/share/icons/hicolor/'+s+'x'+s+'/apps/tech.shruggie.local-media-gallery.png');
const topKeys=['formatVersion','product','kind','version','edition','os','arch','targetTriple','buildProfile','generation','source','revision','binary','entrypoint','candidate','dependencies','files'];
export function linuxPath(value,edition){
 payloadPath(value);assert.ok(value.length<=240&&!['|','*','?','[',']'].some(c=>value.includes(c)),'Unsafe Linux authority path');
 const base=edition==='full'?fullBase:'';
 const names=[base+'local-media-gallery.bin',base+'lmg-update',edition==='full'?'usr/bin/local-media-gallery':'local-media-gallery',base+'candidate.json',base+'LICENSE',base+'NOTICE',base+'PREREQUISITES.txt'];
 assert.ok(names.includes(value)||value.startsWith(base+'licenses/')||(edition==='full'&&[desktop,'usr/share/doc/local-media-gallery/copyright',...iconPaths].includes(value)),'File outside owned Linux payload');return value;
}
export function validateLinuxFile(f,edition){
 assert.deepEqual(Object.keys(f).sort(),['path','bytes','sha256','mode'].sort());linuxPath(f.path,edition);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.bytes,/^(0|[1-9][0-9]*)$/);assert.ok(['644','755'].includes(f.mode));return f;
}
export function validateLinuxPayload(p){
 assert.deepEqual(Object.keys(p).sort(),topKeys.slice().sort());assert.equal(p.formatVersion,1);assert.equal(p.product,packageName);assert.equal(p.kind,'linux-application-payload');assert.equal(p.version,'0.0.0');assert.ok(['full','lite'].includes(p.edition));assert.equal(p.os,'linux');assert.equal(p.arch,'x86_64');assert.equal(p.targetTriple,'x86_64-unknown-linux-gnu');assert.equal(p.buildProfile,'release');assert.match(p.generation,/^[a-f0-9]{32}$/);assert.match(p.revision,/^[a-f0-9]{40}$/);assert.match(p.source.sha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(p.source.files)&&p.source.files>0);assert.ok(Object.keys(p.source).every(k=>['sha256','files','exclusions'].includes(k)));if(p.source.exclusions)assert.ok(Array.isArray(p.source.exclusions)&&p.source.exclusions.every(x=>typeof x==='string'));
 const base=p.edition==='full'?fullBase:'';assert.equal(p.binary,base+'local-media-gallery.bin');assert.equal(p.entrypoint,p.edition==='full'?'usr/bin/local-media-gallery':'local-media-gallery');assert.equal(p.candidate,base+'candidate.json');assert.equal(typeof p.dependencies,'string');assert.ok(p.dependencies.length>0&&p.dependencies.length<16384&&!/[\x00-\x1f]/.test(p.dependencies));
 assert.ok(Array.isArray(p.files)&&p.files.length>0&&p.files.length<=4096);assert.equal(new Set(p.files.map(f=>f.path)).size,p.files.length);for(const f of p.files){validateLinuxFile(f,p.edition);assert.notEqual(f.path,p.candidate,'Candidate metadata cannot hash itself');}
 for(const file of [p.binary,p.entrypoint,base+'LICENSE',base+'NOTICE',base+'licenses/dependencies/inventory.json',...(p.edition==='full'?[desktop,'usr/share/doc/local-media-gallery/copyright',...iconPaths]:[])])assert.ok(p.files.some(f=>f.path===file),'Missing Linux payload '+file);
 for(const file of [p.binary,p.entrypoint,...(p.files.some(f=>f.path===base+'lmg-update')?[base+'lmg-update']:[])])assert.equal(p.files.find(f=>f.path===file).mode,'755');return p;
}
export function guardFiles(p,metadata){
 validateLinuxPayload(p);assert.deepEqual(JSON.parse(metadata.toString('utf8')),p,'Metadata must encode this exact candidate');return [...p.files,{path:p.candidate,sha256:hash(metadata),bytes:String(metadata.length),mode:'644'}].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
export async function verifyLinuxPayload(directory,p){const metadata=await readFile(path.join(directory,p.candidate));const entries=guardFiles(p,metadata);if(p.edition==='lite'&&p.files.some(f=>f.path==='lmg-update')){const bytes=await readFile(path.join(directory,'update.json'));assert.deepEqual(JSON.parse(bytes),updateDescriptor(p,entries));entries.push({path:'update.json',bytes:String(bytes.length),sha256:hash(bytes),mode:'644'});entries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);}return verifyPayload(directory,entries);}
export async function verifyLinuxOwned(directory,p){
 validateLinuxPayload(p);const base=path.resolve(directory);const metadata=await readFile(path.join(base,p.candidate));const entries=guardFiles(p,metadata);
 for(const f of entries){const file=path.join(base,f.path),info=await lstat(file);assert.ok(info.isFile()&&!info.isSymbolicLink());if(p.edition==='full'){assert.equal(info.uid,0);assert.equal(info.gid,0);}assert.equal(await realpath(file),file,'Redirected installed parent');const bytes=await readFile(file);assert.equal(hash(bytes),f.sha256);assert.equal(String(bytes.length),f.bytes);assert.equal((info.mode&0o777).toString(8),f.mode);}return entries;
}
export function validateLinuxFootprints(f){
 assert.deepEqual(Object.keys(f).sort(),['download','extracted','application','runtime','optionalTools'].sort());for(const [name,item] of Object.entries(f)){assert.ok(typeof item.basis==='string'&&item.basis.length>0);assert.ok(['measured','unavailable','not-applicable'].includes(item.status));if(item.status==='measured'){assert.equal(typeof item.bytes,'string');assert.match(item.bytes,/^(0|[1-9][0-9]*)$/);}else assert.equal(item.bytes,null);if(['download','extracted','application'].includes(name))assert.equal(item.status,'measured');}return f;
}
export function validateLinuxMedia(m,pid){
 assert.ok(['tone.mp4','silent.mp4'].includes(m.name));assert.equal(m.hasAudio,m.name==='tone.mp4');const {before,moving}=m.frames;for(const f of [before,moving]){assert.match(f.hash,/^[a-f0-9]{64}$/);assert.ok(f.crop.length===4&&f.crop.every(x=>Number.isSafeInteger(x)&&x>=0&&x<=16384));const [l,t,r,b]=f.crop;assert.ok(r-l>8&&b-t>8);assert.ok(Number.isSafeInteger(f.colors)&&f.colors>8);assert.ok(f.coloredPixels>=(r-l)*(b-t)/4);}assert.deepEqual(moving.crop,before.crop);assert.notEqual(moving.hash,before.hash,'Ordinary native decoded frame must advance');
 const a=m.audio;assert.equal(a.method,'native-output-monitor');assert.equal(a.state,'running');assert.ok(Number.isSafeInteger(a.samples)&&a.samples>=4096&&a.samples<=65536);assert.equal(a.sampleRate,48000);assert.ok(Number.isFinite(a.rms)&&a.rms>=0&&Number.isFinite(a.frequencyHz));assert.equal(a.sink.name,'lmg_qualification');assert.ok(Number.isInteger(a.sink.index)&&a.sink.index>=0);assert.equal(a.stream.ownedRootPid,pid);
 if(m.hasAudio){assert.ok(a.rms>0.01&&Math.abs(a.frequencyHz-440)<30);assert.ok(Number.isInteger(a.stream.index)&&a.stream.index>=0&&Number.isInteger(a.stream.pid)&&a.stream.pid>1);}else{assert.ok(a.rms<0.0001);assert.equal(a.stream.index,null);assert.equal(a.stream.pid,null);assert.equal(a.stream.absence,'No sink inputs before and after no-audio fixture capture');}return m;
}
export async function validateLinuxEvidence(build,result,root){
 assert.equal(result.result,'pass');await validateUpdateEvidence(build,result.updates,root);assert.deepEqual(result.source,build.source);assert.equal(result.revision,build.revision);assert.equal(result.host.os,'linux');assert.equal(result.host.arch,'x64');
 const required=['containers','prerequisites','fresh ownership collisions','Full install and repeat','Full ownership collisions','Full removal and retention','config-files reinstall and purge','Lite in place','Lite explicit','Lite relocation Refresh','ordinary media'];for(const name of required)assert.ok(result.checks.some(c=>c.name===name&&c.result==='pass'),'Missing Linux package case '+name);
 for(const r of build.records){validateLinuxPayload(r.payload);validateLinuxFootprints(r.footprints);assert.deepEqual(r.payload.source,build.source);assert.equal(r.payload.revision,build.revision);const bytes=await readFile(path.join(root,r.archive.path));assert.equal(hash(bytes),r.archive.sha256);assert.equal(String(bytes.length),r.archive.bytes);assert.equal(r.footprints.download.bytes,r.archive.bytes);assert.equal(BigInt(r.footprints.application.bytes),r.archive.files.reduce((s,f)=>s+BigInt(f.bytes),0n));}
 assert.ok(result.native.length>=4);for(const n of result.native){const p=build.records.find(r=>r.edition===n.edition)?.payload;assert.ok(p);assert.equal(n.binarySha256,p.files.find(f=>f.path===p.binary).sha256);assert.ok(n.pid>1&&n.executable.length>0);assert.ok(n.records.some(r=>r.name==='Open red.png'));assert.ok(n.records.some(r=>r.name==='Hide controls'));assert.ok(n.frames.length>0);for(const frame of n.frames){const bytes=await readFile(path.join(root,frame.path));assert.equal(hash(bytes),frame.sha256);assert.equal(String(bytes.length),frame.bytes);assert.ok(frame.pixels[frame.color]>1500);}if(n.media)for(const m of n.media)validateLinuxMedia(m,n.pid);}
 for(const edition of ['full','lite']){const n=result.native.find(n=>n.edition===edition&&n.media?.length===2);assert.ok(n,'Ordinary tone/silent campaign '+edition);assert.deepEqual(n.media.map(m=>m.name).sort(),['silent.mp4','tone.mp4']);}
 assert.ok(result.native.some(n=>n.label==='relocated'&&n.frames.some(f=>f.color==='green')));assert.deepEqual(result.retained.before,result.retained.after);return true;
}
