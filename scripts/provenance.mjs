// SPDX-License-Identifier: Apache-2.0
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root } from './run.mjs';

export const evidenceExclusions = [
  'specs/010-sidecar-metadata-inspection/tasks.md',
  'specs/010-sidecar-metadata-inspection/verification.md',
  'specs/009-responsive-discovery-recovery/tasks.md',
  'specs/009-responsive-discovery-recovery/verification.md',
  'specs/008-portable-gallery-state/tasks.md',
  'specs/008-portable-gallery-state/verification.md',
  'specs/007-website-experience/tasks.md',
  'specs/007-website-experience/verification.md',
  'specs/006-website-deployment/verification.md',
  'specs/006-website-deployment/tasks.md',
];
export async function sourceIdentity() {
  const { stdout } = await promisify(execFile)(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: root, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
  );
  const files = [...new Set(stdout.split('\0').filter(Boolean))]
    .filter((file) => !evidenceExclusions.includes(file))
    .sort();
  const digest = createHash('sha256');
  for (const file of files) {
    digest.update(file);
    digest.update('\0');
    digest.update(
      createHash('sha256')
        .update(await readFile(path.join(root, file)))
        .digest(),
    );
  }
  return { sha256: digest.digest('hex'), files: files.length, exclusions: evidenceExclusions };
}
