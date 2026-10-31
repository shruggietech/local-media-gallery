<#
.SYNOPSIS
    Serve fresh package observations through one owned PowerShell session.
.DESCRIPTION
    PowerShell 7+, UTF-8 JSON lines over redirected standard input and output.
    Reuses compiled helper declarations, never observations. Each request invokes
    an unchanged script in a fresh child scope after verifying its source hash.
    UI operations retain the existing isolated-CI guard. Shortcut inspection is
    read-only. No network, clipboard, installation or arbitrary command route.
    EOF closes the session. Protocol or source failures return structured errors.
.PARAMETER ProtocolVersion
    Supported pipe protocol version, currently 1. Default: 1. Alias: v.
.PARAMETER Help
    Display detailed help. Alias: h.
.EXAMPLE
    ./Invoke-WindowsPackageObserver.ps1
    Serve the owned qualification client's redirected JSON pipe until EOF.
.EXAMPLE
    ./Invoke-WindowsPackageObserver.ps1 -v 1
    Explicitly select the supported protocol. A ping performs no native calls.
.OUTPUTS
    One ready record, followed by one attributed response per request.
#>
[CmdletBinding(SupportsShouldProcess=$false,ConfirmImpact='None',DefaultParameterSetName='Default')]
Param(
    [Parameter(Mandatory=$false,ParameterSetName='Default')][Alias('v')][ValidateSet(1)][int]$ProtocolVersion=1,
    [Parameter(Mandatory=$true,ParameterSetName='HelpText')][Alias('h')][switch]$Help
)
#_______________________________________________________________________________
## Declare Functions

    function Assert-PSVersion {
        [CmdletBinding()]
        Param([Parameter(Mandatory=$false)][version]$Minimum='7.0')
        $current=$PSVersionTable.PSVersion
        if ($current -lt $Minimum) {
            Write-Host ("ALERT: PowerShell {0}+ required; running {1}. Relaunch with 'pwsh'." -f $Minimum,$current) -ForegroundColor Red
            exit 2
        }
    }

    function Read-ObserverLine {
        [CmdletBinding()]
        Param()
        $line=[Text.StringBuilder]::new()
        while ($true) {
            $character=[Console]::In.Read()
            if ($character -eq -1) {
                if ($line.Length -ne 0) { throw 'Incomplete observer request' }
                return $null
            }
            if ($character -eq 10) { return $line.ToString() }
            if ($line.Length -ge 65536) { throw 'Observer request exceeds its bound' }
            [void]$line.Append([char]$character)
        }
    }

#_______________________________________________________________________________
## Declare Variables and Arrays

    $ThisScriptPath=$MyInvocation.MyCommand.Path

#_______________________________________________________________________________
## Execute Operations

    if (($Help) -or ($PSCmdlet.ParameterSetName -eq 'HelpText')) { Get-Help $ThisScriptPath -Detailed; exit 0 }
    Assert-PSVersion
    $ErrorActionPreference='Stop'
    [Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
    try {
        $observerScripts=@{ui=(Join-Path $PSScriptRoot 'windows-package-ui.ps1');inspect=(Join-Path $PSScriptRoot 'inspect-windows-package.ps1')}
        $observerHashes=@{}
        foreach ($route in $observerScripts.Keys) { $observerHashes[$route]=(Get-FileHash -LiteralPath $observerScripts[$route] -Algorithm SHA256).Hash.ToLowerInvariant() }
        @{type='ready';protocolVersion=$ProtocolVersion;pid=$PID;sources=$observerHashes}|ConvertTo-Json -Compress
        while ($null -ne ($observerLine=Read-ObserverLine)) {
            $requestId=$null
            try {
                $request=ConvertFrom-Json -InputObject $observerLine -AsHashtable
                if ($request.id -isnot [long] -and $request.id -isnot [int]) { throw 'Observer request ID must be an integer' }
                $requestId=$request.id
                if ($requestId -lt 1) { throw 'Observer request ID must be positive' }
                if ($request.route -eq 'ping') {
                    $result=@{pong=$true}
                } else {
                    if (!$observerScripts.ContainsKey($request.route)) { throw 'Unknown observer route' }
                    $scriptFile=$observerScripts[$request.route]
                    if ((Get-FileHash -LiteralPath $scriptFile -Algorithm SHA256).Hash.ToLowerInvariant() -ne $observerHashes[$request.route]) { throw 'Observer source changed during session' }
                    $parameters=@{}
                    if ($request.route -eq 'ui') {
                        if ($request.processId -isnot [long] -and $request.processId -isnot [int]) { throw 'Exact process ID required' }
                        if ($request.processId -lt 1) { throw 'Positive process ID required' }
                        $parameters.AppProcessId=$request.processId
                        if ($request.ContainsKey('name')) { $parameters.Name=[string]$request.name }
                        if ($request.ContainsKey('screenshot')) { $parameters.Screenshot=[string]$request.screenshot }
                    } else {
                        if ($request.file -isnot [string] -or [IO.Path]::GetExtension($request.file) -ne '.lnk' -or ![IO.Path]::IsPathFullyQualified($request.file)) { throw 'Absolute shortcut path required' }
                        $parameters.File=$request.file
                    }
                    # Child scope drops all native references; Add-Type alone is reused.
                    $raw=& $scriptFile @parameters
                    $result=ConvertFrom-Json -InputObject ($raw -join [char]10) -AsHashtable
                }
                @{id=$requestId;pid=$PID;ok=$true;result=$result}|ConvertTo-Json -Depth 16 -Compress
            } catch {
                @{id=$requestId;pid=$PID;ok=$false;error=$_.Exception.Message}|ConvertTo-Json -Compress
            }
            $result=$null; $raw=$null; $request=$null
            $Error.Clear()
        }
    } catch { Write-Error $_; exit 1 }

#_______________________________________________________________________________
## End of script
