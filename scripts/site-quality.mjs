// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
export async function coldSamples(browser, origin) {
  const samples = [];
  for (const mobile of [false, true])
    for (const route of ['/', '/docs/v0.0.0/thumbnails-and-performance/'])
      for (let sample = 0; sample < 3; sample++) {
        const context = await browser.newContext({
          viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
          reducedMotion: 'reduce',
        });
        try {
          const page = await context.newPage();
          const cdp = await context.newCDPSession(page);
          await cdp.send('Network.enable');
          await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
          await cdp.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: mobile ? 150 : 40,
            downloadThroughput: mobile ? 1600000 / 8 : 10000000 / 8,
            uploadThroughput: mobile ? 750000 / 8 : 1000000 / 8,
          });
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: mobile ? 4 : 1 });
          await page.addInitScript(() => {
            window.galleryLab = { lcp: 0, cls: 0 };
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) window.galleryLab.lcp = entry.startTime;
            }).observe({ type: 'largest-contentful-paint', buffered: true });
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries())
                if (!entry.hadRecentInput) window.galleryLab.cls += entry.value;
            }).observe({ type: 'layout-shift', buffered: true });
          });
          const bodies = [];
          const pending = [];
          page.on('response', (response) => {
            if (response.url().startsWith(origin))
              pending.push(
                response
                  .body()
                  .then((bytes) =>
                    bodies.push({
                      path: new URL(response.url()).pathname,
                      bytes: bytes.length,
                      gzip9: gzipSync(bytes, { level: 9 }).length,
                    }),
                  )
                  .catch(() => {}),
              );
          });
          await page.goto(origin + route, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(150);
          await Promise.all(pending);
          const metrics = await page.evaluate(() => window.galleryLab);
          const js = bodies.filter((body) => body.path.endsWith('.js'));
          const css = bodies.filter((body) => body.path.endsWith('.css'));
          const decoded = js.reduce((n, b) => n + b.bytes, 0),
            gzip9 = js.reduce((n, b) => n + b.gzip9, 0),
            total = bodies.reduce((n, b) => n + b.bytes, 0);
          assert.ok(
            decoded <= (route === '/' ? 650000 : 900000),
            'Cold JavaScript decoded budget: ' + decoded + ' ' + route,
          );
          assert.ok(
            gzip9 <= (route === '/' ? 200000 : 300000),
            'Cold JavaScript gzip budget: ' + gzip9 + ' ' + route,
          );
          assert.ok(
            total <= (route === '/' ? 900000 : 1500000),
            'Cold initial-response budget: ' + total + ' ' + route,
          );
          assert.ok(css.reduce((n, b) => n + b.bytes, 0) <= 100000, 'Cold CSS budget');
          assert.ok(!bodies.some((body) => /mermaid|shiki/i.test(body.path)), 'Reader renderer runtime');
          if (route === '/')
            assert.ok(!bodies.some((body) => body.path.startsWith('/search/')), 'Landing search payload');
          assert.ok(metrics.lcp > 0 && metrics.cls <= 0.1, 'Lab CLS or missing LCP');
          samples.push({
            route,
            profile: mobile ? 'mobile' : 'desktop',
            sample: sample + 1,
            lcpMs: metrics.lcp,
            cls: metrics.cls,
            jsDecoded: decoded,
            jsGzip9: gzip9,
            responseDecoded: total,
            bodies,
          });
        } finally {
          await context.close();
        }
      }
  for (const profile of ['desktop', 'mobile'])
    for (const route of ['/', '/docs/v0.0.0/thumbnails-and-performance/']) {
      const values = samples
        .filter((s) => s.profile === profile && s.route === route)
        .map((s) => s.lcpMs)
        .sort((a, b) => a - b);
      assert.ok(
        values[1] <= (profile === 'desktop' ? 2500 : 4000),
        'Median lab LCP: ' + values[1] + ' ' + profile + ' ' + route,
      );
    }
  return {
    conditions: {
      desktop: { viewport: '1440x1000', cpu: 1, latencyMs: 40, downMbps: 10, upMbps: 1 },
      mobile: { viewport: '390x844', cpu: 4, latencyMs: 150, downMbps: 1.6, upMbps: 0.75 },
      cache: 'disabled in isolated contexts',
      responseSizes: 'decoded bytes and gzip-9 estimates; loopback HTTP gzip enabled',
      fieldData: 'not measured',
    },
    samples,
  };
}
