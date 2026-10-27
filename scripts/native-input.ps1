# SPDX-License-Identifier: Apache-2.0
param(
    [Parameter(Mandatory)][int]$AppProcessId,
    [ValidateSet('window', 'focus', 'keys', 'cancel-picker', 'select-picker', 'select-file', 'save-file')][string]$Action = 'keys',
    [string]$Keys,
    [string]$Directory
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class GalleryNativeInput {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr handle);
    [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr handle, uint message, IntPtr wparam, IntPtr lparam);
    [DllImport("user32.dll", EntryPoint="SendMessageW", CharSet=CharSet.Unicode)] public static extern IntPtr ReplaceText(IntPtr handle, uint message, IntPtr wparam, string text);
    [DllImport("user32.dll", EntryPoint="SendMessageW", CharSet=CharSet.Unicode)] public static extern IntPtr ReadText(IntPtr handle, uint message, IntPtr count, StringBuilder text);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr handle);
    [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr handle, uint flags);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern IntPtr SetFocus(IntPtr handle);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr handle, IntPtr process);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint first, uint second, bool attach);
    public static bool FocusControl(IntPtr window, IntPtr control) {
        uint current = GetCurrentThreadId();
        uint target = GetWindowThreadProcessId(window, IntPtr.Zero);
        uint foreground = GetWindowThreadProcessId(GetForegroundWindow(), IntPtr.Zero);
        bool targetAttached = current != target && AttachThreadInput(current, target, true);
        bool foregroundAttached = foreground != current && foreground != target && AttachThreadInput(current, foreground, true);
        try { SetForegroundWindow(window); if (control != IntPtr.Zero) SetFocus(control); return GetForegroundWindow() == window; }
        finally {
            if (foregroundAttached) AttachThreadInput(current, foreground, false);
            if (targetAttached) AttachThreadInput(current, target, false);
        }
    }
}
'@
$app = Get-Process -Id $AppProcessId
if ($app.MainWindowHandle -eq [IntPtr]::Zero) { throw 'Application has no native window.' }
if ($Action -eq 'window') { Write-Output 'Native application window exists.'; return }
$condition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::ProcessIdProperty, $AppProcessId)
$window = [System.Windows.Automation.AutomationElement]::FromHandle($app.MainWindowHandle)
[void][GalleryNativeInput]::SetForegroundWindow($app.MainWindowHandle)
if ($Action -in @('focus', 'keys')) {
    $focusDeadline = [DateTime]::UtcNow.AddSeconds(5)
    do {
        $focused = [GalleryNativeInput]::FocusControl($app.MainWindowHandle, [IntPtr]::Zero)
        if (-not $focused) { Start-Sleep -Milliseconds 100 }
    } until ($focused -or [DateTime]::UtcNow -gt $focusDeadline)
    if (-not $focused) { throw 'Cannot confirm the application is foreground; keyboard input was withheld.' }
    if ($Action -eq 'focus') { return }
    [System.Windows.Forms.SendKeys]::SendWait($Keys)
    return
}
$deadline = [DateTime]::UtcNow.AddSeconds(8)
do {
    $windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
        [System.Windows.Automation.TreeScope]::Children, $condition)
    $button = $null
    foreach ($candidate in $windows) {
        $target = switch ($Action) { 'cancel-picker' { 'Cancel' } 'select-file' { 'Open' } 'save-file' { 'Save' } default { 'Select Folder' } }
        $name = [System.Windows.Automation.PropertyCondition]::new(
            [System.Windows.Automation.AutomationElement]::NameProperty, $target)
        $button = $candidate.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $name)
        if ($button) { $window = $candidate; break }
    }
    if (-not $button) { Start-Sleep -Milliseconds 100 }
} until ($button -or [DateTime]::UtcNow -gt $deadline)
if (-not $button) { throw 'Native folder picker button was not found in the application process.' }
if ($Action -in @('select-picker', 'select-file', 'save-file')) {
    $edits = @($window.FindAll([System.Windows.Automation.TreeScope]::Descendants,
        [System.Windows.Automation.Condition]::TrueCondition) | Where-Object {
        $_.Current.ClassName -eq 'Edit' -and $_.Current.NativeWindowHandle -ne 0 -and
        $_.Current.Name -notlike 'Search*'
    })
    if ($edits.Count -ne 1) { throw "Expected one native picker location input, found $($edits.Count)." }
    $editHandle = [IntPtr]$edits[0].Current.NativeWindowHandle
    $dialogHandle = [GalleryNativeInput]::GetAncestor([IntPtr]$button.Current.NativeWindowHandle, 2)
    if (-not [GalleryNativeInput]::FocusControl($dialogHandle, $editHandle)) { throw 'Cannot focus the native picker location input.' }
    [void][GalleryNativeInput]::SendMessage($editHandle, 0x00B1, [IntPtr]::Zero, [IntPtr](-1))
    [void][GalleryNativeInput]::ReplaceText($editHandle, 0x00C2, [IntPtr]1, $Directory)
    $actual = [System.Text.StringBuilder]::new(32768)
    [void][GalleryNativeInput]::ReadText($editHandle, 0x000D, [IntPtr]$actual.Capacity, $actual)
    if ($actual.ToString() -ne $Directory) {
        throw "Native picker location mismatch (control=$($edits[0].Current.Name), id=$($edits[0].Current.AutomationId), expected characters=$($Directory.Length), observed characters=$($actual.Length))."
    }
    [void][GalleryNativeInput]::SendMessage([IntPtr]$button.Current.NativeWindowHandle, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)
    Start-Sleep -Milliseconds 100
    # Common dialogs can retain a hidden HWND after completing selection.
    if (-not [GalleryNativeInput]::IsWindowVisible($dialogHandle)) { return }
    if ($Action -ne 'select-picker') {
        $fileDeadline = [DateTime]::UtcNow.AddSeconds(8)
        while ([GalleryNativeInput]::IsWindowVisible($dialogHandle) -and [DateTime]::UtcNow -lt $fileDeadline) { Start-Sleep -Milliseconds 100 }
        if ([GalleryNativeInput]::IsWindowVisible($dialogHandle)) { throw 'Native file selection did not complete.' }
        return
    }
    $leaf = Split-Path -Leaf $Directory
    $deadline = [DateTime]::UtcNow.AddSeconds(8)
    do {
        if (-not [GalleryNativeInput]::IsWindowVisible($dialogHandle)) { return }
        $address = @($window.FindAll([System.Windows.Automation.TreeScope]::Descendants,
            [System.Windows.Automation.Condition]::TrueCondition) | Where-Object {
            $_.Current.Name -like 'Address:*' -and $_.Current.Name.EndsWith($leaf)
        })
        if (-not $address.Count) { Start-Sleep -Milliseconds 100 }
    } until ($address.Count -or [DateTime]::UtcNow -gt $deadline)
    if (-not $address.Count) { throw 'Native folder navigation did not reach the requested fixture; selection was withheld.' }
}
$handle = [IntPtr]$button.Current.NativeWindowHandle
if ($handle -eq [IntPtr]::Zero) { throw 'Picker control has no native handle.' }
[void][GalleryNativeInput]::SendMessage($handle, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)
