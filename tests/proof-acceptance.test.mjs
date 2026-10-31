// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {proofResultValidator} from '../scripts/proof-acceptance.mjs';
const schemaPath=new URL('../schemas/v0.0.0/local-media-gallery.schema.json',import.meta.url);
const result=(version,edition='full')=>({product:'local-media-gallery',version,formatVersion:1,edition,os:'linux',arch:'x86_64',operationId:'version',operation:'version',boundary:'information',status:'success',error:null,processId:'1',sessionId:null,discoveryOperationId:null,root:null,progress:null,data:{}});
test('Native proof accepts the elected future version through its matching schema and preserves the baseline',async t=>{
 const base=await mkdtemp(path.join(os.tmpdir(),'lmg-proof-version-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const retained=await readFile(schemaPath);const schema=JSON.parse(retained);schema.$id='urn:local-media-gallery:1.2.3';schema['x-release-version']='1.2.3';schema.properties.version.const='1.2.3';schema.$defs.operationResult.properties.version.const='1.2.3';
 const directory=path.join(base,'schemas/v1.2.3');await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'local-media-gallery.schema.json'),JSON.stringify(schema));
 const validate=await proofResultValidator({base,version:'1.2.3'});for(const edition of ['full','lite'])assert.deepEqual(validate(result('1.2.3',edition),{version:'1.2.3',edition}),result('1.2.3',edition));
 assert.throws(()=>validate(result('0.0.0'),{version:'1.2.3',edition:'full'}));assert.throws(()=>validate(result('1.2.3'),{version:'0.0.0',edition:'full'}));assert.throws(()=>validate(result('1.2.3','lite'),{version:'1.2.3',edition:'full'}));assert.throws(()=>validate({...result('1.2.3'),unexpected:true},{version:'1.2.3',edition:'full'}));
 await assert.rejects(proofResultValidator({base,version:'1.2.4'}),/ENOENT/);
 schema['x-release-version']='0.0.0';await writeFile(path.join(directory,'local-media-gallery.schema.json'),JSON.stringify(schema));await assert.rejects(proofResultValidator({base,version:'1.2.3'}),/schema.*version/i);
 const baseline=await proofResultValidator({version:'0.0.0'});baseline(result('0.0.0'),{version:'0.0.0',edition:'full'});assert.deepEqual(await readFile(schemaPath),retained);
});
