<#
.SYNOPSIS
    Observe or invoke an ordinary candidate through Windows UI Automation.
.DESCRIPTION
    Isolated hosted CI only. Targets the exact application process window, reads
    its real accessibility tree, optionally invokes a named enabled button and
    captures actual window pixels. Changes focus only on the isolated desktop.
    No private application test hooks or injected browser scripts are used.
.PARAMETER AppProcessId
    Exact ordinary application process. Alias: p.
.PARAMETER Name
    Optional exact button name to invoke. Alias: n.
.PARAMETER Screenshot
    Optional owned PNG destination. Alias: o.
.PARAMETER Help
    Display help. Alias: h.
.EXAMPLE
    ./windows-package-ui.ps1 -AppProcessId 123 -Screenshot C:/evidence/window.png
    Read actual accessibility and pixel evidence.
.EXAMPLE
    ./windows-package-ui.ps1 -p 123 -Name Refresh
    Invoke the actual accessible Refresh button on isolated CI.
.OUTPUTS
    JSON accessibility, window, process, pixel and optional invocation evidence.
#>
[CmdletBinding(SupportsShouldProcess=$false,ConfirmImpact='None',DefaultParameterSetName='Default')]
Param(
    [Parameter(Mandatory=$true,ParameterSetName='Default')][Alias('p')][int]$AppProcessId,
    [Parameter(Mandatory=$false,ParameterSetName='Default')][Alias('n')][string]$Name='',
    [Parameter(Mandatory=$false,ParameterSetName='Default')][Alias('o')][string]$Screenshot='',
    [Parameter(Mandatory=$true,ParameterSetName='HelpText')][Alias('h')][switch]$Help
)
#_______________________________________________________________________________
## Declare Functions

#_______________________________________________________________________________
## Declare Variables and Arrays

    $ThisScriptPath=$MyInvocation.MyCommand.Path

#_______________________________________________________________________________
## Execute Operations

    if (($Help) -or ($PSCmdlet.ParameterSetName -eq 'HelpText')) { Get-Help $ThisScriptPath -Detailed; exit 0 }
    $ErrorActionPreference='Stop'
    if ($env:GITHUB_ACTIONS -ne 'true' -or $env:GALLERY_ISOLATED_DESKTOP -ne '1') { throw 'Ordinary candidate UI observation requires isolated CI' }
    try {
        Add-Type -AssemblyName UIAutomationClient
        Add-Type -AssemblyName UIAutomationTypes
        Add-Type -AssemblyName System.Drawing
        Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class CandidateWindow {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left,Top,Right,Bottom; }
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd,out Rect rect);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
}
'@
        $app=Get-Process -Id $AppProcessId
        $handle=$app.MainWindowHandle
        if ($handle -eq [IntPtr]::Zero) { throw 'Attributed native window is not ready' }
        $window=[System.Windows.Automation.AutomationElement]::FromHandle($handle)
        if ($Name -eq '__close_window__') {
            $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern).Close()
            @{processId=$AppProcessId;closed=$true} | ConvertTo-Json -Compress
            exit 0
        }
        $windowPattern=$window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)
        if ($windowPattern.Current.WindowVisualState -ne [System.Windows.Automation.WindowVisualState]::Maximized) { $windowPattern.SetWindowVisualState([System.Windows.Automation.WindowVisualState]::Maximized) }
        $walker=[System.Windows.Automation.TreeWalker]::ControlViewWalker
        $queue=[Collections.Generic.Queue[object]]::new()
        $queue.Enqueue(@($window,0))
        $records=[Collections.Generic.List[object]]::new()
        $invoked=$false
        $invokeTarget=$null
        $deadline=[DateTime]::UtcNow.AddSeconds(8)
        while ($queue.Count -gt 0) {
            if ($records.Count -ge 2048 -or [DateTime]::UtcNow -gt $deadline) { throw 'Native accessibility observation exceeded its bound' }
            $entry=$queue.Dequeue(); $element=$entry[0]; $depth=[int]$entry[1]; $current=$element.Current
            $records.Add([ordered]@{name=$current.Name;role=$current.ControlType.ProgrammaticName;enabled=$current.IsEnabled;offscreen=$current.IsOffscreen;processId=$current.ProcessId})
            if ($Name -ne '' -and $null -eq $invokeTarget -and $current.Name -eq $Name -and $current.IsEnabled -and !$current.IsOffscreen -and $current.ControlType -eq [System.Windows.Automation.ControlType]::Button) { $invokeTarget=$element }
            if ($depth -ge 32) { throw 'Native accessibility depth exceeded' }
            $child=$walker.GetFirstChild($element)
            while ($null -ne $child) { $queue.Enqueue(@($child,($depth+1))); $child=$walker.GetNextSibling($child) }
        }
        if ($Name -ne '') {
            if ($null -eq $invokeTarget) { throw "Native button is unavailable: $Name" }
            $pattern=$null
            if (!$invokeTarget.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$pattern)) { throw 'Named button has no native InvokePattern' }
            $pattern.Invoke(); $invoked=$true
        }
        $pixels=$null
        if ($Screenshot -ne '') {
            [void][CandidateWindow]::SetForegroundWindow($handle)
            $rect=[CandidateWindow+Rect]::new()
            if (![CandidateWindow]::GetWindowRect($handle,[ref]$rect)) { throw 'Cannot inspect native window bounds' }
            $width=$rect.Right-$rect.Left; $height=$rect.Bottom-$rect.Top
            if ($width -lt 100 -or $height -lt 100 -or $width -gt 8192 -or $height -gt 8192) { throw 'Unexpected native window dimensions' }
            $bitmap=[Drawing.Bitmap]::new($width,$height)
            $graphics=[Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.CopyFromScreen($rect.Left,$rect.Top,0,0,[Drawing.Size]::new($width,$height))
                $red=0; $green=0; $blue=0
                for ($y=0; $y -lt $height; $y+=4) { for ($x=0; $x -lt $width; $x+=4) {
                    $color=$bitmap.GetPixel($x,$y)
                    if ($color.R -gt 170 -and $color.G -lt 65 -and $color.B -lt 65) { $red++ }
                    if ($color.G -gt 170 -and $color.R -lt 65 -and $color.B -lt 65) { $green++ }
                    if ($color.B -gt 170 -and $color.R -lt 65 -and $color.G -lt 65) { $blue++ }
                } }
                $bitmap.Save($Screenshot,[Drawing.Imaging.ImageFormat]::Png)
                $pixels=[ordered]@{method='Attributed HWND bounds and actual isolated desktop pixels';width=$width;height=$height;stride=4;red=$red;green=$green;blue=$blue}
            } finally { $graphics.Dispose(); $bitmap.Dispose() }
        }
        $children=@(Get-CimInstance Win32_Process -Filter "ParentProcessId=$AppProcessId" | Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine)
        [ordered]@{processId=$AppProcessId;executable=$app.Path;windowHandle=$handle.ToInt64().ToString();records=@($records.ToArray());invoked=$invoked;pixels=$pixels;children=$children} | ConvertTo-Json -Depth 8 -Compress
    } catch { Write-Error $_; exit 1 }

#_______________________________________________________________________________
## End of script
