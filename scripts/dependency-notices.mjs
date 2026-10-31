// SPDX-License-Identifier: Apache-2.0
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {thirdPartyPackages} from './proof.mjs';
export async function copyDependencyNotices({name,version,license,directory,ecosystem},destination){let names;try{names=await readdir(directory,{withFileTypes:true});}catch(error){throw new Error('Dependency source directory unavailable: '+name+' '+version,{cause:error});}const copied=[];
 for(const file of names.filter(e=>e.isFile()&&/^(licen[cs]e|copying|notice|copyright)([._-]|$)/i.test(e.name))){const bytes=await readFile(path.join(directory,file.name));let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'').replaceAll('\r\n','\n');}catch{continue;}const relative=[ecosystem,name.replace(/[^a-zA-Z0-9_.-]/g,'_')+'-'+version,file.name].join('/');await mkdir(path.dirname(path.join(destination,relative)),{recursive:true});await writeFile(path.join(destination,relative),text,'utf8');copied.push(relative);}
 return{ecosystem,name,version,license:license??null,files:copied};}
export async function collectRustNotices(metadata,destination){await mkdir(destination,{recursive:true});const catalog=[];for(const pkg of thirdPartyPackages(metadata))catalog.push(await copyDependencyNotices({name:pkg.name,version:pkg.version,license:pkg.license,directory:path.dirname(pkg.manifest_path),ecosystem:'rust'},destination));return catalog;}
