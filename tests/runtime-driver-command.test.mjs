// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {hidden,subprocessFailure} from '../scripts/runtime-driver.mjs';
test('native subprocess receipts retain terminal failure output and capture allowance',async()=>{
 await assert.rejects(hidden(process.execPath,['-e',"process.stdout.write('before failure');process.stderr.write('native reason');process.exit(7)"],{timeout:5000}),error=>{const receipt=JSON.parse(JSON.stringify(subprocessFailure(error)));assert.equal(receipt.code,7);assert.equal(receipt.killed,false);assert.equal(receipt.signal,null);assert.equal(receipt.stdout,'before failure');assert.equal(receipt.stderr,'native reason');assert.equal(receipt.timeoutMs,5000);return true;});
});
test('native subprocess receipts distinguish killed timeout from normal command refusal',async()=>{
 await assert.rejects(hidden(process.execPath,['-e','setTimeout(()=>{},60000)'],{timeout:100}),error=>{const receipt=JSON.parse(JSON.stringify(subprocessFailure(error)));assert.equal(receipt.code,null);assert.equal(receipt.killed,true);assert.equal(receipt.signal,'SIGTERM');assert.equal(typeof receipt.stdout,'string');assert.equal(typeof receipt.stderr,'string');assert.equal(receipt.timeoutMs,100);return true;});
});
