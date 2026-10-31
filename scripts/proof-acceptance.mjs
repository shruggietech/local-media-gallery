// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import {root} from './run.mjs';
import {productVersion,validateProductVersion} from './product-version.mjs';
export async function proofResultValidator({base=root,version=productVersion}={}){
 validateProductVersion(version);
 const schema=JSON.parse(await readFile(path.join(base,'schemas','v'+version,'local-media-gallery.schema.json'),'utf8'));
 assert.equal(schema['x-release-version'],version,'Proof schema release version differs from elected version');
 assert.equal(schema.$id,'urn:local-media-gallery:'+version,'Proof schema identity differs from elected version');
 assert.equal(schema.$defs?.operationResult?.properties?.version?.const,version,'Proof operation schema version differs from elected version');
 const ajv=new Ajv({strict:true}).addKeyword('x-release-version').addSchema(schema);
 const valid=ajv.compile({$ref:schema.$id+'#/$defs/operationResult'});
 return (value,record)=>{
  assert.equal(record.version,version,'Proof record version differs from elected version');
  assert.ok(valid(value),JSON.stringify(valid.errors));
  assert.equal(value.edition,record.edition,'Machine result edition differs from proof');
  assert.equal(value.version,record.version,'Machine result version differs from proof');
  return value;
 };
}
