// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';

export const operations = ['startup', 'discovery', 'scroll', 'sortSizeDesc', 'filterImage', 'filterVideo', 'playback', 'seek', 'metadataIPC', 'metadataRender'];
export function summarize(values) {
  assert.ok(values.every(n => Number.isFinite(n) && n >= 0), 'Finite nonnegative observations required');
  const samples = values.slice(-256);
  const sorted = samples.toSorted((a, b) => a - b);
  const count = sorted.length;
  return { count, samples, median: count ? (sorted[Math.floor((count - 1) / 2)] + sorted[Math.floor(count / 2)]) / 2 : null, p95: count >= 20 ? sorted[Math.ceil(count * 0.95) - 1] : null, maximum: count ? sorted[count - 1] : null };
}

export function validateMeasurement(report) {
  assert.equal(report.formatVersion, 1);
  assert.match(report.artifact.sha256, /^[0-9a-f]{64}$/);
  assert.ok(report.artifact.flavor);
  assert.equal(report.fixture.candidates, 12, 'This election uses the small functional fixture');
  assert.equal(report.fixture.totalBytes, report.fixture.records.reduce((n, r) => n + r.bytes, 0));
  assert.ok(report.fixture.records.every(r => Number.isSafeInteger(r.bytes) && r.bytes >= 0 && /^[0-9a-f]{64}$/.test(r.sha256)));
  assert.ok(report.environment.os);
  assert.match(report.environment.cache, /OS.*unknown/i, 'Do not claim OS-cold evidence from a fresh application profile');
  for (const name of operations) {
    assert.ok(report.operations[name]?.count >= 3, 'Three observations required: ' + name);
    assert.deepEqual(report.operations[name], summarize(report.operations[name].samples));
  }
  assert.deepEqual(report.frames, summarize(report.frames.samples));
  assert.ok(report.memory.length > 0 && report.memory.every(r => r.coverage));
  for (const key of ['download', 'extractedDistribution', 'developmentExecutable', 'requiredRuntime', 'optionalProductTools', 'thumbnailCache', 'profileCache', 'fixtureTool']) {
    const value = report.footprints[key];
    assert.ok(value?.basis && ['measured', 'unavailable', 'not-applicable'].includes(value.status), 'Explicit footprint basis: ' + key);
    if (value.status === 'measured') assert.ok(Number.isSafeInteger(value.bytes) && value.bytes >= 0, key);
  }
  return report;
}
