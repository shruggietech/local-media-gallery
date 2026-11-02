// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,copyFile,mkdir,chmod,open} from 'node:fs/promises';
import path from 'node:path';
import {hash} from './proof.mjs';

export const linuxInstallerMagic=Buffer.from('LMG-LINUX-FULL1\0');
export function validateOfflineInventory(m,metadataStart){
 assert.equal(m.formatVersion,1);assert.equal(m.product,'local-media-gallery');assert.equal(m.os,'linux');assert.equal(m.arch,'x86_64');assert.ok(Number.isSafeInteger(m.nativeBytes)&&m.nativeBytes>=4);assert.ok(Array.isArray(m.packages)&&m.packages.length>0&&m.packages.length<=2048);
 let end=m.nativeBytes;const names=new Set(),packages=new Set();let applications=0;
 for(const p of m.packages){assert.match(p.name,/^[A-Za-z0-9._+~%\-]+\.deb$/);assert.match(p.package,/^[a-z0-9][a-z0-9+.-]*$/);assert.ok(!names.has(p.name)&&!packages.has(p.package));names.add(p.name);packages.add(p.package);assert.ok(['amd64','all'].includes(p.architecture));assert.ok(['application','runtime'].includes(p.role));assert.equal(p.offset,end);assert.ok(Number.isSafeInteger(p.bytes)&&p.bytes>0);end+=p.bytes;assert.ok(Number.isSafeInteger(end)&&end<=metadataStart);assert.match(p.sha256,/^[a-f0-9]{64}$/);if(p.role==='application'){applications++;assert.equal(p.package,'local-media-gallery');assert.equal(p.version,m.version);assert.equal(p.architecture,'amd64');}}
 assert.equal(applications,1);assert.equal(end,metadataStart);return m;
}
export async function writeOfflineInstaller({native,packages,output,metadata,capture}){
 const binary=await readFile(native);assert.equal(binary.subarray(0,4).toString('hex'),'7f454c46');const payloads=[];let offset=binary.length;
 for(const p of packages){const bytes=await readFile(p.path);const info=(await capture('/usr/bin/dpkg-deb',['--field',p.path,'Package','Version','Architecture'])).stdout;const fields=Object.fromEntries(info.trim().split('\n').map(s=>s.split(/:\s*/,2)));assert.equal(Object.keys(fields).length,3);payloads.push({data:bytes,record:{name:path.basename(p.path),package:fields.Package,version:fields.Version,architecture:fields.Architecture,role:p.role,offset,bytes:bytes.length,sha256:hash(bytes)}});offset+=bytes.length;}
 const manifest={formatVersion:1,product:'local-media-gallery',...metadata,nativeBytes:binary.length,packages:payloads.map(p=>p.record)};validateOfflineInventory(manifest,offset);const json=Buffer.from(JSON.stringify(manifest));assert.ok(json.length<=8*1024*1024);const footer=Buffer.alloc(24);footer.writeBigUInt64LE(BigInt(json.length));linuxInstallerMagic.copy(footer,8);const file=await open(output,'wx',0o755);try{await file.writeFile(binary);for(const p of payloads)await file.writeFile(p.data);await file.writeFile(json);await file.writeFile(footer);await file.sync();}finally{await file.close();}await chmod(output,0o755);const bytes=await readFile(output),name=path.basename(output);return {manifest,artifact:{path:output,bytes:String(bytes.length),sha256:hash(bytes),format:'run',binary:name,files:[{path:name,bytes:String(bytes.length),sha256:hash(bytes),mode:'755'}]}};
}

export async function prepareOfflineClosure({root,directory,application,dependencies,capture}){
 const recipient=path.join(root,'.local','linux-clean-recipient-'+path.basename(directory));
 await capture('/usr/bin/sudo',['-n','/usr/sbin/debootstrap','--variant=minbase','--arch=amd64','--include=ca-certificates','noble',recipient,'https://archive.ubuntu.com/ubuntu'],{timeout:900000,maxBuffer:32*1024*1024});
 const chroot=(args,options)=>capture('/usr/bin/sudo',['-n','/usr/sbin/chroot',recipient,...args],options);
 const baseline=(await chroot(['/usr/bin/dpkg-query','-W','--showformat=${binary:Package}|${Version}|${Architecture}|${db:Status-Status}\n'])).stdout;
 for(const name of ['local-media-gallery','libgtk-3-0t64','libwebkit2gtk-4.1-0','gstreamer1.0-libav','ffmpeg'])assert.ok(!baseline.split('\n').some(row=>row.split('|')[0].split(':')[0]===name),'Clean recipient unexpectedly contains '+name);
 await chroot(['/bin/sh','-c','printf "%s\\n" "deb https://archive.ubuntu.com/ubuntu noble main universe multiverse restricted" "deb https://archive.ubuntu.com/ubuntu noble-updates main universe multiverse restricted" "deb https://security.ubuntu.com/ubuntu noble-security main universe multiverse restricted" > /etc/apt/sources.list']);
 await chroot(['/usr/bin/apt-get','-o','Acquire::Retries=2','update'],{timeout:300000,maxBuffer:32*1024*1024});
 await capture('/usr/bin/sudo',['-n','/usr/bin/install','-m','644',application,path.join(recipient,'tmp/application.deb')]);
 await chroot(['/usr/bin/apt-get','--download-only','--no-install-recommends','--yes','install','/tmp/application.deb','fonts-dejavu-core','gsettings-desktop-schemas'],{timeout:600000,maxBuffer:32*1024*1024});
 const closure=path.join(directory,'offline-packages');await mkdir(closure);const names=(await readdir(path.join(recipient,'var/cache/apt/archives'))).filter(n=>n.endsWith('.deb')).sort();assert.ok(names.length>0,'No runtime packages downloaded from clean baseline');const packages=[];
 for(const name of names){const source=path.join(recipient,'var/cache/apt/archives',name);if((await capture('/usr/bin/dpkg-deb',['--field',source,'Package'])).stdout.trim()==='local-media-gallery')continue;const file=path.join(closure,name);await copyFile(source,file);packages.push({path:file,role:'runtime'});}
 packages.push({path:application,role:'application'});
 // No cached dependency payload or application may remain in the clean recipient.
 await chroot(['/bin/sh','-c','rm -f -- /var/cache/apt/archives/*.deb /tmp/application.deb; mkdir -p /proc /dev /tmp/.X11-unix; chmod 1777 /tmp /tmp/.X11-unix']);
 assert.equal((await chroot(['/usr/bin/dpkg-query','-W','--showformat=${binary:Package}|${Version}|${Architecture}|${db:Status-Status}\n'])).stdout,baseline,'Preparation installed dependencies in recipient');
 return {recipient,baseline,packages,dependencies,basis:'Ubuntu24.04 minbase before application runtimes; exact dependency deb closure embedded in installer, caches cleared before offline installation'};
}
