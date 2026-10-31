// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {joinedChecks} from '../scripts/joined-checks.mjs';
test('Independent qualification branches both start before either is released',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),started=[];
 const run=joinedChecks(['ownership','native campaign'].map(name=>({name,run:async()=>{started.push(name);await gate;}})));
 assert.deepEqual(started,['ownership','native campaign']);release();
 const result=await run;assert.equal(result.result,'pass');assert.equal(result.checks.length,2);
 for(const check of result.checks){assert.equal(check.result,'pass');assert.ok(Date.parse(check.terminalFinished)>=Date.parse(check.started));}
});
test('A failed qualification branch retains its failure and waits for every peer',async()=>{
 let release,finished=false,returned=false;const gate=new Promise(resolve=>release=resolve);
 const run=joinedChecks([
  {name:'ownership',run:async()=>{throw Error('Qualification deadline fixture');}},
  {name:'native campaign',run:async()=>{await gate;finished=true;}}
 ]).then(result=>{returned=true;return result;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(returned,false);assert.equal(finished,false);release();
 const result=await run;assert.equal(finished,true);assert.equal(result.result,'fail');assert.equal(result.checks[0].failure,'Qualification deadline fixture');assert.equal(result.checks[1].result,'pass');
 for(const check of result.checks)assert.ok(Date.parse(check.terminalFinished)>=Date.parse(check.started));
});
