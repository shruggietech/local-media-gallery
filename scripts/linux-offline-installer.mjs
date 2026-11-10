import {acquireBytes} from './download-acquisition.mjs';
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,copyFile,mkdir,chmod,open} from 'node:fs/promises';
import path from 'node:path';
import {hash} from './proof.mjs';
import {parseReleaseRecord} from './release-record.mjs';

export const linuxBootstrapWgetrc='timeout = 30\ntries = 5\nretryconnrefused = on\nretryonhttperror = 429,500,502,503,504\nwaitretry = 2\n';

export const linuxInstallerMagic=Buffer.from('LMG-LINUX-FULL1\0');
export function debFields(text){return Object.fromEntries(text.trim().split('\n').map(line=>{const i=line.indexOf(':');assert.ok(i>0);return [line.slice(0,i),line.slice(i+1).trim()];}));}
export function validateOfflineInventory(m,metadataStart){
 assert.equal(m.formatVersion,1);assert.equal(m.product,'local-media-gallery');assert.equal(m.os,'linux');assert.equal(m.arch,'x86_64');assert.ok(Number.isSafeInteger(m.nativeBytes)&&m.nativeBytes>=4);assert.ok(Array.isArray(m.packages)&&m.packages.length>0&&m.packages.length<=2048);
 let end=m.nativeBytes;const names=new Set(),packages=new Map();let applications=0;
 for(const p of m.packages){assert.match(p.name,/^[A-Za-z0-9._+~%\-]+\.deb$/);assert.match(p.package,/^[a-z0-9][a-z0-9+.-]*$/);const identity=p.role+':'+p.package;assert.ok(!names.has(p.name),'Duplicate offline filename: '+p.name);const previous=packages.get(identity);assert.ok(!previous,'Duplicate offline package '+identity+': '+previous?.name+' ('+previous?.version+') and '+p.name+' ('+p.version+')');names.add(p.name);packages.set(identity,p);assert.ok(['amd64','all'].includes(p.architecture));assert.ok(['application','runtime','predecessor'].includes(p.role));assert.equal(p.offset,end);assert.ok(Number.isSafeInteger(p.bytes)&&p.bytes>0);end+=p.bytes;assert.ok(Number.isSafeInteger(end)&&end<=metadataStart);assert.match(p.sha256,/^[a-f0-9]{64}$/);if(p.role==='application'){applications++;assert.equal(p.package,'local-media-gallery');assert.equal(p.version,m.version);assert.equal(p.architecture,'amd64');}}
 assert.equal(applications,1);assert.equal(end,metadataStart);return m;
}
export async function writeOfflineInstaller({native,packages,output,metadata,capture}){
 const binary=await readFile(native);assert.equal(binary.subarray(0,4).toString('hex'),'7f454c46');const payloads=[];let offset=binary.length;
 for(const p of packages){const bytes=await readFile(p.path);const info=(await capture('/usr/bin/dpkg-deb',['--field',p.path,'Package','Version','Architecture'])).stdout;const fields=debFields(info);assert.equal(Object.keys(fields).length,3);payloads.push({data:bytes,record:{name:path.basename(p.path),package:fields.Package,version:fields.Version,architecture:fields.Architecture,role:p.role,source:p.source??{package:fields.Package,version:fields.Version,revision:metadata.revision},offset,bytes:bytes.length,sha256:hash(bytes)}});offset+=bytes.length;}
 const manifest={formatVersion:1,product:'local-media-gallery',...metadata,nativeBytes:binary.length,packages:payloads.map(p=>p.record)};validateOfflineInventory(manifest,offset);const json=Buffer.from(JSON.stringify(manifest));assert.ok(json.length<=8*1024*1024);const footer=Buffer.alloc(24);footer.writeBigUInt64LE(BigInt(json.length));linuxInstallerMagic.copy(footer,8);const file=await open(output,'wx',0o755);try{await file.writeFile(binary);for(const p of payloads)await file.writeFile(p.data);await file.writeFile(json);await file.writeFile(footer);await file.sync();}finally{await file.close();}await chmod(output,0o755);const bytes=await readFile(output),name=path.basename(output);return {manifest,artifact:{path:output,bytes:String(bytes.length),sha256:hash(bytes),format:'run',binary:name,files:[{path:name,bytes:String(bytes.length),sha256:hash(bytes),mode:'755'}]}};
}

export async function acquireCanonicalPredecessor({root,directory}){
 const recordBytes=await readFile(path.join(root,'crates/gallery-preparation/tests/fixtures/release-0.1.0.json'));assert.equal(hash(recordBytes),'079615f3ff8434b32c3c632190b544c6c32e17513fa125ec7e07f679a1c65f1f');const record=parseReleaseRecord(recordBytes,{requirePublished:true});const artifact=record.artifacts.find(a=>a.role==='package'&&a.platform==='linux'&&a.edition==='full'),descriptorRow=record.artifacts.find(a=>a.role==='update-descriptor'&&a.forArtifact===artifact.name);assert.ok(artifact&&descriptorRow);
 async function acquire(row){const bytes=await acquireBytes(row.url,{label:'Canonical Linux predecessor',maxBytes:Number(row.bytes)});return retainCanonicalPredecessorArtifact({row,bytes,directory});}
 const application=await acquire(artifact),descriptorFile=await acquire(descriptorRow),descriptor=JSON.parse(descriptorFile.bytes);assert.equal(descriptor.native.installer.sha256,artifact.sha256);assert.equal(descriptor.native.installer.bytes,artifact.bytes);assert.equal(descriptor.version,'0.1.0');
 return {package:{path:application.file,role:'predecessor',source:{package:'local-media-gallery',version:'0.1.0',source:descriptor.source,releaseRecordSha256:hash(recordBytes)}},descriptor,provenance:{version:'0.1.0',releaseUrl:'https://github.com/shruggietech/local-media-gallery/releases/tag/v0.1.0',releaseRecordSha256:hash(recordBytes),artifact,descriptor:descriptorRow}};
}

export async function retainCanonicalPredecessorArtifact({row,bytes,directory}){
 assert.equal(path.basename(row.name),row.name,'Canonical artifact must be a basename');assert.notEqual(row.name,'.');assert.notEqual(row.name,'..');assert.equal(String(bytes.length),row.bytes);assert.equal(hash(bytes),row.sha256);
 // Published descriptor names can equal the current campaign's names. Keep the
 // immutable predecessor namespace separate from current-generation inputs.
 const retained=path.join(directory,'canonical-0.1.0');await mkdir(retained,{recursive:true});const file=path.join(retained,row.name);await writeFile(file,bytes);return {file,bytes};
}

export async function prepareOfflineClosure({root,directory,application,dependencies,capture}){
 const recipient=path.join(root,'.local','linux-clean-recipient-'+path.basename(directory));
 const wgetrc=path.join(directory,'bootstrap.wgetrc');await writeFile(wgetrc,linuxBootstrapWgetrc,{flag:'wx',mode:0o600});
 try{await capture('/usr/bin/sudo',['-n','/usr/bin/env','WGETRC='+wgetrc,'/usr/sbin/debootstrap','--variant=minbase','--arch=amd64','--include=ca-certificates','noble',recipient,'https://archive.ubuntu.com/ubuntu'],{timeout:1800000,maxBuffer:32*1024*1024});}
 catch(error){await capture('/usr/bin/sudo',['-n','/usr/bin/install','-m','644','--',path.join(recipient,'debootstrap/debootstrap.log'),path.join(directory,'bootstrap.log')]).catch(copyError=>{error.bootstrapLogFailure=String(copyError.message);});throw error;}
 const chroot=(args,options)=>capture('/usr/bin/sudo',['-n','/usr/sbin/chroot',recipient,...args],options);
 const baseline=(await chroot(['/usr/bin/dpkg-query','-W','--showformat=${binary:Package}|${Version}|${Architecture}|${db:Status-Status}\n'])).stdout;
 for(const name of ['local-media-gallery','libgtk-3-0t64','libwebkit2gtk-4.1-0','gstreamer1.0-libav','ffmpeg'])assert.ok(!baseline.split('\n').some(row=>row.split('|')[0].split(':')[0]===name),'Clean recipient unexpectedly contains '+name);
 await chroot(['/bin/sh','-c','printf "%s\\n" "deb https://archive.ubuntu.com/ubuntu noble main universe multiverse restricted" "deb https://archive.ubuntu.com/ubuntu noble-updates main universe multiverse restricted" "deb https://security.ubuntu.com/ubuntu noble-security main universe multiverse restricted" "deb-src https://archive.ubuntu.com/ubuntu noble main universe multiverse restricted" "deb-src https://archive.ubuntu.com/ubuntu noble-updates main universe multiverse restricted" "deb-src https://security.ubuntu.com/ubuntu noble-security main universe multiverse restricted" > /etc/apt/sources.list']);
 await chroot(['/usr/bin/apt-get','-o','Acquire::Retries=2','update'],{timeout:300000,maxBuffer:32*1024*1024});
 await capture('/usr/bin/sudo',['-n','/usr/bin/install','-m','644',application,path.join(recipient,'tmp/application.deb')]);
 // debootstrap retains the baseline's .debs. They are not the dependency
 // resolver's selected closure and may include superseded versions of packages
 // that the application requires. Start this download campaign with an empty
 // archive cache rather than selecting an arbitrary cached version afterward.
 await chroot(['/usr/bin/apt-get','clean']);
 await chroot(['/usr/bin/apt-get','--download-only','--no-install-recommends','--yes','install','/tmp/application.deb','fonts-dejavu-core','gsettings-desktop-schemas','libgl1-mesa-dri','libegl-mesa0'],{timeout:600000,maxBuffer:32*1024*1024});
 const closure=path.join(directory,'offline-packages');await mkdir(closure);const names=(await readdir(path.join(recipient,'var/cache/apt/archives'))).filter(n=>n.endsWith('.deb')).sort();assert.ok(names.length>0,'No runtime packages downloaded from clean baseline');const packages=[];
 for(const name of names){const source=path.join(recipient,'var/cache/apt/archives',name);if((await capture('/usr/bin/dpkg-deb',['--field',source,'Package'])).stdout.trim()==='local-media-gallery')continue;const file=path.join(closure,name);await copyFile(source,file);packages.push({path:file,role:'runtime'});}
 packages.push({path:application,role:'application'});
 // No cached dependency payload or application may remain in the clean recipient.
 await chroot(['/bin/sh','-c','rm -f -- /var/cache/apt/archives/*.deb /tmp/application.deb; mkdir -p /proc /dev /tmp/.X11-unix; chmod 1777 /tmp /tmp/.X11-unix']);
 assert.equal((await chroot(['/usr/bin/dpkg-query','-W','--showformat=${binary:Package}|${Version}|${Architecture}|${db:Status-Status}\n'])).stdout,baseline,'Preparation installed dependencies in recipient');
 return {recipient,baseline,packages,dependencies,basis:'Ubuntu24.04 minbase before application runtimes; exact dependency deb closure embedded in installer, caches cleared before offline installation'};
}

export async function prepareOfflineSources({root,directory,offline,capture,version}){
 const sourcePackages=new Map();
 for(const p of offline.packages.filter(p=>p.role==='runtime')){const info=(await capture('/usr/bin/dpkg-deb',['--field',p.path,'Package','Version','Source'])).stdout,fields=debFields(info);const match=fields.Source?.match(/^([a-z0-9][a-z0-9+.-]*)(?: \(([^)]+)\))?$/);assert.ok(!fields.Source||match,'Malformed binary Source field');const name=match?.[1]??fields.Package,version=match?.[2]??fields.Version;assert.match(name,/^[a-z0-9][a-z0-9+.-]*$/);assert.ok(version.length>0&&!/[\s\x00-\x1f]/.test(version));p.sourceKey=name+'='+version;sourcePackages.set(p.sourceKey,{package:name,version});}
 const recipient=offline.recipient,sourceDirectory='/tmp/recipient-runtime-sources';await capture('/usr/bin/sudo',['-n','/usr/sbin/chroot',recipient,'/bin/mkdir','-p',sourceDirectory]);
 await capture('/usr/bin/sudo',['-n','/usr/sbin/chroot',recipient,'/bin/sh','-c','cd "$1"; shift; exec "$@"','source-download',sourceDirectory,'/usr/bin/apt-get','--download-only','--yes','source',...sourcePackages.keys()],{timeout:1200000,maxBuffer:64*1024*1024});
 const temporary=path.join(recipient,sourceDirectory),retained=path.join(root,'.local','linux-runtime-sources-'+path.basename(directory));await mkdir(retained);const files=[];
 for(const name of (await readdir(temporary)).sort()){assert.match(name,/^[A-Za-z0-9._+~%\-]+$/);const bytes=await readFile(path.join(temporary,name));await writeFile(path.join(retained,name),bytes);files.push({path:name,bytes:String(bytes.length),sha256:hash(bytes),mode:'644'});}
 for(const descriptor of files.filter(f=>f.path.endsWith('.dsc'))){const text=await readFile(path.join(retained,descriptor.path),'utf8'),name=text.match(/^Source: (.+)$/m)?.[1],version=text.match(/^Version: (.+)$/m)?.[1],record=sourcePackages.get(name+'='+version);assert.ok(record,'Unexpected source descriptor '+descriptor.path);const block=text.match(/^Checksums-Sha256:\r?\n((?:[ \t].*\r?\n)+)/m)?.[1];assert.ok(block,'Source descriptor has no SHA256 inventory');record.descriptor=descriptor;record.files=block.trim().split(/\r?\n/).map(line=>{const [sha256,bytes,name]=line.trim().split(/\s+/);assert.match(name,/^[A-Za-z0-9._+~%\-]+$/);const actual=files.find(f=>f.path===name);assert.ok(actual,'Source archive missing '+name);assert.equal(actual.sha256,sha256);assert.equal(actual.bytes,bytes);return actual;});}
 for(const record of sourcePackages.values())assert.ok(record.descriptor&&record.files?.length>0,'Exact corresponding source not retained: '+record.package+'='+record.version);
 for(const p of offline.packages.filter(p=>p.role==='runtime')){p.source=sourcePackages.get(p.sourceKey);delete p.sourceKey;}
 const sourceManifest={formatVersion:1,product:'local-media-gallery',platform:'linux',edition:'full',basis:'Corresponding Ubuntu source package descriptors and exact SHA256-verified source archives for every embedded runtime deb',sources:[...sourcePackages.values()],files};await writeFile(path.join(retained,'SOURCE-MANIFEST.json'),JSON.stringify(sourceManifest,null,2)+'\n');
 const output=path.join(directory,'local-media-gallery-'+version+'-full-x86_64-linux-runtime-sources.tar.xz');await capture('/usr/bin/tar',['--use-compress-program=xz -T2','-cf',output,'-C',retained,'.'],{timeout:1200000,maxBuffer:8*1024*1024});const bytes=await readFile(output),name=path.basename(output),artifact={path:path.relative(root,output),bytes:String(bytes.length),sha256:hash(bytes),format:'tar.xz',files:[{path:name,bytes:String(bytes.length),sha256:hash(bytes),mode:'644'}]};
 await capture('/usr/bin/sudo',['-n','/usr/sbin/chroot',recipient,'/bin/rm','-rf','--',sourceDirectory]);return {manifest:sourceManifest,artifact};
}
