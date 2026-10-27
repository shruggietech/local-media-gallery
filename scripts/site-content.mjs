// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import MarkdownIt from 'markdown-it';
import { createHighlighter } from 'shiki';
const highlighter = await createHighlighter({
  themes: [
    {
      name: 'gallery',
      type: 'dark',
      colors: { 'editor.background': 'var(--card)', 'editor.foreground': 'var(--foreground)' },
      settings: [
        { scope: ['comment'], settings: { foreground: 'var(--muted-foreground)', fontStyle: '' } },
        { scope: ['keyword', 'storage'], settings: { foreground: 'var(--brand-information)' } },
        { scope: ['string'], settings: { foreground: 'var(--brand-success)' } },
        {
          scope: ['constant.numeric', 'constant.language'],
          settings: { foreground: 'var(--brand-emphasis)' },
        },
        { scope: ['entity.name', 'support.function'], settings: { foreground: 'var(--primary)' } },
      ],
    },
  ],
  langs: ['json', 'bash', 'powershell', 'typescript', 'javascript', 'rust', 'yaml', 'html', 'css'],
});
import Ajv from 'ajv/dist/2020.js';
import { topicRoute } from '../apps/site/src/lib/navigation.mjs';
export { switchTopic, searchEntries } from '../apps/site/src/lib/navigation.mjs';

export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const plain = (token) =>
  (token.children ?? []).map((t) => (t.type === 'image' ? t.content : t.content)).join('');
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_ -]/gu, '')
    .replace(/ /g, '-');

export function rewriteLink(href, source, inventory) {
  assert.ok(!/[\u0000-\u0020\\]/u.test(href), `Invalid link: ${href}`);
  if (/^(https?:|mailto:)/i.test(href)) return href;
  if (href.startsWith('#')) return href;
  assert.ok(!/^(?:[a-z][\w+.-]*:|\/)/i.test(href), `Unsafe link: ${href}`);
  const match = href.match(/^([^?#]*)([?#].*)?$/);
  const local = decodeURIComponent(match[1]);
  assert.ok(
    !local.includes('\\') && !local.includes('\0') && !path.posix.isAbsolute(local),
    'Unsafe local path',
  );
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(source), local));
  assert.ok(
    !resolved.startsWith('../') && inventory.has(resolved),
    `Unpublished source link ${source}: ${href}`,
  );
  return inventory.get(resolved) + (match[2] ?? '');
}

export function renderMarkdown(source, resolveLink) {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
  const headings = [];
  const counts = new Map();
  const text = [];
  md.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const language = token.info.trim().split(/\s/)[0];
    if (language === 'mermaid')
      return `<figure class="diagram" data-diagram="${hash(token.content)}"><div class="diagram-output"></div><details><summary>Diagram source</summary><pre><code class="mermaid-source">${escape(token.content)}</code></pre></details></figure>`;
    const known = highlighter.getLoadedLanguages().includes(language);
    const highlighted = highlighter
      .codeToHtml(token.content, { lang: known ? language : 'text', theme: 'gallery' })
      .replace('<code', '<code data-code-source');
    return `<figure class="code-example"><figcaption><span class="code-language">${escape(language || 'text')}</span><button type="button" data-copy-code hidden aria-label="Copy ${escape(language || 'text')} code">Copy code</button><span class="copy-feedback" role="status" aria-live="polite"></span></figcaption>${highlighted}</figure>`;
  };
  const tokens = md.parse(source, {});
  function visit(list) {
    list.forEach((token, i) => {
      if (token.type === 'heading_open') {
        const title = plain(list[i + 1]);
        const base = slug(title);
        const count = counts.get(base) ?? 0;
        counts.set(base, count + 1);
        const id = count ? `${base}-${count}` : base;
        token.attrSet('id', id);
        token.attrSet('tabindex', '-1');
        headings.push({ title, id, level: Number(token.tag.slice(1)) });
      }
      if (token.type === 'link_open') token.attrSet('href', resolveLink(token.attrGet('href')));
      if (token.type === 'image') token.attrSet('src', resolveLink(token.attrGet('src')));
      if (token.type === 'inline') text.push(plain(token));
      if (token.children) visit(token.children);
    });
  }
  visit(tokens);
  return {
    html: md.renderer.render(tokens, md.options, {}),
    headings,
    text: text.join(' '),
    title: headings[0]?.title ?? 'Reference',
  };
}

export function validateManifest(manifest) {
  assert.ok(Array.isArray(manifest.snapshots) && manifest.snapshots.length, 'Snapshots are required');
  const versions = new Set();
  for (const snapshot of manifest.snapshots) {
    assert.match(snapshot.version, /^v\d+\.\d+\.\d+$/);
    assert.ok(!versions.has(snapshot.version), 'Duplicate version');
    versions.add(snapshot.version);
    assert.ok(['specification', 'released'].includes(snapshot.status), 'Snapshot status required');
    assert.equal(snapshot.source, `docs/${snapshot.version}`, 'Snapshot source must match version');
    assert.ok(
      snapshot.topics?.includes('index') && new Set(snapshot.topics).size === snapshot.topics.length,
      'Unique topics and index required',
    );
    for (const topic of snapshot.topics) assert.match(topic, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
  assert.ok(versions.has(manifest.latest), 'Latest must name a retained version');
  return manifest;
}

export function validateRelease(record) {
  if (record === null) return null;
  assert.equal(record.status, 'published', 'Only published releases may supply downloads');
  assert.match(record.version, /^\d+\.\d+\.\d+$/);
  assert.match(record.sourceRevision, /^[a-f0-9]{40}$/);
  assert.ok(record.artifacts?.length, 'Published release needs artifacts');
  for (const artifact of record.artifacts) {
    assert.ok(['full', 'lite'].includes(artifact.edition));
    assert.ok(['windows', 'linux', 'macos'].includes(artifact.platform));
    assert.ok(['x64', 'arm64'].includes(artifact.architecture));
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
    assert.match(artifact.filename, /^[\w.-]+$/);
    assert.ok(!['.', '..'].includes(artifact.filename), 'Invalid artifact filename');
    assert.equal(
      artifact.url,
      `https://github.com/shruggietech/local-media-gallery/releases/download/v${record.version}/${artifact.filename}`,
    );
    assert.equal(artifact.version, record.version, 'Artifact version mismatch');
  }
  return record;
}

const pointerSegment = (key) => key.replaceAll('~', '~0').replaceAll('/', '~1');
const pointerId = (pointer) => `schema-${Buffer.from(pointer || 'root').toString('hex')}`;
export function renderSchema(value, pointer = '', reference = false) {
  const id = pointerId(pointer);
  if (value === null || typeof value !== 'object') {
    const text =
      reference && typeof value === 'string' && value.startsWith('#/')
        ? `<a href="#${pointerId(value.slice(1))}">${escape(JSON.stringify(value))}</a>`
        : escape(JSON.stringify(value));
    return `<span id="${id}">${text}</span>`;
  }
  const entries = Object.entries(value);
  return `<details open id="${id}"><summary>${Array.isArray(value) ? `Array (${entries.length})` : `Object (${entries.length})`}</summary><dl>${entries.map(([key, child]) => `<div><dt>${escape(key)}</dt><dd>${renderSchema(child, `${pointer}/${pointerSegment(key)}`, key === '$ref' || key === '$dynamicRef')}</dd></div>`).join('')}</dl></details>`;
}

export async function confinedRead(base, relative) {
  assert.ok(
    !path.isAbsolute(relative) &&
      !relative.includes('\\') &&
      relative.split('/').every((segment) => segment && segment !== '.' && segment !== '..'),
    'Source escapes its declared scope',
  );
  const resolved = await realpath(path.resolve(base, relative));
  const baseReal = await realpath(base);
  const distance = path.relative(baseReal, resolved);
  assert.ok(
    distance && !distance.startsWith('..') && !path.isAbsolute(distance),
    `Source escapes root: ${relative}`,
  );
  return readFile(resolved);
}

export async function createModel(base, suppliedManifest) {
  const manifest = validateManifest(
    suppliedManifest ?? JSON.parse(await confinedRead(base, 'site/versions.json')),
  );
  const inventory = new Map();
  const raw = [];
  const pages = [];
  const search = [];
  const originals = new Map();
  async function source(sourcePath, route, rawPath, version, capturedPath = sourcePath) {
    const bytes = await confinedRead(base, capturedPath);
    inventory.set(`${version}:${sourcePath}`, route);
    originals.set(`${version}:${sourcePath}`, bytes.toString('utf8'));
    raw.push({ source: capturedPath, path: rawPath, sha256: hash(bytes), bytes: bytes.length });
    return bytes;
  }
  for (const snapshot of manifest.snapshots) {
    const actual = (await readdir(path.join(base, snapshot.source)))
      .filter((n) => n.endsWith('.md'))
      .map((n) => n.slice(0, -3))
      .sort();
    assert.deepEqual([...snapshot.topics].sort(), actual, 'Every chapter must be included');
    for (const topic of snapshot.topics)
      await source(
        `${snapshot.source}/${topic}.md`,
        topicRoute(snapshot.version, topic),
        `/raw/${snapshot.version}/docs/${topic}.md`,
        snapshot.version,
      );
    for (const reference of snapshot.references ?? []) {
      assert.ok(reference.source.startsWith('brand/kit/'), 'Only governed brand references may be captured');
      assert.ok(
        reference.captured.startsWith(`site/snapshots/${snapshot.version}/`),
        'References must be snapshot-owned',
      );
      assert.ok(
        reference.name.split('/').every((part) => /^[\w.-]+$/.test(part) && part !== '.' && part !== '..'),
        'Invalid reference destination',
      );
      const bytes = await source(
        reference.source,
        `/raw/${snapshot.version}/references/${reference.name}`,
        `/raw/${snapshot.version}/references/${reference.name}`,
        snapshot.version,
        reference.captured,
      );
      assert.equal(hash(bytes), reference.sha256, 'Captured historical reference hash mismatch');
    }
    for (const asset of snapshot.assets ?? []) {
      assert.ok(asset.startsWith(`${snapshot.source}/`), 'Asset must belong to snapshot');
      const route = `/raw/${snapshot.version}/assets/${asset.slice(snapshot.source.length + 1)}`;
      await source(asset, route, route, snapshot.version);
    }
    if (snapshot.schema) {
      assert.equal(snapshot.schema, `schemas/${snapshot.version}/local-media-gallery.schema.json`);
      const bytes = await source(
        snapshot.schema,
        `/docs/${snapshot.version}/schema/`,
        `/raw/${snapshot.version}/local-media-gallery.schema.json`,
        snapshot.version,
      );
      const schema = JSON.parse(bytes);
      assert.equal(schema['x-release-version'], snapshot.version.slice(1));
      assert.equal(schema.$id, `urn:local-media-gallery:${snapshot.version.slice(1)}`);
      const ajv = new Ajv({ strict: false });
      const validate = ajv.compile(schema);
      for (const example of snapshot.examples ?? []) {
        assert.ok(example.startsWith(`schemas/${snapshot.version}/`), 'Examples must match snapshot');
        const bytes = await source(
          example,
          `/raw/${snapshot.version}/examples/${path.posix.basename(example)}`,
          `/raw/${snapshot.version}/examples/${path.posix.basename(example)}`,
          snapshot.version,
        );
        assert.ok(
          validate(JSON.parse(bytes)),
          `Invalid historical example ${example}: ${ajv.errorsText(validate.errors)}`,
        );
      }
      for (const contract of snapshot.contracts ?? []) {
        assert.match(contract.topic, /^[a-z][a-z0-9-]*$/);
        assert.equal(contract.source, 'schemas/' + snapshot.version + '/' + contract.topic + '.json');
        assert.ok(Object.hasOwn(schema.$defs, contract.definition), 'Unknown owned contract definition');
        const route = '/docs/' + snapshot.version + '/' + contract.topic + '/';
        const rawPath = '/raw/' + snapshot.version + '/' + contract.topic + '.json';
        const bytes = await source(contract.source, route, rawPath, snapshot.version);
        const value = JSON.parse(bytes);
        const validateContract = ajv.compile({ $schema: schema.$schema, $defs: schema.$defs, $ref: '#/$defs/' + contract.definition });
        assert.ok(validateContract(value), 'Invalid owned contract: ' + ajv.errorsText(validateContract.errors));
        pages.push({route,version:snapshot.version,topic:contract.topic,title:contract.title,
          html:'<h1>' + escape(contract.title) + '</h1>' + renderSchema(value),raw:rawPath});
      }
      pages.push({
        route: `/docs/${snapshot.version}/schema/`,
        version: snapshot.version,
        topic: 'schema',
        title: 'Application JSON Schema',
        html: `<h1>Application JSON Schema</h1><p>Version ${snapshot.version}. Application contracts do not constrain external sidecars.</p>${renderSchema(schema)}`,
        raw: `/raw/${snapshot.version}/local-media-gallery.schema.json`,
      });
    }
    inventory.set(`${snapshot.version}:CHANGELOG.md`, '/changelog/');
    inventory.set(`${snapshot.version}:SECURITY.md`, '/support/');
  }
  for (const snapshot of manifest.snapshots) {
    const links = new Map(
      [...inventory]
        .filter(([key]) => key.startsWith(`${snapshot.version}:`))
        .map(([key, route]) => [key.slice(snapshot.version.length + 1), route]),
    );
    for (const topic of snapshot.topics) {
      const filename = `${snapshot.source}/${topic}.md`;
      const rendered = renderMarkdown(originals.get(`${snapshot.version}:${filename}`), (href) =>
        rewriteLink(href, filename, links),
      );
      pages.push({
        ...rendered,
        route: topicRoute(snapshot.version, topic),
        version: snapshot.version,
        topic,
        raw: `/raw/${snapshot.version}/docs/${topic}.md`,
      });
      search.push({
        version: snapshot.version,
        title: rendered.title,
        text: rendered.text,
        href: topicRoute(snapshot.version, topic),
      });
    }
  }
  for (const [filename, route] of [
    ['CHANGELOG.md', '/changelog/'],
    ['SECURITY.md', '/support/'],
    ['LICENSE', '/license/'],
  ]) {
    const bytes = await confinedRead(base, filename);
    const rawPath = `/raw/${filename}`;
    raw.push({ source: filename, path: rawPath, sha256: hash(bytes), bytes: bytes.length });
    // Public policy/changelog links remain explicit public source links, not arbitrary staged files.
    const rendered =
      filename === 'LICENSE'
        ? { title: 'License', html: `<h1>License</h1><pre>${escape(bytes.toString('utf8'))}</pre>` }
        : renderMarkdown(bytes.toString('utf8'), (href) => {
            if (/^(https?:|mailto:|#)/i.test(href)) return href;
            const publicLinks = new Map(
              [...inventory].map(([key, value]) => [key.slice(key.indexOf(':') + 1), value]),
            );
            publicLinks.set('LICENSE', '/license/');
            return rewriteLink(href, filename, publicLinks);
          });
    pages.push({ ...rendered, route, raw: rawPath });
  }
  let release = null;
  if (manifest.releaseRecord) {
    assert.equal(manifest.releaseRecord, 'site/published-release.json');
    release = validateRelease(JSON.parse(await confinedRead(base, manifest.releaseRecord)));
    assert.equal(
      manifest.latest,
      `v${release.version}`,
      'Published downloads and latest documentation mismatch',
    );
    assert.equal(manifest.snapshots.find((s) => s.version === manifest.latest).status, 'released');
  } else
    assert.equal(
      manifest.snapshots.find((s) => s.version === manifest.latest).status,
      'specification',
      'Released latest needs verified metadata',
    );
  assert.equal(new Set(pages.map((p) => p.route)).size, pages.length, 'Duplicate routes');
  assert.equal(new Set(raw.map((p) => p.path)).size, raw.length, 'Duplicate raw destinations');
  return { manifest, pages, raw, search, release };
}
