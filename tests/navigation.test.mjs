// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {navigation, parentRoute, routeTitle, folderName} from '../apps/gallery/src/lib/navigation.ts';
test('Navigation retains every owner-required category and destination exactly once',()=>{
 assert.deepEqual(navigation.map(n=>n.label),['Gallery','View','Prepare & share','Settings','Help']);
 assert.deepEqual(navigation.map(n=>n.items.map(i=>i.label)),[
 ['Open folder','Recent folders','Refresh','Folder details','Close folder'],
 ['Sort and filter','Layout','Information display'],
 ['Prepare gallery','Thumbnails','Preparation progress'],
 ['Appearance','Loading','Saved preferences and overrides','History'],
 ['Diagnostics','Documentation','About and licenses']]);
 const ids=navigation.flatMap(n=>[n.id,...n.items.map(i=>i.id)]);assert.equal(new Set(ids).size,ids.length);
});
test('Every task returns to its own category and every category returns to Menu',()=>{
 for(const category of navigation){assert.equal(parentRoute(category.id),'menu');for(const item of category.items)if(!item.action){assert.equal(parentRoute(item.id),category.id);assert.equal(routeTitle(item.id),item.label);}}
 assert.equal(parentRoute('menu'),null);assert.equal(routeTitle('menu'),'Menu');
});
test('Folder identity preserves Unicode and distinguishes roots without displaying a truncated full path',()=>{
 for(const [path,name]of [['C:\\Photos\\雪 family','雪 family'],['/home/me/Photos 雪/','Photos 雪'],['C:\\','C:\\'],['/','/'],['\\\\server\\share\\Album','Album']])assert.equal(folderName(path),name);
 assert.equal(folderName(null),'Local Media Gallery');assert.equal(folderName('/'+ 'long雪'.repeat(80)),'long雪'.repeat(80));
});
