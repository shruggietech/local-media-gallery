// SPDX-License-Identifier: Apache-2.0
// Product dependency, deliberately built from exact corresponding upstream source.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,chmod,access,copyFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root,execute,environment} from './run.mjs';

export const featureHelperSource={version:'9.0.2',url:'https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz',bytes:12040788,sha256:'8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e'};
export const featureHelperConfiguration=['--disable-gpl','--disable-nonfree','--disable-version3','--disable-autodetect','--disable-network','--disable-doc','--disable-debug','--disable-x86asm','--disable-shared','--enable-static','--disable-ffplay','--disable-ffprobe','--disable-avdevice','--disable-devices','--disable-hwaccels','--disable-encoders','--enable-encoder=png','--disable-muxers','--enable-muxer=image2pipe','--disable-filters','--enable-filter=scale,format,setsar','--enable-zlib'];
const hash=b=>createHash('sha256').update(b).digest('hex');
async function capture(file,args,options={}){const p=promisify(execFile)(file,args,{cwd:root,env:environment,windowsHide:true,shell:false,timeout:30000,maxBuffer:1024*1024,...options});p.child?.stdin?.end();return p;}
const shellQuote=s=>"'"+s.replaceAll("'","'\\''")+"'";
export async function acquirePinnedFeatureSource(source,{fetcher=fetch,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=4,timeoutMs=120000}={}){
 assert.ok(Number.isSafeInteger(attempts)&&attempts>0&&attempts<=4);assert.ok(Number.isSafeInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=120000);const deadline=Date.now()+timeoutMs;
 for(let attempt=0;attempt<attempts;attempt++){
  let bytes;
  try{
   const remaining=deadline-Date.now();assert.ok(remaining>0,'Pinned source acquisition deadline reached');
   const response=await fetcher(source.url,{signal:AbortSignal.timeout(remaining)});
   if(!response.ok){await response.body?.cancel();const error=Error('Pinned source HTTP '+response.status);error.retryable=response.status===429||response.status>=500;throw error;}
   const chunks=[];let size=0;for await(const chunk of response.body??[]){size+=chunk.length;assert.ok(size<=source.bytes,'Pinned source exceeds expected size');chunks.push(chunk);}bytes=Buffer.concat(chunks);
  }catch(error){
   const transport=error instanceof TypeError||['AbortError','TimeoutError'].includes(error.name)||error.retryable===true;
   if(!transport||attempt+1===attempts||Date.now()>=deadline)throw error;
   console.log('Pinned source transport attempt '+(attempt+1)+' failed; retrying within the preparation bound.');await pause(Math.min(250*2**attempt,Math.max(0,deadline-Date.now())));continue;
  }
  assert.equal(bytes.length,source.bytes,'Pinned source size differs');assert.equal(hash(bytes),source.sha256,'Pinned source digest differs');return bytes;
 }
 throw Error('Pinned source attempt bound reached');
}
export async function prepareFeatureHelper(){
 const key=process.platform+'-'+process.arch;assert.ok(['win32-x64','linux-x64','darwin-arm64'].includes(key));
 const extra=process.platform==='win32'?['--target-os=mingw32','--arch=x86_64','--cc=gcc','--disable-pthreads','--enable-w32threads','--extra-ldflags=-static']:process.platform==='linux'?['--extra-ldflags=-static']:['--pkg-config=false'];
 const configuration=[...featureHelperConfiguration,...extra];const configHash=hash(JSON.stringify({source:featureHelperSource,configuration,key}));
 const directory=path.join(root,'.local/feature-helper-cache',configHash),binary=path.join(directory,'ffmpeg'+(process.platform==='win32'?'.exe':'')),recordFile=path.join(directory,'receipt.json');await mkdir(directory,{recursive:true});
 let record;try{record=JSON.parse(await readFile(recordFile,'utf8'));assert.equal(record.configurationSha256,configHash);assert.equal(hash(await readFile(binary)),record.sha256);assert.deepEqual(record.source.configuration,configuration);}catch(error){if(error.code!=='ENOENT')throw error;record=null;}
 if(!record){
  const archive=path.join(directory,'ffmpeg-9.0.2.tar.xz');let bytes;try{bytes=await readFile(archive);}catch(e){if(e.code!=='ENOENT')throw e;bytes=await acquirePinnedFeatureSource(featureHelperSource);}
  assert.equal(bytes.length,featureHelperSource.bytes);assert.equal(hash(bytes),featureHelperSource.sha256);await writeFile(archive,bytes);
  await execute('tar',['-xf',archive,'-C',directory]);const sourceDirectory=path.join(directory,'ffmpeg-9.0.2');
  if(process.platform==='win32'){
   const bash=process.env.GALLERY_MSYS_BASH??'C:/msys64/usr/bin/bash.exe';await access(bash);
   const env={...environment,MSYSTEM:'UCRT64',CHERE_INVOKING:'1',MSYS2_PATH_TYPE:'inherit'};
   const windowsToMsys=p=>p.replaceAll('\\','/').replace(/^([A-Za-z]):\//,(_,d)=>'/'+d.toLowerCase()+'/');
   // Pacman prepares maintainer compilers only. It never runs in a recipient installer.
   await execute(bash,['-lc','pacman -S --noconfirm --needed make mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-zlib'],{env});
   const script='set -eu\nexport PATH=/ucrt64/bin:/usr/bin:$PATH\ncd '+shellQuote(windowsToMsys(sourceDirectory))+'\nsh ./configure '+configuration.map(shellQuote).join(' ')+'\nmake -j2 ffmpeg.exe\n';
   const scriptFile=path.join(directory,'build-helper.sh');await writeFile(scriptFile,script,'utf8');await execute(bash,['--noprofile','--norc',windowsToMsys(scriptFile)],{env});
  }else{await execute('sh',['./configure',...configuration],{cwd:sourceDirectory});await execute('make',['-j2','ffmpeg'],{cwd:sourceDirectory});}
  await copyFile(path.join(sourceDirectory,'ffmpeg'+(process.platform==='win32'?'.exe':'')),binary);await chmod(binary,0o755);
  const built=await readFile(binary),notices=[];for(const name of ['COPYING.LGPLv2.1','LICENSE.md']){const text=(await readFile(path.join(sourceDirectory,name),'utf8')).replaceAll('\r\n','\n');notices.push({path:'ffmpeg/'+name,text});}
  notices.push({path:'ffmpeg/BUILD.md',text:'FFmpeg '+featureHelperSource.version+' built by Local Media Gallery from '+featureHelperSource.url+'\nSource SHA256: '+featureHelperSource.sha256+'\nConfiguration: '+configuration.join(' ')+'\nNo GPL/nonfree/version3 or external codec libraries enabled. PNG uses the platform zlib. Full includes the corresponding source archive and this build recipe in its managed notices.\n'});
  record={formatVersion:1,binary,sha256:hash(built),bytes:String(built.length),version:featureHelperSource.version,configurationSha256:configHash,notices,source:{url:featureHelperSource.url,sha256:featureHelperSource.sha256,bytes:String(featureHelperSource.bytes),archive,configuration}};
  await writeFile(recordFile,JSON.stringify(record,null,2)+'\n');
 }
 if(process.platform!=='darwin'){
  let notice=record.notices.find(n=>n.path==='zlib/LICENSE');
  if(!notice){
   const zlibLicense=process.platform==='win32'?'C:/msys64/ucrt64/share/licenses/zlib/LICENSE':'/usr/share/doc/zlib1g/copyright';
   const text=(await readFile(zlibLicense,'utf8')).replaceAll('\r\n','\n');notice={path:'zlib/LICENSE',text};record.notices.push(notice);
   const header=await readFile(process.platform==='win32'?'C:/msys64/ucrt64/include/zlib.h':'/usr/include/zlib.h','utf8');
   const version=header.match(/^#define\s+ZLIB_VERSION\s+"([^"]+)"/m)?.[1];assert.ok(version,'Record exact bundled zlib version');
   record.zlib={version,delivery:'statically linked platform build dependency',noticeSha256:hash(text)};
  }
  assert.equal(record.zlib.noticeSha256,hash(notice.text),'Cached bundled zlib notice changed');
 }else record.zlib={delivery:'OS-provided /usr/lib/libz facility; not redistributed'};
 if(process.platform==='darwin'){
  const libraries=(await capture('otool',['-L',binary])).stdout.split('\n').slice(1).map(s=>s.trim().split(/\s/)[0]).filter(Boolean);
  assert.ok(libraries.length&&libraries.every(s=>s.startsWith('/usr/lib/')||s.startsWith('/System/Library/')),'Full FFmpeg has an unbundled non-system dependency');record.nativeDependencies=libraries;
 }else if(process.platform==='linux'){
  const audit=await capture('file',[binary]);assert.match(audit.stdout,/statically linked/,'Linux Full FFmpeg must carry its non-OS-library closure');record.nativeDependencies=['Static FFmpeg and zlib; OS kernel/ABI'];
 }
 const output=(await capture(binary,['-version'])).stdout;assert.ok(output.startsWith('ffmpeg version '+featureHelperSource.version));assert.match((await capture(binary,['-hide_banner','-protocols'])).stdout,/\bfd\b/);assert.match((await capture(binary,['-hide_banner','-encoders'])).stdout,/\bpng\b/);assert.ok(!/--enable-(?:gpl|nonfree|version3)/.test(output));
 record.binary=binary;record.source.archive=path.join(directory,'ffmpeg-9.0.2.tar.xz');assert.equal(hash(await readFile(record.source.archive)),featureHelperSource.sha256,'Corresponding cached source changed');
 await writeFile(recordFile,JSON.stringify(record,null,2)+'\n');
 await writeFile(path.join(root,'.local/feature-helper.json'),JSON.stringify(record,null,2)+'\n');return record;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await prepareFeatureHelper(),null,2));
