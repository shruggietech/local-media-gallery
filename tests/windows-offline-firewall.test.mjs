// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWindowsOfflineFirewall,validateWindowsOfflineIntent,restoreWindowsOfflineIntent,restoreWindowsOfflineCampaigns} from '../scripts/windows-offline-firewall.mjs';
import {mkdtemp,mkdir,writeFile,readFile,access,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {firewallFixture} from './fixtures/windows-offline-firewall.mjs';

test('offline policy retains only exact runner HTTPS and configured service-scoped DNS',()=>{
 const record=firewallFixture();const original=structuredClone(record);assert.equal(validateWindowsOfflineFirewall(record),true);assert.deepEqual(record,original);
});
function intentFixture(){const policy=firewallFixture();return{kind:'local-media-gallery-windows-offline-policy-intent',formatVersion:1,ownedGroup:policy.ownedGroup,ownedRuleNames:['listener','worker','dns-tcp','dns-udp'].map(s=>policy.ownedGroup+'-'+s),before:{...policy,disabledRuleNames:['previous-local-allow'],profiles:policy.profiles.map(p=>({...p,DefaultOutboundAction:'Allow'}))}};}
test('restoration intent rejects foreign scope, malformed policy and unowned rule names',()=>{
 const intent=intentFixture();assert.equal(validateWindowsOfflineIntent(intent,{workspace:intent.before.workspace}),true);assert.equal(validateWindowsOfflineIntent(intent,{workspace:intent.before.workspace+'\\'}),true);
 for(const corrupt of [r=>r.kind='foreign',r=>r.formatVersion=2,r=>r.ownedGroup='foreign',r=>r.ownedRuleNames[0]='foreign-rule',r=>r.before.disabledRuleNames.push(r.ownedRuleNames[0]),r=>r.before.profiles[0].Name='Unknown',r=>r.before.profiles[0].Enabled=true,r=>r.before.profiles[0].DefaultOutboundAction='Unknown',r=>r.before.dnsServers=['Any']]){const candidate=structuredClone(intent);corrupt(candidate);assert.throws(()=>validateWindowsOfflineIntent(candidate));}
 assert.throws(()=>validateWindowsOfflineIntent(intent,{workspace:'D:\\different-workspace'}));
});
test('interrupted cleanup retains retry authority, successful cleanup retains completed intent and is idempotent',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'lmg-firewall-cleanup-'));const directory=path.join(root,'.local','windows-package-test-proof');await mkdir(directory,{recursive:true});const intent=path.join(directory,'single-file-offline-restoration.json');const original=JSON.stringify(intentFixture());await writeFile(intent,original);let calls=0;
 try{
  await assert.rejects(restoreWindowsOfflineIntent(intent,{invoke:async()=>{calls++;throw Error('Interrupted native restoration');}}),/Interrupted native restoration/);assert.equal(await readFile(intent,'utf8'),original);
  await restoreWindowsOfflineIntent(intent,{invoke:async()=>{calls++;return{restored:true};}});assert.equal(calls,2);assert.equal(await readFile(path.join(directory,'single-file-offline-restoration-restored.json'),'utf8'),original);await assert.rejects(access(intent),{code:'ENOENT'});
  assert.deepEqual(await restoreWindowsOfflineCampaigns(root,{invoke:async()=>{throw Error('Completed cleanup must not execute again');}}),[]);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('offline evidence rejects recipient allowances, broad DNS, changed identity and failed network proof',()=>{
 for(const corrupt of [
  r=>r.rules.push({...r.rules[0],name:'node-access',program:r.protectedPrograms[0]}),
  r=>r.rules[0].program=r.protectedPrograms[0],
  r=>r.rules[0].remotePort=['Any'],
  r=>r.rules[2].service='Any',
  r=>r.rules[2].remoteAddress=['Any'],
  r=>r.rules[2].remotePort=['443'],
  r=>r.rules[3].protocol='TCP',
  r=>r.runnerPrograms[0].path=r.workspace+'\\bin\\Runner.Listener.exe',
  r=>r.runnerPrograms[0].pids=[],
  r=>r.runnerPrograms[0].sha256='unknown',
  r=>r.protectedPrograms[0]=r.runnerPrograms[0].path,
  r=>r.profiles[0].DefaultOutboundAction='Allow',
  r=>r.profiles[1].Enabled='False',
  r=>r.service='Stopped',
  r=>r.externalProbe.result='reachable',
  r=>r.externalProbe.baseline='unobserved',
  r=>r.externalProbe.probes[0].code=0,
  r=>r.externalProbe.probes[1].killed=true,
  r=>r.externalProbe.probes[1].program=r.runnerPrograms[0].path,
 ]){const record=firewallFixture();corrupt(record);assert.throws(()=>validateWindowsOfflineFirewall(record));}
});
