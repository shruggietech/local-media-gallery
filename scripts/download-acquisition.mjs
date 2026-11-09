// SPDX-License-Identifier: Apache-2.0
// Maintainer-only, idempotent acquisition. Validation and publication stay with callers.
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';

const temporaryStatuses=new Set([408,429,500,502,503,504]);
const temporaryCodes=new Set(['ECONNRESET','ECONNREFUSED','ETIMEDOUT','EAI_AGAIN','ENETUNREACH','EHOSTUNREACH','EPIPE','UND_ERR_SOCKET','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT']);
class AcquisitionFailure extends Error {
 constructor(message,{status,retryAfter,kind='validation',retryable=false}={}){super(message);this.status=status;this.kind=kind;this.retryable=retryable;Object.defineProperty(this,'retryAfter',{value:retryAfter});}
}
const labelText=value=>String(value??'Download').replace(/https?:\/\/[^\s]+/g,address=>{try{return new URL(address).origin;}catch{return '[invalid origin]';}}).replace(/[\r\n\u0000-\u001f]/g,' ').slice(0,160);
export class DownloadValidationError extends AcquisitionFailure {constructor(message){super(labelText(message),{kind:'validation'});}}
const diagnosticCodes=new Set([...temporaryCodes,'CERT_HAS_EXPIRED','ERR_TLS_CERT_ALTNAME_INVALID','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','SELF_SIGNED_CERT_IN_CHAIN','ERR_INVALID_URL','ERR_INVALID_ARG_TYPE','ERR_INVALID_ARG_VALUE','ERR_ASSERTION','UND_ERR_INVALID_ARG','UND_ERR_HEADERS_OVERFLOW','UND_ERR_RES_EXCEEDED_MAX_SIZE']);
function codesOf(error,depth=0){if(!error||depth>=8)return [];if(diagnosticCodes.has(error.code))return [error.code];if(error instanceof AggregateError)return error.errors.slice(0,8).flatMap(e=>codesOf(e,depth+1));return codesOf(error.cause,depth+1);}
function transient(error,depth=0){
 if(!error||depth>=8)return false;
 if(error instanceof AcquisitionFailure)return error.retryable;
 if(typeof error.code==='string')return temporaryCodes.has(error.code);
 if(error instanceof AggregateError)return error.errors.length>0&&error.errors.every(e=>transient(e,depth+1));
 return transient(error.cause,depth+1);
}
function safeFailure(error){
 if(error instanceof AcquisitionFailure)return {kind:error.kind,message:error.message,...(error.status?{status:error.status}:{})};
 const codes=codesOf(error);if(codes.length)return {kind:'transport',message:codes.join(', '),codes};
 if(['AbortError','TimeoutError'].includes(error?.name))return {kind:'timeout',message:error.name};
 return {kind:'validation',message:error?.name==='SyntaxError'?'Invalid content':'Acquisition operation failed'};
}
function terminal(label,history,started,now,name='Error',reason){
 const last=history.at(-1);const error=Error(label+': '+(reason??last?.message??'Acquisition failed')+' after '+history.length+' attempt(s) in '+Math.max(0,now()-started)+'ms');
 error.name=name;error.attempts=history.length;error.elapsedMs=Math.max(0,now()-started);error.failures=history;
 if(last?.status)error.status=last.status;return error;
}
function retryAfter(value,now){
 if(value===null||value===undefined)return null;const text=value.trim();
 if(/^\d+$/.test(text)){if(text.length>12)return Infinity;return Number(text)*1000;}
 if(text.length>128||!/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/.test(text))return null;
 const asctime=/^[A-Za-z]{3} [A-Za-z]{3} +\d{1,2} \d{2}:\d{2}:\d{2} \d{4}$/.test(text);
 const date=Date.parse(asctime?text+' GMT':text);return Number.isFinite(date)?Math.max(0,date-now):null;
}

export async function withDownloadRetries(operation,{label='Download',timeoutMs=120000,deadline=Infinity,attempts=4,signal,attemptTimeoutMs=timeoutMs,baseDelayMs=1000,maxDelayMs=30000,now=Date.now,pause=(ms,s)=>delay(ms,undefined,{signal:s}),retryAllowed=()=>true}={}){
 assert.equal(typeof operation,'function');
 for(const [name,value]of Object.entries({timeoutMs,attemptTimeoutMs,attempts,maxDelayMs}))assert.ok(Number.isSafeInteger(value)&&value>0,'Invalid acquisition '+name);
 assert.ok(attempts<=4,'Acquisition attempt bound');assert.ok(Number.isSafeInteger(baseDelayMs)&&baseDelayMs>=0,'Invalid acquisition delay');assert.ok(deadline===Infinity||Number.isFinite(deadline),'Invalid acquisition deadline');
 const started=now(),end=Math.min(started+timeoutMs,deadline),history=[],safeLabel=labelText(label);
 for(let attempt=1;attempt<=attempts;attempt++){
  if(signal?.aborted)throw terminal(safeLabel,history,started,now,'AbortError','Acquisition cancelled');
  const remaining=end-now();if(remaining<=0)throw terminal(safeLabel,history,started,now,'TimeoutError','Acquisition deadline reached');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(new DOMException('Acquisition attempt timed out','TimeoutError')),Math.max(1,Math.min(attemptTimeoutMs,remaining)));
  const current=signal?AbortSignal.any([signal,controller.signal]):controller.signal;let failure;
  try{const result=await operation(current,attempt);current.throwIfAborted();if(now()>=end)throw new DOMException('Acquisition deadline reached','TimeoutError');return result;}
  catch(error){failure=error;}
  finally{clearTimeout(timer);}
  const observation=safeFailure(failure);history.push({attempt,...observation,elapsedMs:Math.max(0,now()-started)});
  if(signal?.aborted)throw terminal(safeLabel,history,started,now,'AbortError','Acquisition cancelled');
  if(now()>=end)throw terminal(safeLabel,history,started,now,'TimeoutError','Acquisition deadline reached');
  const timedOut=controller.signal.aborted&&controller.signal.reason?.name==='TimeoutError';
  if(attempt===attempts||!(timedOut||transient(failure))||!retryAllowed())throw terminal(safeLabel,history,started,now,['AbortError','TimeoutError'].includes(failure?.name)?failure.name:'Error');
  const requested=retryAfter(failure?.retryAfter,now()),backoff=Math.min(maxDelayMs,baseDelayMs*2**(attempt-1));
  const wait=requested===null?backoff:Math.max(backoff,requested);
  if(wait>maxDelayMs||wait>=end-now())throw terminal(safeLabel,history,started,now,'Error','Retry delay exceeds acquisition budget');
  try{await pause(wait,signal);}catch{throw terminal(safeLabel,history,started,now,signal?.aborted?'AbortError':'Error',signal?.aborted?'Acquisition cancelled':'Acquisition retry delay failed');}
 }
 throw terminal(safeLabel,history,started,now);
}

export async function requireDownloadResponse(response,{label='Download'}={}){
 if(response.ok)return response;
 const status=response.status,retry=response.headers.get('retry-after');
 try{await response.body?.cancel();}catch{/* Preserve the HTTP outcome; the enclosing signal also retires the response. */}
 throw new AcquisitionFailure(labelText(label)+': '+status,{status,retryAfter:retry,kind:'http',retryable:temporaryStatuses.has(status)});
}

export async function readDownloadBody(response,{maxBytes=1073741824,collect=true,onChunk,signal,boundLabel='Download response bound exceeded'}={}){
 assert.ok(Number.isSafeInteger(maxBytes)&&maxBytes>0,'Invalid acquisition byte bound');
 const declared=response.headers.get('content-length');
 if(declared&&/^\d+$/.test(declared)&&BigInt(declared)>BigInt(maxBytes)){try{await response.body?.cancel();}catch{}throw new AcquisitionFailure(boundLabel,{kind:'size'});}
 const chunks=[];let bytes=0;signal?.throwIfAborted();
 for await(const chunk of response.body??[]){signal?.throwIfAborted();bytes+=chunk.length;if(bytes>maxBytes)throw new AcquisitionFailure(boundLabel,{kind:'size'});if(onChunk)await onChunk(chunk);if(collect)chunks.push(chunk);}
 signal?.throwIfAborted();return collect?Buffer.concat(chunks):{bytes};
}

export async function acquireBytes(url,{fetcher=fetch,headers,redirect='follow',maxBytes=1073741824,...policy}={}){
 return withDownloadRetries(async signal=>{const response=await fetcher(url,{headers,redirect,signal});await requireDownloadResponse(response,{label:policy.label});return readDownloadBody(response,{maxBytes,signal});},policy);
}
