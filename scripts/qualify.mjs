// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, node, cargo, exportInterface, execute, environment } from './run.mjs';
import { sourceIdentity } from './provenance.mjs';

if (process.platform !== 'win32') throw new Error('This native qualification election is Windows-first.');
const preparationStarted = new Date();
const binaryDirectory = path.join(root, '.local/bin');
await mkdir(binaryDirectory, { recursive: true });
await exportInterface();
await node(path.join(root, 'scripts/create-fixture.mjs'));
await cargo(['build', '--locked', '-p', 'local-media-gallery', '--features', 'native-tests']);
await copyFile(path.join(root, 'target/debug/local-media-gallery.exe'), path.join(binaryDirectory, 'local-media-gallery-native-tests.exe'));
await cargo(['build', '--locked', '-p', 'local-media-gallery']);
await copyFile(path.join(root, 'target/debug/local-media-gallery.exe'), path.join(binaryDirectory, 'local-media-gallery.exe'));
await cargo(['test', '--locked', '--workspace', '--no-run']);
await cargo(['clippy', '--locked', '--workspace', '--all-targets', '--', '-D', 'warnings']);
const source = await sourceIdentity();
const ready = new Date();
const steps = [];
const npm = process.env.npm_execpath ?? path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
async function step(name, operation) {
  if (Date.now() - ready.getTime() >= 885000) throw new Error('Qualification has reached its fifteen-second finalization reserve.');
  const started = new Date(); await operation();
  steps.push({ name, started: started.toISOString(), finished: new Date().toISOString(), result: 'pass' });
}
let failure;
try {
  await step('npm run check', () => execute(process.execPath, [npm, 'run', 'check']));
  await step('npm test', () => execute(process.execPath, [npm, 'test']));
  await step('npm run check:docs', () => execute(process.execPath, [npm, 'run', 'check:docs']));
  await step('npm run check:app', () => execute(process.execPath, [npm, 'run', 'check:app']));
  await step('native shell argument tests', () => cargo(['test', '--locked', '-p', 'local-media-gallery']));
  await step('Windows WebView2 functional acceptance', () => node(path.join(root, 'scripts/test-native.mjs'), [], { env: { ...environment, GALLERY_TEST_BINARY: path.join(binaryDirectory, 'local-media-gallery-native-tests.exe') } }));
  await step('normal binary automation exclusion', () => node(path.join(root, 'scripts/test-normal.mjs')));
  await step('source provenance and unchanged governed kit', async () => {
    assert.deepEqual(await sourceIdentity(), source);
    await execute(process.execPath, [npm, 'run', 'brand:verify']);
    await execute('git', ['diff', '--check']);
  });
} catch (error) { failure = error; }
const finished = new Date();
const seconds = (finished - ready) / 1000;
if (seconds > 900 && !failure) failure = new Error('Qualification exceeded its 900-second hard limit.');
const record = {
  version: '0.0.0', preparationStarted: preparationStarted.toISOString(), readinessVerified: ready.toISOString(), terminalFinished: finished.toISOString(),
  preparationSeconds: (ready - preparationStarted) / 1000, qualificationSeconds: seconds, combinedSeconds: (finished - preparationStarted) / 1000,
  targetSeconds: 660, hardLimitSeconds: 900, provisionalFinalizationReserveSeconds: 15,
  targetAdvisory: seconds > 660, result: failure ? 'fail' : 'pass', source, steps,
  failure: failure?.message ?? null,
};
if (!failure) {
  record.native = JSON.parse(await readFile(path.join(root, '.local/native-results.json')));
  record.normal = JSON.parse(await readFile(path.join(root, '.local/normal-results.json')));
}
await writeFile(path.join(root, '.local/qualification.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
if (failure) throw failure;
