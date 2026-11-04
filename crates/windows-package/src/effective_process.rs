// SPDX-License-Identifier: Apache-2.0
//! Hidden, noninteractive child processes retain the effective caller's token.
use std::{
    ffi::{OsStr, OsString, c_void},
    os::windows::{ffi::OsStrExt, io::AsRawHandle, process::CommandExt},
    path::Path,
    process::{Child, Command, Stdio},
    ptr,
    time::{Duration, Instant},
};
use windows::Win32::Foundation::HANDLE;
#[repr(C)]
struct Startup {
    cb: u32,
    reserved: *mut u16,
    desktop: *mut u16,
    title: *mut u16,
    x: u32,
    y: u32,
    xsize: u32,
    ysize: u32,
    xchars: u32,
    ychars: u32,
    fill: u32,
    flags: u32,
    show: u16,
    reserved2: u16,
    reserved_ptr: *mut u8,
    input: *mut c_void,
    output: *mut c_void,
    error: *mut c_void,
}
#[repr(C)]
struct StartupEx {
    start: Startup,
    attributes: *mut c_void,
}
#[repr(C)]
struct ProcessInfo {
    process: *mut c_void,
    thread: *mut c_void,
    pid: u32,
    tid: u32,
}
#[repr(C)]
struct Security {
    length: u32,
    descriptor: *mut c_void,
    inherit: i32,
}
#[link(name = "kernel32")]
unsafe extern "system" {
    fn GetCurrentThread() -> *mut c_void;
    fn GetCurrentProcess() -> *mut c_void;
    fn CloseHandle(h: *mut c_void) -> i32;
    fn WaitForSingleObject(h: *mut c_void, ms: u32) -> u32;
    fn GetExitCodeProcess(h: *mut c_void, code: *mut u32) -> i32;
    fn TerminateProcess(h: *mut c_void, code: u32) -> i32;
    fn CreatePipe(
        read: *mut *mut c_void,
        write: *mut *mut c_void,
        security: *const Security,
        size: u32,
    ) -> i32;
    fn SetHandleInformation(h: *mut c_void, mask: u32, flags: u32) -> i32;
    fn PeekNamedPipe(
        h: *mut c_void,
        buffer: *mut c_void,
        size: u32,
        read: *mut u32,
        available: *mut u32,
        left: *mut u32,
    ) -> i32;
    fn ReadFile(
        h: *mut c_void,
        buffer: *mut c_void,
        size: u32,
        read: *mut u32,
        overlapped: *mut c_void,
    ) -> i32;
    fn CreateFileW(
        path: *const u16,
        access: u32,
        share: u32,
        security: *const Security,
        creation: u32,
        flags: u32,
        template: *mut c_void,
    ) -> *mut c_void;
    fn InitializeProcThreadAttributeList(
        list: *mut c_void,
        count: u32,
        flags: u32,
        size: *mut usize,
    ) -> i32;
    fn UpdateProcThreadAttribute(
        list: *mut c_void,
        flags: u32,
        key: usize,
        value: *mut c_void,
        size: usize,
        previous: *mut c_void,
        returned: *mut usize,
    ) -> i32;
    fn DeleteProcThreadAttributeList(list: *mut c_void);
}
#[link(name = "advapi32")]
unsafe extern "system" {
    fn OpenThreadToken(
        thread: *mut c_void,
        access: u32,
        self_: i32,
        token: *mut *mut c_void,
    ) -> i32;
    fn OpenProcessToken(process: *mut c_void, access: u32, token: *mut *mut c_void) -> i32;
    fn DuplicateTokenEx(
        token: *mut c_void,
        access: u32,
        attributes: *const c_void,
        level: i32,
        kind: i32,
        new: *mut *mut c_void,
    ) -> i32;
    fn RevertToSelf() -> i32;
    fn SetThreadToken(thread: *mut *mut c_void, token: *mut c_void) -> i32;
    fn CreateProcessAsUserW(
        token: *mut c_void,
        app: *const u16,
        command: *mut u16,
        pa: *const c_void,
        ta: *const c_void,
        inherit: i32,
        flags: u32,
        environment: *const c_void,
        directory: *const u16,
        startup: *const Startup,
        info: *mut ProcessInfo,
    ) -> i32;
}
#[link(name = "userenv")]
unsafe extern "system" {
    fn CreateEnvironmentBlock(
        environment: *mut *mut c_void,
        token: *mut c_void,
        inherit: i32,
    ) -> i32;
    fn DestroyEnvironmentBlock(environment: *mut c_void) -> i32;
}
fn error() -> String {
    std::io::Error::last_os_error().to_string()
}
fn wide(s: impl AsRef<OsStr>) -> Vec<u16> {
    s.as_ref().encode_wide().chain(Some(0)).collect()
}
struct Handle(*mut c_void);
impl Drop for Handle {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.0);
        }
    }
}
pub(crate) struct Token {
    handle: Handle,
    impersonated: bool,
}
impl Token {
    pub(crate) fn as_handle(&self) -> Option<HANDLE> {
        Some(HANDLE(self.handle.0))
    }
}
// SHGetKnownFolderPath requires QUERY | IMPERSONATE and may require DUPLICATE.
pub(crate) fn effective_token() -> Result<Token, String> {
    let mut h = ptr::null_mut();
    let impersonated = unsafe { OpenThreadToken(GetCurrentThread(), 0xe, 1, &mut h) } != 0;
    if !impersonated {
        if std::io::Error::last_os_error().raw_os_error() != Some(1008) {
            return Err(error());
        }
        if unsafe { OpenProcessToken(GetCurrentProcess(), 0xe, &mut h) } == 0 {
            return Err(error());
        }
    }
    Ok(Token {
        handle: Handle(h),
        impersonated,
    })
}
struct Environment(*mut c_void);
impl Drop for Environment {
    fn drop(&mut self) {
        unsafe {
            DestroyEnvironmentBlock(self.0);
        }
    }
}
struct Attributes(*mut c_void);
impl Drop for Attributes {
    fn drop(&mut self) {
        unsafe {
            DeleteProcThreadAttributeList(self.0);
        }
    }
}
fn command_line(file: &Path, args: &[OsString]) -> Result<Vec<u16>, String> {
    let mut output = Vec::new();
    for value in std::iter::once(file.as_os_str()).chain(args.iter().map(OsString::as_os_str)) {
        if !output.is_empty() {
            output.push(32);
        }
        output.push(34);
        let mut slashes = 0;
        for c in value.encode_wide() {
            if c == 0 {
                return Err("A child argument contains NUL".into());
            }
            if c == 92 {
                slashes += 1;
                continue;
            }
            if c == 34 {
                output.extend(std::iter::repeat_n(92, slashes * 2 + 1));
            } else {
                output.extend(std::iter::repeat_n(92, slashes));
            }
            slashes = 0;
            output.push(c);
        }
        output.extend(std::iter::repeat_n(92, slashes * 2));
        output.push(34);
    }
    output.push(0);
    Ok(output)
}
enum Inner {
    Standard(Child),
    AsUser(Handle),
}
pub(crate) struct EffectiveChild {
    inner: Inner,
    pid: u32,
    output: Option<Handle>,
}
impl EffectiveChild {
    fn handle(&self) -> *mut c_void {
        match &self.inner {
            Inner::Standard(c) => c.as_raw_handle(),
            Inner::AsUser(h) => h.0,
        }
    }
    pub(crate) fn id(&self) -> u32 {
        self.pid
    }
    pub(crate) fn poll(&self, ms: u32) -> Result<Option<u32>, String> {
        match unsafe { WaitForSingleObject(self.handle(), ms) } {
            0 => {
                let mut code = 0;
                if unsafe { GetExitCodeProcess(self.handle(), &mut code) } == 0 {
                    return Err(error());
                }
                Ok(Some(code))
            }
            258 => Ok(None),
            _ => Err(error()),
        }
    }
    fn terminate_probe(&self) {
        unsafe {
            TerminateProcess(self.handle(), 2);
            WaitForSingleObject(self.handle(), 3000);
        }
    }
    fn drain(&self, bytes: &mut Vec<u8>) -> Result<(), String> {
        let Some(output) = &self.output else {
            return Ok(());
        };
        loop {
            let mut available = 0;
            if unsafe {
                PeekNamedPipe(
                    output.0,
                    ptr::null_mut(),
                    0,
                    ptr::null_mut(),
                    &mut available,
                    ptr::null_mut(),
                )
            } == 0
            {
                if std::io::Error::last_os_error().raw_os_error() == Some(109) {
                    return Ok(());
                }
                return Err(error());
            }
            if available == 0 {
                return Ok(());
            }
            if bytes.len() + available as usize > 16384 {
                return Err("Oversized state compatibility output".into());
            }
            let offset = bytes.len();
            bytes.resize(offset + available as usize, 0);
            let mut read = 0;
            if unsafe {
                ReadFile(
                    output.0,
                    bytes[offset..].as_mut_ptr().cast(),
                    available,
                    &mut read,
                    ptr::null_mut(),
                )
            } == 0
            {
                return Err(error());
            }
            bytes.truncate(offset + read as usize);
        }
    }
    pub(crate) fn probe(self) -> Result<Vec<u8>, String> {
        let started = Instant::now();
        let mut bytes = Vec::new();
        loop {
            if let Err(e) = self.drain(&mut bytes) {
                self.terminate_probe();
                return Err(e);
            }
            if let Some(code) = self.poll(50)? {
                self.drain(&mut bytes)?;
                if code != 0 {
                    return Err(format!(
                        "Writer state check failed ({code}): {}",
                        String::from_utf8_lossy(&bytes)
                    ));
                }
                return Ok(bytes);
            }
            if started.elapsed() > Duration::from_secs(30) {
                self.terminate_probe();
                return Err(
                    "Writer state check timed out; application installation is rolling back".into(),
                );
            }
        }
    }
}
pub(crate) fn spawn(
    file: &Path,
    args: &[OsString],
    capture: bool,
) -> Result<EffectiveChild, String> {
    let token = effective_token()?;
    if !token.impersonated {
        let mut child = Command::new(file)
            .args(args)
            .creation_flags(0x08000000)
            .stdin(Stdio::null())
            .stdout(if capture {
                Stdio::piped()
            } else {
                Stdio::null()
            })
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| e.to_string())?;
        // Transfer the owned pipe read handle into the bounded observer.
        let output = if capture {
            use std::os::windows::io::IntoRawHandle;
            let pipe = child.stdout.take().ok_or("Missing child pipe")?;
            Some(Handle(pipe.into_raw_handle()))
        } else {
            None
        };
        let pid = child.id();
        return Ok(EffectiveChild {
            inner: Inner::Standard(child),
            pid,
            output,
        });
    }
    let mut primary = ptr::null_mut();
    if unsafe { DuplicateTokenEx(token.handle.0, 0x02000000, ptr::null(), 2, 1, &mut primary) } == 0
    {
        return Err(error());
    }
    let primary = Handle(primary);
    let mut env = ptr::null_mut();
    if unsafe { CreateEnvironmentBlock(&mut env, primary.0, 0) } == 0 {
        return Err(error());
    }
    let environment = Environment(env);
    let mut start: StartupEx = unsafe { std::mem::zeroed() };
    start.start.cb = std::mem::size_of::<Startup>() as u32;
    start.start.flags = 1;
    start.start.show = 0;
    let mut attribute_buffer = Vec::<usize>::new();
    let mut attributes = None;
    let mut output = None;
    let mut write_pipe = None;
    let mut null_file = None;
    let mut inherited_handles = Vec::<*mut c_void>::new();
    if capture {
        let security = Security {
            length: std::mem::size_of::<Security>() as u32,
            descriptor: ptr::null_mut(),
            inherit: 1,
        };
        let (mut read, mut write) = (ptr::null_mut(), ptr::null_mut());
        if unsafe { CreatePipe(&mut read, &mut write, &security, 0) } == 0 {
            return Err(error());
        }
        output = Some(Handle(read));
        write_pipe = Some(Handle(write));
        if unsafe { SetHandleInformation(read, 1, 0) } == 0 {
            return Err(error());
        }
        let null = unsafe {
            CreateFileW(
                wide("NUL").as_ptr(),
                0xc0000000,
                3,
                &security,
                3,
                0x80,
                ptr::null_mut(),
            )
        };
        if null as isize == -1 {
            return Err(error());
        }
        null_file = Some(Handle(null));
        let mut size = 0;
        unsafe {
            InitializeProcThreadAttributeList(ptr::null_mut(), 1, 0, &mut size);
        }
        if size == 0 || size > 65536 {
            return Err("Invalid process handle-list size".into());
        }
        attribute_buffer.resize(size.div_ceil(std::mem::size_of::<usize>()), 0);
        let list = attribute_buffer.as_mut_ptr().cast();
        if unsafe { InitializeProcThreadAttributeList(list, 1, 0, &mut size) } == 0 {
            return Err(error());
        }
        attributes = Some(Attributes(list));
        inherited_handles.extend([write, null]);
        if unsafe {
            UpdateProcThreadAttribute(
                list,
                0,
                0x00020002,
                inherited_handles.as_mut_ptr().cast(),
                inherited_handles.len() * std::mem::size_of::<*mut c_void>(),
                ptr::null_mut(),
                ptr::null_mut(),
            )
        } == 0
        {
            return Err(error());
        }
        start.attributes = list;
        start.start.cb = std::mem::size_of::<StartupEx>() as u32;
        start.start.flags |= 0x100;
        start.start.input = null;
        start.start.output = write;
        start.start.error = null;
    }
    let mut command = command_line(file, args)?;
    let application = wide(file);
    let directory = wide(file.parent().ok_or("Missing child directory")?);
    let mut info: ProcessInfo = unsafe { std::mem::zeroed() };
    // The service may use its process privileges to create the captured user's
    // primary-token child. Restore impersonation before any further file work.
    if unsafe { RevertToSelf() } == 0 {
        return Err(error());
    }
    let created = unsafe {
        CreateProcessAsUserW(
            primary.0,
            application.as_ptr(),
            command.as_mut_ptr(),
            ptr::null(),
            ptr::null(),
            i32::from(capture),
            0x08000000 | 0x400 | if capture { 0x80000 } else { 0 },
            environment.0,
            directory.as_ptr(),
            &start.start,
            &mut info,
        )
    };
    let creation_error = std::io::Error::last_os_error();
    let restored = unsafe { SetThreadToken(ptr::null_mut(), token.handle.0) } != 0;
    if created != 0 {
        unsafe {
            CloseHandle(info.thread);
        }
    }
    if !restored {
        if created != 0 {
            unsafe {
                TerminateProcess(info.process, 2);
                WaitForSingleObject(info.process, 3000);
                CloseHandle(info.process);
            }
        }
        return Err("Could not restore installing-user impersonation after child creation".into());
    }
    if created == 0 {
        return Err(format!(
            "Cannot launch as the installing user: {creation_error}"
        ));
    }
    drop(attributes);
    drop(attribute_buffer);
    drop(write_pipe);
    drop(null_file);
    Ok(EffectiveChild {
        inner: Inner::AsUser(Handle(info.process)),
        pid: info.pid,
        output,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn hidden_effective_child_returns_bounded_real_output() {
        let system =
            crate::native::known_folder(&windows::Win32::UI::Shell::FOLDERID_System).unwrap();
        let bytes = spawn(
            &system.join("whoami.exe"),
            &[
                OsString::from("/user"),
                OsString::from("/fo"),
                OsString::from("csv"),
                OsString::from("/nh"),
            ],
            true,
        )
        .unwrap()
        .probe()
        .unwrap();
        assert!(String::from_utf8_lossy(&bytes).contains("S-1-5-"));
    }
    #[test]
    fn windows_argument_quoting_preserves_spaces_quotes_and_trailing_slashes() {
        let line = command_line(
            Path::new("C:\\gallery app.exe"),
            &[
                OsString::from("plain"),
                OsString::from("snow 雪"),
                OsString::from("a\"b"),
                OsString::from("tail\\"),
            ],
        )
        .unwrap();
        let line = String::from_utf16(&line[..line.len() - 1]).unwrap();
        assert!(line.starts_with("\"C:\\gallery app.exe\" \"plain\""));
        assert!(line.contains("\"snow 雪\""));
        assert!(line.contains("a\\\"b"));
        assert!(line.ends_with("tail\\\\\""));
    }
}
