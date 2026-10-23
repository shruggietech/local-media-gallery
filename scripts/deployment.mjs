// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const hostname = value => value.toLowerCase().replace(/\.$/, '');
const hash = value => createHash('sha256').update(value).digest('hex');
export function recordValue(record) {
  if (!record) return null;
  const type = record.type.toUpperCase();
  const content = ['A', 'AAAA', 'CNAME'].includes(type) ? hostname(record.content) : record.content;
  return { type, name: hostname(record.name), content, ttl: record.ttl ?? 300, proxied: record.proxied ?? false, comment: record.comment ?? null, tags: [...(record.tags ?? [])].sort() };
}
const equal = (left, right) => JSON.stringify(recordValue(left)) === JSON.stringify(recordValue(right));

export function planDns(records, policy) {
  assert.match(policy.domain, /^[a-z0-9.-]+$/);
  const desired = [...policy.ipv4.map(content => ({ type: 'A', content })), ...policy.ipv6.map(content => ({ type: 'AAAA', content }))]
    .map(record => ({ ...record, name: policy.domain, ttl: 300, proxied: false }));
  const managed = records.filter(record => hostname(record.name) === policy.domain && ['A', 'AAAA', 'CNAME'].includes(record.type));
  const changes = []; const retained = new Set();
  for (const record of managed) {
    const target = desired.find(value => value.type === record.type && value.content === recordValue(record).content);
    const key = target && `${target.type}:${target.content}`;
    if (!target || retained.has(key)) changes.push({ kind: 'delete', before: record, after: null });
    else { retained.add(key); const after = { ...target, comment: record.comment ?? null, tags: record.tags ?? [] }; if (!equal(record, after)) changes.push({ kind: 'update', before: record, after }); }
  }
  for (const target of desired) if (!retained.has(`${target.type}:${target.content}`)) changes.push({ kind: 'create', before: null, after: target });
  return changes.sort((left, right) => (left.kind === 'delete' ? -1 : 1) - (right.kind === 'delete' ? -1 : 1));
}

export async function applyDnsPlan(api, changes, persist) {
  const journal = { version: 1, started: new Date().toISOString(), entries: [] };
  await persist(journal);
  for (const change of changes) {
    if (change.before) assert.ok(equal(await api.get(change.before.id), change.before), 'DNS changed since plan; conflict');
    else assert.ok(!(await api.list()).some(record => equal(record, change.after)), 'DNS changed since plan; create conflict');
    const entry = { ...structuredClone(change), state: 'pending' };
    if (change.kind === 'delete') entry.peers = (await api.list()).filter(record => record.id !== change.before.id && record.type === change.before.type && hostname(record.name) === hostname(change.before.name) && record.content === change.before.content).map(record => record.id);
    journal.entries.push(entry); await persist(journal);
    if (change.kind === 'create') entry.after = await api.create(change.after);
    else if (change.kind === 'update') entry.after = await api.update(change.before.id, change.after);
    else await api.delete(change.before.id);
    entry.state = 'applied'; await persist(journal);
  }
  journal.terminalFinished = new Date().toISOString(); await persist(journal); return journal;
}

export async function rollbackDns(api, journal, persist) {
  assert.equal(journal.version, 1);
  assert.ok(journal.entries.every(entry => ['applied', 'rolled-back'].includes(entry.state)), 'Pending mutation has uncertain provider outcome; readback required');
  for (const entry of [...journal.entries].reverse()) {
    if (entry.state === 'rolled-back') continue;
    if (entry.after) assert.ok(equal(await api.get(entry.after.id), entry.after), 'DNS changed after application; rollback conflict');
    else assert.ok(!(await api.list()).some(record => hostname(record.name) === hostname(entry.before.name) && record.type === entry.before.type && record.content === entry.before.content && !entry.peers?.includes(record.id) && !journal.entries.some(previous => previous.restoredId === record.id)), 'Deleted DNS record was recreated; rollback conflict');
    if (entry.kind === 'create') await api.delete(entry.after.id);
    else if (entry.kind === 'update') await api.update(entry.before.id, recordValue(entry.before));
    else entry.restoredId = (await api.create(recordValue(entry.before))).id;
    entry.state = 'rolled-back'; await persist(journal);
  }
  journal.rollbackFinished = new Date().toISOString(); await persist(journal);
}

export function safeArtifactPath(value) {
  assert.equal(typeof value, 'string', 'Invalid artifact path');
  assert.ok(value && !/[\\\0:]/.test(value) && !value.startsWith('/') && value.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe artifact path');
  return value;
}
async function regularFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    assert.ok(!entry.isSymbolicLink(), 'Artifact contains symlink');
    if (entry.isDirectory()) files.push(...await regularFiles(path.join(directory, entry.name), relative + '/'));
    else { assert.ok(entry.isFile(), 'Artifact must contain only regular files'); files.push(relative); }
  }
  return files.sort();
}
export async function verifyArtifact(directory, evidence, revision) {
  assert.equal(evidence.result, 'pass', 'Website qualification did not pass');
  assert.equal(evidence.context?.scope, 'website', 'Wrong qualification scope');
  assert.match(revision, /^[a-f0-9]{40}$/);
  assert.equal(evidence.context.revision, revision, 'Qualification revision mismatch');
  assert.match(evidence.context.source?.sha256, /^[a-f0-9]{64}$/);
  const files = evidence.artifacts;
  assert.ok(Array.isArray(files) && files.length > 0, 'Missing qualification inventory');
  const names = files.map(file => safeArtifactPath(file.path));
  assert.equal(new Set(names).size, names.length, 'Duplicate artifact path');
  assert.deepEqual(await regularFiles(directory), [...names].sort(), 'Artifact inventory mismatch or missing file');
  for (const file of files) {
    assert.ok(Number.isSafeInteger(file.bytes) && file.bytes >= 0, 'Invalid artifact bytes');
    assert.match(file.sha256, /^[a-f0-9]{64}$/);
    const bytes = await readFile(path.join(directory, file.path));
    assert.equal(bytes.length, file.bytes, `Artifact bytes mismatch: ${file.path}`);
    assert.equal(hash(bytes), file.sha256, `Artifact hash mismatch: ${file.path}`);
  }
  assert.ok(names.includes('deployment.json'), 'Missing deployment identity');
  const identity = JSON.parse(await readFile(path.join(directory, 'deployment.json'), 'utf8'));
  assert.equal(identity.version, 1); assert.equal(identity.revision, revision, 'Deployment revision mismatch');
  assert.deepEqual(identity.source, evidence.context.source, 'Deployment source mismatch');
  return { identity, files };
}

export async function verifyLiveInventory(files, origin, { fetcher = fetch, concurrency = 6, deadline = Date.now() + 600000 } = {}) {
  const base = new URL(origin); assert.equal(base.protocol, 'https:', 'Live verification requires HTTPS');
  assert.equal(base.pathname, '/'); assert.equal(base.search, ''); assert.equal(base.hash, '');
  const results = new Array(files.length); let next = 0; const abort = new AbortController();
  const outcomes = await Promise.allSettled(Array.from({ length: Math.min(concurrency, files.length) }, async () => {
    try {
    while (next < files.length) {
      const index = next++; const file = files[index]; safeArtifactPath(file.path);
      assert.ok(Date.now() < deadline, 'Live verification deadline exceeded');
      const relative = file.path.replace(/(^|\/)index\.html$/, '$1').split('/').map(encodeURIComponent).join('/');
      const url = new URL(relative, base);
      const response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.any([abort.signal, AbortSignal.timeout(Math.max(1, Math.min(30000, deadline - Date.now())))]) });
      assert.equal(response.status, 200, `Live status/redirect mismatch: ${file.path} (${response.status})`);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(bytes.length, file.bytes, `Live bytes mismatch: ${file.path}`);
      assert.equal(hash(bytes), file.sha256, `Live hash mismatch: ${file.path}`);
      results[index] = { path: file.path, sha256: file.sha256 };
    }
    } catch (error) { abort.abort(error); next = files.length; throw error; }
  }));
  const failed = outcomes.find(outcome => outcome.status === 'rejected'); if (failed) throw failed.reason;
  return results;
}
