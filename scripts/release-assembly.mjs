// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,lstat,realpath,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {validateProductVersion} from './product-version.mjs';
import {portablePath,validatePayload} from './windows-packages.mjs';
import {validatePackageEvidence} from './windows-package-evidence.mjs';
import {validateLinuxPayload,validateLinuxEvidence} from './linux-packages.mjs';
import {validateMacPayload,validateMacEvidence} from './macos-packages.mjs';
import {validateUpdateDescriptor} from './update-packages.mjs';
import {createCandidate,releaseScopes,releaseHash,artifactUrl,canonical} from './release-record.mjs';

export async function retainedPath(root,value){
 assert.equal(typeof value,'string');value=value.replaceAll('\\','/');portablePath(value);assert.ok(value.startsWith('.local/'),'Only retained CI paths are accepted');
 const base=await realpath(root),file=path.resolve(base,...value.split('/'));assert.ok(file.startsWith(base+path.sep));
 let at=base;for(const component of value.split('/')){at=path.join(at,component);const s=await lstat(at);assert.ok(!s.isSymbolicLink(),'Redirected retained path');}
 assert.equal(await realpath(file),file);return file;
}
export async function verifyRetained(root,entry){const file=await retainedPath(root,entry.path);assert.ok((await lstat(file)).isFile());const bytes=await readFile(file);assert.equal(String(bytes.length),entry.bytes,'Retained byte count');assert.equal(releaseHash(bytes),entry.sha256,'Retained digest');return bytes;}
function normalize(value){if(Array.isArray(value))return value.map(normalize);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,normalize(v)]));return typeof value==='string'&&value.startsWith('.local\\')?value.replaceAll('\\','/'):value;}
async function json(root,file){const bytes=await readFile(await retainedPath(root,file));assert.ok(bytes.length<=64*1024*1024,'Oversized evidence JSON');return {bytes,value:normalize(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)))};}
export function qualificationReceipt(r,scope,source,revision){
 assert.equal(r.result,'pass');assert.equal(r.context.scope,scope);assert.deepEqual(r.context.source,source);assert.equal(r.context.revision,revision);assert.ok(r.steps.length&&r.steps.every(s=>s.result==='pass'),'Incomplete elected checks');
 assert.equal(r.hardLimitSeconds,900);assert.equal(r.provisionalFinalizationReserveSeconds,15);
 const times=[r.preparationStarted,r.readinessVerified,r.terminalFinished].map(v=>typeof v==='string'?Date.parse(v):NaN);assert.ok(times.every(Number.isFinite));assert.ok(times[0]<=times[1]&&times[1]<=times[2]);
 for(const [field,value] of [['preparationSeconds',(times[1]-times[0])/1000],['qualificationSeconds',(times[2]-times[1])/1000],['combinedSeconds',(times[2]-times[0])/1000]])assert.ok(Number.isFinite(r[field])&&Math.abs(r[field]-value)<0.002,'Terminal clock accounting '+field);
 assert.ok(r.qualificationSeconds<885,'Finalization reserve exceeded');return {scope,sha256:releaseHash(r),result:'pass',preparationSeconds:r.preparationSeconds,qualificationSeconds:r.qualificationSeconds,combinedSeconds:r.combinedSeconds};
}
// Validate every local operand before invoking the established portable native
// validators. Absolute recipient observations are data, never local file operands.
async function preflight(root,value){if(Array.isArray(value)){for(const item of value)await preflight(root,item);}else if(value&&typeof value==='object'){for(const [key,item] of Object.entries(value)){if(['path','screenshot','manifestPath','evidenceDirectory'].includes(key)&&typeof item==='string'&&item.replaceAll('\\','/').startsWith('.local/'))await retainedPath(root,item);else if(key==='path'&&typeof item==='string'&&!path.isAbsolute(item)&&!item.includes('\\'))portablePath(item);else if(typeof item==='object')await preflight(root,item);}}}
const nativeValidators={windows:validatePackageEvidence,linux:validateLinuxEvidence,macos:validateMacEvidence};
const payloadValidators={windows:validatePayload,linux:validateLinuxPayload,macos:validateMacPayload};
export async function assembleRelease({inputRoot,outputRoot,repository,version,previousVersion=null,source,revision,runId,documentation}){
 validateProductVersion(version,{windows:true});assert.match(repository,/^[\w.-]+\/[\w.-]+$/);assert.match(revision,/^[a-f0-9]{40}$/);assert.match(String(runId),/^[1-9][0-9]*$/);
 const scopes=[];for(const scope of releaseScopes){const {value:r}=await json(inputRoot,'.local/ci-'+scope+'.json');scopes.push(qualificationReceipt(r,scope,source,revision));}
 const artifacts=[],inputs=new Map();
 for(const platform of ['windows','linux','macos']){
  const {value:build}=await json(inputRoot,'.local/'+platform+'-package-build.json'),{value:result,bytes:evidence}=await json(inputRoot,'.local/'+platform+'-package-results.json');
  assert.deepEqual(build.source,source);assert.equal(build.revision,revision);assert.deepEqual(build.records.map(r=>r.edition).sort(),['full','lite']);await preflight(inputRoot,build);await preflight(inputRoot,result);await nativeValidators[platform](build,result,inputRoot);
  for(const row of build.records){payloadValidators[platform](row.payload);assert.equal(row.payload.version,version);assert.deepEqual(row.payload.source,source);assert.equal(row.payload.revision,revision);
   const bytes=await verifyRetained(inputRoot,row.archive),name=path.posix.basename(row.archive.path.replaceAll('\\','/')),files=row.archive.files;assert.ok(files?.length,'Complete archive inventory required');assert.equal(new Set(files.map(f=>f.path.toLowerCase())).size,files.length);for(const f of files){portablePath(f.path);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.bytes,/^(0|[1-9][0-9]*)$/);if(platform!=='windows')assert.ok(['644','755'].includes(f.mode),'Executable permission inventory');}
   // Native payload notices and dependency inventory were included before the
   // archive was hashed. Full Windows keeps them inside the inventoried MSI.
   assert.ok(row.payload.files.some(f=>f.path.endsWith('NOTICE')));assert.ok(row.payload.files.some(f=>f.path.endsWith('licenses/dependencies/inventory.json')));
   const format=platform==='windows'?'zip':platform==='linux'?(row.edition==='full'?'deb':'tar.gz'):(row.edition==='full'?'dmg':'zip');
   artifacts.push({name,role:'package',edition:row.edition,platform,architecture:row.payload.arch,format,bytes:String(bytes.length),sha256:releaseHash(bytes),url:artifactUrl(repository,version,name),prerequisites:[platform==='linux'?row.payload.dependencies:platform==='windows'?'Windows 10 22H2/11 x64; Microsoft Edge WebView2 Evergreen Runtime':'macOS 15 Apple Silicon; OS WKWebView'],optionalTools:['Optional video thumbnails: separately selected FFmpeg'],inventory:{sha256:releaseHash(files),files:files.length,bytes:files.reduce((n,f)=>n+BigInt(f.bytes),0n).toString()},evidence:{scope:platform+'-packages',sha256:releaseHash(evidence)}});inputs.set(name,bytes);
   if(platform==='linux'&&row.edition==='full'){const from=build.upgrades.pairs.find(p=>p.edition==='full')?.from;assert.ok(from,'Missing external Debian update descriptor');const data=await verifyRetained(inputRoot,from),descriptor=validateUpdateDescriptor(JSON.parse(data));assert.equal(descriptor.version,version);assert.deepEqual(descriptor.source,{sha256:source.sha256,files:source.files});assert.deepEqual(descriptor.native.installer,{path:name,bytes:row.archive.bytes,sha256:row.archive.sha256});const support=path.posix.basename(from.path.replaceAll('\\','/'));artifacts.push({name:support,role:'update-descriptor',edition:'full',platform:'linux',architecture:'x86_64',format:'json',bytes:String(data.length),sha256:releaseHash(data),url:artifactUrl(repository,version,support),prerequisites:[],optionalTools:[],inventory:{sha256:releaseHash(data),files:1,bytes:String(data.length)},evidence:{scope:'linux-packages',sha256:releaseHash(evidence)},forArtifact:name});inputs.set(support,data);}
  }
 }
 const record=createCandidate({repository,version,previousVersion,source:{revision,sha256:source.sha256,files:source.files},artifacts,documentation,qualification:{mode:'native',runId:String(runId),scopes}});
 await mkdir(outputRoot,{recursive:true});for(const [name,bytes] of inputs){const destination=path.join(outputRoot,name);try{assert.deepEqual(await readFile(destination),bytes,'Existing assembly differs');}catch(e){if(e.code!=='ENOENT')throw e;await writeFile(destination,bytes,{flag:'wx'});}}
 const destination=path.join(outputRoot,'candidate.json'),bytes=canonical(record)+'\n';try{assert.equal(await readFile(destination,'utf8'),bytes,'Candidate assembly changed');}catch(e){if(e.code!=='ENOENT')throw e;await writeFile(destination,bytes,{flag:'wx'});}return record;
}
