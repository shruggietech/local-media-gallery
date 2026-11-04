<#
.SYNOPSIS
    Drive the actual MSI wizard on an isolated hosted desktop.
.DESCRIPTION
    Uses native accessibility patterns for buttons, checkboxes, scope and path.
    Enumerates product-attributed Windows Installer dialogs because MSI may host
    UI in its client or server process. Refuses ambiguous controls. No local use.
.PARAMETER Name
    Exact visible control name, or empty for a fresh observation.
.PARAMETER Value
    Optional value for an editable field or toggle (true/false).
.PARAMETER Screenshot
    Optional absolute PNG evidence destination.
#>
[CmdletBinding()]
param([string]$Name='', [string]$Value='', [string]$Screenshot='')
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:GALLERY_ISOLATED_DESKTOP -ne '1') { throw 'MSI wizard input requires isolated CI' }
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;using System.Runtime.InteropServices;
public static class GalleryMsiWindow {
 [StructLayout(LayoutKind.Sequential)] public struct Rect {public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd,out Rect rect);
 [DllImport("user32.dll")] public static extern void keybd_event(byte key,byte scan,uint flags,UIntPtr extra);
 public static void Tab(IntPtr window) {SetForegroundWindow(window);if(GetForegroundWindow()!=window)throw new Exception("MSI focus attribution failed");keybd_event(9,0,0,UIntPtr.Zero);keybd_event(9,0,2,UIntPtr.Zero);}
}
'@
$top=[Windows.Automation.AutomationElement]::RootElement.FindAll([Windows.Automation.TreeScope]::Children,[Windows.Automation.Condition]::TrueCondition)
$windows=@()
foreach ($candidate in $top) {
    if ($candidate.Current.Name -notlike '*Local Media Gallery*' -or $candidate.Current.IsOffscreen) { continue }
    $app=Get-Process -Id $candidate.Current.ProcessId -ErrorAction Stop
    if ($app.ProcessName -ne 'msiexec' -or $app.Path -notlike ($env:SystemRoot+'\*\msiexec.exe')) { continue }
    $windows+=,$candidate
}
if ($windows.Count -eq 0) { throw 'No attributed MSI product dialog is ready' }
$records=[Collections.Generic.List[object]]::new()
$targets=[Collections.Generic.List[object]]::new()
foreach ($window in $windows) {
    $elements=$window.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)
    if ($elements.Count -gt 1024) { throw 'MSI accessibility bound exceeded' }
    foreach ($element in $elements) {
        $c=$element.Current
        $toggle=$null;$selected=$null;$currentValue=$null;$probe=$null
        if ($element.TryGetCurrentPattern([Windows.Automation.TogglePattern]::Pattern,[ref]$probe)) { $toggle=[string]$probe.Current.ToggleState }
        if ($element.TryGetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern,[ref]$probe)) { $selected=$probe.Current.IsSelected }
        if ($element.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern,[ref]$probe)) { $currentValue=$probe.Current.Value }
        $records.Add(@{name=$c.Name;toggle=$toggle;selected=$selected;value=$currentValue;id=$c.AutomationId;role=$c.ControlType.ProgrammaticName;enabled=$c.IsEnabled;offscreen=$c.IsOffscreen;processId=$c.ProcessId})
        if ($Name -ne '' -and ($c.Name.Replace('&','').Replace('>','').Replace('<','').Trim() -eq $Name -or ($Name -eq '__location__' -and $c.ControlType -eq [Windows.Automation.ControlType]::Edit)) -and $c.IsEnabled -and !$c.IsOffscreen) { $targets.Add($element) }
    }
}
$invoked=$false
if ($Name -eq '__tab__') {
    if ($windows.Count -ne 1) { throw 'Keyboard input requires exactly one attributed MSI window' }
    [GalleryMsiWindow]::Tab([IntPtr]$windows[0].Current.NativeWindowHandle)
    $invoked=$true
} elseif ($Name -ne '') {
    if ($targets.Count -ne 1) { throw "MSI control must be unique and enabled: $Name ($($targets.Count))" }
    $target=$targets[0];$pattern=$null
    if ($target.TryGetCurrentPattern([Windows.Automation.TogglePattern]::Pattern,[ref]$pattern)) {
        $wanted=if ($Value -eq 'false') { [Windows.Automation.ToggleState]::Off } else { [Windows.Automation.ToggleState]::On }
        if ($pattern.Current.ToggleState -ne $wanted) { $pattern.Toggle() }
    } elseif ($target.TryGetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern,[ref]$pattern)) { $pattern.Select() }
    elseif ($target.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern,[ref]$pattern)) { $pattern.SetValue($Value) }
    elseif ($target.TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern,[ref]$pattern)) { $pattern.Invoke() }
    else { throw 'MSI control has no usable native input pattern' }
    $invoked=$true
}
$screen=$null
if ($Screenshot -ne '') {
    if ($windows.Count -ne 1 -or ![IO.Path]::IsPathFullyQualified($Screenshot)) { throw 'Screenshot requires one MSI window and an absolute output path' }
    $handle=[IntPtr]$windows[0].Current.NativeWindowHandle
    [void][GalleryMsiWindow]::SetForegroundWindow($handle)
    $rect=[GalleryMsiWindow+Rect]::new()
    if (![GalleryMsiWindow]::GetWindowRect($handle,[ref]$rect)) { throw 'MSI bounds unavailable' }
    $width=$rect.Right-$rect.Left;$height=$rect.Bottom-$rect.Top
    if ($width -lt 100 -or $height -lt 100 -or $width -gt 4096 -or $height -gt 4096) { throw 'Unexpected MSI bounds' }
    $bitmap=[Drawing.Bitmap]::new($width,$height);$graphics=[Drawing.Graphics]::FromImage($bitmap)
    try { $graphics.CopyFromScreen($rect.Left,$rect.Top,0,0,[Drawing.Size]::new($width,$height));$bitmap.Save($Screenshot,[Drawing.Imaging.ImageFormat]::Png) } finally { $graphics.Dispose();$bitmap.Dispose() }
    $screen=@{path=$Screenshot;width=$width;height=$height}
}
@{windows=@($windows | ForEach-Object {@{name=$_.Current.Name;processId=$_.Current.ProcessId;handle=$_.Current.NativeWindowHandle}});records=@($records.ToArray());invoked=$invoked;screenshot=$screen;focused=[Windows.Automation.AutomationElement]::FocusedElement.Current.Name}|ConvertTo-Json -Depth 8 -Compress
