// SPDX-License-Identifier: Apache-2.0
'use client';
import {type ReactNode, useEffect, useState} from 'react';
import {Button, Field, FormControls} from '@brand/web/react/server';
import type {Direction, Filter, Sort, ViewSettings, SettingsPatch, Snapshot} from './types';

export function SortFilter({settings,change,prefix=''}:{settings:ViewSettings;change:(patch:SettingsPatch)=>void;prefix?:string}) {
  return <div className="collection-controls">
    <Field id={prefix+'media-filter'} label="Media type" control={<FormControls.Select value={settings.filter} onChange={e=>change({filter:e.target.value as Filter})}><option value="all">All media</option><option value="image">Images</option><option value="video">Videos</option></FormControls.Select>}/>
    <Field id={prefix+'media-sort'} label="Sort by" control={<FormControls.Select value={settings.sort} onChange={e=>change({sort:e.target.value as Sort})}><option value="name">Filename</option><option value="modified">Modified time</option><option value="size">File size</option></FormControls.Select>}/>
    <Field id={prefix+'media-direction'} label="Direction" control={<FormControls.Select value={settings.direction} onChange={e=>change({direction:e.target.value as Direction})}><option value="asc">Ascending</option><option value="desc">Descending</option></FormControls.Select>}/>
  </div>;
}
export function SettingsPanel({kind,settings,ready,change,changeView,scope,testPageSize}:{
  kind:'appearance'|'layout'|'loading'|'information-display';settings:ViewSettings;ready:boolean;
  change:(patch:SettingsPatch)=>void;changeView:(patch:SettingsPatch)=>void;scope:ReactNode;testPageSize?:number;
}){
  return <section className="settings-panel" aria-label={kind+' settings'}>
    {scope}
    <fieldset disabled={!ready}>
      <legend className="muted">Changes save to the destination above.</legend>
      {kind==='appearance'?<Field id="font-scale" label="Global font size" control={<FormControls.Select value={settings.fontScale} onChange={e=>change({fontScale:Number(e.target.value) as ViewSettings['fontScale']})}><option value="100">Default (100%)</option><option value="90">Small (90%)</option><option value="80">Smaller (80%)</option></FormControls.Select>}/>:null}
      {kind==='layout'?<>
        <Field id="page-size" label="Items per page" control={<FormControls.Select value={settings.pageSize} onChange={e=>changeView({pageSize:Number(e.target.value)})}>{testPageSize===4?<option value="4">4 (native test)</option>:null}<option value="24">24</option><option value="48">48</option><option value="96">96</option></FormControls.Select>}/>
        <Field id="card-size" label="Card size" control={<FormControls.Select value={settings.cardSize} onChange={e=>change({cardSize:e.target.value as ViewSettings['cardSize']})}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></FormControls.Select>}/>
        <Field id="scroll-indicator" label="Scroll indicator" control={<FormControls.Select value={settings.scrollIndicator} onChange={e=>change({scrollIndicator:e.target.value as ViewSettings['scrollIndicator']})}><option value="auto">While scrolling</option><option value="always">Always visible</option></FormControls.Select>}/>
        <p>Keep optional sort and filter controls beside the collection. The drawer shortcut remains available.</p>
        <Button variant="secondary" onClick={()=>change({controlsExpanded:!settings.controlsExpanded})}>{settings.controlsExpanded?'Hide controls':'Show controls'}</Button>
      </>:null}
      {kind==='loading'?<><Field id="loading-mode" label="Loading strategy" control={<FormControls.Select value={settings.loadingMode} onChange={e=>change({loadingMode:e.target.value as ViewSettings['loadingMode']})}><option value="automatic">Automatic</option><option value="conservative">Conservative</option><option value="standard">Standard</option></FormControls.Select>}/><p>Automatic adapts work during this folder session. Conservative and Standard keep fixed limits without changing items per page.</p></>:null}
      {kind==='information-display'?<><Field id="information-default" label="Show item information" control={<FormControls.Checkbox checked={settings.metadataExpanded} onChange={e=>change({metadataExpanded:e.target.checked})}/>}/><p>The viewer retains this choice. Choose summary fields beside the metadata of an open item; its save destination is shown before editing.</p></>:null}
    </fieldset>
  </section>;
}
export function FolderDetails({snapshot,status}:{snapshot:Snapshot;status:string}){
  const [copy,setCopy]=useState('');
  useEffect(()=>setCopy(''),[snapshot.root]);
  const copyPath=async()=>{
    if(!snapshot.root)return;
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(snapshot.root);setCopy('Folder path copied.');
    }catch{setCopy('The path could not be copied. Select the full path below and copy it manually.');}
  };
  return <section aria-label="Current folder details">
    {snapshot.root?<><p className="folder-path" aria-label="Full folder path" tabIndex={0}>{snapshot.root}</p><Button onClick={()=>void copyPath()}>Copy path</Button></>:<p>No gallery is open.</p>}
    <p role="status" aria-live="polite">{copy}</p>
    <p>{status}</p><p>Direct files only. Refresh checks the folder again.</p>
    {snapshot.discovery?<dl className="item-facts"><dt>Entries checked</dt><dd>{snapshot.discovery.entriesSeen}</dd><dt>Media observed</dt><dd>{snapshot.discovery.mediaSeen}</dd><dt>Previous items not yet rechecked</dt><dd>{snapshot.items.filter(item=>item.stale).length}</dd></dl>:null}
  </section>;
}
