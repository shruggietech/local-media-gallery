// SPDX-License-Identifier: Apache-2.0
'use client';
import {useEffect,useRef,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import type {Snapshot,MediaItem} from './types';
import type {createAdmissionQueue,LoadOutcome} from './admission';
interface Owner {url:string;alive:boolean;done:(outcome?:LoadOutcome)=>void}
export function useThumbnail(snapshot:Snapshot,item:MediaItem,interested:boolean,queue:ReturnType<typeof createAdmissionQueue>,epoch:number){
 const discoveryId=snapshot.discovery?.id;
 const [preview,setPreview]=useState<{source:string|null;ready:boolean;width?:number;height?:number}>({source:null,ready:false});const owner=useRef<Owner|null>(null);
 useEffect(()=>{setPreview({source:null,ready:false});if(!interested||!snapshot.sessionId||!snapshot.mediaOrigin)return;let alive=true;let interest:string|null=null;let current:Owner|null=null;
 const cancel=queue.request(done=>{void invoke<string>('cache_interest',{sessionId:snapshot.sessionId,itemId:item.id,itemRevision:item.revision}).then(token=>{interest=token;if(!alive){void invoke('cache_cancel',{interestId:token}).catch(()=>{});return;}const url=snapshot.mediaOrigin+'/thumbnail/'+snapshot.sessionId+'/'+item.id+'/'+item.revision+'/'+token;current={url,alive:true,done};owner.current=current;setPreview({source:url,ready:false});},()=>done('failure'));return()=>{if(current)current.alive=false;if(owner.current===current)owner.current=null;if(interest)void invoke('cache_cancel',{interestId:interest}).catch(()=>{});};});
 return()=>{alive=false;if(current)current.alive=false;cancel();if(interest)void invoke('cache_cancel',{interestId:interest});};
 },[snapshot.sessionId,snapshot.mediaOrigin,item.id,item.revision,discoveryId,interested,queue,epoch]);
 const loaded=(element:HTMLImageElement)=>{const held=owner.current;if(!held?.alive||element.getAttribute('src')!==held.url)return;void element.decode().then(()=>{if(held.alive&&owner.current===held){setPreview({source:held.url,ready:true,width:element.naturalWidth,height:element.naturalHeight});held.done();}},()=>{if(held.alive&&owner.current===held){setPreview({source:null,ready:false});held.done('failure');}});};
 const failed=(element:HTMLImageElement)=>{const held=owner.current;if(held?.alive&&element.getAttribute('src')===held.url){setPreview({source:null,ready:false});held.done('failure');}};
 return{...preview,loaded,failed};
}
