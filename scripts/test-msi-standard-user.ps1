<#
.SYNOPSIS
    Qualify current-user MSI installation under a disposable standard account.
.DESCRIPTION
    Hosted isolated CI only. Creates a new local Users-group account, copies only
    the MSI into its recipient directory, installs and removes without elevation,
    and observes the real token, native registration, feature choices and product.
    Credentials stay in memory. All children use redirected noninteractive I/O
    and hidden startup windows. An incomplete native client retains its account/context.
.PARAMETER MsiFile
    Absolute source-bound Full MSI.
.PARAMETER Sha256
    Expected MSI SHA-256.
#>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$MsiFile,[Parameter(Mandatory=$true)][string]$Sha256,[Parameter(Mandatory=$true)][string]$EvidenceDirectory)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:GALLERY_ISOLATED_DESKTOP -ne '1') { throw 'Standard-user MSI qualification requires isolated CI' }
if ((Get-FileHash -LiteralPath $MsiFile -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Sha256) { throw 'Source MSI identity differs' }
$account='lmg'+[Guid]::NewGuid().ToString('N').Substring(0,12)
$password=ConvertTo-SecureString ([Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(30))+'Aa9!') -AsPlainText -Force
$policyKey='HKLM:\Software\Policies\Microsoft\Windows\Installer'
$policyItem=Get-Item -LiteralPath $policyKey -ErrorAction SilentlyContinue
$policyKeyPresent=$null -ne $policyItem
$policyPresent=$policyKeyPresent -and ($policyItem.GetValueNames() -contains 'DisableMsi')
$policyBefore=if($policyPresent){$policyItem.GetValue('DisableMsi')}else{$null}
$policyKind=if($policyPresent){$policyItem.GetValueKind('DisableMsi').ToString()}else{$null}
$policyChanged=$false;$result=$null
$created=$false;$incomplete=$false;$removedSuccessfully=$false;$recipient=Join-Path ([Environment]::GetFolderPath('CommonDocuments')) $account
function Invoke-StandardProcess {
    param([string]$Executable,[string[]]$Arguments)
    $start=[Diagnostics.ProcessStartInfo]::new();$start.FileName=$Executable;$start.WorkingDirectory=$recipient
    $start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.WindowStyle=[Diagnostics.ProcessWindowStyle]::Hidden;$start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
    $start.UserName=$account;$start.Domain=$env:COMPUTERNAME;$start.Password=$password;$start.LoadUserProfile=$true
    foreach ($argument in $Arguments) { $start.ArgumentList.Add($argument) }
    $child=[Diagnostics.Process]::new();$child.StartInfo=$start
    [void]$child.Start();$child.StandardInput.Close();$output=$child.StandardOutput.ReadToEndAsync();$errors=$child.StandardError.ReadToEndAsync()
    if (!$child.WaitForExit(300000)) { $script:incomplete=$true;throw 'incomplete: standard-user native client remains active; its account and diagnostic context are retained' }
    @{exitCode=$child.ExitCode;stdout=$output.GetAwaiter().GetResult();stderr=$errors.GetAwaiter().GetResult()}
}
try {
    # Windows Server images disable unmanaged MSI installs by default. Permit
    # them only on this disposable fixture; never grant elevated user installs.
    foreach ($key in @($policyKey,'HKCU:\Software\Policies\Microsoft\Windows\Installer')) {
        if ((Get-ItemPropertyValue -LiteralPath $key -Name AlwaysInstallElevated -ErrorAction SilentlyContinue) -eq 1) { throw 'Fixture unexpectedly permits elevated user MSI installation' }
    }
    $policyChanged=$true
    if (!$policyKeyPresent) { [void](New-Item -Path $policyKey -Force) }
    Set-ItemProperty -LiteralPath $policyKey -Name DisableMsi -Value 0 -Type DWord
    $user=New-LocalUser -Name $account -Password $password -AccountNeverExpires -PasswordNeverExpires -Description 'Disposable isolated MSI qualification'
    $created=$true
    $usersGroup=Get-LocalGroup -SID 'S-1-5-32-545'
    if (!(Get-LocalGroupMember -Group $usersGroup.Name | Where-Object {$_.SID.Value -eq $user.SID.Value})) { Add-LocalGroupMember -Group $usersGroup.Name -Member $account }
    [void][IO.Directory]::CreateDirectory($recipient)
    $acl=Get-Acl -LiteralPath $recipient
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($user.SID,'Modify','ContainerInherit,ObjectInherit','None','Allow'))
    Set-Acl -LiteralPath $recipient -AclObject $acl
    $copy=Join-Path $recipient 'Full.msi';Copy-Item -LiteralPath $MsiFile -Destination $copy
    if ((Get-FileHash -LiteralPath $copy -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Sha256) { throw 'Copied MSI identity differs' }
    if (@(Get-ChildItem -LiteralPath $recipient).Count -ne 1) { throw 'Recipient must start with only one MSI' }
    $installLog=Join-Path $recipient 'install.log'
    $install=Invoke-StandardProcess -Executable (Join-Path $env:SystemRoot 'System32\msiexec.exe') -Arguments @('/i',$copy,'/qn','/norestart','/L*v',$installLog,'ALLUSERS=2','MSIINSTALLPERUSER=1')
    if ($install.exitCode -notin @(0,3010)) { throw ('Standard-user installation failed: '+$install.exitCode+'; '+$install.stderr+'; log '+$installLog) }
    $observe=@'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$ErrorActionPreference='Stop'
$identity=[Security.Principal.WindowsIdentity]::GetCurrent()
$principal=[Security.Principal.WindowsPrincipal]::new($identity)
$key=Get-ItemProperty -LiteralPath 'HKCU:\Software\ShruggieTech\LocalMediaGallery' -ErrorAction SilentlyContinue
$engine=New-Object -ComObject WindowsInstaller.Installer
$nativeState=$engine.ProductState('{6EC08037-6FA8-4AF3-916B-40D03DE0DAF9}')
$observed=$null
if ($key -and $key.ProductCode) {
    $engine=New-Object -ComObject WindowsInstaller.Installer
    $observed=@{product=$key.ProductCode;package=$key.PackageCode;directory=$key.InstallDir;startMenu=$engine.FeatureState($key.ProductCode,'StartMenu');commandPath=$engine.FeatureState($key.ProductCode,'CommandPath')}
    $binary=Join-Path $key.InstallDir 'local-media-gallery.exe'
    $version=(& $binary --version --json | ConvertFrom-Json)
    if ($LASTEXITCODE -ne 0) { throw 'Installed executable identity failed' }
    $observed.identity=$version
    $payload=Get-Content -LiteralPath (Join-Path $key.InstallDir 'payload.json') -Raw | ConvertFrom-Json
    $observed.owned=@($payload.files.path)+@('payload.json')
}
@{sid=$identity.User.Value;administrator=$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator);localAppData=[Environment]::GetFolderPath('LocalApplicationData');programs=[Environment]::GetFolderPath('Programs');shortcutExists=(Test-Path -LiteralPath (Join-Path ([Environment]::GetFolderPath('Programs')) 'Local Media Gallery.lnk'));userPath=[Environment]::GetEnvironmentVariable('Path','User');nativeState=$nativeState;registered=$observed}|ConvertTo-Json -Depth 12 -Compress
'@
    $encoded=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($observe))
    $observation=Invoke-StandardProcess -Executable (Join-Path $PSHOME 'pwsh.exe') -Arguments @('-NoProfile','-NonInteractive','-EncodedCommand',$encoded)
    if ($observation.exitCode -ne 0) { throw ('Standard-user observation failed: '+$observation.stderr) }
    $installed=ConvertFrom-Json $observation.stdout -AsHashtable
    if ($installed.administrator -or $installed.sid -ne $user.SID.Value) { throw 'Observation did not run as the disposable standard user' }
    if ($installed.nativeState -ne 5) { throw 'Windows Installer did not register the standard-user product' }
    if (!$installed.shortcutExists) { throw 'Standard-user Start menu shortcut is missing' }
    if (!$installed.registered -or $installed.registered.startMenu -ne 3 -or $installed.registered.commandPath -ne 2) { throw 'Standard-user installation did not retain fresh defaults' }
    if (![IO.Path]::GetFullPath($installed.registered.directory).StartsWith([IO.Path]::GetFullPath($installed.localAppData),[StringComparison]::OrdinalIgnoreCase)) { throw 'Standard-user default directory is outside its actual LocalAppData' }
    $removeLog=Join-Path $recipient 'remove.log'
    $remove=Invoke-StandardProcess -Executable (Join-Path $env:SystemRoot 'System32\msiexec.exe') -Arguments @('/x',$copy,'/qn','/norestart','/L*v',$removeLog,'ALLUSERS=2','MSIINSTALLPERUSER=1')
    if ($remove.exitCode -notin @(0,3010)) { throw ('Standard-user removal failed: '+$remove.exitCode+'; log '+$removeLog) }
    $observation=Invoke-StandardProcess -Executable (Join-Path $PSHOME 'pwsh.exe') -Arguments @('-NoProfile','-NonInteractive','-EncodedCommand',$encoded)
    if ($observation.exitCode -ne 0) { throw 'Standard-user removal readback failed' }
    $removed=ConvertFrom-Json $observation.stdout -AsHashtable
    if ($removed.registered -or $removed.nativeState -ne -1) { throw 'Standard-user removal left native registration' }
    $ownedRemoval=@(foreach ($relative in $installed.registered.owned) { $exists=Test-Path -LiteralPath (Join-Path $installed.registered.directory $relative);if ($exists) { throw ('Standard-user removal left owned file '+$relative) };@{path=$relative;exists=$exists} })
    if ($removed.shortcutExists) { throw 'Standard-user removal left its shortcut' }
    foreach ($observation in @($installed,$removed)) {
        foreach ($segment in @($observation.userPath -split ';')) {
            if ($segment -and [string]::Equals([Environment]::ExpandEnvironmentVariables($segment).TrimEnd('\'),$installed.registered.directory.TrimEnd('\'),[StringComparison]::OrdinalIgnoreCase)) { throw 'Default-off PATH integration created or retained its application segment' }
        }
    }
    $removedSuccessfully=$true
    $result=@{policy=@{name='DisableMsi';before=$policyBefore;during=0;alwaysInstallElevated=$false;restored=$false};result='pass';kind='disposable-standard-user';sid=$user.SID.Value;installed=$installed;removed=$removed;ownedRemoval=$ownedRemoval;installExit=$install.exitCode;removeExit=$remove.exitCode;recipientInput=@('Full.msi');sha256=$Sha256;logs=@((Join-Path $EvidenceDirectory 'install.log'),(Join-Path $EvidenceDirectory 'remove.log'))}
} finally {
    if ($policyChanged) {
        if ($policyPresent) { Set-ItemProperty -LiteralPath $policyKey -Name DisableMsi -Value $policyBefore -Type $policyKind }
        else { Remove-ItemProperty -LiteralPath $policyKey -Name DisableMsi -ErrorAction Stop }
        if (!$policyKeyPresent) {
            $empty=Get-Item -LiteralPath $policyKey -ErrorAction Stop
            if ($empty.GetValueNames().Count -ne 0 -or $empty.SubKeyCount -ne 0) { throw 'Fixture policy key changed unexpectedly; unrelated values retained' }
            Remove-Item -LiteralPath $policyKey -ErrorAction Stop
        }
        $after=Get-Item -LiteralPath $policyKey -ErrorAction SilentlyContinue
        if ($policyPresent) {
            if (!$after -or $after.GetValue('DisableMsi') -ne $policyBefore -or $after.GetValueKind('DisableMsi').ToString() -ne $policyKind) { throw 'Original Windows Installer policy was not restored' }
        } elseif ($after -and ($after.GetValueNames() -contains 'DisableMsi')) { throw 'Fixture policy value remains after restoration' }
        if ($result) { $result.policy.restored=$true }
    }
    [void][IO.Directory]::CreateDirectory($EvidenceDirectory)
    foreach ($name in @('install.log','remove.log')) {
        $file=Join-Path $recipient $name
        if (Test-Path -LiteralPath $file) {
            $entry=Get-Item -LiteralPath $file
            if (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $entry.Length -gt 8388608) { throw 'Unexpected standard-user log type/size' }
            Copy-Item -LiteralPath $file -Destination (Join-Path $EvidenceDirectory $name)
        }
    }
    if ($created -and !$incomplete -and $removedSuccessfully) { Remove-LocalUser -Name $account }
    # Retain profile/log evidence on this disposable hosted VM. No account or
    # profile operation is permitted outside the isolated-CI guard above.
    $password.Dispose()
}

if ($result) { $result | ConvertTo-Json -Depth 16 -Compress }
