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
    # A credentialed .NET launch does not rebuild the inherited environment.
    # Expand shell-folder variables against this loaded profile, not runneradmin.
    $identity=[Security.Principal.WindowsIdentity]::GetCurrent()
    $profile=Get-ItemPropertyValue -LiteralPath ('HKLM:\Software\Microsoft\Windows NT\CurrentVersion\ProfileList\'+$identity.User.Value) -Name ProfileImagePath
    $profile=[Environment]::ExpandEnvironmentVariables($profile)
    $env:USERPROFILE=$profile
    $env:APPDATA=Join-Path $profile 'AppData\Roaming'
    $env:LOCALAPPDATA=Join-Path $profile 'AppData\Local'
    $env:TEMP=Join-Path $env:LOCALAPPDATA 'Temp';$env:TMP=$env:TEMP
    [void][IO.Directory]::CreateDirectory($env:TEMP)
    Add-Type @'
using System;using System.ComponentModel;using System.Diagnostics;using System.Runtime.InteropServices;using System.Security.Principal;
public static class GalleryLimitedClient {
 [DllImport("user32.dll")] static extern IntPtr GetProcessWindowStation();
 [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
 [DllImport("user32.dll")] static extern IntPtr GetThreadDesktop(uint thread);
 [DllImport("user32.dll",SetLastError=true,CharSet=CharSet.Unicode)] static extern bool GetUserObjectInformationW(IntPtr handle,int kind,System.Text.StringBuilder value,int size,out int needed);
 [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
 [DllImport("kernel32.dll")] static extern uint GetCurrentProcessId();
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr OpenProcess(uint access,bool inherit,int pid);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool OpenProcessToken(IntPtr process,uint access,out IntPtr token);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool GetTokenInformation(IntPtr token,int kind,IntPtr value,int bytes,out int needed);
 static int Value(IntPtr token,int kind) {IntPtr p=Marshal.AllocHGlobal(4);try{int n;if(!GetTokenInformation(token,kind,p,4,out n))throw new Win32Exception(Marshal.GetLastWin32Error(),"GetTokenInformation");return Marshal.ReadInt32(p);}finally{Marshal.FreeHGlobal(p);}}
 static string Name(IntPtr handle){var s=new System.Text.StringBuilder(1024);int needed;if(!GetUserObjectInformationW(handle,2,s,2048,out needed))throw new Win32Exception(Marshal.GetLastWin32Error(),"GetUserObjectInformation");return s.ToString();}
 public static string Station(){return Name(GetProcessWindowStation());}
 public static string Desktop(){return Name(GetThreadDesktop(GetCurrentThreadId()));}
 public static void Check(int pid) {bool own=pid==GetCurrentProcessId();IntPtr process=own?GetCurrentProcess():OpenProcess(0x1000,false,pid),token=IntPtr.Zero;if(process==IntPtr.Zero)throw new Win32Exception(Marshal.GetLastWin32Error(),"OpenProcess limited query");try{if(!OpenProcessToken(process,10,out token))throw new Win32Exception(Marshal.GetLastWin32Error(),"OpenProcessToken query and duplicate");if(Value(token,18)!=3||Value(token,20)!=0)throw new Exception("Actual linked limited token required; type="+Value(token,18)+", elevated="+Value(token,20));using(var user=new WindowsIdentity(token)){if(new WindowsPrincipal(user).IsInRole(WindowsBuiltInRole.Administrator))throw new Exception("Client is an effective administrator");}}finally{if(token!=IntPtr.Zero)CloseHandle(token);if(!own)CloseHandle(process);}}
}
'@
    $retainedFiles=@((Join-Path $env:APPDATA 'local-media-gallery/settings.json'),(Join-Path $env:LOCALAPPDATA 'local-media-gallery/state/history.sqlite3'))
    foreach($file in $retainedFiles){[void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($file));[IO.File]::WriteAllText($file,('Retained isolated installer fixture '+$file),[Text.UTF8Encoding]::new($false))}
    function Read-RetainedPrivate { @($retainedFiles|ForEach-Object {@{path=$_;bytes=([IO.FileInfo]::new($_).Length.ToString());sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($_))).ToLowerInvariant()}}) }
    $privateBefore=Read-RetainedPrivate
    [GalleryLimitedClient]::Check([Diagnostics.Process]::GetCurrentProcess().Id)
    $start=[Diagnostics.ProcessStartInfo]::new();$start.FileName=Join-Path $env:SystemRoot 'System32\msiexec.exe';$start.WorkingDirectory=[IO.Path]::GetDirectoryName($MsiFile)
    $start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
    foreach($argument in @('/i',$MsiFile,'/norestart','/L*v',$LogPath)){$start.ArgumentList.Add($argument)}
    $client=[Diagnostics.Process]::new();$client.StartInfo=$start
    [void]$client.Start();$client.StandardInput.Close();$output=$client.StandardOutput.ReadToEndAsync();$errors=$client.StandardError.ReadToEndAsync()
    [GalleryLimitedClient]::Check($client.Id)
    @{kind='actual-credentialed-limited-msi-client';pid=$client.Id;launcherTokenType=3;clientTokenType=3;clientElevated=$false;sameAccount=$true;profile=$profile;localAppData=[Environment]::GetFolderPath('LocalApplicationData');session=[Diagnostics.Process]::GetCurrentProcess().SessionId;station=[GalleryLimitedClient]::Station();desktop=[GalleryLimitedClient]::Desktop()}|ConvertTo-Json -Compress
    if(!$client.WaitForExit(300000)){throw 'Incomplete limited-token MSI client; account/context must remain retained'}
    [Console]::Error.Write($errors.GetAwaiter().GetResult())
    $privateAfter=Read-RetainedPrivate
    [IO.File]::WriteAllText(($LogPath+'.private.json'),(@{before=$privateBefore;after=$privateAfter}|ConvertTo-Json -Depth 6)+[char]10,[Text.UTF8Encoding]::new($false))
    exit $client.ExitCode
}
$account='lmgui'+[Guid]::NewGuid().ToString('N').Substring(0,10)
$password=ConvertTo-SecureString ([Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(30))+'Aa9!') -AsPlainText -Force
$created=$false;$terminal=$false
$policyBefore=@(foreach($setting in @(@{path='HKLM:\Software\Policies\Microsoft\Windows\Installer';name='DisableMsi'},@{path='HKLM:\Software\Microsoft\Windows\CurrentVersion\Policies\System';name='ConsentPromptBehaviorAdmin'})) {
    $key=Get-Item -LiteralPath $setting.path -ErrorAction SilentlyContinue
    $present=$null -ne $key -and $key.GetValueNames() -contains $setting.name
    @{path=$setting.path;name=$setting.name;keyPresent=($null -ne $key);present=$present;value=if($present){$key.GetValue($setting.name)}else{$null};kind=if($present){$key.GetValueKind($setting.name).ToString()}else{$null}}
})
try {
    foreach($key in @('HKLM:\Software\Policies\Microsoft\Windows\Installer','HKCU:\Software\Policies\Microsoft\Windows\Installer')){if((Get-ItemPropertyValue -LiteralPath $key -Name AlwaysInstallElevated -ErrorAction SilentlyContinue) -eq 1){throw 'Fixture cannot permit elevated user MSI installs'}}
    foreach($setting in $policyBefore){if(!(Test-Path -LiteralPath $setting.path)){[void](New-Item -Path $setting.path -Force)};Set-ItemProperty -LiteralPath $setting.path -Name $setting.name -Value 0 -Type DWord}
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
    $start.Environment['GITHUB_ACTIONS']=$env:GITHUB_ACTIONS
    $start.Environment['GALLERY_ISOLATED_DESKTOP']=$env:GALLERY_ISOLATED_DESKTOP
    foreach($argument in @('-NoProfile','-NonInteractive','-File',$script,'-MsiFile',$MsiFile,'-LogPath',$LogPath,'-Child')){$start.ArgumentList.Add($argument)}
    $client=[Diagnostics.Process]::new();$client.StartInfo=$start
    [void]$client.Start();$client.StandardInput.Close()
    $output=$client.StandardOutput.BaseStream.CopyToAsync([Console]::OpenStandardOutput())
    $errors=$client.StandardError.BaseStream.CopyToAsync([Console]::OpenStandardError())
    if(!$client.WaitForExit(320000)){throw 'Incomplete credentialed launcher; retain account/context'}
    [void]$output.GetAwaiter().GetResult();[void]$errors.GetAwaiter().GetResult()
    $terminal=$true
    exit $client.ExitCode
} finally {
    foreach($setting in $policyBefore){
        if($setting.present){Set-ItemProperty -LiteralPath $setting.path -Name $setting.name -Value $setting.value -Type $setting.kind}
        else{Remove-ItemProperty -LiteralPath $setting.path -Name $setting.name -ErrorAction SilentlyContinue}
        if(!$setting.keyPresent){$key=Get-Item -LiteralPath $setting.path -ErrorAction SilentlyContinue;if($key -and $key.ValueCount -eq 0 -and $key.SubKeyCount -eq 0){Remove-Item -LiteralPath $setting.path}}
    }
    $restored=$true
    foreach($setting in $policyBefore){$key=Get-Item -LiteralPath $setting.path -ErrorAction SilentlyContinue;$present=$null -ne $key -and $key.GetValueNames() -contains $setting.name;if($present -ne $setting.present -or ($present -and ($key.GetValue($setting.name) -ne $setting.value -or $key.GetValueKind($setting.name).ToString() -ne $setting.kind))){$restored=$false}}
    if($created -and $terminal){Remove-LocalUser -Name $account}
    $record=@{kind='isolated-limited-msi-client-fixture';nativeClientTerminal=$terminal;private=if(Test-Path -LiteralPath ($LogPath+'.private.json')){Get-Content -Raw -LiteralPath ($LogPath+'.private.json')|ConvertFrom-Json}else{$null};policy=@{before=$policyBefore;during=@{DisableMsi=0;ConsentPromptBehaviorAdmin=0};alwaysInstallElevated=$false;restored=$restored}}
    [IO.File]::WriteAllText(($LogPath+'.fixture.json'),($record|ConvertTo-Json -Depth 8)+[char]10,[Text.UTF8Encoding]::new($false))
    if(!$restored){throw 'Isolated MSI client policies were not restored'}
}
