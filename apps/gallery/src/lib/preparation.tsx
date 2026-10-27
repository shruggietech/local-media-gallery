// SPDX-License-Identifier: Apache-2.0
'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {Button,Field,FormControls} from '@brand/web/react/server';
import {Dialog} from '@brand/web/react/client';
import type {NativePath} from './types';
export interface Helper {nativePath:NativePath;sha256:string;executableBytes:string;version:string;origin:string;downloadBytes:string|null;associatedPayloadBytes:string|null}
export interface Job {plannedOutputs:{itemId:string;slot:string;reused:boolean}[];droppedPlannedOutputs:string;id:string;sessionId:string;sequence:string;kind:string;phase:string;destinationKind:'local'|'portable';destination:NativePath|null;policy:string;candidates:string|null;completed:string;reused:string;failed:string;skipped:string;remaining:string|null;storageUpperBoundBytes:string|null;helper:Helper|null;helperLifetime:string|null;error:string|null;outcomes:{itemId:string;code:string}[];droppedOutcomes:string}
const active=(job:Job|null)=>!!job&&['previewing','running','cancelling'].includes(job.phase);
const message=(e:unknown)=>typeof e==='object'&&e&&'message' in e?String(e.message):String(e);
const label=(path:NativePath|null)=>path?new TextDecoder(path.encoding==='windows-utf16le'?'utf-16le':'utf-8').decode(new Uint8Array(path.bytes)):'Unavailable';
export function usePreparation(sessionId:string|null){
 const [job,setJob]=useState<Job|null>(null);const current=useRef<Job|null>(null);const session=useRef(sessionId);session.current=sessionId;
 const [selecting,setSelecting]=useState(false);const [error,setError]=useState('');const [pending,setPending]=useState(false);const [helper,setHelper]=useState<Helper|null>(null);const [epoch,setEpoch]=useState(0);
 const apply=useCallback((value:Job)=>{if(value.sessionId!==session.current)return;const old=current.current;if(old&&old.id===value.id&&BigInt(value.sequence)<=BigInt(old.sequence))return;current.current=value;setJob(value);if(!active(value)&&value.phase!=='ready')setEpoch(n=>n+1);},[]);
 useEffect(()=>{current.current=null;setJob(null);setError('');},[sessionId]);
 useEffect(()=>{let alive=true;let stop:(()=>void)|undefined;void listen<Job>('preparation-changed',event=>{if(alive&&event.payload.id===current.current?.id)apply(event.payload);}).then(unlisten=>{if(alive)stop=unlisten;else unlisten();});return()=>{alive=false;stop?.();};},[apply]);
 const action=async(command:string,args:Record<string,unknown>)=>{const expected=session.current;setPending(true);setError('');try{const value=await invoke<Job>(command,args);if(session.current!==expected)return;apply(value);apply(await invoke<Job>('preparation_status',{sessionId:expected,jobId:value.id}));}catch(e){if(session.current===expected)setError(message(e));}finally{setPending(false);}};
 const preview=(destinationKind:'local'|'portable')=>sessionId?action('preparation_preview',{sessionId,destinationKind}):Promise.resolve();
 const start=(cleanup=false)=>job?action(cleanup?'preparation_cleanup':'preparation_start',{sessionId,previewId:job.id}):Promise.resolve();
 const cancel=()=>job?action('preparation_cancel',{sessionId,jobId:job.id}):Promise.resolve();
 const select=async()=>{setSelecting(true);setPending(true);setError('');try{const selected=await invoke<Helper|null>('select_thumbnail_helper');if(selected){setHelper(selected);current.current=null;setJob(null);}}catch(e){current.current=null;setJob(null);setError(message(e));}finally{setPending(false);setSelecting(false);}};
 return{job,error,pending,selecting,helper,epoch,preview,start,cancel,select,busy:active(job)};
}
export type Preparation=ReturnType<typeof usePreparation>;
export function PreparationProgress({state}:{state:Preparation}) {
 const j=state.job;
 return j?<section className="preparation-progress" data-job-id={j.id} data-job-phase={j.phase} aria-label="Thumbnail job">
  <p role="status">{j.kind}: {j.phase}. {j.kind==='preview'?(j.candidates??'Unknown')+' candidates, ':j.completed+' completed, '}{j.reused} reused, {j.failed} failed, {j.skipped} skipped, {j.remaining??'Unknown'} remaining.</p>
  {state.busy?<Button variant="secondary" onClick={()=>void state.cancel()} disabled={state.pending}>Cancel thumbnails</Button>:null}
  {j.helperLifetime&&j.helperLifetime!=='exited'?<p>{j.helperLifetime}</p>:null}
  {j.error?<p role="alert">{j.error}. Completed entries remain usable. Resolve the cause and preview again.</p>:null}
 </section>:null;
}
export function PreparationControls({state,sessionId,items}:{state:Preparation;sessionId:string|null;items:import('./types').MediaItem[]}) {
 const [destination,setDestination]=useState<'local'|'portable'>('local');const j=state.job;
 const itemName=(id:string)=>items.find(item=>item.id===id)?.name??id;
 return <Dialog triggerLabel="Thumbnails" title="Optional thumbnails" description="Prepare card previews while focused viewing keeps original media.">
  <Field id="thumbnail-destination" label="Cache destination" control={<FormControls.Select value={destination} disabled={state.busy||state.pending} onChange={e=>setDestination(e.target.value as 'local'|'portable')}><option value="local">Machine-local cache</option><option value="portable">Portable cache in this gallery</option></FormControls.Select>}/>
  <p>PNG up to 320 × 320, preserving aspect ratio and orientation without cropping or enlarging. Video uses its first non-cover frame. Color is unmanaged.</p>
  <div className="preparation-actions"><Button variant="secondary" onClick={()=>void state.select()} disabled={state.busy||state.pending}>Select optional FFmpeg</Button><Button onClick={()=>void state.preview(destination)} disabled={!sessionId||state.busy||state.pending}>Preview thumbnails</Button></div>
  {state.selecting?<><p role="status">Inspecting selected helper; waiting for observed process exit.</p><Button variant="secondary" onClick={()=>void invoke('preparation_cancel_inspection')}>Cancel helper inspection</Button></>:null}
  {state.helper?<details className="preparation-facts"><summary>Selected FFmpeg identity and footprint</summary><dl><dt>Executable</dt><dd>{label(state.helper.nativePath)}</dd><dt>Version</dt><dd>{state.helper.version}</dd><dt>SHA256</dt><dd>{state.helper.sha256}</dd><dt>Executable bytes</dt><dd>{state.helper.executableBytes}</dd><dt>Download / additional runtime bytes</dt><dd>Unobserved / unobserved</dd></dl><p>The hash identifies selected bytes. Publisher authenticity and dynamic dependencies are unobserved. No tool is downloaded or installed.</p></details>:<p>Still images are built in. Video items are skipped until you select FFmpeg.</p>}
  {j?<><PreparationProgress state={state}/><dl className="preparation-facts"><dt>Destination</dt><dd>{label(j.destination)}</dd><dt>Storage upper bound</dt><dd>{j.storageUpperBoundBytes??'Unknown'} bytes, plus one staged entry and ownership records. Completed entries remain until explicit cleanup.</dd></dl>
   {j.phase==='ready'?<div className="preparation-actions"><Button onClick={()=>void state.start()} disabled={state.pending}>Generate thumbnails</Button><Button variant="secondary" onClick={()=>void state.start(true)} disabled={state.pending}>Clean validated owned cache</Button></div>:null}
   <details><summary>Planned outputs ({j.plannedOutputs.length} shown, {j.droppedPlannedOutputs} additional)</summary><ul className="preparation-facts">{j.plannedOutputs.map(o=><li key={o.slot}>{itemName(o.itemId)}: {o.slot} ({o.reused?'reuse':'new'})</li>)}</ul></details>
   {j.outcomes.length?<details><summary>Item outcomes</summary><ul>{j.outcomes.map((o,i)=><li key={i}>{itemName(o.itemId)}: {o.code}</li>)}</ul></details>:null}
  </>:null}
  {state.error?<p role="alert">{state.error}</p>:null}
  <p>Preview reads full source files without writing. Existing conflicts are preserved. Cleanup removes validated owned output and retains invalid or future records; originals, sidecars and settings remain intact.</p>
 </Dialog>;
}
