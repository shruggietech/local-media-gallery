// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, readdir, writeFile, mkdir, mkdtemp, copyFile, rename, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { root, execute, environment } from './run.mjs';

if (process.platform !== 'win32') throw new Error('Native acceptance currently requires Windows.');
const started = new Date();
const fixture = JSON.parse(await readFile(path.join(root, '.local/native-fixture.json')));
const validate = new Ajv({ strict: true }).addKeyword('x-release-version').compile(JSON.parse(await readFile(path.join(root, 'schemas/v0.0.0/local-media-gallery.schema.json'))));
const binary = process.env.GALLERY_TEST_BINARY ?? path.join(root, 'target/debug/local-media-gallery.exe');
const port = 44000 + Math.floor(Math.random() * 10000);
const origin = `http://127.0.0.1:${port}`;
let diagnostics = '';
function launch(args) {
  const app = spawn(binary, args, { cwd: root, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'], env: { ...environment, TAURI_WEBDRIVER_PORT: String(port) } });
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
const visible = script => until(() => js(`return Boolean(${script})`), script);
const click = text => js('const b=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()===arguments[0]); if(!b)throw Error("Missing button "+arguments[0]); b.click(); return true;', [text]);
const open = name => js('const card=[...document.querySelectorAll(".media-card")].find(c=>c.dataset.name===arguments[0]); if(!card)throw Error("Missing card"); card.querySelector("button").click(); return true;', [name]);
const select = (id, value) => js('const el=document.getElementById(arguments[0]); el.value=arguments[1]; el.dispatchEvent(new Event("change",{bubbles:true})); return true;', [id, value]);
const input = (action, extra = []) => execute('C:/Program Files/PowerShell/7/pwsh.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(root, 'scripts/native-input.ps1'), '-AppProcessId', String(child.pid), '-Action', action, ...extra]);
async function test(name, body) { await body(); passed.push(name); console.log(`PASS ${name}`); }
async function connect() {
  await until(async () => { const r = await fetch(origin + '/status', { signal: AbortSignal.timeout(500) }); return r.ok; }, 'Native driver readiness', 20000);
  session = (await request('/session', { capabilities: { alwaysMatch: { 'wdio:tauriServiceOptions': { windowLabel: 'main' } } } })).sessionId;
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
  await test('native folder picker cancellation preserves session', async () => {
    const before = await snapshot();
    await js('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.trim()==="Choose folder").focus(); return true;');
    await input('keys', ['-Keys', '{ENTER}']); await input('cancel-picker');
    await visible('!Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Choose folder")).disabled');
    assert.equal((await snapshot()).sessionId, before.sessionId);
  });
  await test('sorting, filters and scoped empty state', async () => {
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
    for (const [name, dimensions] of Object.entries(fixture.expected.stills)) {
      await open(name); await visible('document.querySelector("dialog img")?.naturalWidth>0');
      assert.deepEqual(await js('const i=document.querySelector("dialog img"); return [i.naturalWidth,i.naturalHeight]'), dimensions);
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
    await click('Pause'); assert.equal(await js('return document.querySelector("dialog video").paused'), true);
    await js('document.querySelector("dialog video").currentTime=2; return true;');
    await visible('Math.abs(document.querySelector("dialog video").currentTime-2)<0.2 && !document.querySelector("dialog video").seeking');
    await until(() => js('const c=document.createElement("canvas"); c.width=32; c.height=18; c.getContext("2d").drawImage(document.querySelector("dialog video"),0,0,32,18); return c.toDataURL()!==window.__nativeFrame;'), 'Seek displays a different decoded frame');
    await click('Close viewer'); await visible('!document.querySelector("dialog")');
    assert.equal(await js('return Array.from(document.querySelectorAll("video")).filter(v=>!v.paused).length'), 0);
  });
  await test('native keyboard activation, Escape and focus return', async () => {
    await js('document.getElementById("media-filter").focus(); return true;');
    await input('keys', ['-Keys', '{HOME}{DOWN}{ENTER}']); await visible('document.querySelectorAll(".media-card").length===10');
    await input('keys', ['-Keys', '{HOME}{ENTER}']); await visible('document.querySelectorAll(".media-card").length===12');
    await js('document.querySelector(".media-open").focus(); return true;');
    await input('keys', ['-Keys', '{ENTER}']); await visible('document.querySelector("dialog")?.open');
    await input('keys', ['-Keys', '{ESC}']); await visible('!document.querySelector("dialog")');
    assert.equal(await js('return document.activeElement?.classList.contains("media-open")'), true);
    await input('keys', ['-Keys', '{TAB}']);
    assert.equal(await js('return document.activeElement?.classList.contains("media-open")'), true);
    assert.equal(await js('return getComputedStyle(document.activeElement).outlineStyle !== "none"'), true);
  });
  await test('root replacement stops active playback and revokes old access', async () => {
    await open('clip audio.mp4'); await visible('document.querySelector("dialog video")?.readyState>=1');
    await js('window.__retiredMedia=document.querySelector("dialog video"); Array.from(document.querySelectorAll("dialog button")).find(b=>b.textContent.trim()==="Play").focus(); return true;');
    await input('keys', ['-Keys', ' ']); await visible('!window.__retiredMedia.paused');
    const before = await snapshot(); const item = before.items.find(i => i.kind === 'video');
    const empty = await mkdtemp(path.join(root, '.local/switch-'));
    await js('return await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]})', [empty]);
    await visible('!document.querySelector("dialog") && document.body.textContent.includes("No media found")');
    assert.equal(await js('return window.__retiredMedia.paused && window.__retiredMedia.getAttribute("src")===null'), true);
    assert.equal((await fetch(`${before.mediaOrigin}/media/${before.sessionId}/${item.id}/${item.revision}`)).status, 404);
    await js('return await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]})', [fixture.directory]); await visible('document.querySelectorAll(".media-card").length===12');
  });
  await test('session-scoped native ranges and cross-origin denial', async () => {
    const value = await snapshot(); const item = value.items.find(i => i.name === 'clip audio.mp4');
    const url = `${value.mediaOrigin}/media/${value.sessionId}/${item.id}/${item.revision}`;
    const response = await fetch(url, { headers: { range: 'bytes=1-3' } }); assert.equal(response.status, 206); assert.equal((await response.arrayBuffer()).byteLength, 3);
    assert.equal((await fetch(url, { method: 'HEAD' })).headers.get('content-length'), item.size);
    assert.equal((await fetch(url, { headers: { origin: 'https://outside.invalid' } })).status, 403);
    assert.equal((await fetch(url, { headers: { range: 'bytes=999999999-' } })).status, 416);
  });
  await test('observed create, same-path replacement, removal and stale viewer cleanup', async () => {
    const added = path.join(fixture.directory, 'temporary.jpg');
    try {
      await copyFile(path.join(fixture.directory, 'image2.jpg'), added); await until(() => js('return document.querySelectorAll(".media-card").length===13'), 'Observed addition', 5000);
      const before = await snapshot(); const old = before.items.find(i => i.name === 'temporary.jpg'); await open('temporary.jpg');
      await copyFile(path.join(fixture.directory, 'A equal.jpg'), added);
      await until(async () => (await snapshot()).items.find(i => i.name === 'temporary.jpg')?.revision !== old.revision, 'Native replacement revision', 5000);
      await rm(added); await until(() => js('return document.querySelectorAll(".media-card").length===12 && !document.querySelector("dialog")'), 'Observed removal', 5000);
      const stale = await fetch(`${before.mediaOrigin}/media/${before.sessionId}/${old.id}/${old.revision}`); assert.equal(stale.status, 404);
      await click('Refresh');
      await visible('!Array.from(document.querySelectorAll("button")).find(b=>b.textContent.trim()==="Refresh").disabled');
      assert.equal((await snapshot()).items.length, 12);
    } finally { await rm(added, { force: true }); }
  });
  await test('native chooser selects empty directory and invalid selection preserves it', async () => {
    const empty = await mkdtemp(path.join(root, '.local/empty-'));
    await click('Choose folder'); await input('select-picker', ['-Directory', empty]);
    await visible('document.querySelectorAll(".media-card").length===0 && document.body.textContent.includes("No media found")');
    const before = await snapshot();
    assert.ok(await js('try { await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]}); return false; } catch { return true; }', [empty + '/absent']));
    assert.equal((await snapshot()).sessionId, before.sessionId);
    await select('media-filter', 'video'); await visible('document.body.textContent.includes("No media found")');
    await copyFile(path.join(fixture.directory, 'image2.jpg'), path.join(empty, 'only-image.jpg'));
    await visible('document.body.textContent.includes("No media match this filter")');
    await js('return await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]})', [fixture.directory]);
    await visible('document.querySelectorAll(".media-card").length===2'); await select('media-filter', 'all');
  });
  await test('relocated directory reopens without a manifest and retires old grants', async () => {
    const before = await snapshot(); const item = before.items[0]; const moved = fixture.directory + '-moved';
    await click('Close folder'); await visible('document.body.textContent.includes("No directory selected")');
    await rename(fixture.directory, moved);
    try {
      await js('return await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]})', [moved]); await visible('document.querySelectorAll(".media-card").length===12');
      assert.equal((await fetch(`${before.mediaOrigin}/media/${before.sessionId}/${item.id}/${item.revision}`)).status, 404);
    } finally { await click('Close folder'); await visible('document.body.textContent.includes("No directory selected")'); await rename(moved, fixture.directory); }
    await js('return await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]})', [fixture.directory]);
    await visible('document.querySelectorAll(".media-card").length===12');
  });
  await test('responsive native AppFrame and source integrity', async () => {
    await writeFile(path.join(root, '.local/native-gallery-wide.png'), Buffer.from(await request(`/session/${session}/screenshot`), 'base64'));
    await request(`/session/${session}/window/rect`, { width: 600, height: 720 });
    assert.equal(await js('return document.documentElement.scrollWidth <= innerWidth'), true);
    const png = await request(`/session/${session}/screenshot`);
    await writeFile(path.join(root, '.local/native-gallery.png'), Buffer.from(png, 'base64'));
    await unchanged();
  });
  await test('no-argument startup is explicit selection; unavailable startup is recoverable', async () => {
    await stop(); child = launch([]); await connect();
    await visible('document.body.textContent.includes("No directory selected")');
    assert.equal((await snapshot()).sessionId, null);
    await stop(); child = launch([path.join(root, '.local/absent-root-for-acceptance')]); await connect();
    await visible('document.body.textContent.includes("Directory unavailable")');
    assert.equal((await snapshot()).status, 'unavailable');
    await js('return await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]})', [fixture.directory]);
    await visible('document.querySelectorAll(".media-card").length===12');
    assert.equal((await snapshot()).issues.length, 0);
  });
  const record = { started: started.toISOString(), finished: new Date().toISOString(), platform: process.platform, architecture: process.arch, binarySha256: createHash('sha256').update(await readFile(binary)).digest('hex'), fixtureCandidates: 12, passed, driverInput: 'DOM inspection and setup; actual Windows SendKeys for playback, keyboard and Escape; native UIAutomation picker selection/cancel', deferred: ['Linux and macOS native runtime', 'large collection qualification', 'installer and Lite dependency closure'] };
  await writeFile(path.join(root, '.local/native-results.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(`Native acceptance: ${passed.length} checks passed.`);
} catch (error) {
  await mkdir(path.join(root, '.local'), { recursive: true });
  await writeFile(path.join(root, '.local/native-failure.log'), `${error.stack}\n${diagnostics}`);
  if (session) { try { await writeFile(path.join(root, '.local/native-failure.png'), Buffer.from(await request(`/session/${session}/screenshot`), 'base64')); } catch {} }
  throw error;
} finally {
  if (session) { try { await request(`/session/${session}`, undefined, 'DELETE'); } catch {} }
  child.kill();
}
