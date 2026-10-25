# SPDX-License-Identifier: Apache-2.0
# One persistent, redirected, noninteractive observer. Never emit command lines.
$ErrorActionPreference = 'Stop'
$seenRoots = @{}
$runtime = $null
function Get-LogicalBytes([string]$Directory) {
    [long]$total = 0
    Get-ChildItem -LiteralPath $Directory -Recurse -File -Force -ErrorAction Stop | ForEach-Object { $total += $_.Length }
    return $total
}
while ($null -ne ($line = [Console]::ReadLine())) {
    try {
        $request = $line | ConvertFrom-Json
        if ($request.action -eq 'stop') { [Console]::WriteLine('{"stopped":true}'); break }
        if ($request.action -eq 'environment') {
            $tool = Get-Command ffmpeg -ErrorAction SilentlyContinue
            $fixtureTool = if ($tool) { @{status='measured';bytes=(Get-Item -LiteralPath $tool.Source).Length;sha256=(Get-FileHash -LiteralPath $tool.Source -Algorithm SHA256).Hash.ToLowerInvariant();basis='fixture preparation executable logical bytes; not a product dependency'} } else { @{status='unavailable';basis='fixture tool executable not resolved'} }
            $filesystem = 'unknown'
            try { $filesystem = ([IO.DriveInfo]::new([IO.Path]::GetPathRoot($PSScriptRoot))).DriveFormat } catch { }
            $result = @{os=[Runtime.InteropServices.RuntimeInformation]::OSDescription;build=[Environment]::OSVersion.Version.Build;architecture=[Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString();storage=@{filesystem=$filesystem;medium='unknown';basis='local fixture volume; physical storage medium not established'};power='unknown';fixtureTool=$fixtureTool}
        } elseif ($request.action -eq 'memory') {
            $rootId = [int]$request.rootPid
            $all = @(Get-CimInstance Win32_Process -OperationTimeoutSec 5)
            $native = $all | Where-Object { $_.ProcessId -eq $rootId } | Select-Object -First 1
            if (!$native) { throw 'Measured root no longer exists' }
            $created = $native.CreationDate.ToUniversalTime().ToString('O')
            if ($native.CreationDate.ToUniversalTime() -lt ([datetime]$request.notBefore).ToUniversalTime().AddSeconds(-1)) { throw 'Root identity predates launched process' }
            if ($seenRoots.ContainsKey($rootId) -and $seenRoots[$rootId] -ne $created) { throw 'Measured root PID was reused' }
            $seenRoots[$rootId] = $created
            $owned = @{$rootId=$native}
            do {
                $added = $false
                foreach ($candidate in $all) {
                    $parentId = [int]$candidate.ParentProcessId
                    $candidateId = [int]$candidate.ProcessId
                    if (!$owned.ContainsKey($candidateId) -and $owned.ContainsKey($parentId) -and $candidate.CreationDate -ge $owned[$parentId].CreationDate) { $owned[$candidateId]=$candidate; $added=$true }
                }
            } while ($added)
            $records = @(); $errors = @()
            foreach ($entry in $owned.Values) {
                try {
                    $process = [Diagnostics.Process]::GetProcessById([int]$entry.ProcessId)
                    try {
                        $process.Refresh()
                        $observedCreation = $entry.CreationDate.ToUniversalTime()
                        # CIM timestamps have microsecond precision, FILETIME has100ns.
                        if ([math]::Abs($process.StartTime.ToUniversalTime().Ticks - $observedCreation.Ticks) -gt 9) { throw 'Process identity changed after enumeration' }
                        $privateBytes = $process.PrivateMemorySize64
                        $workingSetBytes = $process.WorkingSet64
                        $verified = [Diagnostics.Process]::GetProcessById([int]$entry.ProcessId)
                        try { if ([math]::Abs($verified.StartTime.ToUniversalTime().Ticks - $observedCreation.Ticks) -gt 9) { throw 'Process identity changed during memory capture' } } finally { $verified.Dispose() }
                        $kind = if ($entry.ProcessId -eq $rootId) {'native'} elseif ($entry.Name -eq 'msedgewebview2.exe') {'webview'} else {'other-child'}
                        $records += @{pid=[int]$entry.ProcessId;name=$entry.Name;createdAt=$observedCreation.ToString('O');kind=$kind;privateBytes=$privateBytes;workingSetBytes=$workingSetBytes}
                        if (!$runtime -and $kind -eq 'webview' -and $entry.ExecutablePath) {
                            try { $runtime=@{status='measured';bytes=(Get-LogicalBytes (Split-Path -Parent $entry.ExecutablePath));version=(Get-Item -LiteralPath $entry.ExecutablePath).VersionInfo.FileVersion;basis='logical bytes of shared installed WebView runtime directory, not marginal download or physical allocation'} }
                            catch { $runtime=@{status='unavailable';basis='shared WebView runtime footprint could not be completely enumerated'} }
                        }
                    } finally { $process.Dispose() }
                } catch { $errors += @{pid=[int]$entry.ProcessId;reason='process exited or memory access unavailable'} }
            }
            $subtotals = @{}
            foreach ($kind in @('native','webview','other-child')) {
                $matching = @($records | Where-Object { $_.kind -eq $kind })
                $subtotals[$kind] = @{processes=$matching.Count;privateBytes=[long](($matching | Measure-Object privateBytes -Sum).Sum);workingSetBytes=[long](($matching | Measure-Object workingSetBytes -Sum).Sum)}
            }
            $result=@{sampledAt=[datetime]::UtcNow.ToString('O');coverage='endpoint-only; may miss transient peaks';complete=($errors.Count -eq 0 -and $subtotals.webview.processes -gt 0);native=$subtotals.native;webview=$subtotals.webview;otherChildren=$subtotals['other-child'];records=@($records);errors=@($errors);runtime=$runtime;basis='root plus creation-checked descendants; private bytes are committed private memory; summed working sets may double-count shared pages'}
        } else { throw 'Unknown observer action' }
        [Console]::WriteLine(($result | ConvertTo-Json -Depth 10 -Compress))
    } catch { [Console]::WriteLine((@{error=$_.Exception.Message;coverage='unavailable'} | ConvertTo-Json -Compress)) }
}
