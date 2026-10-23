// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { root } from './run.mjs';
import { serve } from './static-server.mjs';
import { coldSamples } from './site-quality.mjs';
import { createModel } from './site-content.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.local/browsers');
const { chromium } = await import('playwright');
const server = process.env.GALLERY_SITE_ORIGIN
  ? { url: process.env.GALLERY_SITE_ORIGIN.replace(/\/$/, ''), close: async () => {} }
  : await serve(path.join(root, 'apps/site/out'));
const live = Boolean(process.env.GALLERY_SITE_ORIGIN);
if (live) assert.equal(server.url, 'https://localmedia.gallery', 'Unexpected live acceptance origin');
const browser = await chromium.launch({
  headless: true,
  channel: 'chromium',
  executablePath: process.env.GALLERY_SITE_BROWSER,
});
const results = [],
  failures = [],
  scans = [],
  screenshots = [],
  diagramChecks = [];
const started = Date.now();
const evidence = path.join(root, '.local/site-visual');
await mkdir(evidence, { recursive: true });
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('request', (request) => {
    if (live && request.url().startsWith('http:')) failures.push('Mixed content: ' + request.url());
  });
  const go = async (route) => {
    await page.goto(server.url + route);
    await page.evaluate(() => document.fonts.ready);
  };
  const reflow = async (label) =>
    assert.ok(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.querySelector('.bb-app-frame__scroll').scrollWidth <= innerWidth + 1,
      ),
      'Page overflow: ' + label,
    );
  const scan = async (label) => {
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    scans.push({ label, violations: report.violations });
    assert.deepEqual(
      report.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      [],
      'Accessibility: ' + label,
    );
  };
  const snapshot = async (name) => {
    const filename = name + '.png';
    await page.screenshot({ path: path.join(evidence, filename) });
    screenshots.push(filename);
  };
  for (const theme of ['light', 'dark'])
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [route, name] of [
        ['/', 'home'],
        ['/docs/v0.0.0/architecture/', 'architecture'],
      ]) {
        await go(route);
        await page.getByLabel('Reading theme').selectOption(theme);
        await page.waitForFunction(
          (value) => document.documentElement.classList.contains(value),
          theme === 'dark' ? 'dark' : 'bb-light',
        );
        await reflow(theme + width + route);
        await scan(theme + width + route);
        await snapshot(name + '-' + theme + '-' + width);
        assert.ok(await page.locator('h1').isVisible());
        assert.ok(
          (await page.locator('h1').boundingBox()).y < 1000,
          'First heading belongs in the initial reading viewport',
        );
        if (route === '/') {
          assert.match(await page.locator('body').innerText(), /No installable Full or Lite packages/);
          assert.ok(await page.getByText('ILLUSTRATIVE GALLERY PREVIEW').isVisible());
        }
      }
    }
  results.push(
    'Six theme/viewport compositions per landing and documentation; axe AA scans, local fonts and responsive screenshots',
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await go('/');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').textContent(), 'Skip to content');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'bb-main');
  assert.notEqual(await page.locator(':focus').evaluate((e) => getComputedStyle(e).outlineStyle), 'none');
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.querySelector('.bb-app-frame__scroll')).scrollBehavior,
    ),
    'auto',
  );
  await page.reload();
  assert.ok(
    await page.locator('html').evaluate((e) => e.classList.contains('dark')),
    'Theme preference persisted',
  );
  results.push('Skip-link focus, persisted theme and immediate reduced-motion scroll');
  await go('/docs/v0.0.0/architecture/');
  const toc = page.getByRole('navigation', { name: 'Page contents', exact: true });
  const targets = await toc
    .locator('a')
    .evaluateAll((links) => links.map((a) => ({ href: a.getAttribute('href'), name: a.textContent })));
  for (const target of targets) {
    await toc.locator('a[href="' + target.href + '"]').click();
    await page.waitForFunction((hash) => location.hash === hash, target.href);
    const geometry = await page.locator(target.href).evaluate((element) => ({
      top: element.getBoundingClientRect().top,
      bottom: document.querySelector('.bb-app-frame__scroll').getBoundingClientRect().bottom,
    }));
    assert.ok(geometry.top >= 78 && geometry.top < geometry.bottom, 'Visible anchor ' + target.href);
  }
  await page.waitForFunction(
    (href) => document.querySelector('.reading-toc a[aria-current]')?.getAttribute('href') === href,
    targets.at(-1).href,
  );
  const hash = new URL(page.url()).hash;
  await page.evaluate(() => document.querySelector('.bb-app-frame__scroll').scrollTo({ top: 0 }));
  await page.waitForTimeout(80);
  assert.equal(new URL(page.url()).hash, hash, 'Manual scroll must not mutate history');
  await go('/docs/v0.0.0/architecture/' + targets[2].href);
  assert.ok(await page.locator(targets[2].href).isVisible());
  await toc.locator('a').last().click();
  await page.goBack();
  assert.equal(new URL(page.url()).hash, targets[2].href);
  results.push(
    'All long-page TOC targets, final activation, direct fragments and native history without manual-scroll history spam',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await go('/docs/v0.0.0/architecture/');
  await page.locator('.compact-toc summary').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.compact-toc').getAttribute('open'), null);
  assert.equal(await page.locator(':focus').textContent(), 'On this page');
  const menu = page.getByRole('button', { name: 'Open Sidebar' });
  await menu.click();
  const drawer = page.getByRole('dialog', { name: 'Documentation navigation' });
  await drawer.waitFor();
  await page.waitForFunction(() => !!document.activeElement?.closest('.mobile-docs-dialog'), null, {
    timeout: 5000,
  });
  await page.getByLabel('Reading theme').evaluate((el) => el.focus());
  assert.ok(
    await page.locator(':focus').evaluate((el) => !!el.closest('.mobile-docs-dialog')),
    'Native modal keeps background controls inert',
  );
  await page.keyboard.press('Shift+Tab');
  assert.ok(
    await page.locator(':focus').evaluate((el) => !!el.closest('.mobile-docs-dialog')),
    'Drawer traps focus',
  );
  await page.keyboard.press('Escape');
  await drawer.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Open Sidebar');
  await page.getByLabel('Reading theme').focus();
  assert.equal(
    await page.locator(':focus').getAttribute('aria-label'),
    'Reading theme',
    'Background controls restored',
  );
  await menu.click();
  await page.getByLabel('Search v0.0.0').fill('sidecar');
  await page.getByRole('link', { name: 'Metadata and sidecars (v0.0.0)', exact: true }).click();
  assert.match(page.url(), /metadata-and-sidecars/);
  await go('/docs/v0.0.0/?missing=older-topic');
  await menu.click();
  await page.getByRole('status').filter({ hasText: 'older-topic' }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'Documentation navigation' }).waitFor({ state: 'hidden' });
  results.push('Compact TOC keyboard dismissal and mobile version-scoped search navigation/fallback');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await go('/docs/v0.0.0/metadata-and-sidecars/');
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('Reading theme').selectOption(theme);
    await scan('syntax-code-' + theme);
  }
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => {
    const native = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = async (value) => {
      window.galleryCopiedPayload = value;
      await native(value);
    };
  });
  const example = page.locator('.code-example').first();
  const source = await example.locator('[data-code-source]').textContent();
  await example.getByRole('button').click();
  assert.equal(await page.evaluate(() => window.galleryCopiedPayload), source, 'Exact Clipboard API payload');
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(
    process.platform === 'win32' ? clipboard.replaceAll('\r\n', '\n') : clipboard,
    source,
    'Native text clipboard (Windows normalizes LF to CRLF)',
  );
  await example.getByRole('status').filter({ hasText: 'Copied' }).waitFor();
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error('denied');
        },
      },
    }),
  );
  await example.getByRole('button').click();
  await example.getByRole('status').filter({ hasText: 'Copy failed' }).waitFor();
  results.push('Exact code clipboard source and accessible rejection feedback');
  const model = await createModel(root);
  const diagramPages = model.pages.filter((p) => p.html.includes('data-diagram'));
  for (const entry of diagramPages)
    for (const theme of ['light', 'dark']) {
      await go(entry.route);
      await page.getByLabel('Reading theme').selectOption(theme);
      const svg = page.locator('.diagram-output svg:visible');
      assert.equal(await svg.count(), 1, 'Exactly one theme diagram exposed');
      const check = await svg.evaluate((el) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        const rgb = (color) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => {
            const x = v / 255;
            return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          });
        };
        const lum = (color) => {
          const c = rgb(color);
          return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
        };
        const contrast = (a, b) => {
          const x = lum(a),
            y = lum(b);
          return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
        };
        const bg = getComputedStyle(el.closest('.diagram')).backgroundColor;
        const textContrast = [...el.querySelectorAll('.node text')].map((text) =>
          contrast(
            getComputedStyle(text).fill,
            getComputedStyle(text.closest('.node').querySelector('rect,polygon,circle,ellipse,path')).fill,
          ),
        );
        const edgeContrast = [...el.querySelectorAll('.flowchart-link')].map((edge) =>
          contrast(getComputedStyle(edge).stroke, bg),
        );
        const title = el.querySelector('title'),
          description = el.querySelector('desc');
        const text = [...el.querySelectorAll('text')];
        return {
          minimumTextContrast: Math.min(...textContrast),
          minimumEdgeContrast: Math.min(...edgeContrast),
          title: title?.textContent,
          description: description?.textContent,
          labels: text.length,
          font: text[0] && getComputedStyle(text[0]).fontSize,
          unsafe: el.querySelectorAll('foreignObject,script,image,a').length,
          width: el.getBoundingClientRect().width,
          viewWidth: el.viewBox.baseVal.width,
        };
      });
      assert.ok(
        check.minimumTextContrast >= 4.5 && check.minimumEdgeContrast >= 3,
        'Diagram label/relationship contrast: ' + JSON.stringify(check),
      );
      diagramChecks.push({ route: entry.route, theme, ...check });
      assert.ok(check.title && check.description && check.labels > 5);
      assert.equal(check.font, '16px');
      assert.equal(check.unsafe, 0);
      assert.ok(check.width >= check.viewWidth - 1, 'Readable intrinsic diagram dimensions');
      await page.locator('.diagram').scrollIntoViewIfNeeded();
      await snapshot(entry.topic + '-' + theme);
      const ax = await page.locator('.diagram-output').ariaSnapshot();
      assert.ok(
        ax.includes(check.title) && ax.includes(check.description),
        'Diagram accessible relationship description',
      );
    }
  results.push(
    'All four diagrams in both themes: intrinsic 16px labels, unique described SVG semantics and screenshots',
  );
  for (const route of model.pages.map((p) => p.route)) {
    await go(route);
    assert.ok((await page.locator('h1').count()) === 1, 'Retained route ' + route);
  }
  for (const route of ['/docs/', '/docs/latest/', '/docs/v0.0.0/']) {
    await go(route);
    const entry = await page.locator('.source-content').innerText();
    assert.ok(entry.includes('live website at https://localmedia.gallery'));
    assert.ok(entry.includes('installable Full/Lite packages have not been published'));
  }
  await go('/docs/latest/');
  assert.match(await page.locator('.alias-note').innerText(), /v0.0.0/);
  await go('/docs/v0.0.0/schema/');
  assert.ok((await page.locator('.prose details').count()) > 10);
  await page.locator('.prose a[href^="#schema-"]').first().click();
  await go('/404.html');
  assert.match(await page.locator('h1').innerText(), /Page not found/);
  assert.equal(await page.locator('meta[name=robots]').getAttribute('content'), 'noindex');
  results.push(
    'Every canonical route, latest alias, generic schema pointers, changelog and noindex error page',
  );
  for (const width of [320, 768])
    for (const route of ['/', '/docs/v0.0.0/interfaces-and-contracts/', '/changelog/']) {
      await page.setViewportSize({ width, height: 900 });
      await go(route);
      await reflow(width + route);
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      await reflow('200 percent ' + width + route);
    }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await go('/docs/v0.0.0/overview/');
  await page.evaluate(() => {
    const p = document.createElement('p');
    p.style.width = '12rem';
    const a = document.createElement('a');
    a.href = '/docs/v0.0.0/overview/';
    a.textContent = 'Read the complete versioned gallery navigation and media reference';
    a.dataset.wrappedFixture = 'true';
    p.append(a);
    document.querySelector('.source-content').prepend(p);
  });
  const link = page.locator('[data-wrapped-fixture]');
  assert.ok(await link.evaluate((el) => el.getClientRects().length > 1), 'Real multiline link wrapping');
  await link.scrollIntoViewIfNeeded();
  const before = await link.boundingBox();
  await link.hover();
  const after = await link.boundingBox();
  assert.deepEqual(after, before, 'Hover has no text geometry shift');
  assert.match(await link.evaluate((el) => getComputedStyle(el).textDecorationLine), /underline/);
  await link.focus();
  assert.notEqual(await link.evaluate((el) => getComputedStyle(el).outlineStyle), 'none');
  await page.emulateMedia({ forcedColors: 'active' });
  assert.match(await link.evaluate((el) => getComputedStyle(el).textDecorationLine), /underline/);
  await page.emulateMedia({ forcedColors: 'none' });
  results.push(
    '320px reflow, 200 percent text, wrapped prose-link hover/focus geometry and forced-colors underline',
  );
  const offline = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const plain = await offline.newPage();
  await plain.goto(server.url + '/docs/v0.0.0/architecture/');
  assert.equal(await plain.locator('.diagram-output svg:visible').count(), 1);
  assert.ok(await plain.locator('.mermaid-source').count());
  await plain.goto(server.url + '/docs/v0.0.0/metadata-and-sidecars/');
  assert.ok(await plain.locator('[data-code-source]').count());
  assert.equal(await plain.locator('[data-copy-code]:visible').count(), 0);
  await plain.goto(server.url);
  assert.match(await plain.locator('body').innerText(), /No installable Full or Lite packages/);
  await offline.close();
  await context.route('**/search/*.json', (route) => route.abort());
  await go('/docs/v0.0.0/overview/');
  await page.getByRole('status').filter({ hasText: 'Search is unavailable' }).waitFor();
  results.push('No-JavaScript landing/diagrams/code and failed-search chapter fallback');
  assert.deepEqual(failures, [], 'Browser runtime errors');
  await context.close();
  const moving = await browser.newContext({
    reducedMotion: 'no-preference',
    viewport: { width: 1440, height: 1000 },
  });
  const motionPage = await moving.newPage();
  await motionPage.goto(server.url + '/docs/v0.0.0/architecture/');
  assert.equal(
    await motionPage.locator('.bb-app-frame__scroll').evaluate((el) => getComputedStyle(el).scrollBehavior),
    'smooth',
  );
  assert.ok(
    await motionPage.locator('.reading-toc .toc-marker').evaluate((el) =>
      getComputedStyle(el)
        .transitionDuration.split(',')
        .every((value) => value.trim() === '0.18s'),
    ),
  );
  await motionPage
    .getByRole('navigation', { name: 'Page contents', exact: true })
    .locator('a')
    .last()
    .click();
  await motionPage.waitForFunction(() =>
    [...document.querySelectorAll('.reading-toc a')].at(-1)?.hasAttribute('aria-current'),
  );
  await moving.close();
  const fallback = await browser.newContext();
  await fallback.route('**/*.woff2', (route) => route.abort());
  const fallbackPage = await fallback.newPage();
  await fallbackPage.goto(server.url);
  assert.ok(await fallbackPage.locator('h1').isVisible());
  assert.ok(await fallbackPage.getByRole('link', { name: /Read the documentation/ }).isVisible());
  await fallback.close();
  results.push('Default smooth-anchor/active-marker motion and missing-font fallback');
  const performance = live ? null : await coldSamples(browser, server.url);
  const record = {
    result: 'pass',
    browser: browser.version(),
    origin: server.url,
    terminalFinished: new Date().toISOString(),
    seconds: (Date.now() - started) / 1000,
    results,
    scans,
    screenshots,
    diagrams: diagramChecks,
    performance,
    coverageLimit:
      'Automated axe, browser accessibility tree and directed keyboard/geometry checks; no attended NVDA/VoiceOver speech session or field Core Web Vitals.',
  };
  await writeFile(
    path.join(root, live ? '.local/site-browser-live.json' : '.local/site-browser.json'),
    JSON.stringify(record, null, 2) + '\n',
  );
  console.log('Passed ' + results.length + ' rendered website groups in ' + record.seconds + 's.');
} catch (error) {
  await writeFile(
    path.join(root, live ? '.local/site-browser-live.json' : '.local/site-browser.json'),
    JSON.stringify(
      {
        result: 'fail',
        terminalFinished: new Date().toISOString(),
        results,
        scans,
        screenshots,
        error: error.stack,
      },
      null,
      2,
    ) + '\n',
  );
  throw error;
} finally {
  await browser.close();
  await server.close();
}
