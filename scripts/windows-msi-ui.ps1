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
param([string]$Name='', [string]$Value='', [string]$Screenshot='', [long]$ScreenshotWindow=0)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:GALLERY_ISOLATED_DESKTOP -ne '1') { throw 'MSI wizard input requires isolated CI' }
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName Accessibility
Add-Type -CompilerOptions '/nowarn:1701' -ReferencedAssemblies ([Accessibility.IAccessible].Assembly.Location) @'
using System;using System.Runtime.InteropServices;
public static class GalleryMsiWindow {
 [DllImport("oleacc.dll")] static extern int AccessibleObjectFromWindow(IntPtr hwnd,uint objectId,ref Guid iid,[MarshalAs(UnmanagedType.Interface)] out Accessibility.IAccessible accessible);
 static Accessibility.IAccessible Accessible(IntPtr hwnd) {if(hwnd==IntPtr.Zero)throw new Exception("MSI control has no native handle");Guid iid=new Guid("618736e0-3c3d-11cf-810c-00aa00389b71");Accessibility.IAccessible value;Marshal.ThrowExceptionForHR(AccessibleObjectFromWindow(hwnd,0xfffffffc,ref iid,out value));return value;}
 public static object[] ReadLegacy(IntPtr hwnd) {if(hwnd==IntPtr.Zero)return null;Accessibility.IAccessible value=null;try {value=Accessible(hwnd);return new object[]{Convert.ToInt32(value.get_accRole(0)),Convert.ToInt32(value.get_accState(0)),value.get_accDefaultAction(0)??"",value.get_accValue(0)??""};}catch{return null;}finally{if(value!=null)Marshal.FinalReleaseComObject(value);}}
 public static void LegacyAction(IntPtr hwnd,string input) {var value=Accessible(hwnd);try {int role=Convert.ToInt32(value.get_accRole(0));int state=Convert.ToInt32(value.get_accState(0));if(role==42)value.set_accValue(0,input);else if(role==44){if(((state&16)!=0)!=(input!="false"))value.accDoDefaultAction(0);}else if(role==45){if((state&18)==0)value.accDoDefaultAction(0);}else if(!String.IsNullOrEmpty(value.get_accDefaultAction(0)))value.accDoDefaultAction(0);else throw new Exception("MSI control has no accessible default action");}finally{Marshal.FinalReleaseComObject(value);}}
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
        $label=[string]$c.Name
        $toggle=$null;$selected=$null;$currentValue=$null;$probe=$null;$legacyRole=$null;$legacyAction=$null;$providerRole=$c.ControlType.ProgrammaticName
        if ($element.TryGetCurrentPattern([Windows.Automation.TogglePattern]::Pattern,[ref]$probe)) { $toggle=[string]$probe.Current.ToggleState }
        if ($element.TryGetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern,[ref]$probe)) { $selected=$probe.Current.IsSelected }
        if ($element.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern,[ref]$probe)) { $currentValue=$probe.Current.Value }
        $legacy=[GalleryMsiWindow]::ReadLegacy([IntPtr]$c.NativeWindowHandle)
        if ($null -ne $legacy) {
            $legacyRole=[int]$legacy[0];$legacyState=[int]$legacy[1];$legacyAction=[string]$legacy[2]
            if ($null -eq $currentValue -and $legacyRole -eq 42) { $currentValue=[string]$legacy[3] }
            if ($legacyRole -eq 44 -and $null -eq $toggle) { $toggle=if ($legacyState -band 16) {'On'}else{'Off'} }
            if ($legacyRole -eq 45 -and $null -eq $selected) { $selected=[bool]($legacyState -band 18) }
        }
        $role=if ($legacyRole -eq 44) {'ControlType.CheckBox'}elseif($legacyRole -eq 45){'ControlType.RadioButton'}elseif($legacyRole -eq 48){'ControlType.ProgressBar'}elseif($legacyRole -eq 43){'ControlType.Button'}elseif($legacyRole -eq 42){'ControlType.Edit'}else{$providerRole}
        $records.Add(@{name=$label;providerRole=$providerRole;legacyRole=$legacyRole;legacyAction=$legacyAction;toggle=$toggle;selected=$selected;value=$currentValue;id=$c.AutomationId;role=$role;enabled=$c.IsEnabled;offscreen=$c.IsOffscreen;processId=$c.ProcessId})
        if ($Name -ne '' -and ($label.Replace('&','').Replace('>','').Replace('<','').Trim() -eq $Name -or ($Name -eq '__location__' -and ($c.ControlType -eq [Windows.Automation.ControlType]::Edit -or $legacyRole -eq 42))) -and $c.IsEnabled -and !$c.IsOffscreen) { $targets.Add($element) }
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
    elseif ($target.Current.NativeWindowHandle -ne 0) { [GalleryMsiWindow]::LegacyAction([IntPtr]$target.Current.NativeWindowHandle,$Value) }
    else { throw ("MSI control has no native input pattern: "+$Name+" / "+$target.Current.ControlType.ProgrammaticName+" / "+(($target.GetSupportedPatterns() | ForEach-Object {$_.ProgrammaticName}) -join ',')) }
    $invoked=$true
}
$screen=$null
if ($Screenshot -ne '') {
    $selected=@($windows | Where-Object { $ScreenshotWindow -eq 0 -or $_.Current.NativeWindowHandle -eq $ScreenshotWindow })
    if ($selected.Count -ne 1 -or ![IO.Path]::IsPathFullyQualified($Screenshot)) { throw 'Screenshot requires one exact attributed MSI window and an absolute output path' }
    $handle=[IntPtr]$selected[0].Current.NativeWindowHandle
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
