// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import Ajv from 'ajv/dist/2020.js';
import {productVersion,readProductSchema} from './product-version.mjs';
export async function proofResultValidator({base,version=productVersion}={}){
 const schema=await readProductSchema({base,version});
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
