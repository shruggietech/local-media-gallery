// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {mkdir,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {validateWindowsCohortClock} from './windows-package-cohort.mjs';

const fields=new Set(['phase','status','route','requestId','action','actor','targetActor','deadline','exitCode','errorCode','method','outcome','stage']);
const actorFields=new Set(['pid','parentPid','creationTime','executablePath','sha256']);
function actorValid(actor){
 assert.ok(actor&&typeof actor==='object'&&!Array.isArray(actor));for(const key of Object.keys(actor))assert.ok(actorFields.has(key),'Unknown actor field');
 for(const key of ['pid','parentPid'])if(key in actor)assert.ok(actor[key]===null||(Number.isSafeInteger(actor[key])&&actor[key]>0));
 if('creationTime'in actor)assert.ok(actor.creationTime===null||/^[1-9][0-9]{0,24}$/.test(actor.creationTime));
 if('executablePath'in actor)assert.ok(actor.executablePath===null||(typeof actor.executablePath==='string'&&actor.executablePath.length<=2048));
 if('sha256'in actor)assert.ok(actor.sha256===null||/^[a-f0-9]{64}$/.test(actor.sha256));
}
function eventValid(event){
 assert.ok(event&&typeof event==='object'&&!Array.isArray(event));for(const key of Object.keys(event))assert.ok(fields.has(key),'Unknown checkpoint field');
 assert.ok(typeof event.phase==='string'&&event.phase.length>0&&event.phase.length<=120);assert.ok(['pending','started','complete','failed','closing','cleanup','closed'].includes(event.status));
 for(const key of ['route','action','errorCode','method','outcome','stage'])if(key in event)assert.ok(typeof event[key]==='string'&&event[key].length<=256);
 if('requestId'in event)assert.ok(Number.isSafeInteger(event.requestId)&&event.requestId>0);
 if('deadline'in event)assert.ok(Number.isFinite(Date.parse(event.deadline)));
 if('exitCode'in event)assert.ok(event.exitCode===null||Number.isInteger(event.exitCode));
 for(const key of ['actor','targetActor'])if(event[key]!==undefined)actorValid(event[key]);
 assert.ok(Buffer.byteLength(JSON.stringify(event))<=4096,'Checkpoint event exceeds its bound');
}
function contextValid(context){
 const allowed=new Set(['runId','attempt','revision','shaLabel','source','buildSha256','preparationStarted','campaign','clock']);
 for(const key of Object.keys(context))assert.ok(allowed.has(key),'Unknown checkpoint context');
 assert.match(context.revision,/^[a-f0-9]{40}$/);for(const key of Object.keys(context.source))assert.ok(['sha256','files','exclusions'].includes(key),'Unknown checkpoint source field');if(context.source.exclusions!==undefined)assert.ok(Array.isArray(context.source.exclusions)&&context.source.exclusions.every(v=>typeof v==='string'&&v.length<=512));assert.match(context.source.sha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(context.source.files)&&context.source.files>0);assert.match(context.buildSha256,/^[a-f0-9]{64}$/);assert.ok(['all','experience','lifecycle'].includes(context.campaign));
 assert.ok(Buffer.byteLength(JSON.stringify(context))<=16384,'Checkpoint context exceeds its bound');
 if(context.clock){assert.equal(context.clock.runId,String(context.runId));assert.equal(context.clock.attempt,String(context.attempt));validateWindowsCohortClock(context.clock,context);}
 else assert.equal(context.campaign,'all','Shared campaign clock required');
}
export function validateObserverJournal(packet,context){
 contextValid(context);assert.equal(packet.formatVersion,1);assert.equal(packet.acceptance,false);assert.deepEqual(packet.context,context);assert.ok(Number.isSafeInteger(packet.droppedRecords)&&packet.droppedRecords>=0);assert.ok(Array.isArray(packet.records)&&packet.records.length<=1024);
 for(const [index,record]of packet.records.entries()){assert.equal(record.sequence,packet.droppedRecords+index+1);assert.ok(Number.isFinite(Date.parse(record.at)));const {sequence:_sequence,at:_at,...event}=record;eventValid(event);}
 assert.ok(Buffer.byteLength(JSON.stringify(packet))<=8*1024*1024);return true;
}
async function atomicJson(file,value){
 const temporary=file+'.next-'+randomUUID();
 try{await writeFile(temporary,JSON.stringify(value)+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});await rename(temporary,file);}catch(error){await unlink(temporary).catch(()=>{});throw error;}
}
export async function createObserverJournal({file,latest,context,maxRecords=256,maxBytes=1024*1024,now=()=>new Date().toISOString()}){
 contextValid(context);assert.notEqual(path.resolve(file),path.resolve(latest));assert.ok(Number.isInteger(maxRecords)&&maxRecords>0&&maxRecords<=1024);assert.ok(Number.isInteger(maxBytes)&&maxBytes>=16384&&maxBytes<=8*1024*1024);
 await mkdir(path.dirname(file),{recursive:true});await mkdir(path.dirname(latest),{recursive:true});
 const packet={formatVersion:1,acceptance:false,context:structuredClone(context),droppedRecords:0,records:[]};let sequence=0,tail=Promise.resolve();assert.ok(Buffer.byteLength(JSON.stringify(packet))+8192<=maxBytes,'Checkpoint header leaves no event budget');
 async function persist(){await atomicJson(file,packet);await atomicJson(latest,{formatVersion:1,acceptance:false,context:packet.context,droppedRecords:packet.droppedRecords,record:packet.records.at(-1)??null});}
 await persist();
 return {file,latest,context:structuredClone(context),record(event){
  const operation=tail.then(async()=>{eventValid(event);const next={sequence:++sequence,at:now(),...structuredClone(event)};packet.records.push(next);while(packet.records.length>maxRecords||Buffer.byteLength(JSON.stringify(packet))+1>maxBytes){packet.records.shift();packet.droppedRecords++;}await persist();return next;});
  tail=operation.catch(()=>{});return operation;
 }};
}

export function validateNativeObserverCheckpoint(packet,context){
 contextValid(context);assert.equal(packet.formatVersion,1);assert.equal(packet.acceptance,false);assert.deepEqual(packet.context,context);assert.equal(packet.phase,'native-request');assert.ok(['pending','complete','failed'].includes(packet.status));assert.ok(Number.isFinite(Date.parse(packet.at)));assert.ok(Number.isSafeInteger(packet.requestId)&&packet.requestId>0);assert.ok(typeof packet.route==='string'&&packet.route.length<=256);actorValid(packet.actor);assert.ok(packet.actor.creationTime,'Native actor creation identity required');assert.match(packet.actor.sha256,/^[a-f0-9]{64}$/);if(packet.targetActor!==null)actorValid(packet.targetActor);return true;
}
