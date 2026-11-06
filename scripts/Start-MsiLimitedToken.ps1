<#
.SYNOPSIS
    Launch the ordinary MSI UI using the isolated administrator's actual linked limited token.
.DESCRIPTION
    Diagnostic/test fixture only. Requires an existing UAC split token, retains
    the same account and desktop session, records native token types and waits
    for the actual MSI client. Console creation is disabled. This does not
    simulate or certify a Windows client or an attended consent prompt.
#>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$MsiFile,[Parameter(Mandatory=$true)][string]$LogPath)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:GALLERY_ISOLATED_DESKTOP -ne '1') { throw 'Limited-token MSI input requires isolated CI' }
if (![IO.Path]::IsPathFullyQualified($MsiFile) -or ![IO.Path]::IsPathFullyQualified($LogPath) -or $MsiFile.Contains('"') -or $LogPath.Contains('"')) { throw 'Absolute unquoted MSI/log paths required' }
Add-Type @'
using System;using System.Text;using System.ComponentModel;using System.Runtime.InteropServices;
public static class GalleryLimitedMsi {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct Startup {public int size;public string reserved,desktop,title;public int x,y,width,height,xchars,ychars,fill,flags;public short show,reservedSize;public IntPtr reservedPointer,input,output,error;}
 [StructLayout(LayoutKind.Sequential)] struct ProcessInfo {public IntPtr process,thread;public uint pid,tid;}
 [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool OpenProcessToken(IntPtr process,uint access,out IntPtr token);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool GetTokenInformation(IntPtr token,int kind,IntPtr value,int bytes,out int needed);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool DuplicateTokenEx(IntPtr token,uint access,IntPtr attributes,int impersonation,int type,out IntPtr copy);
 [DllImport("advapi32.dll",SetLastError=true,CharSet=CharSet.Unicode)] static extern bool CreateProcessWithTokenW(IntPtr token,uint logon,string application,StringBuilder command,uint flags,IntPtr environment,string directory,ref Startup startup,out ProcessInfo process);
 [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process,out uint code);
 static int Value(IntPtr token,int kind) {IntPtr p=Marshal.AllocHGlobal(4);try{int n;if(!GetTokenInformation(token,kind,p,4,out n))throw new Win32Exception();return Marshal.ReadInt32(p);}finally{Marshal.FreeHGlobal(p);}}
 public static uint Run(string application,string msi,string log) {
  IntPtr full=IntPtr.Zero,limited=IntPtr.Zero,primary=IntPtr.Zero;ProcessInfo child=new ProcessInfo();
  try {
   if(!OpenProcessToken(GetCurrentProcess(),0x000b,out full))throw new Win32Exception();
   int fullType=Value(full,18);if(fullType!=2)throw new Exception("Actual UAC full token required, got "+fullType);
   IntPtr p=Marshal.AllocHGlobal(IntPtr.Size);try{int n;if(!GetTokenInformation(full,19,p,IntPtr.Size,out n))throw new Win32Exception();limited=Marshal.ReadIntPtr(p);}finally{Marshal.FreeHGlobal(p);}
   int limitedType=Value(limited,18),elevated=Value(limited,20);if(limitedType!=3||elevated!=0)throw new Exception("Actual linked limited token required");
   using(var a=new System.Security.Principal.WindowsIdentity(full))using(var b=new System.Security.Principal.WindowsIdentity(limited)){if(a.User.Value!=b.User.Value)throw new Exception("Linked account differs");}
   if(!DuplicateTokenEx(limited,0x02000000,IntPtr.Zero,2,1,out primary))throw new Win32Exception();
   var startup=new Startup();startup.size=Marshal.SizeOf(startup);
   var command=new StringBuilder("\""+application+"\" /i \""+msi+"\" /norestart /L*v \""+log+"\"");
   if(command.Length>=1024)throw new Exception("Credentialed native command exceeds its bound");
   if(!CreateProcessWithTokenW(primary,0,application,command,0x08000400,IntPtr.Zero,System.IO.Path.GetDirectoryName(msi),ref startup,out child))throw new Win32Exception();
   IntPtr actual=IntPtr.Zero;try{if(!OpenProcessToken(child.process,8,out actual))throw new Win32Exception();if(Value(actual,18)!=3||Value(actual,20)!=0)throw new Exception("Launched client did not retain its actual limited token");using(var a=new System.Security.Principal.WindowsIdentity(full))using(var b=new System.Security.Principal.WindowsIdentity(actual)){if(a.User.Value!=b.User.Value)throw new Exception("Launched client account differs");if(new System.Security.Principal.WindowsPrincipal(b).IsInRole(System.Security.Principal.WindowsBuiltInRole.Administrator))throw new Exception("Launched client is an effective administrator");}}finally{if(actual!=IntPtr.Zero)CloseHandle(actual);}
   Console.WriteLine("{\"kind\":\"actual-linked-limited-msi-client\",\"pid\":"+child.pid+",\"fullTokenType\":"+fullType+",\"clientTokenType\":"+limitedType+",\"clientElevated\":false,\"sameAccount\":true}");
   if(WaitForSingleObject(child.process,300000)!=0)throw new Exception("Incomplete limited-token MSI client; no native terminal exit");
   uint code;if(!GetExitCodeProcess(child.process,out code))throw new Win32Exception();return code;
  } finally {foreach(var h in new[]{child.thread,child.process,primary,limited,full})if(h!=IntPtr.Zero)CloseHandle(h);}
 }
}
'@
$result=[GalleryLimitedMsi]::Run((Join-Path $env:SystemRoot 'System32\msiexec.exe'),$MsiFile,$LogPath)
exit $result
