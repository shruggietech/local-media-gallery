// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {acquireBytes,withDownloadRetries,requireDownloadResponse,readDownloadBody} from '../scripts/download-acquisition.mjs';
const transient=(code='ECONNRESET')=>Object.assign(new TypeError('private transport https://user:password@host.invalid/bytes?token=secret'),{cause:{code}});
const quick={baseDelayMs:0,pause:async()=>{}};
async function service(handler){const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));return{url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(r=>{server.closeAllConnections();server.close(r);})};}
test('Complete acquisition retries elected transient HTTP and transport outcomes with independent content',async()=>{
 let calls=0;const actual=await acquireBytes('https://example.invalid/bytes',{...quick,label:'fixture input',fetcher:async()=>{calls++;if(calls===1)throw transient();if(calls===2)return new Response(null,{status:504});return new Response('complete');}});assert.equal(calls,3);assert.equal(actual.toString(),'complete');
});
test('Permanent HTTP, TLS, invalid configuration and unknown TypeError are terminal',async()=>{
 for(const fault of [400,401,403,404,501,505,'CERT_HAS_EXPIRED','ERR_TLS_CERT_ALTNAME_INVALID','ERR_INVALID_URL','UNKNOWN']){let calls=0;await assert.rejects(acquireBytes('https://example.invalid/bytes',{...quick,fetcher:async()=>{calls++;if(typeof fault==='number')return new Response(null,{status:fault});if(fault==='UNKNOWN')throw new TypeError('arbitrary private message');throw transient(fault);}}));assert.equal(calls,1,String(fault));}
});
test('All elected temporary HTTP statuses can recover and no additional status is implied',async()=>{
 for(const status of [408,429,500,502,503,504]){let calls=0;const bytes=await acquireBytes('https://example.invalid/bytes',{...quick,fetcher:async()=>++calls===1?new Response(null,{status}):new Response('ok')});assert.equal(calls,2);assert.equal(bytes.toString(),'ok');}
});
test('Interrupted response body discards partial chunks before a complete retry',async()=>{
 let calls=0;const bytes=await acquireBytes('https://example.invalid/bytes',{...quick,fetcher:async()=>{calls++;if(calls===1){let n=0;return new Response(new ReadableStream({pull(controller){if(n++===0)controller.enqueue(new Uint8Array(Buffer.from('partial')));else controller.error(transient());}}));}return new Response('replacement');}});assert.equal(calls,2);assert.equal(bytes.toString(),'replacement');
});
test('Size and consumer validation failures never retry',async()=>{
 let calls=0;await assert.rejects(acquireBytes('https://example.invalid/bytes',{...quick,maxBytes:3,fetcher:async()=>{calls++;return new Response('too large');}}),/bound/);assert.equal(calls,1);
 calls=0;await assert.rejects(withDownloadRetries(async()=>{calls++;throw new SyntaxError('invalid private response payload');},{...quick,label:'metadata'}));assert.equal(calls,1);
});
test('Attempt exhaustion retains safe status, count and elapsed diagnostics',async()=>{
 let calls=0;await assert.rejects(acquireBytes('https://user:password@example.invalid/path?token=secret#fragment',{...quick,attempts:3,fetcher:async()=>{calls++;return new Response('response-secret',{status:503});}}),error=>{assert.equal(error.attempts,3);assert.ok(error.elapsedMs>=0);assert.equal(error.status,503);assert.match(error.message,/503/);assert.doesNotMatch(JSON.stringify(error)+' '+error.stack,/password|token=|response-secret|fragment/);return true;});assert.equal(calls,3);
});
test('Raw nested transport messages and credentials do not escape failure diagnostics',async()=>{
 await assert.rejects(acquireBytes('https://user:password@example.invalid/?token=secret',{...quick,attempts:1,fetcher:async()=>{throw transient();}}),error=>{assert.match(error.message,/ECONNRESET/);assert.doesNotMatch(JSON.stringify(error)+' '+error.stack,/password|token=|private transport|fixture-secret/);assert.equal(error.cause,undefined);return true;});
});
test('One absolute deadline covers failed work and delays without another admission',async()=>{
 let clock=0,calls=0;await assert.rejects(acquireBytes('https://example.invalid/bytes',{timeoutMs:20,now:()=>clock,pause:async ms=>{clock+=ms;},baseDelayMs:10,fetcher:async()=>{calls++;clock+=12;return new Response(null,{status:503});}}),/deadline|budget/);assert.equal(calls,1);
 calls=0;await assert.rejects(acquireBytes('https://example.invalid/bytes',{...quick,deadline:Date.now()-1,fetcher:async()=>{calls++;return new Response('late');}}),/deadline/);assert.equal(calls,0);
});
test('A result completed after the elected deadline is not accepted',async()=>{
 let clock=0;await assert.rejects(acquireBytes('https://example.invalid/bytes',{...quick,timeoutMs:10,now:()=>clock,fetcher:async()=>{clock=11;return new Response('late');}}),error=>error.name==='TimeoutError');
});
test('Retry-After seconds and date are honored within the elected budget',async()=>{
 for(const header of ['2',new Date(3000).toUTCString()]){let clock=1000,calls=0;const delays=[];assert.equal((await acquireBytes('https://example.invalid/bytes',{timeoutMs:10000,now:()=>clock,pause:async ms=>{delays.push(ms);clock+=ms;},baseDelayMs:0,fetcher:async()=>++calls===1?new Response(null,{status:429,headers:{'retry-after':header}}):new Response('ok')})).toString(),'ok');assert.deepEqual(delays,[2000]);assert.equal(calls,2);}
});
test('Excessive Retry-After stops rather than retrying early; malformed values use backoff',async()=>{
 for(const value of ['99999999999999999999999999','60']){let calls=0,pauses=0;await assert.rejects(acquireBytes('https://example.invalid/bytes',{timeoutMs:1000,fetcher:async()=>{calls++;return new Response(null,{status:429,headers:{'retry-after':value}});},pause:async()=>{pauses++;}}),/delay|budget|deadline/);assert.equal(calls,1);assert.equal(pauses,0);}
 let calls=0;const delays=[];await acquireBytes('https://example.invalid/bytes',{timeoutMs:1000,baseDelayMs:7,pause:async ms=>{delays.push(ms);},fetcher:async()=>++calls===1?new Response(null,{status:503,headers:{'retry-after':'malformed'}}):new Response('ok')});assert.deepEqual(delays,[7]);
});
test('Caller cancellation before acquisition and during backoff forbids extra attempts',async()=>{
 const stopped=new AbortController();stopped.abort(Error('private abort token=secret'));let calls=0;await assert.rejects(acquireBytes('https://example.invalid/bytes',{signal:stopped.signal,fetcher:async()=>{calls++;return new Response('bad');}}),error=>error.name==='AbortError'&&!error.message.includes('secret'));assert.equal(calls,0);
 const active=new AbortController();calls=0;const operation=acquireBytes('https://example.invalid/bytes',{signal:active.signal,baseDelayMs:5000,fetcher:async()=>{calls++;setTimeout(()=>active.abort(),10);return new Response(null,{status:503});}});await assert.rejects(operation,error=>error.name==='AbortError');assert.equal(calls,1);
});
test('Native fetch stalled body is cancelled by the total deadline',async t=>{
 const local=await service((req,res)=>{res.writeHead(200);res.write('partial');});t.after(local.close);let calls=0;const began=Date.now();await assert.rejects(acquireBytes(local.url,{timeoutMs:80,fetcher:(...args)=>{calls++;return fetch(...args);}}),error=>['AbortError','TimeoutError'].includes(error.name));assert.equal(calls,1);assert.ok(Date.now()-began<1000);
});
test('Caller cancellation during a native body read stops consumption and admission',async t=>{
 let started;const admitted=new Promise(r=>started=r);const local=await service((req,res)=>{res.writeHead(200);res.write('partial');started();});t.after(local.close);const controller=new AbortController();let calls=0;const operation=acquireBytes(local.url,{signal:controller.signal,fetcher:(...args)=>{calls++;return fetch(...args);}});await admitted;controller.abort();await assert.rejects(operation,error=>error.name==='AbortError');assert.equal(calls,1);
});
test('Concurrent acquisitions keep separate attempt and body state',async()=>{
 const counts=[0,0];const results=await Promise.all(counts.map((_,i)=>acquireBytes('https://example.invalid/'+i,{...quick,fetcher:async()=>++counts[i]<=i+1?new Response(null,{status:502}):new Response(String(i))})));assert.deepEqual(counts,[2,3]);assert.deepEqual(results.map(b=>b.toString()),['0','1']);
});
test('A caller-owned operation can elect an allowed absence and retains its own validation',async()=>{
 const result=await withDownloadRetries(async signal=>{assert.ok(signal instanceof AbortSignal);const response=new Response(null,{status:404});await response.body?.cancel();return null;},{...quick});assert.equal(result,null);
 await assert.rejects(withDownloadRetries(async()=>{const response=new Response('oversized');await requireDownloadResponse(response);return readDownloadBody(response,{maxBytes:1});},{...quick}),/bound/);
});

test('Nested aggregate transport errors retry only when every cause is elected temporary',async()=>{
 for(const permanent of [false,true]){let calls=0;const fetcher=async()=>{calls++;if(calls===1)throw new TypeError('private aggregate',{cause:new AggregateError([Object.assign(Error('private'),{code:'ECONNREFUSED'}),Object.assign(Error('private'),{code:permanent?'CERT_HAS_EXPIRED':'ETIMEDOUT'})])});return new Response('ok');};if(permanent){await assert.rejects(acquireBytes('https://example.invalid/bytes',{...quick,fetcher}));assert.equal(calls,1);}else{assert.equal((await acquireBytes('https://example.invalid/bytes',{...quick,fetcher})).toString(),'ok');assert.equal(calls,2);}}
});
test('An unexpected delay failure is not misreported as caller cancellation',async()=>{
 await assert.rejects(acquireBytes('https://example.invalid/bytes',{baseDelayMs:1,pause:async()=>{throw Error('private delay cause');},fetcher:async()=>new Response(null,{status:503})}),error=>error.name!=='AbortError'&&!error.message.includes('private delay cause'));
});

test('Acquisition requests revalidation rather than reusing cached delivery errors',async()=>{
 let calls=0;const data=await acquireBytes('https://example.invalid/pinned',{...quick,fetcher:async(url,options)=>{assert.equal(options.cache,'no-store');return ++calls===1?new Response(null,{status:504}):new Response('pinned');}});assert.equal(data.toString(),'pinned');assert.equal(calls,2);
});
