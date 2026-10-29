// SPDX-License-Identifier: Apache-2.0
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
requireIsolatedDesktop();
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash,randomUUID } from 'node:crypto';
import {availableLoopbackPort,observeChild,readyDriver,stopOwnedChild} from './native-driver-lifecycle.mjs';
import {sourceIdentity} from './provenance.mjs';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { root, environment, execute } from './run.mjs';
import { inventory } from './create-fixture.mjs';
import {prepareMediaTool} from './prepare-media-tool.mjs';
import { summarize, validateMeasurement, operations } from './measurement.mjs';
import { viewItems } from '../apps/gallery/src/lib/view.ts';

if (process.platform !== 'win32') throw new Error('Native measurement election requires Windows');
const args = process.argv.slice(2);
const measurementStarted = performance.now();
const preparationStarted = new Date().toISOString();
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const binary = path.resolve(option('--binary', path.join(root, '.local/bin/local-media-gallery-native-tests.exe')));
const label = option('--label', 'adaptive');
const source = await sourceIdentity();
const output = path.resolve(option('--output', path.join(root, '.local/measurement.json')));
const prepared = JSON.parse(await readFile(option('--fixture', path.join(root, '.local/native-fixture.json'))));
const directory = await mkdtemp(path.join(root, '.local/measurement-fixture-'));
for (const record of prepared.records) {
  const target = path.join(directory, record.name); await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(prepared.directory, record.name), target);
}
await writeFile(path.join(directory, 'image2.jpg_meta.json'), '{"Title":"Synthetic measurement","Exact":900719925474099312345,"nested":{"empty":[],"value":false}}\n');
const records = await inventory(directory);
const observer = spawn('C:/Program Files/PowerShell/7/pwsh.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(root, 'scripts/measure-processes.ps1')], { cwd: root, env: environment, windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
const lines = createInterface({ input: observer.stdout });
let observerError = ''; observer.stderr.on('data', b => { observerError += b; });
const replies = []; lines.on('line', line => { const next = replies.shift(); if (next) { clearTimeout(next.timer); try { next.resolve(JSON.parse(line)); } catch (e) { next.reject(e); } } });
observer.on('error', error => { for (const pending of replies.splice(0)) { clearTimeout(pending.timer); pending.reject(error); } });
observer.on('exit', () => { for (const pending of replies.splice(0)) { clearTimeout(pending.timer); pending.reject(new Error('Process observer exited: ' + observerError)); } });
observer.stdin.on('error', error => { for (const pending of replies.splice(0)) { clearTimeout(pending.timer); pending.reject(error); } });
const observe = request => new Promise((resolve, reject) => { if (observer.killed || observer.exitCode !== null) { reject(new Error('Process observer is unavailable')); return; } const pending = { resolve, reject, timer: setTimeout(() => { const index = replies.indexOf(pending); if (index >= 0) replies.splice(index, 1); observer.kill(); reject(new Error('Process observer timed out during ' + request.action + ': ' + observerError)); }, 20000) }; replies.push(pending); observer.stdin.write(JSON.stringify(request) + '\n'); });
const samples = Object.fromEntries(operations.map(name => [name, []]));
const frames = []; const memory = []; const runs = []; const profiles = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(probe, message, timeout = 15000) {
  const end = performance.now() + timeout; let last;
  while (performance.now() < end) { try { last = await probe(); if (last) return last; } catch (error) { last = error.message; } await pause(30); }
  throw new Error(message + ': ' + JSON.stringify(last));
}
async function logicalBytes(directory) {
  let bytes = 0; let omitted = 0;
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return { bytes, omitted: 1 }; }
  for (const entry of entries) {
    const p = path.join(directory, entry.name); if (entry.isSymbolicLink()) continue;
    try { if (entry.isDirectory()) { const child = await logicalBytes(p); bytes += child.bytes; omitted += child.omitted; } else bytes += (await stat(p)).size; }
    catch { omitted += 1; }
  }
  return { bytes, omitted };
}
let context;
let readyAt;
try {
  context = await observe({ action: 'environment' }); assert.ok(!context.error, JSON.stringify(context));
  const fixtureTool=await prepareMediaTool();
  context.fixtureTool={status:'measured',bytes:fixtureTool.extractedBytes,sha256:fixtureTool.sha256,version:fixtureTool.version,downloadBytes:fixtureTool.downloadBytes,associatedPayloadBytes:fixtureTool.associatedPayloadBytes,basis:'Exact elected fixture helper executable logical bytes; download and associated payloads separate; not a bundled product dependency'};
  context = { ...context, os: os.version() + ' ' + os.release(), cpu: [...new Set(os.cpus().map(c => c.model))], logicalProcessors: os.cpus().length, installedMemoryBytes: os.totalmem(), hardwareBasis: 'direct node:os/native OS queries; visible memory, not a physical-DIMM inventory' };
  readyAt = performance.now();
  console.log('Native measurement environment ready');
  for (let trial = 0; trial < 3; trial++) {
    const settings = await mkdtemp(path.join(root, '.local/measurement-settings-'));
    const history = await mkdtemp(path.join(root, '.local/measurement-history-'));
    const profile = await mkdtemp(path.join(root, '.local/measurement-webview-')); profiles.push(profile);
    const port = await availableLoopbackPort(); const origin = 'http://127.0.0.1:' + port; const nonce=randomUUID();
    const notBefore = new Date().toISOString(); const began = performance.now();
    const child = spawn(binary, [directory], { cwd: root, env: { ...environment, TAURI_WEBDRIVER_PORT: String(port), GALLERY_TEST_DRIVER_NONCE:nonce, GALLERY_TEST_SETTINGS_DIR: settings, GALLERY_TEST_HISTORY_DIR: history, WEBVIEW2_USER_DATA_FOLDER: profile }, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    const observation=observeChild(child); let session;
    const request = async (route, body, method = body === undefined ? 'GET' : 'POST') => {
      const response = await fetch(origin + route, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
      const result = await response.json(); if (!response.ok || result.value?.error) throw new Error(result.value?.message ?? 'Driver HTTP ' + response.status); return result.value;
    };
    const js = (script, args = []) => request('/session/' + session + '/execute/sync', { script, args });
    const snap = () => js('return await window.__TAURI_INTERNALS__.invoke("snapshot")');
    const click = text => js('const e=[...document.querySelectorAll("button")].find(e=>e.textContent.trim()===arguments[0]||e.getAttribute("aria-label")===arguments[0]);if(!e)throw Error("Missing button "+arguments[0]);e.click();return true;', [text]);
    const select = (id, value) => js('const e=document.getElementById(arguments[0]);if(!e)throw Error("Missing selector");e.value=arguments[1];e.dispatchEvent(new Event("change",{bubbles:true}));return true;', [id, value]);
    const open = name => js('const e=[...document.querySelectorAll(".media-card")].find(e=>e.dataset.name===arguments[0]);if(!e)throw Error("Missing card");e.querySelector("button").click();return true;', [name]);
    const measure = async (name, action) => { const start = performance.now(); const result = await action(); samples[name].push(performance.now() - start); return result; };
    const resource = async () => label === 'baseline' ? { status: 'unavailable', basis: 'unchanged baseline has no native resource counter action' } : js('return await window.__TAURI_INTERNALS__.invoke("test_discovery_control",{action:"s011_resource_snapshot",config:null})');
    try {
      session = await readyDriver(child,origin,observation,15000,{nonce,context:{operation:'native-measurement',label,trial:trial+1,edition:'full',source}});
      await until(() => js('return document.querySelectorAll(".media-card").length===12 && [...document.querySelectorAll(".media-card img")].some(i=>i.naturalWidth>0)'), 'First usable rendered cards');
      samples.startup.push(performance.now() - began);
      console.log(label + ' trial ' + (trial + 1) + ': first usable native cards');
      await request('/session/' + session + '/window/rect', { width: 1200, height: 840 });
      const before = await observe({ action: 'memory', rootPid: child.pid, notBefore }); memory.push({ trial, phase: 'before exercise', ...before });
      assert.ok(!before.error && before.native?.processes > 0, JSON.stringify(before));
      if (await js('return !document.getElementById("media-sort")')) await click('Show controls');
      if (await js('return !document.getElementById("font-scale")')) await click('Settings');
      await select('page-size', '48');
      const browser = await js('return {userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},visibility:document.visibilityState}');
      await measure('discovery', async () => {
        const ack = await js('return await window.__TAURI_INTERNALS__.invoke("open_gallery",{path:arguments[0]})', [directory]);
        await until(async () => { const s = await snap(); return s.discovery.id === ack.discovery.id && s.status === 'complete'; }, 'Warm requested discovery');
        await until(() => js('return document.querySelectorAll(".media-card").length===12'), 'Warm rendered cards');
      });
      const scroll = await measure('scroll', () => js('const scroller=document.querySelector(".bb-app-frame__scroll");const gaps=[];let last=null;let peak=0;let sources=0;await new Promise(resolve=>{let n=0;const tick=t=>{if(document.visibilityState!=="visible")throw Error("Measurement window hidden");if(last!==null)gaps.push(t-last);last=t;const g=document.querySelector(".media-grid");peak=Math.max(peak,Number(g?.dataset.activeLoads||0));sources=Math.max(sources,document.querySelectorAll(".media-grid img[src],.media-grid video[src]").length);scroller.scrollTop=(++n/60)*Math.max(0,scroller.scrollHeight-scroller.clientHeight);n<60?requestAnimationFrame(tick):resolve();};requestAnimationFrame(tick);});scroller.scrollTop=0;return {gaps,peakPreparation:peak,maximumAttachedSources:sources,pending:document.querySelector(".media-grid")?.dataset.pendingLoads??null};'));
      frames.push(...scroll.gaps);
      const current = await snap(); const expected = viewItems(current.items, 'all', 'size', 'desc').map(i => i.name);
      await measure('sortSizeDesc', async () => { await select('media-sort', 'size'); await select('media-direction', 'desc'); await until(() => js('return JSON.stringify([...document.querySelectorAll(".media-card")].map(e=>e.dataset.name))===JSON.stringify(arguments[0])', [expected]), 'Descending exact-byte order'); });
      await measure('filterImage', async () => { await select('media-filter', 'image'); await until(() => js('return document.querySelectorAll(".media-card").length===10'), 'Image filter'); });
      await measure('filterVideo', async () => { await select('media-filter', 'video'); await until(() => js('return document.querySelectorAll(".media-card").length===2'), 'Video filter'); });
      await open('clip audio.mp4');
      await until(() => js('return document.querySelector("dialog video")?.readyState>=1'), 'Focused video ready');
      const focus = await js('return {gallerySources:document.querySelectorAll(".media-grid img[src],.media-grid video[src]").length,focusedMedia:document.querySelectorAll("dialog video,dialog img").length}'); assert.equal(focus.gallerySources, 0);
      await measure('playback', async () => {
        await js('const v=document.querySelector("dialog video");v.loop=true;const b=[...document.querySelectorAll("dialog button")].find(e=>e.textContent.trim()==="Play");b.focus();return true;');
        await execute('C:/Program Files/PowerShell/7/pwsh.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(root, 'scripts/native-input.ps1'), '-AppProcessId', String(child.pid), '-Action', 'keys', '-Keys', '{ENTER}']);
        await until(() => js('return !document.querySelector("dialog video").paused && document.querySelector("dialog video").currentTime>0.1'), 'Advancing playback');
      });
      const seek = await measure('seek', () => js('const v=document.querySelector("dialog video");const start=performance.now();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error("seek timeout")),5000);v.addEventListener("seeked",()=>{clearTimeout(timer);resolve();},{once:true});v.currentTime=1.5;});return {rendererMilliseconds:performance.now()-start,videoFrameCallbackExposed:typeof v.requestVideoFrameCallback==="function"};'));
      await click('Close viewer'); await select('media-filter', 'all'); await select('media-sort', 'name'); await select('media-direction', 'asc');
      await until(() => js('return document.querySelectorAll(".media-card").length===12'), 'Restore gallery'); await open('image2.jpg');
      const metadata = await measure('metadataIPC', () => js('const s=await window.__TAURI_INTERNALS__.invoke("snapshot");const item=s.items.find(i=>i.name==="image2.jpg");const start=performance.now();const value=await window.__TAURI_INTERNALS__.invoke("inspect_metadata",{request:{sessionId:s.sessionId,itemId:item.id,itemRevision:item.revision,metadataRevision:s.metadataRevision}});return {rendererMilliseconds:performance.now()-start,ready:value.documents.some(d=>d.source==="full-name-meta"&&d.status==="ready")};'));
      assert.ok(metadata.ready);
      await measure('metadataRender', async () => {
        if (await js('return !document.querySelector(".metadata-inspector")')) await click('Information');
        await until(() => js('return document.querySelector(".metadata-document")?.dataset.metadataStatus==="ready"'), 'Attributable metadata document');
        await js('document.querySelector(".metadata-document details").open=true;return true;');
        await until(() => js('return document.querySelector(".metadata-inspector")?.textContent.includes("Synthetic measurement")'), 'Lazy nested metadata rendering');
      });
      const nativeResources = await resource();
      await click('Close viewer');
      const after = await observe({ action: 'memory', rootPid: child.pid, notBefore }); memory.push({ trial, phase: 'after exercise', ...after });
      runs.push({ trial, browser, scroll, focus, seek, metadata, nativeResources, cache: 'first launch fresh application/WebView profile; discovery and interactions warm within that session; OS cache unknown' });
      console.log('PASS ' + label + ' native measurement trial ' + (trial + 1));
    } catch(error) {
      await writeFile(output+'.failure.json',JSON.stringify({result:'fail',label,trial:trial+1,edition:'full',source,origin,driver:observation(),failure:error.stack,terminalFinished:new Date().toISOString()},null,2)+'\n');
      throw error;
    } finally {
      if (session) await request('/session/' + session, undefined, 'DELETE').catch(() => {});
      await stopOwnedChild(child);
    }
  }
  assert.deepEqual(await inventory(directory), records, 'Measurement mutated source corpus');
  const bytes = await readFile(binary);
  const runtime = memory.find(m => m.runtime)?.runtime ?? { status: 'unavailable', basis: 'runtime directory not accessible' };
  const profileSizes = await Promise.all(profiles.map(logicalBytes));
  const profileSize = { bytes: profileSizes.reduce((n, p) => n + p.bytes, 0), omitted: profileSizes.reduce((n, p) => n + p.omitted, 0) };
  const observationFinished = performance.now();
  const report = validateMeasurement({
    formatVersion: 1, label, preparationStarted, terminalFinished: new Date().toISOString(), preparationSeconds: (readyAt - measurementStarted) / 1000, observationSeconds: (observationFinished - readyAt) / 1000, combinedSeconds: (observationFinished - measurementStarted) / 1000, artifact: { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, flavor: 'debug/native-tests', identityBasis: 'exact measured binary; qualification source is bound by the parent receipt' },
    fixture: { candidates: 12, records, totalBytes: records.reduce((n, r) => n + r.bytes, 0), composition: { images: 10, videos: 2, clips: 'synthetic320x180 H.264/yuv420p12fps,4s with AAC stereo and3s silent', stills: prepared.expected.stills, exceptions: 'one unsupported TIFF and one deliberately damaged JPEG', sidecar: 'small nested exact-number JSON' } },
    environment: { ...context, os: context.os, cache: 'fresh application/WebView profile; previously generated/hashed fixture; OS cache unknown' },
    operations: Object.fromEntries(operations.map(name => [name, summarize(samples[name])])), frames: summarize(frames), memory, runs,
    footprints: { download: { status: 'unavailable', basis: 'no published product package' }, extractedDistribution: { status: 'unavailable', basis: 'Not measured by browsing trials; normal proof archives have separate exact payload inventories' }, developmentExecutable: { status: 'measured', bytes: bytes.length, basis: 'debug native-test executable only' }, requiredRuntime: runtime, optionalProductTools: { status: 'not-applicable', basis: 'No helper bundled or selected for these browsing trials; the maintainer fixture helper is measured separately' }, thumbnailCache: { status: 'unavailable', basis: 'Browsing trials do not inventory machine-local thumbnail storage; separate preparation acceptance records generated cache output' }, profileCache: { status: 'measured', bytes: profileSize.bytes, omittedEntries: profileSize.omitted, complete: profileSize.omitted === 0, basis: 'observed logical bytes of three isolated WebView profiles after app shutdown; runtime may still finalize temporary files; omissions explicit; excludes settings/history' }, fixtureTool: context.fixtureTool },
    limitations: ['Three trials are observations, not a throughput/scale guarantee.', 'Driver round trips and polling are included in operation elapsed times; named renderer sub-timings exclude those portions.', 'Frame samples are visible rAF callback gaps, not compositor FPS or actual frame presentation.', 'Memory samples are before/after endpoints and may miss peaks. Summed working sets can double-count shared pages.', 'Attached elements and preparation slots are observable proxies, not exact browser hardware decoder/read counts.', 'Native Linux/macOS and physical storage/cache/provider qualification are separate evidence.'],
  });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  const concise = ({ count, median, p95, maximum }) => ({ count, median, p95, maximum });
  console.log(JSON.stringify({ label, operations: Object.fromEntries(Object.entries(report.operations).map(([key, value]) => [key, concise(value)])), frames: concise(report.frames), output }, null, 2));
} finally { await observe({ action: 'stop' }).catch(() => {}); observer.stdin.end(); observer.kill(); lines.close(); }
