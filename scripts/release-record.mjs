// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import Ajv from 'ajv/dist/2020.js';
import {validateProductVersion} from './product-version.mjs';
export const releaseScopes=['repository','website','product-windows','product-linux','product-macos','windows-packages','linux-packages','macos-packages'];
export const documentationChecks=['rendering','navigation','links-assets','version-selection','search','schemas-examples','review'];
export const canonical=value=>JSON.stringify(order(value));
function order(value){if(Array.isArray(value))return value.map(order);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,order(value[key])]));return value;}
export const releaseHash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:canonical(value)).digest('hex');
export const publicationDigest=publication=>releaseHash(publication);
export function releaseDigest(record){const {state,candidateId,gates,publication,...immutable}=record;return releaseHash(immutable);}
export const artifactUrl=(repository,version,name)=>`https://github.com/${repository}/releases/download/v${version}/${name}`;
const ajv=new Ajv({allErrors:true,strict:true,ownProperties:true}).addKeyword('x-release-version');ajv.addFormat('date-time',value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)&&Number.isFinite(Date.parse(value)));
const validate=ajv.compile(JSON.parse(await readFile(new URL('../schemas/v0.0.0/release-record.schema.json',import.meta.url),'utf8')));
const unique=(items,message)=>assert.equal(new Set(items).size,items.length,message);
export function createCandidate(immutable,options={}){
 const record={formatVersion:1,product:'local-media-gallery',...structuredClone(immutable),state:'candidate',candidateId:'0'.repeat(64),gates:{before:null,after:null},publication:null};
 record.artifacts.sort((a,b)=>a.name.localeCompare(b.name,'en'));record.qualification.scopes.sort((a,b)=>a.scope.localeCompare(b.scope,'en'));record.candidateId=releaseDigest(record);return validateRelease(record,options);
}
export function validateGate(record,gate,phase){
 assert.equal(gate.result,'pass','Documentation gate must pass');assert.equal(gate.phase,phase,'Documentation gate phase');
 assert.equal(gate.candidateId,record.candidateId,'Documentation gate candidate binding');assert.equal(gate.sourceRevision,record.source.revision,'Documentation gate source binding');assert.equal(gate.sourceSha256,record.source.sha256,'Documentation gate source binding');assert.equal(gate.snapshotsSha256,record.documentation.retainedSha256,'Documentation gate snapshot binding');
 unique(gate.checks.map(c=>c.name),'Duplicate documentation gate checks');assert.deepEqual(gate.checks.map(c=>c.name).sort(),[...documentationChecks].sort(),'Complete documentation gate checks required');assert.ok(gate.checks.every(c=>c.result==='pass'),'Documentation gate check failed');
 if(phase==='candidate')assert.equal(gate.publicationSha256,null,'Candidate gate cannot claim publication');else{assert.ok(record.publication,'Publication gate needs observed publication');assert.equal(gate.publicationSha256,publicationDigest(record.publication),'Documentation gate publication binding');}
}
export function validateRelease(record,{allowFixture=false,requirePublished=false}={}){
 assert.ok(validate(record),'Invalid release record: '+ajv.errorsText(validate.errors));validateProductVersion(record.version,{windows:true});if(record.previousVersion!==null)validateProductVersion(record.previousVersion);
 assert.ok(allowFixture||record.qualification.mode==='native','Controlled fixture evidence cannot authorize production consumers');
 assert.equal(record.candidateId,releaseDigest(record),'Release immutable identity digest mismatch');assert.equal(record.documentation.version,'v'+record.version,'Documentation/release version mismatch');
 const scopes=record.qualification.scopes;unique(scopes.map(s=>s.scope),'Duplicate qualification scope');assert.deepEqual(scopes.map(s=>s.scope).sort(),[...releaseScopes].sort(),'Complete native/repository/site qualification required');for(const scope of scopes)assert.ok(Math.abs(scope.preparationSeconds+scope.qualificationSeconds-scope.combinedSeconds)<0.002,'Qualification accounting mismatch');
 unique(record.artifacts.map(a=>a.name),'Duplicate release asset');const rows=record.artifacts.filter(a=>a.role==='package');assert.equal(rows.length,6,'Six ordinary package rows required');unique(rows.map(a=>a.platform+'/'+a.edition),'Duplicate package row');
 for(const platform of ['windows','linux','macos'])for(const edition of ['full','lite']){const row=rows.find(a=>a.platform===platform&&a.edition===edition);assert.ok(row,'Missing elected package row');assert.equal(row.architecture,platform==='macos'?'aarch64':'x86_64');assert.equal(row.format,platform==='windows'?'zip':platform==='linux'?(edition==='full'?'deb':'tar.gz'):(edition==='full'?'dmg':'zip'));assert.equal(row.evidence.scope,platform+'-packages','Native package evidence mismatch');}
 for(const asset of record.artifacts){assert.equal(asset.url,artifactUrl(record.repository,record.version,asset.name),'Release asset URL identity mismatch');assert.ok(asset.name.endsWith('.'+asset.format),'Release filename/format mismatch');assert.ok(!asset.name.endsWith('.')&&!/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(asset.name),'Unsafe release filename');assert.ok(BigInt(asset.bytes)<=18446744073709551615n&&BigInt(asset.inventory.bytes)<=18446744073709551615n,'Release byte count overflow');if(asset.forArtifact)assert.ok(rows.some(a=>a.name===asset.forArtifact),'Supporting asset has no primary package');}
 const linux=rows.find(a=>a.platform==='linux'&&a.edition==='full');assert.ok(record.artifacts.some(a=>a.role==='update-descriptor'&&a.platform==='linux'&&a.edition==='full'&&a.forArtifact===linux.name&&a.format==='json'),'Linux Full update descriptor required');
 if(record.gates.before)validateGate(record,record.gates.before,'candidate');if(record.gates.after)validateGate(record,record.gates.after,'publication');
 if(record.publication){const p=record.publication;assert.equal(p.repository,record.repository);assert.equal(p.sourceRevision,record.source.revision,'Published source mismatch');assert.equal(p.tag,'v'+record.version,'Published tag mismatch');assert.equal(p.htmlUrl,`https://github.com/${record.repository}/releases/tag/v${record.version}`);unique(p.assets.map(a=>a.name),'Duplicate published asset');unique(p.assets.map(a=>a.id),'Duplicate published asset identity');assert.equal(p.assets.length,record.artifacts.length,'Incomplete published assets');for(const asset of record.artifacts){const found=p.assets.find(a=>a.name===asset.name);assert.ok(found,'Missing published asset');for(const key of ['bytes','sha256','url'])assert.equal(found[key],asset[key],'Published asset '+key+' mismatch');}}
 if(requirePublished||record.state==='published'){assert.equal(record.state,'published','Verified published record required');assert.notEqual(record.version,'0.0.0','Specification baseline cannot be a product release');assert.ok(record.publication&&record.gates.before&&record.gates.after,'Published release requires both documentation gates and actual publication');}
 return record;
}
export function attachGate(record,gate,options={}){const next=structuredClone(record);next.gates[gate.phase==='candidate'?'before':'after']=structuredClone(gate);return validateRelease(next,options);}
export function publishedView(record,options={}){validateRelease(record,{...options,requirePublished:true});return {version:record.version,artifacts:record.artifacts.filter(a=>a.role==='package').map(a=>({edition:a.edition,platform:a.platform,architecture:a.architecture,filename:a.name,url:a.url,sha256:a.sha256}))};}
export function parseReleaseRecord(bytes,options={}){assert.ok(Buffer.byteLength(bytes)<=32*1024*1024,'Release JSON exceeds bound');if(Buffer.isBuffer(bytes))assert.ok(!bytes.subarray(0,3).equals(Buffer.from([0xef,0xbb,0xbf])),'Release JSON BOM refused');const text=Buffer.isBuffer(bytes)?new TextDecoder('utf-8',{fatal:true}).decode(bytes):bytes;const record=JSON.parse(text);assert.equal(text,canonical(record)+'\n','Canonical release JSON required (no duplicate fields)');return validateRelease(record,options);}
