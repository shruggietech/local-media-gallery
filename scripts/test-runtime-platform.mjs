// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {root,node,environment} from './run.mjs';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
import {hidden} from './runtime-driver.mjs';
import {validateRuntimeReceipt} from './runtime-evidence.mjs';
import {sourceIdentity} from './provenance.mjs';
requireIsolatedDesktop();
const source=await sourceIdentity();const suffix=process.platform==='win32'?'.exe':'';
let priorMotion;
try{
 if(process.platform==='linux'){
  assert.ok(process.env.XDG_CONFIG_HOME,'Isolated GTK configuration is required');
  await mkdir(path.join(process.env.XDG_CONFIG_HOME,'gtk-3.0'),{recursive:true});await writeFile(path.join(process.env.XDG_CONFIG_HOME,'gtk-3.0/settings.ini'),'[Settings]\ngtk-enable-animations=false\n');
  await hidden('gsettings',['set','org.gnome.desktop.interface','enable-animations','false']);
  for(const property of ['IsEnabled','ScreenReaderEnabled'])await hidden('gdbus',['call','--session','--dest','org.a11y.Bus','--object-path','/org/a11y/status','--method','org.freedesktop.DBus.Properties.Set','org.a11y.Status',property,'<true>']);
  await hidden('pulseaudio',['--start','--exit-idle-time=-1']);await hidden('pactl',['load-module','module-null-sink','sink_name=lmg_qualification']);
 }
 if(process.platform==='darwin'){
  priorMotion=await hidden('defaults',['read','com.apple.universalaccess','reduceMotion']).then(r=>r.stdout.trim(),()=>null);
  await hidden('defaults',['write','com.apple.universalaccess','reduceMotion','-bool','true']);
 }
 const records=[];const fixture=JSON.parse(await readFile(path.join(root,'.local/runtime-fixture.json')));
 for(const edition of ['full','lite']){
  const binary=path.join(root,'.local/bin/local-media-gallery'+(edition==='lite'?'-lite':'')+'-native-tests'+suffix);
  await node(path.join(root,'scripts/test-runtime.mjs'),[],{env:{...environment,GALLERY_TEST_BINARY:binary,GALLERY_TEST_EDITION:edition}});
  const r=JSON.parse(await readFile(path.join(root,'.local/runtime-results-'+edition+'.json')));validateRuntimeReceipt(r,{source,binarySha256:r.binary.sha256,fixtureSha256:fixture.sha256,edition,platform:process.platform});records.push(r);
 }
 assert.deepEqual(await sourceIdentity(),source);
 await writeFile(path.join(root,'.local/runtime-results.json'),JSON.stringify({formatVersion:1,result:'pass',source,records,terminalFinished:new Date().toISOString()},null,2)+'\n');
}finally{
 if(process.platform==='darwin'){
  if(priorMotion===null)await hidden('defaults',['delete','com.apple.universalaccess','reduceMotion']);
  else if(priorMotion!==undefined)await hidden('defaults',['write','com.apple.universalaccess','reduceMotion','-bool',priorMotion==='1'?'true':'false']);
 }
}
