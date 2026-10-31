// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {assertDependencyDeclarations} from '../scripts/package-lock-consistency.mjs';
test('exact workspace declarations cannot drift to a range or omit/add declared inputs',()=>{const manifest={dependencies:{icons:'1.62.0'},devDependencies:{parser:'8.72.1'}};assertDependencyDeclarations(manifest,structuredClone(manifest),'workspace');for(const change of [q=>q.dependencies.icons='^1.62.0',q=>delete q.devDependencies.parser,q=>q.dependencies.extra='1']){const entry=structuredClone(manifest);change(entry);assert.throws(()=>assertDependencyDeclarations(manifest,entry,'workspace'),/dependency declarations.*workspace/i);}});
