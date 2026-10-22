// SPDX-License-Identifier: Apache-2.0
import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root } from './run.mjs';
import { verifyInstalled } from './sync-brand-kit.mjs';

await verifyInstalled(path.join(root, 'brand'));
const names = [
  'fonts/fonts.css',
  ...['SpaceGrotesk-Medium', 'SpaceGrotesk-Bold', 'Geist-Regular', 'Geist-Medium', 'GeistMono-Regular'].map(name => `fonts/woff2/${name}.woff2`),
  'logos/named/localmedia-gallery-brand-mark-reduced-detail-full-color-clear-for-dark.svg',
  'logos/named/localmedia-gallery-brand-mark-reduced-detail-full-color-clear-for-light.svg',
  'LICENSE', 'LICENSE-BRAND.md', 'NOTICE',
];
async function filesWithin(prefix) {
  const files = [];
  for (const entry of await readdir(path.join(root, 'brand/kit', prefix), { withFileTypes: true })) {
    const name = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await filesWithin(name));
    else if (entry.isFile()) files.push(name);
  }
  return files;
}
names.push(...await filesWithin('fonts/licenses'));
const inventory = [];
for (const name of names) {
  const source = path.join(root, 'brand/kit', name);
  const target = path.join(root, 'apps/gallery/public/brand', name);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  const bytes = await readFile(target);
  inventory.push({ path: name, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
}
await mkdir(path.join(root, '.local'), { recursive: true });
await import('node:fs/promises').then(fs => fs.writeFile(path.join(root, '.local/staged-brand.json'), JSON.stringify(inventory, null, 2) + '\n'));
console.log(`Staged ${names.length} exact brand assets and notices.`);
