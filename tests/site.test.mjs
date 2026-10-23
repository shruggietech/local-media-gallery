// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  renderMarkdown,
  rewriteLink,
  switchTopic,
  renderSchema,
  validateRelease,
  validateManifest,
  searchEntries,
  createModel,
  hash,
  confinedRead,
} from '../scripts/site-content.mjs';
import { root } from '../scripts/run.mjs';
import { aliasRoutes, landingDocs } from '../apps/site/src/lib/navigation.mjs';

test('Markdown parses tables, nested lists, code, safe headings and inert HTML', () => {
  const result = renderMarkdown(
    '# Title\n\n## Same\n\n## Same\n\n| A | B |\n| --- | --- |\n| x | y |\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n',
    (x) => x,
  );
  assert.match(result.html, /<table>/);
  assert.match(result.html, /id="same-1"/);
  assert.doesNotMatch(result.html, /<script>|href="javascript:/);
});

test('source links are resolved before rewriting and cannot escape the inventory', () => {
  const inventory = new Map([['docs/v1/next.md', '/docs/v1/next/']]);
  assert.equal(rewriteLink('next.md?q=1#topic', 'docs/v1/index.md', inventory), '/docs/v1/next/?q=1#topic');
  assert.throws(() => rewriteLink('../../specs/private.md', 'docs/v1/index.md', inventory));
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.test', '%2e%2e/%2e%2e/private'])
    assert.throws(() => rewriteLink(bad, 'docs/v1/index.md', inventory));
});

test('version selection preserves topics and explains missing topics', () => {
  const versions = [
    { version: 'v1', topics: ['index', 'overview'] },
    { version: 'v2', topics: ['index'] },
  ];
  assert.deepEqual(switchTopic(versions, 'v1', 'overview'), { href: '/docs/v1/overview/', missing: false });
  assert.equal(switchTopic(versions, 'v2', 'overview').missing, true);
  assert.match(switchTopic(versions, 'v2', 'overview').href, /missing=overview/);
  assert.deepEqual(
    searchEntries(
      [
        { title: 'One', text: 'alpha', version: 'v1' },
        { title: 'Two', text: 'alpha', version: 'v2' },
      ],
      'alpha',
      'v1',
    ).map((x) => x.title),
    ['One'],
  );
});

test('schema tree preserves unknown and composed structures with linked local pointers', () => {
  const html = renderSchema({
    $defs: {
      'a/b': { type: 'object', properties: { x: { anyOf: [{ type: 'null' }, { type: 'string' }] } } },
    },
    $ref: '#/$defs/a~1b',
    if: true,
    then: false,
    'x-unknown': 0,
  });
  for (const value of ['anyOf', 'x-unknown', 'false', 'a~1b']) assert.ok(html.includes(value));
  assert.match(html, /<a href="#schema-/);
  assert.match(html, /id="schema-/);
  assert.doesNotMatch(renderSchema({ default: '#/ordinary-string' }), /<a href=/);
});

test('manifest and release records fail closed on identity and candidate mismatches', () => {
  assert.throws(() => validateManifest({ latest: 'v1', snapshots: [] }));
  assert.throws(() =>
    validateManifest({ latest: 'v1', snapshots: [{ version: 'v1', topics: ['index', 'index'] }] }),
  );
  assert.equal(validateRelease(null), null);
  assert.throws(() => validateRelease({ status: 'candidate', version: '1.0.0', artifacts: [] }));
  assert.throws(() =>
    validateRelease({
      status: 'published',
      version: '1.0.0',
      sourceRevision: 'a'.repeat(40),
      artifacts: [{ url: 'https://evil.test/file' }],
    }),
  );
});

test('real snapshot model preserves historical references/assets and rejects missing chapters or changed capture', async () => {
  await mkdir(path.join(root, '.local'), { recursive: true });
  const base = await mkdtemp(path.join(root, '.local/site-contract-'));
  const put = async (name, contents) => {
    await mkdir(path.dirname(path.join(base, name)), { recursive: true });
    await writeFile(path.join(base, name), contents);
  };
  for (const version of ['v1.0.0', 'v2.0.0']) {
    await put(
      `docs/${version}/index.md`,
      `# ${version}\n\n[Brand reference](../../brand/kit/reference.txt)\n\n![Diagram](asset.svg)\n`,
    );
    await put(`docs/${version}/asset.svg`, '<svg xmlns="http://www.w3.org/2000/svg"/>');
    await put(`site/snapshots/${version}/reference.source`, `old-${version}`);
  }
  await put('docs/v1.0.0/extra.md', '# Historical topic\n');
  await put('brand/kit/reference.txt', 'new upstream bytes');
  await put('CHANGELOG.md', '# Changelog\n');
  await put('SECURITY.md', '# Security\n');
  await put('LICENSE', 'License\n');
  const manifest = {
    latest: 'v2.0.0',
    snapshots: ['v1.0.0', 'v2.0.0'].map((version) => ({
      version,
      status: 'specification',
      source: `docs/${version}`,
      topics: version === 'v1.0.0' ? ['index', 'extra'] : ['index'],
      assets: [`docs/${version}/asset.svg`],
      references: [
        {
          source: 'brand/kit/reference.txt',
          captured: `site/snapshots/${version}/reference.source`,
          name: 'reference.txt',
          sha256: hash(`old-${version}`),
        },
      ],
    })),
  };
  const model = await createModel(base, manifest);
  assert.equal(model.pages.filter((page) => page.version).length, 3);
  assert.match(
    model.pages.find((page) => page.route === '/docs/v1.0.0/').html,
    /\/raw\/v1\.0\.0\/assets\/asset\.svg/,
  );
  assert.equal(
    model.raw.find((entry) => entry.path === '/raw/v1.0.0/references/reference.txt').sha256,
    hash('old-v1.0.0'),
  );
  assert.equal(switchTopic(manifest.snapshots, 'v2.0.0', 'extra').missing, true);
  assert.deepEqual(aliasRoutes(manifest), ['/docs/', '/docs/latest/']);
  assert.deepEqual(landingDocs(manifest), {
    version: 'v2.0.0',
    status: 'specification',
    overview: '/docs/v2.0.0/?missing=overview',
  });
  await put('site/snapshots/v1.0.0/reference.source', 'tampered');
  await assert.rejects(createModel(base, manifest), /hash mismatch/);
  await put('site/snapshots/v1.0.0/reference.source', 'old-v1.0.0');
  await put('docs/v2.0.0/unlisted.md', '# Unlisted\n');
  await assert.rejects(createModel(base, manifest), /Every chapter/);
  await assert.rejects(confinedRead(base, '../outside'), /ENOENT|escapes/);
  await assert.rejects(confinedRead(base, 'site/snapshots/v1.0.0/../../../LICENSE'), /escapes/);
  assert.equal(await readFile(path.join(base, 'brand/kit/reference.txt'), 'utf8'), 'new upstream bytes');
});

// S007: these contracts must fail against the previous renderer.
test('highlighted code preserves exact Unicode source and offers progressive copy controls', async () => {
  const { load } = await import('cheerio');
  const source = '<tag> & café\n  trailing  \n';
  const $ = load(renderMarkdown('# Example\n\n~~~unknown-language\n' + source + '~~~\n', (x) => x).html);
  assert.equal($('[data-code-source]').text(), source);
  assert.equal($('[data-copy-code]').length, 1);
  assert.equal($('.code-language').text(), 'unknown-language');
  assert.equal($('script').length, 0);
  const highlighted = renderMarkdown('~~~json\n{"active":true}\n~~~\n', (x) => x).html;
  assert.equal(load(highlighted)('[data-code-source]').text(), '{"active":true}\n');
  assert.match(highlighted, /shiki/);
  assert.doesNotMatch(highlighted, /hljs/);
});

test('diagram placeholders bind exact source hashes and contain useful no-script source', async () => {
  const { load } = await import('cheerio');
  const source = 'flowchart TD\n  A --> B\n';
  const $ = load(renderMarkdown('~~~mermaid\n' + source + '~~~\n', (x) => x).html);
  assert.equal($('.diagram').attr('data-diagram'), hash(source));
  assert.equal($('.mermaid-source').text(), source);
  assert.equal($('[role=img]').length, 0, 'no empty generic image semantics');
});

test('static SVG normalization isolates duplicate graph instances and rejects executable output', async () => {
  const { normalizeSvg } = await import('../scripts/site-diagrams.mjs');
  const { load } = await import('cheerio');
  const source =
    '<svg id="graph"><style>#graph .node{fill:currentColor}</style><defs><marker id="arrow"/></defs><path marker-end="url(#arrow)"/><text>arrow graph</text></svg>';
  const a = normalizeSvg(source, 'one', 'A & B', 'A leads to B.');
  const b = normalizeSvg(source, 'two', 'C', 'C leads to D.');
  const $ = load(a + b, { xmlMode: true });
  const ids = $('[id]')
    .toArray()
    .map((n) => $(n).attr('id'));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal($('text').first().text(), 'arrow graph');
  assert.equal($('title').first().text(), 'A & B');
  assert.match(a, /url\(#one-1\)/);
  assert.throws(() => normalizeSvg('<svg><foreignObject/></svg>', 'x', 'x', 'x'), /Unsafe/);
  assert.throws(
    () => normalizeSvg('<svg><style>@import url(https://evil.test/x)</style></svg>', 'x', 'x', 'x'),
    /External/,
  );
  assert.throws(
    () => normalizeSvg('<svg><path style="fill:url(https://evil.test/x)"/></svg>', 'x', 'x', 'x'),
    /External/,
  );
  assert.throws(() => normalizeSvg('<svg onload="alert(1)"/>', 'x', 'x', 'x'), /event/);
  assert.throws(
    () => normalizeSvg('<svg><use href="https://evil.test/x"/></svg>', 'x', 'x', 'x'),
    /reference/,
  );
});

test('the rendered baseline entry agrees with live publication and unavailable package status', async () => {
  const { load } = await import('cheerio');
  const model = await createModel(root);
  const baseline = model.manifest.snapshots.find((snapshot) => snapshot.version === 'v0.0.0');
  assert.equal(baseline.status, 'specification');
  const page = model.pages.find((page) => page.route === '/docs/v0.0.0/');
  const text = load(page.html)('p').first().text();
  assert.match(text, /unreleased specification baseline/);
  assert.ok(text.includes('live website at https://localmedia.gallery'));
  assert.ok(text.includes('installable Full/Lite packages have not been published'));
  assert.equal(model.release, null);
});
