// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { readFile, realpath } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { load } from 'cheerio';
import { hash, escape } from './site-content.mjs';

// Rename only identifier attributes and explicit local references, never authored labels.
export function normalizeSvg(svg, prefix, title, description) {
  const $ = load(svg, { xmlMode: true });
  assert.equal($('svg').length, 1, 'Expected one diagram SVG');
  assert.equal($('script,foreignObject,image,a,iframe').length, 0, 'Unsafe diagram element');
  assert.ok(!/@import/i.test($('style').text()), 'External diagram stylesheet resource');
  for (const match of $('style')
    .text()
    .matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g))
    assert.ok(match[1].trim().startsWith('#'), 'External diagram stylesheet resource');
  const ids = new Map();
  for (const node of $('[id]').toArray()) {
    const old = $(node).attr('id');
    assert.ok(!ids.has(old), 'Duplicate diagram ID');
    ids.set(old, prefix + '-' + ids.size);
  }
  for (const node of $('*').toArray())
    for (const [name, value] of Object.entries(node.attribs ?? {})) {
      assert.ok(!/^on/i.test(name), 'Diagram event handler');
      if (name === 'id') $(node).attr(name, ids.get(value));
      else if (name === 'href' || name === 'xlink:href') {
        assert.ok(value.startsWith('#') && ids.has(value.slice(1)), 'External/unresolved diagram reference');
        $(node).attr(name, '#' + ids.get(value.slice(1)));
      } else if (name.startsWith('aria-') && /labelledby|describedby/.test(name))
        $(node).attr(
          name,
          value
            .split(/\s+/)
            .map((id) => {
              assert.ok(ids.has(id), 'Unresolved diagram ARIA');
              return ids.get(id);
            })
            .join(' '),
        );
      else if (value.includes('url('))
        $(node).attr(
          name,
          value.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (_, reference) => {
            assert.ok(reference.startsWith('#') && ids.has(reference.slice(1)), 'External/unresolved marker');
            return 'url(#' + ids.get(reference.slice(1)) + ')';
          }),
        );
    }
  // Mermaid emits ID selectors in its internal stylesheet. Replace exact selector tokens only.
  $('style').each((_, node) => {
    let css = $(node).text();
    for (const [id, next] of [...ids].sort((a, b) => b[0].length - a[0].length))
      css = css
        .replaceAll('#' + id + ' ', '#' + next + ' ')
        .replaceAll('#' + id + '{', '#' + next + '{')
        .replaceAll('#' + id + '.', '#' + next + '.')
        .replaceAll('url(#' + id + ')', 'url(#' + next + ')');
    $(node).text(css);
  });
  $('svg > title, svg > desc').remove();
  $('svg')
    .attr({ role: 'img', 'aria-labelledby': prefix + '-title ' + prefix + '-description' })
    .prepend(
      '<title id="' +
        prefix +
        '-title">' +
        escape(title) +
        '</title><desc id="' +
        prefix +
        '-description">' +
        escape(description) +
        '</desc>',
    );
  const out = $.xml();
  assert.ok(Buffer.byteLength(out) <= 80000, 'Diagram exceeds locked SVG budget');
  return out;
}

export async function renderDiagrams(root, model) {
  const metadata = JSON.parse(await readFile(path.join(root, 'site/diagrams.json')));
  const figures = [];
  for (const page of model.pages) {
    const $ = load(page.html);
    $('.diagram').each((i, node) =>
      figures.push({
        page,
        $,
        node,
        index: i,
        source: $(node).find('.mermaid-source').text(),
        key: $(node).attr('data-diagram'),
      }),
    );
  }
  if (!figures.length) return;
  const moduleRoot = await realpath(path.join(root, 'node_modules/mermaid/dist'));
  const fontRoot = await realpath(path.join(root, 'apps/site/public/brand/fonts'));
  // Build-only loopback server exposes only Mermaid's distribution and staged fonts.
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end('<!doctype html><html lang="en"><body><div id="target"></div></body></html>');
        return;
      }
      const base = url.pathname.startsWith('/modules/')
        ? moduleRoot
        : url.pathname.startsWith('/fonts/')
          ? fontRoot
          : null;
      assert.ok(base);
      const relative = decodeURIComponent(url.pathname.replace(/^\/(modules|fonts)\//, ''));
      const file = await realpath(path.resolve(base, relative));
      assert.ok(file.startsWith(base + path.sep));
      const bytes = await readFile(file);
      response.writeHead(200, {
        'Content-Type': file.endsWith('.mjs') || file.endsWith('.js') ? 'text/javascript' : 'font/woff2',
      });
      response.end(bytes);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chromium',
    executablePath: process.env.GALLERY_SITE_BROWSER,
  });
  try {
    const page = await browser.newPage();
    const origin = 'http://127.0.0.1:' + server.address().port;
    await page.goto(origin);
    const tokens = await readFile(path.join(root, 'brand/kit/tokens/interface.css'), 'utf8');
    await page.addStyleTag({ content: tokens });
    await page.evaluate(async () => {
      const font = new FontFace('Geist', 'url(/fonts/woff2/Geist-Regular.woff2)');
      document.fonts.add(await font.load());
      window.galleryMermaid = (await import('/modules/mermaid.esm.min.mjs')).default;
    });
    let instance = 0;
    for (const figure of figures) {
      const info = metadata[figure.key];
      assert.ok(info?.title && info?.description, 'Missing diagram description: ' + figure.key);
      assert.equal(hash(figure.source), figure.key);
      let output = '';
      for (const theme of ['light', 'dark']) {
        const prefix = 'diagram-' + hash(figure.page.route + figure.key + instance + theme).slice(0, 16);
        const svg = await page.evaluate(
          async ({ source, theme, id }) => {
            document.documentElement.className = theme === 'light' ? 'bb-light' : '';
            const style = getComputedStyle(document.documentElement);
            const token = (name) => style.getPropertyValue(name).trim();
            const mermaid = window.galleryMermaid;
            mermaid.initialize({
              startOnLoad: false,
              securityLevel: 'strict',
              htmlLabels: false,
              theme: 'base',
              look: 'classic',
              deterministicIds: true,
              deterministicIDSeed: id,
              fontFamily: 'Geist',
              fontSize: 16,
              flowchart: { htmlLabels: false, useMaxWidth: false },
              themeVariables: {
                fontFamily: 'Geist',
                fontSize: '16px',
                primaryColor: token('--bb-surface-card'),
                primaryTextColor: token('--bb-text-primary'),
                primaryBorderColor: token('--bb-text-muted'),
                lineColor: token('--bb-text-muted'),
                arrowheadColor: token('--bb-text-muted'),
                secondaryColor: token('--bb-surface-background'),
                tertiaryColor: token('--bb-surface-card'),
                edgeLabelBackground: token('--bb-surface-card'),
              },
            });
            return (await mermaid.render(id, source)).svg;
          },
          { source: figure.source, theme, id: prefix },
        );
        output +=
          '<div class="diagram-theme-' +
          theme +
          '">' +
          normalizeSvg(svg, prefix, info.title, info.description) +
          '</div>';
      }
      figure
        .$(figure.node)
        .find('.diagram-output')
        .html(output)
        .attr({ tabindex: '0', 'aria-label': info.title + ', scroll to inspect diagram' });
      figure
        .$(figure.node)
        .prepend(
          '<figcaption class="diagram-caption"><strong>' +
            escape(info.title) +
            '</strong><span>' +
            escape(info.description) +
            '</span><span class="diagram-hint">Scroll within the diagram to inspect wide relationships. Its source is available below.</span></figcaption>',
        );
      instance++;
    }
    // Figures on the same page share the same parsed document.
    for (const figure of figures) figure.page.html = figure.$('body').html();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
