// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveField, valueText, fieldLabel, sameField } from '../apps/gallery/src/lib/metadata.ts';
const tree={type:'object',members:[{key:'a/b~',value:{type:'number',value:'9007199254740993'}},{key:'a/b~',value:{type:'array',items:[{type:'null'},{type:'boolean',value:false},{type:'number',value:'-0'},{type:'string',value:''},{type:'array',items:[]},{type:'object',members:[]}]}}]};
test('typed field addresses preserve repeated keys and all missing/empty distinctions',()=>{
  assert.equal(valueText(resolveField(tree,[{kind:'key',key:'a/b~',occurrence:0}])),'9007199254740993');
  const path=[{kind:'key',key:'a/b~',occurrence:1}];
  assert.deepEqual([0,1,2,3,4,5].map(index=>valueText(resolveField(tree,[...path,{kind:'index',index}]))),['null','false','-0','""','[]','{}']);
  assert.equal(resolveField(tree,[{kind:'key',key:'missing',occurrence:0}]),undefined);
  assert.equal(valueText(undefined),'Missing');
  assert.notEqual(fieldLabel([{kind:'key',key:'',occurrence:0}]),fieldLabel([]));
  assert.equal(sameField({source:'stem-json',path},{source:'stem-json',path:structuredClone(path)}),true);
  assert.equal(sameField({source:'full-name-json',path},{source:'stem-json',path}),false);
});
test('object field addresses survive unrelated property reorder and never coerce active-looking text',()=>{
  const node={type:'object',members:[{key:'z',value:{type:'string',value:'<script>alert(1)</script>'}},{key:'__proto__',value:{type:'number',value:'1.000e+999'}}]};
  const path=[{kind:'key',key:'__proto__',occurrence:0}];
  assert.equal(valueText(resolveField(node,path)),'1.000e+999');
  node.members.reverse();assert.equal(valueText(resolveField(node,path)),'1.000e+999');
  assert.equal(valueText(resolveField(node,[{kind:'key',key:'z',occurrence:0}])),'"<script>alert(1)</script>"');
});
