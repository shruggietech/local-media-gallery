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
pub(crate) fn known_folder(id: &windows::core::GUID) -> Result<PathBuf, String> {
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
fn verify_integrations_for(
    machine: bool,
    directory: &Path,
    package: &str,
    complete: bool,
    payload_sha: &str,
) -> Result<(), String> {
    let expected = [
        ("ProductCode", OsString::from(product(machine))),
        ("PackageCode", OsString::from(package)),
        ("InstallDir", directory.as_os_str().to_owned()),
        ("PayloadSha256", OsString::from(payload_sha)),
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

fn verify_integrations(
    machine: bool,
    directory: &Path,
    package: &str,
    complete: bool,
) -> Result<(), String> {
    verify_integrations_for(
        machine,
        directory,
        package,
        complete,
        &hash(PAYLOAD.as_bytes()),
    )
}
/// Verify an explicitly supplied candidate against actual scoped MSI registration and integration.
pub fn verify_install_payload(
    directory: &Path,
    machine: bool,
    payload: &str,
    package: &str,
) -> Result<(), String> {
    let p: Payload = serde_json::from_str(payload).map_err(|e| e.to_string())?;
    p.validate()?;
    p.verify(directory, false)?;
    verify_registered_payload(directory, machine, payload, package)
}
/// Verify registration/integration after the caller has verified every payload byte.
pub fn verify_registered_payload(
    directory: &Path,
    machine: bool,
    payload: &str,
    package: &str,
) -> Result<(), String> {
    let p: Payload = serde_json::from_str(payload).map_err(|e| e.to_string())?;
    p.validate()?;
    check_path(&directory.join("payload.json"))?;
    if fs::read(directory.join("payload.json")).map_err(|e| e.to_string())? != payload.as_bytes() {
        return Err("Installed manifest differs".into());
    }
    let scope = if machine { "machine" } else { "user" };
    if guid(scope, &hash(payload.as_bytes())) != package
        || registered(machine, "PackageCode")? != Some(OsString::from(package))
    {
        return Err("Registered PackageCode differs".into());
    }
    verify_integrations_for(machine, directory, package, true, &hash(payload.as_bytes()))?;
    scoped_runtime(machine)?;
    Ok(())
}
pub fn registered_package(machine: bool) -> Result<Option<String>, String> {
    registered(machine, "PackageCode")?
        .map(|s| {
            s.into_string()
                .map_err(|_| "Invalid registered PackageCode".into())
        })
        .transpose()
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
    let recovery = get(h, "LMG_RECOVERY")?;
    if recovery.is_empty() || text(h, "REMOVE")? == "ALL" {
        validate_destination(&directory, machine)?;
    } else {
        recovery_destination(&directory, machine, Path::new(&recovery))?;
    }
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

// A supplied journal never permits unknown bytes or foreign native registration.
fn recovery_destination(directory: &Path, machine: bool, journal: &Path) -> Result<(), String> {
    use std::io::Read;
    check_path(directory)?;
    check_path(journal)?;
    let base = journal
        .parent()
        .ok_or("Missing private transaction parent")?;
    let _pins = crate::private::validate_directory(base, machine)?;
    let validator = crate::private::FileValidator::new(machine)?;
    validator.validate(journal)?;
    validator.validate(&base.join("identity.json"))?;
    let f = fs::File::open(journal).map_err(|e| e.to_string())?;
    if f.metadata().map_err(|e| e.to_string())?.len() > 8 * 1024 * 1024 {
        return Err("Oversized recovery journal".into());
    }
    let mut bytes = vec![];
    f.take(8 * 1024 * 1024 + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    let v: serde_json::Value = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    if v["formatVersion"] != 1
        || !matches!(
            v["phase"].as_str(),
            Some("applying" | "restoring" | "activated")
        )
    {
        return Err("Invalid recovery phase".into());
    }
    let at = Path::new(
        v["directory"]
            .as_str()
            .ok_or("Missing recovery directory")?,
    );
    let base = journal.parent().ok_or("Missing transaction parent")?;
    if !equal_path(at, directory)
        || !equal_path(
            Path::new(
                v["transaction"]
                    .as_str()
                    .ok_or("Missing transaction identity")?,
            ),
            base,
        )
    {
        return Err("Recovery destination differs".into());
    }
    let identity = fs::read(base.join("identity.json")).map_err(|e| e.to_string())?;
    if v["binding"] != hash(&identity)
        || serde_json::from_slice::<serde_json::Value>(&identity).map_err(|e| e.to_string())?
            != serde_json::json!({"formatVersion":1,"transaction":v["transaction"],"directory":v["directory"],"prior":v["prior"],"next":v["next"],"state":v["state"]})
    {
        return Err("Recovery immutable identity changed".into());
    }
    let target = if v["targetPrior"]
        .as_bool()
        .ok_or("Missing recovery target")?
    {
        "prior"
    } else {
        "next"
    };
    let scope = if machine { "machine" } else { "user" };
    let mut allowed = std::collections::BTreeMap::<String, Vec<(String, String)>>::new();
    let mut packages = vec![];
    let mut matching = false;
    for side in ["prior", "next"] {
        if v[side]["native"]["kind"] != "windows-msi" || v[side]["native"]["scope"] != scope {
            return Err("Recovery scope differs".into());
        }
        let root = base.join(side);
        let manifest = root.join("payload.json");
        check_path(&manifest)?;
        validator.validate(&manifest)?;
        let text = fs::read_to_string(&manifest).map_err(|e| e.to_string())?;
        let payload: Payload = serde_json::from_str(&text).map_err(|e| e.to_string())?;
        payload.validate()?;
        payload.verify(&root, false)?;
        let package = guid(scope, &hash(text.as_bytes()));
        if v[side]["native"]["packageCode"] != package
            || v[side]["native"]["productCode"] != product(machine)
        {
            return Err("Recovery native identity differs".into());
        }
        packages.push(package);
        matching |= text == PAYLOAD && side == target;
        for f in &payload.files {
            validator.validate(&root.join(&f.path))?;
        }
        let mut records = payload.files;
        records.push(crate::FileRecord {
            path: "payload.json".into(),
            bytes: text.len().to_string(),
            sha256: hash(text.as_bytes()),
        });
        for r in records {
            allowed.entry(r.path).or_default().push((r.bytes, r.sha256));
        }
    }
    if !matching {
        return Err("This MSI is outside the retained recovery operation".into());
    }
    if let Some(registered) = registered(machine, "PackageCode")?
        && !packages.iter().any(|p| registered == OsString::from(p))
    {
        return Err("Foreign registered package".into());
    }
    let mut namespace = crate::private::PhysicalNamespace::default();
    for (path, records) in allowed {
        let file = directory.join(&path);
        match fs::symlink_metadata(&file) {
            Ok(m) => {
                namespace.pin(file.parent().ok_or("Missing installed parent")?)?;
                use std::os::windows::fs::MetadataExt;
                if m.file_attributes() & 0x400 != 0
                    || !m.is_file()
                    || !records.iter().any(|(bytes, digest)| {
                        m.len().to_string() == *bytes
                            && fs::read(&file).is_ok_and(|b| hash(&b) == *digest)
                    })
                {
                    return Err(format!("External recovery bytes: {path}"));
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                check_path(&file)?;
            }
            Err(e) => return Err(e.to_string()),
        }
    }
    // Native integration remains independently checked after each actual MSI transaction.
    if registered(machine, "PackageCode")?.is_none() {
        if shortcut(machine)?.exists() {
            return Err("Foreign shortcut while product is absent".into());
        }
        for name in ["ProductCode", "PackageCode", "InstallDir", "PayloadSha256"] {
            if registry(machine, KEY, name)?.is_some() {
                return Err("Unregistered integration collision".into());
            }
        }
    }
    Ok(())
}

/// Read native installer identity without running installation or custom actions.
pub fn inspect_package(file: &Path) -> Result<(String, String, bool, String), String> {
    #[link(name = "msi")]
    unsafe extern "system" {
        fn MsiOpenDatabaseW(path: *const u16, persist: *const u16, database: *mut u32) -> u32;
        fn MsiDatabaseOpenViewW(database: u32, query: *const u16, view: *mut u32) -> u32;
        fn MsiViewExecute(view: u32, record: u32) -> u32;
        fn MsiViewFetch(view: u32, record: *mut u32) -> u32;
        fn MsiRecordGetStringW(record: u32, field: u32, value: *mut u16, length: *mut u32) -> u32;
        fn MsiGetSummaryInformationW(
            database: u32,
            path: *const u16,
            count: u32,
            summary: *mut u32,
        ) -> u32;
        fn MsiSummaryInfoGetPropertyW(
            summary: u32,
            property: u32,
            kind: *mut u32,
            integer: *mut i32,
            time: *mut std::ffi::c_void,
            value: *mut u16,
            length: *mut u32,
        ) -> u32;
    }
    struct Handle(u32);
    impl Drop for Handle {
        fn drop(&mut self) {
            unsafe {
                MsiCloseHandle(self.0);
            }
        }
    }
    let mut h = 0;
    let r = unsafe { MsiOpenDatabaseW(wide(file).as_ptr(), ptr::null(), &mut h) };
    if r != 0 {
        return Err(format!("Cannot read native MSI database: {r}"));
    }
    let db = Handle(h);
    let property = |key: &str| -> Result<Option<String>, String> {
        let query =
            format!("SELECT \x60Value\x60 FROM \x60Property\x60 WHERE \x60Property\x60='{key}'");
        let mut h = 0;
        let r = unsafe { MsiDatabaseOpenViewW(db.0, wide(query).as_ptr(), &mut h) };
        if r != 0 {
            return Err(format!("Cannot read MSI property view: {r}"));
        }
        let view = Handle(h);
        let r = unsafe { MsiViewExecute(view.0, 0) };
        if r != 0 {
            return Err(format!("Cannot execute MSI property view: {r}"));
        }
        let mut h = 0;
        let r = unsafe { MsiViewFetch(view.0, &mut h) };
        if r == 259 {
            return Ok(None);
        }
        if r != 0 {
            return Err(format!("Cannot fetch MSI property: {r}"));
        }
        let record = Handle(h);
        let mut buffer = vec![0u16; 32768];
        let mut size = buffer.len() as u32;
        let r = unsafe { MsiRecordGetStringW(record.0, 1, buffer.as_mut_ptr(), &mut size) };
        if r != 0 {
            return Err(format!("Cannot read MSI property: {r}"));
        }
        String::from_utf16(&buffer[..size as usize])
            .map(Some)
            .map_err(|e| e.to_string())
    };
    let product = property("ProductCode")?.ok_or("Missing native ProductCode")?;
    let protocol = property("LMG_RECOVERY_PROTOCOL")?.as_deref() == Some("1");
    let mut h = 0;
    let r = unsafe { MsiGetSummaryInformationW(db.0, ptr::null(), 0, &mut h) };
    if r != 0 {
        return Err(format!("Cannot read MSI summary: {r}"));
    }
    let summary = Handle(h);
    let mut kind = 0;
    let mut integer = 0;
    let mut time = [0u32; 2];
    let mut buffer = vec![0u16; 32768];
    let mut size = buffer.len() as u32;
    let r = unsafe {
        MsiSummaryInfoGetPropertyW(
            summary.0,
            9,
            &mut kind,
            &mut integer,
            time.as_mut_ptr().cast(),
            buffer.as_mut_ptr(),
            &mut size,
        )
    };
    if r != 0 {
        return Err(format!("Cannot read native PackageCode: {r}"));
    }
    let package = String::from_utf16(&buffer[..size as usize]).map_err(|e| e.to_string())?;
    let scope = match property("ALLUSERS")?.as_deref() {
        Some("1") => "machine",
        Some("") | None => "user",
        _ => return Err("Unsupported MSI ALLUSERS scope".into()),
    };
    Ok((product, package, protocol, scope.into()))
}

/// Conservative native layout identity for same-version MSI reinstalls.
/// Content sizes/versions and cabinet bytes may change; component ownership may not.
pub fn reinstall_layout(file: &Path) -> Result<Vec<Vec<String>>, String> {
    #[link(name = "msi")]
    unsafe extern "system" {
        fn MsiOpenDatabaseW(path: *const u16, persist: *const u16, database: *mut u32) -> u32;
        fn MsiDatabaseOpenViewW(database: u32, query: *const u16, view: *mut u32) -> u32;
        fn MsiViewExecute(view: u32, record: u32) -> u32;
        fn MsiViewFetch(view: u32, record: *mut u32) -> u32;
        fn MsiRecordGetStringW(record: u32, field: u32, value: *mut u16, length: *mut u32) -> u32;
    }
    struct Handle(u32);
    impl Drop for Handle {
        fn drop(&mut self) {
            unsafe {
                MsiCloseHandle(self.0);
            }
        }
    }
    check_path(file)?;
    let mut raw = 0;
    let code = unsafe { MsiOpenDatabaseW(wide(file).as_ptr(), ptr::null(), &mut raw) };
    if code != 0 {
        return Err(format!("Cannot read MSI layout: {code}"));
    }
    let db = Handle(raw);
    let queries = [
        (
            "Component",
            "SELECT `Component`,`ComponentId`,`Directory_`,`Attributes`,`Condition`,`KeyPath` FROM `Component`",
            6,
        ),
        (
            "File",
            "SELECT `File`,`Component_`,`FileName`,`Attributes`,`Sequence` FROM `File`",
            5,
        ),
        (
            "Feature",
            "SELECT `Feature`,`Feature_Parent`,`Title`,`Description`,`Display`,`Level`,`Directory_`,`Attributes` FROM `Feature`",
            8,
        ),
        (
            "FeatureComponents",
            "SELECT `Feature_`,`Component_` FROM `FeatureComponents`",
            2,
        ),
        (
            "Directory",
            "SELECT `Directory`,`Directory_Parent`,`DefaultDir` FROM `Directory`",
            3,
        ),
        (
            "ProductVersion",
            "SELECT `Value` FROM `Property` WHERE `Property`='ProductVersion'",
            1,
        ),
    ];
    let mut rows = vec![];
    for (table, query, columns) in queries {
        let mut raw = 0;
        let code = unsafe { MsiDatabaseOpenViewW(db.0, wide(query).as_ptr(), &mut raw) };
        if code != 0 {
            return Err(format!("Cannot inspect MSI {table} layout: {code}"));
        }
        let view = Handle(raw);
        let code = unsafe { MsiViewExecute(view.0, 0) };
        if code != 0 {
            return Err(format!("Cannot execute MSI layout view: {code}"));
        }
        let mut count = 0;
        loop {
            let mut raw = 0;
            let code = unsafe { MsiViewFetch(view.0, &mut raw) };
            if code == 259 {
                break;
            }
            if code != 0 {
                return Err(format!("Cannot fetch MSI layout: {code}"));
            }
            let record = Handle(raw);
            count += 1;
            if count > 8192 {
                return Err("Oversized MSI layout".into());
            }
            let mut row = vec![table.to_string()];
            for field in 1..=columns {
                let mut buffer = vec![0u16; 32768];
                let mut size = buffer.len() as u32;
                let code =
                    unsafe { MsiRecordGetStringW(record.0, field, buffer.as_mut_ptr(), &mut size) };
                if code != 0 || size >= buffer.len() as u32 {
                    return Err(format!("Cannot read bounded MSI layout value: {code}"));
                }
                row.push(String::from_utf16(&buffer[..size as usize]).map_err(|e| e.to_string())?);
            }
            rows.push(row);
        }
        if count == 0 {
            return Err(format!("Missing MSI {table} layout"));
        }
    }
    rows.sort();
    Ok(rows)
}

#[cfg(test)]
mod update_layout_tests {
    use super::*;
    #[test]
    #[ignore = "Requires explicitly supplied actual prepared MSI pairs; CI runs this separately"]
    fn actual_native_layout_detects_changed_component_ownership() {
        #[link(name = "msi")]
        unsafe extern "system" {
            fn MsiOpenDatabaseW(path: *const u16, persist: *const u16, database: *mut u32) -> u32;
            fn MsiDatabaseOpenViewW(database: u32, query: *const u16, view: *mut u32) -> u32;
            fn MsiViewExecute(view: u32, record: u32) -> u32;
            fn MsiDatabaseCommit(database: u32) -> u32;
        }
        let pairs: Vec<[PathBuf; 2]> = serde_json::from_str(
            &std::env::var("GALLERY_MSI_LAYOUT_PAIRS").expect("Explicit actual MSI pairs required"),
        )
        .unwrap();
        assert!(!pairs.is_empty());
        for [prior, next] in pairs {
            let old_bytes = fs::read(&prior).unwrap();
            let new_bytes = fs::read(&next).unwrap();
            let record = |bytes: &[u8]| crate::FileRecord {
                path: "layout.msi".into(),
                bytes: bytes.len().to_string(),
                sha256: hash(bytes),
            };
            let _old = crate::open_verified_input(&prior, &record(&old_bytes)).unwrap();
            let _new = crate::open_verified_input(&next, &record(&new_bytes)).unwrap();
            let a = reinstall_layout(&prior).unwrap();
            let b = reinstall_layout(&next).unwrap();
            assert_eq!(a, b);
            assert_ne!(old_bytes, new_bytes);
            let component = a.iter().find(|r| r[0] == "Component").unwrap();
            let temp = tempfile::tempdir().unwrap();
            let changed = temp.path().join("changed.msi");
            fs::copy(&prior, &changed).unwrap();
            let mut db = 0;
            assert_eq!(
                unsafe {
                    MsiOpenDatabaseW(wide(&changed).as_ptr(), ptr::without_provenance(1), &mut db)
                },
                0
            );
            let query = format!(
                "UPDATE `Component` SET `ComponentId`='{{00000000-0000-0000-0000-000000000001}}' WHERE `Component`='{}'",
                component[1].replace(char::from(39), "''")
            );
            let mut view = 0;
            assert_eq!(
                unsafe { MsiDatabaseOpenViewW(db, wide(query).as_ptr(), &mut view) },
                0
            );
            assert_eq!(unsafe { MsiViewExecute(view, 0) }, 0);
            assert_eq!(unsafe { MsiCloseHandle(view) }, 0);
            assert_eq!(unsafe { MsiDatabaseCommit(db) }, 0);
            assert_eq!(unsafe { MsiCloseHandle(db) }, 0);
            assert_ne!(reinstall_layout(&changed).unwrap(), a);
            assert_eq!(reinstall_layout(&prior).unwrap(), a);
        }
    }
}

fn source_leaf(name: &str) -> Result<String, String> {
    if name.is_empty()
        || name.encode_utf16().count() > 255
        || name
            .chars()
            .any(|c| c < ' ' || matches!(c, '/' | '\\' | ':' | '"'))
        || name.ends_with(['.', ' '])
        || !Path::new(name)
            .extension()
            .is_some_and(|e| e.eq_ignore_ascii_case("msi"))
    {
        return Err("Invalid registered MSI source filename".into());
    }
    Ok(name.into())
}
/// Read the source filename recorded by Windows Installer without changing its source list.
pub fn source_package_name(machine: bool) -> Result<String, String> {
    #[link(name = "msi")]
    unsafe extern "system" {
        fn MsiSourceListGetInfoW(
            product: *const u16,
            sid: *const u16,
            context: u32,
            options: u32,
            property: *const u16,
            value: *mut u16,
            length: *mut u32,
        ) -> u32;
    }
    let mut buffer = vec![0u16; 256];
    let mut length = buffer.len() as u32;
    let code = unsafe {
        MsiSourceListGetInfoW(
            wide(product(machine)).as_ptr(),
            ptr::null(),
            if machine { 4 } else { 2 },
            0,
            wide("PackageName").as_ptr(),
            buffer.as_mut_ptr(),
            &mut length,
        )
    };
    if code != 0 || length >= buffer.len() as u32 {
        return Err(format!(
            "Cannot read registered MSI source filename: {code}"
        ));
    }
    source_leaf(&String::from_utf16(&buffer[..length as usize]).map_err(|e| e.to_string())?)
}
#[cfg(test)]
#[test]
fn registered_source_filename_stays_inside_owned_storage() {
    assert_eq!(
        source_leaf("local-media-gallery-user.msi").unwrap(),
        "local-media-gallery-user.msi"
    );
    assert!(source_leaf("Gallery 雪.MSI").is_ok());
    for bad in [
        "",
        "..",
        "../a.msi",
        "x/a.msi",
        "x\\a.msi",
        "a.msi:stream",
        "a.msi ",
        "a.exe",
        "a\n.msi",
    ] {
        assert!(source_leaf(bad).is_err(), "{bad}");
    }
}
