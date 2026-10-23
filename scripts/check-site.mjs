// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import { root } from './run.mjs';
import { createModel, hash } from './site-content.mjs';
import { sourceIdentity } from './provenance.mjs';

const output = path.join(root, 'apps/site/out');
const model = await createModel(root);
const inventory = []; const html = new Map();
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), 'Static output contains symlink');
    if (entry.isDirectory()) await walk(file);
    else {
      const bytes = await readFile(file); const relative = path.relative(output, file).replaceAll('\\', '/');
      inventory.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) });
      if (entry.name.endsWith('.html')) html.set(relative, load(bytes.toString('utf8')));
    }
  }
}
await walk(output);
const canonicalFile = async url => {
  const pathname = decodeURIComponent(new URL(url, 'http://site.invalid').pathname);
  const file = path.resolve(output, '.' + pathname);
  assert.ok(file === output || file.startsWith(output + path.sep), `Escaping output link: ${url}`);
  const info = await stat(file);
  return info.isDirectory() ? path.join(file, 'index.html') : file;
};
let links = 0;
for (const [filename, $] of html) {
  assert.equal($('h1').length, 1, `${filename}: expected one H1`);
  for (const element of $('[href], [src]').toArray()) {
    const href = $(element).attr('href') ?? $(element).attr('src');
    if (!href || /^(https?:|mailto:|data:)/i.test(href)) continue;
    const base = '/' + filename.replace(/index\.html$/, '');
    const url = new URL(href, `http://site.invalid${base}`);
    assert.equal(url.origin, 'http://site.invalid');
    const target = await canonicalFile(url.href);
    const relative = path.relative(output, target).replaceAll('\\', '/');
    assert.ok(inventory.some(entry => entry.path === relative), `${filename}: absent ${href}`);
    if (url.hash && html.has(relative)) {
      const fragment = decodeURIComponent(url.hash.slice(1));
      assert.ok(html.get(relative)('[id]').toArray().some(node => html.get(relative)(node).attr('id') === fragment), `${filename}: missing fragment ${href}`);
    }
    links++;
  }
  assert.equal($('a[href*="/specs/"], a[href*=".specify"], a[href*="rollout_"]').length, 0, `Internal navigation: ${filename}`);
}
for (const file of model.raw) assert.equal(hash(await readFile(path.join(output, file.path))), file.sha256, `Raw source mismatch ${file.path}`);
for (const page of model.pages) {
  const filename = page.route.slice(1) + 'index.html';
  assert.ok(html.has(filename), `Missing retained route ${page.route}`);
  const $ = html.get(filename);
  const content = load(page.html);
  // Source body must survive rendering, including all prose, code and tables.
  assert.equal($('.prose > div').text(), content.root().text(), `Rendered source drift ${page.route}`);
}
const record = { result: 'pass', terminalFinished: new Date().toISOString(), source: await sourceIdentity(), pages: html.size, links, rawSources: model.raw.length, files: inventory.sort((a, b) => a.path.localeCompare(b.path)) };
await writeFile(path.join(root, '.local/site-artifact.json'), JSON.stringify(record, null, 2) + '\n');
console.log(`Verified ${html.size} HTML pages, ${links} local links/fragments and ${model.raw.length} exact raw sources; recorded ${inventory.length} artifact hashes.`);
