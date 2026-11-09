// SPDX-License-Identifier: Apache-2.0
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root } from './run.mjs';

export const evidenceExclusions = [
  'specs/038-v030-release-preparation/tasks.md',
  'specs/038-v030-release-preparation/verification.md',
  'specs/038-v030-release-preparation/measurements.md',
  'specs/035-ci-observer-reliability/tasks.md',
  'specs/035-ci-observer-reliability/verification.md',
  'specs/035-ci-observer-reliability/measurements.md',
  'specs/034-v022-hotfix-preparation/tasks.md',
  'specs/034-v022-hotfix-preparation/verification.md',
  'specs/034-v022-hotfix-preparation/measurements.md',
  'specs/033-windows-msi-upgrade/tasks.md',
  'specs/033-windows-msi-upgrade/verification.md',
  'specs/033-windows-msi-upgrade/measurements.md',
  'specs/031-v021-release-preparation/tasks.md',
  'specs/031-v021-release-preparation/verification.md',
  'specs/031-v021-release-preparation/measurements.md',
  'specs/030-windows-msi-installer/tasks.md',
  'specs/030-windows-msi-installer/verification.md',
  'specs/030-windows-msi-installer/measurements.md',
  'specs/026-v020-release-publication/tasks.md',
  'specs/026-v020-release-publication/verification.md',
  'specs/026-v020-release-publication/measurements.md',
  'specs/025-single-file-editions/tasks.md',
  'specs/025-single-file-editions/verification.md',
  'specs/025-single-file-editions/measurements.md',
  'specs/024-gallery-preparation/tasks.md',
  'specs/024-gallery-preparation/verification.md',
  'specs/024-gallery-preparation/measurements.md',
  'specs/023-release-recovery/tasks.md',
  'specs/023-release-recovery/verification.md',
  'specs/023-release-recovery/measurements.md',
  'specs/022-initial-public-release/tasks.md',
  'specs/022-initial-public-release/verification.md',
  'specs/022-initial-public-release/measurements.md',
  'specs/021-verified-releases/tasks.md',
  'specs/021-verified-releases/verification.md',
  'specs/021-verified-releases/measurements.md',
  'specs/020-upgrade-recovery/tasks.md',
  'specs/020-upgrade-recovery/verification.md',
  'specs/020-upgrade-recovery/measurements.md',
  'specs/019-packaging-readiness/tasks.md',
  'specs/019-packaging-readiness/verification.md',
  'specs/019-packaging-readiness/measurements.md',
  'specs/018-linux-packaging/tasks.md',
  'specs/018-linux-packaging/verification.md',
  'specs/018-linux-packaging/measurements.md',
  'specs/017-dependency-closure/tasks.md',
  'specs/017-dependency-closure/verification.md',
  'specs/017-dependency-closure/measurements.md',
  'specs/016-macos-packaging/tasks.md',
  'specs/016-macos-packaging/verification.md',
  'specs/016-macos-packaging/measurements.md',
  'specs/015-windows-packaging/tasks.md',
  'specs/015-windows-packaging/verification.md',
  'specs/015-windows-packaging/measurements.md',
  'specs/014-native-media-accessibility/tasks.md',
  'specs/014-native-media-accessibility/verification.md',
  'specs/014-native-media-accessibility/measurements.md',
  'specs/013-thumbnail-jobs-diagnostics/tasks.md',
  'specs/013-thumbnail-jobs-diagnostics/verification.md',
  'specs/013-thumbnail-jobs-diagnostics/measurements.md',
  'specs/012-platform-launch-contracts/tasks.md',
  'specs/012-platform-launch-contracts/verification.md',
  'specs/012-platform-launch-contracts/measurements.md',
  'specs/011-measured-adaptive-loading/tasks.md',
  'specs/011-measured-adaptive-loading/verification.md',
  'specs/011-measured-adaptive-loading/measurements.md',
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
export async function sourceIdentity(base=root) {
  const { stdout } = await promisify(execFile)(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: base, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
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
        .update(await readFile(path.join(base, file)))
        .digest(),
    );
  }
  return { sha256: digest.digest('hex'), files: files.length, exclusions: evidenceExclusions };
}
