// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import path from 'node:path';import {root,python,environment} from '../scripts/run.mjs';
test('Real ZIP extraction rejects traversal, aliases, links and excessive expansion',async()=>{const child=promisify(execFile)(python,[path.join(root,'scripts/test-archive-input.py')],{cwd:root,env:environment,windowsHide:true,shell:false,timeout:15000,maxBuffer:1024*1024});child.child.stdin.end();await child;});
