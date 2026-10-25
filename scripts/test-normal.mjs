// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root, execute, environment } from './run.mjs';

const binary = path.join(root, '.local/bin/local-media-gallery.exe');
const call = promisify(execFile);
const version = await call(binary, ['--version'], { windowsHide: true });
assert.equal(version.stdout.trim(), 'Local Media Gallery 0.0.0');
const help = await call(binary, ['--help'], { windowsHide: true });
assert.ok(help.stdout.includes('[DIRECTORY]'));
await assert.rejects(call(binary, ['--unknown-option'], { windowsHide: true }), error => error.code === 2);
const port = 55000 + Math.floor(Math.random() * 5000);
const binaryBytes=await readFile(binary);
for(const name of ['GALLERY_TEST_SETTINGS_DIR','GALLERY_TEST_HISTORY_DIR','test_discovery_control','s011_resource_snapshot','Unknown profile read test action.','Synthetic directory iterator failure','Synthetic requested root failure','Unknown metadata test action.']) assert.equal(binaryBytes.includes(Buffer.from(name)),false,'Private state redirection must be absent from normal binaries');
const child = spawn(binary, [], { cwd: root, windowsHide: true, shell: false, stdio: 'ignore', env: { ...environment, TAURI_WEBDRIVER_PORT: String(port) } });
child.on('error', error => { throw error; });
try {
  await new Promise(resolve => setTimeout(resolve, 2000));
  assert.equal(child.exitCode, null);
  await execute('C:/Program Files/PowerShell/7/pwsh.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(root, 'scripts/native-input.ps1'), '-AppProcessId', String(child.pid), '-Action', 'window']);
  await assert.rejects(fetch(`http://127.0.0.1:${port}/status`, { signal: AbortSignal.timeout(1000) }));
  await writeFile(path.join(root, '.local/normal-results.json'), JSON.stringify({ finished: new Date().toISOString(), sha256: createHash('sha256').update(await readFile(binary)).digest('hex'), checks: ['normal native window', '--help', '--version', 'invalid option exit 2', 'native test listener absent', 'private settings/history redirection absent', 'discovery barriers and failpoints absent', 'selection startup without history writes'] }, null, 2) + '\n');
  console.log('PASS default-feature native application and automation-listener exclusion.');
} finally { child.kill(); }
