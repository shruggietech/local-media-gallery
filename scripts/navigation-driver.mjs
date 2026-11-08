// SPDX-License-Identifier: Apache-2.0
// Source-candidate test navigation. Historical/public campaigns retain their own UI.
import assert from 'node:assert/strict';
export const activeScopeScript='document.querySelector("dialog.application-drawer[open]")||document.querySelector("dialog.media-viewer[open]")||document.querySelector("[role=dialog][data-state=open]")||document';
async function observed(app,probe,message){
 const end=Date.now()+5000;let last;
 while(Date.now()<end){last=await app.js(probe);if(last)return last;await new Promise(r=>setTimeout(r,40));}
 throw Error(message+': '+JSON.stringify(last));
}
export async function closeNavigation(app){
 if(await app.js('return Boolean(document.querySelector("dialog.application-drawer[open]"));')){
  await app.click('Close menu');
  await observed(app,'return !document.querySelector("dialog.application-drawer[open]");','Navigation dismissal');
 }
}
export async function navigateApplication(app,category,destination){
 assert.ok(await app.js('return document.querySelector(".app-header")?.dataset.navigationProtocol==="drawer-v1";'),'Expected source-candidate drawer protocol');
 if(!await app.js('return Boolean(document.querySelector("dialog.application-drawer[open]"));'))await app.click('Menu');
 for(let n=0;n<3;n++){
  const title=await app.js('return document.querySelector("dialog.application-drawer[open] h2")?.textContent;');
  if(title==='Menu')break;
  await app.click('Back');
  await observed(app,'return document.querySelector("dialog.application-drawer[open] h2")?.textContent!=='+JSON.stringify(title)+';','Parent navigation');
 }
 await observed(app,'return document.querySelector("dialog.application-drawer[open] h2")?.textContent==="Menu";','Root navigation');
 await app.click(category);
 await observed(app,'return document.querySelector("dialog.application-drawer[open] h2")?.textContent==='+JSON.stringify(category)+';','Navigation category '+category);
 if(destination){
  await app.click(destination);
  await observed(app,'return document.querySelector("dialog.application-drawer[open] h2")?.textContent==='+JSON.stringify(destination)+';','Navigation task '+destination);
 }
}
export const settingRoutes={
 'font-scale':['Settings','Appearance'],
 'page-size':['View','Layout'],'card-size':['View','Layout'],'scroll-indicator':['View','Layout'],
 'loading-mode':['Settings','Loading'],
 'media-filter':['View','Sort and filter'],'media-sort':['View','Sort and filter'],'media-direction':['View','Sort and filter'],
};
export async function showSetting(app,id){
 const route=settingRoutes[id];assert.ok(route,'Unknown source setting '+id);
 const title=await app.js('return document.querySelector("dialog.application-drawer[open] h2")?.textContent;');
 if(title!==route[1])await navigateApplication(app,...route);
 await observed(app,'const root=document.querySelector("dialog.application-drawer[open]");const field=root?.querySelector("#"+CSS.escape('+JSON.stringify(id)+'))||root?.querySelector("#navigation-"+CSS.escape('+JSON.stringify(id)+'));return Boolean(field&&!field.matches(":disabled")&&field.getClientRects().length&&root.querySelector(".save-destination select")?.getClientRects().length);','Contextual setting '+id);
}
export async function selectSetting(app,id,value){
 if(id==='save-destination'||id==='viewer-save-destination'){
  const visible=await app.js('const scope='+activeScopeScript+';return Boolean(scope.querySelector(".save-destination select")?.getClientRects().length);');
  if(!visible)await navigateApplication(app,'Settings','Appearance');
  await app.js('const scope='+activeScopeScript+';const el=scope.querySelector(".save-destination select");if(!el||el.matches(":disabled"))throw Error("Unavailable contextual destination");el.value=arguments[0];el.dispatchEvent(new Event("change",{bubbles:true}));return true;',[value]);
 }else{
  await showSetting(app,id);
  await app.js('const scope='+activeScopeScript+';const el=scope.querySelector("#"+CSS.escape(arguments[0]))||scope.querySelector("#navigation-"+CSS.escape(arguments[0]));if(!el||el.matches(":disabled"))throw Error("Unavailable setting "+arguments[0]);el.value=arguments[1];el.dispatchEvent(new Event("change",{bubbles:true}));return true;',[id,value]);
 }
}
