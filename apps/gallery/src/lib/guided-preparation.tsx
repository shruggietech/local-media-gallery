// SPDX-License-Identifier: Apache-2.0
'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {Button,Field,FormControls} from '@brand/web/react/server';
import {Dialog} from '@brand/web/react/client';
import type {NativePath,SettingsEnvelope} from './types';
import type {Job} from './preparation';
interface Selection {presentation:boolean;thumbnails:boolean;recipients:string[]}
interface Recipient {platform:string;architecture:string;releaseVersion:string;candidateId:string;artifactName:string;artifactSha256:string;downloadBytes:string;extractedBytes:string;entrypointBytes:string;storageBytes:string;destinations:string[];disposition:string}
interface Action {name:string;phase:string;error:string|null;recipient:Recipient|null}
interface Status {id:string;sessionId:string;sequence:string;phase:string;root:NativePath;selection:Selection;actions:Action[];activeAction:string|null;transferredBytes:string;thumbnail:Job|null;presentationBytes:string|null;presentationSha256:string|null;error:string|null}
const busy=(job:Status|null)=>!!job&&['previewing','running','cancelling'].includes(job.phase);
const message=(e:unknown)=>typeof e==='object'&&e&&'message' in e?String(e.message):String(e);
const pathLabel=(p:NativePath)=>new TextDecoder(p.encoding==='windows-utf16le'?'utf-16le':'utf-8').decode(new Uint8Array(p.bytes));
export function GuidedPreparation({sessionId,envelope,completed}:{sessionId:string|null;envelope:SettingsEnvelope|null;completed:()=>void}) {
 const [selection,setSelection]=useState<Selection>({presentation:false,thumbnails:false,recipients:[]});
 const [job,setJob]=useState<Status|null>(null);const [pending,setPending]=useState(false);const [error,setError]=useState('');
 const current=useRef<Status|null>(null);const session=useRef(sessionId);session.current=sessionId;
 const apply=useCallback((value:Status)=>{if(value.sessionId!==session.current)return;const old=current.current;if(old?.id===value.id&&BigInt(value.sequence)<=BigInt(old.sequence))return;current.current=value;setJob(value);},[]);
 useEffect(()=>{current.current=null;setJob(null);setError('');},[sessionId]);
 const active=busy(job);
 useEffect(()=>{
  if(!active||!job)return;let live=true,inflight=false;const id=job.id,expected=job.sessionId;
  const timer=setInterval(()=>{if(inflight)return;inflight=true;void invoke<Status>('guided_status',{sessionId:expected,jobId:id}).then(value=>{if(live&&current.current?.id===id)apply(value);}).catch(e=>{if(live)setError(message(e));}).finally(()=>{inflight=false;});},300);
  return()=>{live=false;clearInterval(timer);};
 },[active,job?.id,job?.sessionId,apply]);
 const terminal=useRef('');
 useEffect(()=>{if(job&&['success','partial','cancelled','failed'].includes(job.phase)&&terminal.current!==job.id){terminal.current=job.id;completed();}},[job,completed]);
 const action=async(command:string,args:Record<string,unknown>)=>{const expected=session.current;setPending(true);setError('');try{const result=await invoke<Status>(command,args);if(session.current===expected)apply(result);}catch(e){if(session.current===expected)setError(message(e));}finally{setPending(false);}};
 const choose=(patch:Partial<Selection>)=>{setSelection(old=>({...old,...patch}));current.current=null;setJob(null);setError('');};
 const disabled=active||pending;const root=job?pathLabel(job.root):'';
 return <Dialog triggerLabel="Prepare gallery" title="Prepare this gallery" description="Choose optional presentation, thumbnails and recipient launchers. Browsing works without preparation.">
  <Field id="prepare-presentation" label="Save current presentation in this gallery" control={<FormControls.Checkbox checked={selection.presentation} disabled={disabled} onChange={e=>choose({presentation:e.target.checked})}/>}/>
  <Field id="prepare-thumbnails" label="Generate portable thumbnails" control={<FormControls.Checkbox checked={selection.thumbnails} disabled={disabled} onChange={e=>choose({thumbnails:e.target.checked})}/>}/>
  <p>Still-image thumbnails are built in. Select optional FFmpeg in Thumbnails before this preview to include videos.</p>
  <fieldset disabled={disabled}><legend>Recipient Lite launchers</legend>{[['windows','Windows x86_64'],['linux','Linux x86_64'],['macos','macOS Apple Silicon']].map(([id,label])=><Field key={id} id={'prepare-'+id} label={label} control={<FormControls.Checkbox checked={selection.recipients.includes(id)} onChange={e=>choose({recipients:e.target.checked?[...selection.recipients,id]:selection.recipients.filter(p=>p!==id)})}/>}/>)}</fieldset>
  <p>Preview downloads and verifies selected published packages into temporary storage. It writes nothing into this gallery. Prepared bundles retain original archives, support files and notices. Host runtime prerequisites still apply.</p>
  <Button onClick={()=>void action('guided_preview',{sessionId,expectedRevision:envelope?.revision,selection})} disabled={!sessionId||!envelope||disabled}>Preview preparation</Button>
  {job?<section aria-label="Gallery preparation progress" className="preparation-facts" data-guided-phase={job.phase} data-guided-id={job.id}>
   <p role="status">Preparation: {job.phase}{job.activeAction?'. '+job.activeAction:''}. {job.transferredBytes} {job.phase==='previewing'?'bytes received in current download':'files committed in current recipient'}.</p>
   <p>Gallery: {root}</p>
   {job.selection.presentation?<dl><dt>Presentation destination</dt><dd>{root}/settings.json (coordination: .local-media-gallery-settings.lock)</dd><dt>Planned document bytes</dt><dd>{job.presentationBytes??'Unavailable'}, SHA256 {job.presentationSha256??'unavailable'}</dd></dl>:null}
   {job.thumbnail?<p>Portable thumbnails: {job.thumbnail.phase}; destination {job.thumbnail.destination?pathLabel(job.thumbnail.destination):'unavailable'}; up to {job.thumbnail.storageUpperBoundBytes??'unknown'} bytes plus ownership records and one staged entry. {job.thumbnail.completed} completed, {job.thumbnail.reused} reused, {job.thumbnail.failed} failed, {job.thumbnail.skipped} skipped.</p>:null}
   <ul>{job.actions.map(a=><li key={a.name}><strong>{a.name}: {a.phase}</strong>{a.error?<p role="alert">{a.error}</p>:null}{a.recipient?<details><summary>Release identity, destinations and storage ({a.recipient.disposition})</summary><dl><dt>Release</dt><dd>{a.recipient.releaseVersion}, {a.recipient.platform}/{a.recipient.architecture}</dd><dt>Candidate identity</dt><dd>{a.recipient.candidateId}</dd><dt>Original archive</dt><dd>{a.recipient.artifactName}, SHA256 {a.recipient.artifactSha256}</dd><dt>Download / extracted / root launch copies</dt><dd>{a.recipient.downloadBytes} / {a.recipient.extractedBytes} / {a.recipient.entrypointBytes} bytes</dd><dt>Total retained logical bytes</dt><dd>{a.recipient.storageBytes} bytes. Temporary preview staging uses the same logical bytes before execution.</dd><dt>Destinations</dt><dd><ul>{a.recipient.destinations.map(d=><li key={d}>{root}/{d}</li>)}</ul></dd></dl></details>:null}</li>)}</ul>
   {job.phase==='ready'?<Button onClick={()=>void action('guided_start',{sessionId,previewId:job.id})} disabled={pending}>Apply selected preparation</Button>:null}
   {active?<Button variant="secondary" onClick={()=>void action('guided_cancel',{sessionId,jobId:job.id})} disabled={pending||job.phase==='cancelling'}>Cancel preparation</Button>:null}
   {job.error?<p role="alert">{job.error}</p>:null}
   {['success','partial','cancelled','failed'].includes(job.phase)?<p>Completed independent outputs remain usable. Resolve failed actions and preview again. Matching outputs are reused; unrelated or modified files are preserved.</p>:null}
  </section>:null}
  {error?<p role="alert">{error}</p>:null}
  <p>Keep complete packages and gallery-root launchers together when moving. Transfer Unix files with executable modes preserved, or extract the retained original archive on the recipient. Root launch copies and retained package update tools have separate locations; replacing one does not update the other.</p>
 </Dialog>;
}
