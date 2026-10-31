// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,lstat,readdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {root,environment} from './run.mjs';
const call=promisify(execFile);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function nativeCargoTarget(){const os={win32:'pc-windows-msvc',linux:'unknown-linux-gnu',darwin:'apple-darwin'}[process.platform],arch={x64:'x86_64',arm64:'aarch64'}[process.arch];assert.ok(os&&arch,'Unsupported Cargo preparation target');return arch+'-'+os;}
export async function runCargo(args,{cwd=root,env=environment,timeout=60000}={}){const p=call('cargo',args,{cwd,env:{...env,CARGO_TERM_PROGRESS_WHEN:'never'},windowsHide:true,shell:false,timeout,maxBuffer:64*1024*1024});p.child?.stdin?.end();return p;}
export async function offlineCargoMetadata({cwd=root,env=environment,target=nativeCargoTarget(),run}={}){const invoke=run??(args=>runCargo(args,{cwd,env}));const meta=JSON.parse((await invoke(['metadata','--offline','--locked','--format-version','1','--filter-platform',target])).stdout);assert.ok(Array.isArray(meta.packages)&&meta.packages.length&&meta.resolve?.nodes?.length,'Incomplete Cargo metadata graph');for(const pkg of meta.packages){try{const stat=await lstat(pkg.manifest_path);assert.ok(stat.isFile()&&!stat.isSymbolicLink());}catch(error){throw new Error('Cargo source manifest unavailable: '+pkg.name+' '+pkg.version,{cause:error});}}return meta;}
export function cargoGraphIdentity(meta){return sha(JSON.stringify({packages:meta.packages.map(p=>({id:p.id,name:p.name,version:p.version,source:p.source??null})).sort((a,b)=>a.id.localeCompare(b.id)),nodes:meta.resolve.nodes.map(n=>({id:n.id,deps:n.deps})).sort((a,b)=>a.id.localeCompare(b.id))}));}
export async function prepareCargoDependencies({cwd=root,env=environment,target=nativeCargoTarget(),cacheBasis='ordinary',run}={}){assert.ok(['ordinary','fresh-owned'].includes(cacheBasis));const started=new Date();const lock=await readFile(path.join(cwd,'Cargo.lock'));const invoke=run??(args=>runCargo(args,{cwd,env,timeout:args[0]==='fetch'?300000:60000}));
 // No --target: metadata/notices can require workspace inputs beyond release compilation.
 await invoke(['fetch','--locked']);assert.equal(sha(await readFile(path.join(cwd,'Cargo.lock'))),sha(lock),'Cargo lock changed during locked preparation');const metadata=await offlineCargoMetadata({cwd,env,target,run:invoke});assert.equal(sha(await readFile(path.join(cwd,'Cargo.lock'))),sha(lock),'Cargo lock changed during offline metadata');const terminal=new Date();return{formatVersion:1,target,cacheBasis,lockSha256:sha(lock),graphSha256:cargoGraphIdentity(metadata),packageCount:metadata.packages.length,started:started.toISOString(),terminal:terminal.toISOString(),elapsedSeconds:(terminal-started)/1000,metadata};}
export async function assertNoCargoBuildOutputs(directory){const entries=await readdir(directory,{withFileTypes:true});for(const entry of entries){assert.ok(entry.name==='.rustc_info.json'&&entry.isFile()&&!entry.isSymbolicLink(),'Unexpected compiler output in cold readiness witness: '+entry.name);const probe=JSON.parse(await readFile(path.join(directory,entry.name),'utf8'));assert.ok(probe&&typeof probe==='object'&&!Array.isArray(probe),'Invalid Cargo toolchain probe metadata');}return entries.map(e=>e.name).sort();}
