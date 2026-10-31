import {fileURLToPath} from 'node:url';
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import { root } from './run.mjs';
import { createModel, hash } from './site-content.mjs';
import { sourceIdentity } from './provenance.mjs';

export async function checkSite({base=root,manifest,releaseRecord,allowFixture=false,publicationProjection=false,outputRoot=path.join(root,'apps/site/out')}={}) {
const output=outputRoot;
if(manifest===undefined){const selection=JSON.parse(await readFile(path.join(root,'.local/site-publication.json'),'utf8'));manifest=selection.manifest;releaseRecord=selection.releaseRecord;}
const model = await createModel(base,manifest,{releaseRecord,allowFixture,publicationProjection});
const inventory = [];
const html = new Map();
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), 'Static output contains symlink');
    if (entry.isDirectory()) await walk(file);
    else {
      const bytes = await readFile(file);
      const relative = path.relative(output, file).replaceAll('\\', '/');
      inventory.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) });
      if (entry.name.endsWith('.html')) html.set(relative, load(bytes.toString('utf8')));
    }
  }
}
await walk(output);
const canonicalFile = async (url) => {
  const pathname = decodeURIComponent(new URL(url, 'http://site.invalid').pathname);
  const file = path.resolve(output, '.' + pathname);
  assert.ok(file === output || file.startsWith(output + path.sep), `Escaping output link: ${url}`);
  const info = await stat(file);
  return info.isDirectory() ? path.join(file, 'index.html') : file;
};
let links = 0;
for (const [filename, $] of html) {
  assert.equal($('h1').length, 1, `${filename}: expected one H1`);
  const structured = JSON.parse($('script[type="application/ld+json"]').text());
  assert.equal(structured['@type'], 'WebSite');
  assert.equal(structured.url, 'https://localmedia.gallery/');
  assert.equal(structured.name, 'Local Media Gallery');
  assert.ok(!('offers' in structured) && !('aggregateRating' in structured), 'No fictional product claims');
  const ids = $('[id]')
    .toArray()
    .map((node) => $(node).attr('id'));
  assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML/SVG identifier: ' + filename);
  if (!filename.includes('404') && !filename.includes('_not-found')) {
    assert.equal($('link[rel=canonical]').length, 1, 'One canonical URL: ' + filename);
    assert.ok($('meta[name=description]').attr('content')?.length, 'Description: ' + filename);
    assert.equal($('meta[property="og:image:width"]').attr('content'), '1280');
    assert.equal($('meta[property="og:image:height"]').attr('content'), '640');
    assert.equal($('meta[name="twitter:card"]').attr('content'), 'summary_large_image');
  }
  for (const node of $('.diagram svg').toArray()) {
    const svg = $(node);
    assert.equal(svg.find('foreignObject,script,image,a').length, 0, 'Unsafe diagram: ' + filename);
    assert.ok(svg.find('title').text() && svg.find('desc').text(), 'Described diagram: ' + filename);
    for (const match of $.html(node).matchAll(/url\(#([^)]*)\)/g))
      assert.ok(ids.includes(match[1]), 'Unresolved SVG local reference: ' + match[1]);
    for (const id of (svg.attr('aria-labelledby') ?? '').split(/\s+/))
      assert.ok(ids.includes(id), 'Missing diagram name reference');
  }
  for (const element of $('[href], [src]').toArray()) {
    const href = $(element).attr('href') ?? $(element).attr('src');
    if (!href || /^(https?:|mailto:|data:)/i.test(href)) continue;
    const base = '/' + filename.replace(/index\.html$/, '');
    const url = new URL(href, `http://site.invalid${base}`);
    assert.equal(url.origin, 'http://site.invalid');
    const target = await canonicalFile(url.href);
    const relative = path.relative(output, target).replaceAll('\\', '/');
    assert.ok(
      inventory.some((entry) => entry.path === relative),
      `${filename}: absent ${href}`,
    );
    if (url.hash && html.has(relative)) {
      const fragment = decodeURIComponent(url.hash.slice(1));
      assert.ok(
        html
          .get(relative)('[id]')
          .toArray()
          .some((node) => html.get(relative)(node).attr('id') === fragment),
        `${filename}: missing fragment ${href}`,
      );
    }
    links++;
  }
  assert.equal(
    $('a[href*="/specs/"], a[href*=".specify"], a[href*="rollout_"]').length,
    0,
    `Internal navigation: ${filename}`,
  );
}
for (const file of model.raw)
  assert.equal(
    hash(await readFile(path.join(output, file.path))),
    file.sha256,
    `Raw source mismatch ${file.path}`,
  );
for (const page of model.pages) {
  const filename = page.route.slice(1) + 'index.html';
  assert.ok(html.has(filename), `Missing retained route ${page.route}`);
  const $ = html.get(filename);
  const content = load(page.html);
  // Source body must survive rendering, including all prose, code and tables.
  const authored = $('.source-content').clone();
  authored.find('.diagram-output, .diagram-caption').empty();
  assert.equal(authored.text(), content.root().text(), `Rendered source drift ${page.route}`);
}
assert.ok(
  inventory.filter((file) => file.path.endsWith('.js')).reduce((n, file) => n + file.bytes, 0) <= 2000000,
  'Locked total emitted JavaScript budget',
);
const staged = JSON.parse(await readFile(path.join(root, '.local/staged-brand-site.json')));
for (const file of staged)
  assert.equal(
    hash(
      await readFile(
        path.join(output, file.path.startsWith('/') ? file.path.slice(1) : 'brand/' + file.path),
      ),
    ),
    file.sha256,
    'Governed staged asset drift',
  );
const webmanifest = JSON.parse(await readFile(path.join(output, 'site.webmanifest')));
for (const icon of webmanifest.icons)
  assert.ok(
    inventory.some((file) => '/' + file.path === icon.src),
    'Manifest dependency absent: ' + icon.src,
  );
const fonts = inventory.filter((file) => file.path.endsWith('.woff2'));
assert.ok(
  fonts.length <= 6 && fonts.reduce((n, file) => n + file.bytes, 0) <= 220000,
  'Locked local-font budget',
);
assert.ok(
  inventory.find((file) => file.path === 'social-preview.png').bytes <= 350000,
  'Governed illustration/social asset budget',
);
for (const [name, size] of [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['apple-touch-icon.png', 180],
  ...webmanifest.icons.map((icon) => [icon.src.slice(1), Number(icon.sizes.split('x')[0])]),
]) {
  const bytes = await readFile(path.join(output, name));
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  assert.equal(bytes.readUInt32BE(16), size);
  assert.equal(bytes.readUInt32BE(20), size);
}
const social = await readFile(path.join(output, 'social-preview.png'));
assert.equal(social.readUInt32BE(16), 1280);
assert.equal(social.readUInt32BE(20), 640);
const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
for (const route of ['/', ...model.pages.map((page) => page.route)])
  assert.ok(
    sitemap.includes('<loc>https://localmedia.gallery' + route + '</loc>'),
    'Sitemap route absent: ' + route,
  );
assert.ok(
  !sitemap.includes('/docs/latest/') && !sitemap.includes('/raw/') && !sitemap.includes('/404'),
  'Sitemap excludes duplicates and nonpages',
);
const record = {
  result: 'pass',
  terminalFinished: new Date().toISOString(),
  source: await sourceIdentity(),
  pages: html.size,
  links,
  rawSources: model.raw.length,
  files: inventory.sort((a, b) => a.path.localeCompare(b.path)),
};
await writeFile(path.join(root, '.local/site-artifact.json'), JSON.stringify(record, null, 2) + '\n');
console.log(
  `Verified ${html.size} HTML pages, ${links} local links/fragments and ${model.raw.length} exact raw sources; recorded ${inventory.length} artifact hashes.`,
);

return record;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await checkSite();
