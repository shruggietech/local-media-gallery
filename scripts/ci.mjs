// SPDX-License-Identifier: Apache-2.0
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { root, node, cargo, execute, exportInterface, buildEditions } from './run.mjs';
import { qualification } from './qualification.mjs';
import { sourceIdentity } from './provenance.mjs';
import assert from 'node:assert/strict';

const scope = process.argv[2];
const productScopes=['product-windows','product-linux','product-macos'];
const isProduct=productScopes.includes(scope);
let binaries;
if (!['repository', ...productScopes, 'website'].includes(scope)) throw new Error('Unknown CI scope');
const npm =
  process.env.npm_execpath ?? path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const command = (name) => () => execute(process.execPath, [npm, 'run', name]);
await mkdir(path.join(root, '.local'), { recursive: true });
const record = await qualification({
  identify: async () => {
    const revision = (
      await promisify(execFile)('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true })
    ).stdout.trim();
    return {
      revision,
      source: await sourceIdentity(),
      scope,
      evidence:
        isProduct
          ? 'Hosted native compile/unit/frontend/brand and extracted CLI proof, rendered browsing is separately elected'
          : scope,
    };
  },
  prepare: async (context) => {
    // Workflow dependency installation is included in preparation accounting below.
    if (isProduct) {
      assert.equal(process.platform,{'product-windows':'win32','product-linux':'linux','product-macos':'darwin'}[scope]);
      await node(path.join(root, 'scripts/prepare.mjs'));
      await exportInterface();
      await cargo(['test', '--locked', '--workspace', '--no-run']);
      binaries=await buildEditions();
      await node(path.join(root,'scripts/build-proof.mjs'),['--full',binaries.full,'--lite',binaries.lite]);
      await cargo(['test','--locked','-p','local-media-gallery','--features','lite','--no-run']);
      await cargo(['clippy', '--locked', '--workspace', '--all-targets', '--', '-D', 'warnings']);
    }
    if (scope === 'website') {
      if (process.env.GALLERY_SITE_BROWSER) await access(process.env.GALLERY_SITE_BROWSER);
      else
        await node(path.join(root, 'node_modules/playwright/cli.js'), ['install', 'chromium', '--no-shell']);
      await command('build:site')();
    }
    assert.deepEqual(await sourceIdentity(), context.source, 'Preparation changed qualified source');
  },
  steps: [...(scope === 'repository'
    ? ['check', 'test', 'check:docs']
    : scope === 'website'
      ? ['check:site', 'test:site']
      : ['check:app']
  ).map((name) => ({ name: `npm run ${name}`, run: command(name) })),
  ...(isProduct ? [{
    name: 'native shell and persistent-state unit tests',
    run: () => cargo(['test', '--locked', '-p', 'local-media-gallery']),
  }, {name:'Lite shell and state unit tests',run:()=>cargo(['test','--locked','-p','local-media-gallery','--features','lite'])}, {name:'Normal Full/Lite extracted native proof',run:()=>node(path.join(root,'scripts/test-proof.mjs'))}] : [])],
});
if (process.env.CI_PREPARATION_STARTED) {
  const start = new Date(process.env.CI_PREPARATION_STARTED).getTime();
  if (!Number.isFinite(start) || start > new Date(record.preparationStarted).getTime())
    throw new Error('Invalid workflow preparation timestamp');
  record.preparationStarted = new Date(start).toISOString();
  record.preparationSeconds =
    ((record.readinessVerified
      ? new Date(record.readinessVerified).getTime()
      : new Date(record.terminalFinished).getTime()) -
      start) /
    1000;
  record.combinedSeconds = (new Date(record.terminalFinished).getTime() - start) / 1000;
}
record.artifacts = [];
if (record.result === 'pass' && scope === 'website')
  record.artifacts = JSON.parse(await readFile(path.join(root, '.local/site-artifact.json'))).files;
if(record.result==='pass'&&isProduct){
  record.proof=JSON.parse(await readFile(path.join(root,'.local/proof-results.json')));
  assert.deepEqual(record.proof.source,record.context.source);assert.equal(record.proof.revision,record.context.revision);
  for(const proof of record.proof.records)record.artifacts.push({path:proof.archive.path,bytes:proof.archive.bytes,sha256:proof.archive.sha256,edition:proof.edition});
}

await writeFile(path.join(root, '.local', `ci-${scope}.json`), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
if (record.result !== 'pass') process.exitCode = 1;
