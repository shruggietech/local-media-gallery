<#
.SYNOPSIS
    Launch the ordinary MSI UI with a disposable administrator's genuine limited token.
.DESCRIPTION
    Isolated hosted fixture only. Uses the existing credentialed-process launch
    pattern, loads the account profile and verifies both launcher and actual MSI
    token before driving UI. Passwords stay in memory. No client-OS or attended
    consent-prompt qualification is implied.
#>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$MsiFile,[Parameter(Mandatory=$true)][string]$LogPath,[switch]$Child)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:GALLERY_ISOLATED_DESKTOP -ne '1') { throw 'Limited-token MSI input requires isolated CI' }
if (![IO.Path]::IsPathFullyQualified($MsiFile) -or ![IO.Path]::IsPathFullyQualified($LogPath) -or $MsiFile.Contains('"') -or $LogPath.Contains('"')) { throw 'Absolute unquoted MSI/log paths required' }
if($Child) {
    Add-Type @'
using System;using System.ComponentModel;using System.Diagnostics;using System.Runtime.InteropServices;using System.Security.Principal;
public static class GalleryLimitedClient {
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool OpenProcessToken(IntPtr process,uint access,out IntPtr token);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool GetTokenInformation(IntPtr token,int kind,IntPtr value,int bytes,out int needed);
 static int Value(IntPtr token,int kind) {IntPtr p=Marshal.AllocHGlobal(4);try{int n;if(!GetTokenInformation(token,kind,p,4,out n))throw new Win32Exception(Marshal.GetLastWin32Error(),"GetTokenInformation");return Marshal.ReadInt32(p);}finally{Marshal.FreeHGlobal(p);}}
 public static void Check(Process process) {IntPtr token=IntPtr.Zero;try{if(!OpenProcessToken(process.Handle,8,out token))throw new Win32Exception(Marshal.GetLastWin32Error(),"OpenProcessToken");if(Value(token,18)!=3||Value(token,20)!=0)throw new Exception("Actual linked limited token required; type="+Value(token,18)+", elevated="+Value(token,20));using(var user=new WindowsIdentity(token)){if(new WindowsPrincipal(user).IsInRole(WindowsBuiltInRole.Administrator))throw new Exception("Client is an effective administrator");}}finally{if(token!=IntPtr.Zero)CloseHandle(token);}}
}
'@
    [GalleryLimitedClient]::Check([Diagnostics.Process]::GetCurrentProcess())
    $start=[Diagnostics.ProcessStartInfo]::new();$start.FileName=Join-Path $env:SystemRoot 'System32\msiexec.exe';$start.WorkingDirectory=[IO.Path]::GetDirectoryName($MsiFile)
    $start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
    foreach($argument in @('/i',$MsiFile,'/norestart','/L*v',$LogPath)){$start.ArgumentList.Add($argument)}
    $client=[Diagnostics.Process]::new();$client.StartInfo=$start
    [void]$client.Start();$client.StandardInput.Close();$output=$client.StandardOutput.ReadToEndAsync();$errors=$client.StandardError.ReadToEndAsync()
    [GalleryLimitedClient]::Check($client)
    @{kind='actual-credentialed-limited-msi-client';pid=$client.Id;launcherTokenType=3;clientTokenType=3;clientElevated=$false;sameAccount=$true}|ConvertTo-Json -Compress
    if(!$client.WaitForExit(300000)){throw 'Incomplete limited-token MSI client; account/context must remain retained'}
    [Console]::Error.Write($errors.GetAwaiter().GetResult())
    exit $client.ExitCode
}
$account='lmgui'+[Guid]::NewGuid().ToString('N').Substring(0,10)
$password=ConvertTo-SecureString ([Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(30))+'Aa9!') -AsPlainText -Force
$created=$false;$terminal=$false
try {
    $user=New-LocalUser -Name $account -Password $password -AccountNeverExpires -PasswordNeverExpires -Description 'Disposable isolated MSI upgrade client'
    $created=$true
    Add-LocalGroupMember -Group (Get-LocalGroup -SID 'S-1-5-32-544').Name -Member $account
    Add-LocalGroupMember -Group (Get-LocalGroup -SID 'S-1-5-32-545').Name -Member $account
    $directory=[IO.Path]::GetDirectoryName($MsiFile)
    $acl=Get-Acl -LiteralPath $directory
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($user.SID,'Modify','ContainerInherit,ObjectInherit','None','Allow'))
    Set-Acl -LiteralPath $directory -AclObject $acl
    $script=Join-Path $directory 'limited-client.ps1';Copy-Item -LiteralPath $PSCommandPath -Destination $script
    $start=[Diagnostics.ProcessStartInfo]::new();$start.FileName=Join-Path $PSHOME 'pwsh.exe';$start.WorkingDirectory=$directory
    $start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.WindowStyle=[Diagnostics.ProcessWindowStyle]::Hidden;$start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
    $start.UserName=$account;$start.Domain=$env:COMPUTERNAME;$start.Password=$password;$start.LoadUserProfile=$true
    foreach($argument in @('-NoProfile','-NonInteractive','-File',$script,'-MsiFile',$MsiFile,'-LogPath',$LogPath,'-Child')){$start.ArgumentList.Add($argument)}
    $client=[Diagnostics.Process]::new();$client.StartInfo=$start
    [void]$client.Start();$client.StandardInput.Close();$output=$client.StandardOutput.ReadToEndAsync();$errors=$client.StandardError.ReadToEndAsync()
    if(!$client.WaitForExit(320000)){throw 'Incomplete credentialed launcher; retain account/context'}
    [Console]::Out.Write($output.GetAwaiter().GetResult());[Console]::Error.Write($errors.GetAwaiter().GetResult())
    $terminal=$true
    exit $client.ExitCode
} finally {if($created -and $terminal){Remove-LocalUser -Name $account}}
