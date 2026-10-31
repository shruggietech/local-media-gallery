// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export function assertDependencyDeclarations(manifest,entry,label){assert.ok(entry,'Missing lockfile package '+label);for(const key of ['dependencies','devDependencies','optionalDependencies','peerDependencies'])assert.deepEqual(entry[key]??{},manifest[key]??{},'Dependency declarations disagree for '+label+' ('+key+')');}
export async function checkDependencyDeclarations(root){const lock=JSON.parse(await readFile(path.join(root,'package-lock.json'),'utf8'));const manifest=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));assertDependencyDeclarations(manifest,lock.packages[''],'root');for(const workspace of manifest.workspaces){assert.ok(!workspace.includes('*'),'Expand workspace patterns before declaration checking');const pkg=JSON.parse(await readFile(path.join(root,workspace,'package.json'),'utf8'));assertDependencyDeclarations(pkg,lock.packages[workspace],workspace);}}
