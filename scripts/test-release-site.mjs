// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from './static-server.mjs';
import {snapshotTopics,topicRoute} from '../apps/site/src/lib/navigation.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function selectDocumentationVersion(page,version,expectedPath){
 await Promise.all([
  page.waitForEvent('framenavigated',{predicate:frame=>frame===page.mainFrame()&&new URL(frame.url()).pathname===expectedPath}),
  page.getByLabel('Documentation version',{exact:true}).first().selectOption(version),
 ]);
 await page.waitForLoadState('load');
}
export async function testReleaseSite({outputRoot,manifest,record=null}){
 process.env.PLAYWRIGHT_BROWSERS_PATH??=path.join(root,'.local/browsers');const {chromium}=await import('playwright');const server=await serve(outputRoot),browser=await chromium.launch({headless:true,channel:'chromium',executablePath:process.env.GALLERY_SITE_BROWSER});const errors=[];
 try{const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  for(const snapshot of manifest.snapshots){await page.goto(server.url+topicRoute(snapshot.version,'index'));assert.ok(await page.locator('h1').isVisible());const response=await page.request.get(server.url+'/search/'+snapshot.version+'.json');assert.ok(response.ok());const entries=await response.json();assert.ok(entries.length&&entries.every(e=>e.version===snapshot.version));const search=page.getByLabel('Search '+snapshot.version,{exact:true}).first();await search.fill('glossary');await page.getByRole('link',{name:'Glossary ('+snapshot.version+')',exact:true}).waitFor();
   const representative=(snapshot.additionalSchemas??[])[0]?.topic??(snapshot.schema?'schema':snapshot.topics[0]);for(const other of manifest.snapshots){await page.goto(server.url+topicRoute(snapshot.version,representative));const present=snapshotTopics(other).includes(representative);await selectDocumentationVersion(page,other.version,topicRoute(other.version,present?representative:'index'));if(!present)await page.getByRole('status').filter({hasText:representative}).waitFor();}
  }
  await page.goto(server.url+'/docs/latest/');assert.ok((await page.locator('body').innerText()).includes(manifest.latest));await page.goto(server.url+'/');const links=await page.locator('a[href*="/releases/download/"]').evaluateAll(nodes=>nodes.map(n=>n.href));if(record){for(const asset of record.artifacts.filter(a=>a.role==='package'))assert.ok(links.includes(asset.url),'Missing observed package '+asset.name);}else assert.deepEqual(links,[],'Candidates never supply downloads');assert.deepEqual(errors,[]);return {result:'pass',versions:manifest.snapshots.map(s=>s.version),checks:['rendered versions','version-scoped browser search','schema topic preservation','explicit missing topic','latest alias','actual download identity']};
 }finally{await browser.close();await server.close();}
}
