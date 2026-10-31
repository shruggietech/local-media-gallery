// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';import {releaseCli} from '../scripts/release.mjs';
test('Omitted release command and help are nonmutating usage outcomes',async()=>{for(const args of [[],['help'],['--help']]){const result=await releaseCli(args);assert.equal(result.command,'help');assert.match(result.usage,/snapshot.*resolve.*execute/);assert.ok(result.production.includes('manual'));}await assert.rejects(releaseCli(['execute']),/Missing/);});
