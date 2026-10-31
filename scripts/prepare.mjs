// SPDX-License-Identifier: Apache-2.0
import {prepareCargoDependencies} from './cargo-readiness.mjs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { root, execute } from './run.mjs';
import {prepareMediaTool} from './prepare-media-tool.mjs';
import {preparePython} from './python-environment.mjs';

const directory = path.join(root, '.local');
await mkdir(directory, { recursive: true });
const python = await preparePython();
if (process.platform === 'win32' && process.arch === 'x64') {
  const name = 'node-v24.11.0-win-x64.zip';
  const tools = path.join(directory, 'tools');
  const executable = path.join(tools, 'node-v24.11.0-win-x64/node.exe');
  try { await access(executable); }
  catch {
    await mkdir(tools, { recursive: true });
    const base = 'https://nodejs.org/dist/v24.11.0/';
    const response = await fetch(base + 'SHASUMS256.txt');
    if (!response.ok) throw new Error('Unable to fetch official Node proof-tool checksums.');
    const expected = (await response.text()).split('\n').find(line => line.endsWith(`  ${name}`))?.split(' ')[0];
    if (!expected) throw new Error('Official proof-tool checksum absent.');
    const download = await fetch(base + name);
    if (!download.ok) throw new Error('Unable to fetch exact proof-tool runtime.');
    const bytes = Buffer.from(await download.arrayBuffer());
    if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error('Proof-tool runtime checksum mismatch.');
    const archive = path.join(tools, name); await writeFile(archive, bytes);
    await execute(python, ['-c', 'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', archive, tools]);
    await writeFile(path.join(tools, 'node-proof-runtime.json'), JSON.stringify({ version: '24.11.0', source: base + name, sha256: expected }, null, 2) + '\n');
  }
  await execute(executable, ['--version']);
} else if (!process.env.GALLERY_PROOF_NODE) {
  throw new Error('Set GALLERY_PROOF_NODE to a native Node 24.11.0 executable for brand proof verification on this host. Rendered acceptance remains separately elected.');
}
await prepareCargoDependencies();
await prepareMediaTool({download:true});
console.log('Preparation complete. Run builds and qualification separately.');
