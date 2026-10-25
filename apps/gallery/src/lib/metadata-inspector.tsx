// SPDX-License-Identifier: Apache-2.0
'use client';
import { type ComponentProps, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@brand/web/react/server';
import type { FieldStep, JsonNode, MediaItem, MetadataDocument, MetadataResult, Snapshot, SummaryField } from './types';
import { fieldLabel, resolveField, sameField, valueText } from './metadata';

const errorText = (error:unknown) => typeof error==='object' && error && 'message' in error ? String(error.message) : String(error);
// Delivered Button supports native toggle semantics; its legacy lint prop list omits aria-pressed.
function ChoiceButton({pressed,...props}:ComponentProps<typeof Button>&{pressed:boolean}) {
  const semantics:Pick<ComponentProps<typeof Button>,'aria-pressed'>={'aria-pressed':pressed};
  return <Button {...props} {...semantics} />;
}
type Choices = { fields:SummaryField[]; change:(fields:SummaryField[])=>void; ready:boolean };
function Selection({source,path,fields,change,ready}:Choices & {source:string;path:FieldStep[]}) {
  const field={source,path}; const selected=fields.some(value=>sameField(value,field));
  const supported=new TextEncoder().encode(source).length<=1024 && path.length<=64 && path.every(step=>step.kind!=='key' || new TextEncoder().encode(step.key).length<=1024);
  return <ChoiceButton variant={selected ? 'secondary' : 'ghost'} pressed={selected} disabled={!ready || !supported || !selected && fields.length>=32}
    onClick={()=>change(selected ? fields.filter(value=>!sameField(value,field)) : [...fields,field])}
    aria-label={(selected ? 'Remove summary field ' : 'Include summary field ')+source+' '+fieldLabel(path)}>
    {selected ? 'Remove from summary' : 'Include in summary'}
  </ChoiceButton>;
}
function Value({node}:{node:JsonNode|undefined}) {
  const [full,setFull]=useState(false);
  const text=valueText(node); const long=text.length>256;
  return <span className="metadata-value"><code>{long && !full ? text.slice(0,256)+'…' : text}</code>{long ? <Button variant="ghost" onClick={()=>setFull(value=>!value)}>{full ? 'Show preview' : 'Show full value'}</Button> : null}</span>;
}
function Tree({node,label,source,path,fields,change,ready}:{node:JsonNode;label:string;source:string;path:FieldStep[]} & Choices) {
  const [open,setOpen]=useState(false); const [visible,setVisible]=useState(50);
  const structured=node.type==='array' || node.type==='object';
  const length=node.type==='array' ? node.items.length : node.type==='object' ? node.members.length : 0;
  const children: {label:string;step:FieldStep;node:JsonNode}[]=[];
  if(open && node.type==='array') node.items.slice(0,visible).forEach((value,index)=>children.push({label:'['+index+']',step:{kind:'index',index},node:value}));
  if(open && node.type==='object') {
    const occurrences=new Map<string,number>();
    node.members.slice(0,visible).forEach(member=>{
      const occurrence=occurrences.get(member.key)??0; occurrences.set(member.key,occurrence+1);
      children.push({label:JSON.stringify(member.key)+(occurrence ? ' (occurrence '+(occurrence+1)+')' : ''),step:{kind:'key',key:member.key,occurrence},node:member.value});
    });
  }
  return <div className="metadata-node">
    {structured ? <details onToggle={event=>setOpen(event.currentTarget.open)}>
      <summary><span>{label}</span> <span className="muted">{valueText(node)}</span></summary>
      {open ? <div className="metadata-children">
        <Selection source={source} path={path} fields={fields} change={change} ready={ready} />
        {children.map((child,index)=><Tree key={index} node={child.node} label={child.label} source={source} path={[...path,child.step]} fields={fields} change={change} ready={ready} />)}
        {length>visible ? <Button variant="ghost" onClick={()=>setVisible(value=>value+50)}>Show next 50 fields ({length-visible} remaining)</Button> : null}
      </div> : null}
    </details> : <div className="metadata-leaf"><span>{label} <span className="muted">({node.type})</span></span><Value node={node} /><Selection source={source} path={path} fields={fields} change={change} ready={ready} /></div>}
  </div>;
}
function RawSource({source}:{source:string}) {
  const [open,setOpen]=useState(false);
  return <details onToggle={event=>setOpen(event.currentTarget.open)}><summary>Original UTF-8 source</summary>{open ? <pre className="metadata-raw">{source}</pre> : null}</details>;
}
function Document({document,fields,change,ready}:{document:MetadataDocument}&Choices) {
  return <article className="metadata-document" data-metadata-source={document.source} data-metadata-status={document.status}>
    <h4>{document.label}{document.recordPath ? ' '+document.recordPath : ''}</h4>
    <p className="muted">{document.basis}{document.ambiguous ? ' · Ambiguous association' : ''}{document.stale ? ' · Not rechecked' : ''}</p>
    {document.message ? <p role="status">{document.message}</p> : null}
    {document.status!=='ready' ? <p>Metadata {document.status}. The media remains available.</p> : null}
    {document.node ? <Tree node={document.node} label="$" source={document.source} path={[]} fields={fields} change={change} ready={ready} /> : null}
    {document.sourceText!==null ? <RawSource source={document.sourceText} /> : null}
  </article>;
}
function Summary({result,fields,change,ready}:{result:MetadataResult}&Choices) {
  return <section className="metadata-summary" aria-label="Selected metadata summary"><h4>Selected fields</h4>
    {fields.length ? fields.map((field,index)=>{
      const sources=result.documents.filter(document=>document.source===field.source);
      return <div key={index} className="metadata-summary-field" data-summary-source={field.source}>
        <p>{field.source} <code>{fieldLabel(field.path)}</code></p>
        {sources.length ? sources.map((document,n)=><div key={n}><p className="muted">{document.label}{document.recordPath ? ' '+document.recordPath : ''}{document.ambiguous ? ' · Ambiguous association' : ''}{document.stale ? ' · Not rechecked' : ''}</p>{document.node ? <Value node={resolveField(document.node,field.path)} /> : <p>Unavailable: metadata {document.status}.</p>}</div>) : <p>Missing source or outside the reported inspection limits.</p>}
        <Selection source={field.source} path={field.path} fields={fields} change={change} ready={ready} />
      </div>;
    }) : <p>No selected fields. Expand a document to choose fields for this summary.</p>}
  </section>;
}
export function MetadataInspector({snapshot,item,fields,change,ready}:{snapshot:Snapshot;item:MediaItem}&Choices) {
  const [attempt,setAttempt]=useState(0);
  const key=[snapshot.sessionId,item.id,item.revision,snapshot.metadataRevision].join('/');
  const [response,setResponse]=useState<{key:string;value?:MetadataResult;error?:string}|null>(null);
  const scanning=snapshot.discovery?.phase==='opening' || snapshot.discovery?.phase==='scanning';
  useEffect(()=>{
    let active=true;
    if(scanning || !snapshot.sessionId) return;
    const request={sessionId:snapshot.sessionId,itemId:item.id,itemRevision:item.revision,metadataRevision:snapshot.metadataRevision};
    void invoke<MetadataResult>('inspect_metadata',{request}).then(value=>{
      if(active && value.sessionId===request.sessionId && value.itemId===request.itemId && value.itemRevision===request.itemRevision && value.metadataRevision===request.metadataRevision) setResponse({key,value});
    }).catch(error=>{if(active) setResponse({key,error:errorText(error)});});
    return ()=>{active=false;};
  },[key,attempt,scanning,snapshot.sessionId,snapshot.metadataRevision,item.id,item.revision]);
  const current=response?.key===key ? response : null;
  return <section className="metadata-inspector" aria-label="Sidecar metadata" data-metadata-revision={snapshot.metadataRevision}>
    <h3>Sidecar metadata</h3>
    {scanning ? <p role="status">Waiting for requested discovery to finish. Media remains available.</p> : !current ? <p role="status">Inspecting observed metadata…</p> : current.error ? <p role="status">{current.error}</p> : null}
    {!scanning && current ? <Button variant="ghost" onClick={()=>{setResponse(null);setAttempt(value=>value+1);}}>Retry metadata inspection</Button> : null}
    {!scanning && current?.value ? <>
      {current.value.limitations.map((limitation,index)=><p role="status" key={index}>{limitation}</p>)}
      <Summary result={current.value} fields={fields} change={change} ready={ready} />
      {current.value.documents.length ? current.value.documents.map((document,index)=><Document key={key+'/'+attempt+'/'+index} document={document} fields={fields} change={change} ready={ready} />) : <p>No associated sidecar metadata was found within the reported observations and limits.</p>}
    </> : null}
  </section>;
}
