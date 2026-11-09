// SPDX-License-Identifier: Apache-2.0
// Metadata-only native feasibility experiment; never a product recovery artifact.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import path from 'node:path';
import {root,execute,python} from './run.mjs';
import {digest} from './windows-packages.mjs';
export async function buildDiagnosticPatch({old,work,msi,shell,capture,download}){
 const pins=JSON.parse(await readFile(path.join(root,'packaging/windows/inputs.json'))).wix;
 const zip=path.join(work,'wix.zip');await writeFile(zip,await download(pins.url,pins.sha256,pins.bytes));
 const wix=path.join(work,'wix');await execute(python,[path.join(root,'scripts/extract-build-input.py'),zip,wix]);
 const target=path.join(work,'patch-target'),updated=path.join(work,'patch-updated');await mkdir(target);
 const extraction=await msi('patch-target-extraction',['/a',old.file,'TARGETDIR='+target]);assert.ok(extraction.terminal&&[0,3010].includes(extraction.code));assert.equal(digest(await readFile(old.file)),old.msiSha256);
 await cp(target,updated,{recursive:true});const targetMsi=path.join(target,path.basename(old.file)),updatedMsi=path.join(updated,path.basename(old.file));
 await shell("$e=New-Object -ComObject WindowsInstaller.Installer;$db=$e.OpenDatabase($arg.file,1);$v=$db.OpenView(\"INSERT INTO Property (Property,Value) VALUES ('ARPCOMMENTS','S037 isolated metadata patch prototype')\");$v.Execute();$db.Commit();$s=$db.SummaryInformation(1);$s.Property(9)=([guid]::NewGuid().ToString('B').ToUpper());$s.Persist();@{updated=$true}|ConvertTo-Json -Compress",{file:updatedMsi});
 const transform=path.join(work,'diff.wixmst');await capture(path.join(wix,'torch.exe'),['-nologo','-a','-p','-xo','-x',path.join(work,'streams'),targetMsi,updatedMsi,'-out',transform]);
 const source=path.join(work,'patch.wxs');await writeFile(source,'<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi"><Patch AllowRemoval="yes" Manufacturer="ShruggieTech" DisplayName="S037 isolated metadata prototype" Description="Isolated metadata prototype" Classification="Update"><Media Id="5000" Cabinet="RTM.cab"><PatchBaseline Id="RTM"/></Media><PatchFamily Id="S037Prototype" Version="1.0.0.0" Supersede="yes"><All/></PatchFamily></Patch></Wix>');
 await capture(path.join(wix,'candle.exe'),['-nologo',source,'-out',path.join(work,'patch.wixobj')]);
 await capture(path.join(wix,'light.exe'),['-nologo',path.join(work,'patch.wixobj'),'-out',path.join(work,'patch.wixmsp')]);
 const patch=path.join(work,'prototype.msp');await capture(path.join(wix,'pyro.exe'),['-nologo',path.join(work,'patch.wixmsp'),'-out',patch,'-t','RTM',transform]);
 return {path:patch,sha256:digest(await readFile(patch)),kind:'metadata-only-prototype',acceptance:false};
}
