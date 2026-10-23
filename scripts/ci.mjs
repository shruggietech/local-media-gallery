// SPDX-License-Identifier: Apache-2.0
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { root, node, cargo, execute, exportInterface } from './run.mjs';
import { qualification } from './qualification.mjs';
import { sourceIdentity } from './provenance.mjs';
import { hash } from './site-content.mjs';
import assert from 'node:assert/strict';

const scope = process.argv[2];
if (!['repository', 'product-windows', 'website'].includes(scope)) throw new Error('Unknown CI scope');
const npm = process.env.npm_execpath ?? path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const command = name => () => execute(process.execPath, [npm, 'run', name]);
await mkdir(path.join(root, '.local'), { recursive: true });
const record = await qualification({
  identify: async () => {
    const revision = (await promisify(execFile)('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true })).stdout.trim();
    return { revision, source: await sourceIdentity(), scope, evidence: scope === 'product-windows' ? 'Hosted Windows compile/unit/frontend/brand, not interactive native acceptance' : scope };
  },
  prepare: async context => {
    // Workflow dependency installation is included in preparation accounting below.
    if (scope === 'product-windows') {
      await node(path.join(root, 'scripts/prepare.mjs'));
      await exportInterface();
      await cargo(['test', '--locked', '--workspace', '--no-run']);
      await cargo(['build', '--locked', '-p', 'local-media-gallery']);
      await cargo(['clippy', '--locked', '--workspace', '--all-targets', '--', '-D', 'warnings']);
    }
    if (scope === 'website') {
      await command('build:site')();
      if (process.env.GALLERY_SITE_BROWSER) await access(process.env.GALLERY_SITE_BROWSER);
      else await node(path.join(root, 'node_modules/playwright/cli.js'), ['install', 'chromium', '--no-shell']);
    }
    assert.deepEqual(await sourceIdentity(), context.source, 'Preparation changed qualified source');
  },
  steps: (scope === 'repository' ? ['check', 'test', 'check:docs'] : scope === 'website' ? ['check:site', 'test:site'] : ['check:app']).map(name => ({ name: `npm run ${name}`, run: command(name) })),
});
if (process.env.CI_PREPARATION_STARTED) {
  const start = new Date(process.env.CI_PREPARATION_STARTED).getTime();
  if (!Number.isFinite(start) || start > new Date(record.preparationStarted).getTime()) throw new Error('Invalid workflow preparation timestamp');
  record.preparationStarted = new Date(start).toISOString();
  record.preparationSeconds = ((record.readinessVerified ? new Date(record.readinessVerified).getTime() : new Date(record.terminalFinished).getTime()) - start) / 1000;
  record.combinedSeconds = (new Date(record.terminalFinished).getTime() - start) / 1000;
}
record.artifacts = [];
if (record.result === 'pass' && scope === 'website') record.artifacts = JSON.parse(await readFile(path.join(root, '.local/site-artifact.json'))).files;
if (record.result === 'pass' && scope === 'product-windows') {
  for (const name of (await readdir(path.join(root, 'target/debug'))).filter(name => name === 'local-media-gallery.exe')) {
    const bytes = await readFile(path.join(root, 'target/debug', name)); record.artifacts.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
  }
}
await writeFile(path.join(root, '.local', `ci-${scope}.json`), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
if (record.result !== 'pass') process.exitCode = 1;
