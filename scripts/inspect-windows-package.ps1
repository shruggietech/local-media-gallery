<#
.SYNOPSIS
    Inspect candidate PE, MSI and native Unicode shortcut metadata.
.DESCRIPTION
    Read-only build evidence, intended for isolated Windows qualification. Does not
    install software, start a browser, use the clipboard or alter the registry.
    Embedded and delay import directories are both audited; signing is reported
    independently from recipient trust prompts and clean-machine qualification.
.PARAMETER File
    Absolute PE, MSI or shortcut file to inspect. Alias: f.
.PARAMETER Help
    Display detailed help. Alias: h.
.EXAMPLE
    ./inspect-windows-package.ps1 -File C:/candidate/setup.exe
    Inspect a candidate entrypoint.
.EXAMPLE
    ./inspect-windows-package.ps1 -f C:/candidate/MicrosoftEdgeWebview2Setup.exe
    Inspect the exact vendor bootstrapper before execution.
.EXAMPLE
    ./inspect-windows-package.ps1 -f 'C:/candidate/Local Media Gallery.lnk'
    Read the actual Unicode shortcut target without resolving or launching it.
.OUTPUTS
    One JSON object with PE identity, MSI identity or Unicode shortcut metadata.
#>
[CmdletBinding(SupportsShouldProcess=$false,ConfirmImpact='None',DefaultParameterSetName='Default')]
Param(
    [Parameter(Mandatory=$true,ParameterSetName='Default')][Alias('f')][string]$File,
    [Parameter(Mandatory=$true,ParameterSetName='HelpText')][Alias('h')][switch]$Help
)
#_______________________________________________________________________________
## Declare Functions

    function Get-ImageOffset {
        [CmdletBinding()]
        Param([Parameter(Mandatory=$true)][uint32]$Address)
        for ($i=0; $i -lt $sectionCount; $i++) {
            $at=$sectionTable+$i*40
            $start=[BitConverter]::ToUInt32($data,$at+12)
            $length=[Math]::Max([BitConverter]::ToUInt32($data,$at+8),[BitConverter]::ToUInt32($data,$at+16))
            if ($Address -ge $start -and $Address -lt $start+$length) { return [int]([BitConverter]::ToUInt32($data,$at+20)+$Address-$start) }
        }
        throw 'PE address is outside sections'
    }
    function Get-ImageImport {
        [CmdletBinding()]
        Param([Parameter(Mandatory=$true)][int]$Index,[Parameter(Mandatory=$true)][int]$Stride,[Parameter(Mandatory=$true)][int]$NameOffset)
        $address=[BitConverter]::ToUInt32($data,$directories+$Index*8)
        if ($address -eq 0) { return @() }
        $names=@()
        for ($at=(Get-ImageOffset $address); $at+$Stride -le $data.Length; $at+=$Stride) {
            $name=[BitConverter]::ToUInt32($data,$at+$NameOffset)
            if ($name -eq 0) { break }
            $p=Get-ImageOffset $name
            $end=[Array]::IndexOf($data,[byte]0,$p)
            if ($end -lt $p -or $end-$p -gt 512) { throw 'Invalid import name' }
            $names+= [Text.Encoding]::ASCII.GetString($data,$p,$end-$p)
        }
        return $names
    }
#_______________________________________________________________________________
## Declare Variables and Arrays

    $ThisScriptPath=$MyInvocation.MyCommand.Path

#_______________________________________________________________________________
## Execute Operations

    if (($Help) -or ($PSCmdlet.ParameterSetName -eq 'HelpText')) { Get-Help $ThisScriptPath -Detailed; exit 0 }
    $ErrorActionPreference='Stop'
    try {
        if ([IO.Path]::GetExtension($File) -eq '.lnk') {
            Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;using System.Runtime.InteropServices.ComTypes;
[ComImport,Guid("000214F9-0000-0000-C000-000000000046"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface CandidateShellLinkW {
 [PreserveSig] int GetPath([Out,MarshalAs(UnmanagedType.LPWStr)] StringBuilder value,int count,IntPtr data,uint flags);
 [PreserveSig] int GetIDList(out IntPtr value);
 [PreserveSig] int SetIDList(IntPtr value);
 [PreserveSig] int GetDescription([Out,MarshalAs(UnmanagedType.LPWStr)] StringBuilder value,int count);
 [PreserveSig] int SetDescription([MarshalAs(UnmanagedType.LPWStr)] string value);
 [PreserveSig] int GetWorkingDirectory([Out,MarshalAs(UnmanagedType.LPWStr)] StringBuilder value,int count);
 [PreserveSig] int SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string value);
 [PreserveSig] int GetArguments([Out,MarshalAs(UnmanagedType.LPWStr)] StringBuilder value,int count);
 [PreserveSig] int SetArguments([MarshalAs(UnmanagedType.LPWStr)] string value);
 [PreserveSig] int GetHotkey(out short value);
 [PreserveSig] int SetHotkey(short value);
 [PreserveSig] int GetShowCmd(out int value);
 [PreserveSig] int SetShowCmd(int value);
 [PreserveSig] int GetIconLocation([Out,MarshalAs(UnmanagedType.LPWStr)] StringBuilder value,int count,out int index);
 [PreserveSig] int SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string value,int index);
 [PreserveSig] int SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string value,uint reserved);
 [PreserveSig] int Resolve(IntPtr window,uint flags);
 [PreserveSig] int SetPath([MarshalAs(UnmanagedType.LPWStr)] string value);
}
public static class CandidateShortcut {
 public static string[] Read(string file) {
  object instance=Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("00021401-0000-0000-C000-000000000046")));
  try {((IPersistFile)instance).Load(file,0);var link=(CandidateShellLinkW)instance;
   var target=new StringBuilder(32768);var arguments=new StringBuilder(32768);var directory=new StringBuilder(32768);
   Marshal.ThrowExceptionForHR(link.GetPath(target,target.Capacity,IntPtr.Zero,0));
   Marshal.ThrowExceptionForHR(link.GetArguments(arguments,arguments.Capacity));
   Marshal.ThrowExceptionForHR(link.GetWorkingDirectory(directory,directory.Capacity));
   return new[]{target.ToString(),arguments.ToString(),directory.ToString()};
  } finally {Marshal.FinalReleaseComObject(instance);}
 }
}
'@
            $actual=[CandidateShortcut]::Read($File)
            @{path=$File;target=$actual[0];arguments=$actual[1];workingDirectory=$actual[2]} | ConvertTo-Json -Compress
            exit 0
        }
        if ([IO.Path]::GetExtension($File) -eq '.msi') {
            $engine=New-Object -ComObject WindowsInstaller.Installer
            $database=$engine.OpenDatabase($File,0)
            $properties=@{}
            $view=$database.OpenView('SELECT `Property`,`Value` FROM `Property`')
            $view.Execute()
            while ($null -ne ($row=$view.Fetch())) { $properties[$row.StringData(1)]=$row.StringData(2) }
            $summary=$database.SummaryInformation(0)
            @{productCode=$properties.ProductCode;version=$properties.ProductVersion;manufacturer=$properties.Manufacturer;allUsers=$properties.ALLUSERS;packageCode=$summary.Property(9);template=$summary.Property(7)} | ConvertTo-Json -Compress
            exit 0
        }
        # Map image resources as data, without running entrypoints or DllMain.
        Add-Type @'
using System;using System.IO;using System.Xml;using System.Runtime.InteropServices;
public static class CandidateManifest {
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr LoadLibraryExW(string path,IntPtr file,uint flags);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindResourceW(IntPtr module,IntPtr name,IntPtr type);
 [DllImport("kernel32.dll")] static extern uint SizeofResource(IntPtr module,IntPtr resource);
 [DllImport("kernel32.dll")] static extern IntPtr LoadResource(IntPtr module,IntPtr resource);
 [DllImport("kernel32.dll")] static extern IntPtr LockResource(IntPtr resource);
 [DllImport("kernel32.dll")] static extern bool FreeLibrary(IntPtr module);
 public static string Level(string path) {
  IntPtr module=LoadLibraryExW(path,IntPtr.Zero,0x22);if(module==IntPtr.Zero)throw new Exception("Read-only PE resource mapping failed: "+Marshal.GetLastWin32Error());
  try {IntPtr resource=FindResourceW(module,(IntPtr)1,(IntPtr)24);if(resource==IntPtr.Zero)resource=FindResourceW(module,(IntPtr)2,(IntPtr)24);if(resource==IntPtr.Zero)return "";
   uint length=SizeofResource(module,resource);if(length==0||length>1048576)throw new Exception("Manifest resource size bound");byte[] bytes=new byte[length];IntPtr address=LockResource(LoadResource(module,resource));if(address==IntPtr.Zero)throw new Exception("Manifest resource unavailable");Marshal.Copy(address,bytes,0,(int)length);
   var settings=new XmlReaderSettings{DtdProcessing=DtdProcessing.Prohibit,XmlResolver=null};using(var reader=XmlReader.Create(new MemoryStream(bytes),settings)){while(reader.Read())if(reader.NodeType==XmlNodeType.Element&&reader.LocalName=="requestedExecutionLevel")return reader.GetAttribute("level")??"";}return "";
  } finally {FreeLibrary(module);}
 }
}
'@
        $data=[IO.File]::ReadAllBytes($File)
        $pe=[BitConverter]::ToUInt32($data,0x3c)
        if ([BitConverter]::ToUInt32($data,$pe) -ne 0x4550) { throw 'Invalid PE signature' }
        $sectionCount=[BitConverter]::ToUInt16($data,$pe+6)
        $optional=$pe+24
        $sectionTable=$optional+[BitConverter]::ToUInt16($data,$pe+20)
        $directories=$optional+$(if ([BitConverter]::ToUInt16($data,$optional) -eq 0x20b) {112} else {96})
        $signature=Get-AuthenticodeSignature -LiteralPath $File
        [ordered]@{
            machine=[BitConverter]::ToUInt16($data,$pe+4)
            imports=@(Get-ImageImport -Index 1 -Stride 20 -NameOffset 12)
            delayImports=@(Get-ImageImport -Index 13 -Stride 32 -NameOffset 4)
            fileVersion=[Diagnostics.FileVersionInfo]::GetVersionInfo($File).FileVersion
            requestedExecutionLevel=[CandidateManifest]::Level($File)
            signature=[ordered]@{ status=$signature.Status.ToString(); subject=$signature.SignerCertificate.Subject; thumbprint=$signature.SignerCertificate.Thumbprint }
        } | ConvertTo-Json -Depth 5 -Compress
    } catch { Write-Error $_; exit 1 }

#_______________________________________________________________________________
## End of script
