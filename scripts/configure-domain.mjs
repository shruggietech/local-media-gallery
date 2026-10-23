// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planDns, applyDnsPlan, rollbackDns, rollbackPages, recordValue, publicDnsQuery, publicResolvers } from './deployment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(await readFile(path.join(root, 'site/deployment.json'), 'utf8'));
assert.equal(policy.domain, 'localmedia.gallery'); assert.equal(policy.repository, 'shruggietech/local-media-gallery');
const directory = path.join(root, '.local/site-deployment'); await mkdir(directory, { recursive: true });
const [command, journalArgument] = process.argv.slice(2);
assert.ok(['preflight', 'plan', 'bind', 'apply', 'rollback', 'drill'].includes(command), 'Usage: configure-domain.mjs preflight|plan|bind|apply|rollback JOURNAL|drill');
async function save(filename, value) {
  const temporary = filename + '.tmp'; await writeFile(temporary, JSON.stringify(value, null, 2) + '\n'); await rename(temporary, filename);
}
async function cloudflare(endpoint, { method = 'GET', body, registrar = false } = {}) {
  const token = process.env[registrar ? 'CLOUDFLARE_REGISTRAR_API_TOKEN' : 'CF_DNS_API_TOKEN']; assert.ok(token, 'Missing scoped Cloudflare environment credential');
  const response = await fetch('https://api.cloudflare.com/client/v4/' + endpoint, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  const value = await response.json(); assert.ok(response.ok && value.success, `Cloudflare ${method} failed (${response.status}): ${JSON.stringify(value.errors)}`);
  return value.result;
}
async function github(endpoint, { method = 'GET', body, allow404 = false } = {}) {
  return new Promise((resolve, reject) => {
    const args = ['api', endpoint, '--method', method]; if (body) args.push('--input', '-');
    const child = spawn('gh', args, { cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, GH_PROMPT_DISABLED: '1', GIT_TERMINAL_PROMPT: '0' } });
    let stdout = ''; let stderr = ''; let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, 30000);
    child.stdout.on('data', bytes => { stdout += bytes; }); child.stderr.on('data', bytes => { stderr += bytes; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); if (timedOut) return reject(new Error('GitHub request timed out; remote outcome requires readback'));
      if (allow404 && code !== 0 && stderr.includes('HTTP 404')) return resolve(null);
      if (code !== 0) return reject(new Error(`GitHub ${method} failed: ${stderr.trim()}`));
      resolve(stdout.trim() ? JSON.parse(stdout) : null);
    });
    child.stdin.end(body ? JSON.stringify(body) : '');
  });
}
const zones = await cloudflare('zones?name=' + policy.domain + '&per_page=50');
assert.equal(zones.length, 1, 'Expected exactly one existing owned zone; zone/delegation operation requires provider readback');
const zone = zones[0]; assert.equal(zone.status, 'active', 'Zone not active');
assert.equal(zone.account.id, process.env.CLOUDFLARE_ACCOUNT_ID, 'Wrong Cloudflare account');
const endpoint = `zones/${zone.id}/dns_records`;
const api = {
  list: () => cloudflare(endpoint + '?per_page=5000'),
  get: async id => (await cloudflare(endpoint + '?per_page=5000')).find(record => record.id === id) ?? null,
  create: body => cloudflare(endpoint, { method: 'POST', body }),
  update: (id, body) => cloudflare(endpoint + '/' + id, { method: 'PUT', body }),
  delete: id => cloudflare(endpoint + '/' + id, { method: 'DELETE' }),
};
const pagesEndpoint = `repos/${policy.repository}/pages`;
const records = await api.list(); const pages = await github(pagesEndpoint, { allow404: true });
if (command === 'preflight') {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID; assert.ok(account, 'Missing Cloudflare account');
  const registration = await cloudflare(`accounts/${account}/registrar/domains/${policy.domain}`, { registrar: true });
  const registrar = Object.fromEntries(['name', 'current_registrar', 'last_known_status', 'name_servers', 'ds_records', 'auto_renew', 'privacy', 'locked'].map(key => [key, registration[key]]));
  const snapshot = { observed: new Date().toISOString(), zone: { id: zone.id, name: zone.name, status: zone.status, name_servers: zone.name_servers }, registrar, dnssec: await cloudflare(`zones/${zone.id}/dnssec`), records, pages };
  await save(path.join(directory, 'preflight.json'), snapshot);
  try { await writeFile(path.join(directory, 'baseline.json'), JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  console.log(JSON.stringify({ domain: zone.name, zone: zone.status, nameservers: zone.name_servers, registrar: registrar.current_registrar, locked: registrar.locked, autoRenew: registrar.auto_renew, dnssec: snapshot.dnssec.status, records: records.length, pages: pages ? { cname: pages.cname, build_type: pages.build_type, https_enforced: pages.https_enforced } : null }));
} else if (command === 'bind') {
  const journalFile = path.join(directory, `pages-binding-${Date.now()}.json`);
  const before = pages; const journal = { version: 1, kind: 'pages-binding', before, desired: { build_type: 'workflow', cname: policy.domain }, state: 'pending' }; await save(journalFile, journal);
  if (!pages) await github(pagesEndpoint, { method: 'POST', body: { build_type: 'workflow' } });
  if (!pages || pages.cname !== policy.domain || pages.build_type !== 'workflow') await github(pagesEndpoint, { method: 'PUT', body: journal.desired });
  const after = await github(pagesEndpoint); assert.equal(after.cname, policy.domain); assert.equal(after.build_type, 'workflow');
  journal.after = after; journal.state = 'applied'; await save(journalFile, journal);
  console.log(JSON.stringify({ domain: after.cname, buildType: after.build_type, ownership: after.protected_domain_state }));
} else if (command === 'plan' || command === 'apply') {
  const changes = planDns(records, policy);
  if (command === 'plan') {
    await save(path.join(directory, 'dns-plan.json'), { observed: new Date().toISOString(), changes });
    console.log(JSON.stringify({ domain: policy.domain, changes: changes.map(change => ({ kind: change.kind, before: recordValue(change.before), after: recordValue(change.after) })) }, null, 2));
  } else {
    assert.equal(pages?.cname, policy.domain, 'Assign repository Pages domain before DNS routing');
    assert.equal(pages?.build_type, 'workflow', 'Pages custom Actions required');
    assert.equal(pages?.protected_domain_state, 'verified', 'Verify organization Pages ownership before DNS routing');
    assert.ok(records.some(record => record.type === 'TXT' && record.name === `_github-pages-challenge-shruggietech.${policy.domain}`), 'Keep organization verification TXT');
    const beforeDnssec = await cloudflare(`zones/${zone.id}/dnssec`);
    const journalFile = path.join(directory, `dns-${Date.now()}.json`);
    const journal = await applyDnsPlan(api, changes, value => save(journalFile, value));
    const after = await api.list(); assert.equal(planDns(after, policy).length, 0, 'DNS plan not fully applied');
    const outside = values => values.filter(record => !(record.name === policy.domain && ['A', 'AAAA', 'CNAME'].includes(record.type))).sort((left, right) => left.id.localeCompare(right.id));
    assert.deepEqual(outside(after), outside(records), 'Unrelated DNS records changed');
    assert.deepEqual(await cloudflare(`zones/${zone.id}/dnssec`), beforeDnssec, 'DNSSEC changed');
    await save(path.join(directory, 'dns-readback.json'), { observed: new Date().toISOString(), records: after, dnssec: beforeDnssec, journal: path.basename(journalFile) });
    console.log(JSON.stringify({ result: 'pass', writes: journal.entries.length, journal: path.relative(root, journalFile) }));
  }
} else if (command === 'drill') {
  const name = '_deployment-check.' + policy.domain; assert.ok(!records.some(record => record.name === name), 'Rollback drill record already exists');
  const journalFile = path.join(directory, `drill-${Date.now()}.json`); const content = randomUUID();
  const journal = await applyDnsPlan(api, [{ kind: 'create', before: null, after: { type: 'TXT', name, content, ttl: 300, proxied: false } }], value => save(journalFile, value));
  await rollbackDns(api, journal, value => save(journalFile, value));
  assert.deepEqual((await api.list()).sort((left, right) => left.id.localeCompare(right.id)), records.sort((left, right) => left.id.localeCompare(right.id)), 'Rollback drill changed baseline DNS');
  console.log(JSON.stringify({ result: 'pass', rollback: 'created temporary TXT and restored original inventory', journal: path.relative(root, journalFile) }));
} else {
  assert.ok(journalArgument, 'Rollback requires a private journal path');
  const journalFile = path.resolve(root, journalArgument); assert.ok(journalFile.startsWith(directory + path.sep), 'Rollback journal must be in private deployment directory');
  const journal = JSON.parse(await readFile(journalFile, 'utf8'));
  if (journal.kind === 'pages-binding' || (!Array.isArray(journal.entries) && Object.hasOwn(journal, 'before') && Object.hasOwn(journal, 'desired'))) {
    assert.equal(journal.desired.cname, policy.domain); assert.equal(journal.desired.build_type, 'workflow');
    const ensureWithdrawn = async () => {
      for (const resolver of publicResolvers) {
        for (const type of [1, 28, 5]) {
          const value = await publicDnsQuery(resolver, type, policy.domain);
          assert.ok([0, 3].includes(value.Status), 'Public DNS withdrawal not verified');
          assert.ok(!(value.Answer ?? []).some(answer => [...policy.ipv4, ...policy.ipv6].includes(answer.data.toLowerCase()) || /(?:^|\.)github\.io\.?$/i.test(answer.data)), 'Public DNS still routes to Pages; keep binding');
        }
      }
    };
    await rollbackPages({ get: () => github(pagesEndpoint, { allow404: true }), update: body => github(pagesEndpoint, { method: 'PUT', body }), delete: () => github(pagesEndpoint, { method: 'DELETE' }) }, journal, { domain: policy.domain, records, ensureWithdrawn, persist: value => save(journalFile, value) });
    console.log('Restored prior Pages configuration with compare-before-restore and DNS withdrawal verification. Ownership TXT retained.');
  } else {
    assert.ok(Array.isArray(journal.entries), 'Invalid DNS rollback journal');
    assert.ok(journal.entries.every(entry => [entry.before, entry.after].filter(Boolean).every(record => (record.name === policy.domain && ['A', 'AAAA', 'CNAME'].includes(record.type)) || (record.name === '_deployment-check.' + policy.domain && record.type === 'TXT'))), 'Rollback record outside owned web scope');
    await rollbackDns(api, journal, value => save(journalFile, value)); console.log('Rolled back owned DNS changes. Ownership TXT retained.');
  }
}
