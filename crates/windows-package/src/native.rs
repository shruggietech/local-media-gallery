// SPDX-License-Identifier: Apache-2.0
//! Read-only ownership checks around the standard Windows Installer transaction.
use crate::{PAYLOAD, Payload, check_path, hash};
use std::{
    ffi::OsString,
    fs,
    os::windows::ffi::{OsStrExt, OsStringExt},
    path::{Path, PathBuf},
    ptr,
};
use windows::{
    Win32::{
        System::Com::{
            CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED, CoCreateInstance, CoInitializeEx,
            CoTaskMemFree, CoUninitialize, IPersistFile,
        },
        UI::Shell::{
            FOLDERID_CommonPrograms, FOLDERID_Programs, IShellLinkW, KF_FLAG_DEFAULT,
            SHGetKnownFolderPath, ShellLink,
        },
    },
    core::{Interface, PCWSTR, PWSTR},
};
const USER: &str = "{2098F021-7630-4BF6-B7F8-2AC279022A42}";
const MACHINE: &str = "{F81110E5-48A6-4096-B065-752E0D3B61C0}";
const KEY: &str = "Software\\ShruggieTech\\LocalMediaGallery";
#[link(name = "msi")]
unsafe extern "system" {
    fn MsiSetTargetPathW(h: u32, directory: *const u16, path: *const u16) -> u32;
    fn MsiGetPropertyW(h: u32, name: *const u16, value: *mut u16, length: *mut u32) -> u32;
    fn MsiSetPropertyW(h: u32, name: *const u16, value: *const u16) -> u32;
    fn MsiGetProductInfoExW(
        product: *const u16,
        sid: *const u16,
        context: u32,
        property: *const u16,
        value: *mut u16,
        length: *mut u32,
    ) -> u32;
    fn MsiGetComponentPathExW(
        product: *const u16,
        component: *const u16,
        sid: *const u16,
        context: u32,
        path: *mut u16,
        length: *mut u32,
    ) -> i32;
    fn MsiCreateRecord(count: u32) -> u32;
    fn MsiRecordSetStringW(record: u32, field: u32, value: *const u16) -> u32;
    fn MsiProcessMessage(h: u32, kind: i32, record: u32) -> i32;
    fn MsiCloseHandle(h: u32) -> u32;
}
#[link(name = "kernel32")]
unsafe extern "system" {
    fn CompareStringOrdinal(
        a: *const u16,
        na: i32,
        b: *const u16,
        nb: i32,
        ignore_case: i32,
    ) -> i32;
}
#[link(name = "advapi32")]
unsafe extern "system" {
    fn RegOpenKeyExW(
        key: isize,
        sub: *const u16,
        options: u32,
        access: u32,
        result: *mut isize,
    ) -> i32;
    fn RegQueryValueExW(
        key: isize,
        name: *const u16,
        reserved: *mut u32,
        kind: *mut u32,
        data: *mut u8,
        size: *mut u32,
    ) -> i32;
    fn RegCloseKey(key: isize) -> i32;
}
fn wide(s: impl AsRef<std::ffi::OsStr>) -> Vec<u16> {
    s.as_ref().encode_wide().chain(Some(0)).collect()
}
fn get(h: u32, name: &str) -> Result<OsString, String> {
    let mut b = vec![0u16; 32768];
    let mut n = b.len() as u32;
    let r = unsafe { MsiGetPropertyW(h, wide(name).as_ptr(), b.as_mut_ptr(), &mut n) };
    if r != 0 {
        return Err(format!("Installer property {name}: {r}"));
    }
    Ok(OsString::from_wide(&b[..n as usize]))
}
fn text(h: u32, name: &str) -> Result<String, String> {
    get(h, name)?
        .into_string()
        .map_err(|_| format!("Invalid textual installer property {name}"))
}
pub fn registry(machine: bool, key: &str, name: &str) -> Result<Option<OsString>, String> {
    let mut handle = 0;
    let r = unsafe {
        RegOpenKeyExW(
            if machine {
                0x80000002u32 as i32 as isize
            } else {
                0x80000001u32 as i32 as isize
            },
            wide(key).as_ptr(),
            0,
            0x20019 | 0x100,
            &mut handle,
        )
    };
    if r == 2 {
        return Ok(None);
    }
    if r != 0 {
        return Err(format!("Registry open failed: {r}"));
    }
    let mut b = vec![0u16; 32768];
    let mut bytes = (b.len() * 2) as u32;
    let mut kind = 0;
    let r = unsafe {
        let r = RegQueryValueExW(
            handle,
            wide(name).as_ptr(),
            ptr::null_mut(),
            &mut kind,
            b.as_mut_ptr().cast(),
            &mut bytes,
        );
        RegCloseKey(handle);
        r
    };
    if r == 2 {
        return Ok(None);
    }
    if r != 0 || ![1, 2].contains(&kind) || !bytes.is_multiple_of(2) {
        return Err(format!("Registry value cannot be verified: {r}/{kind}"));
    }
    b.truncate(bytes as usize / 2);
    while b.last() == Some(&0) {
        b.pop();
    }
    let value = OsString::from_wide(&b);
    Ok(Some(if kind == 2 && name.eq_ignore_ascii_case("Path") {
        crate::expand_registry_path(&value)?
    } else {
        value
    }))
}
fn guid(scope: &str, identity: &str) -> String {
    let h = hash(format!("{scope}\0{identity}").as_bytes());
    format!(
        "{{{}-{}-5{}-a{}-{}}}",
        &h[..8],
        &h[8..12],
        &h[13..16],
        &h[17..20],
        &h[20..32]
    )
    .to_uppercase()
}
fn product(machine: bool) -> &'static str {
    if machine { MACHINE } else { USER }
}
fn registered(machine: bool, name: &str) -> Result<Option<OsString>, String> {
    let mut b = vec![0u16; 32768];
    let mut n = b.len() as u32;
    let r = unsafe {
        MsiGetProductInfoExW(
            wide(product(machine)).as_ptr(),
            ptr::null(),
            if machine { 4 } else { 2 },
            wide(name).as_ptr(),
            b.as_mut_ptr(),
            &mut n,
        )
    };
    if r == 1605 {
        return Ok(None);
    }
    if r != 0 {
        return Err(format!("Registered installer identity {name}: {r}"));
    }
    Ok(Some(OsString::from_wide(&b[..n as usize])))
}
fn equal_path(a: &Path, b: &Path) -> bool {
    let norm = |p: &Path| {
        let mut result = p
            .as_os_str()
            .encode_wide()
            .map(|c| if c == 47 { 92 } else { c })
            .collect::<Vec<_>>();
        while result.len() > 3 && result.last() == Some(&92) {
            result.pop();
        }
        result
    };
    let a = norm(a);
    let b = norm(b);
    unsafe { CompareStringOrdinal(a.as_ptr(), a.len() as i32, b.as_ptr(), b.len() as i32, 1) == 2 }
}
fn shortcut(machine: bool) -> Result<PathBuf, String> {
    unsafe {
        let p = SHGetKnownFolderPath(
            if machine {
                &FOLDERID_CommonPrograms
            } else {
                &FOLDERID_Programs
            },
            KF_FLAG_DEFAULT,
            None,
        )
        .map_err(|e| e.to_string())?;
        let value = OsString::from_wide(p.as_wide());
        CoTaskMemFree(Some(p.0.cast()));
        Ok(PathBuf::from(value).join("Local Media Gallery.lnk"))
    }
}
fn verify_shortcut(file: &Path, target: &Path) -> Result<(), String> {
    check_path(file)?;
    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED)
            .ok()
            .map_err(|e| e.to_string())?;
        let result = (|| {
            let link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)
                .map_err(|e| e.to_string())?;
            let persist: IPersistFile = link.cast().map_err(|e| e.to_string())?;
            persist
                .Load(
                    PCWSTR(wide(file).as_ptr()),
                    windows::Win32::System::Com::STGM_READ,
                )
                .map_err(|e| e.to_string())?;
            let mut b = vec![0u16; 32768];
            link.GetPath(&mut b, ptr::null_mut(), 0)
                .map_err(|e| e.to_string())?;
            let len = b.iter().position(|&x| x == 0).unwrap_or(b.len());
            let actual = PathBuf::from(OsString::from_wide(&b[..len]));
            if !equal_path(&actual, target) {
                return Err("Shortcut target collision; preserve the existing shortcut".into());
            }
            b.fill(0);
            link.GetArguments(&mut b).map_err(|e| e.to_string())?;
            if b[0] != 0 {
                return Err("Shortcut arguments changed; preserve before removal".into());
            }
            b.fill(0);
            link.GetWorkingDirectory(&mut b)
                .map_err(|e| e.to_string())?;
            let n = b.iter().position(|&x| x == 0).unwrap_or(b.len());
            if !equal_path(
                Path::new(&OsString::from_wide(&b[..n])),
                target.parent().ok_or("Missing shortcut parent")?,
            ) {
                return Err("Shortcut working directory changed; preserve before removal".into());
            }
            Ok(())
        })();
        CoUninitialize();
        result
    }
}
pub fn runtime() -> Result<String, String> {
    unsafe {
        let folder = std::env::var_os("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER").map(wide);
        let mut result = PWSTR::null();
        webview2_com_sys::Microsoft::Web::WebView2::Win32::GetAvailableCoreWebView2BrowserVersionString(PCWSTR(folder.as_ref().map_or(ptr::null(),|v|v.as_ptr())),&mut result).map_err(|e|format!("WebView2 unavailable ({e}); install Microsoft Edge WebView2 Evergreen Runtime and retry"))?;
        let version = result.to_string().map_err(|e| e.to_string());
        CoTaskMemFree(Some(result.0.cast()));
        version
    }
}
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeEvidence {
    pub version: String,
    pub scope: &'static str,
    pub native_folder: serde_json::Value,
    pub method: &'static str,
}
fn known_folder(id: &windows::core::GUID) -> Result<PathBuf, String> {
    unsafe {
        let p = SHGetKnownFolderPath(id, KF_FLAG_DEFAULT, None).map_err(|e| e.to_string())?;
        let path = PathBuf::from(OsString::from_wide(p.as_wide()));
        CoTaskMemFree(Some(p.0.cast()));
        Ok(path)
    }
}
fn registered_runtime(machine: bool) -> Result<RuntimeEvidence, String> {
    let key = if machine {
        "SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
    } else {
        "Software\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
    };
    let version = registry(machine, key, "pv")?
        .and_then(|s| s.into_string().ok())
        .filter(|v| {
            v != "0.0.0.0"
                && v.split('.').count() == 4
                && v.split('.')
                    .all(|p| !p.is_empty() && p.bytes().all(|b| b.is_ascii_digit()))
        })
        .ok_or_else(|| {
            format!(
                "{} Evergreen WebView2 is unavailable; run the matching Full setup entrypoint",
                if machine { "Machine-wide" } else { "Per-user" }
            )
        })?;
    let base = known_folder(if machine {
        &windows::Win32::UI::Shell::FOLDERID_ProgramFilesX86
    } else {
        &windows::Win32::UI::Shell::FOLDERID_LocalAppData
    })?;
    let folder = base
        .join("Microsoft\\EdgeWebView\\Application")
        .join(&version);
    let binary = folder.join("msedgewebview2.exe");
    if !binary.is_file() {
        return Err("Registered Evergreen runtime files are missing; repair with the matching setup entrypoint".into());
    }
    unsafe {
        let mut result = PWSTR::null();
        webview2_com_sys::Microsoft::Web::WebView2::Win32::GetAvailableCoreWebView2BrowserVersionString(PCWSTR(wide(&folder).as_ptr()),&mut result).map_err(|e|format!("Registered runtime native verification failed: {e}; repair Evergreen WebView2"))?;
        let actual = result.to_string().map_err(|e| e.to_string());
        CoTaskMemFree(Some(result.0.cast()));
        if actual? != version {
            return Err("Registered and native Evergreen runtime versions disagree; repair before installation".into());
        }
    }
    Ok(RuntimeEvidence {
        version,
        scope: if machine { "machine" } else { "user" },
        native_folder: serde_json::json!({"encoding":"windows-utf16le","bytes":folder.as_os_str().encode_wide().flat_map(u16::to_le_bytes).collect::<Vec<_>>()}),
        method: "Scope-specific Evergreen registration, actual runtime executable and native loader folder verification",
    })
}
pub fn scoped_runtime(machine: bool) -> Result<RuntimeEvidence, String> {
    crate::runtime_for_scope(
        machine,
        || registered_runtime(false),
        || registered_runtime(true),
    )
}
fn verify_integrations(
    machine: bool,
    directory: &Path,
    package: &str,
    complete: bool,
) -> Result<(), String> {
    let expected = [
        ("ProductCode", OsString::from(product(machine))),
        ("PackageCode", OsString::from(package)),
        ("InstallDir", directory.as_os_str().to_owned()),
        ("PayloadSha256", OsString::from(hash(PAYLOAD.as_bytes()))),
    ];
    for (name, value) in expected {
        match registry(machine, KEY, name)? {
            Some(actual)
                if actual == value
                    || (name == "InstallDir" && equal_path(Path::new(&actual), directory)) => {}
            None if !complete => {}
            _ => {
                return Err(format!(
                    "Integration {name} is foreign or changed; preserve it before retrying"
                ));
            }
        }
    }
    let link = shortcut(machine)?;
    if link.exists() {
        verify_shortcut(&link, &directory.join("local-media-gallery.exe"))?;
    } else if complete {
        return Err("Installed shortcut missing".into());
    }
    let key = if machine {
        "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment"
    } else {
        "Environment"
    };
    let segments = registry(machine, key, "Path")?.unwrap_or_default();
    let count = std::env::split_paths(&segments)
        .filter(|p| equal_path(p, directory))
        .count();
    if count > 1 || (complete && count != 1) {
        return Err("Installed command PATH segment is missing or duplicated".into());
    }
    Ok(())
}
pub fn verify_install(directory: &Path, machine: bool) -> Result<(), String> {
    let p: Payload = serde_json::from_str(PAYLOAD).map_err(|e| e.to_string())?;
    p.verify(directory, false)?;
    verify_manifest(directory, false)?;
    let scope = if machine { "machine" } else { "user" };
    let package = guid(scope, &hash(PAYLOAD.as_bytes()));
    if registered(machine, "PackageCode")? != Some(OsString::from(&package)) {
        return Err("Registered package does not match candidate".into());
    }
    verify_integrations(machine, directory, &package, true)?;
    scoped_runtime(machine)?;
    Ok(())
}
fn preflight(h: u32) -> Result<(), String> {
    let code = text(h, "ProductCode")?;
    let machine = match code.as_str() {
        MACHINE => true,
        USER => false,
        _ => return Err("Unknown product scope".into()),
    };
    let directory = PathBuf::from(get(h, "INSTALLDIR")?);
    if machine {
        let link = shortcut(true)?;
        let menu = link.parent().ok_or("Common Programs folder unavailable")?;
        let status =
            unsafe { MsiSetTargetPathW(h, wide("MachinePrograms").as_ptr(), wide(menu).as_ptr()) };
        if status != 0 {
            return Err(format!(
                "Cannot bind actual machine common Programs directory: {status}"
            ));
        }
    }
    validate_destination(&directory, machine)?;
    if text(h, "REMOVE")? != "ALL" {
        scoped_runtime(machine)?;
    }
    let mut data = directory.as_os_str().to_owned();
    data.push(if machine { "|machine" } else { "|user" });
    let r = unsafe { MsiSetPropertyW(h, wide("VerifyInstalled").as_ptr(), wide(data).as_ptr()) };
    if r != 0 {
        return Err(format!("Cannot bind deferred verification: {r}"));
    }
    Ok(())
}
pub fn validate_destination(directory: &Path, machine: bool) -> Result<(), String> {
    let scope = if machine { "machine" } else { "user" };
    let package = guid(scope, &hash(PAYLOAD.as_bytes()));
    check_path(directory)?;
    let p: Payload = serde_json::from_str(PAYLOAD).map_err(|e| e.to_string())?;
    p.validate()?;
    let installed = registered(machine, "PackageCode")?;
    if let Some(actual) = installed {
        if actual != OsString::from(&package) {
            return Err("Another candidate/version is installed. Preserve it and use its matching uninstaller; cross-version upgrades belong to the upgrade contract".into());
        }
        let marker = guid(scope, &hash(b"component:local-media-gallery.exe"));
        let mut b = vec![0u16; 32768];
        let mut n = b.len() as u32;
        let state = unsafe {
            MsiGetComponentPathExW(
                wide(product(machine)).as_ptr(),
                wide(marker).as_ptr(),
                ptr::null(),
                if machine { 4 } else { 2 },
                b.as_mut_ptr(),
                &mut n,
            )
        };
        if state != 3
            || !equal_path(
                &PathBuf::from(OsString::from_wide(&b[..n as usize])),
                &directory.join("local-media-gallery.exe"),
            )
        {
            return Err("Actual registered component destination differs; recover using its matching package".into());
        }
        p.verify(directory, true)?;
        verify_manifest(directory, true)?;
        verify_integrations(machine, directory, &package, false)?;
    } else {
        if directory.exists()
            && fs::read_dir(directory)
                .map_err(|e| e.to_string())?
                .next()
                .is_some()
        {
            return Err(
                "Installation destination is nonempty and unowned; select an empty directory"
                    .into(),
            );
        }
        if shortcut(machine)?.exists() {
            return Err("An unrelated application shortcut already exists".into());
        }
        for name in ["ProductCode", "PackageCode", "InstallDir", "PayloadSha256"] {
            if registry(machine, KEY, name)?.is_some() {
                return Err("Unregistered integration collision; preserve before retrying".into());
            }
        }
    }
    // Both scopes must respect commands already visible to this user.
    for machine_path in [false, true] {
        let key = if machine_path {
            "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment"
        } else {
            "Environment"
        };
        for at in std::env::split_paths(&registry(machine_path, key, "Path")?.unwrap_or_default()) {
            if at.join("local-media-gallery.exe").exists() && !equal_path(&at, directory) {
                return Err(format!(
                    "Command collision at {}; choose/recover integration explicitly",
                    at.display()
                ));
            }
        }
    }
    Ok(())
}
fn verify_manifest(directory: &Path, allow_missing: bool) -> Result<(), String> {
    let file = directory.join("payload.json");
    check_path(&file)?;
    match fs::read(&file) {
        Ok(bytes) if bytes == PAYLOAD.as_bytes() => Ok(()),
        Err(e) if allow_missing && e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        _ => Err("Installed payload identity changed; preserve before retrying".into()),
    }
}
pub fn installed_directory(machine: bool) -> Result<Option<PathBuf>, String> {
    let scope = if machine { "machine" } else { "user" };
    match registered(machine,"PackageCode")? {Some(code) if code==OsString::from(guid(scope,&hash(PAYLOAD.as_bytes())))=>Ok(registered(machine,"InstallLocation")?.map(PathBuf::from)),Some(_)=>Err("A different candidate is registered; use its matching removal package before replacement".into()),None=>Ok(None)}
}
pub fn verify_removed(directory: &Path, machine: bool) -> Result<(), String> {
    if registered(machine, "PackageCode")?.is_some() || shortcut(machine)?.exists() {
        return Err(
            "Removal left registered application integration; inspect installer log".into(),
        );
    }
    for name in ["ProductCode", "PackageCode", "InstallDir", "PayloadSha256"] {
        if registry(machine, KEY, name)?.is_some() {
            return Err("Removal left an owned registry value".into());
        }
    }
    let p: Payload = serde_json::from_str(PAYLOAD).map_err(|e| e.to_string())?;
    for f in &p.files {
        if directory.join(&f.path).exists() {
            return Err(format!("Removal left owned file {}", f.path));
        }
    }
    Ok(())
}
fn report(h: u32, result: Result<(), String>) -> u32 {
    match result {
        Ok(()) => 0,
        Err(e) => {
            unsafe {
                let r = MsiCreateRecord(1);
                MsiRecordSetStringW(r, 0, wide(format!("Local Media Gallery: {e}")).as_ptr());
                MsiProcessMessage(h, 0x01000000, r);
                MsiCloseHandle(r);
            }
            1603
        }
    }
}
#[unsafe(no_mangle)]
pub extern "system" fn Preflight(h: u32) -> u32 {
    std::panic::catch_unwind(|| report(h, preflight(h))).unwrap_or(1603)
}
#[unsafe(no_mangle)]
pub extern "system" fn VerifyInstalled(h: u32) -> u32 {
    std::panic::catch_unwind(|| {
        let result = (|| {
            let data = get(h, "CustomActionData")?;
            let units = data.encode_wide().collect::<Vec<_>>();
            let at = units
                .iter()
                .rposition(|&x| x == 124)
                .ok_or("Invalid deferred verification context")?;
            let directory = PathBuf::from(OsString::from_wide(&units[..at]));
            let machine = OsString::from_wide(&units[at + 1..]) == "machine";
            let p: Payload = serde_json::from_str(PAYLOAD).map_err(|e| e.to_string())?;
            p.verify(&directory, false)?;
            verify_manifest(&directory, false)?;
            let scope = if machine { "machine" } else { "user" };
            verify_integrations(
                machine,
                &directory,
                &guid(scope, &hash(PAYLOAD.as_bytes())),
                true,
            )?;
            scoped_runtime(machine)?;
            Ok(())
        })();
        report(h, result)
    })
    .unwrap_or(1603)
}
