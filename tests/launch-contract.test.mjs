// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import Ajv from 'ajv/dist/2020.js';
const schema=JSON.parse(await readFile(new URL('../schemas/v0.0.0/local-media-gallery.schema.json',import.meta.url)));
const ajv=new Ajv({strict:true}).addKeyword('x-release-version').addSchema(schema);
const compile=name=>ajv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/'+name});
const result={product:'local-media-gallery',formatVersion:1,version:'0.0.0',edition:'full',os:'windows',arch:'x86_64',operationId:'a'.repeat(32),operation:'open',boundary:'ui-startup',status:'accepted',error:null,processId:'18446744073709551615',sessionId:null,discoveryOperationId:null,root:{encoding:'windows-utf16le',bytes:[65,0,0,216,66,0]},progress:null,data:null};
test('owned operation results preserve native bytes, exact counts, nullable identity and closed vocabulary',()=>{
 const valid=compile('operationResult');assert.ok(valid(result),JSON.stringify(valid.errors));
 for(const status of ['accepted','success','running','partial','cancelled','unavailable','failed'])assert.ok(valid({...result,status}),JSON.stringify(valid.errors));
 assert.ok(valid({...result,progress:{entriesSeen:'18446744073709551615',mediaSeen:'9007199254740993'}}));
 for(const change of [{status:'finished'},{edition:'trial'},{processId:9007199254740992},{formatVersion:2},{root:{encoding:'display',bytes:[]}},{root:{encoding:'unix-bytes',bytes:[256]}},{progress:{entriesSeen:1,mediaSeen:'2'}},{extra:true}])assert.equal(valid({...result,...change}),false,JSON.stringify(change));
});
test('platform policy retains every OS/edition capability and truthful proof boundaries',async()=>{
 const matrix=JSON.parse(await readFile(new URL('../schemas/v0.0.0/platform-matrix.json',import.meta.url)));
 const valid=compile('platformMatrix');assert.ok(valid(matrix),JSON.stringify(valid.errors));
 assert.deepEqual([...new Set(matrix.rows.map(r=>r.os))].sort(),['linux','macos','windows']);assert.equal(matrix.rows.length,6);
 assert.equal(matrix.providers.prepare,true);assert.equal(matrix.providers.install,false);assert.deepEqual(matrix.recipientTools,[]);
 for(const row of matrix.rows)for(const field of ['baseline','runtime','display','proof','full','lite','signing','qualification'])assert.ok(row[field].length>0);
 assert.equal(valid({...matrix,publication:'published'}),false);
});
