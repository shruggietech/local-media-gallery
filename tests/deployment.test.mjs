// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { planDns, applyDnsPlan, rollbackDns, rollbackPages, recordValue, verifyArtifact, verifyLiveInventory, publicDnsQuery, publicResolvers } from '../scripts/deployment.mjs';

const digest = text => createHash('sha256').update(text).digest('hex');
const policy = { domain: 'localmedia.gallery', ipv4: ['185.199.108.153'], ipv6: ['2606:50c0:8000::153'] };
const address = (id, content = policy.ipv4[0], extra = {}) => ({ id, type: 'A', name: policy.domain, content, ttl: 300, proxied: false, ...extra });
test('public DNS hostname fallback keeps TLS validation and rejects wrong questions or certificate failures', async () => {
  const requested = []; const body = { Status: 0, Question: [{ name: policy.domain + '.', type: 1 }], Answer: [] };
  const fetcher = async (url, options) => { requested.push({ url, options }); if (requested.length === 1) throw new Error('fetch failed', { cause: { code: 'ENOTFOUND' } }); return Response.json(body); };
  const value = await publicDnsQuery(publicResolvers[0], 1, policy.domain, { fetcher }); assert.equal(value.endpoint, 'https://1.1.1.1/dns-query');
  assert.ok(requested.every(request => request.url.startsWith('https:') && request.options.signal));
  let calls = 0; await assert.rejects(publicDnsQuery(publicResolvers[1], 1, policy.domain, { fetcher: async () => { calls++; throw new Error('certificate failure', { cause: { code: 'ERR_TLS_CERT_ALTNAME_INVALID' } }); } }), /certificate/); assert.equal(calls, 1);
  await assert.rejects(publicDnsQuery(publicResolvers[0], 1, policy.domain, { fetcher: async () => Response.json({ ...body, Question: [{ name: 'other.example.org', type: 1 }] }) }), /question mismatch/i);
});
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

function pagesProvider(initial) {
  let current = structuredClone(initial); const writes = [];
  return { writes, get: async () => structuredClone(current),
    update: async value => { current = structuredClone(value); writes.push(['update', value]); },
    delete: async () => { current = null; writes.push(['delete']); },
  };
}
const bound = { build_type: 'workflow', cname: policy.domain, https_enforced: false };
test('Pages binding rollback restores prior settings and is idempotent', async () => {
  const before = { build_type: 'legacy', cname: 'previous.example.org', https_enforced: true, source: { branch: 'pages', path: '/docs' } };
  const journal = { before, desired: bound, after: bound, state: 'applied' }; const api = pagesProvider(bound);
  let withdrawn = 0; await rollbackPages(api, journal, { domain: policy.domain, records: [], ensureWithdrawn: async () => { withdrawn++; }, persist: async () => {} });
  assert.deepEqual(await api.get(), before); assert.equal(withdrawn, 1);
  await rollbackPages(api, journal, { domain: policy.domain, records: [], ensureWithdrawn: async () => {}, persist: async () => {} }); assert.equal(api.writes.length, 1);
});

test('Pages creation rollback deletes only after provider and public DNS withdrawal', async () => {
  const journal = { before: null, desired: bound, after: bound, state: 'applied' }; const api = pagesProvider(bound);
  await assert.rejects(rollbackPages(api, journal, { domain: policy.domain, records: [address('active')], ensureWithdrawn: async () => {}, persist: async () => {} }), /DNS|withdraw/i);
  await assert.rejects(rollbackPages(api, journal, { domain: policy.domain, records: [], ensureWithdrawn: async () => { throw new Error('public DNS still routes traffic'); }, persist: async () => {} }), /public DNS/i);
  assert.equal(api.writes.length, 0);
  await rollbackPages(api, journal, { domain: policy.domain, records: [], ensureWithdrawn: async () => {}, persist: async () => {} }); assert.equal(await api.get(), null);
});

test('Pages rollback rejects concurrent changes and pending writes, and recovers a completed uncertain restore', async () => {
  const journal = { before: null, desired: bound, after: bound, state: 'applied' };
  const changed = pagesProvider({ ...bound, cname: 'concurrent.example.org' });
  const options = { domain: policy.domain, records: [], ensureWithdrawn: async () => {}, persist: async () => {} };
  await assert.rejects(rollbackPages(changed, journal, options), /conflict|changed/i); assert.equal(changed.writes.length, 0);
  await assert.rejects(rollbackPages(pagesProvider(bound), { ...journal, state: 'pending' }, options), /pending|uncertain/i);
  const completed = { ...journal, rollback: { state: 'pending' } }; const restored = pagesProvider(null);
  await rollbackPages(restored, completed, options); assert.equal(completed.state, 'rolled-back'); assert.equal(restored.writes.length, 0);
});

test('actual DNS rollback CLI works with GitHub unavailable and no GitHub executable', async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const base = path.join(root, '.local/site-deployment'); await mkdir(base, { recursive: true });
  const directory = await mkdtemp(path.join(base, 'cli-fixture-')); const preload = path.join(directory, 'cloudflare-fixture.mjs'); const journalPath = path.join(directory, 'dns.json');
  const after = address('fixture-record');
  await writeFile(journalPath, JSON.stringify({ version: 1, entries: [{ kind: 'create', before: null, after, state: 'applied' }] }));
  await writeFile(preload, `import fs from 'node:fs/promises';let records=${JSON.stringify([after])};const events=[];globalThis.fetch=async(input,options={})=>{const url=new URL(input);if(url.origin!=='https://api.cloudflare.com')throw new Error('Unexpected network provider');let result;if(url.pathname==='/client/v4/zones')result=[{id:'fixture-zone',status:'active',account:{id:'fixture-account'}}];else if(url.pathname==='/client/v4/zones/fixture-zone/dns_records/fixture-record'&&options.method==='DELETE'){records=[];events.push('delete');result={id:'fixture-record'};}else if(url.pathname==='/client/v4/zones/fixture-zone/dns_records')result=records;else throw new Error('Unexpected fixture request');await fs.writeFile(${JSON.stringify(path.join(directory, 'events.json'))},JSON.stringify(events));return Response.json({success:true,result});};\n`);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'path'));
  Object.assign(env, { PATH: '', GH_TOKEN: '', GITHUB_TOKEN: '', GH_CONFIG_DIR: directory, CF_DNS_API_TOKEN: 'fixture-not-a-credential', CLOUDFLARE_REGISTRAR_API_TOKEN: 'fixture-not-a-credential', CLOUDFLARE_ACCOUNT_ID: 'fixture-account' });
  try {
    const result = await promisify(execFile)(process.execPath, ['--import', pathToFileURL(preload).href, path.join(root, 'scripts/configure-domain.mjs'), 'rollback', journalPath], { cwd: root, env, windowsHide: true, timeout: 15000 });
    assert.match(result.stdout, /Rolled back owned DNS/); assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'events.json'), 'utf8')), ['delete']);
    assert.equal(JSON.parse(await readFile(journalPath, 'utf8')).entries[0].state, 'rolled-back');
  } finally { assert.ok(directory.startsWith(base + path.sep)); await rm(directory, { recursive: true }); }
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
