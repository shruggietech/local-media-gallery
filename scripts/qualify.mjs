// SPDX-License-Identifier: Apache-2.0
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
const headless=process.argv.includes('--headless');
if(!headless)requireIsolatedDesktop();
import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, node, cargo, exportInterface, execute, environment, buildEditions } from './run.mjs';
import { sourceIdentity } from './provenance.mjs';
import {productVersion} from './product-version.mjs';
import { qualification } from './qualification.mjs';

if (process.platform !== 'win32') throw new Error('This native qualification election is Windows-first.');
const binaryDirectory = path.join(root, '.local/bin');
const npm = process.env.npm_execpath ?? path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
let source;
let nativeBinaries;let normalBinaries;
const commands = ['check', 'test', 'check:docs', 'check:app', 'check:site', 'test:site'];
const record = await qualification({
  identify: async () => { source = await sourceIdentity(); return { source, evidence: headless?'Windows headless repository/site/unit/normal CLI qualification; interactive acceptance is mandatory on isolated CI':'Isolated Windows native and rendered website' }; },
  prepare: async () => {
    await mkdir(binaryDirectory, { recursive: true });
    if (process.env.GALLERY_SITE_BROWSER) await access(process.env.GALLERY_SITE_BROWSER);
    else await node(path.join(root, 'node_modules/playwright/cli.js'), ['install', 'chromium', '--no-shell']);
    await exportInterface();
    await node(path.join(root, 'scripts/build-site.mjs'));
    await node(path.join(root, 'scripts/create-fixture.mjs'));
    await node(path.join(root,'scripts/create-runtime-fixture.mjs'));
    if(!headless)await node(path.join(root,'scripts/prepare-screen-reader.mjs'));
    nativeBinaries=await buildEditions({nativeTests:true});
    normalBinaries=await buildEditions();
    await node(path.join(root,'scripts/build-proof.mjs'),['--full',normalBinaries.full,'--lite',normalBinaries.lite]);
    await cargo(['test', '--locked', '--workspace', '--no-run']);
    await cargo(['clippy', '--locked', '--workspace', '--all-targets', '--', '-D', 'warnings']);
    await cargo(['clippy','--locked','-p','local-media-gallery','--features','native-tests','--all-targets','--','-D','warnings']);
    assert.deepEqual(await sourceIdentity(), source, 'Preparation changed qualified source');
  },
  steps: [
    ...commands.map(name => ({ name: 'npm run ' + name, run: () => execute(process.execPath, [npm, 'run', name]) })),
    { name: 'native shell argument tests', run: () => cargo(['test', '--locked', '-p', 'local-media-gallery']) },
    { name: 'Lite shell and state tests', run: () => cargo(['test','--locked','-p','local-media-gallery','--features','lite']) },
    { name: 'Windows WebView2 functional acceptance', run: () => node(path.join(root, 'scripts/test-native.mjs'), [], { env: { ...environment, GALLERY_TEST_BINARY: path.join(binaryDirectory, 'local-media-gallery-native-tests.exe') } }) },
    { name: 'Windows rendered optional preparation and diagnostic export', run:()=>node(path.join(root,'scripts/test-preparation.mjs'),[],{env:{...environment,GALLERY_TEST_BINARY:nativeBinaries.full}}) },
    { name: 'Native preparation authority and cancellation regressions',run:()=>cargo(['test','--locked','-p','gallery-core','--features','discovery-tests','--test','preparation']) },
    { name: 'Windows Full/Lite native launch contracts', run: () => node(path.join(root,'scripts/test-launch.mjs'),['--full',nativeBinaries.full,'--lite',nativeBinaries.lite]) },
    { name: 'Normal Full/Lite extracted archive acceptance', run: () => node(path.join(root,'scripts/test-proof.mjs')) },
    { name: 'Full/Lite native media and accessibility',run:()=>node(path.join(root,'scripts/test-runtime-platform.mjs')) },
    { name: 'Windows native operation and resource measurements', run: async () => {
      await node(path.join(root, 'scripts/measure-native.mjs'), ['--binary', path.join(binaryDirectory, 'local-media-gallery-native-tests.exe'), '--label', 'adaptive', '--output', path.join(root, '.local/measurement.json')]);
      const measured = JSON.parse(await readFile(path.join(root, '.local/measurement.json')));
      const native = JSON.parse(await readFile(path.join(root, '.local/native-results.json')));
      assert.equal(measured.label, 'adaptive');
      assert.equal(measured.artifact.sha256, native.binarySha256, 'Measurements and rendered acceptance must identify the same native binary');
    } },
    { name: 'normal binary automation exclusion', run: () => node(path.join(root, 'scripts/test-normal.mjs')) },
    { name: 'source provenance and unchanged governed kit', run: async () => { assert.deepEqual(await sourceIdentity(), source); await execute(process.execPath, [npm, 'run', 'brand:verify']); await execute('git', ['diff', '--check']); } },
  ].filter(step=>!headless||!['Full/Lite native media and accessibility','Windows WebView2 functional acceptance','Windows rendered optional preparation and diagnostic export','Windows Full/Lite native launch contracts','Windows native operation and resource measurements','normal binary automation exclusion'].includes(step.name)),
});
record.version = productVersion; record.source = source;
if(record.result==='pass'){record.proof=JSON.parse(await readFile(path.join(root,'.local/proof-results.json')));assert.deepEqual(record.proof.source,source);record.site=JSON.parse(await readFile(path.join(root,'.local/site-artifact.json')));record.browser=JSON.parse(await readFile(path.join(root,'.local/site-browser.json')));}
if (record.result === 'pass' && !headless) {
  record.runtime=JSON.parse(await readFile(path.join(root,'.local/runtime-results.json')));assert.equal(record.runtime.result,'pass');assert.deepEqual(record.runtime.source,source);
  record.native = JSON.parse(await readFile(path.join(root, '.local/native-results.json')));
  record.preparation=JSON.parse(await readFile(path.join(root,'.local/preparation-results.json')));
  assert.equal(record.preparation.binarySha256,record.native.binarySha256);
  record.measurement = JSON.parse(await readFile(path.join(root, '.local/measurement.json')));
  record.launch = JSON.parse(await readFile(path.join(root, '.local/launch-results.json')));
  record.proof = JSON.parse(await readFile(path.join(root, '.local/proof-results.json')));
  assert.deepEqual(record.proof.source,source);
  assert.equal(record.launch.binaries.full,record.native.binarySha256);
  record.normal = JSON.parse(await readFile(path.join(root, '.local/normal-results.json')));
  for (const proof of record.proof.records) {
    assert.equal(proof.binary.sha256, record.normal.editions.find(item => item.edition === proof.edition)?.sha256);
    const binary = nativeBinaries[proof.edition];
    const { createHash } = await import('node:crypto');
    assert.equal(record.launch.binaries[proof.edition], createHash('sha256').update(await readFile(binary)).digest('hex'));
  }
  record.site = JSON.parse(await readFile(path.join(root, '.local/site-artifact.json')));
  record.browser = JSON.parse(await readFile(path.join(root, '.local/site-browser.json')));
}
record.scope=headless?'headless':'isolated-native';
await writeFile(path.join(root,headless?'.local/qualification-headless.json':'.local/qualification.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
if (record.result !== 'pass') process.exitCode = 1;
