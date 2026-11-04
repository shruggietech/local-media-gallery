// SPDX-License-Identifier: Apache-2.0
//! Offline WebView2 provisioning inside the native MSI transaction.
use crate::{hash, native, private, scratch};
use std::{
    collections::BTreeSet,
    ffi::{OsStr, OsString, c_void},
    fs,
    io::{Seek, SeekFrom, Write},
    os::windows::ffi::OsStrExt,
    path::Path,
    ptr,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
const RUNTIME: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/runtime.exe"));
const RUNTIME_SHA: &str = include_str!(concat!(env!("OUT_DIR"), "/runtime.sha256"));
#[link(name = "advapi32")]
unsafe extern "system" {
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
pub(crate) use crate::effective_process::effective_token;
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
    let (child, launch_failure) = match crate::effective_process::spawn_observed(
        file,
        &[OsString::from("/silent"), OsString::from("/install")],
        false,
    ) {
        Ok(child) => (child, None),
        Err(crate::effective_process::SpawnFailure::NotStarted(error)) => {
            // Creation failed before any vendor work existed. This is terminal,
            // unlike a launched process whose eventual outcome is unknown.
            receipt(log, None, true, None)?;
            return Err(format!("Microsoft WebView2 could not be started: {error}"));
        }
        Err(crate::effective_process::SpawnFailure::Started {
            child: Some(child),
            error,
            ..
        }) => (child, Some(error)),
        Err(crate::effective_process::SpawnFailure::Started { pid, error, .. }) => {
            receipt(log, Some(pid), false, None)?;
            return Err(format!(
                "incomplete: WebView2 process {pid} started but observation is unavailable: {error}"
            ));
        }
    };
    observe_vendor(child, h, log, launch_failure)
}
fn observe_vendor(
    child: crate::effective_process::EffectiveChild,
    h: u32,
    log: &mut fs::File,
    launch_failure: Option<String>,
) -> Result<(u32, bool), String> {
    receipt(log, Some(child.id()), false, None)?;
    let mut cancelled = false;
    let started = Instant::now();
    loop {
        if let Some(code) = child.poll(250)? {
            receipt(log, Some(child.id()), true, Some(code))?;
            if let Some(error) = launch_failure {
                return Err(format!(
                    "WebView2 process {} ended ({code}) after launch finalization failed: {error}",
                    child.id()
                ));
            }
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
                "incomplete: Microsoft WebView2 installer {} is still running; retain its receipt and wait before retrying",
                child.id()
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

#[cfg(test)]
mod token_tests {
    use super::*;
    #[test]
    fn confirmed_runtime_launch_failure_is_terminal_and_allows_fresh_staging() {
        let temp = tempfile::tempdir().unwrap();
        let storage = temp.path().join("storage");
        private::ensure_storage_at(&storage, false).unwrap();
        let path = storage.join(".lmg-runtime-launch-failure");
        let stage = scratch::Stage::create(
            &storage,
            &path,
            "embedded",
            BTreeSet::from(["native-process.json".into(), "runtime.exe".into()]),
            BTreeSet::new(),
            false,
        )
        .unwrap();
        let mut log = private::create_file(&path.join("native-process.json")).unwrap();
        receipt(&mut log, None, false, None).unwrap();
        // The unique missing input cannot launch a process or call MSI UI.
        let error = run_vendor(&path.join("runtime.exe"), 0, &mut log).unwrap_err();
        assert!(error.contains("could not be started"));
        let record: serde_json::Value =
            serde_json::from_slice(&fs::read(path.join("native-process.json")).unwrap()).unwrap();
        assert_eq!(record["terminal"], true);
        assert!(record["pid"].is_null());
        assert!(record["code"].is_null());
        drop(log);
        drop(stage);
        assert!(!path.exists());
        let retry = scratch::Stage::create(
            &storage,
            &path,
            "embedded",
            BTreeSet::new(),
            BTreeSet::new(),
            false,
        )
        .unwrap();
        drop(retry);
        assert!(!path.exists());
    }

    #[test]
    fn post_start_failure_observes_real_pid_and_terminal_exit_without_false_no_start() {
        let temp = tempfile::tempdir().unwrap();
        let mut log = fs::File::create(temp.path().join("receipt.json")).unwrap();
        let file = std::path::PathBuf::from(std::env::var_os("SystemRoot").unwrap())
            .join("System32/whoami.exe");
        let child = crate::effective_process::spawn_observed(&file, &[], false).unwrap();
        let pid = child.id();
        assert_eq!(child.poll(5000).unwrap(), Some(0));
        let error = observe_vendor(
            child,
            0,
            &mut log,
            Some("injected token restoration failure after creation".into()),
        )
        .unwrap_err();
        assert!(error.contains("launch finalization failed"));
        let record: serde_json::Value =
            serde_json::from_slice(&fs::read(temp.path().join("receipt.json")).unwrap()).unwrap();
        assert_eq!(record["pid"], pid);
        assert_eq!(record["terminal"], true);
        assert_eq!(record["code"], 0);
    }
    #[test]
    fn effective_token_can_read_native_known_folders_without_mutating_profiles() {
        for id in [
            &windows::Win32::UI::Shell::FOLDERID_LocalAppData,
            &windows::Win32::UI::Shell::FOLDERID_ProgramData,
        ] {
            let folder = crate::native::known_folder(id)
                .expect("Querying the effective user requires the documented token rights");
            assert!(folder.is_absolute());
            assert!(folder.is_dir());
        }
    }
}
