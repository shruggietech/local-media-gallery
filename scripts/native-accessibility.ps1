# SPDX-License-Identifier: Apache-2.0
param([Parameter(Mandatory)][int]$AppProcessId,[Parameter(Mandatory)][string]$Output)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$app = Get-Process -Id $AppProcessId
if ($app.MainWindowHandle -eq [IntPtr]::Zero) { throw 'Native accessibility window is unavailable.' }
$window = [System.Windows.Automation.AutomationElement]::FromHandle($app.MainWindowHandle)
$walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
$records = [System.Collections.Generic.List[object]]::new()
$queue = [System.Collections.Generic.Queue[object]]::new()
$queue.Enqueue(@($window,0))
$overflow = $false
$deadline = [DateTime]::UtcNow.AddSeconds(8)
while ($queue.Count -gt 0) {
    if ($records.Count -ge 2048 -or [DateTime]::UtcNow -gt $deadline) { $overflow = $true; break }
    $entry = $queue.Dequeue()
    $element = $entry[0]
    $depth = [int]$entry[1]
    $current = $element.Current
    $bounds = $current.BoundingRectangle
    $patterns = @($element.GetSupportedPatterns() | ForEach-Object { $_.ProgrammaticName })
    $records.Add([ordered]@{name=$current.Name;role=$current.ControlType.ProgrammaticName;enabled=$current.IsEnabled;focusable=$current.IsKeyboardFocusable;focused=$current.HasKeyboardFocus;offscreen=$current.IsOffscreen;help=$current.HelpText;depth=$depth;bounds=@($bounds.X,$bounds.Y,$bounds.Width,$bounds.Height);patterns=$patterns})
    $child = $walker.GetFirstChild($element)
    while ($null -ne $child) {
        if ($depth -ge 32 -or $queue.Count + $records.Count -ge 2048) { $overflow = $true; break }
        $queue.Enqueue(@($child,($depth+1)))
        $child = $walker.GetNextSibling($child)
    }
}
$report = [ordered]@{method='UIAutomation';windowHandle=$app.MainWindowHandle.ToInt64().ToString();processId=$AppProcessId;nodes=$records.Count;overflow=$overflow;records=@($records.ToArray())}
[System.IO.File]::WriteAllText($Output,($report | ConvertTo-Json -Depth 12 -Compress)+"`n",[System.Text.UTF8Encoding]::new($false))
