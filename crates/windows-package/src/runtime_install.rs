// SPDX-License-Identifier: Apache-2.0
//! Offline WebView2 provisioning inside the native MSI transaction.
use crate::{hash, native, private, scratch};
use std::{
    collections::BTreeSet,
    ffi::{OsStr, c_void},
    fs,
    io::{Seek, SeekFrom, Write},
    os::windows::ffi::OsStrExt,
    path::Path,
    ptr,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use windows::Win32::Foundation::HANDLE;
const RUNTIME: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/runtime.exe"));
const RUNTIME_SHA: &str = include_str!(concat!(env!("OUT_DIR"), "/runtime.sha256"));
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
struct ProcessInfo {
    process: *mut c_void,
    thread: *mut c_void,
    pid: u32,
    tid: u32,
}
#[link(name = "kernel32")]
unsafe extern "system" {
    fn GetCurrentThread() -> *mut c_void;
    fn GetCurrentProcess() -> *mut c_void;
    fn CloseHandle(h: *mut c_void) -> i32;
    fn WaitForSingleObject(h: *mut c_void, ms: u32) -> u32;
    fn GetExitCodeProcess(h: *mut c_void, code: *mut u32) -> i32;
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
    fn RegCreateKeyExW(
        root: isize,
        key: *const u16,
        reserved: u32,
        class: *mut u16,
        options: u32,
        access: u32,
        attributes: *const c_void,
        out: *mut isize,
        disposition: *mut u32,
    ) -> i32;
    fn RegOpenCurrentUser(access: u32, out: *mut isize) -> i32;
    fn RegSetValueExW(
        key: isize,
        name: *const u16,
        reserved: u32,
        kind: u32,
        data: *const u8,
        size: u32,
    ) -> i32;
    fn RegCloseKey(key: isize) -> i32;
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
#[link(name = "msi")]
unsafe extern "system" {
    fn MsiGetPropertyW(h: u32, name: *const u16, value: *mut u16, n: *mut u32) -> u32;
    fn MsiCreateRecord(count: u32) -> u32;
    fn MsiRecordSetStringW(r: u32, field: u32, value: *const u16) -> u32;
    fn MsiRecordSetInteger(r: u32, field: u32, value: i32) -> u32;
    fn MsiProcessMessage(h: u32, kind: i32, r: u32) -> i32;
    fn MsiCloseHandle(h: u32) -> u32;
    fn MsiSetMode(h: u32, mode: i32, state: i32) -> u32;
}
fn wide(s: impl AsRef<OsStr>) -> Vec<u16> {
    s.as_ref().encode_wide().chain(Some(0)).collect()
}
fn error() -> String {
    std::io::Error::last_os_error().to_string()
}
pub(crate) struct Token {
    handle: *mut c_void,
    impersonated: bool,
}
impl Token {
    pub(crate) fn as_handle(&self) -> Option<HANDLE> {
        Some(HANDLE(self.handle))
    }
}
impl Drop for Token {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.handle);
        }
    }
}
pub(crate) fn effective_token() -> Result<Token, String> {
    let mut h = ptr::null_mut();
    let impersonated = unsafe { OpenThreadToken(GetCurrentThread(), 0xa, 1, &mut h) } != 0;
    if !impersonated {
        if std::io::Error::last_os_error().raw_os_error() != Some(1008) {
            return Err(error());
        }
        if unsafe { OpenProcessToken(GetCurrentProcess(), 0xa, &mut h) } == 0 {
            return Err(error());
        }
    }
    Ok(Token {
        handle: h,
        impersonated,
    })
}
fn context(h: u32) -> Result<native::DeferredContext, String> {
    let mut b = vec![0u16; 32768];
    let mut n = b.len() as u32;
    let r =
        unsafe { MsiGetPropertyW(h, wide("CustomActionData").as_ptr(), b.as_mut_ptr(), &mut n) };
    if r != 0 {
        return Err(format!("Deferred runtime context: {r}"));
    }
    let text = String::from_utf16(&b[..n as usize]).map_err(|e| e.to_string())?;
    serde_json::from_str(&text).map_err(|e| e.to_string())
}
fn message(h: u32, phase: &str) -> bool {
    unsafe {
        let r = MsiCreateRecord(3);
        MsiRecordSetStringW(r, 1, wide("WebView2").as_ptr());
        MsiRecordSetStringW(r, 2, wide(phase).as_ptr());
        MsiRecordSetStringW(r, 3, wide("[1]").as_ptr());
        let cancel = MsiProcessMessage(h, 0x08000000, r) == 2;
        MsiCloseHandle(r);
        cancel
    }
}
fn progress(h: u32, kind: i32, ticks: i32) -> bool {
    unsafe {
        let r = MsiCreateRecord(3);
        MsiRecordSetInteger(r, 1, kind);
        MsiRecordSetInteger(r, 2, ticks);
        MsiRecordSetInteger(r, 3, 0);
        let cancelled = MsiProcessMessage(h, 0x0a000000, r) == 2;
        MsiCloseHandle(r);
        cancelled
    }
}
fn receipt(
    file: &mut fs::File,
    pid: Option<u32>,
    terminal: bool,
    code: Option<u32>,
) -> Result<(), String> {
    let bytes = serde_json::to_vec(
        &serde_json::json!({"pid":pid,"terminal":terminal,"code":code,"runtimeSha256":RUNTIME_SHA}),
    )
    .map_err(|e| e.to_string())?;
    file.seek(SeekFrom::Start(0))
        .and_then(|_| file.set_len(0))
        .and_then(|_| file.write_all(&bytes))
        .and_then(|_| file.sync_all())
        .map_err(|e| e.to_string())
}
fn save_result(machine: bool, code: u32) -> Result<(), String> {
    let mut user = 0;
    let root = if machine {
        0x80000002u32 as i32 as isize
    } else {
        let r = unsafe { RegOpenCurrentUser(0x20006 | 0x100, &mut user) };
        if r != 0 {
            return Err(format!("Runtime result registry: {r}"));
        }
        user
    };
    let mut key = 0;
    let r = unsafe {
        RegCreateKeyExW(
            root,
            wide("Software\\ShruggieTech\\LocalMediaGallery\\RuntimeReceipts").as_ptr(),
            0,
            ptr::null_mut(),
            0,
            0x20006 | 0x100,
            ptr::null(),
            &mut key,
            ptr::null_mut(),
        )
    };
    if user != 0 {
        unsafe {
            RegCloseKey(user);
        }
    }
    if r != 0 {
        return Err(format!("Runtime receipt creation: {r}"));
    }
    let text = wide(code.to_string());
    let name = hash(crate::PAYLOAD.as_bytes());
    let r = unsafe {
        RegSetValueExW(
            key,
            wide(name).as_ptr(),
            0,
            1,
            text.as_ptr().cast(),
            (text.len() * 2) as u32,
        )
    };
    unsafe {
        RegCloseKey(key);
    }
    if r != 0 {
        return Err(format!("Runtime receipt write: {r}"));
    }
    Ok(())
}
fn run_vendor(file: &Path, h: u32, log: &mut fs::File) -> Result<(u32, bool), String> {
    let token = effective_token()?;
    let mut cancelled = false;
    let started = Instant::now();
    if !token.impersonated {
        use std::os::windows::process::CommandExt;
        let mut child = std::process::Command::new(file)
            .args(["/silent", "/install"])
            .creation_flags(0x08000000)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| e.to_string())?;
        receipt(log, Some(child.id()), false, None)?;
        loop {
            if let Some(code) = child.try_wait().map_err(|e| e.to_string())? {
                let code = code
                    .code()
                    .ok_or("Runtime exited without a native status")?
                    as u32;
                receipt(log, Some(child.id()), true, Some(code))?;
                return Ok((code, cancelled));
            }
            cancelled |= message(
                h,
                if cancelled {
                    "Cancellation requested. Waiting for Microsoft WebView2 to finish before rolling back the application."
                } else {
                    "Installing bundled Microsoft WebView2. This can take a few minutes."
                },
            );
            if started.elapsed() > Duration::from_secs(180) {
                return Err(format!(
                    "incomplete: Microsoft WebView2 installer {} is still running; retain its diagnostic receipt and wait before retrying",
                    child.id()
                ));
            }
            std::thread::sleep(Duration::from_millis(250));
        }
    }
    let mut primary = ptr::null_mut();
    if unsafe { DuplicateTokenEx(token.handle, 0x02000000, ptr::null(), 2, 1, &mut primary) } == 0 {
        return Err(error());
    }
    let primary = Token {
        handle: primary,
        impersonated: false,
    };
    let mut env = ptr::null_mut();
    if unsafe { CreateEnvironmentBlock(&mut env, primary.handle, 0) } == 0 {
        return Err(error());
    }
    let mut command = wide(format!("\"{}\" /silent /install", file.display()));
    let mut startup: Startup = unsafe { std::mem::zeroed() };
    startup.cb = std::mem::size_of::<Startup>() as u32;
    startup.flags = 1;
    startup.show = 0;
    let mut info: ProcessInfo = unsafe { std::mem::zeroed() };
    let r = unsafe {
        CreateProcessAsUserW(
            primary.handle,
            wide(file).as_ptr(),
            command.as_mut_ptr(),
            ptr::null(),
            ptr::null(),
            0,
            0x08000000 | 0x400,
            env,
            wide(file.parent().ok_or("Missing runtime stage")?).as_ptr(),
            &startup,
            &mut info,
        )
    };
    unsafe {
        DestroyEnvironmentBlock(env);
    }
    if r == 0 {
        return Err(format!(
            "Cannot start the bundled runtime as the installing user: {}",
            error()
        ));
    }
    let process = Token {
        handle: info.process,
        impersonated: false,
    };
    unsafe {
        CloseHandle(info.thread);
    }
    receipt(log, Some(info.pid), false, None)?;
    loop {
        let wait = unsafe { WaitForSingleObject(process.handle, 250) };
        if wait == 0 {
            let mut code = 0;
            if unsafe { GetExitCodeProcess(process.handle, &mut code) } == 0 {
                return Err(error());
            }
            receipt(log, Some(info.pid), true, Some(code))?;
            return Ok((code, cancelled));
        }
        if wait != 258 {
            return Err(error());
        }
        cancelled |= message(
            h,
            if cancelled {
                "Cancellation requested. Waiting for Microsoft WebView2 to finish before rolling back the application."
            } else {
                "Installing bundled Microsoft WebView2. This can take a few minutes."
            },
        );
        if started.elapsed() > Duration::from_secs(180) {
            return Err(format!(
                "incomplete: Microsoft WebView2 installer {} is still running; retain its receipt and wait before retrying",
                info.pid
            ));
        }
    }
}
fn provision(h: u32) -> Result<bool, String> {
    let data = context(h)?;
    if message(h, "Checking Microsoft WebView2") {
        return Ok(true);
    }
    // Reserve and advance a finite number of actual phase ticks, without invented vendor percentages.
    progress(h, 3, 4);
    progress(h, 2, 1);
    if native::scoped_runtime(data.machine).is_ok() {
        save_result(data.machine, 0)?;
        progress(h, 2, 3);
        return Ok(false);
    }
    if RUNTIME.is_empty() || RUNTIME_SHA.len() != 64 || hash(RUNTIME) != RUNTIME_SHA {
        return Err("The bundled offline WebView2 input is missing or changed; obtain the complete matching Full MSI".into());
    }
    let storage = if let Some(root) = &data.storage {
        private::validate_directory(root, data.machine)?;
        root.clone()
    } else {
        private::storage_root(data.machine)?
    };
    let _lease = private::coordination_lease_at(&storage, "runtime-install.lock", data.machine)?;
    // Ambiguous prior vendor work is retained and blocks another launch. Installer
    // processes may hand work to EdgeUpdate, so a dead bootstrapper alone is insufficient.
    for entry in fs::read_dir(&storage).map_err(|e| e.to_string())? {
        let at = entry.map_err(|e| e.to_string())?.path();
        if at
            .file_name()
            .is_some_and(|n| n.to_string_lossy().starts_with(".lmg-runtime-"))
        {
            let r = at.join("native-process.json");
            if r.exists() {
                private::validate_file(&r, data.machine)?;
                let v: serde_json::Value =
                    serde_json::from_slice(&fs::read(&r).map_err(|e| e.to_string())?)
                        .map_err(|e| e.to_string())?;
                if v["terminal"] != true {
                    return Err(format!(
                        "incomplete: Earlier WebView2 work has no terminal result. Inspect {} before retrying",
                        r.display()
                    ));
                }
            }
        }
    }
    let nonce = hash(
        format!(
            "{}:{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|e| e.to_string())?
                .as_nanos()
        )
        .as_bytes(),
    );
    let stage = storage.join(format!(".lmg-runtime-{}", &nonce[..24]));
    let _stage = scratch::Stage::create(
        &storage,
        &stage,
        "embedded",
        BTreeSet::from(["runtime.exe".into(), "native-process.json".into()]),
        BTreeSet::new(),
        data.machine,
    )?;
    let file = stage.join("runtime.exe");
    let mut output = private::create_file(&file)?;
    output
        .write_all(RUNTIME)
        .and_then(|_| output.sync_all())
        .map_err(|e| e.to_string())?;
    drop(output);
    let record = crate::FileRecord {
        path: "runtime.exe".into(),
        bytes: RUNTIME.len().to_string(),
        sha256: RUNTIME_SHA.into(),
    };
    let _verified = crate::open_verified_input(&file, &record)?;
    if message(h, "Preparing bundled Microsoft WebView2") {
        return Ok(true);
    }
    progress(h, 2, 1);
    let mut log = private::create_file(&stage.join("native-process.json"))?;
    receipt(&mut log, None, false, None)?;
    let (code, cancelled) = run_vendor(&file, h, &mut log)?;
    if ![0, 3010].contains(&code) {
        return Err(format!(
            "Microsoft WebView2 could not be installed (Windows result {code}). Retry the Full MSI; inspect the installer log if it repeats."
        ));
    }
    progress(h, 2, 1);
    if cancelled {
        return Ok(true);
    }
    if message(h, "Verifying Microsoft WebView2") {
        return Ok(true);
    }
    native::scoped_runtime(data.machine)?;
    save_result(data.machine, code)?;
    progress(h, 2, 1);
    Ok(false)
}
#[unsafe(no_mangle)]
pub extern "system" fn ProvisionRuntime(h: u32) -> u32 {
    std::panic::catch_unwind(|| match provision(h) {
        Ok(false) => 0,
        Ok(true) => 1602,
        Err(e) => {
            message(h, &e);
            unsafe {
                let r = MsiCreateRecord(1);
                MsiRecordSetStringW(r, 0, wide(format!("Local Media Gallery: {e}")).as_ptr());
                MsiProcessMessage(h, 0x01000000, r);
                MsiCloseHandle(r);
            }
            1603
        }
    })
    .unwrap_or(1603)
}
#[unsafe(no_mangle)]
pub extern "system" fn RuntimeResult(h: u32) -> u32 {
    std::panic::catch_unwind(|| {
        let mut value = vec![0u16; 32];
        let mut n = value.len() as u32;
        if unsafe { MsiGetPropertyW(h, wide("ALLUSERS").as_ptr(), value.as_mut_ptr(), &mut n) } != 0
        {
            return 1603;
        }
        let machine = String::from_utf16_lossy(&value[..n as usize]) == "1";
        match native::registry(
            machine,
            "Software\\ShruggieTech\\LocalMediaGallery\\RuntimeReceipts",
            &hash(crate::PAYLOAD.as_bytes()),
        ) {
            Ok(Some(code)) if code == "3010" => unsafe { MsiSetMode(h, 6, 1) },
            Ok(_) => 0,
            Err(_) => 1603,
        }
    })
    .unwrap_or(1603)
}
