// SPDX-License-Identifier: Apache-2.0
// A root-only, bounded CI worker. All UI stays on the elected isolated desktop.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile,chmod,chown,readlink,lstat,realpath,unlink,rename} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {watch,createReadStream,constants} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';

export async function observeReadyDirectory(directory,onChange=()=>{},timeout=3000){
 const name='.lmg-observer-ready-'+randomUUID(),probe=path.join(directory,name);let settle,fail,created=false;const observed=new Promise((resolve,reject)=>{settle=resolve;fail=reject;});const watcher=watch(directory,(event,file)=>{if(file?.toString()===name){if(event==='rename')settle({directory,probe:name,event,observedBeforeLaunch:true});return;}onChange(event,file);});watcher.on('error',fail);const timer=setTimeout(()=>fail(Error('Directory observer did not observe its readiness probe: '+directory)),timeout);
 try{await writeFile(probe,'observer readiness',{flag:'wx',mode:0o600});created=true;const readiness=await observed;await unlink(probe);created=false;return {watcher,readiness};}catch(error){watcher.close();if(created)await unlink(probe);throw error;}finally{clearTimeout(timer);}
}

export async function stageRecipientInstaller({recipient,source,name}){
 assert.ok(['local-media-gallery-full.run','local-media-gallery-next.run'].includes(name),'Unknown recipient ingress name');
 assert.ok(path.isAbsolute(recipient)&&path.resolve(recipient)===recipient,'Recipient must be an absolute normalized path');assert.ok(path.isAbsolute(source),'Installer source must be absolute');
 const directory=path.join(recipient,'tmp'),target=path.join(directory,name),uid=process.getuid?.(),gid=process.getgid?.();
 for(const parent of [recipient,directory]){const info=await lstat(parent);assert.ok(info.isDirectory()&&!info.isSymbolicLink(),'Recipient ingress parent must be physical');assert.equal(await realpath(parent),parent);if(uid!==undefined){assert.equal(info.uid,uid,'Ingress parent owner differs');assert.equal(info.gid,gid,'Ingress parent group differs');}}
 async function fingerprint(file){const info=await lstat(file);assert.ok(info.isFile()&&!info.isSymbolicLink()&&info.nlink===1,'Ingress must be a physical single-link file');assert.equal(await realpath(file),path.resolve(file));const hash=createHash('sha256');for await(const bytes of createReadStream(file))hash.update(bytes);return {bytes:info.size,sha256:hash.digest('hex')};}
 const expected=await fingerprint(source);let present;try{present=await lstat(target);}catch(error){if(error.code!=='ENOENT')throw error;}
 const reused=Boolean(present);
 if(!present){
  // libuv copyFile preserves source uid/gid. Publish only an absent ingress and
  // take worker ownership before reuse, avoiding sticky-/tmp O_CREAT refusals.
  await copyFile(source,target,constants.COPYFILE_EXCL);
  if(uid!==undefined)await chown(target,uid,gid);
  await chmod(target,0o755);present=await lstat(target);
 }
 if(uid!==undefined){assert.equal(present.uid,uid,'Ingress owner differs');assert.equal(present.gid,gid,'Ingress group differs');assert.equal(present.mode&0o777,0o755,'Ingress mode differs');}
 assert.deepEqual(await fingerprint(target),expected,'Existing recipient ingress bytes differ');
 return {target,reused,...expected};
}

export const recipientStateCaptureBasis='Authoritative preferences, persistent history, optional SQLite WAL and retained sentinels only. Derived WebKit/GTK caches, sockets, lock files and SQLite SHM are excluded from state artifacts. The complete original profile, including transient nodes, is preserved by directory rename.';
export async function captureRecipientState(profile,destination){
 const base=path.resolve(profile.base),names=[];for(const [key,directory]of Object.entries(profile.env))names.push(path.join(directory,'retained-'+key+'.txt'));
 names.push(path.join(profile.env.XDG_CONFIG_HOME,'tech.shruggie.local-media-gallery/settings.json'));for(const suffix of ['', '-wal'])names.push(path.join(profile.env.XDG_STATE_HOME,'tech.shruggie.local-media-gallery/history.sqlite3'+suffix));
 if(destination){destination=path.resolve(destination);assert.ok(destination!==base&&!destination.startsWith(base+path.sep),'State evidence must be outside its live profile');await mkdir(destination,{recursive:true});assert.equal(await realpath(destination),destination);}
 const inventory=[];for(const file of names){const relative=path.relative(base,path.resolve(file));assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'State path escapes profile');let info;try{info=await lstat(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}assert.ok(info.isFile()&&!info.isSymbolicLink()&&info.nlink===1,'Authoritative state must be a physical single-link regular file');assert.equal(await realpath(file),path.resolve(file),'Redirected authoritative state parent');const bytes=await readFile(file),mode=process.platform==='win32'?null:(info.mode&0o777).toString(8).padStart(3,'0');inventory.push({path:relative.replaceAll(path.sep,'/'),bytes:String(bytes.length),sha256:createHash('sha256').update(bytes).digest('hex'),mode});
  if(destination){const target=path.join(destination,relative);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes,{flag:'wx',mode:0o600});if(mode!==null)await chmod(target,Number.parseInt(mode,8));assert.equal(createHash('sha256').update(await readFile(target)).digest('hex'),inventory.at(-1).sha256);}
 }
 return inventory.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}

export async function isolateRecipientProfile(directory,exercise){
 assert.ok(path.isAbsolute(directory)&&path.resolve(directory)===directory,'Profile fixture must be absolute and normalized');const info=await lstat(directory);assert.ok(info.isDirectory()&&!info.isSymbolicLink());assert.equal(await realpath(directory),directory);
 const saved=directory+'-retained-current',published=directory+'-published-predecessor';for(const target of [saved,published])await assert.rejects(lstat(target),{code:'ENOENT'});
 await rename(directory,saved);
 try{await mkdir(directory);return {value:await exercise({directory,saved,published}),publishedDirectory:published};}
 finally{try{await rename(directory,published);}finally{await rename(saved,directory);}}
}

export async function startCleanRecipient({recipient,installer,capture,environment}){
 const bus=(await capture('/usr/bin/gdbus',['call','--session','--dest','org.a11y.Bus','--object-path','/org/a11y/bus','--method','org.a11y.Bus.GetAddress'])).stdout.trim();
 const atspi=bus.match(/unix:(?:[^']*,)?path=([^,';]+)/)?.[1];assert.ok(atspi,'AT-SPI observer bus has a physical Unix socket');
 const pulseInfo=(await capture('/usr/bin/pactl',['--format=json','info'])).stdout;const pulse=JSON.parse(pulseInfo).server_string;assert.ok(pulse?.startsWith('/'),'Pulse observer uses a Unix socket');
 const session=environment.DBUS_SESSION_BUS_ADDRESS?.match(/(?:^|;)unix:(?:[^;]*,)?path=([^,;]+)/)?.[1];assert.ok(session,'Session bus must use a physical Unix socket');
 const identity={uid:process.getuid(),gid:process.getgid()},configuration={recipient,installer,identity,display:environment.DISPLAY,xauthority:environment.XAUTHORITY??null,sockets:[session,atspi,pulse],sessionAddress:environment.DBUS_SESSION_BUS_ADDRESS,pulse,before:await readlink('/proc/self/ns/net')};
 const control=spawn('/usr/bin/sudo',['-n','/usr/bin/unshare','--mount','--net','--',process.execPath,fileURLToPath(import.meta.url),'--worker'],{env:environment,shell:false,stdio:['pipe','pipe','pipe']});
 const pending=new Map();let serial=0,stderr='',closed=false;control.stderr.on('data',b=>{stderr=(stderr+b).slice(-32768);});
 createInterface({input:control.stdout}).on('line',line=>{let response;try{response=JSON.parse(line);}catch{return;}const p=pending.get(response.id);if(p){pending.delete(response.id);response.error?p.reject(Error(response.error)):p.resolve(response.result);}});
 const failure=()=>{closed=true;for(const p of pending.values())p.reject(Error('Clean recipient worker exited: '+stderr));pending.clear();};control.on('error',failure);control.on('exit',failure);
 function request(operation,data={}){if(closed)return Promise.reject(Error('Clean recipient worker is closed'));const id=++serial;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});control.stdin.write(JSON.stringify({id,operation,...data})+'\n');});}
 const readiness=await request('prepare',{configuration});
 return {readiness,request,async launch(entry,args,profile){const launched=await request('launch',{entry,args,profile});const child={pid:launched.pid};return {child,observed:()=>{try{process.kill(child.pid,0);return {error:null,exitCode:null,signal:null};}catch{return {error:null,exitCode:0,signal:null};}},stop:()=>request('stop')};},async close(){try{if(!closed)await request('close');}finally{control.stdin.end();}}};
}

if(process.argv.includes('--worker')){
 assert.equal(process.platform,'linux');assert.equal(process.getuid(),0);let configuration,active;const records=[];let outputTail='';
 const run=(file,args,options={})=>{const r=spawnSync(file,args,{encoding:'utf8',env:{PATH:'/usr/sbin:/usr/bin:/sbin:/bin',LC_ALL:'C',DEBIAN_FRONTEND:'noninteractive',...(configuration?{PKEXEC_UID:String(configuration.identity.uid)}:{})},shell:false,timeout:120000,maxBuffer:32*1024*1024,...options});records.push({file,args,status:r.status,stdout:r.stdout?.slice(-65536),stderr:r.stderr?.slice(-32768)});assert.equal(r.status,0,'Clean recipient command failed: '+file+' '+args.join(' ')+'\n'+r.stderr+'\n'+r.stdout);return r;};
 const stop=async()=>{if(active){const child=active;active=null;if(child.exitCode===null){try{process.kill(-child.pid,'SIGTERM');}catch{}await new Promise(resolve=>{const t=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}resolve();},5000);child.once('exit',()=>{clearTimeout(t);resolve();});});}}};
 const lifetime=setTimeout(async()=>{await stop();process.exit(2);},540000);lifetime.unref();
 const lines=createInterface({input:process.stdin});
 for await(const line of lines){let request;try{request=JSON.parse(line);let result={};switch(request.operation){
  case 'prepare':{
   configuration=request.configuration;const base=configuration.recipient,repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');assert.equal(path.dirname(base),path.join(repository,'.local'));assert.ok(path.basename(base).startsWith('linux-clean-recipient-'));assert.equal(path.resolve(base),base);const info=await lstat(base);assert.ok(info.isDirectory()&&!info.isSymbolicLink());assert.equal(await realpath(base),base);run('/usr/bin/mount',['--make-rprivate','/']);
   for(const [from,to]of [['/dev','/dev'],['/tmp/.X11-unix','/tmp/.X11-unix']]){await mkdir(base+to,{recursive:true});run('/usr/bin/mount',['--bind',from,base+to]);}
   await mkdir(base+'/proc',{recursive:true});run('/usr/bin/mount',['-t','proc','proc',base+'/proc']);
   for(const socket of configuration.sockets){assert.ok(path.isAbsolute(socket)&&!socket.includes('..'));await mkdir(path.dirname(base+socket),{recursive:true});await writeFile(base+socket,'');run('/usr/bin/mount',['--bind',socket,base+socket]);}
   if(configuration.xauthority){await copyFile(configuration.xauthority,base+'/tmp/recipient.Xauthority');await chmod(base+'/tmp/recipient.Xauthority',0o644);}
   const passwd='recipient:x:'+configuration.identity.uid+':'+configuration.identity.gid+':Recipient:/tmp/recipient-profile/home:/bin/sh\n';await writeFile(base+'/etc/passwd',(await readFile(base+'/etc/passwd','utf8'))+passwd);await writeFile(base+'/etc/group',(await readFile(base+'/etc/group','utf8'))+'recipient:x:'+configuration.identity.gid+':\n');
   run('/usr/sbin/ip',['link','set','lo','up']);const routes=await readFile('/proc/net/route','utf8');assert.equal(routes.trim().split('\n').length,1,'Offline namespace must have no route');const interfaces=await readFile('/proc/net/dev','utf8');assert.ok(!interfaces.includes('eth0:'));const networkNamespace=await readlink('/proc/self/ns/net');assert.notEqual(networkNamespace,configuration.before);result={networkNamespace,parentNetworkNamespace:configuration.before,routes,interfaces,basis:'Separate network namespace, only loopback enabled; external networking unavailable'};break;
  }
  case 'install':{await stageRecipientInstaller({recipient:configuration.recipient,source:configuration.installer,name:'local-media-gallery-full.run'});run('/usr/sbin/chroot',[configuration.recipient,'/tmp/local-media-gallery-full.run']);result={records:records.splice(0),output:outputTail};break;}
  case 'fresh-interruption':{
   await stageRecipientInstaller({recipient:configuration.recipient,source:configuration.installer,name:'local-media-gallery-full.run'});assert.ok(Array.isArray(request.files)&&request.files.length>0);
   result=await new Promise((resolve,reject)=>{let child,armed=false,sampling=false,interrupted=false,stdout='',stderr='',buffer='',snapshot,appWatch;const watchers=[],readiness=[];let events=0;const timer=setTimeout(()=>fail(Error('Fresh unpack interruption deadline: '+stdout+' '+stderr)),240000);
    const changed=(event,name)=>{events++;if(event==='rename')void inspect();};
    const attachApplication=()=>{if(appWatch)return;try{const directory=configuration.recipient+'/usr/lib/local-media-gallery';appWatch=watch(directory,changed);appWatch.on('error',fail);watchers.push(appWatch);}catch(e){if(e.code!=='ENOENT')throw e;}};
    const inspect=async()=>{if(!armed||sampling||interrupted||!child)return;sampling=true;try{process.kill(-child.pid,'SIGSTOP');attachApplication();const present=[],missing=[];for(const f of request.files){try{await lstat(path.join(configuration.recipient,f.path));present.push(f.path);}catch(e){if(e.code!=='ENOENT')throw e;missing.push(f.path);}}if(present.length&&missing.length){const authority=JSON.parse(await readFile(configuration.recipient+'/var/lib/local-media-gallery/updates/fresh-install.json'));assert.equal(authority.phase,'applying');snapshot={present,missing,authority};interrupted=true;process.kill(-child.pid,'SIGKILL');}else{process.kill(-child.pid,'SIGCONT');}}catch(error){fail(error);}finally{sampling=false;}};
    function fail(error){clearTimeout(timer);for(const watcher of watchers)watcher.close();if(child)try{process.kill(-child.pid,'SIGKILL');}catch{}reject(error);}
    (async()=>{try{for(const directory of ['/usr/bin','/usr/lib']){const ready=await observeReadyDirectory(configuration.recipient+directory,(event,name)=>{const file=name?.toString()??'';if((directory==='/usr/bin'&&file.includes('local-media-gallery'))||(directory==='/usr/lib'&&file==='local-media-gallery'))changed(event,name);});watchers.push(ready.watcher);readiness.push(ready.readiness);}attachApplication();
      child=spawn('/usr/sbin/chroot',[configuration.recipient,'/tmp/local-media-gallery-full.run'],{shell:false,detached:true,env:{PATH:'/usr/sbin:/usr/bin:/sbin:/bin',PKEXEC_UID:String(configuration.identity.uid),LMG_UPDATE_EVENTS:'1'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',bytes=>{stdout+=bytes;buffer+=bytes;while(buffer.includes('\n')){const at=buffer.indexOf('\n'),line=buffer.slice(0,at);buffer=buffer.slice(at+1);try{const event=JSON.parse(line);if(event.event==='fresh-install'&&event.phase==='applying')armed=true;}catch{}}});child.stderr.on('data',b=>stderr+=b);child.once('error',fail);child.once('exit',(code,signal)=>{clearTimeout(timer);for(const watcher of watchers)watcher.close();if(interrupted&&signal==='SIGKILL')resolve({interrupted,signal,stdout,stderr,snapshot,observer:{readiness,events,mechanism:'Direct existing-directory watches armed by observed create probes before installer launch; package group paused before snapshot'}});else fail(Error('Fresh installer did not leave elected partial unpack: '+code+' '+signal+'; readiness='+JSON.stringify(readiness)+'; events='+events+' '+stdout+' '+stderr));});
    }catch(error){fail(error);}})();
   });break;
  }
  case 'replacement':{assert.ok(path.isAbsolute(request.installer));await stageRecipientInstaller({recipient:configuration.recipient,source:request.installer,name:'local-media-gallery-next.run'});if(!request.interrupt){const r=run('/usr/sbin/chroot',[configuration.recipient,'/tmp/local-media-gallery-next.run']);result={stdout:r.stdout,stderr:r.stderr};break;}
   result=await new Promise((resolve,reject)=>{const child=spawn('/usr/sbin/chroot',[configuration.recipient,'/tmp/local-media-gallery-next.run'],{shell:false,env:{PATH:'/usr/sbin:/usr/bin:/sbin:/bin',PKEXEC_UID:String(configuration.identity.uid),LMG_UPDATE_EVENTS:'1'},stdio:['ignore','pipe','pipe']});let output='',stderr='',buffer='',interrupted=false;const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Facade interruption boundary deadline: '+output+' '+stderr));},30000);child.stdout.on('data',bytes=>{output+=bytes;buffer+=bytes;while(buffer.includes('\n')){const at=buffer.indexOf('\n'),line=buffer.slice(0,at);buffer=buffer.slice(at+1);try{const event=JSON.parse(line);if(event.event==='phase'&&event.phase==='prepared'&&!interrupted){interrupted=true;child.kill('SIGKILL');}}catch{}}});child.stderr.on('data',b=>stderr+=b);child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',(code,signal)=>{clearTimeout(timer);interrupted&&signal==='SIGKILL'?resolve({interrupted,signal,stdout:output,stderr}):reject(Error('Facade did not reach elected interruption: '+code+' '+signal+' '+output+' '+stderr));});});break;}
  case 'command':{assert.ok(Array.isArray(request.args)&&request.args.every(x=>typeof x==='string'));const r=run('/usr/sbin/chroot',[configuration.recipient,...request.args]);result={stdout:r.stdout,stderr:r.stderr};break;}
  case 'launch':{
   assert.ok(!active);const profile=Object.fromEntries(Object.entries(request.profile).map(([key,value])=>[key,value.startsWith(configuration.recipient)?value.slice(configuration.recipient.length):value]));const env={...profile,PATH:'/usr/bin:/bin',DISPLAY:configuration.display,DBUS_SESSION_BUS_ADDRESS:configuration.sessionAddress,PULSE_SERVER:'unix:'+configuration.pulse,PULSE_SINK:'lmg_qualification',XAUTHORITY:'/tmp/recipient.Xauthority',GTK_A11Y:'1',NO_AT_BRIDGE:'0',GSETTINGS_BACKEND:'keyfile',WEBKIT_DISABLE_DMABUF_RENDERER:'1',LIBGL_ALWAYS_SOFTWARE:'1'};
   active=spawn('/usr/sbin/chroot',['--userspec='+configuration.identity.uid+':'+configuration.identity.gid,configuration.recipient,'/usr/bin/env',...Object.entries(env).map(([k,v])=>k+'='+v),request.entry,...request.args.map(x=>x.startsWith(configuration.recipient)?x.slice(configuration.recipient.length):x)],{shell:false,detached:true,stdio:['ignore','pipe','pipe'],env:{PATH:'/usr/sbin:/usr/bin:/sbin:/bin'}});active.stdout.on('data',b=>{outputTail=(outputTail+b).slice(-65536);});active.stderr.on('data',b=>{outputTail=(outputTail+b).slice(-65536);});result={pid:active.pid};break;
  }
  case 'stop':await stop();result={output:outputTail};break;
  case 'close':await stop();console.log(JSON.stringify({id:request.id,result:{records}}));process.exit(0);break;
  default:throw Error('Unknown clean recipient operation');
 }console.log(JSON.stringify({id:request.id,result}));}catch(error){console.log(JSON.stringify({id:request?.id,error:error.stack}));}}
 await stop();
}
