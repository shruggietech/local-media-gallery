// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,copyFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root,exportInterface,cargo} from './run.mjs';
import {sourceIdentity} from './provenance.mjs';
import {digest} from './runtime-evidence.mjs';
assert.ok(!process.env.GALLERY_DIAGNOSTIC_NATIVE_RUN,'Choose a native rebuild or an identified prior native binary, never both');
const source=await sourceIdentity();const started=new Date().toISOString();
await exportInterface();await cargo(['build','--locked','-p','local-media-gallery','--features','native-tests']);
const name='local-media-gallery-native-tests'+(process.platform==='win32'?'.exe':'');
const directory=path.join(root,'.local/diagnostic-input/bin');await mkdir(directory,{recursive:true});
const binary=path.join(directory,name);await copyFile(path.join(root,'target/debug/local-media-gallery'+(process.platform==='win32'?'.exe':'')),binary);
assert.deepEqual(await sourceIdentity(),source);const bytes=await readFile(binary);
await writeFile(path.join(root,'.local/diagnostic-rebuilt.json'),JSON.stringify({acceptance:false,source,started,terminalFinished:new Date().toISOString(),binary:{sha256:digest(bytes),bytes:String(bytes.length)}},null,2)+'\n');
