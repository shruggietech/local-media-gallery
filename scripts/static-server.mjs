// SPDX-License-Identifier: Apache-2.0
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

export async function serve(directory) {
  const base = path.resolve(directory);
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
    '.xml': 'application/xml',
  };
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let file = path.resolve(base, '.' + pathname);
      if (file !== base && !file.startsWith(base + path.sep)) throw new Error('Outside root');
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const bytes = await readFile(file);
      const compressed =
        /gzip/.test(request.headers['accept-encoding'] ?? '') &&
        /\.(?:html|js|css|json|svg|xml|webmanifest)$/.test(file);
      response.writeHead(200, {
        'Content-Type': types[path.extname(file)] ?? 'text/plain; charset=utf-8',
        Vary: 'Accept-Encoding',
        ...(compressed ? { 'Content-Encoding': 'gzip' } : {}),
      });
      response.end(compressed ? gzipSync(bytes) : bytes);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
