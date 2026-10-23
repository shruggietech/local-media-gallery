// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { access, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, node, cargo, exportInterface, execute, environment } from './run.mjs';
import { sourceIdentity } from './provenance.mjs';
import { qualification } from './qualification.mjs';

if (process.platform !== 'win32') throw new Error('This native qualification election is Windows-first.');
const binaryDirectory = path.join(root, '.local/bin');
const npm = process.env.npm_execpath ?? path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
let source;
const commands = ['check', 'test', 'check:docs', 'check:app', 'check:site', 'test:site'];
const record = await qualification({
  identify: async () => { source = await sourceIdentity(); return { source, evidence: 'Windows x64 native and rendered website' }; },
  prepare: async () => {
    await mkdir(binaryDirectory, { recursive: true });
    if (process.env.GALLERY_SITE_BROWSER) await access(process.env.GALLERY_SITE_BROWSER);
    else await node(path.join(root, 'node_modules/playwright/cli.js'), ['install', 'chromium', '--no-shell']);
    await exportInterface();
    await node(path.join(root, 'scripts/build-site.mjs'));
    await node(path.join(root, 'scripts/create-fixture.mjs'));
    await cargo(['build', '--locked', '-p', 'local-media-gallery', '--features', 'native-tests']);
    await copyFile(path.join(root, 'target/debug/local-media-gallery.exe'), path.join(binaryDirectory, 'local-media-gallery-native-tests.exe'));
    await cargo(['build', '--locked', '-p', 'local-media-gallery']);
    await copyFile(path.join(root, 'target/debug/local-media-gallery.exe'), path.join(binaryDirectory, 'local-media-gallery.exe'));
    await cargo(['test', '--locked', '--workspace', '--no-run']);
    await cargo(['clippy', '--locked', '--workspace', '--all-targets', '--', '-D', 'warnings']);
    assert.deepEqual(await sourceIdentity(), source, 'Preparation changed qualified source');
  },
  steps: [
    ...commands.map(name => ({ name: 'npm run ' + name, run: () => execute(process.execPath, [npm, 'run', name]) })),
    { name: 'native shell argument tests', run: () => cargo(['test', '--locked', '-p', 'local-media-gallery']) },
    { name: 'Windows WebView2 functional acceptance', run: () => node(path.join(root, 'scripts/test-native.mjs'), [], { env: { ...environment, GALLERY_TEST_BINARY: path.join(binaryDirectory, 'local-media-gallery-native-tests.exe') } }) },
    { name: 'normal binary automation exclusion', run: () => node(path.join(root, 'scripts/test-normal.mjs')) },
    { name: 'source provenance and unchanged governed kit', run: async () => { assert.deepEqual(await sourceIdentity(), source); await execute(process.execPath, [npm, 'run', 'brand:verify']); await execute('git', ['diff', '--check']); } },
  ],
});
record.version = '0.0.0'; record.source = source;
if (record.result === 'pass') {
  record.native = JSON.parse(await readFile(path.join(root, '.local/native-results.json')));
  record.normal = JSON.parse(await readFile(path.join(root, '.local/normal-results.json')));
  record.site = JSON.parse(await readFile(path.join(root, '.local/site-artifact.json')));
  record.browser = JSON.parse(await readFile(path.join(root, '.local/site-browser.json')));
}
await writeFile(path.join(root, '.local/qualification.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
if (record.result !== 'pass') process.exitCode = 1;
