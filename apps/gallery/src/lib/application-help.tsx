// SPDX-License-Identifier: Apache-2.0
'use client';
import {useEffect,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {Button} from '@brand/web/react/server';
import {PRODUCT_VERSION} from './product-version';
const documentation='https://localmedia.gallery/docs';
interface Info {version:string;edition:string;os:string;arch:string}
interface Notice {title:string;contents:string}
export function ApplicationHelp({kind}:{kind:'documentation'|'about'}){
  const [info,setInfo]=useState<Info|null>(null),[notices,setNotices]=useState<Notice[]>([]),[status,setStatus]=useState(''),[pending,setPending]=useState(false);
  useEffect(()=>{
    if(kind!=='about')return;let alive=true;
    void Promise.all([invoke<Info>('application_info'),invoke<Notice[]>('application_notices')]).then(([info,notices])=>{if(alive){setInfo(info);setNotices(notices);}}).catch(()=>{if(alive)setStatus('Application details could not be loaded. Reopen About to try again.');});
    return()=>{alive=false;};
  },[kind]);
  const open=async()=>{setPending(true);setStatus('');try{await invoke('open_documentation');setStatus('Documentation was requested in your default browser. If it did not open, copy the address below.');}catch{setStatus('The default browser could not be requested. Copy the documentation address and open it in your browser.');}finally{setPending(false);}};
  const copy=async()=>{try{if(!navigator.clipboard?.writeText)throw Error('Unavailable');await navigator.clipboard.writeText(documentation);setStatus('Documentation address copied.');}catch{setStatus('The address could not be copied. Select and copy the full address below.');}};
  return kind==='documentation'?<section aria-label="Released documentation"><p>Read the published documentation. Choose a release version on the documentation site. New source behavior can differ from the latest published version.</p><p className="folder-path" tabIndex={0}>{documentation}</p><div className="preparation-actions"><Button disabled={pending} onClick={()=>void open()}>Open documentation</Button><Button variant="secondary" onClick={()=>void copy()}>Copy documentation address</Button></div><p role="status">{status}</p></section>
    :<section aria-label="Application and licenses"><picture><source media="(prefers-color-scheme: light)" srcSet="/brand/logos/named/localmedia-gallery-brand-mark-reduced-detail-full-color-clear-for-light.svg"/><img className="about-mark" src="/brand/logos/named/localmedia-gallery-brand-mark-reduced-detail-full-color-clear-for-dark.svg" alt=""/></picture><h3>Local Media Gallery {info?.version??PRODUCT_VERSION}</h3><p>A ShruggieTech project</p>{info?<p>{info.edition} edition · {info.os}/{info.arch}</p>:null}<p>Original source and documentation are licensed under Apache License 2.0. Brand assets and bundled fonts retain their own licenses below.</p>{notices.map(notice=><details key={notice.title}><summary>{notice.title}</summary><pre className="application-notice">{notice.contents}</pre></details>)}<p role="status">{status}</p></section>;
}
