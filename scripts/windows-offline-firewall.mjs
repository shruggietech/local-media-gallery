// SPDX-License-Identifier: Apache-2.0
// Isolated CI desktop only. Preserve the Actions control plane, never recipient networking.
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile,readdir,rename,lstat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {isIP} from 'node:net';

export const snapshotWindowsOfflineFirewall=String.raw`
if(@(Get-NetFirewallRule -PolicyStore PersistentStore | Where-Object {$_.Name -in $arg.ownedRuleNames -or $_.Group -eq $arg.ownedGroup}).Count -ne 0){throw 'Firewall campaign identity collision'}
$profiles=@(Get-NetFirewallProfile | Select-Object Name,@{n='Enabled';e={[string]$_.Enabled}},@{n='DefaultOutboundAction';e={[string]$_.DefaultOutboundAction}})
$rules=@(Get-NetFirewallRule -PolicyStore ActiveStore -Direction Outbound -Enabled True -Action Allow)
$localNames=@(Get-NetFirewallRule -PolicyStore PersistentStore -Direction Outbound -Enabled True -Action Allow | ForEach-Object Name)
foreach($r in $rules){if($r.Name -notin $localNames){throw 'Cannot temporarily isolate a non-local outbound allow rule'}}
$programs=@()
foreach($name in @('Runner.Listener.exe','Runner.Worker.exe')){
 $processes=@(Get-CimInstance Win32_Process -Filter "Name='$name'")
 if($processes.Count -eq 0){throw "Active Actions control-plane executable absent: $name"}
 $paths=@($processes.ExecutablePath | Sort-Object -Unique)
 if($paths.Count -ne 1 -or -not [IO.Path]::IsPathFullyQualified($paths[0])){throw 'Ambiguous active Actions control-plane executable'}
 $file=Get-Item -LiteralPath $paths[0]
 if($file.Name -ne $name -or $file.Directory.Name -ne 'bin'){throw 'Unexpected Actions executable identity'}
 if($file.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Redirected Actions executable path'}
 for($ancestor=$file.Directory;$null -ne $ancestor;$ancestor=$ancestor.Parent){if($ancestor.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Redirected Actions executable ancestor'}}
 if($file.FullName.StartsWith([IO.Path]::GetFullPath($arg.workspace).TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Actions exception overlaps recipient workspace'}
 $programs+=@{name=$name;path=$file.FullName;sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant();pids=@($processes.ProcessId)}
}
$dns=@(Get-DnsClientServerAddress | ForEach-Object ServerAddresses | Where-Object {$_} | Sort-Object -Unique)
if($dns.Count -eq 0){throw 'Configured DNS servers absent'}
@{profiles=$profiles;disabledRuleNames=@($rules | ForEach-Object Name);runnerPrograms=$programs;dnsServers=$dns;dnsProgram=(Join-Path $env:SystemRoot 'System32\svchost.exe');workspace=[IO.Path]::GetFullPath($arg.workspace)} | ConvertTo-Json -Depth 8 -Compress
`;

// Build narrow allowances before changing defaults. Explicit Block Any would override
// these allowances and disconnect Runner.Worker, losing both job and failure evidence.
export const applyWindowsOfflineFirewall=String.raw`
if(@(Get-NetFirewallRule -PolicyStore PersistentStore | Where-Object Name -in $arg.ownedRuleNames).Count -ne 0){throw 'Owned firewall rule name collision'}
for($i=0;$i -lt $arg.before.runnerPrograms.Count;$i++){
 $program=$arg.before.runnerPrograms[$i]
 $active=@(Get-CimInstance Win32_Process | Where-Object {$_.ProcessId -in $program.pids -and $_.ExecutablePath -eq $program.path})
 if($active.Count -ne $program.pids.Count -or (Get-FileHash -LiteralPath $program.path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $program.sha256){throw 'Actions control-plane process changed before admission'}
 New-NetFirewallRule -Name $arg.ownedRuleNames[$i] -DisplayName $arg.ownedRuleNames[$i] -Group $arg.ownedGroup -Direction Outbound -Action Allow -Profile Any -Enabled True -Program $program.path -Protocol TCP -RemotePort 443 | Out-Null
}
for($i=0;$i -lt 2;$i++){
 $protocol=@('TCP','UDP')[$i]
 New-NetFirewallRule -Name $arg.ownedRuleNames[$i+2] -DisplayName $arg.ownedRuleNames[$i+2] -Group $arg.ownedGroup -Direction Outbound -Action Allow -Profile Any -Enabled True -Program $arg.before.dnsProgram -Service Dnscache -Protocol $protocol -RemotePort 53 -RemoteAddress $arg.before.dnsServers | Out-Null
}
foreach($name in $arg.before.disabledRuleNames){Disable-NetFirewallRule -Name $name -PolicyStore PersistentStore | Out-Null}
Set-NetFirewallProfile -Profile Domain,Private,Public -Enabled True -DefaultOutboundAction Block
@{applied=$true}|ConvertTo-Json -Compress
`;

export const readWindowsOfflineFirewall=String.raw`
$rules=@(Get-NetFirewallRule -PolicyStore ActiveStore -Direction Outbound -Enabled True -Action Allow)
if(@($rules | Where-Object Name -notin $arg.ownedRuleNames).Count -ne 0 -or $rules.Count -ne 4){throw 'Unknown active outbound allowance defeats offline isolation'}
$records=@(foreach($r in $rules){
 $application=$r | Get-NetFirewallApplicationFilter
 $service=$r | Get-NetFirewallServiceFilter
 $port=$r | Get-NetFirewallPortFilter
 $address=$r | Get-NetFirewallAddressFilter
 @{name=$r.Name;group=$r.Group;enabled=[string]$r.Enabled;action=[string]$r.Action;direction=[string]$r.Direction;profiles=[string]$r.Profile;program=$application.Program;service=$service.Service;protocol=[string]$port.Protocol;remotePort=@($port.RemotePort);remoteAddress=@($address.RemoteAddress)}
})
$profiles=@(Get-NetFirewallProfile -PolicyStore ActiveStore | Select-Object Name,@{n='Enabled';e={[string]$_.Enabled}},@{n='DefaultOutboundAction';e={[string]$_.DefaultOutboundAction}})
@{policy='default-outbound-block-with-actions-control-plane-only';ownedGroup=$arg.ownedGroup;profiles=$profiles;rules=$records;runnerPrograms=$arg.before.runnerPrograms;dnsServers=$arg.before.dnsServers;dnsProgram=$arg.before.dnsProgram;workspace=$arg.before.workspace;service=[string](Get-Service MpsSvc).Status;disabledRuleNames=$arg.before.disabledRuleNames}|ConvertTo-Json -Depth 8 -Compress
`;

export const restoreWindowsOfflineFirewall=String.raw`
# Restore defaults first so cleanup cannot strand the hosted runner. Never delete foreign rules.
foreach($p in $arg.before.profiles){Set-NetFirewallProfile -Profile $p.Name -Enabled ([string]$p.Enabled) -DefaultOutboundAction ([string]$p.DefaultOutboundAction)}
foreach($name in $arg.before.disabledRuleNames){Enable-NetFirewallRule -Name $name -PolicyStore PersistentStore | Out-Null}
foreach($name in $arg.ownedRuleNames){Get-NetFirewallRule -Name $name -PolicyStore PersistentStore -ErrorAction SilentlyContinue | Where-Object Group -eq $arg.ownedGroup | Remove-NetFirewallRule}
$profiles=@(Get-NetFirewallProfile | Select-Object Name,@{n='Enabled';e={[string]$_.Enabled}},@{n='DefaultOutboundAction';e={[string]$_.DefaultOutboundAction}})
foreach($p in $arg.before.profiles){$actual=@($profiles | Where-Object Name -eq $p.Name);if($actual.Count -ne 1 -or $actual[0].Enabled -ne $p.Enabled -or $actual[0].DefaultOutboundAction -ne $p.DefaultOutboundAction){throw 'Firewall profile restoration differs'}}
foreach($name in $arg.before.disabledRuleNames){if((Get-NetFirewallRule -Name $name -PolicyStore PersistentStore).Enabled -ne 'True'){throw 'Prior outbound rule was not restored'}}
@{restored=$true;profiles=$profiles;restoredRuleNames=$arg.before.disabledRuleNames;deletedOwnedRuleNames=$arg.ownedRuleNames}|ConvertTo-Json -Depth 6 -Compress
`;

const normal=value=>path.win32.normalize(value).toLowerCase();
export function validateWindowsOfflineFirewall(record){
 assert.equal(record.policy,'default-outbound-block-with-actions-control-plane-only');assert.equal(record.service,'Running');
 assert.deepEqual(record.profiles.map(p=>p.Name).sort(),['Domain','Private','Public']);
 assert.ok(record.profiles.every(p=>p.Enabled==='True'&&p.DefaultOutboundAction==='Block'));
 assert.equal(record.runnerPrograms.length,2);assert.deepEqual(record.runnerPrograms.map(p=>p.name).sort(),['Runner.Listener.exe','Runner.Worker.exe']);
 assert.ok(path.win32.isAbsolute(record.workspace));assert.ok(record.dnsServers.length>0);assert.match(record.dnsProgram,/^[A-Za-z]:\\Windows\\System32\\svchost\.exe$/i);
 const expected=new Map();
 for(const program of record.runnerPrograms){assert.ok(path.win32.isAbsolute(program.path));assert.equal(path.win32.basename(program.path),program.name);assert.equal(path.win32.basename(path.win32.dirname(program.path)).toLowerCase(),'bin');assert.match(program.sha256,/^[a-f0-9]{64}$/);assert.ok(program.pids.length&&program.pids.every(pid=>Number.isSafeInteger(pid)&&pid>0));assert.ok(!normal(program.path).startsWith(normal(record.workspace).replace(/\\$/,'')+'\\'));expected.set(normal(program.path),program);}
 assert.ok(record.protectedPrograms.length>=5);for(const program of record.protectedPrograms){assert.ok(path.win32.isAbsolute(program));assert.ok(!expected.has(normal(program)),'Recipient program shares a control-plane exception');}
 assert.match(record.ownedGroup,/^LMG-S025-offline-[0-9]+-[0-9a-f-]{36}$/);assert.equal(record.rules.length,4);const seen=new Set(),admitted=new Set(),dnsProtocols=new Set();
 for(const rule of record.rules){assert.equal(rule.group,record.ownedGroup);assert.ok(rule.name.startsWith(record.ownedGroup+'-'));assert.ok(!seen.has(rule.name));seen.add(rule.name);assert.equal(rule.action,'Allow');assert.equal(rule.direction,'Outbound');assert.equal(rule.enabled,'True');assert.equal(rule.profiles,'Any');
  const program=expected.get(normal(rule.program));
  if(program){assert.equal(rule.protocol,'TCP');assert.deepEqual(rule.remotePort,['443']);assert.deepEqual(rule.remoteAddress,['Any']);assert.equal(rule.service,'Any');assert.ok(!admitted.has(program.path));admitted.add(program.path);}
  else{assert.equal(normal(rule.program),normal(record.dnsProgram));assert.equal(rule.service,'Dnscache');assert.ok(['TCP','UDP'].includes(rule.protocol));assert.deepEqual(rule.remotePort,['53']);assert.deepEqual([...rule.remoteAddress].sort(),[...record.dnsServers].sort());assert.ok(!dnsProtocols.has(rule.protocol));dnsProtocols.add(rule.protocol);}
 }
 assert.ok([...expected.values()].every(p=>admitted.has(p.path)));assert.equal(dnsProtocols.size,2);
 assert.equal(record.externalProbe?.result,'blocked');assert.equal(record.externalProbe?.baseline,'reachable');assert.ok(record.externalProbe.probes.length>=2);assert.deepEqual(record.externalProbe.probes.map(p=>p.kind).sort(),['curl','node']);for(const probe of record.externalProbe.probes){assert.ok(Number.isInteger(probe.code)&&probe.code!==0);assert.ok(!probe.killed,'Probe must terminate under its own network deadline');assert.ok(!expected.has(normal(probe.program)),'Recipient probe must not use a control-plane exception');}
 return true;
}

export function validateWindowsOfflineIntent(args,{workspace}={}){
 assert.equal(args.kind,'local-media-gallery-windows-offline-policy-intent');assert.equal(args.formatVersion,1);
 assert.match(args.ownedGroup,/^LMG-S025-offline-[0-9]+-[0-9a-f-]{36}$/);
 assert.deepEqual(args.ownedRuleNames,['listener','worker','dns-tcp','dns-udp'].map(s=>args.ownedGroup+'-'+s));
 assert.ok(path.win32.isAbsolute(args.before.workspace));if(workspace)assert.equal(normal(args.before.workspace).replace(/\\$/,''),normal(workspace).replace(/\\$/,''));
 assert.deepEqual(args.before.profiles.map(p=>p.Name).sort(),['Domain','Private','Public']);
 for(const p of args.before.profiles){assert.ok(['True','False','NotConfigured'].includes(p.Enabled));assert.ok(['Allow','Block','NotConfigured'].includes(p.DefaultOutboundAction));}
 assert.ok(Array.isArray(args.before.disabledRuleNames)&&args.before.disabledRuleNames.every(n=>typeof n==='string'&&n.length>0&&!args.ownedRuleNames.includes(n)));assert.equal(new Set(args.before.disabledRuleNames).size,args.before.disabledRuleNames.length);
 assert.ok(args.before.dnsServers.length&&args.before.dnsServers.every(ip=>isIP(ip)));assert.equal(args.before.runnerPrograms.length,2);
 return true;
}
export async function restoreWindowsOfflineIntent(intent,{invoke,workspace}={}){
 const stat=await lstat(intent);assert.ok(stat.isFile()&&!stat.isSymbolicLink());
 const args=JSON.parse(await readFile(intent,'utf8'));validateWindowsOfflineIntent(args,{workspace});
 const command="[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);$ErrorActionPreference='Stop';$arg=ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('"+Buffer.from(JSON.stringify(args)).toString('base64')+"')));"+restoreWindowsOfflineFirewall;
 const run=invoke??(async command=>{const pending=promisify(execFile)('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,shell:false,timeout:180000,maxBuffer:8*1024*1024});pending.child.stdin.end();return JSON.parse((await pending).stdout);});
 const restored=await run(command);assert.equal(restored.restored,true);
 await writeFile(path.join(path.dirname(intent),'single-file-offline-restored.log'),JSON.stringify(restored,null,2)+'\n');
 await rename(intent,path.join(path.dirname(intent),'single-file-offline-restoration-restored.json'));
 return restored;
}
export async function restoreWindowsOfflineCampaigns(root,{invoke}={}){
 let entries;try{entries=await readdir(path.join(root,'.local'),{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return[];throw error;}
 const restored=[],failures=[];
 for(const entry of entries.filter(e=>e.isDirectory()&&!e.isSymbolicLink()&&/^windows-package-test-/.test(e.name))){
  const intent=path.join(root,'.local',entry.name,'single-file-offline-restoration.json');
  try{restored.push(await restoreWindowsOfflineIntent(intent,{invoke,workspace:root}));}catch(error){if(error.code!=='ENOENT')failures.push(entry.name+': '+error.message);}
 }
 assert.equal(failures.length,0,failures.join('; '));return restored;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv[2],'--restore');assert.equal(process.platform,'win32');assert.equal(process.env.GALLERY_ISOLATED_DESKTOP,'1','CI desktop isolation required');
 const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));console.log(JSON.stringify(await restoreWindowsOfflineCampaigns(root)));
}
