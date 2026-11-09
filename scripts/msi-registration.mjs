// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import path from 'node:path';
export function registrationCase(value){
 const match=/^registration-(010|020|021|022)-(flat|nested|original|repair)-(76|127|128|129|130|131)$/.exec(value);
 assert.ok(match,'Unknown finite registration diagnostic case');
 return {name:value,version:'0.'+Number(match[1][1])+'.'+Number(match[1][2]),structure:match[2]==='repair'?'nested':match[2],repair:match[2]==='repair',length:Number(match[3])};
}
export function registrationLocation(c,base){
 assert.match(base,/^[CD]:\\/i);assert.equal(path.win32.resolve(base),base);
 const prefix=path.win32.join(base,...(c.structure==='flat'?['case']:c.structure==='nested'?['a','b','c','d']:['local-media-gallery','local-media-gallery','.local']));
 const available=c.length-path.win32.join(prefix,'local-media-gallery.exe').length-1;
 assert.ok(available>0,'Diagnostic prefix exceeds selected length');
 const result=path.win32.join(prefix,'x'.repeat(available));
 assert.equal(path.win32.join(result,'local-media-gallery.exe').length,c.length);return result;
}
export function recordMsiOutcome(error){
 const code=error?.code??(error?null:0),killed=error?.killed??false,signal=error?.signal??null;
 return {code,killed,signal,terminal:Number.isInteger(code)&&!killed&&signal===null};
}
