import {productVersion} from './product-version.mjs';
// SPDX-License-Identifier: Apache-2.0
// Synthetic-host browser regression. No mocks are imported by the application.
import assert from 'node:assert/strict';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import path from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import AxeBuilder from '@axe-core/playwright';
import {root,execute} from './run.mjs';
import {prepareMediaTool} from './prepare-media-tool.mjs';
import {sourceIdentity} from './provenance.mjs';
import {serve} from './static-server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root,'.local/browsers');
const {chromium}=await import('playwright');
const out=path.join(root,'.local/gallery-navigation');
await mkdir(out,{recursive:true});
const image=new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="96"><rect width="160" height="96" fill="red"/></svg>').render().asPng();
const fixtureTool=await prepareMediaTool();
const videoFile=path.join(out,'navigation-fixture.webm');
await execute(fixtureTool.binary,['-nostdin','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=160x96:rate=12:duration=4','-an','-c:v','libvpx-vp9','-threads','1','-pix_fmt','yuv420p',videoFile]);
const video=await readFile(videoFile);assert.ok(video.length>200);assert.equal(video.subarray(0,4).toString('hex'),'1a45dfa3');
const results=[],failures=[],scans=[];
const folder='C:\\Photos 雪\\'+('Family memories 雪\\'.repeat(12))+'Album';
let server,browser,context,page;
try{
server=await serve(path.join(root,'apps/gallery/out'));
browser=await chromium.launch({headless:true,channel:'chromium',executablePath:process.env.GALLERY_SITE_BROWSER});
context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
async function configureContext(context){
await context.route('**/media/**',route=>{
 const isVideo=new URL(route.request().url()).pathname.includes('/video/');
 return route.fulfill({status:200,contentType:isVideo?'video/webm':'image/png',body:isVideo?video:image});
});
await context.addInitScript(({folder,origin,productVersion})=>{
 const callbacks=new Map(),listeners=new Map();let callback=0,sequence=1,revision=1;
 const defaults={version:productVersion,formatVersion:1,fontScale:100,pageSize:48,cardSize:'medium',controlsExpanded:false,scrollIndicator:'auto',metadataExpanded:false,summaryFields:[],loadingMode:'automatic',filter:'all',sort:'name',direction:'asc'};
 const layers={user:{},remembered:{},portable:{},session:{}};
 let current={version:productVersion,sequence:'1',discovery:{id:'discovery',generation:'1',kind:'open',phase:'complete',entriesSeen:'2',mediaSeen:'2',requestedRoot:folder,requestedNativeRoot:null,sessionId:'gallery',message:null},sessionId:'gallery',root:folder,nativeRoot:null,status:'complete',revision:'1',metadataRevision:'1',mediaOrigin:origin,issues:[],items:[
  {id:'image',revision:'1',name:'red.png',relativePath:'red.png',kind:'image',mime:'image/png',size:'100',modifiedMs:'0',issue:null,stale:false},
  {id:'video',revision:'1',name:'video.webm',relativePath:'video.webm',kind:'video',mime:'video/webm',size:'200',modifiedMs:'0',issue:null,stale:false},
 ]};
 let recents=[{id:'recent',displayPath:folder,lastActivityMs:'1794096000000'}],job=null;
 const calls=[];
 const envelope=(sessionId=current.sessionId)=>{
  const settings={...defaults,...layers.user,...layers.remembered,...layers.portable,...layers.session},sources={};
  for(const key of Object.keys(defaults).filter(k=>!['version','formatVersion'].includes(k))){sources[key]='default';for(const layer of ['user','remembered','portable','session'])if(Object.hasOwn(layers[layer],key))sources[key]=layer;}
  return {settings,revision:String(revision),sessionId,warning:null,sources,savedTo:{},layers:structuredClone(layers),recents:structuredClone(recents),destinations:{}};
 };
 const emit=(event,payload)=>{for(const id of listeners.get(event)??[])callbacks.get(id)?.({event,id,payload:structuredClone(payload)});};
 window.__galleryFixture={calls,get current(){return current;},get job(){return job;},emit,
  empty(){current={...current,sequence:String(++sequence),sessionId:null,root:null,nativeRoot:null,discovery:null,status:'selection',items:[]};emit('gallery-changed',current);},
  setting(patch){Object.assign(layers.user,patch);revision++;},
 };
 window.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener(){}};
 window.__TAURI_INTERNALS__={
  metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},
  transformCallback(fn){const id=++callback;callbacks.set(id,fn);return id;},
  unregisterCallback(id){callbacks.delete(id);},
  async invoke(command,args={}){
   calls.push({command,args:structuredClone(args)});
   if(command==='plugin:event|listen'){listeners.set(args.event,[...(listeners.get(args.event)??[]),args.handler]);return args.handler;}
   if(command==='plugin:event|unlisten')return;
   if(command==='startup')return structuredClone(current);
   if(command==='load_settings')return envelope(args.sessionId);
   if(command==='save_settings'){const request=args.request;if(request.clear)layers.session={};else if(request.remove)delete layers[request.destination][request.remove];else Object.assign(layers[request.destination],request.patch);revision++;return envelope(request.sessionId);}
   if(command==='forget_history'){recents=args.id?recents.filter(r=>r.id!==args.id):[];revision++;return envelope();}
   if(command==='choose_directory')return null;
   if(command==='reopen_recent')return structuredClone(current);
   if(command==='close_gallery'){window.__galleryFixture.empty();return structuredClone(current);}
   if(command==='refresh')return structuredClone(current);
   if(command==='cache_interest')return null;
   if(['cache_cancel','report_media_observation','preparation_cancel_inspection'].includes(command))return;
   if(command==='inspect_metadata')return {...args.request,documents:[],limitations:[]};
   if(command==='diagnostics_snapshot')return {context:{product:'Local Media Gallery',version:productVersion,edition:'full',os:'test',arch:'test'},records:[],dropped:'0',serializedBytes:'0',contents:''};
   if(command==='diagnostics_export')return false;
   if(command==='application_info')return {product:'Local Media Gallery',version:productVersion,edition:'full',os:'test',arch:'test',capabilities:[]};
   if(command==='open_documentation')return;
   if(command==='application_notices')return [{title:'Application license',contents:'Apache License 2.0 (synthetic host fixture)'}];
   if(command==='guided_preview'){job={id:'guided',sessionId:'gallery',sequence:'1',phase:'ready',root:{encoding:'unix-bytes',bytes:Array.from(new TextEncoder().encode(folder))},selection:args.selection,actions:[],activeAction:null,transferredBytes:'0',thumbnail:null,presentationBytes:'10',presentationSha256:'a'.repeat(64),error:null};return structuredClone(job);}
   if(command==='guided_start'){job={...job,sequence:String(Number(job.sequence)+1),phase:'running'};return structuredClone(job);}
   if(command==='guided_status'){job={...job,sequence:String(Number(job.sequence)+1),transferredBytes:String(Number(job.transferredBytes)+1)};return structuredClone(job);}
   if(command==='guided_cancel'){job={...job,sequence:String(Number(job.sequence)+1),phase:'cancelled'};return structuredClone(job);}
   throw Error('Unexpected synthetic-host command: '+command);
  },
 };
},{folder,origin:server.url,productVersion});
}
await configureContext(context);
page=await context.newPage();
page.setDefaultTimeout(3500);
page.on('pageerror',e=>failures.push('Page: '+e.message));
const drawer=()=>page.locator('dialog.application-drawer[open]');
const route=async(category,destination)=>{
 await page.getByRole('button',{name:'Menu',exact:true}).last().click();
 await drawer().getByRole('button',{name:category,exact:true}).click();
 if(destination)await drawer().getByRole('button',{name:destination,exact:true}).click();
};
const close=()=>drawer().getByRole('button',{name:'Close menu',exact:true}).click();
const boot=async()=>{await page.setViewportSize({width:1280,height:800});await page.goto(server.url);await page.evaluate(()=>document.fonts.ready);await page.getByRole('button',{name:'Open red.png',exact:true}).waitFor();};
const step=async(name,run)=>{
 try{await boot();await run();results.push(name);}
 catch(e){
  failures.push(name+': '+e.message);
  if(name.startsWith('Viewer')){
   const observed=await page.evaluate(()=>({video:window.__navigationVideo?{src:window.__navigationVideo.currentSrc,time:window.__navigationVideo.currentTime,paused:window.__navigationVideo.paused,ready:window.__navigationVideo.readyState,network:window.__navigationVideo.networkState,error:window.__navigationVideo.error?.message,loop:window.__navigationVideo.loop}:null,text:document.querySelector('.media-viewer')?.innerText})).catch(()=>null);
   failures.push(JSON.stringify(observed));
  }
  await page.screenshot({path:path.join(out,'failure-'+results.length+'.png')}).catch(()=>{});
 }
};
const reflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&[...document.querySelectorAll('dialog[open],.bb-app-frame__scroll')].every(e=>e.scrollWidth<=e.clientWidth+1)),'Horizontal overflow');
 await step('Compact bar, all five categories, Back/Escape/focus and empty selection',async()=>{
  assert.equal(await page.locator('.app-header').getByRole('button').count(),3);
  const menu=page.locator('.app-header').getByRole('button',{name:'Menu',exact:true});await menu.click();
  assert.equal(await page.locator(':focus').getAttribute('id'),'navigation-title');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('aria-label'),'Close menu');
  for(const category of ['Gallery','View','Prepare & share','Settings','Help']){
   await drawer().getByRole('button',{name:category,exact:true}).click();
   assert.equal(await drawer().locator('h2').innerText(),category);
   await drawer().getByRole('button',{name:'Back',exact:true}).click();
   assert.equal(await page.locator(':focus').innerText(),category);
  }
  await page.keyboard.press('Escape');assert.equal(await drawer().count(),0);assert.ok(await menu.evaluate(e=>e===document.activeElement));
  await page.evaluate(()=>window.__galleryFixture.empty());await page.getByRole('button',{name:'Open folder',exact:true}).click();
  assert.equal(await page.locator('.app-header').getByRole('button',{name:'Refresh',exact:true}).isDisabled(),true);
  assert.ok(await page.getByRole('heading',{name:'Recent folders',exact:true}).isVisible());
 });
 await step('Full Unicode folder path copy, selection and denied clipboard feedback',async()=>{
  await page.locator('.app-header .folder-title').click();
  assert.equal(await drawer().getByLabel('Full folder path').innerText(),folder);
  const selected=await drawer().getByLabel('Full folder path').evaluate(e=>{const range=document.createRange();range.selectNodeContents(e);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);return selection.toString();});assert.equal(selected,folder);
  await drawer().getByRole('button',{name:'Copy path',exact:true}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),folder);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Denied');}}}));
  await drawer().getByRole('button',{name:'Copy path',exact:true}).click();
  assert.match(await drawer().innerText(),/could not be copied|unavailable/i);
 });
 await step('All four contextual scopes, retained controls expansion and separate history/provenance',async()=>{
  for(const scope of ['user','session','remembered','portable']){
   await route('Settings','Appearance');
   const field=drawer().getByLabel('Save changes to',{exact:true});assert.ok(await field.isVisible());await field.selectOption(scope);
   await drawer().getByLabel('Global font size',{exact:true}).selectOption(scope==='user'||scope==='remembered'?'90':'100');
   await page.waitForFunction(scope=>window.__galleryFixture.calls.some(c=>c.command==='save_settings'&&c.args.request.destination===scope),scope);await close();
  }
  await route('View','Layout');await drawer().getByRole('button',{name:'Show controls',exact:true}).click();await close();
  assert.ok(await page.getByRole('button',{name:'Hide controls',exact:true}).isVisible());
  assert.ok(await page.getByLabel('Media type',{exact:true}).isVisible());
  await route('Gallery','Recent folders');assert.ok(await drawer().getByRole('button',{name:folder,exact:true}).isVisible());assert.equal(await drawer().locator('[data-setting-source]').count(),0);await close();
  await route('Settings','Saved preferences and overrides');assert.ok(await drawer().locator('[data-setting-source]').count()>0);assert.equal(await drawer().getByRole('button',{name:folder,exact:true}).count(),0);
 });
 await step('Viewer drawer preserves playing media node and persistent Information scope',async()=>{
  await page.getByRole('button',{name:'Open video.webm',exact:true}).click();
  const video=page.locator('.media-viewer video');await video.waitFor();
  await video.evaluate(e=>{e.loop=true;window.__navigationVideo=e;});await page.getByRole('button',{name:'Play',exact:true}).click();
  await page.waitForFunction(()=>window.__navigationVideo.currentTime>0&&!window.__navigationVideo.paused);
  const viewer=page.locator('dialog.media-viewer[open]');
  assert.match(await viewer.locator('.information-scope').innerText(),/User defaults|Temporary session|Remember this folder|Portable gallery/);
  await route('Settings','Appearance');assert.ok(await drawer().evaluate(e=>e.matches(':modal')));
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Escape');
  assert.equal(await viewer.count(),1);assert.ok(await video.evaluate(e=>e===window.__navigationVideo&&!e.paused));
  assert.ok(await viewer.getByRole('button',{name:'Menu',exact:true}).evaluate(e=>e===document.activeElement));
  await viewer.getByRole('button',{name:'Information',exact:true}).click();
  assert.ok(await viewer.locator('.viewer-information').getByLabel('Save changes to',{exact:true}).isVisible());
  await page.waitForFunction(()=>window.__galleryFixture.calls.some(c=>c.command==='save_settings'&&c.args.request.patch?.metadataExpanded===true));
  await viewer.getByRole('button',{name:'Close viewer',exact:true}).click();await page.getByRole('button',{name:'Open video.webm',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Information',exact:true}).getAttribute('aria-expanded'),'true');
 });
 await step('Thumbnail destination draft survives routes and dismissal',async()=>{
  await route('Prepare & share','Thumbnails');await drawer().getByLabel('Cache destination',{exact:true}).selectOption('portable');await close();
  await route('Settings','Appearance');await close();await route('Prepare & share','Thumbnails');
  assert.equal(await drawer().getByLabel('Cache destination',{exact:true}).inputValue(),'portable');await close();
 });
 await step('Guided operation survives dismissal and retains explicit cancellation',async()=>{
  await route('Prepare & share','Prepare gallery');
  await drawer().getByLabel('Save current presentation in this gallery').check();
  await drawer().getByRole('button',{name:'Preview preparation',exact:true}).click();
  await drawer().getByRole('button',{name:'Apply selected preparation',exact:true}).click();
  await close();await page.waitForTimeout(700);
  const polls=await page.evaluate(()=>window.__galleryFixture.calls.filter(c=>c.command==='guided_status').length);assert.ok(polls>=2);
  await page.getByRole('button',{name:'Cancel preparation',exact:true}).click();
  await page.waitForFunction(()=>window.__galleryFixture.job.phase==='cancelled');
  await route('Prepare & share','Preparation progress');assert.match(await drawer().innerText(),/cancelled/);
 });
 await step('All task routes, narrow reflow, focus containment and axe',async()=>{
  for(const [category,destinations]of [['Gallery',['Recent folders','Folder details']],['View',['Sort and filter','Layout','Information display']],['Prepare & share',['Prepare gallery','Thumbnails','Preparation progress']],['Settings',['Appearance','Loading','Saved preferences and overrides','History']],['Help',['Diagnostics','Documentation','About and licenses']]]){
   for(const destination of destinations){await route(category,destination);assert.equal(await drawer().locator('h2').innerText(),destination);await close();}
  }
  await page.setViewportSize({width:320,height:640});
  for(const [category,destination]of [['Gallery','Folder details'],['View','Layout'],['Settings','Appearance'],['Help','About and licenses']]){
   await route(category,destination);await reflow();
   const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();scans.push({route:destination,violations:scan.violations});
   assert.deepEqual(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
   await page.screenshot({path:path.join(out,destination+'-320.png')});
   for(let n=0;n<25;n++){await page.keyboard.press('Tab');assert.ok(await drawer().evaluate(e=>e.contains(document.activeElement)));}
   await close();
  }
  await page.setViewportSize({width:1280,height:800});await page.screenshot({path:path.join(out,'gallery-1280.png')});
 });
 await step('Coarse pointer targets and 200 percent text in light and dark',async()=>{
  const desktop=page;const touch=await browser.newContext({viewport:{width:320,height:640},hasTouch:true,reducedMotion:'reduce'});
  try{
   await configureContext(touch);page=await touch.newPage();await boot();await page.setViewportSize({width:320,height:640});
   assert.ok(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches),'Actual browser coarse pointer emulation');
   for(const scheme of ['light','dark']){
    await page.emulateMedia({colorScheme:scheme});
    await page.evaluate(()=>{document.body.style.fontSize='200%';});
    await route('View','Layout');await reflow();
    const targets=await drawer().locator('button,select').evaluateAll(els=>els.filter(e=>!e.disabled&&e.getClientRects().length).map(e=>({name:e.getAttribute('aria-label')||e.textContent.trim(),height:e.getBoundingClientRect().height})));
    assert.ok(targets.length>4);assert.ok(targets.every(t=>t.height>=43.5),JSON.stringify(targets));
    const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();scans.push({route:'Layout',scheme,pointer:'coarse-emulated',textScale:'200%',violations:scan.violations});assert.deepEqual(scan.violations.map(v=>v.id),[]);
    await page.screenshot({path:path.join(out,'layout-coarse-200-'+scheme+'.png')});await close();
   }
  }finally{page=desktop;await touch.close();}
 });
}finally{
 const record={evidence:'synthetic-host Chromium navigation regression, separate from native qualification',result:failures.length?'fail':'pass',source:await sourceIdentity(),results,failures,scans};
 await writeFile(path.join(root,'.local/gallery-navigation.json'),JSON.stringify(record,null,2)+'\n');
 await context?.close();await browser?.close();await server?.close();
 console.log(JSON.stringify({result:record.result,results,failures},null,2));if(failures.length)process.exitCode=1;
}
