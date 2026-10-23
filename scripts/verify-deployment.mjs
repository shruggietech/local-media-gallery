// SPDX-License-Identifier: Apache-2.0
import { readFile } from 'node:fs/promises';
import { verifyArtifact } from './deployment.mjs';

const [directory, evidencePath, revision] = process.argv.slice(2);
if (!directory || !evidencePath || !revision) throw new Error('Usage: verify-deployment.mjs ARTIFACT EVIDENCE REVISION');
const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
const result = await verifyArtifact(directory, evidence, revision);
console.log(`Verified ${result.files.length} qualified files for revision ${result.identity.revision}.`);
