// SPDX-License-Identifier: Apache-2.0
export function firewallFixture(){
 const runnerPrograms=['Listener','Worker'].map((name,i)=>({name:'Runner.'+name+'.exe',path:'C:\\actions-runner\\bin\\Runner.'+name+'.exe',sha256:'a'.repeat(64),pids:[10+i]}));
 const dnsProgram='C:\\Windows\\System32\\svchost.exe',dnsServers=['168.63.129.16'];
 const ownedGroup='LMG-S025-offline-123-00000000-0000-0000-0000-000000000000';
 const rule={group:ownedGroup,enabled:'True',action:'Allow',direction:'Outbound',profiles:'Any',remoteAddress:['Any'],service:'Any'};
 const record={ownedGroup,policy:'default-outbound-block-with-actions-control-plane-only',service:'Running',workspace:'D:\\a\\gallery\\gallery',profiles:['Domain','Private','Public'].map(Name=>({Name,Enabled:'True',DefaultOutboundAction:'Block'})),runnerPrograms,dnsServers,dnsProgram,protectedPrograms:['D:\\node\\node.exe','C:\\Program Files\\PowerShell\\7\\pwsh.exe','C:\\Windows\\System32\\msiexec.exe','D:\\a\\gallery\\gallery\\full.exe','D:\\a\\gallery\\gallery\\replacement.exe'],rules:[...runnerPrograms.map((p,i)=>({...rule,name:ownedGroup+'-runner-'+i,program:p.path,protocol:'TCP',remotePort:['443']})),...['TCP','UDP'].map(protocol=>({...rule,name:ownedGroup+'-dns-'+protocol,program:dnsProgram,service:'Dnscache',protocol,remotePort:['53'],remoteAddress:dnsServers}))],externalProbe:{result:'blocked',baseline:'reachable',probes:[{kind:'curl',program:'C:\\Windows\\System32\\curl.exe',code:28,killed:false},{kind:'node',program:'D:\\node\\node.exe',code:2,killed:false}]}};
 return record;
}
