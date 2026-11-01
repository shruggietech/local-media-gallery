// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const repository=fileURLToPath(new URL('../',import.meta.url));
export function validateProductVersion(value,{windows=false}={}){
 assert.ok(typeof value==='string'&&value.length<=64&&value===value.trim()&&/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value),'Invalid numeric-triplet product version');
 if(windows){const parts=value.split('.').map(BigInt);assert.ok(parts[0]<=255n&&parts[1]<=255n&&parts[2]<=65535n,'Product version exceeds MSI ProductVersion bounds255.255.65535');}
 return value;
}
export async function readProductVersion(base=repository,options={}){
 const version=validateProductVersion((await readFile(path.join(base,'VERSION'),'utf8')).trim(),options);
 const pkg=JSON.parse(await readFile(path.join(base,'package.json'),'utf8'));assert.equal(pkg.version,version,'Package product version differs from VERSION');
 const cargo=await readFile(path.join(base,'Cargo.toml'),'utf8');const section=cargo.match(/^\[workspace\.package\]\s*\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1];assert.equal(section?.match(/^version\s*=\s*"([^"]+)"/m)?.[1],version,'Workspace product version differs from VERSION');
 const native=JSON.parse(await readFile(path.join(base,'apps/gallery/src-tauri/tauri.conf.json'),'utf8'));assert.equal(native.version,version,'Native product version differs from VERSION');
 return version;
}
export function packageProvenanceText(version){
 validateProductVersion(version);
 return version==='0.0.0'?'This package is an unreleased specification baseline. No product publication is asserted.':'This package retains its original build identity. Confirm actual publication, prerequisites and artifact hashes through the verified release record.';
}
export const productVersion=await readProductVersion();

export async function readProductSchema({base=repository,version=productVersion}={}){
 validateProductVersion(version);
 const schema=JSON.parse(await readFile(path.join(base,'schemas','v'+version,'local-media-gallery.schema.json'),'utf8'));
 assert.equal(schema['x-release-version'],version,'Product schema release version differs from elected version');
 assert.equal(schema.$id,'urn:local-media-gallery:'+version,'Product schema identity differs from elected version');
 assert.equal(schema.properties?.version?.const,version,'Product snapshot schema version differs from elected version');
 return schema;
}
