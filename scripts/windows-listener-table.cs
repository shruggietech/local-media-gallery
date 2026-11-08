// SPDX-License-Identifier: Apache-2.0
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Net;
using System.Runtime.InteropServices;

// SDK layouts: MIB_TCPROW_OWNER_PID and MIB_TCP6ROW_OWNER_PID (tcpmib.h).
// Query the listener-only owner table directly, without CIM provider startup.
public static class GalleryListenerTable {
    [StructLayout(LayoutKind.Sequential)] struct Row4 {
        public uint State, LocalAddress, LocalPort, RemoteAddress, RemotePort, OwningProcess;
    }
    [StructLayout(LayoutKind.Sequential)] struct Row6 {
        [MarshalAs(UnmanagedType.ByValArray, SizeConst=16)] public byte[] LocalAddress;
        public uint LocalScope, LocalPort;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst=16)] public byte[] RemoteAddress;
        public uint RemoteScope, RemotePort, State, OwningProcess;
    }
    [StructLayout(LayoutKind.Sequential)] struct Table4 { public uint Count; public Row4 First; }
    [StructLayout(LayoutKind.Sequential)] struct Table6 { public uint Count; public Row6 First; }
    [DllImport("iphlpapi.dll", ExactSpelling=true)]
    static extern uint GetExtendedTcpTable(IntPtr table, ref uint size, [MarshalAs(UnmanagedType.Bool)] bool sorted, uint family, uint tableClass, uint reserved);
    public sealed class Listener {
        public string LocalAddress;
        public uint OwningProcess;
    }
    static int HostPort(uint networkPort) { return (int)(((networkPort & 255) << 8) | ((networkPort >> 8) & 255)); }
    static void Read(int port, uint family, List<Listener> result) {
        uint size=0;
        uint code=GetExtendedTcpTable(IntPtr.Zero,ref size,false,family,3,0); // TCP_TABLE_OWNER_PID_LISTENER
        if(code!=0 && code!=122) throw new Win32Exception((int)code);
        for(int attempt=0;attempt<3;attempt++) {
            if(size<4 || size>16*1024*1024) throw new InvalidOperationException("TCP owner table size is invalid");
            int capacity=checked((int)size);
            IntPtr buffer=Marshal.AllocHGlobal(capacity);
            try {
                code=GetExtendedTcpTable(buffer,ref size,false,family,3,0);
                if(code==122) continue; // A newly added socket can enlarge the table.
                if(code!=0) throw new Win32Exception((int)code);
                int count=Marshal.ReadInt32(buffer);
                int offset=family==2?Marshal.OffsetOf<Table4>("First").ToInt32():Marshal.OffsetOf<Table6>("First").ToInt32();
                int rowSize=family==2?Marshal.SizeOf<Row4>():Marshal.SizeOf<Row6>();
                if(offset>capacity || count<0 || count>(capacity-offset)/rowSize) throw new InvalidOperationException("TCP owner table bounds differ");
                for(int i=0;i<count;i++) {
                    IntPtr row=IntPtr.Add(buffer,checked(offset+i*rowSize));
                    string address;uint owner,state,localPort;
                    if(family==2) {
                        Row4 value=Marshal.PtrToStructure<Row4>(row);
                        address=new IPAddress(BitConverter.GetBytes(value.LocalAddress)).ToString();
                        owner=value.OwningProcess;state=value.State;localPort=value.LocalPort;
                    } else {
                        Row6 value=Marshal.PtrToStructure<Row6>(row);
                        address=new IPAddress(value.LocalAddress,value.LocalScope).ToString();
                        owner=value.OwningProcess;state=value.State;localPort=value.LocalPort;
                    }
                    if(state==2 && HostPort(localPort)==port && owner>0 && (address=="127.0.0.1" || address=="0.0.0.0" || address=="::")) result.Add(new Listener{LocalAddress=address,OwningProcess=owner});
                }
                return;
            } finally { Marshal.FreeHGlobal(buffer); }
        }
        throw new InvalidOperationException("TCP owner table did not stabilize within three reads");
    }
    public static Listener[] Listen(int port) {
        if(port<1 || port>65535) throw new ArgumentOutOfRangeException(nameof(port));
        var result=new List<Listener>();Read(port,2,result);Read(port,23,result);return result.ToArray();
    }
}
