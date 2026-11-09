// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import path from 'node:path';
import {digest,packageGuid,xml} from './windows-packages.mjs';
import {productVersion} from './product-version.mjs';
import {requireIsolatedDesktop} from './desktop-isolation.mjs';
function table(bytes){
 const text=bytes.toString(bytes[0]===255&&bytes[1]===254?'utf16le':'latin1').replace(/^\uFEFF/,'');
 const rows=text.split(/\r?\n/);while(rows.at(-1)==='')rows.pop();
 assert.ok(rows.length>=3);return {header:rows.slice(0,3),rows:new Map(rows.slice(3).map(row=>[row.split('\t')[0],row.split('\t')]))};
}
function changedRows(before,after){
 assert.deepEqual(before.header,after.header);const keys=new Set([...before.rows.keys(),...after.rows.keys()]);
 return [...keys].filter(key=>JSON.stringify(before.rows.get(key))!==JSON.stringify(after.rows.get(key)));
}
export function verifyLegacyPatchTables(prior,next,guard){
 const allowed=new Set(['Binary.idt','CustomAction.idt','InstallExecuteSequence.idt']);
 const added=[...next.keys()].filter(k=>!prior.has(k));assert.equal(added.length,1,'Exactly one new compiled binary stream');
 assert.equal(digest(next.get(added[0])),digest(guard),'Patch guard stream identity');
 for(const [key,value]of prior){assert.ok(next.has(key),'Removed MSI table/stream: '+key);if(!allowed.has(key))assert.deepEqual(next.get(key),value,'Unexpected MSI delta: '+key);}
 const b=table(prior.get('Binary.idt')),bn=table(next.get('Binary.idt'));assert.deepEqual(changedRows(b,bn),['LegacyRecovery']);assert.equal(bn.rows.get('LegacyRecovery')[0],'LegacyRecovery');assert.equal(bn.rows.get('LegacyRecovery').length,2);
 const c=table(prior.get('CustomAction.idt')),cn=table(next.get('CustomAction.idt'));assert.deepEqual(changedRows(c,cn).sort(),['LegacyConfigure','Preflight']);
 const old=c.rows.get('Preflight'),replacement=[...old];assert.equal(old[1],'1');assert.equal(old[2],'Ownership');assert.equal(old[3],'Preflight');replacement[2]='LegacyRecovery';replacement[3]='LegacyPreflight';assert.deepEqual(cn.rows.get('Preflight'),replacement);
 const configure=['LegacyConfigure','1','LegacyRecovery','LegacyConfigure'];while(configure.length<old.length)configure.push('');assert.deepEqual(cn.rows.get('LegacyConfigure'),configure);
 const s=table(prior.get('InstallExecuteSequence.idt')),sn=table(next.get('InstallExecuteSequence.idt'));assert.deepEqual(changedRows(s,sn),['LegacyConfigure']);assert.deepEqual(sn.rows.get('LegacyConfigure'),['LegacyConfigure','1','999']);
 return {tables:['Binary','CustomAction','InstallExecuteSequence'],newBinarySha256:digest(guard)};
}
async function exportsAt(shell,file,directory){
 await mkdir(directory);
 await shell("$e=New-Object -ComObject WindowsInstaller.Installer;$db=$e.OpenDatabase($arg.file,0);$v=$db.OpenView('SELECT Name FROM _Tables');$v.Execute();$names=@();while($null -ne ($r=$v.Fetch())){$names+=$r.StringData(1)};foreach($name in $names){$db.Export($name,$arg.directory,($name+'.idt'))};@{tables=$names}|ConvertTo-Json -Compress",{file,directory});
 const result=new Map();for(const item of await readdir(directory,{recursive:true,withFileTypes:true}))if(item.isFile()){const absolute=path.join(item.parentPath,item.name);result.set(path.relative(directory,absolute).replaceAll('\\','/'),await readFile(absolute));}return result;
}
export async function buildLegacyMsiPatch({old,guard,wix,work,msi,shell,capture,generation}){
 requireIsolatedDesktop();assert.equal(process.platform,'win32');assert.ok(['0.1.0','0.2.0'].includes(old.version));assert.equal(old.scope,'machine');assert.match(generation,/^[a-f0-9]{32}$/);
 assert.equal(digest(await readFile(old.file)),old.sha256);const guardBytes=await readFile(guard);assert.ok(guardBytes.length>0);
 await mkdir(work,{recursive:true});const target=path.join(work,'target'),updated=path.join(work,'updated');await mkdir(target);
 const extraction=await msi('legacy-patch-'+old.version+'-extract',['/a',old.file,'TARGETDIR='+target]);assert.ok(extraction.terminal&&[0,3010].includes(extraction.code));assert.equal(digest(await readFile(old.file)),old.sha256);
 await cp(target,updated,{recursive:true});const baseline=path.join(target,path.basename(old.file)),candidate=path.join(updated,path.basename(old.file));
 const code=packageGuid('machine',digest('legacy-patch:'+old.sha256+digest(guardBytes)+generation));
 const q=name=>'\x60'+name+'\x60';const queries=[
 'UPDATE '+q('CustomAction')+' SET '+q('Source')+"='LegacyRecovery', "+q('Target')+"='LegacyPreflight' WHERE "+q('Action')+"='Preflight'",
 'INSERT INTO '+q('CustomAction')+' ('+['Action','Type','Source','Target'].map(q).join(',')+") VALUES ('LegacyConfigure',1,'LegacyRecovery','LegacyConfigure')",
 'INSERT INTO '+q('InstallExecuteSequence')+' ('+['Action','Condition','Sequence'].map(q).join(',')+") VALUES ('LegacyConfigure','1',999)"];
 const binaryQuery='INSERT INTO '+q('Binary')+' ('+q('Name')+','+q('Data')+') VALUES (?,?)';
 await shell("$e=New-Object -ComObject WindowsInstaller.Installer;$db=$e.OpenDatabase($arg.file,1);$v=$db.OpenView($arg.binaryQuery);$r=$e.CreateRecord(2);$r.StringData(1)='LegacyRecovery';$r.SetStream(2,$arg.guard);$v.Execute($r);foreach($sql in $arg.queries){$v=$db.OpenView($sql);$v.Execute()};$db.Commit();$s=$db.SummaryInformation(1);$s.Property(9)=$arg.packageCode;$s.Persist();@{updated=$true}|ConvertTo-Json -Compress",{file:candidate,guard,binaryQuery,queries,packageCode:packageGuid('machine',digest('legacy-transform:'+code))});
 const prior=await exportsAt(shell,baseline,path.join(work,'prior-tables')),next=await exportsAt(shell,candidate,path.join(work,'next-tables'));
 const delta=verifyLegacyPatchTables(prior,next,guardBytes);
 const transform=path.join(work,'diff.wixmst');await capture(path.join(wix,'torch.exe'),['-nologo','-a','-p','-xo','-val','g','-val','l','-val','r','-val','u','-val','x','-x',path.join(work,'streams'),baseline,candidate,'-out',transform]);
 // Published inputs have no WiX section IDs. All is bounded by the exhaustive
 // native table/stream comparison above, rather than an unfiltered source diff.
 const source=path.join(work,'patch.wxs');
 await writeFile(source,'<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi"><Patch Id="'+code+'" AllowRemoval="yes" Manufacturer="ShruggieTech" DisplayName="Local Media Gallery '+xml(old.version)+' legacy maintenance repair" Description="Verified legacy maintenance guard" Classification="Hotfix"><Media Id="5000" Cabinet="legacy.cab"><PatchBaseline Id="Legacy"/></Media><PatchFamily Id="LegacyMaintenanceGuard" ProductCode="'+xml(old.productCode)+'" Version="'+productVersion+'.0" Supersede="yes"><All/></PatchFamily></Patch></Wix>');
 await capture(path.join(wix,'candle.exe'),['-nologo',source,'-out',path.join(work,'patch.wixobj')]);await capture(path.join(wix,'light.exe'),['-nologo',path.join(work,'patch.wixobj'),'-out',path.join(work,'patch.wixmsp')]);
 const file=path.join(work,'legacy-'+old.version+'-machine.msp');await capture(path.join(wix,'pyro.exe'),['-nologo',path.join(work,'patch.wixmsp'),'-out',file,'-t','Legacy',transform]);
 assert.equal(digest(await readFile(guard)),digest(guardBytes));assert.equal(digest(await readFile(old.file)),old.sha256);const bytes=await readFile(file);
 return {version:old.version,scope:old.scope,productCode:old.productCode,packageCode:old.packageCode,patchCode:code,path:file,bytes:String(bytes.length),sha256:digest(bytes),guardSha256:digest(guardBytes),delta};
}
