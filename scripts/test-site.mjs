// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { root } from './run.mjs';
import { serve } from './static-server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.local/browsers');
const { chromium } = await import('playwright');

const server = await serve(path.join(root, 'apps/site/out'));
const browser = await chromium.launch({ headless: true, channel: 'chromium', executablePath: process.env.GALLERY_SITE_BROWSER });
const results = []; const failures = [];
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(error.message));
  const requests = []; page.on('request', request => requests.push(request.url()));
  await page.goto(server.url); await page.getByRole('heading', { name: 'Your media presented beautifully.' }).waitFor();
  assert.match(await page.locator('body').innerText(), /No installable Full or Lite packages/);
  assert.ok(!requests.some(url => url.includes('/search/') || url.includes('mermaid')), 'Landing requested documentation runtime');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').textContent(), 'Skip to content');
  assert.notEqual(await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle), 'none');
  await page.screenshot({ path: path.join(root, '.local/site-landing.png'), fullPage: true });
  results.push('Independent landing, truthful availability, keyboard/focus and no search requests');
  await page.goto(server.url + '/docs/v0.0.0/architecture/');
  await page.locator('.diagram-output[data-rendered="true"] svg').waitFor({ timeout: 30000 });
  await page.screenshot({ path: path.join(root, '.local/site-docs.png'), fullPage: true });
  await page.getByLabel('Search v0.0.0').fill('sidecar');
  await page.getByRole('link', { name: 'Metadata and sidecars (v0.0.0)', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Metadata and sidecars (v0.0.0)', exact: true }).click();
  assert.match(page.url(), /v0\.0\.0\/metadata-and-sidecars/);
  results.push('Diagram rendered SVG and version-scoped search result navigation');
  await page.goto(server.url + '/docs/v0.0.0/?missing=older-topic');
  await page.getByRole('status').filter({ hasText: 'older-topic' }).waitFor();
  await page.goto(server.url + '/docs/latest/');
  assert.match(await page.locator('.alias-note').innerText(), /v0.0.0/);
  await page.goto(server.url + '/docs/v0.0.0/schema/');
  assert.ok(await page.locator('.prose details').count() > 10);
  await page.locator('.prose a[href^="#schema-"]').first().click();
  assert.ok(await page.evaluate(() => !!document.getElementById(decodeURIComponent(location.hash.slice(1)))));
  results.push('Missing-topic fallback, static aliases and linked schema tree');
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/docs/v0.0.0/interfaces-and-contracts/', '/changelog/']) {
      await page.goto(server.url + route);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `Viewport overflow ${width} ${route}`);
      assert.ok(await page.locator('h1').isVisible());
    }
  }
  results.push('Narrow/wide reading, tables/code and reduced motion');
  await mkdir(path.join(root, '.local'), { recursive: true });
  await page.screenshot({ path: path.join(root, '.local/site-desktop.png'), fullPage: true });
  assert.deepEqual(failures, [], 'Browser runtime errors');
  await writeFile(path.join(root, '.local/site-browser.json'), JSON.stringify({ result: 'pass', browser: browser.version(), terminalFinished: new Date().toISOString(), results }, null, 2) + '\n');
  console.log(`Passed ${results.length} rendered website acceptance groups.`);
} finally { await browser.close(); await server.close(); }
