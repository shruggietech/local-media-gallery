// SPDX-License-Identifier: Apache-2.0
// A root-only, bounded CI worker. All UI stays on the elected isolated desktop.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile,chmod,readlink,lstat,realpath} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

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
  case 'install':{const target=configuration.recipient+'/tmp/local-media-gallery-full.run';await copyFile(configuration.installer,target);await chmod(target,0o755);run('/usr/sbin/chroot',[configuration.recipient,'/tmp/local-media-gallery-full.run']);result={records:records.splice(0),output:outputTail};break;}
  case 'replacement':{const target=configuration.recipient+'/tmp/local-media-gallery-next.run';assert.ok(path.isAbsolute(request.installer));await copyFile(request.installer,target);await chmod(target,0o755);if(!request.interrupt){const r=run('/usr/sbin/chroot',[configuration.recipient,'/tmp/local-media-gallery-next.run']);result={stdout:r.stdout,stderr:r.stderr};break;}
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
