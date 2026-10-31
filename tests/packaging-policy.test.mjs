// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
test('current builders, helpers and CI contain no signing/notarization executable actions',async()=>{const scripts=(await readdir(new URL('../scripts/',import.meta.url))).filter(f=>f.endsWith('.mjs')||f.endsWith('.ps1'));const files=[...scripts.map(f=>'scripts/'+f),'crates/macos-package/src/main.rs','crates/macos-package/src/lib.rs','.github/workflows/ci.yml'];for(const file of files){const text=await readFile(new URL('../'+file,import.meta.url),'utf8');assert.doesNotMatch(text,/(?:['"](?:\/usr\/bin\/)?(?:codesign|signtool|notarytool|altool)['"]|Set-AuthenticodeSignature|--no_adhoc_codesign|--sign\s)/i,file);}});
