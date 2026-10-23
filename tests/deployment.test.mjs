// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { planDns, applyDnsPlan, rollbackDns, recordValue, verifyArtifact, verifyLiveInventory } from '../scripts/deployment.mjs';

const digest = text => createHash('sha256').update(text).digest('hex');
const policy = { domain: 'localmedia.gallery', ipv4: ['185.199.108.153'], ipv6: ['2606:50c0:8000::153'] };
const address = (id, content = policy.ipv4[0], extra = {}) => ({ id, type: 'A', name: policy.domain, content, ttl: 300, proxied: false, ...extra });
function provider(records = []) {
  const state = new Map(records.map(record => [record.id, structuredClone(record)])); let serial = 0; const writes = [];
  return { state, writes, list: async () => [...state.values()], get: async id => state.get(id) ?? null,
    create: async value => { const result = { ...value, id: `new-${++serial}` }; state.set(result.id, result); writes.push(['create', result]); return result; },
    update: async (id, value) => { const result = { ...value, id }; state.set(id, result); writes.push(['update', result]); return result; },
    delete: async id => { state.delete(id); writes.push(['delete', id]); },
  };
}

test('DNS planning preserves mail, TXT, services and other names; exact rerun is empty', async () => {
  const unrelated = [{ id: 'mail', type: 'MX', name: policy.domain, content: 'mail.example.org', priority: 10 }, { id: 'verify', type: 'TXT', name: '_github-pages-challenge-shruggietech.' + policy.domain, content: 'keep' }, address('other', '192.0.2.1', { name: 'other.' + policy.domain })];
  const api = provider(unrelated); const journal = await applyDnsPlan(api, planDns(await api.list(), policy), async () => {});
  assert.equal(journal.entries.length, 2); assert.equal(planDns(await api.list(), policy).length, 0);
  for (const value of unrelated) assert.deepEqual(await api.get(value.id), value);
  await rollbackDns(api, journal, async () => {}); assert.deepEqual(await api.list(), unrelated);
});

test('DNS reconciles duplicate/proxied/wrong addresses and apex CNAME without touching TXT', async () => {
  const api = provider([address('proxy', undefined, { proxied: true }), address('duplicate'), address('wrong', '192.0.2.2'), { id: 'alias', type: 'CNAME', name: policy.domain, content: 'old.example.org', ttl: 1, proxied: true }, { id: 'txt', type: 'TXT', name: policy.domain, content: 'unrelated' }]);
  const journal = await applyDnsPlan(api, planDns(await api.list(), policy), async () => {});
  assert.equal(planDns(await api.list(), policy).length, 0); assert.ok(await api.get('txt'));
  await rollbackDns(api, journal, async () => {}); assert.equal((await api.list()).length, 5);
});

test('DNS update preconditions and rollback reject intervening edits', async () => {
  const api = provider([address('a', undefined, { proxied: true })]); const plan = planDns(await api.list(), policy);
  api.state.set('a', address('a', '192.0.2.99')); await assert.rejects(applyDnsPlan(api, plan, async () => {}), /changed|conflict/i);
  assert.equal(api.writes.length, 0);
  const fresh = provider(); const journal = await applyDnsPlan(fresh, planDns([], policy), async () => {});
  const id = journal.entries[0].after.id; fresh.state.set(id, address(id, '192.0.2.99'));
  await assert.rejects(rollbackDns(fresh, journal, async () => {}), /changed|conflict/i); assert.equal((await fresh.get(id)).content, '192.0.2.99');
});

test('journal persists pending mutation before provider writes and refuses uncertain rollback', async () => {
  const api = provider(); const saved = []; api.create = async () => { throw new Error('network timeout'); };
  await assert.rejects(applyDnsPlan(api, planDns([], policy), async journal => saved.push(structuredClone(journal))), /timeout/);
  const pending = saved.find(journal => journal.entries.length);
  assert.equal(pending.entries[0].state, 'pending');
  await assert.rejects(rollbackDns(api, pending, async () => {}), /uncertain|pending/i);
});

test('record comparisons normalize DNS names and address case but retain proxy/TTL distinction', () => {
  assert.deepEqual(recordValue(address('a', undefined, { name: 'LOCALMEDIA.GALLERY.' })), recordValue(address('b')));
  assert.notDeepEqual(recordValue(address('a')), recordValue(address('a', undefined, { proxied: true })));
});

test('DNS address reconciliation preserves comments and tags and detects metadata conflicts', async () => {
  const existing = address('annotated', undefined, { proxied: true, comment: 'retain', tags: ['owner:site'] });
  const api = provider([existing]); const changes = planDns(await api.list(), policy);
  assert.equal(changes.find(change => change.kind === 'update').after.comment, 'retain');
  api.state.set('annotated', { ...existing, comment: 'concurrent edit' });
  await assert.rejects(applyDnsPlan(api, changes, async () => {}), /conflict/i); assert.equal(api.writes.length, 0);
});

async function artifact() {
  const directory = await mkdtemp(path.join(tmpdir(), 'gallery-deployment-'));
  const source = { sha256: 'a'.repeat(64), files: 4, exclusions: [] }; const revision = 'b'.repeat(40);
  const identity = JSON.stringify({ version: 1, revision, source, versions: ['v0.0.0'] }) + '\n';
  await writeFile(path.join(directory, 'index.html'), '<h1>Gallery</h1>'); await writeFile(path.join(directory, 'deployment.json'), identity);
  const evidence = { result: 'pass', context: { scope: 'website', revision, source }, artifacts: [{ path: 'index.html', bytes: 16, sha256: digest('<h1>Gallery</h1>') }, { path: 'deployment.json', bytes: Buffer.byteLength(identity), sha256: digest(identity) }] };
  return { directory, evidence, revision };
}

test('artifact gate uses actual qualified identity and rejects failed/source-mismatched evidence', async () => {
  const item = await artifact(); try {
    const result = await verifyArtifact(item.directory, item.evidence, item.revision); assert.equal(result.files.length, 2);
    await assert.rejects(verifyArtifact(item.directory, { ...item.evidence, result: 'fail' }, item.revision), /qualif/i);
    await assert.rejects(verifyArtifact(item.directory, item.evidence, 'c'.repeat(40)), /revision/i);
    const wrong = structuredClone(item.evidence); wrong.context.source.sha256 = 'd'.repeat(64);
    await assert.rejects(verifyArtifact(item.directory, wrong, item.revision), /source/i);
  } finally { await rm(item.directory, { recursive: true }); }
});

test('artifact gate rejects tampered, missing, extra, duplicate and escaping files', async () => {
  const item = await artifact(); try {
    for (const pathname of ['../escape', '/escape', 'a\\b', 'C:/escape']) {
      const bad = structuredClone(item.evidence); bad.artifacts.push({ path: pathname, bytes: 0, sha256: digest('') });
      await assert.rejects(verifyArtifact(item.directory, bad, item.revision), /path/i);
    }
    const duplicate = structuredClone(item.evidence); duplicate.artifacts.push(duplicate.artifacts[0]);
    await assert.rejects(verifyArtifact(item.directory, duplicate, item.revision), /duplicate/i);
    await writeFile(path.join(item.directory, 'extra'), 'unexpected'); await assert.rejects(verifyArtifact(item.directory, item.evidence, item.revision), /inventory/i);
    await rm(path.join(item.directory, 'extra')); await writeFile(path.join(item.directory, 'index.html'), 'tampered');
    await assert.rejects(verifyArtifact(item.directory, item.evidence, item.revision), /hash|bytes/i);
    await rm(path.join(item.directory, 'index.html')); await assert.rejects(verifyArtifact(item.directory, item.evidence, item.revision), /inventory|missing/i);
  } finally { await rm(item.directory, { recursive: true }); }
});

test('artifact gate rejects symlink/junction output instead of following external files', async () => {
  const item = await artifact(); const outside = await mkdtemp(path.join(tmpdir(), 'gallery-outside-')); try {
    await writeFile(path.join(outside, 'external'), 'outside');
    await symlink(outside, path.join(item.directory, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(verifyArtifact(item.directory, item.evidence, item.revision), /symlink|regular/i);
  } finally { await rm(item.directory, { recursive: true }); await rm(outside, { recursive: true }); }
});

test('live inventory validates bytes, canonical routes, HTTPS and origin without accepting redirects', async () => {
  const requests = []; const files = [{ path: 'docs/v0.0.0/index.html', bytes: 2, sha256: digest('ok') }, { path: 'file%name.json', bytes: 2, sha256: digest('ok') }];
  const fetcher = async url => { requests.push(url.href); return new Response('ok', { status: 200 }); };
  assert.equal((await verifyLiveInventory(files, 'https://localmedia.gallery', { fetcher })).length, 2);
  assert.match(requests[0], /\/docs\/v0\.0\.0\/$/); assert.match(requests[1], /file%25name/);
  await assert.rejects(verifyLiveInventory(files, 'http://localmedia.gallery', { fetcher }), /HTTPS/i);
  await assert.rejects(verifyLiveInventory(files, 'https://localmedia.gallery', { fetcher: async () => new Response('bad') }), /hash|bytes/i);
  await assert.rejects(verifyLiveInventory(files, 'https://localmedia.gallery', { fetcher: async () => new Response('', { status: 302, headers: { location: 'https://other.example.org' } }) }), /status|redirect/i);
});
