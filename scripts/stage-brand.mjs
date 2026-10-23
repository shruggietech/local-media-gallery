// SPDX-License-Identifier: Apache-2.0
import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root } from './run.mjs';
import { verifyInstalled } from './sync-brand-kit.mjs';

await verifyInstalled(path.join(root, 'brand'));
const surface = process.argv[2] ?? 'gallery';
if (!['gallery', 'site'].includes(surface)) throw new Error('Unknown brand staging surface');
const names = [
  'fonts/fonts.css',
  ...['SpaceGrotesk-Medium', 'SpaceGrotesk-Bold', 'Geist-Regular', 'Geist-Medium', 'GeistMono-Regular'].map(
    (name) => `fonts/woff2/${name}.woff2`,
  ),
  'logos/named/localmedia-gallery-brand-mark-reduced-detail-full-color-clear-for-dark.svg',
  'logos/named/localmedia-gallery-brand-mark-reduced-detail-full-color-clear-for-light.svg',
  'LICENSE',
  'LICENSE-BRAND.md',
  'NOTICE',
];
async function filesWithin(prefix) {
  const files = [];
  for (const entry of await readdir(path.join(root, 'brand/kit', prefix), { withFileTypes: true })) {
    const name = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await filesWithin(name)));
    else if (entry.isFile()) files.push(name);
  }
  return files;
}
names.push(...(await filesWithin('fonts/licenses')));
const inventory = [];
for (const name of names) {
  const source = path.join(root, 'brand/kit', name);
  const target = path.join(root, `apps/${surface}/public/brand`, name);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  const bytes = await readFile(target);
  inventory.push({
    path: name,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
  });
}
if (surface === 'site') {
  const files = [
    'favicon.svg',
    'favicon.ico',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'apple-touch-icon.png',
    'site.webmanifest',
    'android-chrome-192x192.png',
    'android-chrome-512x512.png',
    'maskable-icon-192x192.png',
    'maskable-icon-512x512.png',
  ];
  for (const name of files) {
    const source = 'favicons/' + name;
    const bytes = await readFile(path.join(root, 'brand/kit', source));
    await copyFile(path.join(root, 'brand/kit', source), path.join(root, 'apps/site/public', name));
    inventory.push({
      path: '/' + name,
      source,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length,
    });
  }
  const source = 'logos/png/localmedia-gallery-social-preview-1280.png';
  const bytes = await readFile(path.join(root, 'brand/kit', source));
  await copyFile(
    path.join(root, 'brand/kit', source),
    path.join(root, 'apps/site/public/social-preview.png'),
  );
  inventory.push({
    path: '/social-preview.png',
    source,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
  });
}
await mkdir(path.join(root, '.local'), { recursive: true });
await import('node:fs/promises').then((fs) =>
  fs.writeFile(
    path.join(root, surface === 'gallery' ? '.local/staged-brand.json' : '.local/staged-brand-site.json'),
    JSON.stringify(inventory, null, 2) + '\n',
  ),
);
console.log(`Staged ${names.length} exact brand assets and notices.`);
