<#
.SYNOPSIS
    Inspect candidate PE architecture, dependencies and Authenticode disposition.
.DESCRIPTION
    Read-only build evidence, intended for isolated Windows qualification. Does not
    install software, start a browser, use the clipboard or alter the registry.
    Embedded and delay import directories are both audited; signing is reported
    independently from recipient trust prompts and clean-machine qualification.
.PARAMETER File
    Absolute PE file to inspect. Alias: f.
.PARAMETER Help
    Display detailed help. Alias: h.
.EXAMPLE
    ./inspect-windows-package.ps1 -File C:/candidate/setup.exe
    Inspect a candidate entrypoint.
.EXAMPLE
    ./inspect-windows-package.ps1 -f C:/candidate/MicrosoftEdgeWebview2Setup.exe
    Inspect the exact vendor bootstrapper before execution.
.OUTPUTS
    One JSON object, with architecture, import lists, version and signature.
#>
[CmdletBinding(SupportsShouldProcess=$false,ConfirmImpact='None',DefaultParameterSetName='Default')]
Param(
    [Parameter(Mandatory=$true,ParameterSetName='Default')][Alias('f')][string]$File,
    [Parameter(Mandatory=$true,ParameterSetName='HelpText')][Alias('h')][switch]$Help
)
#_______________________________________________________________________________
## Declare Functions

    function Get-ImageOffset {
        [CmdletBinding()]
        Param([Parameter(Mandatory=$true)][uint32]$Address)
        for ($i=0; $i -lt $sectionCount; $i++) {
            $at=$sectionTable+$i*40
            $start=[BitConverter]::ToUInt32($data,$at+12)
            $length=[Math]::Max([BitConverter]::ToUInt32($data,$at+8),[BitConverter]::ToUInt32($data,$at+16))
            if ($Address -ge $start -and $Address -lt $start+$length) { return [int]([BitConverter]::ToUInt32($data,$at+20)+$Address-$start) }
        }
        throw 'PE address is outside sections'
    }
    function Get-ImageImport {
        [CmdletBinding()]
        Param([Parameter(Mandatory=$true)][int]$Index,[Parameter(Mandatory=$true)][int]$Stride,[Parameter(Mandatory=$true)][int]$NameOffset)
        $address=[BitConverter]::ToUInt32($data,$directories+$Index*8)
        if ($address -eq 0) { return @() }
        $names=@()
        for ($at=(Get-ImageOffset $address); $at+$Stride -le $data.Length; $at+=$Stride) {
            $name=[BitConverter]::ToUInt32($data,$at+$NameOffset)
            if ($name -eq 0) { break }
            $p=Get-ImageOffset $name
            $end=[Array]::IndexOf($data,[byte]0,$p)
            if ($end -lt $p -or $end-$p -gt 512) { throw 'Invalid import name' }
            $names+= [Text.Encoding]::ASCII.GetString($data,$p,$end-$p)
        }
        return $names
    }
#_______________________________________________________________________________
## Declare Variables and Arrays

    $ThisScriptPath=$MyInvocation.MyCommand.Path

#_______________________________________________________________________________
## Execute Operations

    if (($Help) -or ($PSCmdlet.ParameterSetName -eq 'HelpText')) { Get-Help $ThisScriptPath -Detailed; exit 0 }
    $ErrorActionPreference='Stop'
    try {
        if ([IO.Path]::GetExtension($File) -eq '.msi') {
            $engine=New-Object -ComObject WindowsInstaller.Installer
            $database=$engine.OpenDatabase($File,0)
            $properties=@{}
            $view=$database.OpenView('SELECT `Property`,`Value` FROM `Property`')
            $view.Execute()
            while ($null -ne ($row=$view.Fetch())) { $properties[$row.StringData(1)]=$row.StringData(2) }
            $summary=$database.SummaryInformation(0)
            @{productCode=$properties.ProductCode;version=$properties.ProductVersion;manufacturer=$properties.Manufacturer;allUsers=$properties.ALLUSERS;packageCode=$summary.Property(9);template=$summary.Property(7)} | ConvertTo-Json -Compress
            exit 0
        }
        $data=[IO.File]::ReadAllBytes($File)
        $pe=[BitConverter]::ToUInt32($data,0x3c)
        if ([BitConverter]::ToUInt32($data,$pe) -ne 0x4550) { throw 'Invalid PE signature' }
        $sectionCount=[BitConverter]::ToUInt16($data,$pe+6)
        $optional=$pe+24
        $sectionTable=$optional+[BitConverter]::ToUInt16($data,$pe+20)
        $directories=$optional+$(if ([BitConverter]::ToUInt16($data,$optional) -eq 0x20b) {112} else {96})
        $signature=Get-AuthenticodeSignature -LiteralPath $File
        [ordered]@{
            machine=[BitConverter]::ToUInt16($data,$pe+4)
            imports=@(Get-ImageImport -Index 1 -Stride 20 -NameOffset 12)
            delayImports=@(Get-ImageImport -Index 13 -Stride 32 -NameOffset 4)
            fileVersion=[Diagnostics.FileVersionInfo]::GetVersionInfo($File).FileVersion
            requestedExecutionLevel=([regex]::Match([Text.Encoding]::UTF8.GetString($data),'<requestedExecutionLevel\s+level="([^"]+)"')).Groups[1].Value
            signature=[ordered]@{ status=$signature.Status.ToString(); subject=$signature.SignerCertificate.Subject; thumbprint=$signature.SignerCertificate.Thumbprint }
        } | ConvertTo-Json -Depth 5 -Compress
    } catch { Write-Error $_; exit 1 }

#_______________________________________________________________________________
## End of script
