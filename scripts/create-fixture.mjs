// SPDX-License-Identifier: Apache-2.0
import { mkdtemp, mkdir, copyFile, writeFile, readdir, readFile, stat, utimes, chmod } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { root, execute, python } from './run.mjs';
import {prepareMediaTool} from './prepare-media-tool.mjs';

export async function inventory(directory) {
  const records = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const record of await inventory(target)) records.push({ ...record, name: `${entry.name}/${record.name}` });
    } else if (entry.isFile()) {
      const bytes = await readFile(target);
      records.push({ name: entry.name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
  return records.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

export async function createFixture() {
  const base = path.join(root, '.local/fixtures'); await mkdir(base, { recursive: true });
  const directory = await mkdtemp(path.join(base, 'gallery-'));
  await execute(python, [path.join(root, 'scripts/create-fixture.py'), directory]);
  const ffmpeg = (await prepareMediaTool()).binary;
  const common = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=12'];
  await execute(ffmpeg, [...common, '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-t', '4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', '-shortest', path.join(directory, 'clip audio.mp4')]);
  await execute(ffmpeg, [...common, '-t', '3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', path.join(directory, 'clip silent.mp4')]);
  await copyFile(path.join(directory, 'image2.jpg'), path.join(directory, '.hidden.jpg'));
  await mkdir(path.join(directory, 'nested')); await copyFile(path.join(directory, 'square.png'), path.join(directory, 'nested/child.png'));
  await writeFile(path.join(directory, 'notes.json'), '{"custom": {"value": false}, "Title": "Optional source document"}\n');
  const fixed = new Date('2026-01-01T00:00:00Z');
  for (const entry of await readdir(directory, { withFileTypes: true })) if (entry.isFile()) await utimes(path.join(directory, entry.name), fixed, fixed);
  await chmod(path.join(directory, 'A equal.jpg'), 0o444);
  const records = await inventory(directory);
  const names = records.filter(x => !x.name.includes('/') && !x.name.startsWith('.') && !x.name.endsWith('.json')).map(x => x.name);
  if (names.length !== 12) throw new Error('The functional fixture must contain twelve represented media candidates.');
  const descriptor = { directory, names, records, expected: { images: 10, videos: 2, stills: {
    'image2.jpg': [320, 180], 'image10.jpg': [180, 320], 'square.png': [200, 200],
    'wide # 100%.webp': [640, 100], 'snow 雪.png': [100, 300], 'oriented.jpg': [120, 240],
    'A equal.jpg': [160, 100], 'onload=alert(1).webp': [160, 100],
  } } };
  await writeFile(path.join(root, '.local/native-fixture.json'), JSON.stringify(descriptor, null, 2) + '\n');
  return descriptor;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fixture = await createFixture(); console.log(`Small native fixture ready: ${fixture.names.length} media candidates.`);
}
