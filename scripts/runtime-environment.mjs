// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
import {hidden} from './runtime-driver.mjs';

export async function prepareRuntimeDesktop(){
 requireIsolatedDesktop();
 let priorMotion;
 const restore=async()=>{
  if(process.platform==='darwin'){
   if(priorMotion===null)await hidden('defaults',['delete','com.apple.universalaccess','reduceMotion']);
   else if(priorMotion!==undefined)await hidden('defaults',['write','com.apple.universalaccess','reduceMotion','-bool',priorMotion==='1'?'true':'false']);
  }
 };
 try{
  if(process.platform==='linux'){
   assert.ok(process.env.XDG_CONFIG_HOME,'Isolated GTK configuration is required');
   await mkdir(path.join(process.env.XDG_CONFIG_HOME,'gtk-3.0'),{recursive:true});
   await writeFile(path.join(process.env.XDG_CONFIG_HOME,'gtk-3.0/settings.ini'),'[Settings]\ngtk-enable-animations=false\n');
   await hidden('gsettings',['set','org.gnome.desktop.interface','enable-animations','false']);
   for(const property of ['IsEnabled','ScreenReaderEnabled'])await hidden('gdbus',['call','--session','--dest','org.a11y.Bus','--object-path','/org/a11y/bus','--method','org.freedesktop.DBus.Properties.Set','org.a11y.Status',property,'<true>']);
   await hidden('pulseaudio',['--start','--exit-idle-time=-1']);
   await hidden('pactl',['load-module','module-null-sink','sink_name=lmg_qualification']);
  }
  if(process.platform==='darwin'){
   priorMotion=await hidden('defaults',['read','com.apple.universalaccess','reduceMotion']).then(r=>r.stdout.trim(),()=>null);
   await hidden('defaults',['write','com.apple.universalaccess','reduceMotion','-bool','true']);
  }
  return restore;
 }catch(e){await restore();throw e;}
}
