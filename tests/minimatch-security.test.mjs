// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
import path from 'node:path';
const parents=['eslint','@eslint/config-array','@typescript-eslint/typescript-estree'];
const require=createRequire(import.meta.url);

test('Installed pattern callers bound the recognized upstream amplification branch',{timeout:10000},async()=>{
 const script=String.raw`const assert=require('node:assert/strict'),{createRequire}=require('node:module');
 for(const parent of ${JSON.stringify(parents)}){
  const {Minimatch}=createRequire(require.resolve(parent))('minimatch');
  const limited=new Minimatch(Array(30).fill('**/../a/b').join('/'),{optimizationLevel:2,braceExpandMax:64});
  assert.equal(limited.set.length,64,'Generated split patterns remain capped');
  const ordinary=new Minimatch('{x,*}/{0..999}',{optimizationLevel:2});
  assert.equal(ordinary.set.length,2000);assert.equal(ordinary.match('x/5'),true);assert.equal(ordinary.match('y/999'),true);assert.equal(ordinary.match('.y/5'),false);
 }
 console.log('three installed callers completed bounded preprocessing');`;
 const result=await promisify(execFile)(process.execPath,['--max-old-space-size=128','-e',script],{cwd:path.resolve(import.meta.dirname,'..'),windowsHide:true,shell:false,timeout:6000,killSignal:'SIGKILL',maxBuffer:65536});
 assert.match(result.stdout,/three installed callers completed bounded preprocessing/);
});

test('Installed ESLint and TypeScript pattern callers preserve file and partial-directory selection',()=>{
 for(const parent of parents){
  const {Minimatch,minimatch}=createRequire(require.resolve(parent))('minimatch');
  const files=new Minimatch('apps/{gallery,site}/**/*.{ts,tsx}',{dot:true});
  assert.equal(files.match('apps/gallery/src/app/gallery.tsx'),true);assert.equal(files.match('apps/site/src/app/page.tsx'),true);assert.equal(files.match('docs/overview.md'),false);
  assert.equal(new Minimatch('apps/gallery/**').match('apps',true),true);
  assert.equal(minimatch('apps/site/.cache/tsconfig.build.json','**/tsconfig{,.build}.json',{dot:true}),true);
  assert.equal(minimatch('apps/gallery/notes.md','**/tsconfig{,.build}.json',{dot:true}),false);
 }
});
