// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {msiCommandArguments,verifyMissingPackageOutcome,verifyMsiCommandReadiness} from '../scripts/windows-msi-command.mjs';
test('Native MSI switches remain bare while paths and property values use their own grammar',()=>{
 const args=msiCommandArguments(['/i','C:/source package 雪.msi','/qn','/norestart','/L*v','C:/logs/native command.log','ALLUSERS=1','LMG_PATH=','INSTALLDIR=C:/chosen folder 雪','LMG_STARTMENU=1']);
 assert.deepEqual(args,['/i','"C:/source package 雪.msi"','/qn','/norestart','/L*v','"C:/logs/native command.log"','ALLUSERS="1"','LMG_PATH=""','INSTALLDIR="C:/chosen folder 雪"','LMG_STARTMENU="1"']);
});
test('Source and log operands containing equals cannot become public properties',()=>{
 assert.deepEqual(msiCommandArguments(['/i','relative=package.msi','/L*v','native=log.txt','VALUE=left=right']),['/i','"relative=package.msi"','/L*v','"native=log.txt"','VALUE="left=right"']);
 const product='{6EC08037-6FA8-4AF3-916B-40D03DE0DAF9}';assert.deepEqual(msiCommandArguments(['/x',product,'/qn']),['/x',product,'/qn']);
});
test('Embedded property whitespace is preserved and malformed raw arguments are rejected',()=>{
 assert.deepEqual(msiCommandArguments(['PROP=a b  c','NEXT=']),['PROP="a b  c"','NEXT=""']);
 for(const bad of ['bad"value','bad\nvalue','bad\rvalue','bad\0value',42])assert.throws(()=>msiCommandArguments(['/i',bad]));
 assert.deepEqual(msiCommandArguments(['']),['""']);assert.throws(()=>msiCommandArguments('not an argument array'));
});
test('Native readiness requires actual missing-package exit and logging, never timeout or silent success',()=>{
 const good={code:1619,killed:false,signal:null},log=Buffer.from('native verbose log');assert.doesNotThrow(()=>verifyMissingPackageOutcome(good,log));
 for(const error of [null,{...good,code:0},{...good,code:1639},{...good,killed:true},{...good,signal:'SIGTERM'},{code:1619}])assert.throws(()=>verifyMissingPackageOutcome(error,log));
 assert.throws(()=>verifyMissingPackageOutcome(good,Buffer.alloc(0)));
});
test('Native readiness refuses the active workstation before creating or invoking anything',async()=>{
 await assert.rejects(verifyMsiCommandReadiness({root:'not-a-workspace',env:{GITHUB_ACTIONS:'false',GALLERY_ISOLATED_DESKTOP:'0'}}),/explicitly isolated CI desktop/);
});
