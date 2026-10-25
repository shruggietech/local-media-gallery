// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';

const schema = JSON.parse(await readFile(new URL('../schemas/v0.0.0/local-media-gallery.schema.json', import.meta.url)));
const validate = new Ajv2020({ strict: true }).addKeyword('x-release-version').compile(schema);
const snapshot = {
  version: '0.0.0', metadataRevision:'d'.repeat(32), sequence: '1', discovery: null, sessionId: 'a'.repeat(32), root: 'A gallery', status: 'complete', revision: '1', mediaOrigin: 'http://127.0.0.1:1234', issues: [],
  items: [{ id: 'b'.repeat(32), revision: 'c'.repeat(32), name: 'photo.jpg', relativePath: 'photo.jpg', kind: 'image', mime: 'image/jpeg', size: '18446744073709551615', modifiedMs: '-1', issue: null, stale: false }],
};
test('master snapshot contract preserves exact native integer facts and version identity', () => {
  assert.ok(validate(snapshot), JSON.stringify(validate.errors));
  assert.equal(schema['x-release-version'], '0.0.0');
  for (const changed of [
    { ...snapshot, version: '0.0.1' },
    { ...snapshot, mediaOrigin: 'http://0.0.0.0:1234' },
    { ...snapshot, items: [{ ...snapshot.items[0], size: 9007199254740992 }] },
  ]) assert.equal(validate(changed), false);
});

const settings = {version:'0.0.0',formatVersion:1,pageSize:48,cardSize:'medium',controlsExpanded:false,scrollIndicator:'auto',metadataExpanded:false,filter:'all',sort:'name',direction:'asc'};
test('loading mode is a validated compatible preference in complete and sparse contracts', () => {
  const ajv = new Ajv2020({strict:true}).addKeyword('x-release-version').addSchema(schema);
  for (const name of ['settings','settingsChoices','settingsPatch']) {
    const valid = ajv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/'+name});
    const base = name === 'settings' ? settings : {};
    for (const loadingMode of ['automatic','conservative','standard']) assert.ok(valid({...base,loadingMode}),JSON.stringify(valid.errors));
    for (const loadingMode of ['fast',null,true,4,{}]) assert.equal(valid({...base,loadingMode}),false,name+' '+JSON.stringify(loadingMode));
    if (name !== 'settingsPatch') assert.ok(valid(base),'Legacy omission remains compatible');
  }
});
test('master settings contract validates preferences and preserves compatible unknown fields', () => {
  const ajv = new Ajv2020({strict:true}).addKeyword('x-release-version').addSchema(schema);
  const valid = ajv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/settings'});
  assert.ok(valid(settings), JSON.stringify(valid.errors));
  assert.ok(valid({...settings,futurePreference:{enabled:true}}));
  for(const changed of [{...settings,pageSize:4},{...settings,pageSize:1000},{...settings,metadataExpanded:'yes'},{...settings,formatVersion:2},{...settings,version:'0.0.1'},{...settings,sort:'random'}]) assert.equal(valid(changed),false);
});

test('font scale contract accepts legacy settings and exactly three supported presets', () => {
  const ajv = new Ajv2020({strict:true}).addKeyword('x-release-version').addSchema(schema);
  const valid = ajv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/settings'});
  assert.ok(valid(settings), 'Existing settings without fontScale remain compatible');
  assert.equal(schema.$defs.settings.properties.fontScale?.default,100);
  for(const fontScale of [80,90,100]) assert.ok(valid({...settings,fontScale}), JSON.stringify(valid.errors));
  for(const fontScale of [0,79,95,101,80.5,-1,'90',null,true]) assert.equal(valid({...settings,fontScale}),false, 'Invalid fontScale '+JSON.stringify(fontScale));
});

test('portable settings contract distinguishes sparse intent and compatible unknown data', () => {
  const ajv = new Ajv2020({strict:true}).addKeyword('x-release-version').addSchema(schema);
  const valid = ajv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/portableSettings'});
  const portable = {product:'local-media-gallery',kind:'gallery-settings',version:'0.0.0',formatVersion:1,choices:{fontScale:90,metadataExpanded:false},futureEnvelope:{enabled:true}};
  assert.ok(valid(portable), JSON.stringify(valid.errors));
  assert.ok(valid({...portable,choices:{}}));
  assert.ok(valid({...portable,choices:{fontScale:100,futureField:{nested:[false,0,null,'']}}}));
  for(const changed of [{...portable,product:'other'},{...portable,kind:'settings'},{...portable,formatVersion:2},{...portable,version:'0.0.1'},{...portable,choices:{fontScale:95}},{...portable,choices:{metadataExpanded:null}},{...portable,choices:{pageSize:4}}])assert.equal(valid(changed),false,JSON.stringify(changed));
});

test('sparse patch and recent contracts reject ambiguous or lossy values',()=>{
  const ajv=new Ajv2020({strict:true}).addKeyword('x-release-version').addSchema(schema);
  const patch=ajv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/settingsPatch'});
  assert.equal(patch({metadataExpanded:false,fontScale:100}),true);
  for(const value of [{},{unknown:true},{version:'0.0.0'},{fontScale:95},{metadataExpanded:null}])assert.equal(patch(value),false);
  const recent=ajv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/recentDirectory'});
  assert.equal(recent({id:'opaque',displayPath:'Gallery',lastActivityMs:'9223372036854775807'}),true);
  for(const value of [-1,123,'-1','01','1.5'])assert.equal(recent({id:'opaque',displayPath:'Gallery',lastActivityMs:value}),false);
});

test('discovery outcomes and observed counters are exact and closed', () => {
  const discovery = {id:'d'.repeat(32),generation:'9007199254740993',kind:'refresh',phase:'scanning',entriesSeen:'9007199254740993',mediaSeen:'2',requestedRoot:null,message:null};
  for (const phase of ['opening','scanning','complete','partial','cancelled','failed','unavailable']) assert.equal(validate({...snapshot,status:phase,discovery:{...discovery,phase}}),true,JSON.stringify(validate.errors));
  for (const changed of [{...discovery,entriesSeen:2},{...discovery,phase:'empty'},{...discovery,total:100}]) assert.equal(validate({...snapshot,discovery:changed}),false);
  assert.equal(validate({...snapshot,sequence:9007199254740992}),false);
});

test('summary choices and exact metadata transport have closed owned contracts',()=>{
  const ajv=new Ajv2020({strict:true}).addKeyword('x-release-version').addSchema(schema);
  const choice={source:'full-name-json',path:[{kind:'key',key:'a/b~',occurrence:1},{kind:'index',index:0}]};
  const choices=ajv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/settingsChoices'});
  assert.equal(choices({summaryFields:[choice]}),true,JSON.stringify(choices.errors));
  for(const source of ['index-native:windows:d800002e006a0073006f006e','index-native:unix:ff2e6a736f6e'])assert.equal(choices({summaryFields:[{source,path:[]}]}),true);
  for(const summaryFields of ['bad',[{source:'../outside',path:[]}],[choice,choice],Array.from({length:33},()=>choice)])assert.equal(choices({summaryFields}),false);
  const metadata=ajv.compile({$ref:'urn:local-media-gallery:0.0.0#/$defs/metadataResult'});
  const result={sessionId:'a'.repeat(32),itemId:'b'.repeat(32),itemRevision:'c'.repeat(32),metadataRevision:'d'.repeat(32),documents:[{source:'full-name-json',label:'a.jpg.json',basis:'Full filename + .json',rank:1,ambiguous:false,stale:false,status:'ready',message:null,node:{type:'object',members:[{key:'n',value:{type:'number',value:'9007199254740993'}},{key:'n',value:{type:'null'}}]},sourceText:'{"n":9007199254740993,"n":null}',recordPath:null}],limitations:[]};
  assert.equal(metadata(result),true,JSON.stringify(metadata.errors));
  const lossy=structuredClone(result);lossy.documents[0].node.members[0].value.value=9007199254740992;assert.equal(metadata(lossy),false);
  assert.equal(metadata({...result,unowned:true}),false);
});
