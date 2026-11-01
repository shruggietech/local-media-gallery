import {publicSiteInputs} from './site-publication.mjs';
import {fileURLToPath} from 'node:url';
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { mkdir, copyFile, writeFile, readFile, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { root, node, environment } from './run.mjs';
import { createModel } from './site-content.mjs';
import { renderDiagrams } from './site-diagrams.mjs';
import { sourceIdentity } from './provenance.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export async function buildSite({base=root,manifest,releaseRecord,allowFixture=false,publicationProjection=false,outputRoot=path.join(root,'apps/site/out')}={}) {
if(manifest===undefined){const selection=await publicSiteInputs(base);manifest=selection.manifest;releaseRecord=selection.releaseRecord;await mkdir(path.join(root,'.local'),{recursive:true});await writeFile(path.join(root,'.local/site-publication.json'),JSON.stringify(selection)+'\n');}
const model = await createModel(base,manifest,{releaseRecord,allowFixture,publicationProjection});
const site = path.join(root, 'apps/site');
const publicRoot = path.resolve(site, 'public');
assert.equal(publicRoot, path.resolve(root, 'apps/site/public'));
await rm(publicRoot, { recursive: true, force: true });
await mkdir(path.join(site, 'src/generated'), { recursive: true });
await mkdir(path.join(site, 'public/search'), { recursive: true });
for (const file of model.raw) {
  const destination = path.join(site, 'public', file.path);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(base, file.source), destination);
}
for (const snapshot of model.manifest.snapshots) {
  await writeFile(
    path.join(site, 'public/search', `${snapshot.version}.json`),
    JSON.stringify(model.search.filter((entry) => entry.version === snapshot.version)) + '\n',
  );
}
await node(path.join(root, 'scripts/stage-brand.mjs'), ['site']);
await renderDiagrams(root, model);
await writeFile(path.join(site, 'src/generated/model.json'), JSON.stringify(model) + '\n');
await node(path.join(root, 'node_modules/eslint/bin/eslint.js'), ['src', '--config', 'eslint.config.mjs'], {
  cwd: site,
});
await node(
  path.join(root, 'node_modules/stylelint/bin/stylelint.mjs'),
  ['src/**/*.css', '--config', '../../brand/kit/enforcement/stylelint.config.json'],
  { cwd: site },
);
await node(path.join(root, 'node_modules/next/dist/bin/next'), ['build', '--webpack'], {
  cwd: site,
  env: environment,
});
for (const name of ['tsconfig.json', 'next-env.d.ts'])
  await writeFile(
    path.join(site, name),
    (await readFile(path.join(site, name), 'utf8')).replaceAll('\r\n', '\n'),
  );
await writeFile(path.join(site, 'out/.nojekyll'), '');
const revision = (
  await promisify(execFile)('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true })
).stdout.trim();
await writeFile(
  path.join(site, 'out/deployment.json'),
  JSON.stringify(
    {
      version: 1,
      publication: releaseRecord?{candidateId:releaseRecord.candidateId,releaseId:releaseRecord.publication.id,version:releaseRecord.version}:null,
      revision,
      source: await sourceIdentity(),
      versions: model.manifest.snapshots.map((snapshot) => snapshot.version),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Exported ${model.pages.length} reference pages and independent landing with ${model.raw.length} exact raw sources.`,
);

if(path.resolve(outputRoot)!==path.resolve(site,'out'))await cp(path.join(site,'out'),outputRoot,{recursive:true,errorOnExist:true,force:false});
return model;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildSite();
