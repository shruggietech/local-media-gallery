// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const scopes=['user','machine'];
export const productCodes={user:'{2098F021-7630-4BF6-B7F8-2AC279022A42}',machine:'{F81110E5-48A6-4096-B065-752E0D3B61C0}'};
export const upgradeCodes={user:'{4A53AE01-FF50-4B42-AC2C-7D4EE30FD389}',machine:'{0A757FF9-91A9-4A07-BA0B-4BD4286E6860}'};
export function packageGuid(scope,identity){assert.ok(scopes.includes(scope));assert.match(identity,/^[a-f0-9]{64}$/);const h=digest(scope+'\0'+identity);return '{'+[h.slice(0,8),h.slice(8,12),'5'+h.slice(13,16),'a'+h.slice(17,20),h.slice(20,32)].join('-').toUpperCase()+'}';}
export function portablePath(value){
 assert.equal(typeof value,'string');assert.ok(value.length>0&&value.length<=240);
 for(const part of value.split('/')){assert.ok(part&&part!=='.'&&part!=='..'&&!/[<>:"\\|?*\x00-\x1f]/u.test(part)&&!/[. ]$/.test(part)&&!/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part),'Nonportable owned path: '+value);}
 return value;
}
export function validatePayload(p){
 assert.match(p.generation,/^[a-f0-9]{32}$/);
 for(const [key,value]of Object.entries({product:'local-media-gallery',kind:'windows-application-payload',formatVersion:1,version:'0.0.0',os:'windows',arch:'x86_64',targetTriple:'x86_64-pc-windows-msvc',buildProfile:'release'}))assert.equal(p[key],value,key);
 assert.ok(['full','lite'].includes(p.edition));assert.match(p.revision,/^[a-f0-9]{40}$/);assert.match(p.source.sha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(p.source.files)&&p.source.files>0);
 assert.ok(Array.isArray(p.files)&&p.files.length>=1&&p.files.length<=4096);let total=0n;const names=new Set();
 for(const f of p.files){portablePath(f.path);const key=f.path.toLowerCase();assert.ok(!names.has(key),'Duplicate Windows path');names.add(key);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.bytes,/^(0|[1-9][0-9]*)$/);total+=BigInt(f.bytes);assert.ok(total<=1073741824n);}
 portablePath(p.binary);assert.ok(p.files.some(f=>f.path===p.binary));return p;
}
export async function verifyPayload(directory,p,{allowMissing=false}={}){
 validatePayload(p);
 for(const f of p.files){const file=path.join(directory,...f.path.split('/'));for(let at=path.resolve(file);;at=path.dirname(at)){try{const s=await lstat(at);assert.ok(!s.isSymbolicLink(),'Redirected owned path');}catch(e){if(e.code!=='ENOENT')throw e;}if(at===path.parse(at).root)break;}
  let bytes;try{bytes=await readFile(file);}catch(e){if(allowMissing&&e.code==='ENOENT')continue;throw e;}assert.equal(String(bytes.length),f.bytes,f.path);assert.equal(digest(bytes),f.sha256,f.path);
 }return true;
}
export function xml(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');}
export function validateNativeAudit(audit){assert.equal(audit.machine,0x8664);for(const name of [...audit.imports,...audit.delayImports])assert.match(name,/^(?:(?:api-ms-win-|ext-ms-win-)[a-z0-9-]+\.dll|(?:advapi32|bcrypt|bcryptprimitives|combase|comctl32|comdlg32|crypt32|d3d11|dcomp|dwmapi|dxgi|gdi32|gdiplus|imm32|iphlpapi|kernel32|msi|msvcrt|ntdll|ole32|oleacc|oleaut32|powrprof|propsys|psapi|rpcrt4|secur32|setupapi|shell32|shlwapi|user32|userenv|uxtheme|version|winhttp|wininet|winmm|wintrust|ws2_32)\.dll|winspool\.drv)$/i,'Undeclared non-system PE import');assert.equal(audit.signature.status,'NotSigned','Candidate signing disposition changed');return true;}

export function authorInstaller({scope,files,payloadDirectory,helper,payloadSha,template}){assert.ok(scopes.includes(scope));files.forEach(f=>portablePath(f.path));
 const machine=scope==='machine';const components=[];const noticeComponents=[];const removeFolders=[];
 // Explicit nested directories and file components, never broad wildcard removal.
 const tree={children:new Map(),files:[]};for(const f of files){let at=tree;const parts=f.path.split('/');for(const part of parts.slice(0,-1)){if(!at.children.has(part))at.children.set(part,{children:new Map(),files:[]});at=at.children.get(part);}at.files.push(f);}
 function render(at,prefix=''){let output='';for(const f of at.files){const component='C'+digest('component:'+f.path).slice(0,32),file='F'+digest('file:'+f.path).slice(0,32);(f.path.startsWith('licenses/')?noticeComponents:components).push(component);output+=`<Component Id="${component}" Guid="${packageGuid(scope,digest('component:'+f.path))}" Win64="yes"><File Id="${file}" Source="${xml(path.join(payloadDirectory,f.path))}" Name="${xml(path.posix.basename(f.path))}" KeyPath="yes" /></Component>`;}for(const [name,child]of at.children){const dir='D'+digest('directory:'+prefix+name).slice(0,32);removeFolders.push(`<RemoveFolder Id="R${digest('remove:'+prefix+name).slice(0,32)}" Directory="${dir}" On="uninstall" />`);output+=`<Directory Id="${dir}" Name="${xml(name)}">${render(child,prefix+name+'/')}</Directory>`;}return output;}
 const fileXml=render(tree);const code=packageGuid(scope,payloadSha);
 let wxs=template;const values={MENU_DIRECTORY:machine?'MachinePrograms':'ProgramMenuFolder',PRODUCT:productCodes[scope],UPGRADE:upgradeCodes[scope],PACKAGE:code,INSTALL_SCOPE:machine?'perMachine':'perUser',BASE:machine?'ProgramFiles64Folder':'LocalAppDataFolder',PROGRAMS:machine?'<Directory Id="INSTALLDIR" Name="Local Media Gallery" />':'<Directory Id="UserPrograms" Name="Programs"><Directory Id="INSTALLDIR" Name="Local Media Gallery" /></Directory>',FILES:fileXml,INTEGRATION_GUID:packageGuid(scope,digest('integration')),HIVE:machine?'HKLM':'HKCU',PAYLOAD_SHA:payloadSha,SYSTEM:machine?'yes':'no',HELPER:xml(helper),IMPERSONATE:machine?'no':'yes',REMOVE_FOLDERS:removeFolders.join(''),COMPONENT_REFS:components.map(c=>`<ComponentRef Id="${c}" />`).join(''),NOTICE_FEATURE:noticeComponents.length?`<Feature Id="Notices" Title="Third-party notices" Level="1">${noticeComponents.map(c=>`<ComponentRef Id="${c}" />`).join('')}</Feature>`:''};for(const [key,value]of Object.entries(values))wxs=wxs.replaceAll('@'+key+'@',value);assert.ok(!/@[A-Z_]+@/.test(wxs));
return {wxs,code};
}
