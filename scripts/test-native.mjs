// SPDX-License-Identifier: Apache-2.0
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
requireIsolatedDesktop();
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, readdir, writeFile, mkdir, mkdtemp, copyFile, rename, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { viewItems } from '../apps/gallery/src/lib/view.ts';
import { root, execute, environment } from './run.mjs';

if (process.platform !== 'win32') throw new Error('Native acceptance currently requires Windows.');
const started = new Date();
const fixture = JSON.parse(await readFile(path.join(root, '.local/native-fixture.json')));
const ownedSchema=JSON.parse(await readFile(path.join(root, 'schemas/v0.0.0/local-media-gallery.schema.json')));
const ownedAjv=new Ajv({strict:true}).addKeyword('x-release-version');
const validate=ownedAjv.compile(ownedSchema);
const validateMetadata=ownedAjv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/metadataResult'});
const validateSettings=ownedAjv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/settingsEnvelope'});
let settingsDirectory = await mkdtemp(path.join(root, '.local/native-settings-'));
let historyDirectory = await mkdtemp(path.join(root, '.local/native-history-'));
let settingsFile = path.join(settingsDirectory, 'settings.json');
const binary = process.env.GALLERY_TEST_BINARY ?? path.join(root, 'target/debug/local-media-gallery.exe');
const port = 44000 + Math.floor(Math.random() * 10000);
const origin = `http://127.0.0.1:${port}`;
let diagnostics = '';
function launch(args) {
  const app = spawn(binary, args, { cwd: root, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'], env: { ...environment, TAURI_WEBDRIVER_PORT: String(port), GALLERY_TEST_SETTINGS_DIR: settingsDirectory, GALLERY_TEST_HISTORY_DIR: historyDirectory, GALLERY_TEST_PAGE_SIZE: "4" } });
  app.stdout.on('data', b => { diagnostics += b; }); app.stderr.on('data', b => { diagnostics += b; });
  app.on('error', error => { diagnostics += error.message; });
  return app;
}
let child = launch([fixture.directory]);
let session;
const passed = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(probe, message, timeout = 10000) {
  const end = Date.now() + timeout; let last;
  while (Date.now() < end) { try { last = await probe(); if (last) return last; } catch (error) { last = error.message; } await pause(100); }
  throw new Error(`${message}: ${typeof last === 'string' ? last : 'condition not reached'}`);
}
async function request(route, body, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(origin + route, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok || result.value?.error) throw new Error(result.value?.message ?? `Native driver HTTP ${response.status}`);
  return result.value;
}
const js = (script, args = []) => request(`/session/${session}/execute/sync`, { script, args });
const snapshot = () => js('return await window.__TAURI_INTERNALS__.invoke("snapshot")');
async function openSettled(directory) {
  const ack = await js('return await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]})',[directory]);
  const id = ack.discovery.id;
  return until(async()=>{const s=await snapshot();return s.discovery?.id===id&&!['opening','scanning'].includes(s.discovery.phase)?s:false;},'Requested folder terminal outcome');
}
const visible = script => until(() => js(`return Boolean(${script})`), script);
const click = text => js('const scope=document.querySelector("dialog[open]")||document; const b=[...scope.querySelectorAll("button")].find(b=>b.textContent.trim()===arguments[0] || b.getAttribute("aria-label")===arguments[0]); if(!b)throw Error("Missing button "+arguments[0]); b.click(); return true;', [text]);
const open = name => js('const card=[...document.querySelectorAll(".media-card")].find(c=>c.dataset.name===arguments[0]); if(!card)throw Error("Missing card"); card.querySelector("button").click(); return true;', [name]);
const select = (id, value) => js('const el=document.getElementById(arguments[0]); el.value=arguments[1]; el.dispatchEvent(new Event("change",{bubbles:true})); return true;', [id, value]);
const input = (action, extra = []) => execute('C:/Program Files/PowerShell/7/pwsh.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(root, 'scripts/native-input.ps1'), '-AppProcessId', String(child.pid), '-Action', action, ...extra]);
async function test(name, body) { await body(); passed.push(name); console.log(`PASS ${name}`); }
async function connect() {
  await until(async () => { const r = await fetch(origin + '/status', { signal: AbortSignal.timeout(500) }); return r.ok; }, 'Native driver readiness', 20000);
  session = (await until(() => request('/session', { capabilities: { alwaysMatch: { 'wdio:tauriServiceOptions': { windowLabel: 'main' } } } }), 'Native main-window readiness', 20000)).sessionId;
}
async function stop() {
  if (session) { await request(`/session/${session}`, undefined, 'DELETE'); session = null; }
  if (child.exitCode === null) await new Promise(resolve => { child.once('exit', resolve); child.kill(); });
}
async function unchanged() {
  async function names(directory, prefix = '') {
    const result = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) result.push(...await names(path.join(directory, entry.name), name + '/'));
      else result.push(name);
    }
    return result;
  }
  assert.deepEqual((await names(fixture.directory)).sort(), fixture.records.map(r => r.name).sort(), 'Collection-local files were created or removed.');
  for (const record of fixture.records) {
    const bytes = await readFile(path.join(fixture.directory, record.name));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256, `Source changed: ${record.name}`);
  }
}
try {
  await connect();
  await visible('document.querySelectorAll(".media-card").length === 12');
  await test('native startup, versioned contract and direct-file boundaries', async () => {
    const value = await snapshot(); assert.ok(validate(value), JSON.stringify(validate.errors)); assert.equal(value.items.length, 12);
    assert.deepEqual(value.items.map(i => i.name).sort(), fixture.names.toSorted());
    assert.equal(await js('return document.querySelector("h1").textContent'), 'Local Media Gallery');
    await js('await document.fonts.ready; return true;');
    assert.ok(await js('return Array.from(document.fonts).filter(f=>f.status==="loaded").length>=3'));
  });
  await test('incremental discovery, visible cancellation and queued retirement', async () => {
    const directory = await mkdtemp(path.join(root, '.local/discovery-雪-'));
    for (const name of ['one.jpg','two.jpg','three.jpg']) await copyFile(path.join(fixture.directory,'image2.jpg'),path.join(directory,name));
    const portable = JSON.stringify({product:'local-media-gallery',kind:'gallery-settings',version:'0.0.0',formatVersion:1,choices:{fontScale:90},unknown:{keep:[false,0,null]}})+'\n';
    await writeFile(path.join(directory,'settings.json'),portable);
    const control = (action, config) => js('return await window.__TAURI_INTERNALS__.invoke("test_discovery_control",{action:arguments[0],config:arguments[1]})',[action,config??null]);
    await control('arm',{pauseAfter:2});
    await js('return await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]})',[directory]);
    await until(()=>control('status'),'Discovery barrier');
    let value=await snapshot(); assert.equal(value.status,'scanning'); assert.ok(value.items.length>=1&&value.items.length<3); assert.ok(BigInt(value.discovery.entriesSeen)>=1n&&BigInt(value.discovery.entriesSeen)<=2n);
    await visible('document.querySelector(".discovery-status")?.textContent.includes("Scanning directory")');
    assert.equal(await js('return document.querySelector("#collection-controls")===null'),true,'Progress is visible with controls collapsed');
    assert.equal(await js('return document.querySelector(".discovery-status").textContent.includes("%")'),false);
    assert.equal(await js('return [...document.querySelectorAll("button")].find(b=>b.getAttribute("aria-label")==="Close folder").disabled'),false);
    await js('const b=[...document.querySelectorAll(".discovery-status button")].find(b=>b.textContent==="Cancel discovery"); b.focus(); return true;');
    await input('keys',['-Keys','{ENTER}']);
    await until(async()=> (await snapshot()).status==='cancelled','Keyboard cancellation');
    value=await snapshot(); const cancelledSequence=value.sequence; const observed=value.items.length;
    await control('release'); await pause(100); assert.equal((await snapshot()).sequence,cancelledSequence); assert.equal((await snapshot()).items.length,observed);
    await click('Retry discovery'); await until(async()=> (await snapshot()).status==='complete','Explicit retry');
    assert.equal((await snapshot()).items.length,3);
    await control('arm',{pauseAfter:1}); await click('Refresh'); await until(()=>control('status'),'Paused Refresh');
    const id=(await snapshot()).sessionId;
    await js('return await window.__TAURI_INTERNALS__.invoke("refresh",{sessionId:arguments[0]})',[id]);
    await visible('document.querySelector(".discovery-status")?.textContent.includes("Scanning directory")');
    await click('Cancel discovery'); const queued=await snapshot(); assert.equal(queued.status,'cancelled');
    await control('release'); await pause(100); assert.equal((await snapshot()).sequence,queued.sequence);
    await js('return await window.__TAURI_INTERNALS__.invoke("refresh",{sessionId:arguments[0]})',[id]);
    await until(async()=> (await snapshot()).status==='complete','Refresh after queued cancellation');
    await control('arm',{failAfter:1}); await rm(path.join(directory,'three.jpg'));
    await click('Refresh'); await until(async()=> (await snapshot()).status==='partial','Partial iterator result');
    value=await snapshot(); assert.equal(value.items.length,3); assert.ok(value.items.some(i=>i.stale));
    await click('Retry discovery'); await until(async()=> (await snapshot()).status==='complete','Complete retry after partial'); assert.equal((await snapshot()).items.length,2);
    await control('arm',{unavailable:true}); await click('Refresh'); await until(async()=> (await snapshot()).status==='unavailable','Unavailable result');
    value=await snapshot(); assert.equal(value.items.length,2); assert.ok(value.items.every(i=>i.stale));
    assert.equal(await readFile(path.join(directory,'settings.json'),'utf8'),portable);
    await click('Show controls'); await select('media-filter','video'); await visible('document.querySelectorAll(".media-card").length===0');
    await select('media-filter','all'); await visible('document.querySelectorAll(".media-card img").length>0');
    const inaccessible=(await snapshot()); const staleItem=inaccessible.items[0];
    assert.equal((await fetch(inaccessible.mediaOrigin+'/media/'+inaccessible.sessionId+'/'+staleItem.id+'/'+staleItem.revision+'?s009-root-failure')).status,404);
    await js('for(const image of document.querySelectorAll(".media-card img")) image.src=image.src+"?s009-root-failure"; return true;');
    await visible('[...document.querySelectorAll(".media-placeholder")].some(e=>e.textContent.includes("Media unavailable"))');
    await click('Retry discovery'); await until(async()=> (await snapshot()).status==='complete','Explicit unavailable recovery');
    await visible('document.querySelectorAll(".media-card img").length===2 && [...document.querySelectorAll(".media-card img")].every(i=>i.naturalWidth>0)');
    await click('Hide controls');
    assert.equal(await js('return document.documentElement.style.getPropertyValue("--gallery-font-scale")'),'0.9');
    await control('arm',{internalFailure:true}); await click('Refresh'); await until(async()=> (await snapshot()).status==='failed','Internal failure result');
    await click('Retry discovery'); await until(async()=> (await snapshot()).status==='complete','Failed-operation recovery');
    for(const name of ['one.jpg','two.jpg']) assert.deepEqual(await readFile(path.join(directory,name)),await readFile(path.join(fixture.directory,'image2.jpg')));
    await control('arm',{pauseAfter:1}); await click('Refresh'); await until(()=>control('status'),'Paused close');
    await click('Close folder'); const closed=await snapshot(); assert.equal(closed.sessionId,null); assert.equal(closed.status,'selection');
    await control('release'); await pause(100); assert.equal((await snapshot()).sequence,closed.sequence);
    await js('return await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]})',[fixture.directory]);
    await until(async()=> (await snapshot()).status==='complete','Restore fixture root'); await visible('document.querySelectorAll(".media-card").length===12');
  });
  await test('blocked portable initialization leaves discovery, Cancel, Close and replacement responsive', async () => {
    const directory=await mkdtemp(path.join(root,'.local/discovery-profile-'));
    for(const name of ['one.jpg','two.jpg','three.jpg']) await copyFile(path.join(fixture.directory,'image2.jpg'),path.join(directory,name));
    const portable=JSON.stringify({product:'local-media-gallery',kind:'gallery-settings',version:'0.0.0',formatVersion:1,choices:{fontScale:80}})+'\n';
    await writeFile(path.join(directory,'settings.json'),portable);
    const control=(action,config)=>js('return await window.__TAURI_INTERNALS__.invoke("test_discovery_control",{action:arguments[0],config:arguments[1]})',[action,config??null]);
    await control('profile_arm'); await control('arm',{pauseAfter:3});
    try {
      await js('return await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]})',[directory]);
      await until(()=>control('profile_status'),'Portable initialization read barrier');
      await until(()=>control('status'),'Discovery advances independently of profile read');
      await visible('document.querySelectorAll(".media-card").length>0');
      assert.equal((await snapshot()).status,'scanning');
      await click('Cancel discovery'); await until(async()=>(await snapshot()).status==='cancelled','Cancel during blocked profile read',2000);
      await click('Close folder'); await until(async()=>(await snapshot()).sessionId===null,'Close during blocked profile read',2000);
      await control('release');
      await openSettled(fixture.directory);
      await visible('document.querySelectorAll(".media-card").length===12');
      assert.equal(await control('profile_status'),true,'Retired profile read is still held while replacement publishes');
    } finally { await control('release'); await control('profile_release'); }
    await visible('[...document.querySelectorAll("button")].some(b=>b.textContent==="Show controls"&&!b.disabled)');
    assert.equal(await js('return document.documentElement.style.getPropertyValue("--gallery-font-scale")'),'1','Retired portable font scale never applies');
    assert.equal(await readFile(path.join(directory,'settings.json'),'utf8'),portable);
  });
  await test('focused playback survives discovery cancellation and replacement rejects old publication', async () => {
    const control = (action,config) => js('return await window.__TAURI_INTERNALS__.invoke("test_discovery_control",{action:arguments[0],config:arguments[1]})',[action,config??null]);
    await open('clip silent.mp4'); await visible('document.querySelector("dialog")?.open');
    await js('const v=document.querySelector("dialog video"); window.__s009Focused=v; await new Promise(resolve=>{if(v.readyState>=1)resolve();else v.addEventListener("loadedmetadata",resolve,{once:true})}); v.currentTime=0.5; return true;');
    await control('arm',{pauseAfter:2}); await click('Refresh'); await until(()=>control('status'),'Focused discovery barrier');
    assert.equal(await js('return document.querySelector("dialog video")===window.__s009Focused'),true);
    await click('Cancel discovery'); await until(async()=> (await snapshot()).status==='cancelled','Viewer cancellation');
    assert.equal(await js('return document.querySelector("dialog video")===window.__s009Focused && Math.abs(window.__s009Focused.currentTime-0.5)<0.15'),true);
    await control('release'); await click('Close viewer');
    const old=await snapshot(); const other=await mkdtemp(path.join(root,'.local/discovery-replacement-'));
    await copyFile(path.join(fixture.directory,'image2.jpg'),path.join(other,'replacement.jpg'));
    await control('arm',{pauseAfter:2}); await click('Refresh'); await until(()=>control('status'),'Replacement barrier');
    await js('return await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]})',[other]);
    const pending=await snapshot(); assert.equal(pending.discovery.phase,'opening'); assert.equal(pending.sessionId,old.sessionId);
    await control('release'); await until(async()=> {const s=await snapshot();return s.status==='complete'&&s.items[0]?.name==='replacement.jpg';},'Newest queued folder');
    const replacement=await snapshot(); assert.notEqual(replacement.sessionId,old.sessionId);
    await pause(100); assert.equal((await snapshot()).sequence,replacement.sequence);
    await js('return await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]})',[fixture.directory]);
    await until(async()=> (await snapshot()).status==='complete','Restore fixture after replacement'); await visible('document.querySelectorAll(".media-card").length===12');
  });
  await test('rendered page anchor survives incremental predecessors and chooses a removal neighbor', async () => {
    const directory=await mkdtemp(path.join(root,'.local/discovery-anchor-'));
    for(let i=10;i<18;i++) await copyFile(path.join(fixture.directory,'image2.jpg'),path.join(directory,'image'+i+'.jpg'));
    await openSettled(directory); await visible('document.querySelectorAll(".media-card").length===8');
    await click('Show controls'); await click('Settings'); await select('page-size','4');
    await visible('document.querySelectorAll(".media-card").length===4'); await click('Next page');
    await visible('document.getElementById("page-jump").value==="2"');
    const anchor=await js('return document.querySelector(".media-card").dataset.name'); assert.equal(anchor,'image14.jpg');
    for(let i=0;i<4;i++) await copyFile(path.join(fixture.directory,'image2.jpg'),path.join(directory,'image'+i+'.jpg'));
    await js('return await window.__TAURI_INTERNALS__.invoke("test_discovery_control",{action:"arm",config:{pauseAfter:2}})');
    await click('Refresh'); await until(()=>js('return await window.__TAURI_INTERNALS__.invoke("test_discovery_control",{action:"status",config:null})'),'Anchored incremental barrier');
    await visible('[...document.querySelectorAll(".media-card")].some(c=>c.dataset.name==="image14.jpg")');
    await js('return await window.__TAURI_INTERNALS__.invoke("test_discovery_control",{action:"release",config:null})');
    await until(async()=> (await snapshot()).status==='complete','Anchored completion');
    await visible('document.getElementById("page-jump").value==="3" && [...document.querySelectorAll(".media-card")].some(c=>c.dataset.name==="image14.jpg")');
    await rm(path.join(directory,anchor)); await click('Refresh'); await until(async()=> (await snapshot()).status==='complete','Removed anchor completion');
    await visible('document.getElementById("page-jump").value==="2" && [...document.querySelectorAll(".media-card")].some(c=>c.dataset.name==="image13.jpg")');
    assert.equal(await js('return document.body.textContent.includes("previous location changed")'),true);
    await select('page-size','48'); await click('Hide controls'); await openSettled(fixture.directory); await visible('document.querySelectorAll(".media-card").length===12');
  });
  await test('state save destination is visible before opening controls', async () => {
    assert.equal(await js('return Boolean(document.querySelector("[data-save-destination]"))'), true, 'A reader must see where explicit choices will be saved even with controls collapsed');
  });
  await test('focused information starts collapsed and gallery media is suspended', async () => {
    await open('image2.jpg'); await visible('document.querySelector("dialog")?.open');
    assert.equal(await js('return [...document.querySelectorAll("dialog button")].find(b=>b.textContent.trim()==="Information").getAttribute("aria-expanded")'),'false');
    assert.equal(await js('return document.querySelector(".item-facts") === null'), true, 'Metadata must be collapsed initially');
    assert.equal(await js('return document.querySelectorAll(".media-card img, .media-card video, .metadata-probe").length'), 0);
    assert.equal(await js('return [...document.querySelectorAll("dialog button")].every(b=>{const h=b.getBoundingClientRect().height;return h>=30&&h<=35})'),true,'Compact viewer buttons');
    await click('Close viewer');
  });
  await test('native folder picker cancellation preserves session', async () => {
    const before = await snapshot();
    await js('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.trim()==="Choose folder").focus(); return true;');
    await input('keys', ['-Keys', '{ENTER}']); await input('cancel-picker');
    await visible('!Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Choose folder")).disabled');
    assert.equal((await snapshot()).sessionId, before.sessionId);
  });
  await click('Show controls');
  await test('sorting, filters and scoped empty state', async () => {
    const fieldHeights=await js('return [...document.querySelectorAll(".collection-controls select")].map(el=>el.getBoundingClientRect().height)');
    assert.equal(fieldHeights.length,3);assert.ok(fieldHeights.every(h=>h>=30&&h<=35),JSON.stringify(fieldHeights));
    const names = await js('return Array.from(document.querySelectorAll(".media-card")).map(c=>c.dataset.name)');
    assert.ok(names.indexOf('image2.jpg') < names.indexOf('image10.jpg'));
    await select('media-filter', 'video'); await visible('document.querySelectorAll(".media-card").length===2');
    await select('media-filter', 'image'); await visible('document.querySelectorAll(".media-card").length===10');
    await select('media-filter', 'all');
    const value = await snapshot();
    for (const sort of ['name', 'modified', 'size']) for (const direction of ['asc', 'desc']) {
      await select('media-sort', sort); await select('media-direction', direction);
      const actual = await js('return Array.from(document.querySelectorAll(".media-card")).map(c=>c.dataset.name)');
      if (sort === 'name') assert.deepEqual(actual, direction === 'asc' ? names : names.toReversed());
      else {
        const field = sort === 'size' ? 'size' : 'modifiedMs';
        const numbers = actual.map(name => BigInt(value.items.find(i => i.name === name)[field]));
        for (let i = 1; i < numbers.length; i++) {
          assert.ok(direction === 'asc' ? numbers[i - 1] <= numbers[i] : numbers[i - 1] >= numbers[i]);
          if (numbers[i - 1] === numbers[i]) assert.ok(names.indexOf(actual[i - 1]) < names.indexOf(actual[i]));
        }
      }
    }
    await select('media-sort', 'name'); await select('media-direction', 'asc');
  });
  await test('native image decoding, EXIF orientation and per-item information', async () => {
    let firstInformation=true;
    for (const [name, dimensions] of Object.entries(fixture.expected.stills)) {
      await open(name); await visible('document.querySelector("dialog img")?.naturalWidth>0');
      assert.deepEqual(await js('const i=document.querySelector("dialog img"); return [i.naturalWidth,i.naturalHeight]'), dimensions);
      if(firstInformation){await click('Information');firstInformation=false;assert.equal(await js('return [...document.querySelectorAll("dialog button")].find(b=>b.textContent.trim()==="Information").getAttribute("aria-expanded")'),'true');}
      else assert.equal(await js('return Boolean(document.querySelector(".item-facts"))'),true,'Disclosure stays open across assets');
      assert.ok((await js('return document.querySelector(".item-facts").textContent')).includes(dimensions.join(' × ')));
      await click('Close viewer');
      const ratio = await js('const c=Array.from(document.querySelectorAll(".media-card")).find(c=>c.dataset.name===arguments[0]).querySelector(".media-surface").getBoundingClientRect(); return c.width/c.height;', [name]);
      assert.ok(Math.abs(ratio - dimensions[0] / dimensions[1]) < 0.06, `Card ratio ${name}: ${ratio}`);
    }
    for (const name of ['broken.jpg', 'unsupported.tiff']) {
      await open(name); await visible('document.querySelector("dialog .media-error")'); await click('Close viewer');
    }
  });
  for (const name of ['clip audio.mp4', 'clip silent.mp4']) await test(`trusted native playback, pause and seek: ${name}`, async () => {
    await open(name); await visible('document.querySelector("dialog video")?.readyState>=1');
    await js('const b=Array.from(document.querySelectorAll("dialog button")).find(b=>b.textContent.trim()==="Play"); b.focus(); return true;');
    await input('keys', ['-Keys', ' ']);
    await visible('document.querySelector("dialog video")?.currentTime>0.15 && !document.querySelector("dialog video").paused');
    assert.equal(await js('return document.querySelector("dialog video").muted'), false);
    await js('const c=document.createElement("canvas"); c.width=32; c.height=18; c.getContext("2d").drawImage(document.querySelector("dialog video"),0,0,32,18); window.__nativeFrame=c.toDataURL(); return true;');
    await js('window.__focusedNode=document.querySelector("dialog video");window.__focusedTime=window.__focusedNode.currentTime;return true;');
    const beforeWidth=await js('return document.querySelector(".viewer-media").getBoundingClientRect().width');
    const wasOpen=await js('return Boolean(document.querySelector(".item-facts"))');
    await click('Information'); await pause(180);
    assert.equal(await js('return document.querySelector("dialog video")===window.__focusedNode && !window.__focusedNode.paused && window.__focusedNode.currentTime>window.__focusedTime'),true);
    const afterWidth=await js('return document.querySelector(".viewer-media").getBoundingClientRect().width');
    assert.ok(wasOpen?afterWidth>beforeWidth:afterWidth<beforeWidth,'Information must resize canvas');
    assert.equal(await js('return document.querySelectorAll(".media-card img,.media-card video,.metadata-probe").length'),0);
    await click('Pause'); assert.equal(await js('return document.querySelector("dialog video").paused'), true);
    await js('document.querySelector("dialog video").currentTime=2; return true;');
    await visible('Math.abs(document.querySelector("dialog video").currentTime-2)<0.2 && !document.querySelector("dialog video").seeking');
    await until(() => js('const c=document.createElement("canvas"); c.width=32; c.height=18; c.getContext("2d").drawImage(document.querySelector("dialog video"),0,0,32,18); return c.toDataURL()!==window.__nativeFrame;'), 'Seek displays a different decoded frame');
    await click('Close viewer'); await visible('!document.querySelector("dialog")');
    assert.equal(await js('return Array.from(document.querySelectorAll("video")).filter(v=>!v.paused).length'), 0);
  });
  await test('native keyboard activation, Escape and focus return', async () => {
    await input('focus');
    await visible('document.hasFocus()');
    await js('document.getElementById("media-filter").focus(); return true;');
    await input('keys', ['-Keys', '{HOME}{DOWN}{ENTER}']); await visible('document.querySelectorAll(".media-card").length===10');
    await input('keys', ['-Keys', '{HOME}{ENTER}']); await visible('document.querySelectorAll(".media-card").length===12');
    await js('document.querySelector(".media-open").focus(); return true;');
    await input('keys', ['-Keys', '{ENTER}']); await visible('document.querySelector("dialog")?.open');
    await input('keys', ['-Keys', '{ESC}']);
    await visible('!document.querySelector("dialog") && document.activeElement?.classList.contains("media-open")');
    await js('window.__keyboardFocusBeforeTab=document.activeElement; return true;');
    await input('keys', ['-Keys', '{TAB}']);
    await visible('document.activeElement!==window.__keyboardFocusBeforeTab && document.activeElement?.classList.contains("media-open") && getComputedStyle(document.activeElement).outlineStyle!=="none"');
  });
  await test('root replacement stops active playback and revokes old access', async () => {
    await open('clip audio.mp4'); await visible('document.querySelector("dialog video")?.readyState>=1');
    await js('window.__retiredMedia=document.querySelector("dialog video"); Array.from(document.querySelectorAll("dialog button")).find(b=>b.textContent.trim()==="Play").focus(); return true;');
    await input('keys', ['-Keys', ' ']); await visible('!window.__retiredMedia.paused');
    const before = await snapshot(); const item = before.items.find(i => i.kind === 'video');
    const empty = await mkdtemp(path.join(root, '.local/switch-'));
    await openSettled(empty);
    await visible('!document.querySelector("dialog") && document.body.textContent.includes("No media found")');
    assert.equal(await js('return window.__retiredMedia.paused && window.__retiredMedia.getAttribute("src")===null'), true);
    assert.equal((await fetch(`${before.mediaOrigin}/media/${before.sessionId}/${item.id}/${item.revision}`)).status, 404);
    await openSettled(fixture.directory); await visible('document.querySelectorAll(".media-card").length===12');
  });
  await test('session-scoped native ranges and cross-origin denial', async () => {
    const value = await snapshot(); const item = value.items.find(i => i.name === 'clip audio.mp4');
    const url = `${value.mediaOrigin}/media/${value.sessionId}/${item.id}/${item.revision}`;
    const response = await fetch(url, { headers: { range: 'bytes=1-3' } }); assert.equal(response.status, 206); assert.equal((await response.arrayBuffer()).byteLength, 3);
    assert.equal((await fetch(url, { method: 'HEAD' })).headers.get('content-length'), item.size);
    assert.equal((await fetch(url, { headers: { origin: 'https://outside.invalid' } })).status, 403);
    assert.equal((await fetch(url, { headers: { range: 'bytes=999999999-' } })).status, 416);
  });
  await test('manual create, replacement, removal and stale viewer cleanup', async () => {
    const added = path.join(fixture.directory, 'temporary.jpg');
    const baseline = await snapshot(); await pause(300);
    await js('window.__idleCommands=[];window.__originalInvoke=window.__TAURI_INTERNALS__.invoke;window.__TAURI_INTERNALS__.invoke=(cmd,...args)=>{window.__idleCommands.push(cmd);return window.__originalInvoke(cmd,...args)};return true;');
    try {
      await copyFile(path.join(fixture.directory, 'image2.jpg'), added);
      await pause(1600);
      assert.deepEqual(await js('return window.__idleCommands'),[],'Idle product must issue no native polling commands');
      await js('window.__TAURI_INTERNALS__.invoke=window.__originalInvoke;return true;');
      assert.equal((await snapshot()).revision, baseline.revision, 'Idle changes must not discover files');
      assert.equal(await js('return document.querySelectorAll(".media-card").length'),12);
      await click('Refresh'); await visible('document.querySelectorAll(".media-card").length===13');
      const before = await snapshot(); const old = before.items.find(i => i.name === 'temporary.jpg'); await open('temporary.jpg');
      await copyFile(path.join(fixture.directory, 'A equal.jpg'), added); await pause(1200);
      assert.equal((await snapshot()).items.find(i=>i.name==='temporary.jpg').revision,old.revision);
      await click('Refresh');
      await until(async () => (await snapshot()).items.find(i => i.name === 'temporary.jpg')?.revision !== old.revision, 'Manual replacement revision');
      assert.equal(await js('return Boolean(document.querySelector("dialog"))'),true,'Existing selected item remains open');
      await rm(added); await pause(1200); assert.equal((await snapshot()).items.length,13);
      await click('Refresh'); await visible('document.querySelectorAll(".media-card").length===12 && !document.querySelector("dialog")');
      const stale = await fetch(before.mediaOrigin+'/media/'+before.sessionId+'/'+old.id+'/'+old.revision); assert.equal(stale.status,404);
      assert.equal((await snapshot()).items.length,12);
    } finally { await rm(added,{force:true}); }
  });
  await test('native chooser selects empty directory and invalid selection preserves it', async () => {
    const empty = await mkdtemp(path.join(root, '.local/empty-'));
    await click('Choose folder'); await input('select-picker', ['-Directory', empty]);
    await visible('document.querySelectorAll(".media-card").length===0 && document.body.textContent.includes("No media found")');
    const before = await snapshot();
    assert.equal(path.relative(path.toNamespacedPath(empty), before.root), '', 'Picker selected the exact requested directory');
    assert.equal((await openSettled(empty + '/absent')).discovery.phase,'unavailable');
    assert.equal((await snapshot()).sessionId, before.sessionId);
    await click('Refresh'); await until(async()=> (await snapshot()).status==='complete','Retained folder explicit retry');
    await select('media-filter', 'video'); await visible('document.body.textContent.includes("No media found")');
    await copyFile(path.join(fixture.directory, 'image2.jpg'), path.join(empty, 'only-image.jpg'));
    await pause(1200); assert.equal((await snapshot()).items.length,0);
    await click('Refresh'); await visible('document.body.textContent.includes("No media match this filter")');
    await openSettled(fixture.directory);
    await visible('document.querySelectorAll(".media-card").length===2'); await select('media-filter', 'all');
  });
  await test('relocated directory reopens without a manifest and retires old grants', async () => {
    const before = await snapshot(); const item = before.items[0]; const moved = fixture.directory + '-moved';
    await click('Close folder'); await visible('document.body.textContent.includes("No directory selected")');
    await rename(fixture.directory, moved);
    try {
      await openSettled(moved); await visible('document.querySelectorAll(".media-card").length===12');
      assert.equal((await fetch(`${before.mediaOrigin}/media/${before.sessionId}/${item.id}/${item.revision}`)).status, 404);
    } finally { await click('Close folder'); await visible('document.body.textContent.includes("No directory selected")'); await rename(moved, fixture.directory); }
    await openSettled(fixture.directory);
    await visible('document.querySelectorAll(".media-card").length===12');
  });
  await test('bounded pagination, full sorting, cross-page viewer and geometry', async () => {
    await click('Settings'); await select('page-size','4');
    await visible('document.querySelectorAll(".media-card").length===4');
    await select('media-sort','size'); await select('media-direction','desc');
    const all=viewItems((await snapshot()).items,'all','size','desc');
    const pageNames=()=>js('return [...document.querySelectorAll(".media-card")].map(c=>c.dataset.name)');
    const first=await pageNames();
    assert.deepEqual(first,all.slice(0,4).map(i=>i.name));
    const admission=await js('const g=document.querySelector(".media-grid");return {active:Number(g.dataset.activeLoads),peak:Number(g.dataset.peakLoads)}');
    assert.ok(admission.active<=4 && admission.peak<=4 && admission.peak>0,JSON.stringify(admission));
    await click('Next page'); await visible('document.querySelectorAll(".media-card")[0]?.dataset.name!=='+JSON.stringify(first[0]));
    const second=await pageNames();
    assert.deepEqual(second,all.slice(4,8).map(i=>i.name));
    await select('media-sort','name'); await select('media-direction','asc');
    const cards=await pageNames(); await open(cards[3]); await click('Next');
    assert.equal(await js('return document.querySelectorAll(".media-card img,.media-card video,.metadata-probe").length'),0);
    const focusedName=await js('return document.querySelector("dialog h2").textContent');
    assert.ok(!cards.includes(focusedName),'Viewer Next must cross page boundary');
    await click('Close viewer'); await visible('!document.querySelector("dialog")');
    await until(()=>js('return document.activeElement?.closest(".media-card")?.dataset.name===arguments[0]',[focusedName]),'Focused card restored across page');
    assert.equal((await pageNames()).length,4);
    await js('document.getElementById("page-jump").focus();return true;');
    await input('keys',['-Keys','^a3{ENTER}']);
    await until(()=>js('return document.getElementById("page-jump").value==="3"'),'Keyboard page jump');
    const nameOrder=viewItems((await snapshot()).items,'all','name','asc');
    assert.deepEqual(await pageNames(),nameOrder.slice(8,12).map(i=>i.name));
    await select('page-size','48'); await select('media-sort','name'); await select('media-direction','asc');
    await visible('document.querySelectorAll(".media-card").length===12');
    await click('Hide controls');
    // Compact desktop density has a fixed reference size; smaller windows may wrap.
    await js('return await window.__TAURI_INTERNALS__.invoke("test_native_qualification",{action:"presentation",width:1280,height:900,zoom:1})');
    await visible('window.innerWidth>=1200 && window.innerHeight>=800');
    await js('return await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))');
    const geometry=await js('const bar=document.querySelector(".app-header").getBoundingClientRect();const grid=document.querySelector(".media-grid");const cards=[...grid.querySelectorAll(".media-card")].map(c=>{const r=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}});return {barHeight:bar.height,buttonHeights:[...document.querySelectorAll(".app-header button,.collection-navigation button")].map(b=>b.getBoundingClientRect().height),gap:getComputedStyle(grid).gap,cards,scrollbar:getComputedStyle(document.querySelector(".bb-app-frame__scroll")).scrollbarWidth}');
    assert.ok(geometry.barHeight>=44 && geometry.barHeight<=49,JSON.stringify(geometry));
    assert.ok(geometry.buttonHeights.every(h=>h>=30 && h<=35),JSON.stringify(geometry.buttonHeights));
    assert.equal(geometry.scrollbar,'none');
    const columns=new Map();
    for(const card of geometry.cards){const key=Math.round(card.x);const col=columns.get(key)||[];col.push(card);columns.set(key,col);}
    for(const col of columns.values()){col.sort((a,b)=>a.y-b.y);for(let i=1;i<col.length;i++) assert.ok(Math.abs(col[i].y-(col[i-1].y+col[i-1].h)-12)<2,'Vertical gap12');}
    const xs=[...columns.keys()].sort((a,b)=>a-b);if(xs.length>1)assert.ok(Math.abs(xs[1]-xs[0]-columns.get(xs[0])[0].w-12)<2,'Horizontal gap12');
    assert.ok(new Set(geometry.cards.map(c=>Math.round(c.y))).size>Math.ceil(geometry.cards.length/Math.max(1,xs.length)),'Masonry has staggered positions');
    const beforeScroll=await js('const s=document.querySelector(".bb-app-frame__scroll");s.scrollTop=0;s.tabIndex=-1;s.focus();return s.scrollTop;');
    await input('keys',['-Keys','{PGDN}']);
    assert.ok(await js('return document.querySelector(".bb-app-frame__scroll").scrollTop>arguments[0]',[beforeScroll]),'Trusted PageDown scrolls gallery');
    await visible('document.querySelector(".scroll-indicator")?.dataset.visible==="true"');
    await pause(1200);assert.equal(await js('return document.querySelector(".scroll-indicator")?.dataset.visible'), 'false');
    await click('Show controls');
  });
  await test('global font size scales app text, preserves geometry and restores preferences',async()=>{
    if(await js('return !document.getElementById("font-scale")')) await click('Settings');
    await visible('document.getElementById("font-scale")');
    assert.equal(await js('return document.getElementById("font-scale").value'),'100','Current size is default');
    const measureText=()=>js('const selectors=["body",".identity h1",".app-header button","label[for=media-filter]","#media-filter",".settings-panel h2",".media-caption>span:first-child",".collection-count"];return selectors.map(s=>({selector:s,font:parseFloat(getComputedStyle(document.querySelector(s)).fontSize)}));');
    const measureGeometry=()=>js('const c=document.querySelector(".media-card");const b=document.querySelector(".app-header button");return {root:parseFloat(getComputedStyle(document.documentElement).fontSize),card:c.getBoundingClientRect().width,media:c.querySelector(".media-surface").getBoundingClientRect().width,target:parseFloat(getComputedStyle(b).minHeight),bar:document.querySelector(".app-header").getBoundingClientRect().height};');
    const normal=await measureText();const geometry=await measureGeometry();
    let viewerFonts;let viewerGeometry;
    for(const scale of [100,90,80]){
      await select('font-scale',String(scale));await pause(150);
      const actual=await measureText();for(let i=0;i<actual.length;i++)assert.ok(Math.abs(actual[i].font-normal[i].font*scale/100)<0.06,JSON.stringify({scale,actual:actual[i],baseline:normal[i]}));
      const current=await measureGeometry();for(const key of Object.keys(geometry))assert.ok(Math.abs(current[key]-geometry[key])<0.1,'Text sizing changed '+key);
      await open('image2.jpg');await visible('document.querySelector("dialog img")?.naturalWidth>0');
      if(await js('return !document.querySelector(".item-facts")'))await click('Information');
      const focused=await js('const d=document.querySelector("dialog").getBoundingClientRect();const m=document.querySelector(".viewer-media").getBoundingClientRect();return {fonts:["#viewer-title","#information-title",".item-facts dt",".item-facts dd","dialog button"].map(s=>parseFloat(getComputedStyle(document.querySelector(s)).fontSize)),geometry:{w:d.width,h:d.height,mw:m.width}}');
      if(scale===100){viewerFonts=focused.fonts;viewerGeometry=focused.geometry;}
      else{for(let i=0;i<focused.fonts.length;i++)assert.ok(Math.abs(focused.fonts[i]-viewerFonts[i]*scale/100)<0.06,'Viewer text scales');for(const key of Object.keys(viewerGeometry))assert.ok(Math.abs(focused.geometry[key]-viewerGeometry[key])<0.1,'Viewer media frame changed');}
      await click('Close viewer');
      await until(async()=>JSON.parse(await readFile(settingsFile)).fontScale===scale,'Font preference saved');
    }
    await stop();child=launch([fixture.directory]);await connect();await visible('document.querySelectorAll(".media-card").length===12');
    await until(()=>js('return Math.abs(parseFloat(getComputedStyle(document.body).fontSize)-arguments[0])<0.06',[normal[0].font*0.8]),'Reduced size restored after restart');
    await click('Settings');assert.equal(await js('return document.getElementById("font-scale").value'),'80');
    await js('document.getElementById("font-scale").focus();return true;');await input('keys',['-Keys','{HOME}{ENTER}']);
    await until(()=>js('return document.getElementById("font-scale").value==="100"'),'Keyboard default reset');
    await until(async()=>JSON.parse(await readFile(settingsFile)).fontScale===100,'Default font save');
    assert.ok(Math.abs(await js('return parseFloat(getComputedStyle(document.body).fontSize)')-normal[0].font)<0.06,'Default restored original text size');
    await stop();child=launch([fixture.directory]);await connect();await visible('document.querySelectorAll(".media-card").length===12');
    await until(()=>js('return Math.abs(parseFloat(getComputedStyle(document.body).fontSize)-arguments[0])<0.06',[normal[0].font]),'Default restored after restart');
  });
  await test('information persists immediately and survives restart',async()=>{
    await open('image2.jpg');
    if(await js('return !document.querySelector(".item-facts")')) await click('Information');
    await until(async()=>JSON.parse(await readFile(settingsFile)).metadataExpanded===true,'Immediate information save');
    await stop(); child=launch([fixture.directory]); await connect();
    await visible('document.querySelectorAll(".media-card").length===12');
    await open('image2.jpg'); await visible('document.querySelector(".item-facts")');
    await click('Information'); await until(async()=>JSON.parse(await readFile(settingsFile)).metadataExpanded===false,'Immediate disclosure close save');
    await click('Close viewer');
  });
  await test('responsive native AppFrame and source integrity', async () => {
    await writeFile(path.join(root, '.local/native-gallery-wide.png'), Buffer.from(await request(`/session/${session}/screenshot`), 'base64'));
    await request(`/session/${session}/window/rect`, { width: 600, height: 720 });
    assert.equal(await js('return document.documentElement.scrollWidth <= innerWidth'), true);
    const png = await request(`/session/${session}/screenshot`);
    await writeFile(path.join(root, '.local/native-gallery.png'), Buffer.from(png, 'base64'));
    await unchanged();
  });
  await test('all view preferences restore and invalid/write-failed state is observable',async()=>{
    if(await js('return !document.getElementById("media-filter")')) await click('Show controls');
    if(await js('return !document.getElementById("page-size")')) await click('Settings');
    await select('page-size','24');await select('card-size','small');await select('scroll-indicator','always');
    await select('media-filter','image');await select('media-sort','size');await select('media-direction','desc');
    await click('Hide controls');
    const wanted={pageSize:24,cardSize:'small',scrollIndicator:'always',filter:'image',sort:'size',direction:'desc',controlsExpanded:false};
    await until(async()=>{const saved=JSON.parse(await readFile(settingsFile));return Object.entries(wanted).every(([k,v])=>saved[k]===v)},'All preferences saved before restart');
    await stop();child=launch([fixture.directory]);await connect();await visible('document.querySelectorAll(".media-card").length===10');
    assert.ok(await js('return [...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Show controls")'));
    await click('Show controls');await click('Settings');
    assert.ok(await js('return [...document.querySelectorAll(".settings-panel select")].every(el=>{const h=el.getBoundingClientRect().height;return h>=30&&h<=35})'),'Compact settings dropdowns');
    for(const [id,value]of [['page-size','24'],['card-size','small'],['scroll-indicator','always'],['media-filter','image'],['media-sort','size'],['media-direction','desc']])assert.equal(await js('return document.getElementById(arguments[0]).value',[id]),value);
    await select('media-filter','all');await select('media-sort','name');await select('media-direction','asc');await select('page-size','48');await select('card-size','medium');await select('scroll-indicator','auto');
    await until(async()=>{const s=JSON.parse(await readFile(settingsFile));return s.filter==='all'&&s.sort==='name'&&s.direction==='asc'&&s.pageSize===48&&s.cardSize==='medium'&&s.scrollIndicator==='auto'&&s.controlsExpanded},'Restored normal test preferences');
    const valid=await readFile(settingsFile);
    await stop();await writeFile(settingsFile,'{broken');child=launch([fixture.directory]);await connect();await visible('document.body.textContent.includes("settings file was preserved")');
    await click('Show controls');await select('media-filter','image');await pause(200);
    assert.equal(await readFile(settingsFile,'utf8'),'{broken');assert.equal(await js('return document.querySelectorAll(".media-card").length'),10);
    await stop();await writeFile(settingsFile,valid);await rm(path.join(settingsDirectory,'settings.lock'),{force:true});await mkdir(path.join(settingsDirectory,'settings.lock'));
    child=launch([fixture.directory]);await connect();await visible('document.querySelectorAll(".media-card").length===12');await open('image2.jpg');await click('Information');
    await visible('document.querySelector("dialog")?.textContent.includes("could not be saved")');assert.equal(await js('return Boolean(document.querySelector("dialog .item-facts"))'),true);assert.deepEqual(await readFile(settingsFile),valid);
    await stop();await rm(path.join(settingsDirectory,'settings.lock'),{recursive:true});child=launch([fixture.directory]);await connect();await visible('document.querySelectorAll(".media-card").length===12');
  });
  await test('folder choices, portable intent, provenance, inheritance and failed recents', async () => {
    const stateRoot = await mkdtemp(path.join(root, '.local/native-state-'));
    const a = path.join(stateRoot, 'gallery-a'); const b = path.join(stateRoot, 'gallery-b');
    await mkdir(a); await mkdir(b);
    await copyFile(path.join(fixture.directory, 'image2.jpg'), path.join(a, 'image.jpg'));
    await copyFile(path.join(fixture.directory, 'image2.jpg'), path.join(b, 'image.jpg'));
    const openRoot = async directory => {
      await openSettled(directory);
      await visible('document.getElementById("save-destination") && !document.getElementById("save-destination").disabled');
    };
    const state = async () => js('const s=await window.__TAURI_INTERNALS__.invoke("snapshot");return await window.__TAURI_INTERNALS__.invoke("load_settings",{sessionId:s.sessionId})');
    const settings = async () => { if (await js('return !document.getElementById("font-scale")')) await click('Settings'); };
    await openRoot(a); await settings(); await select('save-destination','remembered'); await select('font-scale','90');
    await until(async () => (await state()).layers.remembered.fontScale === 90, 'Folder A remembered');
    assert.equal((await state()).savedTo.fontScale,'remembered');
    const retired=await state();
    await openRoot(b);
    assert.equal(await js('try{await window.__TAURI_INTERNALS__.invoke("save_settings",{request:{sessionId:arguments[0].sessionId,expectedRevision:arguments[0].revision,destination:"portable",patch:{fontScale:80},remove:null,clear:false}});return "accepted"}catch(error){return error.code}',[retired]),'stale_session');
    await settings(); assert.equal(await js('return document.getElementById("save-destination").value'),'user');
    assert.equal(await js('return document.getElementById("font-scale").value'),'100');
    await select('save-destination','remembered'); await select('font-scale','80');
    await until(async () => (await state()).layers.remembered.fontScale === 80, 'Folder B independent');
    await openRoot(a); await settings(); assert.equal(await js('return document.getElementById("font-scale").value'),'90');
    await select('save-destination','portable'); await select('font-scale','100');
    const portableFile=path.join(a,'settings.json');
    await until(async()=>JSON.parse(await readFile(portableFile)).choices.fontScale===100,'Explicit default written sparsely');
    assert.deepEqual(JSON.parse(await readFile(portableFile)).choices,{fontScale:100});
    await js('document.querySelector(".state-controls").open=true;return true;');
    await click('Inherit Global font size from below Portable gallery');
    await until(async()=>(await state()).settings.fontScale===90,'Removal clears temporary field and reveals remembered choice');
    await select('font-scale','80'); await until(async()=>JSON.parse(await readFile(portableFile)).choices.fontScale===80,'Portable choice');
    const edited=JSON.parse(await readFile(portableFile));edited.compatible={keep:true};edited.choices.futureChoice=[false,0,null];
    const editedBytes=JSON.stringify(edited);await writeFile(portableFile,editedBytes);
    await select('card-size','large');await visible('document.body.textContent.includes("Portable settings changed")');
    assert.equal(await readFile(portableFile,'utf8'),editedBytes);
    await openRoot(a);await settings();await select('save-destination','portable');await select('card-size','large');
    await until(async()=>JSON.parse(await readFile(portableFile)).choices.cardSize==='large','Reloaded compatible document saved');
    assert.deepEqual(JSON.parse(await readFile(portableFile)).compatible,{keep:true});
    assert.deepEqual(JSON.parse(await readFile(portableFile)).choices.futureChoice,[false,0,null]);
    await select('save-destination','remembered');await select('media-filter','video');
    await until(async()=>(await state()).layers.remembered.filter==='video','Remembered filter');
    await js('document.querySelector(".state-controls").open=true;return true;');await click('Clear temporary choices');
    await until(async()=>(await state()).sources.filter==='remembered','Remembered source visible');
    const rows=(await state()).recents;const aRow=rows.find(r=>r.displayPath.endsWith('gallery-a'));const bRow=rows.find(r=>r.displayPath.endsWith('gallery-b'));
    await click('Forget '+aRow.displayPath);await until(async()=>(await state()).settings.filter==='all','Forget re-resolves active layer');
    assert.equal((await state()).settings.fontScale,80);assert.equal((await state()).sources.fontScale,'portable');
    await rename(b,b+'-moved');await click(bRow.displayPath);
    await visible('document.body.textContent.includes("Cannot open the selected folder")');
    assert.ok((await snapshot()).root.endsWith('gallery-a'));assert.ok((await state()).recents.some(r=>r.id===bRow.id));
    assert.ok(JSON.parse(await readFile(portableFile)).choices.fontScale===80);await unchanged();
    await stop();
    const originalSettings=settingsDirectory;const originalHistory=historyDirectory;
    settingsDirectory=await mkdtemp(path.join(root,'.local/native-fresh-user-'));settingsFile=path.join(settingsDirectory,'settings.json');
    historyDirectory=await mkdtemp(path.join(root,'.local/native-fresh-history-'));
    const relocated=path.join(stateRoot,'relocated');await mkdir(relocated);
    await copyFile(path.join(a,'image.jpg'),path.join(relocated,'image.jpg'));await copyFile(portableFile,path.join(relocated,'settings.json'));
    child=launch([relocated]);await connect();await visible('document.querySelectorAll(".media-card").length===1');
    await until(async()=>(await state()).sources.fontScale==='portable','Fresh profile portable source');assert.equal((await state()).settings.fontScale,80);
    assert.deepEqual((await state()).layers.user,{});assert.deepEqual((await state()).layers.remembered,{});
    assert.deepEqual(await readFile(path.join(relocated,'image.jpg')),await readFile(path.join(a,'image.jpg')));
    await stop();settingsDirectory=originalSettings;settingsFile=path.join(settingsDirectory,'settings.json');historyDirectory=originalHistory;
    child=launch([fixture.directory]);await connect();await visible('document.querySelectorAll(".media-card").length===12');
  });
  const metadataRoot=await mkdtemp(path.join(root,'.local/metadata-雪-'));
  const metadataFile=path.join(metadataRoot,'clip.mp4_meta.json');
  const metadataSettings=path.join(metadataRoot,'settings.json');
  const metadataControl=action=>js('return await window.__TAURI_INTERNALS__.invoke("test_discovery_control",{action:arguments[0],config:null})',[action]);
  const inspect=async name=>js('const s=await window.__TAURI_INTERNALS__.invoke("snapshot");const i=s.items.find(i=>i.name===arguments[0]);return await window.__TAURI_INTERNALS__.invoke("inspect_metadata",{request:{sessionId:s.sessionId,itemId:i.id,itemRevision:i.revision,metadataRevision:s.metadataRevision}})',[name]);
  const currentState=()=>js('const s=await window.__TAURI_INTERNALS__.invoke("snapshot");return await window.__TAURI_INTERNALS__.invoke("load_settings",{sessionId:s.sessionId})');
  const metadataSources=[
    ['clip.mp4_meta.json','{"Title":"Harbor","Exact":900719925474099312345,"n":1.00e+999,"n":-0,"Nil":null,"False":false,"Zero":0,"Empty":"","Array":[],"Object":{},"Nested":{"a/b~":[{"value":"<script>window.__s010Pwn=true</script>"}]}}'],
    ['clip.mp4.json','false'],
    ['clip.json','['+Array.from({length:60},(_,i)=>String(i)).join(',')+']'],
    ['photo.json','{"Title":"Ambiguous stem"}'],
    ['photo.jpg.json','{broken'],
    ['index.json','{"Items":[{"StorageName":"clip.mp4","Name":"original.mp4","Metadata":[{"Source":"camera","Type":"capture","Data":{"Exact":9007199254740993}}]},{"Name":"deleted.jpg"},{"IsDirectory":true,"Items":[{"Name":"clip.mp4","Wrong":true}]},{"Name":"../clip.mp4"}]}'],
    ['unrelated.json','{"Title":"Unrelated"}'],
  ];
  for(const [name,text] of metadataSources)await writeFile(path.join(metadataRoot,name),text);
  for(const [from,to]of [['clip silent.mp4','clip.mp4'],['image2.jpg','photo.jpg'],['image2.jpg','photo.png']])await copyFile(path.join(fixture.directory,from),path.join(metadataRoot,to));
  await writeFile(metadataSettings,JSON.stringify({product:'local-media-gallery',kind:'gallery-settings',version:'0.0.0',formatVersion:1,choices:{metadataExpanded:false,fontScale:100,filter:'all',sort:'name',direction:'asc'},futureEnvelope:{keep:true}}));
  await test('metadata demand, exact native transport, attributed nested data and lazy keyboard inspection',async()=>{
    await metadataControl('metadata_arm');
    await openSettled(metadataRoot);await visible('document.querySelectorAll(".media-card").length===3');
    assert.equal(await metadataControl('metadata_status'),false,'Cards must not read sidecars');
    await open('clip.mp4');await visible('document.querySelector("dialog video")?.readyState>=1');
    assert.equal(await js('return document.querySelector(".metadata-inspector")===null'),true,'Information remains collapsed');
    await click('Information');await until(()=>metadataControl('metadata_status'),'Demand-only metadata barrier');
    assert.equal((await snapshot()).status,'complete','Snapshot remains responsive during metadata read');
    await metadataControl('metadata_release');await visible('document.querySelectorAll(".metadata-document").length===4');
    const value=await inspect('clip.mp4');assert.ok(validateMetadata(value),JSON.stringify(validateMetadata.errors));
    assert.equal(value.documents.length,4);assert.equal(value.documents[0].node.members.find(m=>m.key==='Exact').value.value,'900719925474099312345');
    assert.equal(value.documents[0].node.members.filter(m=>m.key==='n')[0].value.value,'1.00e+999');
    assert.equal(value.documents[0].node.members.filter(m=>m.key==='n')[1].value.value,'-0');
    assert.equal(value.documents[1].node.value,false);assert.ok(value.limitations.some(s=>s.includes('stale')));
    assert.equal(value.documents.some(d=>d.label==='unrelated.json'),false);
    await js('document.querySelector("[data-metadata-source=full-name-meta] details").open=true;return true;');
    await visible('document.querySelector("[data-metadata-source=full-name-meta]").textContent.includes("900719925474099312345")');
    await js('const el=document.querySelector("[data-metadata-source=full-name-meta] summary");el.focus();return true;');
    await input('keys',['-Keys','{ENTER}']);
    await visible('!document.querySelector("[data-metadata-source=full-name-meta] details").open');
    await input('keys',['-Keys','{ENTER}']);
    await visible('document.querySelector("[data-metadata-source=full-name-meta] details").open');
    await js('document.querySelector("[data-metadata-source=stem-json] details").open=true;return true;');
    await visible('document.querySelector("[data-metadata-source=stem-json]").textContent.includes("10 remaining")');
    await click('Show next 50 fields (10 remaining)');
    assert.equal(await js('return document.querySelector("[data-metadata-source=stem-json]").querySelectorAll(".metadata-leaf").length'),60);
    await js('for(const d of document.querySelector("[data-metadata-source=full-name-meta]").querySelectorAll("details"))d.open=true;return true;');
    for(let i=0;i<3;i++){await pause(20);await js('for(const d of document.querySelector("[data-metadata-source=full-name-meta]").querySelectorAll("details"))d.open=true;return true;');}
    await visible('document.querySelector(".metadata-inspector").textContent.includes("<script>window.__s010Pwn=true</script>")');
    assert.equal(await js('return !window.__s010Pwn && document.querySelector(".metadata-inspector script")===null'),true);
    await select('viewer-save-destination','portable');
    await click('Include summary field full-name-meta $["Exact"]');
    await until(async()=>JSON.parse(await readFile(metadataSettings)).choices.summaryFields?.length===1,'Portable exact summary persisted');
    await visible('document.querySelector(".metadata-summary").textContent.includes("900719925474099312345")');
    const photo=await inspect('photo.jpg');assert.ok(validateMetadata(photo));assert.ok(photo.documents.some(d=>d.ambiguous));assert.ok(photo.documents.some(d=>d.status==='invalid'));
  });
  await test('sidecar-only Refresh, failed reads and stale completion preserve focused video',async()=>{
    await js('const v=document.querySelector("dialog video");window.__s010Video=v;window.__s010Reloads=0;v.addEventListener("emptied",()=>window.__s010Reloads++);v.loop=true;v.currentTime=0.4;const b=[...document.querySelectorAll("dialog button")].find(b=>b.textContent==="Play");b.focus();return true;');
    await input('keys',['-Keys','{ENTER}']);await visible('document.querySelector("dialog video").currentTime>0.5');
    const before=await snapshot();
    const updated=metadataSources[0][1].replace('900719925474099312345','900719925474099312346');
    await writeFile(metadataFile,updated);await click('Refresh');
    await visible('document.querySelector(".metadata-summary")?.textContent.includes("900719925474099312346")');
    const after=await snapshot();assert.equal(after.items.find(i=>i.name==='clip.mp4').revision,before.items.find(i=>i.name==='clip.mp4').revision);
    assert.notEqual(after.metadataRevision,before.metadataRevision);
    assert.equal(await js('return document.querySelector("dialog video")===window.__s010Video && !window.__s010Video.paused && window.__s010Reloads===0'),true);
    await metadataControl('metadata_arm');await click('Retry metadata inspection');await until(()=>metadataControl('metadata_status'),'Held old metadata read');
    await writeFile(metadataFile,updated.replace('900719925474099312346','900719925474099312347'));await click('Refresh');
    await visible('document.querySelector(".metadata-inspector")?.textContent.includes("still running")');
    await metadataControl('metadata_release');await pause(100);await click('Retry metadata inspection');
    await visible('document.querySelector(".metadata-summary")?.textContent.includes("900719925474099312347")');
    assert.equal(await js('return document.querySelector("dialog video")===window.__s010Video && window.__s010Reloads===0'),true);
    await writeFile(metadataFile,'{broken');await click('Refresh');await visible('document.querySelector("[data-metadata-source=full-name-meta]")?.dataset.metadataStatus==="invalid"');
    assert.equal(await js('return document.querySelector("dialog video")===window.__s010Video && !window.__s010Video.paused'),true);
    await writeFile(metadataFile,metadataSources[0][1]);await click('Refresh');await visible('document.querySelector("[data-metadata-source=full-name-meta]")?.dataset.metadataStatus==="ready"');
    await metadataControl('metadata_arm');await click('Retry metadata inspection');await until(()=>metadataControl('metadata_status'),'Root-retired read');
    await click('Close viewer');await openSettled(fixture.directory);await metadataControl('metadata_release');await pause(100);
    assert.equal(await js('return document.querySelector(".metadata-inspector")===null'),true);
    assert.equal((await snapshot()).items.length,12);
  });
  await test('summary choices persist through all destinations and portable relocation without media changes',async()=>{
    await openSettled(metadataRoot);await visible('document.getElementById("save-destination") && !document.getElementById("save-destination").disabled');
    await open('clip.mp4');await click('Information');await visible('document.querySelectorAll(".metadata-document").length===4');
    await js('document.querySelector("[data-metadata-source=full-name-meta] details").open=true;return true;');
    const title='Include summary field full-name-meta $["Title"]';const removeTitle='Remove summary field full-name-meta $["Title"]';
    for(const [target,include] of [['user',true],['session',false],['remembered',true],['portable',false]]) {
      await select('viewer-save-destination',target);await click(include?title:removeTitle);
      await until(async()=>{const layer=(await currentState()).layers[target].summaryFields;return Array.isArray(layer) && layer.some(f=>f.path[0]?.key==='Title')===include;},'Summary destination '+target);
    }
    await select('viewer-save-destination','portable');
    await click('Include summary field full-name-meta $["Empty"]');
    await until(async()=>JSON.parse(await readFile(metadataSettings)).choices.summaryFields?.length===2,'Final portable summary');
    await click('Close viewer');if(await js('return !document.getElementById("font-scale")'))await click('Settings');
    await select('save-destination','session');await select('font-scale','80');
    await open('clip.mp4');await visible('document.querySelector(".metadata-summary")?.textContent.includes("900719925474099312345")');
    const textSize=await js('return parseFloat(getComputedStyle(document.querySelector(".metadata-summary code")).fontSize)');
    assert.ok(textSize<14&&textSize>=10,'Metadata follows global text scaling: '+textSize);
    await click('Close viewer');
    const originalSettings=settingsDirectory;const originalHistory=historyDirectory;
    await stop();settingsDirectory=await mkdtemp(path.join(root,'.local/metadata-fresh-user-'));settingsFile=path.join(settingsDirectory,'settings.json');historyDirectory=await mkdtemp(path.join(root,'.local/metadata-fresh-history-'));
    const relocated=metadataRoot+'-relocated';await mkdir(relocated);
    for(const name of ['clip.mp4','clip.mp4_meta.json','settings.json'])await copyFile(path.join(metadataRoot,name),path.join(relocated,name));
    child=launch([relocated]);await connect();await visible('document.querySelectorAll(".media-card").length===1');
    assert.equal((await currentState()).sources.summaryFields,'portable');assert.equal((await currentState()).settings.summaryFields.length,2);
    await open('clip.mp4');await click('Information');await visible('document.querySelector(".metadata-summary")?.textContent.includes("900719925474099312345")');
    assert.ok(await js('return document.querySelector(".metadata-summary").textContent.includes(\'""\')'));
    await request('/session/'+session+'/window/rect',{width:600,height:720});
    assert.equal(await js('return document.querySelector(".viewer-information").scrollWidth<=document.querySelector(".viewer-information").clientWidth+1'),true);
    await stop();settingsDirectory=originalSettings;settingsFile=path.join(settingsDirectory,'settings.json');historyDirectory=originalHistory;
    child=launch([fixture.directory]);await connect();await visible('document.querySelectorAll(".media-card").length===12');
    for(const [name,text]of metadataSources)assert.equal(await readFile(path.join(metadataRoot,name),'utf8'),text,'Inspection preserves '+name);
    for(const [from,to]of [['clip silent.mp4','clip.mp4'],['image2.jpg','photo.jpg'],['image2.jpg','photo.png']])assert.deepEqual(await readFile(path.join(metadataRoot,to)),await readFile(path.join(fixture.directory,from)));
    assert.deepEqual(JSON.parse(await readFile(metadataSettings)).futureEnvelope,{keep:true});
    await unchanged();
  });
  const loadingRoot=await mkdtemp(path.join(root,'.local/loading-雪-'));
  await copyFile(path.join(fixture.directory,'image2.jpg'),path.join(loadingRoot,'image2.jpg'));
  await copyFile(path.join(fixture.directory,'clip silent.mp4'),path.join(loadingRoot,'clip.mp4'));
  await writeFile(path.join(loadingRoot,'settings.json'),JSON.stringify({product:'local-media-gallery',kind:'gallery-settings',version:'0.0.0',formatVersion:1,choices:{loadingMode:'automatic'},futureEnvelope:{keep:true}})+'\n');
  const loadingSettings=path.join(loadingRoot,'settings.json');
  const holdDecodes=()=>js('window.__s011Decode=HTMLImageElement.prototype.decode;window.__s011Held=[];HTMLImageElement.prototype.decode=function(){const element=this;return new Promise((resolve,reject)=>window.__s011Held.push(()=>window.__s011Decode.call(element).then(resolve,reject)));};return true;');
  const releaseDecodes=()=>js('HTMLImageElement.prototype.decode=window.__s011Decode;for(const release of window.__s011Held.splice(0))release();return true;');
  await test('loading strategy keyboard control and all existing persistence destinations retain deliberate intent',async()=>{
    await openSettled(loadingRoot);await visible('document.querySelectorAll(".media-card").length===2');
    if(await js('return !document.getElementById("loading-mode")'))await click('Settings');
    await select('save-destination','session');
    await js('document.getElementById("loading-mode").focus();return true;');await input('keys',['-Keys','{HOME}{DOWN}']);
    await visible('document.getElementById("loading-mode").value==="conservative"');
    const page=await js('return document.getElementById("page-jump").value');
    for(const [target,mode] of [['user','conservative'],['session','standard'],['remembered','automatic'],['portable','conservative']]) {
      await select('save-destination',target);await select('loading-mode',mode);
      await until(async()=>(await currentState()).layers[target].loadingMode===mode,'Loading preference destination '+target);
      await visible('document.querySelector(".media-grid")?.dataset.loadingMode===arguments[0]'.replace('arguments[0]',JSON.stringify(mode)));
      assert.equal(await js('return document.getElementById("page-jump").value'),page);
    }
    await select('save-destination','portable');await select('loading-mode','automatic');
    await until(async()=>JSON.parse(await readFile(loadingSettings)).choices.loadingMode==='automatic','Portable automatic intent');
    const saved=JSON.parse(await readFile(loadingSettings));assert.deepEqual(saved.futureEnvelope,{keep:true});
    assert.equal(/latency|sampleCount|frameCount|concurrency|generation/.test(JSON.stringify(saved)),false,'Machine observations never persist');
    const before=await readFile(loadingSettings);const state=await currentState();
    const ordinary={...state};delete ordinary.testPageSize;
    assert.ok(validateSettings(ordinary),JSON.stringify(validateSettings.errors));
    const rejected=await js('try{await window.__TAURI_INTERNALS__.invoke("save_settings",{request:{sessionId:arguments[0],expectedRevision:arguments[1],destination:"portable",patch:{loadingMode:"fast"},remove:null,clear:false}});return false;}catch{return true;}',[state.sessionId,state.revision]);
    assert.equal(rejected,true);assert.deepEqual(await readFile(loadingSettings),before);
  });
  await test('native pressure, hidden retirement and mode changes preserve sources, page and healthy focused playback',async()=>{
    await holdDecodes();
    try {
      await select('media-filter','video');await select('media-filter','all');
      await visible('window.__s011Held.length>0');
      await visible('Number(document.querySelector(".media-grid")?.dataset.loadingLimit)===1');
      await js('Object.defineProperty(document,"visibilityState",{configurable:true,get:()=>"hidden"});document.dispatchEvent(new Event("visibilitychange"));return true;');
      await visible('document.querySelectorAll(".media-grid img[src],.media-grid video[src]").length===0');
      await releaseDecodes();
      await js('delete document.visibilityState;document.dispatchEvent(new Event("visibilitychange"));return true;');
      await visible('[...document.querySelectorAll(".media-grid img")].some(i=>i.naturalWidth>0)');
      assert.equal(await js('return Number(document.querySelector(".media-grid").dataset.loadingLimit)'),1,'Hidden period does not reset or promote calibration');
      assert.equal(await js('return [...document.querySelectorAll(".media-card")].some(c=>c.textContent.includes("Media unavailable"))'),false,'Cancelled decode rejection must not poison usable media');
    } finally {
      await js('if(window.__s011Decode)HTMLImageElement.prototype.decode=window.__s011Decode;delete document.visibilityState;document.dispatchEvent(new Event("visibilitychange"));for(const release of window.__s011Held??[])release();return true;');
    }
    await select('loading-mode','standard');await visible('document.querySelector(".media-grid")?.dataset.loadingLimit==="4"');
    await open('clip.mp4');await visible('document.querySelector("dialog video")?.readyState>=1');
    await js('const v=document.querySelector("dialog video");window.__s011Video=v;window.__s011Emptied=0;v.addEventListener("emptied",()=>window.__s011Emptied++);v.loop=true;[...document.querySelectorAll("dialog button")].find(b=>b.textContent.trim()==="Play").focus();return true;');
    await input('keys',['-Keys','{ENTER}']);await visible('document.querySelector("dialog video").currentTime>0.1');
    await select('loading-mode','conservative');
    await until(async()=>(await currentState()).settings.loadingMode==='conservative','Preference while focused');
    assert.equal(await js('return document.querySelector("dialog video")===window.__s011Video && !window.__s011Video.paused && window.__s011Emptied===0'),true);
    assert.equal(await js('return document.querySelectorAll(".media-grid img[src],.media-grid video[src],.metadata-probe").length'),0);
    const resources=await js('return await window.__TAURI_INTERNALS__.invoke("test_discovery_control",{action:"s011_resource_snapshot",config:null})');
    assert.equal(resources.mediaResponsesCap,32);assert.equal(resources.metadataCap,1);assert.equal(resources.discoveryCap,1);
    assert.ok(resources.mediaResponsesActive<=32&&resources.metadataActive<=1&&resources.discoveryActive<=1);
    await click('Close viewer');await select('loading-mode','automatic');
    await until(async()=>JSON.parse(await readFile(loadingSettings)).choices.loadingMode==='automatic','Automatic restored for recipient');
    await holdDecodes();await select('media-filter','video');await select('media-filter','all');
    await visible('window.__s011Held.length>0');await visible('document.querySelector(".media-grid")?.dataset.loadingLimit==="2"');
    await releaseDecodes();
  });
  await test('relocated portable automatic intent starts fresh recipient calibration and retains media bytes',async()=>{
    const originalSettings=settingsDirectory;const originalHistory=historyDirectory;
    await stop();settingsDirectory=await mkdtemp(path.join(root,'.local/loading-fresh-user-'));settingsFile=path.join(settingsDirectory,'settings.json');historyDirectory=await mkdtemp(path.join(root,'.local/loading-fresh-history-'));
    const relocated=loadingRoot+'-relocated';await mkdir(relocated);
    for(const name of ['image2.jpg','clip.mp4','settings.json'])await copyFile(path.join(loadingRoot,name),path.join(relocated,name));
    child=launch([relocated]);await connect();await visible('document.querySelectorAll(".media-card").length===2');
    await until(async()=>(await currentState()).sources.loadingMode==='portable','Recipient portable loading intent');
    assert.equal((await currentState()).settings.loadingMode,'automatic');
    await visible('document.querySelector(".media-grid")?.dataset.loadingMode==="automatic" && document.querySelector(".media-grid").dataset.loadingLimit==="4"');
    const portable=JSON.parse(await readFile(path.join(relocated,'settings.json')));assert.equal(portable.choices.loadingMode,'automatic');
    assert.equal(/latency|sampleCount|frameCount|concurrency|generation/.test(JSON.stringify(portable)),false);
    for(const [from,to]of [['image2.jpg','image2.jpg'],['clip silent.mp4','clip.mp4']])for(const target of [loadingRoot,relocated])assert.deepEqual(await readFile(path.join(target,to)),await readFile(path.join(fixture.directory,from)));
    await stop();settingsDirectory=originalSettings;settingsFile=path.join(settingsDirectory,'settings.json');historyDirectory=originalHistory;
    child=launch([fixture.directory]);await connect();await visible('document.querySelectorAll(".media-card").length===12');
    await unchanged();
  });
  await test('no-argument startup is explicit selection; unavailable startup is recoverable', async () => {
    await stop(); child = launch([]); await connect();
    await visible('document.body.textContent.includes("No directory selected")');
    assert.equal((await snapshot()).sessionId, null);
    await stop(); child = launch([path.join(root, '.local/absent-root-for-acceptance')]); await connect();
    await visible('document.body.textContent.includes("Directory unavailable")');
    assert.equal((await snapshot()).status, 'unavailable');
    await openSettled(fixture.directory);
    await visible('document.querySelectorAll(".media-card").length===12');
    assert.equal((await snapshot()).issues.length, 0);
  });
  const record = { started: started.toISOString(), finished: new Date().toISOString(), platform: process.platform, architecture: process.arch, binarySha256: createHash('sha256').update(await readFile(binary)).digest('hex'), fixtureCandidates: 12, passed, driverInput: 'DOM inspection and setup; actual Windows SendKeys for playback, keyboard and Escape; native UIAutomation picker selection/cancel', deferred: ['Linux and macOS native runtime', 'large collection qualification', 'installer and Lite dependency closure'] };
  await writeFile(path.join(root, '.local/native-results.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(`Native acceptance: ${passed.length} checks passed.`);
} catch (error) {
  await mkdir(path.join(root, '.local'), { recursive: true });
  await writeFile(path.join(root, '.local/native-failure.log'), `${error.stack}\n${diagnostics}`);
  if (session) { try { await writeFile(path.join(root, '.local/native-focus-failure.json'), JSON.stringify(await js('return {hasFocus:document.hasFocus(),active:{tag:document.activeElement?.tagName,id:document.activeElement?.id,classes:document.activeElement?.className},filter:document.getElementById("media-filter")?.value,count:document.querySelectorAll(".media-card").length}'),null,2)+'\n'); } catch {} }
  if (session) { try { await writeFile(path.join(root, '.local/native-failure.png'), Buffer.from(await request(`/session/${session}/screenshot`), 'base64')); } catch {} }
  throw error;
} finally {
  if (session) { try { await request(`/session/${session}`, undefined, 'DELETE'); } catch {} }
  child.kill();
}
