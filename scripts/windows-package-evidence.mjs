import {decodeDependencyNotices,validateWindowsDiagnosticReadiness} from './windows-package-fixtures.mjs';
import {validateWindowsOfflineFirewall} from './windows-offline-firewall.mjs';
import {validatePreparedRecipient} from './prepared-recipients.mjs';
// SPDX-License-Identifier: Apache-2.0
import {validateUpdateEvidence} from './update-packages.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {digest,validatePayload} from './windows-packages.mjs';
export function validateSingleFileWindows(build,result){
 assert.equal(build.products.length,2);assert.deepEqual([...build.products.map(p=>p.edition)].sort(),['full','lite']);
 const direct=result.singleFile;assert.equal(direct.result,'pass');assert.equal(direct.products.length,2);
 for(const product of direct.products){const expected=build.products.find(p=>p.edition===product.edition);assert.deepEqual(product.artifact,expected.artifact);assert.equal(expected.artifact.format,product.edition==='full'&&(build.records?.[0]?.payload.version??'0.2.0')!=='0.2.0'?'msi':'exe');assert.equal(expected.artifact.files.length,1);assert.deepEqual(product.recipientFiles,[expected.artifact.binary]);}
 assert.equal(direct.offline.result,'pass');assert.deepEqual(direct.offline.absent.executables,[]);assert.ok(direct.offline.absent.registration.every(r=>!r.version||r.version==='0.0.0.0'));validateWindowsOfflineFirewall(direct.offline.firewall);validateWindowsOfflineFirewall(direct.offline.firewall.final); assert.equal(direct.offline.install.scope,'machine');assert.equal(direct.offline.install.runtimeAfter.scope,'machine');assert.ok([0,3010].includes(direct.offline.install.exitCode??direct.offline.install.runtimeBootstrapperExit));assert.equal(direct.offline.removed.operation,'remove');
 assert.equal(direct.publishedPredecessor.result,'pass');assert.equal(direct.publishedPredecessor.version,'0.1.0');if(direct.publishedPredecessor.kind==='native-msi'){assert.ok([0,3010].includes(direct.publishedPredecessor.upgrade.exitCode));assert.equal(direct.publishedPredecessor.rollback.version,'0.1.0');}else{assert.equal(direct.publishedPredecessor.upgrade.status,'complete');assert.equal(direct.publishedPredecessor.rollback.status,'restored');}
 assert.equal(direct.features.result,'pass');assert.equal(direct.features.helperSha256,build.featureHelper.sha256);assert.equal(direct.features.job.completed,'1');assert.equal(direct.features.job.failed,'0');
 assert.equal(direct.maintenance.result,'pass');if(direct.maintenance.kind==='native-msi'){assert.equal(direct.maintenance.update.package,build.ordinaryMaintenance.nextPackageCode);assert.equal(direct.maintenance.repair.package,build.ordinaryMaintenance.nextPackageCode);assert.equal(direct.maintenance.rollback.package,build.ordinaryMaintenance.priorPackageCode);for(const operation of ['update','repair','rollback'])assert.ok([0,3010].includes(direct.maintenance[operation].exitCode));}else{assert.equal(direct.maintenance.update.status,'complete');assert.equal(direct.maintenance.recovered.status,'already-current');assert.equal(direct.maintenance.rollback.status,'restored');}
 assert.equal(direct.liteMaintenance.result,'pass');assert.equal(direct.liteMaintenance.replace.status,'complete');assert.equal(direct.liteMaintenance.recover.status,'already-current');assert.equal(direct.liteMaintenance.rollback.status,'restored');
 for(const label of ['single-file-lite-in-place','single-file-lite-relocated'])assert.ok(direct.native.some(n=>n.label===label));
 return true;
}

export async function validateOrdinaryUpgrade(build,evidence,root){
 const legacy=evidence.predecessor.version==='0.2.0';assert.ok(legacy||evidence.predecessor.version==='0.2.1');
 assert.equal(evidence.kind,legacy?'published-legacy-ordinary-msi-upgrade':'published-ordinary-msi-upgrade');assert.equal(evidence.result,'pass');assert.deepEqual(evidence.source,build.source);assert.equal(evidence.revision,build.revision);
 const prior=(build.ordinaryPredecessors??build.publishedPredecessors).find(p=>p.version===evidence.predecessor.version),artifact=build.products.find(p=>p.edition==='full').artifact;assert.ok(prior);
 assert.deepEqual(evidence.artifact,artifact);assert.deepEqual(evidence.predecessor.msi,prior.msi);assert.deepEqual(evidence.predecessor.payload,prior.payload);assert.equal(evidence.predecessor.registered.version,prior.version);
 assert.deepEqual(evidence.before,evidence.after);assert.ok(evidence.before.foreignSha256);assert.ok(evidence.before.gallery.length);assert.equal(evidence.removed.operation,'remove');assert.ok([0,3010].includes(evidence.removed.exitCode));
 assert.equal(evidence.observed.registered.package.toUpperCase(),build.bundle.packages.find(p=>p.scope==='machine').packageCode);assert.equal(evidence.expected.scope,'machine');
 for(const [field,cancel] of [['cancelled',true],['refused',false],['upgraded',false]]){
  const operation=evidence[field];assert.equal(operation.kind,'ordinary-full-ui-msi-upgrade');assert.equal(operation.clientToken,'limited');assert.equal(operation.token.clientTokenType,3);assert.equal(operation.token.launcherTokenType,3);assert.equal(operation.token.clientElevated,false);assert.equal(operation.token.sameAccount,true);assert.equal(operation.token.station,'WinSta0');assert.equal(operation.token.desktop,'Default');
  assert.deepEqual(operation.expected,evidence.expected);assert.deepEqual(operation.msi,{bytes:artifact.bytes,sha256:artifact.sha256});assert.equal(operation.cancelAt,cancel?'license':null);assert.ok(cancel?operation.exitCode===1602:field==='refused'?operation.exitCode===1603:[0,3010].includes(operation.exitCode));assert.equal(operation.reported267,false);if(field==='refused')assert.ok(operation.failureDialog);else assert.equal(operation.failureDialog,null);
  assert.equal(operation.fixture.nativeClientTerminal,true);assert.equal(operation.fixture.policy.alwaysInstallElevated,false);assert.equal(operation.fixture.policy.restored,true);assert.deepEqual(operation.fixture.policy.during,{DisableMsi:0,ConsentPromptBehaviorAdmin:0});assert.ok(operation.fixture.private.before.length>=2);assert.deepEqual(operation.fixture.private.before,operation.fixture.private.after);
  const bytes=await readFile(path.join(root,operation.log.path));assert.equal(digest(bytes),operation.log.sha256);assert.equal(String(bytes.length),operation.log.bytes);
  const text=bytes.toString(bytes[0]===255?'utf16le':'utf8');assert.match(operation.token.sid,/^S-1-5-21-/);
  if(legacy){
   const child=/authorized legacy upgrade child ([1-9][0-9]*); source ([a-f0-9]{64})/.exec(text);assert.ok(child);assert.equal(child[2],artifact.sha256);assert.match(text,new RegExp('authorized legacy upgrade terminal exit '+operation.exitCode+';'));assert.doesNotMatch(text,/Doing action: InstallInitialize/);
   const actor=operation.fixture.authorizedClient;assert.equal(actor.pid,Number(child[1]));assert.equal(actor.sid,operation.token.sid);assert.equal(actor.tokenType,2);assert.equal(actor.elevated,true);assert.equal(actor.sourceSha256,artifact.sha256);assert.ok(Date.parse(actor.observedAt)>=Date.parse(operation.started)&&Date.parse(actor.observedAt)<=Date.parse(operation.terminalFinished));assert.ok(operation.observations.some(o=>o.windows.some(w=>w.processId===actor.pid)),'Wizard belongs to the authorized same-user elevated native child');
  }else{
   assert.equal(operation.fixture.authorizedClient,null);assert.doesNotMatch(text,/authorized legacy upgrade child/);assert.ok(Number.isInteger(operation.token.pid)&&operation.token.pid>0);assert.equal(operation.fixture.private.nativeClientPid,operation.token.pid);assert.equal(operation.fixture.private.nativeExitCode,operation.exitCode);assert.ok(operation.observations.some(o=>o.windows.some(w=>w.processId===operation.token.pid)),'Modern wizard belongs to the actual initiating limited MSI client');
   if(field==='upgraded'){assert.match(text,/Doing action: InstallInitialize/);assert.match(text,/Doing action: InstallFinalize/);}
  }
  for(const screen of operation.screens){const bytes=await readFile(path.join(root,screen.path));assert.equal(digest(bytes),screen.sha256);assert.equal(String(bytes.length),screen.bytes);assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));}
  if(!cancel){for(const label of ['scope','options','terminal'])assert.ok(operation.screens.some(s=>s.label===label));}
 }
 return true;
}

export async function validateOrdinaryUpgrades(build,result,root){
 // Read accepted historical receipts using their original singular contract.
 if(build.records[0].payload.version==='0.2.1')return validateOrdinaryUpgrade(build,result.ordinaryUpgrade,root);
 assert.deepEqual(build.ordinaryPredecessors.map(p=>p.version),['0.2.0','0.2.1']);
 assert.deepEqual(result.ordinaryUpgrades.map(p=>p.predecessor.version),['0.2.0','0.2.1']);assert.deepEqual(result.ordinaryUpgrade,result.ordinaryUpgrades[0]);
 const pkg=build.bundle.packages.find(p=>p.scope==='machine');
 for(const row of result.ordinaryUpgrades){
  await validateOrdinaryUpgrade(build,row,root);const prior=build.ordinaryPredecessors.find(p=>p.version===row.predecessor.version);
  assert.equal(row.predecessor.registered.product,prior.msi.productCode);assert.equal(row.predecessor.registered.package.toUpperCase(),prior.msi.packageCode);assert.deepEqual(row.cancelledPredecessor,row.predecessor.registered);assert.deepEqual(row.refusedPredecessor,row.predecessor.registered);
  assert.equal(row.observed.registered.product,pkg.productCode);assert.equal(row.observed.registered.version,build.records[0].payload.version);assert.equal(row.observed.integration.product,pkg.productCode);assert.equal(row.observed.integration.package.toUpperCase(),pkg.packageCode);
  const normalize=s=>s.replaceAll('\\','/').replace(/\/$/,'').toLowerCase();assert.equal(normalize(row.observed.registered.location),normalize(row.expected.directory));assert.equal(row.expected.startMenu,true);assert.equal(row.expected.commandPath,true);assert.equal(normalize(row.observed.shortcut.target),normalize(row.expected.directory)+'/local-media-gallery.exe');assert.ok(row.observed.path.split(';').some(p=>normalize(p)===normalize(row.expected.directory)));
  assert.equal(row.nativeLabel,'ordinary-'+prior.version+'-upgrade');assert.equal(result.native.filter(n=>n.label===row.nativeLabel&&n.edition==='full').length,1,'Both installed upgrades must launch and render the actual candidate');
 }
 return true;
}

export async function validatePackageEvidence(build,result,root){
 if(!['0.0.0','0.1.0'].includes(build.records[0].payload.version)){
  validateSingleFileWindows(build,result);validateWindowsDiagnosticReadiness(build,result.diagnosticFixtureReadiness);assert.ok(Date.parse(result.diagnosticFixtureReadiness.terminalFinished)<=Date.parse(result.started));
  assert.match(build.directory,/^\.local\/windows-packages-[A-Za-z0-9_-]+$/);
  for(const row of build.records){const bundled=row.noticeBundle;assert.equal(bundled.path,'licenses/dependencies.json');const file=row.payload.files.find(file=>file.path===bundled.path);assert.ok(file);const bytes=await readFile(path.join(root,build.directory,row.edition+'-payload',bundled.path));assert.equal(digest(bytes),file.sha256);assert.equal(String(bytes.length),file.bytes);assert.equal(digest(bytes),bundled.sha256);const notices=decodeDependencyNotices(bytes);assert.equal(notices.files.length,bundled.files);assert.equal(digest(Buffer.from(JSON.stringify(notices.files.map(({text,...record})=>record)))),bundled.inventorySha256);}
  for(const p of build.products){const bytes=await readFile(path.join(root,p.artifact.path));assert.equal(String(bytes.length),p.artifact.bytes);assert.equal(digest(bytes),p.artifact.sha256);}
 }

 if(!['0.0.0','0.1.0'].includes(build.records[0].payload.version)){assert.ok(result.preparedRecipient,'Prepared published recipient evidence required');assert.deepEqual(result.preparedRecipient.source,result.source);assert.equal(result.preparedRecipient.revision,result.revision);await validatePreparedRecipient(result.preparedRecipient,root);}

 assert.equal(result.result,'pass');assert.equal(result.acceptance,true);assert.equal(result.formatVersion,1);assert.deepEqual(result.source,build.source);assert.equal(result.revision,build.revision);assert.ok(new Date(result.terminalFinished)>=new Date(result.started));assert.equal(result.host.platform,'win32');assert.equal(result.host.arch,'x64');
 assert.deepEqual(result.installations.map(i=>i.scope),['user','machine']);for(const label of ['user-full','machine-full','lite-in-place','lite-relocated','lite-explicit'])assert.ok(result.native.some(i=>i.label===label));
 if(build.products?.find(p=>p.edition==='full')?.artifact.format==='msi'){
  await validateOrdinaryUpgrades(build,result,root);
  assert.equal(result.standardUser.policy.during,0);assert.equal(result.standardUser.policy.alwaysInstallElevated,false);assert.equal(result.standardUser.policy.restored,true);
  assert.equal(result.standardUser.result,'pass');assert.equal(result.standardUser.kind,'disposable-standard-user');assert.equal(result.standardUser.installed.administrator,false);assert.equal(result.standardUser.installed.sid,result.standardUser.sid);assert.equal(result.standardUser.installed.registered.startMenu,3);assert.equal(result.standardUser.installed.registered.commandPath,2);assert.equal(result.standardUser.removed.registered,null);assert.equal(result.standardUser.installed.nativeState,5);assert.equal(result.standardUser.removed.nativeState,-1);assert.equal(result.standardUser.installed.shortcutExists,true);assert.equal(result.standardUser.removed.shortcutExists,false);assert.equal(result.standardUser.ownedRemoval.length,result.standardUser.installed.registered.owned.length);assert.ok(result.standardUser.ownedRemoval.every(f=>f.exists===false));assert.deepEqual(result.standardUser.offline.initial.executables,[]);assert.equal(result.standardUser.sha256,build.products.find(p=>p.edition==='full').artifact.sha256);for(const log of result.standardUser.logs)assert.ok((await readFile(path.isAbsolute(log)?log:path.join(root,log))).length>0);
  assert.deepEqual(result.publishedRecovery.map(r=>r.version),['0.1.0','0.2.0']);for(const legacy of result.publishedRecovery){assert.equal(legacy.update.status,'complete');assert.equal(legacy.rollback.status,'restored');assert.equal(legacy.recovered.status,'restored');assert.deepEqual(legacy.before,legacy.after);assert.ok(legacy.adapters.length);assert.match(legacy.outerIdentitySha256,/^[a-f0-9]{64}$/);}
  assert.deepEqual(result.cachedMaintenance.map(c=>c.scope),['user','machine']);for(const cache of result.cachedMaintenance){assert.equal(cache.kind,'registered-product-code-repair-without-recache');assert.equal(cache.manifestSha256,build.bundle.packages.find(p=>p.scope===cache.scope).manifestSha256);assert.ok([0,3010].includes(cache.repair.exitCode));assert.deepEqual(cache.choices,{startMenu:false,commandPath:false});assert.deepEqual(cache.features,{startMenu:2,commandPath:2});assert.equal(cache.observed.shortcut,null);}
  assert.equal(result.installerChoices.length,8);for(const scope of ['user','machine'])for(const [startMenu,commandPath]of [[false,false],[true,false],[false,true],[true,true]])assert.ok(result.installerChoices.some(r=>r.scope===scope&&r.startMenu===startMenu&&r.commandPath===commandPath&&r.features.startMenu===(startMenu?3:2)&&r.features.commandPath===(commandPath?3:2)));
  assert.ok(result.wizardEvidence.some(r=>r.kind==='license-cancel'&&r.exitCode===1602));assert.ok(result.wizardEvidence.some(r=>r.kind==='runtime-cancel'&&r.exitCode===1602&&r.observedPhase&&r.observedVendorPhase));const wizard=result.wizardEvidence.find(r=>r.kind==='install');assert.ok(wizard?.progressObserved);for(const label of ['license','scope','options','application-progress','terminal'])assert.ok(wizard.screens.some(s=>s.label===label));for(const screen of result.wizardEvidence.flatMap(w=>w.screens)){const bytes=await readFile(path.join(root,screen.screenshot));assert.equal(digest(bytes),screen.sha256);assert.equal(String(bytes.length),screen.bytes);}
 }
 assert.equal(result.checks.length,29);assert.ok(result.checks.every(c=>c.result==='pass'&&c.terminalFinished));
 for(const edition of ['full','lite']){
  const record=build.records.find(r=>r.edition===edition);validatePayload(record.payload);assert.deepEqual(record.payload.source,build.source);assert.equal(record.payload.revision,build.revision);assert.deepEqual(result.extracted[edition],record.archive);
  const bytes=await readFile(path.join(root,record.archive.path));assert.equal(digest(bytes),record.archive.sha256);assert.equal(String(bytes.length),record.archive.bytes);
  for(const native of result.native.filter(n=>n.edition===edition&&!n.label.startsWith('single-file-lite'))){assert.equal(native.binarySha256,record.payload.files.find(f=>f.path===record.payload.binary).sha256);assert.ok(native.accessibility.some(n=>n.name==='Open red.png'));assert.ok(native.pixels.red>1500);assert.equal(native.pixels.stride,4);const screenshot=await readFile(path.join(root,native.screenshot));assert.equal(digest(screenshot),native.screenshotSha256);assert.equal(String(screenshot.length),native.screenshotBytes);assert.ok(screenshot.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));if(native.label==='lite-relocated'){assert.ok(native.refreshedPixels.green>1500);const bytes=await readFile(path.join(root,native.refreshScreenshot.path));assert.equal(digest(bytes),native.refreshScreenshot.sha256);assert.equal(String(bytes.length),native.refreshScreenshot.bytes);}}
 }
 for(const install of result.installations){const pkg=build.bundle.packages.find(p=>p.scope===install.scope);assert.equal(install.observed.registered.package.toUpperCase(),pkg.packageCode);assert.equal(install.observed.integration.product,pkg.productCode);assert.equal(install.removed.observed.registered,null);assert.equal(install.removed.observed.integration,null);assert.ok(install.removed.retained.length>0);assert.match(install.installedBytes,/^[1-9][0-9]*$/);}
 assert.equal(build.bundle.bootstrapper.audit.signature.status,'Valid');assert.match(build.bundle.bootstrapper.audit.signature.subject,/Microsoft Corporation/);await validateUpdateEvidence(build,result.updates,root);return true;
}
