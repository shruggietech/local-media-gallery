// SPDX-License-Identifier: Apache-2.0
//go:build windows

package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"os"
	"os/exec"
	"strings"
	"unicode/utf16"
)

// The Vista-style folder dialog (IFileOpenDialog) is reached through PowerShell so the
// binary stays pure Go with no cgo.
const pickScript = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class LmgPick {
  [ComImport, Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")] class FileOpenDialogCom {}
  [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IShellItem {
    void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
    void GetParent(out IShellItem ppsi);
    void GetDisplayName(uint sigdnName, [MarshalAs(UnmanagedType.LPWStr)] out string name);
    void GetAttributes(uint mask, out uint attr);
    void Compare(IShellItem psi, uint hint, out int order);
  }
  [ComImport, Guid("42F85136-DB7E-439C-85F1-E4075D135FC8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IFileDialog {
    [PreserveSig] int Show(IntPtr parent);
    void SetFileTypes(uint c, IntPtr t);
    void SetFileTypeIndex(uint i);
    void GetFileTypeIndex(out uint i);
    void Advise(IntPtr p, out uint c);
    void Unadvise(uint c);
    void SetOptions(uint o);
    void GetOptions(out uint o);
    void SetDefaultFolder(IShellItem s);
    void SetFolder(IShellItem s);
    void GetFolder(out IShellItem s);
    void GetCurrentSelection(out IShellItem s);
    void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string n);
    void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string n);
    void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string t);
    void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string t);
    void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string t);
    void GetResult(out IShellItem s);
  }
  [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
  static extern void SHCreateItemFromParsingName(string path, IntPtr pbc, ref Guid riid, out IShellItem item);
  public static string Pick(string initial, string title, IntPtr owner) {
    var dlg = (IFileDialog)new FileOpenDialogCom();
    uint opts; dlg.GetOptions(out opts);
    dlg.SetOptions(opts | 0x20 | 0x40);
    dlg.SetTitle(title);
    if (!string.IsNullOrEmpty(initial)) {
      try {
        Guid g = new Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE");
        IShellItem it; SHCreateItemFromParsingName(initial, IntPtr.Zero, ref g, out it);
        dlg.SetFolder(it);
      } catch {}
    }
    if (dlg.Show(owner) != 0) return "";
    IShellItem res; dlg.GetResult(out res);
    string path; res.GetDisplayName(0x80058000, out path);
    return path;
  }
}
'@
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [Text.Encoding]::UTF8
# An invisible top-most owner keeps the dialog in front of the app window instead of behind it.
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
$owner.ShowInTaskbar = $false
$owner.FormBorderStyle = 'None'
$owner.StartPosition = 'CenterScreen'
$owner.Size = New-Object System.Drawing.Size(1, 1)
$owner.Opacity = 0
$owner.Show()
$owner.Activate()
try {
  [Console]::Out.Write([LmgPick]::Pick($env:LMG_INITIAL, 'Choose A Media Folder', $owner.Handle))
} finally { $owner.Dispose() }
`

func pickFolder(ctx context.Context, initial string) (string, error) {
	u := utf16.Encode([]rune(pickScript))
	b := make([]byte, 0, len(u)*2)
	for _, c := range u {
		b = append(b, byte(c), byte(c>>8))
	}
	enc := base64.StdEncoding.EncodeToString(b)
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-STA", "-ExecutionPolicy", "Bypass", "-EncodedCommand", enc)
	cmd.Env = append(os.Environ(), "LMG_INITIAL="+initial)
	hide(cmd)
	var out, errb bytes.Buffer
	cmd.Stdout, cmd.Stderr = &out, &errb
	if err := cmd.Run(); err != nil {
		if ctx.Err() != nil {
			return "", ctx.Err()
		}
		return "", errPickUnavailable
	}
	return strings.TrimPrefix(out.String(), "\ufeff"), nil
}
