// SPDX-License-Identifier: Apache-2.0
import {mkdir,mkdtemp,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root,execute,python} from './run.mjs';
import {prepareMediaTool} from './prepare-media-tool.mjs';
import {digest} from './runtime-evidence.mjs';
export async function createRuntimeFixture(){
 await mkdir(path.join(root,'.local'),{recursive:true});
 const directory=await mkdtemp(path.join(root,'.local/runtime-fixture-'));
 await execute(python,['scripts/create-runtime-fixture.py',directory]);
 const tool=await prepareMediaTool();const images=JSON.parse(await readFile(path.join(directory,'images.json')));const videos=[];
 for(const [name,codec,audio] of [['tone.mp4','h264',true],['silent.mp4','h264',false],['tone.webm','vp9',true]]){
  const args=['-nostdin','-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=160x96:rate=12:duration=4'];
  if(audio)args.push('-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=4');
  args.push('-c:v',codec==='h264'?'libx264':'libvpx-vp9','-threads','1','-pix_fmt','yuv420p');
  if(codec==='h264')args.push('-preset','ultrafast','-movflags','+faststart');
  if(audio)args.push('-c:a',codec==='h264'?'aac':'libopus');else args.push('-an');
  args.push(path.join(directory,name));await execute(tool.binary,args);
  videos.push({name,type:'video',codec,audio,frequency:audio?440:null,width:160,height:96});
 }
 const files=[];for(const name of (await readdir(directory)).sort()){const bytes=await readFile(path.join(directory,name));files.push({name,bytes:String(bytes.length),sha256:digest(bytes)});}
 const fixture={formatVersion:1,directory,entries:[...images,...videos],files,sha256:digest(Buffer.from(JSON.stringify(files))),tool:{sha256:tool.sha256,version:tool.version}};
 await writeFile(path.join(root,'.local/runtime-fixture.json'),JSON.stringify(fixture,null,2)+'\n');
 return fixture;
}
export async function verifyRuntimeFixture(fixture){
 for(const file of fixture.files){const full=path.join(fixture.directory,file.name);if(String((await stat(full)).size)!==file.bytes||digest(await readFile(full))!==file.sha256)throw new Error('Runtime fixture changed: '+file.name);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await createRuntimeFixture(),null,2));
