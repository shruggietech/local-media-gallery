<#
.SYNOPSIS
    Serve fresh package observations through one owned PowerShell session.
.DESCRIPTION
    PowerShell 7+, UTF-8 JSON lines over redirected standard input and output.
    Reuses compiled helper declarations, never observations. Each request invokes
    an unchanged script in a fresh child scope after verifying its source hash.
    UI operations retain the existing isolated-CI guard. Shortcut, registration
    and runtime inspection are read-only. No network, clipboard, installation or arbitrary command route.
    EOF closes the session. Protocol or source failures return structured errors.
    Optional isolated-CI checkpoints retain source, clock and process identities
    before native calls. They write only under the current workspace .local tree;
    request payloads, environment values and credentials are not serialized.
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

    function Write-ObserverCheckpoint {
        [CmdletBinding()]
        Param(
            [Parameter(Mandatory=$true)][hashtable]$Request,
            [Parameter(Mandatory=$true)][ValidateSet('pending','complete','failed')][string]$Status
        )
        if (!$script:ObserverCheckpointFile) { return }
        $latestText=[IO.File]::ReadAllText($script:ObserverContextFile)
        $latest=ConvertFrom-Json -InputObject $latestText -AsHashtable
        $document=[Text.Json.JsonDocument]::Parse($latestText)
        try { $contextJson=$document.RootElement.GetProperty('context').GetRawText() } finally { $document.Dispose() }
        if ($contextJson -ne $script:ObserverContextJson) { throw 'Observer checkpoint source/clock context changed' }
        if ($latest.record.requestId -ne $Request.id -or $latest.record.route -ne $Request.route) { throw 'Observer checkpoint request differs from its admitted owner record' }
        $target=$null
        if ($Request.ContainsKey('processId')) {
            $target=@{pid=$Request.processId;creationTime=$null}
            try {
                $owned=[Diagnostics.Process]::GetProcessById([int]$Request.processId)
                try { $target.creationTime=$owned.StartTime.ToFileTimeUtc().ToString([Globalization.CultureInfo]::InvariantCulture) } finally { $owned.Dispose() }
            } catch { $target.creationTime=$null }
        }
        $action=if ($Request.route -eq 'msi' -and $Request.ContainsKey('name')) { ([string]$Request.name).Substring(0,[Math]::Min(256,([string]$Request.name).Length)) } else { [string]$Request.route }
        $packet=@{formatVersion=1;acceptance=$false;context=$null;phase='native-request';status=$Status;at=[DateTime]::UtcNow.ToString('O');stage=$latest.record.stage;requestId=$Request.id;route=$Request.route;action=$action;actor=$script:ObserverActor;targetActor=$target}
        if ([IO.File]::Exists($script:ObserverCheckpointFile)) {
            $oldText=[IO.File]::ReadAllText($script:ObserverCheckpointFile)
            $old=ConvertFrom-Json -InputObject $oldText -AsHashtable
            $document=[Text.Json.JsonDocument]::Parse($oldText)
            try { $oldContext=$document.RootElement.GetProperty('context').GetRawText() } finally { $document.Dispose() }
            if ($old.formatVersion -ne 1 -or $oldContext -ne $script:ObserverContextJson) { throw 'Refusing a foreign observer checkpoint destination' }
        }
        $temporary=$script:ObserverCheckpointFile+'.next-'+[Guid]::NewGuid().ToString('N')
        try {
            # Preserve the exact JSON context. ConvertFrom-Json otherwise coerces ISO dates
            # and ConvertTo-Json changes their spelling, invalidating the shared clock.
            $json=(ConvertTo-Json -InputObject $packet -Depth 32 -Compress).Replace('"context":null','"context":'+$contextJson)
            $bytes=[Text.UTF8Encoding]::new($false).GetBytes($json+[char]10)
            $file=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
            try { $file.Write($bytes,0,$bytes.Length); $file.Flush() } finally { $file.Dispose() }
            [IO.File]::Move($temporary,$script:ObserverCheckpointFile,$true)
        } finally { if ([IO.File]::Exists($temporary)) { [IO.File]::Delete($temporary) } }
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
        $observerScripts=@{ui=(Join-Path $PSScriptRoot 'windows-package-ui.ps1');inspect=(Join-Path $PSScriptRoot 'inspect-windows-package.ps1');msi=(Join-Path $PSScriptRoot 'windows-msi-ui.ps1');'msi-initialize'=(Join-Path $PSScriptRoot 'windows-msi-ui.ps1');input=(Join-Path $PSScriptRoot 'native-input.ps1');state=(Join-Path $PSScriptRoot 'Get-WindowsPackageSnapshot.ps1');runtime=(Join-Path $PSScriptRoot 'Get-WindowsPackageSnapshot.ps1')}
        $observerHashes=@{}
        foreach ($route in $observerScripts.Keys) { $observerHashes[$route]=(Get-FileHash -LiteralPath $observerScripts[$route] -Algorithm SHA256).Hash.ToLowerInvariant() }
        $self=[Diagnostics.Process]::GetCurrentProcess()
        try { $script:ObserverActor=@{pid=$PID;creationTime=$self.StartTime.ToFileTimeUtc().ToString([Globalization.CultureInfo]::InvariantCulture);executablePath=$self.MainModule.FileName;sha256=(Get-FileHash -LiteralPath $self.MainModule.FileName -Algorithm SHA256).Hash.ToLowerInvariant()} } finally { $self.Dispose() }
        $serverSha256=(Get-FileHash -LiteralPath $ThisScriptPath -Algorithm SHA256).Hash.ToLowerInvariant()
        $script:ObserverCheckpointFile=$null
        if ($env:GALLERY_OBSERVER_CONTEXT_FILE -or $env:GALLERY_OBSERVER_CHECKPOINT_FILE) {
            if ($env:GITHUB_ACTIONS -ne 'true' -or $env:GALLERY_ISOLATED_DESKTOP -ne '1' -or !$env:GITHUB_WORKSPACE -or !$env:GALLERY_OBSERVER_CONTEXT_FILE -or !$env:GALLERY_OBSERVER_CHECKPOINT_FILE) { throw 'Native checkpoints require explicitly isolated CI and both owned paths' }
            $localRoot=[IO.Path]::GetFullPath((Join-Path $env:GITHUB_WORKSPACE '.local')).TrimEnd([char]92)+[char]92
            foreach ($candidate in @($env:GALLERY_OBSERVER_CONTEXT_FILE,$env:GALLERY_OBSERVER_CHECKPOINT_FILE)) {
                $full=[IO.Path]::GetFullPath($candidate)
                if (!$full.StartsWith($localRoot,[StringComparison]::OrdinalIgnoreCase)) { throw 'Observer checkpoint must remain in the isolated workspace' }
                for ($parent=[IO.DirectoryInfo]::new([IO.Path]::GetDirectoryName($full));$null -ne $parent;$parent=$parent.Parent) {
                    if ($parent.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Redirected observer checkpoint parent' }
                }
                if ([IO.File]::Exists($full) -and ((Get-Item -LiteralPath $full).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Redirected observer checkpoint file' }
            }
            $script:ObserverContextFile=[IO.Path]::GetFullPath($env:GALLERY_OBSERVER_CONTEXT_FILE)
            $script:ObserverCheckpointFile=[IO.Path]::GetFullPath($env:GALLERY_OBSERVER_CHECKPOINT_FILE)
            $document=[Text.Json.JsonDocument]::Parse([IO.File]::ReadAllText($script:ObserverContextFile))
            try { $script:ObserverContextJson=$document.RootElement.GetProperty('context').GetRawText() } finally { $document.Dispose() }
        }
        @{type='ready';protocolVersion=$ProtocolVersion;pid=$PID;sources=$observerHashes;apartment=([Threading.Thread]::CurrentThread.GetApartmentState().ToString());creationTime=$script:ObserverActor.creationTime;executablePath=$script:ObserverActor.executablePath;executableSha256=$script:ObserverActor.sha256;serverSha256=$serverSha256}|ConvertTo-Json -Compress
        while ($null -ne ($observerLine=Read-ObserverLine)) {
            $requestId=$null
            try {
                $request=ConvertFrom-Json -InputObject $observerLine -AsHashtable
                if ($request.id -isnot [long] -and $request.id -isnot [int]) { throw 'Observer request ID must be an integer' }
                $requestId=$request.id
                if ($requestId -lt 1) { throw 'Observer request ID must be positive' }
                Write-ObserverCheckpoint -Request $request -Status pending
                if ($request.route -eq 'ping') {
                    $result=@{pong=$true}
                } else {
                    if (!$observerScripts.ContainsKey($request.route)) { throw 'Unknown observer route' }
                    $scriptFile=$observerScripts[$request.route]
                    if ((Get-FileHash -LiteralPath $scriptFile -Algorithm SHA256).Hash.ToLowerInvariant() -ne $observerHashes[$request.route]) { throw 'Observer source changed during session' }
                    $parameters=@{}
                    if ($request.route -in @('state','runtime')) {
                        if ($request.scope -notin @('user','machine')) { throw 'Snapshot scope must be user or machine' }
                        $parameters.Mode=$request.route
                        $parameters.Scope=$request.scope
                        if ($request.route -eq 'state') {
                            if ($request.products -isnot [array] -or $request.products.Count -lt 1 -or $request.products.Count -gt 32) { throw 'Product GUID array required' }
                            foreach ($product in $request.products) { if ($product -isnot [string] -or $product -notmatch '^\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}$') { throw 'Product GUID required' } }
                            $parameters.Products=[string[]]$request.products
                        }
                    } elseif ($request.route -eq 'ui') {
                        if ($request.processId -isnot [long] -and $request.processId -isnot [int]) { throw 'Exact process ID required' }
                        if ($request.processId -lt 1) { throw 'Positive process ID required' }
                        $parameters.AppProcessId=$request.processId
                        if ($request.ContainsKey('name')) { $parameters.Name=[string]$request.name }
                        if ($request.ContainsKey('screenshot')) { $parameters.Screenshot=[string]$request.screenshot }
                    } elseif ($request.route -eq 'input') {
                        if ($request.processId -isnot [long] -and $request.processId -isnot [int]) { throw 'Exact process ID required' }
                        if ($request.processId -lt 1) { throw 'Positive process ID required' }
                        if ($request.action -notin @('compile','scan-keys')) { throw 'Unknown native input action' }
                        $parameters.AppProcessId=$request.processId
                        $parameters.Action=$request.action
                        if ($request.ContainsKey('key')) { $parameters.Keys=[string]$request.key }
                    } elseif ($request.route -eq 'msi-initialize') {
                        $parameters.Initialize=$true
                    } elseif ($request.route -eq 'msi') {
                        foreach ($key in @('name','value','screenshot')) { if ($request.ContainsKey($key)) { $parameters[$key]=[string]$request[$key] } }
                        if ($request.ContainsKey('screenshotWindow')) {
                            if (($request.screenshotWindow -isnot [long] -and $request.screenshotWindow -isnot [int]) -or $request.screenshotWindow -lt 1) { throw 'Positive attributed MSI window handle required' }
                            $parameters.ScreenshotWindow=[long]$request.screenshotWindow
                        }
                    } else {
                        if ($request.file -isnot [string] -or [IO.Path]::GetExtension($request.file) -ne '.lnk' -or ![IO.Path]::IsPathFullyQualified($request.file)) { throw 'Absolute shortcut path required' }
                        $parameters.File=$request.file
                    }
                    # Child scope drops all native references; Add-Type alone is reused.
                    $raw=& $scriptFile @parameters
                    $result=if ($request.route -eq 'input') { @{completed=$true;action=$request.action;targetPid=$request.processId} } else { ConvertFrom-Json -InputObject ($raw -join [char]10) -AsHashtable }
                }
                Write-ObserverCheckpoint -Request $request -Status complete
                @{id=$requestId;pid=$PID;creationTime=$script:ObserverActor.creationTime;ok=$true;result=$result}|ConvertTo-Json -Depth 16 -Compress
            } catch {
                $failureMessage=$_.Exception.Message
                if ($null -ne $requestId) { try { Write-ObserverCheckpoint -Request $request -Status failed } catch { $failureMessage+='; checkpoint failure' } }
                @{id=$requestId;pid=$PID;creationTime=$script:ObserverActor.creationTime;ok=$false;error=$failureMessage}|ConvertTo-Json -Compress
            }
            $result=$null; $raw=$null; $request=$null
            $Error.Clear()
        }
    } catch { Write-Error $_; exit 1 }

#_______________________________________________________________________________
## End of script
