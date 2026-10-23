// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { Resolver } from 'node:dns/promises';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyArtifact, verifyLiveInventory, publicDnsQuery, publicResolvers } from './deployment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(await readFile(path.join(root, 'site/deployment.json'), 'utf8'));
const [directory, evidencePath] = process.argv.slice(2);
if (!directory || !evidencePath) throw new Error('Usage: verify-live-site.mjs ARTIFACT EVIDENCE');
const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
const artifact = await verifyArtifact(directory, evidence, evidence.context.revision);
const record = { started: new Date().toISOString(), origin: policy.origin, identity: artifact.identity, result: 'pending' };
const destination = path.join(root, '.local/site-live.json'); await mkdir(path.dirname(destination), { recursive: true });
async function query(resolver, type, name) {
  try { return await resolver.resolve(name, type); } catch (error) { if (['ENODATA', 'ENOTFOUND'].includes(error.code)) return []; throw error; }
}
const observedResolvers = new Map();
async function doh(endpoint, type, name) {
  const value = await publicDnsQuery(endpoint, type, name); observedResolvers.set(endpoint, value.endpoint);
  assert.equal(value.Status, 0, 'Validating resolver returned DNS failure');
  return (value.Answer ?? []).filter(answer => answer.type === type).map(answer => answer.data.replace(/\.$/, '').toLowerCase()).sort();
}
async function dnsReadiness() {
  const observations = [];
  const resolvers = publicResolvers;
  let nameservers;
  for (const endpoint of resolvers) {
    const ns = await doh(endpoint, 2, policy.domain); assert.equal(ns.length, 2, 'Expected two authoritative nameservers');
    if (nameservers) assert.deepEqual(ns, nameservers, 'Public NS disagreement'); else nameservers = ns;
    assert.deepEqual(await doh(endpoint, 1, policy.domain), [...policy.ipv4].sort(), 'Public IPv4 not ready');
    assert.deepEqual(await doh(endpoint, 28, policy.domain), [...policy.ipv6].sort(), 'Public IPv6 not ready');
    const ds = await doh(endpoint, 43, policy.domain); assert.deepEqual(ds, [], 'DNSSEC delegation changed from verified unsigned baseline');
    const caa = await doh(endpoint, 257, policy.domain); assert.ok(caa.length === 0 || caa.some(value => /issue\s+"letsencrypt\.org"/.test(value)), 'CAA excludes Pages certificate issuer');
    const txt = await doh(endpoint, 16, `_github-pages-challenge-shruggietech.${policy.domain}`); assert.ok(txt.length > 0, 'Ownership TXT absent');
    observations.push({ resolver: observedResolvers.get(endpoint), nameservers: ns, ds, caa, ownershipTXT: true });
  }
  try {
    const before = JSON.parse(await readFile(path.join(root, '.local/site-deployment/baseline.json'), 'utf8'));
    assert.deepEqual(nameservers, before.zone.name_servers.map(value => value.toLowerCase()).sort(), 'Public delegation differs from provider baseline');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const bootstrap = new Resolver({ timeout: 5000, tries: 1 }); bootstrap.setServers(['1.1.1.1']);
  for (const server of nameservers) {
    const addresses = await bootstrap.resolve4(server); const resolver = new Resolver({ timeout: 5000, tries: 1 }); resolver.setServers(addresses);
    assert.deepEqual((await query(resolver, 'A', policy.domain)).sort(), [...policy.ipv4].sort(), 'Authoritative IPv4 mismatch');
    assert.deepEqual((await query(resolver, 'AAAA', policy.domain)).sort(), [...policy.ipv6].sort(), 'Authoritative IPv6 mismatch');
    assert.ok((await query(resolver, 'TXT', `_github-pages-challenge-shruggietech.${policy.domain}`)).length, 'Authoritative ownership TXT absent');
    observations.push({ authoritative: server, ipv4: true, ipv6: true, ownershipTXT: true });
  }
  return observations;
}
try {
  const deadline = Date.now() + 600000;
  for (;;) {
    try {
      record.dns = await dnsReadiness();
      const response = await fetch(policy.origin + '/deployment.json', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      assert.equal(response.status, 200); assert.deepEqual(await response.json(), artifact.identity, 'Live deployment identity not ready');
      const http = await fetch('http://' + policy.domain + '/', { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      assert.ok([301, 302, 307, 308].includes(http.status), 'HTTP does not redirect');
      assert.equal(new URL(http.headers.get('location'), 'http://' + policy.domain).href, policy.origin + '/', 'Wrong HTTPS redirect');
      record.https = { trustedCertificate: true, redirect: http.status }; break;
    } catch (error) {
      record.lastPendingReason = error.message;
      if (Date.now() + 15000 >= deadline) throw error;
      console.log('Waiting for DNS/TLS/deployment readiness: ' + error.message); await delay(15000);
    }
  }
  record.files = await verifyLiveInventory(artifact.files, policy.origin);
  record.result = 'pass'; delete record.lastPendingReason;
} catch (error) { record.result = 'fail'; record.failure = error.message; process.exitCode = 1; }
record.terminalFinished = new Date().toISOString();
await writeFile(destination, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ result: record.result, revision: artifact.identity.revision, files: record.files?.length, failure: record.failure }));
