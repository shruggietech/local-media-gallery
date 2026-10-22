// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyInstalled } from './sync-brand-kit.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skip = new Set(['.git', '.agents', '.local', 'node_modules', 'brand/kit', '.specify/scripts', '.specify/templates', '.specify/LICENSE']);
const textExtensions = new Set(['.md', '.json', '.mjs', '.cjs', '.ts', '.tsx', '.css', '.toml', '.rs', '.yml', '.yaml', '.ps1', '.py']);
const rootText = new Set(['AGENTS.md', 'LICENSE', 'NOTICE', 'VERSION', '.gitignore', '.gitattributes', '.editorconfig']);
const decoder = new TextDecoder('utf-8', { fatal: true });
let count = 0;

async function inspect(relative = '') {
  for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (skip.has(name)) continue;
    if (entry.isDirectory() && ['node_modules', '.next', 'target', 'out'].includes(entry.name)) continue;
    if (['apps/gallery/public/brand', 'apps/gallery/src-tauri/gen'].includes(name)) continue;
    assert.ok(!entry.isSymbolicLink(), `Unexpected symlink: ${name}`);
    if (entry.isDirectory()) { await inspect(name); continue; }
    if (!textExtensions.has(extname(name)) && !rootText.has(name)) continue;
    const bytes = await readFile(join(root, name));
    assert.ok(!bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), `UTF-8 BOM: ${name}`);
    const source = decoder.decode(bytes);
    assert.ok(!source.includes('\r'), `Expected LF line endings: ${name}`);
    assert.ok(!/\uFFFD|[\u00C2\u00C3][\u0080-\u00BF]|\u00E2[\u0080-\u00BF]/u.test(source), `Possible mojibake: ${name}`);
    assert.ok(source.endsWith('\n'), `Missing final newline: ${name}`);
    if (name.endsWith('.json')) JSON.parse(source);
    if (name.endsWith('.md')) {
      assert.equal((source.match(/^# /gm) ?? []).length, 1, `Expected one H1: ${name}`);
      for (const match of source.matchAll(/\[[^\]\n]+\]\(([^)\s]+)\)/g)) {
        const target = match[1];
        if (/^(?:[a-z]+:|#)/i.test(target)) continue;
        await access(resolve(dirname(join(root, name)), decodeURIComponent(target.split('#')[0])));
      }
    }
    count += 1;
  }
}

await inspect();
const version = (await readFile(join(root, 'VERSION'), 'utf8')).trim();
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
assert.equal(pkg.version, version, 'Package and VERSION disagree');
assert.equal(lock.version, version, 'Lockfile and VERSION disagree');
assert.equal(lock.packages[''].version, version, 'Root package lock and VERSION disagree');
assert.equal(pkg.private, true, 'Maintainer package must remain private');
const appPackage = JSON.parse(await readFile(join(root, 'apps/gallery/package.json'), 'utf8'));
const nativeConfig = JSON.parse(await readFile(join(root, 'apps/gallery/src-tauri/tauri.conf.json'), 'utf8'));
const schema = JSON.parse(await readFile(join(root, 'schemas', `v${version}`, 'local-media-gallery.schema.json'), 'utf8'));
assert.equal(appPackage.version, version, 'Application and VERSION disagree');
assert.equal(nativeConfig.version, version, 'Native application and VERSION disagree');
assert.equal(schema['x-release-version'], version, 'Master schema and VERSION disagree');
const interfaceReference = await readFile(join(root, 'docs', `v${version}`, 'interfaces-and-contracts.md'), 'utf8');
assert.ok(interfaceReference.includes(`\`${schema.$id}\``), 'Documentation must identify the exact master schema');
await access(join(root, 'docs', `v${version}`, 'index.md'));
const init = JSON.parse(await readFile(join(root, '.specify/init-options.json'), 'utf8'));
assert.equal(init.integration, 'codex');
assert.equal(init.script, 'py');
for (const command of ['constitution', 'specify', 'clarify', 'plan', 'tasks', 'analyze', 'implement']) {
  await access(join(root, '.agents/skills', `speckit-${command}`, 'SKILL.md'));
}
const brand = await verifyInstalled(join(root, 'brand'));
assert.ok(brand, 'Brand kit is missing');
console.log(`Checked ${count} authored/configuration text files, local links, version alignment, Spec Kit integration and ${brand.fileCount} brand files (${brand.sourceKind}, ${brand.publicationStatus}).`);
