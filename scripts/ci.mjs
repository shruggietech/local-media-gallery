// SPDX-License-Identifier: Apache-2.0
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { root, node, cargo, execute, exportInterface, buildEditions, environment } from './run.mjs';
import { qualification } from './qualification.mjs';
import { sourceIdentity } from './provenance.mjs';
import assert from 'node:assert/strict';
import {digest,validateRuntimeReceipt} from './runtime-evidence.mjs';
import {preparePython} from './python-environment.mjs';

const scope = process.argv[2];
if(scope==='macos-packages'){await import('./ci-macos-packages.mjs');process.exit(process.exitCode??0);}
if(scope==='windows-packages'){await import('./ci-windows-packages.mjs');process.exit(process.exitCode??0);}
const productScopes=['product-windows','product-linux','product-macos'];
const isProduct=productScopes.includes(scope);
let binaries;
let nativeBinaries;
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
          ? 'Hosted native units, extracted normal CLI archives and isolated system-WebView media/accessibility qualification'
          : scope,
    };
  },
  prepare: async (context) => {
    // Workflow dependency installation is included in preparation accounting below.
    if(scope==='repository')await preparePython(['Pillow']);
    if (isProduct) {
      assert.equal(process.platform,{'product-windows':'win32','product-linux':'linux','product-macos':'darwin'}[scope]);
      await node(path.join(root, 'scripts/prepare.mjs'));
      await node(path.join(root,'scripts/create-fixture.mjs'));
      await exportInterface();
      await cargo(['test', '--locked', '--workspace', '--no-run']);
      if(process.platform==='linux')await cargo(['test','--release','--locked','-p','gallery-core','--test','glib_variant_iter','--no-run']);
      binaries=await buildEditions();
      await node(path.join(root,'scripts/build-proof.mjs'),['--full',binaries.full,'--lite',binaries.lite]);
      await cargo(['test','--locked','-p','local-media-gallery','--features','lite','--no-run']);
      await cargo(['clippy', '--locked', '--workspace', '--all-targets', '--', '-D', 'warnings']);
      await node(path.join(root,'scripts/create-runtime-fixture.mjs'));
      if(process.platform==='win32')await node(path.join(root,'scripts/prepare-screen-reader.mjs'));
      nativeBinaries=await buildEditions({nativeTests:true});
      await cargo(['clippy','--locked','-p','local-media-gallery','--features','native-tests','--all-targets','--','-D','warnings']);
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
  ...(scope==='product-linux'?[{name:'Optimized corrected GLib string iterator',run:()=>cargo(['test','--release','--locked','-p','gallery-core','--test','glib_variant_iter'])}]:[]),
  ...(isProduct ? [{
    name: 'native shell and persistent-state unit tests',
    run: () => cargo(['test', '--locked', '-p', 'local-media-gallery']),
  }, {name:'Lite shell and state unit tests',run:()=>cargo(['test','--locked','-p','local-media-gallery','--features','lite'])}, {name:'Preparation native authority/cancellation regressions',run:()=>cargo(['test','--locked','-p','gallery-core','--features','discovery-tests','--test','preparation'])}, {name:'Normal Full/Lite extracted native proof',run:()=>node(path.join(root,'scripts/test-proof.mjs'))},
  {name:'Isolated Full/Lite native media and accessibility',run:()=>node(path.join(root,'scripts/test-runtime-platform.mjs'))},
  ...(scope==='product-windows'?[
   {name:'Owned driver and unchanged baseline listener regressions',run:()=>execute(process.execPath,['--test','tests/native-driver-lifecycle.test.mjs'])},
   {name:'Existing Windows rendered browsing acceptance',run:()=>node(path.join(root,'scripts/test-native.mjs'),[],{env:{...environment,GALLERY_TEST_BINARY:nativeBinaries.full}})},
   {name:'Existing Windows preparation and diagnostic export',run:()=>node(path.join(root,'scripts/test-preparation.mjs'),[],{env:{...environment,GALLERY_TEST_BINARY:nativeBinaries.full}})},
   {name:'Existing Windows Full/Lite launch contracts',run:()=>node(path.join(root,'scripts/test-launch.mjs'),['--full',nativeBinaries.full,'--lite',nativeBinaries.lite])},
   {name:'Existing Windows operation and resource measurements',run:()=>node(path.join(root,'scripts/measure-native.mjs'),['--binary',nativeBinaries.full,'--label','adaptive','--output',path.join(root,'.local/measurement.json')])},
   {name:'Normal Windows GUI and automation exclusion',run:()=>node(path.join(root,'scripts/test-normal.mjs'))},
  ]:[])] : [])],
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
  record.runtime=JSON.parse(await readFile(path.join(root,'.local/runtime-results.json')));
  assert.equal(record.runtime.result,'pass');assert.deepEqual(record.runtime.source,record.context.source);
  assert.deepEqual(record.runtime.records.map(r=>r.edition).sort(),['full','lite']);
  const fixture=JSON.parse(await readFile(path.join(root,'.local/runtime-fixture.json')));
  for(const entry of record.runtime.records)validateRuntimeReceipt(entry,{source:record.context.source,binarySha256:digest(await readFile(nativeBinaries[entry.edition])),fixtureSha256:fixture.sha256,edition:entry.edition,platform:process.platform});
  record.proof=JSON.parse(await readFile(path.join(root,'.local/proof-results.json')));
  assert.deepEqual(record.proof.source,record.context.source);assert.equal(record.proof.revision,record.context.revision);
  for(const entry of record.runtime.records){const proof=record.proof.records.find(p=>p.edition===entry.edition);assert.ok(proof);entry.normalProof={targetTriple:proof.targetTriple,binary:proof.binary,archive:proof.archive};}
  await writeFile(path.join(root,'.local/runtime-results.json'),JSON.stringify(record.runtime,null,2)+'\n');
  for(const proof of record.proof.records)record.artifacts.push({path:proof.archive.path,bytes:proof.archive.bytes,sha256:proof.archive.sha256,edition:proof.edition});
}

await writeFile(path.join(root, '.local', `ci-${scope}.json`), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
if (record.result !== 'pass') process.exitCode = 1;
