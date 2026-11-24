# SPDX-License-Identifier: Apache-2.0
$ErrorActionPreference = 'Stop'

$archive = [IO.Path]::GetFullPath($env:LMG_PORTABLE_ZIP)
$destination = [IO.Path]::GetFullPath($env:LMG_PORTABLE_ZIP_DESTINATION)
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-StreamDigest([IO.Stream]$stream) {
    $digest = [Security.Cryptography.SHA256]::Create()
    try { [BitConverter]::ToString($digest.ComputeHash($stream)).Replace('-', '') }
    finally { $digest.Dispose() }
}

$zip = [IO.Compression.ZipFile]::OpenRead($archive)
try {
    $roots = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $files = foreach ($entry in $zip.Entries) {
        $name = $entry.FullName
        if ($name -match '(^|/)\.{1,2}(/|$)|^/|\\|:|//') {
            throw "Windows ZIP has an invalid entry name: $name"
        }
        [void]$roots.Add(($name -split '/', 2)[0])
        if ($name.EndsWith('/')) { continue }
        $stream = $entry.Open()
        try {
            [pscustomobject]@{
                Name = $name
                SHA256 = Get-StreamDigest $stream
            }
        } finally {
            $stream.Dispose()
        }
    }
} finally {
    $zip.Dispose()
}

$shell = New-Object -ComObject Shell.Application
$folder = $shell.NameSpace($archive)
if ($null -eq $folder) { throw 'Windows Compressed Folders could not open the ZIP.' }
$items = $folder.Items()
$shellNames = @(
    foreach ($item in $items) {
        [IO.Path]::GetFileName($item.Path.TrimEnd([char[]]@([char]92, [char]47)))
    }
)
if ($roots.Count -eq 0 -or !$roots.SetEquals([string[]]$shellNames)) {
    throw "Windows Compressed Folders saw different ZIP entries: $($shellNames -join ', ')"
}

# Shell extraction can display UI and is reserved for the disposable hosted runner.
$hosted = $env:GITHUB_ACTIONS -eq 'true' -and $env:RUNNER_OS -eq 'Windows'
if ($hosted) {
    $target = $shell.NameSpace($destination)
    if ($null -eq $target) { throw 'Windows Compressed Folders could not open the output folder.' }
    $target.CopyHere($items, 4 -bor 16 -bor 512 -bor 1024)
} else {
    [IO.Compression.ZipFile]::ExtractToDirectory($archive, $destination)
}

$timer = [Diagnostics.Stopwatch]::StartNew()
do {
    $pending = @(
        foreach ($file in $files) {
            $path = [IO.Path]::Combine($destination, $file.Name)
            try {
                $stream = [IO.File]::OpenRead($path)
                try {
                    if ((Get-StreamDigest $stream) -ne $file.SHA256) { $file.Name }
                } finally {
                    $stream.Dispose()
                }
            } catch [IO.IOException] {
                $file.Name
            }
        }
    )
    if (!$pending.Count) { break }
    if (!$hosted -or $timer.Elapsed.TotalSeconds -ge 15) {
        throw "ZIP extraction did not reproduce all package bytes: $($pending -join ', ')"
    }
    Start-Sleep -Milliseconds 100
} while ($true)

if ($hosted) { 'windows-compressed-folders' } else { 'windows-shell-enumeration-and-dotnet-extraction' }
