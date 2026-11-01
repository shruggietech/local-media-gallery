// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './run.mjs';
import {selectDocumentationVersion} from './test-release-site.mjs';

// A delayed full reload at the already-current URL reproduces the old URL-only
// wait race. The next document identity, rather than a timing guess, proves it settled.
export async function navigationCampaign(){
 const {chromium}=await import('playwright');let document=0;
 const server=createServer((req,res)=>{
  if(!['/same/','/other/'].includes(req.url)){res.writeHead(404);res.end();return;}
  const current=req.url==='/same/'?'same':'other';
  res.setHeader('content-type','text/html');res.end('<!doctype html><title>Navigation fixture</title><h1 data-document="'+(++document)+'">Document</h1><label for="version">Documentation version</label><select id="version" onchange="setTimeout(() => window.location.assign(\'/\' + this.value + \'/\'), 75)"><option '+(current==='same'?'selected':'')+'>same</option><option '+(current==='other'?'selected':'')+'>other</option></select>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chromium',executablePath:process.env.GALLERY_SITE_BROWSER});
  const page=await browser.newPage();await page.goto(origin+'/same/');
  for(const version of ['same','same','other','other','same']){
   const before=await page.locator('h1').getAttribute('data-document');
   await selectDocumentationVersion(page,version,'/'+version+'/');
   assert.notEqual(await page.locator('h1').getAttribute('data-document'),before,'Version selection returned before its new document');
   assert.equal(new URL(page.url()).pathname,'/'+version+'/');
  }
  await page.goto(origin+'/other/');assert.ok(await page.locator('h1').isVisible());
  const result={result:'pass',checks:['delayed same-URL document replacement','cross-version document replacement','immediate following navigation without overlap'],selections:5};
  await writeFile(path.join(root,'.local/release-navigation.json'),JSON.stringify(result,null,2)+'\n');return result;
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await navigationCampaign(),null,2));
