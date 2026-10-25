// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, validateMeasurement } from '../scripts/measurement.mjs';

test('measurement summaries retain bounded observations and qualify percentile evidence', () => {
  assert.deepEqual(summarize([]), { count: 0, samples: [], median: null, p95: null, maximum: null });
  const short = summarize([3, 1, 2]);
  assert.equal(short.median, 2); assert.equal(short.p95, null);
  const bounded = summarize(Array.from({ length: 300 }, (_, i) => i));
  assert.equal(bounded.count, 256); assert.equal(bounded.samples[0], 44);
  assert.equal(bounded.maximum, 299); assert.equal(bounded.p95, 287);
  for (const bad of [[NaN], [Infinity], [-1]]) assert.throws(() => summarize(bad));
});

test('native report cannot omit operations, mix source identity or claim unqualified cold caches', () => {
  assert.throws(() => validateMeasurement({}));
  const report = {
    formatVersion: 1, label: 'baseline', artifact: { sha256: 'a'.repeat(64), flavor: 'debug/native-tests' },
    fixture: { candidates: 12, records: [{ bytes: 4, sha256: 'b'.repeat(64) }], totalBytes: 4 },
    environment: { os: 'Windows', cache: 'fresh application profile; OS cache unknown' },
    operations: Object.fromEntries(['startup', 'discovery', 'scroll', 'sortSizeDesc', 'filterImage', 'filterVideo', 'playback', 'seek', 'metadataIPC', 'metadataRender'].map(name => [name, summarize([1, 2, 3])])),
    frames: summarize([16, 17]), memory: [{ coverage: 'endpoint-only', native: { privateBytes: 4 }, webview: { privateBytes: 8 } }],
    footprints: Object.fromEntries(['download', 'extractedDistribution', 'developmentExecutable', 'requiredRuntime', 'optionalProductTools', 'thumbnailCache', 'profileCache', 'fixtureTool'].map(key => [key, { status: 'unavailable', basis: 'not measured' }])),
  };
  assert.equal(validateMeasurement(report), report);
  assert.throws(() => validateMeasurement({ ...report, operations: { ...report.operations, metadataIPC: summarize([]) } }));
  assert.throws(() => validateMeasurement({ ...report, fixture: { ...report.fixture, totalBytes: 5 } }));
  assert.throws(() => validateMeasurement({ ...report, environment: { ...report.environment, cache: 'OS cold' } }));
  assert.throws(() => validateMeasurement({ ...report, footprints: { download: { status: 'measured', bytes: 0 } } }));
});
