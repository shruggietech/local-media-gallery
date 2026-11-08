// SPDX-License-Identifier: Apache-2.0
// Ordinary native accessibility and input only. Callers elect the candidate role.
import assert from 'node:assert/strict';
export async function navigationSmoke({press,inspect,until}){
 const names=tree=>tree.records.filter(n=>n.showing!==false&&n.offscreen!==true).map(n=>n.name);
 const observed=labels=>until(async()=>{const tree=await inspect();return labels.every(label=>names(tree).includes(label))?tree:false;},'Ordinary candidate navigation: '+labels.join(', '));
 await press('Menu');
 const root=await observed(['Gallery','View','Prepare & share','Settings','Help','Close menu']);
 await press('View');
 const category=await observed(['Sort and filter','Layout','Information display','Back']);
 await press('Layout');const task=await observed(['Layout','Items per page','Card size','Back']);
 await press('Back');await observed(['Sort and filter','Layout','Information display']);
 await press('Back');await observed(['Gallery','View','Prepare & share','Settings','Help']);
 await press('Close menu');
 const closed=await until(async()=>{const tree=await inspect();return !names(tree).includes('Close menu')&&names(tree).includes('Menu')?tree:false;},'Ordinary drawer closes to gallery');
 assert.ok(closed);
 return {protocol:'drawer-v1',input:'Native accessibility focus/activation',root:root.records,category:category.records,task:task.records,back:true,closed:true};
}
