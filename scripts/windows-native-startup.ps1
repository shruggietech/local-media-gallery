# SPDX-License-Identifier: Apache-2.0
# Read-only failure diagnostics. No UI Automation, window messages, focus or input.
param([Parameter(Mandatory)][int]$AppProcessId)
$ErrorActionPreference='Stop'
if($env:GITHUB_ACTIONS -ne 'true' -or $env:GALLERY_ISOLATED_DESKTOP -ne '1'){throw 'Native startup observations require the isolated CI desktop.'}
if($AppProcessId -le 0){throw 'A positive owned child PID is required.'}
$clock=[Diagnostics.Stopwatch]::StartNew()
Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class GalleryStartupObservation {
    [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] private struct ProcessEntry {
        public uint size,usage,pid; public UIntPtr heap; public uint module,threads,parent; public int priority; public uint flags;
        [MarshalAs(UnmanagedType.ByValTStr,SizeConst=260)] public string name;
    }
    public sealed class ProcessRecord { public uint pid,parentPid; public string name; }
    public sealed class WindowRecord { public string handle,className; public uint pid; public bool visible; }
    private delegate bool WindowCallback(IntPtr window,IntPtr parameter);
    [DllImport("kernel32.dll",SetLastError=true)] private static extern IntPtr CreateToolhelp32Snapshot(uint flags,uint pid);
    [DllImport("kernel32.dll",EntryPoint="Process32FirstW",CharSet=CharSet.Unicode)] private static extern bool ProcessFirst(IntPtr snapshot,ref ProcessEntry entry);
    [DllImport("kernel32.dll",EntryPoint="Process32NextW",CharSet=CharSet.Unicode)] private static extern bool ProcessNext(IntPtr snapshot,ref ProcessEntry entry);
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr handle);
    [DllImport("user32.dll")] private static extern bool EnumWindows(WindowCallback callback,IntPtr parameter);
    [DllImport("user32.dll")] private static extern bool EnumChildWindows(IntPtr parent,WindowCallback callback,IntPtr parameter);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
    [DllImport("user32.dll",EntryPoint="GetClassNameW",CharSet=CharSet.Unicode)] private static extern int GetClassName(IntPtr window,StringBuilder value,int count);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
    public static ProcessRecord[] Processes(uint root) {
        var all=new List<ProcessRecord>(); var snapshot=CreateToolhelp32Snapshot(2,0);
        if(snapshot==new IntPtr(-1))throw new InvalidOperationException("Process snapshot failed: "+Marshal.GetLastWin32Error());
        try {var entry=new ProcessEntry{size=(uint)Marshal.SizeOf(typeof(ProcessEntry))};if(ProcessFirst(snapshot,ref entry))do{all.Add(new ProcessRecord{pid=entry.pid,parentPid=entry.parent,name=entry.name});}while(ProcessNext(snapshot,ref entry));}
        finally {CloseHandle(snapshot);}
        var selected=new HashSet<uint>{root}; bool changed;do{changed=false;foreach(var p in all)if(selected.Contains(p.parentPid)&&selected.Add(p.pid))changed=true;}while(changed);
        return all.FindAll(p=>selected.Contains(p.pid)).ToArray();
    }
    public static WindowRecord[] Windows(ProcessRecord[] processes) {
        var pids=new HashSet<uint>();foreach(var p in processes)pids.Add(p.pid);
        var records=new List<WindowRecord>();var seen=new HashSet<IntPtr>();
        WindowCallback collect=(window,parameter)=>{uint pid;GetWindowThreadProcessId(window,out pid);if(pids.Contains(pid)&&records.Count<128&&seen.Add(window)){var name=new StringBuilder(256);GetClassName(window,name,name.Capacity);records.Add(new WindowRecord{handle=window.ToInt64().ToString("X"),className=name.ToString(),pid=pid,visible=IsWindowVisible(window)});}return records.Count<128;};
        EnumWindows((window,parameter)=>{uint pid;GetWindowThreadProcessId(window,out pid);if(pids.Contains(pid)){collect(window,IntPtr.Zero);EnumChildWindows(window,collect,IntPtr.Zero);}return records.Count<128;},IntPtr.Zero);
        return records.ToArray();
    }
}
'@
$processes=@([GalleryStartupObservation]::Processes([uint32]$AppProcessId))
$windows=@([GalleryStartupObservation]::Windows($processes))
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
@{result='observed';kind='windows-native-startup';observerPid=$PID;targetPid=$AppProcessId;rootPresent=@($processes | Where-Object pid -eq $AppProcessId).Count -eq 1;processes=$processes;windows=$windows;elapsedMilliseconds=$clock.ElapsedMilliseconds;basis='PID-attributed process tree and HWND metadata only; no input, foreground changes or UI Automation; diagnostic data does not establish driver ownership'} | ConvertTo-Json -Depth 6 -Compress
