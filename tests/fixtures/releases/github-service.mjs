// SPDX-License-Identifier: Apache-2.0
import {createServer} from 'node:http';
export async function githubService({repository='o/r',sourceRevision='b'.repeat(40)}={}){
 const state={releases:[],assets:new Map(),latest:null,tag:null,next:1,failures:{},delays:{},writes:[]},lag=new Map();
 const hold=(key,kind,value)=>lag.set(key,{remaining:state.delays[kind]??0,value:structuredClone(value)});
 const view=(key,value)=>{const old=lag.get(key);if(old?.remaining>0){old.remaining--;return old.value;}return value;};
 const assets=id=>(state.assets.get(id)??[]).map(({body,...a})=>a);
 const finalUrl=(release,name)=>'https://github.com/'+repository+'/releases/download/'+release.tag_name+'/'+name;
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://fixture'),route=url.pathname.replace('/repos/'+repository,'');
   let bytes=Buffer.alloc(0);for await(const chunk of req)bytes=Buffer.concat([bytes,chunk]);
   const body=bytes.length&&req.headers['content-type']==='application/json'?JSON.parse(bytes):null;
   const send=(status,value)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
   if(req.method!=='GET')state.writes.push({method:req.method,route,body});
   if(route.startsWith('/git/ref/')){const tag=view('tag',state.tag);return tag?send(200,{object:{type:'commit',sha:tag}}):send(404,{});}
   if(route==='/releases/latest'){const latest=view('latest',state.latest);return latest?send(200,state.releases.find(r=>r.id===latest)):send(404,{});}
   if(route==='/releases'&&req.method==='GET')return send(200,view('releases',state.releases));
   if(route==='/releases'&&req.method==='POST'){
    if(state.failures.createBefore){state.failures.createBefore--;return send(500,{});}
    hold('releases','create',state.releases);
    const r={id:state.next++,draft:true,prerelease:false,...body,html_url:'https://github.com/'+repository+'/releases/tag/'+body.tag_name,published_at:null};
    r.upload_url=origin+'/uploads/'+r.id+'{?name,label}';state.releases.push(r);
    if(state.failures.createLost){state.failures.createLost--;req.socket.destroy();return;}return send(201,r);
   }
   const upload=url.pathname.match(/^\/uploads\/(\d+)$/);
   if(upload&&req.method==='POST'){
    const id=Number(upload[1]),name=url.searchParams.get('name'),r=state.releases.find(r=>r.id===id),list=state.assets.get(id)??[];
    if(list.some(a=>a.name===name))return send(422,{});
    if(state.failures.uploadBefore){state.failures.uploadBefore--;return send(500,{});}
    hold('assets:'+id,'upload',assets(id));
    const a={id:state.next++,name,size:bytes.length,state:'uploaded',browser_download_url:r.draft?'https://github.com/'+repository+'/releases/download/untagged-fixture/'+name:finalUrl(r,name),body:bytes};
    a.url=origin+'/repos/'+repository+'/releases/assets/'+a.id;list.push(a);state.assets.set(id,list);
    if(state.failures.uploadStarter){state.failures.uploadStarter--;a.state='starter';a.size=0;a.body=Buffer.alloc(0);return send(502,{});}
    if(state.failures.uploadLost){state.failures.uploadLost--;req.socket.destroy();return;}return send(201,a);
   }
   const asset=route.match(/^\/releases\/assets\/(\d+)$/);
   if(asset){
    const id=Number(asset[1]);
    if(req.method==='DELETE'){
     for(const [releaseId,list]of state.assets){if(list.some(a=>a.id===id)){hold('assets:'+releaseId,'delete',assets(releaseId));state.assets.set(releaseId,list.filter(a=>a.id!==id));}}
     if(state.failures.deleteLost){state.failures.deleteLost--;req.socket.destroy();return;}res.writeHead(204);res.end();return;
    }
    const a=[...state.assets.values()].flat().find(a=>a.id===id);if(!a)return send(404,{});res.end(a.body);return;
   }
   const match=route.match(/^\/releases\/(\d+)(\/assets)?$/);
   if(match){
    const r=state.releases.find(r=>r.id===Number(match[1]));if(!r)return send(404,{});
    if(match[2])return send(200,view('assets:'+r.id,assets(r.id)));
    if(req.method==='GET')return send(200,r);
    if(req.method==='PATCH'){
     if(body.draft===false&&state.failures.publishBefore){state.failures.publishBefore--;return send(500,{});}
     if(body.make_latest==='true'&&state.failures.promoteBefore){state.failures.promoteBefore--;return send(500,{});}
     if(body.draft===false){hold('releases','publish',state.releases);hold('tag','tag',state.tag);}
     if(body.make_latest==='true')hold('latest','promote',state.latest);
     Object.assign(r,body);
     if(body.draft===false){
      r.published_at='2026-10-31T00:00:00Z';state.tag=sourceRevision;
      for(const a of state.assets.get(r.id)??[])a.browser_download_url=finalUrl(r,a.name)+(state.failures.finalUrl?'?wrong=1':'');
     }
     if(body.make_latest==='true')state.latest=r.id;
     if(state.failures.publishLost&&body.draft===false){state.failures.publishLost--;req.socket.destroy();return;}
     if(state.failures.promoteLost&&body.make_latest==='true'){state.failures.promoteLost--;req.socket.destroy();return;}
     return send(200,r);
    }
   }
   send(404,{});
  }catch{res.writeHead(500);res.end('{}');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 return {origin,state,close:()=>new Promise(r=>server.close(r))};
}
