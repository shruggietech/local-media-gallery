<#
.SYNOPSIS
    Read fresh Windows package registration or WebView2 runtime state.
.DESCRIPTION
    Produces JSON for the owned package qualification observer. Every invocation
    reads current registry, native registration and filesystem state. The observer
    reuses script code and a process, never an earlier observation.

    Requires PowerShell 7+ on Windows. Operations are read-only and use no network,
    browser, clipboard or interactive input. No installation action is invoked.
.PARAMETER Mode
    Select registration state or scoped runtime discovery. Default: state. Alias: m.
.PARAMETER Scope
    Select current-user or machine registration. Default: user. Alias: c.
.PARAMETER Products
    One to 32 brace-delimited product GUIDs for state discovery. Alias: p.
.PARAMETER Help
    Display detailed help. Alias: h.
.EXAMPLE
    ./Get-WindowsPackageSnapshot.ps1 -m state -c user -p '{00000000-0000-0000-0000-000000000001}'
    Read registration for the explicitly selected product without installing it.
.EXAMPLE
    ./Get-WindowsPackageSnapshot.ps1 -m runtime -c machine
    Read the current machine WebView2 version and confirm its executable exists.
.OUTPUTS
    One current JSON snapshot. Exit codes: 0 success, 1 failure, 2 prerequisite failure.
#>
[CmdletBinding(SupportsShouldProcess=$false,ConfirmImpact='None',DefaultParameterSetName='Default')]
Param(
    [Parameter(Mandatory=$false,ParameterSetName='Default')][Alias('m')][ValidateSet('state','runtime')][string]$Mode='state',
    [Parameter(Mandatory=$false,ParameterSetName='Default')][Alias('c')][ValidateSet('user','machine')][string]$Scope='user',
    [Parameter(Mandatory=$false,ParameterSetName='Default')][Alias('p')][string[]]$Products=@(),
    [Parameter(Mandatory=$true,ParameterSetName='HelpText')][Alias('h')][switch]$Help
)
#_______________________________________________________________________________
## Declare Functions

    function Assert-PSVersion {
        [CmdletBinding()]
        Param(
            [Parameter(Mandatory=$false)]
            [version]$Minimum = '7.0'
        )
        $current = $PSVersionTable.PSVersion
        if ($current -lt $Minimum) {
            Write-Host ("ALERT: PowerShell {0}+ required; running {1}. Relaunch with 'pwsh'." -f $Minimum, $current) -ForegroundColor Red
            exit 2
        }
    }

#_______________________________________________________________________________
## Declare Variables and Arrays

    $ThisScriptPath=$MyInvocation.MyCommand.Path

#_______________________________________________________________________________
## Execute Operations

    if (($Help) -or ($PSCmdlet.ParameterSetName -eq 'HelpText')) { Get-Help $ThisScriptPath -Detailed; exit 0 }
    Assert-PSVersion
    if (!$IsWindows) { [Console]::Error.WriteLine('Windows is required for package snapshots'); exit 2 }
    $ErrorActionPreference='Stop'
    [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
    try {
        if ($Mode -eq 'state') {
            if ($Products.Count -lt 1 -or $Products.Count -gt 32) { throw 'Product GUID array required' }
            foreach ($product in $Products) { if ($product -notmatch '^\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}$') { throw 'Product GUID required' } }
            $hive=if($Scope -eq 'machine'){'HKLM:'}else{'HKCU:'}
            $key=Get-ItemProperty -LiteralPath ($hive+'\Software\ShruggieTech\LocalMediaGallery') -ErrorAction SilentlyContinue
            $installer=New-Object -ComObject WindowsInstaller.Installer
            try {
                $registrations=@(foreach($product in $Products){try{@{product=$product;version=$installer.ProductInfo($product,'VersionString');package=$installer.ProductInfo($product,'PackageCode');location=$installer.ProductInfo($product,'InstallLocation')}}catch{}})
            } finally { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($installer) }
            if($registrations.Count -gt 1){throw 'Multiple current-generation MSI registrations'}
            $registered=if($registrations.Count){$registrations[0]}else{$null}
            $shortcut=Join-Path ([Environment]::GetFolderPath($(if($Scope -eq 'machine'){'CommonPrograms'}else{'Programs'}))) 'Local Media Gallery.lnk'
            $link=if(Test-Path -LiteralPath $shortcut){@{path=$shortcut}}else{$null}
            @{registered=$registered;integration=if($key -and $key.ProductCode){@{product=$key.ProductCode;package=$key.PackageCode;directory=$key.InstallDir;payload=$key.PayloadSha256}}else{$null};shortcut=$link;path=[Environment]::ExpandEnvironmentVariables(([Environment]::GetEnvironmentVariable('Path','Machine')+';'+[Environment]::GetEnvironmentVariable('Path','User')))}|ConvertTo-Json -Depth 5 -Compress
        } else {
            $machine=$Scope -eq 'machine'
            $key=if($machine){'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'}else{'HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'}
            $runtime=Get-ItemProperty -LiteralPath $key -ErrorAction SilentlyContinue
            if(!$runtime -or !$runtime.pv){$machine=$true;$runtime=Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' -ErrorAction Stop}
            $base=if($machine){[Environment]::GetEnvironmentVariable('ProgramFiles(x86)')}else{$env:LOCALAPPDATA}
            $folder=Join-Path $base ('Microsoft\EdgeWebView\Application\'+$runtime.pv)
            if(!(Test-Path -LiteralPath (Join-Path $folder 'msedgewebview2.exe'))){throw 'Runtime executable missing'}
            @{version=$runtime.pv;scope=if($machine){'machine'}else{'user'};nativeFolder=@{encoding='windows-utf16le';bytes=@([Text.Encoding]::Unicode.GetBytes($folder))};method='Actual scoped registry and executable readback following successful MSI native loader verification'}|ConvertTo-Json -Depth 5 -Compress
        }
    } catch { Write-Error $_; exit 1 }

#_______________________________________________________________________________
## End of script
