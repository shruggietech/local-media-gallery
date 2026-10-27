// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {access,mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {root,execute} from './run.mjs';

/** Prepare the same isolated interpreter for full tools or an elected pinned subset. */
export async function preparePython(packages){
 const directory=path.join(root,'.local/python');await mkdir(path.dirname(directory),{recursive:true});
 const python=path.join(directory,process.platform==='win32'?'Scripts/python.exe':'bin/python');
 try{await access(python);}catch{await execute(process.env.PYTHON_BOOTSTRAP??'python',['-m','venv',directory]);}
 const requirements=path.join(root,'requirements-dev.txt');
 let arguments_=['-r',requirements];
 if(packages){
  assert.ok(packages.length>0);const lines=(await readFile(requirements,'utf8')).split(/\r?\n/).map(line=>line.trim());
  arguments_=packages.map(name=>{assert.match(name,/^[A-Za-z][A-Za-z0-9_-]*$/);const pins=lines.filter(line=>line.startsWith(name+'=='));assert.equal(pins.length,1,'Expected one authoritative pin for '+name);assert.match(pins[0],/^[A-Za-z0-9_-]+==[A-Za-z0-9_.+-]+$/);return pins[0];});
 }
 await execute(python,['-m','pip','install','--disable-pip-version-check','--no-input',...arguments_]);
 return python;
}
