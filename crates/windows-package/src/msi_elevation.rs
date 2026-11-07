// SPDX-License-Identifier: Apache-2.0
//! Compatibility for an immutable predecessor's immediate machine action.
//! Called only from the UI sequence, before the installation execution mutex.
use std::{ffi::c_void, os::windows::ffi::OsStringExt, path::Path, ptr};

pub(crate) fn needs_handoff(
    full_ui: bool,
    installed: bool,
    removing: bool,
    recovery: bool,
    legacy_machine: bool,
    elevated: bool,
) -> bool {
    full_ui && !installed && !removing && !recovery && legacy_machine && !elevated
}
pub(crate) fn completed_action(exit: u32) -> Result<(u32, bool), String> {
    match exit {
        0 => Ok((259, false)),
        3010 => Ok((259, true)),
        1602 => Ok((1602, false)),
        code => Err(format!(
            "The authorized installer exited {code}; retain its native diagnostics"
        )),
    }
}
fn parameters(source: &Path, start_menu: bool, command_path: bool) -> Result<Vec<u16>, String> {
    let mut value = "/i ".encode_utf16().collect::<Vec<_>>();
    value.extend(crate::effective_process::quote_argument(
        source.as_os_str(),
    )?);
    value.extend(
        format!(
            " /norestart LMG_STARTMENU={} LMG_PATH={}",
            u8::from(start_menu),
            u8::from(command_path)
        )
        .encode_utf16(),
    );
    value.push(0);
    Ok(value)
}
#[repr(C)]
struct ShellInfo {
    size: u32,
    mask: u32,
    window: *mut c_void,
    verb: *const u16,
    file: *const u16,
    parameters: *const u16,
    directory: *const u16,
    show: i32,
    instance: *mut c_void,
    item: *mut c_void,
    class: *const u16,
    class_key: *mut c_void,
    hot_key: u32,
    icon: *mut c_void,
    process: *mut c_void,
}
#[link(name = "shell32")]
unsafe extern "system" {
    fn ShellExecuteExW(info: *mut ShellInfo) -> i32;
}
#[link(name = "kernel32")]
unsafe extern "system" {
    fn GetSystemDirectoryW(value: *mut u16, size: u32) -> u32;
    fn GetProcessId(process: *mut c_void) -> u32;
    fn GetExitCodeProcess(process: *mut c_void, code: *mut u32) -> i32;
    fn CloseHandle(handle: *mut c_void) -> i32;
}
#[link(name = "ole32")]
unsafe extern "system" {
    fn CoInitializeEx(reserved: *mut c_void, flags: u32) -> i32;
    fn CoUninitialize();
    fn CoWaitForMultipleHandles(
        flags: u32,
        timeout: u32,
        count: u32,
        handles: *const *mut c_void,
        index: *mut u32,
    ) -> i32;
}
struct Process(*mut c_void);
impl Drop for Process {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.0);
        }
    }
}
struct Com(bool);
impl Drop for Com {
    fn drop(&mut self) {
        if self.0 {
            unsafe {
                CoUninitialize();
            }
        }
    }
}

/// Native GUI authorization is intentional. This never launches a console or
/// accepts an executable/verb from MSI properties or process environment.
pub(crate) fn run(
    source: &Path,
    start_menu: bool,
    command_path: bool,
    started: impl FnOnce(u32),
) -> Result<u32, String> {
    let init = unsafe { CoInitializeEx(ptr::null_mut(), 6) };
    // An existing MTA is already initialized; do not uninitialize its ownership.
    if init < 0 && init != 0x80010106u32 as i32 {
        return Err(format!(
            "Cannot initialize native installer authorization: {init:#x}"
        ));
    }
    let _com = Com(init >= 0);
    let mut buffer = vec![0u16; 32768];
    let n = unsafe { GetSystemDirectoryW(buffer.as_mut_ptr(), buffer.len() as u32) };
    if n == 0 || n as usize >= buffer.len() {
        return Err("Cannot resolve the actual system installer directory".into());
    }
    let system = std::path::PathBuf::from(std::ffi::OsString::from_wide(&buffer[..n as usize]))
        .join("msiexec.exe");
    use std::os::windows::ffi::OsStrExt;
    let file = system
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let verb = "runas\0".encode_utf16().collect::<Vec<_>>();
    let arguments = parameters(source, start_menu, command_path)?;
    let mut info: ShellInfo = unsafe { std::mem::zeroed() };
    info.size = std::mem::size_of::<ShellInfo>() as u32;
    info.mask = 0x40 | 0x100 | 0x400; // NOCLOSEPROCESS, NOASYNC, FLAG_NO_UI.
    info.verb = verb.as_ptr();
    info.file = file.as_ptr();
    info.parameters = arguments.as_ptr();
    info.show = 1;
    if unsafe { ShellExecuteExW(&mut info) } == 0 {
        let error = std::io::Error::last_os_error();
        return if error.raw_os_error() == Some(1223) {
            Ok(1602)
        } else {
            Err(format!(
                "Cannot authorize the legacy machine upgrade: {error}"
            ))
        };
    }
    if info.process.is_null() {
        return Err("Native authorization returned no installer process; no replacement outcome is established".into());
    }
    let process = Process(info.process);
    started(unsafe { GetProcessId(process.0) });
    let mut index = 0;
    // Human wizard dwell is not a product timeout. Hosted qualification enforces
    // its independent absolute deadline. Pump COM/window messages while waiting.
    let result = unsafe { CoWaitForMultipleHandles(0x18, u32::MAX, 1, &process.0, &mut index) };
    if result < 0 {
        return Err(format!(
            "Authorized installer outcome is incomplete ({result:#x}); its process may still be active"
        ));
    }
    let mut exit = 0;
    if unsafe { GetExitCodeProcess(process.0, &mut exit) } == 0 || exit == 259 {
        return Err("Authorized installer has no verified terminal exit; do not repeat the operation while it is active".into());
    }
    Ok(exit)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_an_unelevated_ordinary_legacy_machine_ui_gets_a_handoff() {
        assert!(needs_handoff(true, false, false, false, true, false));
        for case in [
            (false, false, false, false, true, false),
            (true, true, false, false, true, false),
            (true, false, true, false, true, false),
            (true, false, false, true, true, false),
            (true, false, false, false, false, false),
            (true, false, false, false, true, true),
        ] {
            assert!(!needs_handoff(
                case.0, case.1, case.2, case.3, case.4, case.5
            ));
        }
    }
    #[test]
    fn cancellation_failure_and_reboot_cannot_be_reported_as_plain_success() {
        assert_eq!(completed_action(0).unwrap(), (259, false));
        assert_eq!(completed_action(3010).unwrap(), (259, true));
        assert_eq!(completed_action(1602).unwrap(), (1602, false));
        for code in [1603, 1618, 1641, 259] {
            assert!(completed_action(code).is_err());
        }
    }
    #[test]
    fn source_arguments_preserve_native_unicode_and_cannot_add_another_property() {
        let p = Path::new(r"C:\download = 雪\Full.msi");
        let value = parameters(p, true, false).unwrap();
        assert_eq!(
            String::from_utf16(&value[..value.len() - 1]).unwrap(),
            "/i \"C:\\download = 雪\\Full.msi\" /norestart LMG_STARTMENU=1 LMG_PATH=0"
        );
        assert!(
            crate::effective_process::quote_argument(std::ffi::OsStr::new("bad\0operand")).is_err()
        );
    }
}
