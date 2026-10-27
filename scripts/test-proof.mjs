// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import {root,python,execute} from './run.mjs';
import {sourceIdentity} from './provenance.mjs';
import {preparationAcceptance} from './preparation-acceptance.mjs';
import {hash,collectPayload,verifyPayload,validateProof,payloadPath} from './proof.mjs';
const options=new Map();for(let i=2;i<process.argv.length;i+=2){assert.ok(['--assembly','--output'].includes(process.argv[i]));assert.ok(process.argv[i+1]);options.set(process.argv[i],process.argv[i+1]);}
const assembly=JSON.parse(await readFile(path.resolve(options.get('--assembly')??path.join(root,'.local/proof-assembly.json')),'utf8'));
assert.deepEqual(assembly.source,await sourceIdentity());assert.equal(assembly.records.length,2);
const owned=JSON.parse(await readFile(path.join(root,'schemas/v0.0.0/local-media-gallery.schema.json'),'utf8'));const ajv=new Ajv({strict:true}).addKeyword('x-release-version').addSchema(owned);const valid=ajv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/operationResult'});
const call=promisify(execFile);const base=await mkdtemp(path.join(root,'.local/proof-recipient-'));const results=[];
function nativePath(encoded){if(encoded===null)return null;const bytes=Buffer.from(encoded.bytes);return bytes.toString(encoded.encoding==='windows-utf16le'?'utf16le':'utf8');}
for(const original of assembly.records){
 validateProof(original);const record=structuredClone(original);payloadPath(record.archive.path);const archive=path.resolve(root,record.archive.path);assert.ok(archive.startsWith(path.resolve(root,'.local')+path.sep));assert.equal(hash(await readFile(archive)),record.archive.sha256);
 const extracted=path.join(base,record.edition+' extracted 雪');await mkdir(extracted);const inventory=path.join(base,record.edition+'-inventory.json');await writeFile(inventory,JSON.stringify(record.payload));await execute(python,[path.join(root,'scripts/proof-archive.py'),'extract',archive,extracted,inventory]);await verifyPayload(extracted,record.payload);
 const manifest=JSON.parse(await readFile(path.join(extracted,'proof.json'),'utf8'));assert.equal(manifest.edition,record.edition);assert.deepEqual(manifest.source,record.source);assert.equal(manifest.revision,record.revision);assert.deepEqual(manifest.files,record.payload.filter(e=>e.path!=='proof.json'));
 const relocated=path.join(base,record.edition+' relocated 雪');await rename(extracted,relocated);await verifyPayload(relocated,record.payload);
 const binary=path.join(relocated,...payloadPath(record.binary.path).split('/'));assert.equal(hash(await readFile(binary)),record.binary.sha256);
 const normalBytes=await readFile(binary);
 for(const name of ['GALLERY_TEST_SETTINGS_DIR','GALLERY_TEST_HISTORY_DIR','test_discovery_control','s011_resource_snapshot','Unknown profile read test action.','Synthetic directory iterator failure','Unknown metadata test action.','Unknown preparation test barrier action.','test_native_qualification','Native qualification facility failed.'])assert.equal(normalBytes.includes(Buffer.from(name)),false,'Normal proof contains native-test control: '+name);
 const empty=path.join(base,record.edition+'-empty-path'),cwd=path.join(base,record.edition+'-caller'),profile=path.join(base,record.edition+'-profile');await mkdir(empty);await mkdir(cwd);await mkdir(profile);
 const env={PATH:empty,HOME:profile,USERPROFILE:profile,APPDATA:path.join(profile,'roaming'),LOCALAPPDATA:path.join(profile,'local'),XDG_CONFIG_HOME:path.join(profile,'config'),XDG_STATE_HOME:path.join(profile,'state'),XDG_DATA_HOME:path.join(profile,'data'),XDG_CACHE_HOME:path.join(profile,'cache'),LANG:'C.UTF-8'};
 for(const name of ['SystemRoot','WINDIR','TMP','TEMP','DISPLAY','WAYLAND_DISPLAY'])if(process.env[name])env[name]=process.env[name];
 async function invoke(args,code=0,extra={}){let response;try{const p=call(binary,args,{cwd,env:{...env,...extra},windowsHide:true,shell:false,timeout:args[0]==='prepare'?120000:10000,maxBuffer:1024*1024});p.child?.stdin?.end();response=await p;response.code=0;}catch(error){response=error;}assert.equal(response.code,code,'Exit for '+JSON.stringify(args)+': '+response.stderr);return response;}
 async function machine(args,code=0,extra={}){const response=await invoke([...args,'--json'],code,extra);assert.equal(response.stdout.trim().split(/\r?\n/).length,1,'Exactly one machine result');const value=JSON.parse(response.stdout);assert.ok(valid(value),JSON.stringify(valid.errors));assert.equal(value.edition,record.edition);assert.equal(value.version,'0.0.0');return value;}
 const checks=[];const pass=name=>checks.push({name,result:'pass',terminalFinished:new Date().toISOString()});
 const version=await machine(['--version']);assert.equal(version.data.targetTriple,record.targetTriple);assert.equal(version.data.bundleIdentifier,manifest.bundleIdentifier);pass('Compiled identity matches archive, platform and bundle metadata');
 const help=await invoke(['--help']);for(const word of ['[DIRECTORY]','--detach','resolve','prepare','install','--json'])assert.ok(help.stdout.includes(word));pass('Human help is usable with no developer executable in PATH');
 const capabilities=await machine(['capabilities']);assert.equal(capabilities.data.platforms.providers.prepare,true);assert.equal(capabilities.data.platforms.providers.install,false);pass('Capabilities and runtime observations remain attributable');
 const resolved=await machine(['resolve']);assert.equal(resolved.status,'success');assert.equal(nativePath(resolved.root),record.edition==='lite'?relocated:null);pass('Edition no-argument root is independent of caller working directory');
 const selected=path.join(cwd,'chosen gallery 雪');await mkdir(selected);await writeFile(path.join(selected,'sample.jpg'),'Synthetic CLI-only inventory fixture');const before=await collectPayload(selected);
 const explicit=await machine(['resolve','chosen gallery 雪']);assert.equal(nativePath(explicit.root),selected);pass('Explicit relative native root takes precedence');
 const dash=await invoke(['resolve','--json','--','-literal 雪']);const dashResult=JSON.parse(dash.stdout);assert.ok(valid(dashResult));assert.equal(nativePath(dashResult.root),path.join(cwd,'-literal 雪'));pass('Dash-leading literal paths and terminator');
 const absent=await machine(['resolve','absent']);assert.equal(nativePath(absent.root),path.join(cwd,'absent'));assert.ok(absent.data.basis.includes('not certified'));pass('Resolution preview does not certify missing-root discovery');
 for(const [args,code] of [[['--unknown'],2],[['open','--wait','--detach'],2],[['resolve','--detach'],2]]){const value=await machine(args,code);assert.equal(value.error.code,'invalid_arguments');assert.equal(value.status,'failed');}pass('Invalid/conflicting input is finite and attributable');
 for(const args of [['install']]){const value=await machine(args,5);assert.equal(value.status,'unavailable');assert.equal(value.error.code,'capability_unavailable');}pass('Unavailable installation provider never reports completion');
 if(process.platform==='linux'&&record.edition==='lite'){const value=await machine(['resolve'],1,{APPDIR:relocated});assert.equal(value.error.code,'placement_unavailable');pass('Missing AppImage origin is an attributable placement result (simulated context)');}
 await verifyPayload(selected,before);assert.deepEqual(await collectPayload(profile),[]);await verifyPayload(relocated,record.payload);pass('Gallery, profile and archive bytes remain unchanged');
 record.preparation=await preparationAcceptance({workspace:cwd,machine,pass});
 assert.deepEqual(await collectPayload(profile),[],"Finite portable preparation must not write recipient profile state");
 record.result='pass';record.checks=checks;record.recipientEnvironment={path:'empty owned directory',inheritedTestControls:false,scope:'finite normal native commands; host libraries/runtime still present'};record.terminalFinished=new Date().toISOString();validateProof(record);results.push(record);console.log('PASS extracted '+record.edition+' proof: '+checks.length+' checks.');
}
assert.deepEqual(await sourceIdentity(),assembly.source,'Proof acceptance changed source');const output=path.resolve(options.get('--output')??path.join(root,'.local/proof-results.json'));await writeFile(output,JSON.stringify({formatVersion:1,result:'pass',source:assembly.source,revision:assembly.revision,records:results},null,2)+'\n');console.log('PASS normal Full/Lite proof archives, exact inventory, minimal PATH and finite launch contracts.');
