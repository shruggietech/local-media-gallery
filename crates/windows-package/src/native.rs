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
pub const DUAL: &str = "{6EC08037-6FA8-4AF3-916B-40D03DE0DAF9}";
const KEY: &str = "Software\\ShruggieTech\\LocalMediaGallery";
#[link(name = "msi")]
unsafe extern "system" {
    fn MsiGetFeatureStateW(h: u32, name: *const u16, installed: *mut i32, action: *mut i32) -> u32;
    fn MsiSetFeatureStateW(h: u32, name: *const u16, state: i32) -> u32;
    fn MsiQueryFeatureStateExW(
        product: *const u16,
        sid: *const u16,
        context: u32,
        feature: *const u16,
        state: *mut i32,
    ) -> u32;
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
    fn RegOpenCurrentUser(access: u32, result: *mut isize) -> i32;
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
    // HKCU must follow the effective impersonated user in deferred MSI actions.
    let mut user_hive = 0;
    if !machine {
        let r = unsafe { RegOpenCurrentUser(0x20019 | 0x100, &mut user_hive) };
        if r != 0 {
            return Err(format!("Effective registry user: {r}"));
        }
    }
    let r = unsafe {
        RegOpenKeyExW(
            if machine {
                0x80000002u32 as i32 as isize
            } else {
                user_hive
            },
            wide(key).as_ptr(),
            0,
            0x20019 | 0x100,
            &mut handle,
        )
    };
    if user_hive != 0 {
        unsafe {
            RegCloseKey(user_hive);
        }
    }
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
fn registered_for(code: &str, machine: bool, name: &str) -> Result<Option<OsString>, String> {
    let mut b = vec![0u16; 32768];
    let mut n = b.len() as u32;
    let r = unsafe {
        MsiGetProductInfoExW(
            wide(code).as_ptr(),
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
        return Err(format!("Registered installer {code}/{name}: {r}"));
    }
    Ok(Some(OsString::from_wide(&b[..n as usize])))
}
pub fn registered_product(machine: bool) -> Result<Option<String>, String> {
    let mut found = None;
    for code in [DUAL, product(machine)] {
        if registered_for(code, machine, "PackageCode")?.is_some() {
            if found.is_some() {
                return Err("Multiple owned products in the same installation context; resolve the native registration before maintenance".into());
            }
            found = Some(code.to_owned());
        }
    }
    Ok(found)
}
fn registered(machine: bool, name: &str) -> Result<Option<OsString>, String> {
    match registered_product(machine)? {
        Some(code) => registered_for(&code, machine, name),
        None => Ok(None),
    }
}
pub fn package_code(product_code: &str, machine: bool, payload: &[u8]) -> Result<String, String> {
    let scope = if product_code == DUAL {
        "dual"
    } else if product_code == product(machine) {
        if machine { "machine" } else { "user" }
    } else {
        return Err("Unrecognized product identity".into());
    };
    Ok(guid(scope, &hash(payload)))
}
#[derive(Clone, Copy, Debug, serde::Serialize, serde::Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Integrations {
    pub start_menu: bool,
    pub command_path: bool,
}
impl Default for Integrations {
    fn default() -> Self {
        Self {
            start_menu: true,
            command_path: false,
        }
    }
}
pub fn installed_integrations(machine: bool) -> Result<Integrations, String> {
    let code = registered_product(machine)?.ok_or("No installed product for feature selection")?;
    if code != DUAL {
        return Ok(Integrations {
            start_menu: true,
            command_path: true,
        });
    }
    let feature = |name: &str| -> Result<bool, String> {
        let mut state = 0;
        let r = unsafe {
            MsiQueryFeatureStateExW(
                wide(&code).as_ptr(),
                ptr::null(),
                if machine { 4 } else { 2 },
                wide(name).as_ptr(),
                &mut state,
            )
        };
        if r != 0 || ![2, 3].contains(&state) {
            return Err(format!(
                "Cannot verify installed feature {name}: {r}/{state}"
            ));
        }
        Ok(state == 3)
    };
    Ok(Integrations {
        start_menu: feature("StartMenu")?,
        command_path: feature("CommandPath")?,
    })
}
fn selected_integrations(h: u32) -> Result<Integrations, String> {
    let feature = |name: &str| -> Result<bool, String> {
        let (mut installed, mut action) = (0, 0);
        let r = unsafe { MsiGetFeatureStateW(h, wide(name).as_ptr(), &mut installed, &mut action) };
        if r != 0 {
            return Err(format!("Feature selection {name}: {r}"));
        }
        Ok(if action == 0 || action == -1 {
            installed == 3
        } else {
            action == 3
        })
    };
    Ok(Integrations {
        start_menu: feature("StartMenu")?,
        command_path: feature("CommandPath")?,
    })
}
fn set(h: u32, name: &str, value: impl AsRef<std::ffi::OsStr>) -> Result<(), String> {
    let r = unsafe { MsiSetPropertyW(h, wide(name).as_ptr(), wide(value).as_ptr()) };
    if r == 0 {
        Ok(())
    } else {
        Err(format!("Installer property {name}: {r}"))
    }
}
fn configure(h: u32) -> Result<(), String> {
    // Configure runs before costing in both client and execute sequences. An explicit
    // recovery request already carries a concrete context and location.
    if text(h, "LMG_CONFIGURED")? == "1" {
        return Ok(());
    }
    if get(h, "LMG_RECOVERY")?.is_empty() {
        let existing = [false, true]
            .into_iter()
            .map(|machine| registered_install_directory(machine).map(|p| p.map(|p| (machine, p))))
            .collect::<Result<Vec<_>, _>>()?
            .into_iter()
            .flatten()
            .collect::<Vec<_>>();
        if existing.len() > 1 {
            return Err("Both user and all-users installations exist; maintain each with its matching native package before replacement".into());
        }
        if let Some((machine, path)) = existing.first() {
            set(h, "LMG_EXISTING", "1")?;
            set(h, "LMG_SCOPE", if *machine { "machine" } else { "user" })?;
            set(h, "INSTALLDIR", path)?;
            let choices = installed_integrations(*machine)?;
            if text(h, "LMG_STARTMENU")?.is_empty() {
                set(
                    h,
                    "LMG_STARTMENU",
                    if choices.start_menu { "1" } else { "0" },
                )?;
            }
            if text(h, "LMG_PATH")?.is_empty() {
                set(h, "LMG_PATH", if choices.command_path { "1" } else { "0" })?;
            }
        }
    }
    if text(h, "ALLUSERS")? == "1" || text(h, "MSIINSTALLPERUSER")?.is_empty() {
        set(h, "LMG_SCOPE", "machine")?;
    }
    if text(h, "LMG_STARTMENU")?.is_empty() {
        set(h, "LMG_STARTMENU", "1")?;
    }
    if text(h, "LMG_PATH")?.is_empty() {
        set(h, "LMG_PATH", "0")?;
    }
    for name in ["LMG_STARTMENU", "LMG_PATH"] {
        match text(h, name)?.as_str() {
            "0" => set(h, name, "")?,
            "" | "1" => {}
            _ => return Err(format!("{name} must be 0 or 1")),
        }
    }
    select_scope(h)?;
    if !text(h, "Installed")?.is_empty()
        && text(h, "REMOVE")? != "ALL"
        && text(h, "REINSTALL")?.is_empty()
    {
        let choices = installed_integrations(text(h, "LMG_SCOPE")? == "machine")?;
        let mut features = vec!["Application", "Payload", "Notices"];
        if choices.start_menu {
            features.push("StartMenu");
        }
        if choices.command_path {
            features.push("CommandPath");
        }
        set(h, "REINSTALL", features.join(","))?;
        set(h, "REINSTALLMODE", "vamus")?;
    }
    if !text(h, "Installed")?.is_empty() && text(h, "REMOVE")? != "ALL" {
        let mode = text(h, "REINSTALLMODE")?;
        if mode.is_empty() {
            set(h, "REINSTALLMODE", "vamus")?;
        } else if !mode.to_ascii_lowercase().contains('v')
            && registered_package(text(h, "LMG_SCOPE")? == "machine")?.as_deref()
                != Some(text(h, "PackageCode")?.as_str())
        {
            set(h, "REINSTALLMODE", format!("v{mode}"))?;
        }
    }
    set(h, "LMG_CONFIGURED", "1")
}
fn select_scope(h: u32) -> Result<(), String> {
    let scope = text(h, "LMG_SCOPE")?;
    let machine = match scope.as_str() {
        "machine" => true,
        "user" => false,
        _ => return Err("Choose a valid installation scope".into()),
    };
    // The concrete choice must stay resolved during maintenance; costing does not
    // normalize ALLUSERS=2 again for an already installed product.
    set(h, "ALLUSERS", if machine { "1" } else { "" })?;
    set(h, "MSIINSTALLPERUSER", if machine { "" } else { "1" })?;
    let directory = get(h, "INSTALLDIR")?;
    if directory.is_empty()
        || (!text(h, "LMG_LAST_SCOPE")?.is_empty()
            && text(h, "LMG_LAST_SCOPE")? != scope
            && text(h, "LMG_EXISTING")?.is_empty())
    {
        let base = known_folder(if machine {
            &windows::Win32::UI::Shell::FOLDERID_ProgramFilesX64
        } else {
            &windows::Win32::UI::Shell::FOLDERID_LocalAppData
        })?;
        let path = if machine { base } else { base.join("Programs") }.join("Local Media Gallery");
        set(h, "INSTALLDIR", &path)?;
    }
    set(h, "LMG_LAST_SCOPE", scope)
}
fn select_features(h: u32) -> Result<(), String> {
    // Explicit ADDLOCAL/REMOVE from administration or the sealed worker wins.
    if text(h, "ADDLOCAL")?.is_empty() && text(h, "REMOVE")?.is_empty() {
        for (feature, property) in [("StartMenu", "LMG_STARTMENU"), ("CommandPath", "LMG_PATH")] {
            let r = unsafe {
                MsiSetFeatureStateW(
                    h,
                    wide(feature).as_ptr(),
                    if text(h, property)? == "1" { 3 } else { 2 },
                )
            };
            if r != 0 {
                return Err(format!("Cannot select {feature}: {r}"));
            }
        }
    }
    // Recache same-ProductCode replacements with exactly the elected features.
    if !text(h, "Installed")?.is_empty() && text(h, "REINSTALL")?.is_empty() {
        let choices = selected_integrations(h)?;
        let mut features = vec!["Application", "Payload", "Notices"];
        if choices.start_menu {
            features.push("StartMenu");
        }
        if choices.command_path {
            features.push("CommandPath");
        }
        set(h, "REINSTALL", features.join(","))?;
        set(h, "REINSTALLMODE", "vamus")?;
    }
    Ok(())
}
#[unsafe(no_mangle)]
pub extern "system" fn Configure(h: u32) -> u32 {
    std::panic::catch_unwind(|| report(h, configure(h))).unwrap_or(1603)
}
#[unsafe(no_mangle)]
pub extern "system" fn SelectScope(h: u32) -> u32 {
    std::panic::catch_unwind(|| report(h, select_scope(h))).unwrap_or(1603)
}
#[unsafe(no_mangle)]
pub extern "system" fn SelectFeatures(h: u32) -> u32 {
    std::panic::catch_unwind(|| report(h, select_features(h))).unwrap_or(1603)
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
            crate::runtime_install::effective_token()?.as_handle(),
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
        let p = SHGetKnownFolderPath(
            id,
            KF_FLAG_DEFAULT,
            crate::runtime_install::effective_token()?.as_handle(),
        )
        .map_err(|e| e.to_string())?;
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
        (
            "ProductCode",
            OsString::from(registered_product(machine)?.as_deref().unwrap_or(DUAL)),
        ),
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
    let choices = if registered_product(machine)?.is_some() {
        installed_integrations(machine)?
    } else {
        Integrations::default()
    };
    let link = shortcut(machine)?;
    if choices.start_menu && link.exists() {
        verify_shortcut(&link, &directory.join("local-media-gallery.exe"))?;
    } else if choices.start_menu && complete {
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
    if choices.command_path && (count > 1 || (complete && count != 1)) {
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
    if package_code(
        &registered_product(machine)?.ok_or("Missing native product")?,
        machine,
        payload.as_bytes(),
    )? != package
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
    let package = guid("dual", &hash(PAYLOAD.as_bytes()));
    if registered(machine, "PackageCode")? != Some(OsString::from(&package)) {
        return Err("Registered package does not match candidate".into());
    }
    verify_integrations(machine, directory, &package, true)?;
    scoped_runtime(machine)?;
    Ok(())
}
#[derive(serde::Serialize, serde::Deserialize)]
pub(crate) struct WriterOperand {
    kind: String,
    path: PathBuf,
}
#[derive(serde::Serialize, serde::Deserialize)]
pub(crate) struct DeferredContext {
    pub directory: PathBuf,
    pub machine: bool,
    pub choices: Integrations,
    pub source_msi: PathBuf,
    pub source_msi_record: crate::FileRecord,
    pub storage: Option<PathBuf>,
    pub state: Vec<WriterOperand>,
}
fn preflight(h: u32) -> Result<(), String> {
    if text(h, "ProductCode")? != DUAL {
        return Err("Unknown installer product".into());
    }
    let machine = text(h, "ALLUSERS")? == "1";
    let directory = PathBuf::from(get(h, "INSTALLDIR")?);
    check_path(&directory)?;
    let remove = text(h, "REMOVE")? == "ALL";
    let choices = if remove {
        installed_integrations(machine)?
    } else {
        selected_integrations(h)?
    };
    let recovery = get(h, "LMG_RECOVERY")?;
    if !recovery.is_empty() && !remove {
        recovery_destination(&directory, machine, Path::new(&recovery))?;
    } else if registered_product(machine)?.is_some() {
        let installed =
            registered_install_directory(machine)?.ok_or("Missing installed location")?;
        if !equal_path(&installed, &directory) {
            return Err("The installed location is fixed during maintenance; remove it before moving the application".into());
        }
        let old =
            match fs::read_to_string(directory.join("payload.json")) {
                Ok(text) => text,
                Err(e)
                    if e.kind() == std::io::ErrorKind::NotFound
                        && registered_package(machine)?.as_deref()
                            == Some(guid("dual", &hash(PAYLOAD.as_bytes())).as_str()) =>
                {
                    PAYLOAD.to_owned()
                }
                Err(_) => return Err(
                    "Installed ownership manifest is missing; recover with its matching package"
                        .into(),
                ),
            };
        let old_payload: Payload = serde_json::from_str(&old).map_err(|e| e.to_string())?;
        old_payload.validate()?;
        old_payload.verify(&directory, true)?;
        let code = registered_product(machine)?.ok_or("Missing installed ProductCode")?;
        let package = package_code(&code, machine, old.as_bytes())?;
        if registered_package(machine)?.as_deref() != Some(package.as_str()) {
            return Err("Installed native identity and payload disagree".into());
        }
        verify_integrations_for(machine, &directory, &package, false, &hash(old.as_bytes()))?;
        // A published predecessor can only be removed by its recognized Upgrade row.
        if code != DUAL
            && text(
                h,
                if machine {
                    "LMG_OLD_MACHINE"
                } else {
                    "LMG_OLD_USER"
                },
            )?
            .split(';')
            .all(|c| c != code)
        {
            return Err(
                "The predecessor cannot be replaced by this MSI; retain its matching package"
                    .into(),
            );
        }
    } else {
        if remove {
            return Err("No owned installation exists in the selected context".into());
        }
        if directory.exists()
            && fs::read_dir(&directory)
                .map_err(|e| e.to_string())?
                .next()
                .is_some()
        {
            return Err(
                "Installation location is nonempty and unowned; choose an empty folder".into(),
            );
        }
        for name in ["ProductCode", "PackageCode", "InstallDir", "PayloadSha256"] {
            if registry(machine, KEY, name)?.is_some() {
                return Err(
                    "Unregistered application integration exists; preserve it before retrying"
                        .into(),
                );
            }
        }
    }
    if remove {
        // Removal grants no new retention or vendor authority and schedules none
        // of the deferred install actions. Native ownership checks above suffice.
        return Ok(());
    }
    validate_selected_conflicts(&directory, machine, choices)?;
    let (storage, state) = if recovery.is_empty() {
        (
            None,
            vec![
                WriterOperand {
                    kind: "settings".into(),
                    path: known_folder(&windows::Win32::UI::Shell::FOLDERID_RoamingAppData)?
                        .join("local-media-gallery/settings.json"),
                },
                WriterOperand {
                    kind: "history".into(),
                    path: known_folder(&windows::Win32::UI::Shell::FOLDERID_LocalAppData)?
                        .join("local-media-gallery/state/history.sqlite3"),
                },
            ],
        )
    } else {
        let journal: serde_json::Value =
            serde_json::from_slice(&fs::read(Path::new(&recovery)).map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;
        let state = &journal["state"];
        let operands = if state.is_array() {
            state.clone()
        } else {
            state["operands"].clone()
        };
        let storage = state
            .get("storageRoot")
            .and_then(|s| s.as_str())
            .map(PathBuf::from);
        if let Some(root) = &storage {
            crate::private::validate_directory(root, machine)?;
        }
        (
            storage,
            serde_json::from_value::<Vec<WriterOperand>>(operands).map_err(|e| e.to_string())?,
        )
    };
    let source_msi = PathBuf::from(get(h, "OriginalDatabase")?);
    let source_msi_record = crate::session_source::authenticate(h, &source_msi)?;
    let data = serde_json::to_string(&DeferredContext {
        directory,
        machine,
        choices,
        source_msi,
        source_msi_record,
        storage,
        state,
    })
    .map_err(|e| e.to_string())?;
    for action in [
        "VerifyUserInstalled",
        "VerifyMachineInstalled",
        "VerifyInstallingUserState",
        "ProvisionUserRuntime",
        "ProvisionMachineRuntime",
    ] {
        set(h, action, &data)?;
    }
    Ok(())
}
fn validate_selected_conflicts(
    directory: &Path,
    machine: bool,
    choices: Integrations,
) -> Result<(), String> {
    let owned = if registered_product(machine)?.is_some() {
        Some(installed_integrations(machine)?)
    } else {
        None
    };
    if choices.start_menu && shortcut(machine)?.exists() {
        if !owned.is_some_and(|c| c.start_menu) {
            return Err("An unrelated Start menu shortcut exists; disable that integration or preserve it before installation".into());
        }
        verify_shortcut(
            &shortcut(machine)?,
            &directory.join("local-media-gallery.exe"),
        )?;
    }
    if choices.command_path {
        for system in [false, true] {
            let key = if system {
                "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment"
            } else {
                "Environment"
            };
            for at in std::env::split_paths(&registry(system, key, "Path")?.unwrap_or_default()) {
                if equal_path(&at, directory)
                    && !(system == machine && owned.is_some_and(|c| c.command_path))
                {
                    return Err("The chosen installation location is already an unowned PATH segment; disable PATH integration or preserve it before installation".into());
                }
                if at.join("local-media-gallery.exe").exists() && !equal_path(&at, directory) {
                    return Err(format!(
                        "Command collision at {}; disable PATH integration or preserve the existing command",
                        at.display()
                    ));
                }
            }
        }
    }
    Ok(())
}
pub fn validate_destination(directory: &Path, machine: bool) -> Result<(), String> {
    let package = guid("dual", &hash(PAYLOAD.as_bytes()));
    check_path(directory)?;
    let p: Payload = serde_json::from_str(PAYLOAD).map_err(|e| e.to_string())?;
    p.validate()?;
    let installed = registered(machine, "PackageCode")?;
    if let Some(actual) = installed {
        if actual != OsString::from(&package) {
            return Err("Another candidate/version is installed. Preserve it and use its matching uninstaller; cross-version upgrades belong to the upgrade contract".into());
        }
        let marker = guid("dual", &hash(b"component:local-media-gallery.exe"));
        let mut b = vec![0u16; 32768];
        let mut n = b.len() as u32;
        let state = unsafe {
            MsiGetComponentPathExW(
                wide(
                    registered_product(machine)?
                        .as_deref()
                        .ok_or("Missing native product")?,
                )
                .as_ptr(),
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
/// Read-only owned registration discovery for the managed predecessor path.
/// This grants no replacement authority: the updater must still verify the
/// complete retained predecessor inventory, source identity and native state.
pub fn registered_install_directory(machine: bool) -> Result<Option<PathBuf>, String> {
    let Some(package) = registered_package(machine)? else {
        return Ok(None);
    };
    if registry(machine, KEY, "ProductCode")?
        != Some(OsString::from(
            registered_product(machine)?.ok_or("Missing registered product")?,
        ))
        || registry(machine, KEY, "PackageCode")? != Some(OsString::from(&package))
    {
        return Err("Registered predecessor integration is foreign or changed; preserve it before maintenance".into());
    }
    let directory = registered(machine, "InstallLocation")?
        .map(PathBuf::from)
        .ok_or("Registered predecessor location is missing")?;
    check_path(&directory)?;
    let integrated = registry(machine, KEY, "InstallDir")?
        .map(PathBuf::from)
        .ok_or("Registered predecessor integration location is missing")?;
    if !equal_path(&directory, &integrated) {
        return Err(
            "Registered predecessor locations disagree; preserve them before maintenance".into(),
        );
    }
    Ok(Some(directory))
}
pub fn installed_directory(machine: bool) -> Result<Option<PathBuf>, String> {
    match registered(machine,"PackageCode")? {Some(code) if code==OsString::from(guid("dual",&hash(PAYLOAD.as_bytes())))=>Ok(registered(machine,"InstallLocation")?.map(PathBuf::from)),Some(_)=>Err("A different candidate is registered; use its matching removal package before replacement".into()),None=>Ok(None)}
}
pub fn verify_removed(directory: &Path, machine: bool) -> Result<(), String> {
    if registered(machine, "PackageCode")?.is_some() {
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
        report(
            h,
            (|| {
                let data: DeferredContext = serde_json::from_str(&text(h, "CustomActionData")?)
                    .map_err(|e| e.to_string())?;
                let p: Payload = serde_json::from_str(PAYLOAD).map_err(|e| e.to_string())?;
                p.verify(&data.directory, false)?;
                verify_manifest(&data.directory, false)?;
                verify_integrations_for(
                    data.machine,
                    &data.directory,
                    &guid("dual", &hash(PAYLOAD.as_bytes())),
                    true,
                    &hash(PAYLOAD.as_bytes()),
                )?;
                scoped_runtime(data.machine)?;
                crate::embedded::retain_native(
                    data.machine,
                    &data.source_msi,
                    &data.source_msi_record,
                    &data.directory,
                    data.storage.as_deref(),
                )?;
                Ok(())
            })(),
        )
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
            != crate::recovery_identity(&v)
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
        let product_code = v[side]["native"]["productCode"]
            .as_str()
            .ok_or("Missing recovery ProductCode")?;
        let package = package_code(product_code, machine, text.as_bytes())?;
        if v[side]["native"]["packageCode"] != package {
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
        Some("2") => "dual",
        Some("") | None => "user",
        _ => return Err("Unsupported MSI ALLUSERS scope".into()),
    };
    if scope == "dual" {
        let mut kind = 0;
        let mut flags = 0;
        let mut size = 0;
        let r = unsafe {
            MsiSummaryInfoGetPropertyW(
                summary.0,
                15,
                &mut kind,
                &mut flags,
                ptr::null_mut(),
                ptr::null_mut(),
                &mut size,
            )
        };
        if r != 0 || kind != 3 || flags & 8 != 0 {
            return Err(
                "Dual-purpose MSI must allow native elevation for the all-users choice".into(),
            );
        }
    }
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
    let mut buffer = vec![0u16; 32768];
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

fn verify_selected_writer(data: &DeferredContext) -> Result<(), String> {
    if data.state.is_empty() {
        return Ok(());
    }
    let payload: Payload = serde_json::from_str(PAYLOAD).map_err(|e| e.to_string())?;
    let _parents = crate::private::pin_physical(&data.directory)?;
    let binary = data.directory.join(&payload.binary);
    let record = payload
        .files
        .iter()
        .find(|f| f.path == payload.binary)
        .ok_or("Missing writer identity")?;
    let _binary = crate::open_verified_input(&binary, record)?;
    let mut args = vec![
        OsString::from("state-compatibility"),
        OsString::from("--json"),
    ];
    for operand in &data.state {
        if !matches!(operand.kind.as_str(), "settings" | "history" | "portable") {
            return Err("Invalid selected writer state operand".into());
        }
        check_path(&operand.path)?;
        args.push(OsString::from(format!("--{}", operand.kind)));
        args.push(operand.path.clone().into_os_string());
    }
    let bytes = crate::effective_process::spawn(&binary, &args, true)?.probe()?;
    let result: serde_json::Value = serde_json::from_slice(&bytes)
        .map_err(|_| "Installed writer did not report state compatibility")?;
    if result["compatible"] != true {
        return Err("The installed writer cannot use the selected private state; installation is rolling back".into());
    }
    Ok(())
}
#[unsafe(no_mangle)]
pub extern "system" fn VerifyInstallingUserState(h: u32) -> u32 {
    std::panic::catch_unwind(|| {
        report(
            h,
            (|| {
                let data: DeferredContext = serde_json::from_str(&text(h, "CustomActionData")?)
                    .map_err(|e| e.to_string())?;
                verify_selected_writer(&data)
            })(),
        )
    })
    .unwrap_or(1603)
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
            wide(
                registered_product(machine)?
                    .as_deref()
                    .ok_or("Missing registered product")?,
            )
            .as_ptr(),
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

#[cfg(test)]
mod grouped_feature_tests {
    use super::*;
    use std::collections::BTreeSet;
    #[test]
    #[ignore = "Requires actual current prepared MSI pairs; elected in isolated package CI"]
    fn actual_native_grouped_features_cover_every_file_once() {
        let pairs: Vec<[PathBuf; 2]> = serde_json::from_str(
            &std::env::var("GALLERY_MSI_LAYOUT_PAIRS").expect("Explicit actual MSI pairs required"),
        )
        .unwrap();
        assert!(!pairs.is_empty());
        for pair in pairs {
            for file in pair {
                assert_eq!(inspect_package(&file).unwrap().3, "dual");
                let rows = reinstall_layout(&file).unwrap();
                let features = rows
                    .iter()
                    .filter(|r| r[0] == "Feature")
                    .collect::<Vec<_>>();
                assert_eq!(
                    features
                        .iter()
                        .map(|r| r[1].as_str())
                        .collect::<BTreeSet<_>>(),
                    BTreeSet::from([
                        "Application",
                        "Payload",
                        "Notices",
                        "StartMenu",
                        "CommandPath"
                    ])
                );
                assert!(
                    features.iter().all(|r| r[2].is_empty()
                        && (r[6] == "1" || r[1] == "CommandPath" && r[6] == "2"))
                );
                let members = rows
                    .iter()
                    .filter(|r| r[0] == "FeatureComponents")
                    .collect::<Vec<_>>();
                assert_eq!(
                    members
                        .iter()
                        .filter(|r| r[1] == "Application")
                        .map(|r| r[2].as_str())
                        .collect::<Vec<_>>(),
                    vec!["Integration"]
                );
                for feature in ["Payload", "Notices"] {
                    assert!(members.iter().any(|r| r[1] == feature));
                }
                let file_components = rows
                    .iter()
                    .filter(|r| r[0] == "File")
                    .map(|r| r[2].as_str())
                    .collect::<BTreeSet<_>>();
                let assigned = members
                    .iter()
                    .filter(|r| matches!(r[1].as_str(), "Payload" | "Notices"))
                    .map(|r| r[2].as_str())
                    .collect::<Vec<_>>();
                assert_eq!(assigned.len(), file_components.len());
                assert_eq!(
                    assigned.into_iter().collect::<BTreeSet<_>>(),
                    file_components
                );
            }
        }
    }
}

#[cfg(test)]
mod context_identity_tests {
    use super::*;
    #[test]
    #[ignore = "Requires actual current MSI; elected in isolated package CI"]
    fn actual_native_dual_package_rejects_limited_privilege_summary() {
        #[link(name = "msi")]
        unsafe extern "system" {
            fn MsiGetSummaryInformationW(
                database: u32,
                path: *const u16,
                count: u32,
                summary: *mut u32,
            ) -> u32;
            fn MsiSummaryInfoSetPropertyW(
                summary: u32,
                property: u32,
                kind: u32,
                integer: i32,
                time: *const std::ffi::c_void,
                value: *const u16,
            ) -> u32;
            fn MsiSummaryInfoPersist(summary: u32) -> u32;
        }
        let pairs: Vec<[PathBuf; 2]> = serde_json::from_str(
            &std::env::var("GALLERY_MSI_LAYOUT_PAIRS").expect("Explicit actual MSI required"),
        )
        .unwrap();
        let original = &pairs.first().unwrap()[0];
        assert_eq!(inspect_package(original).unwrap().3, "dual");
        let temp = tempfile::tempdir().unwrap();
        let changed = temp.path().join("limited.msi");
        fs::copy(original, &changed).unwrap();
        let mut summary = 0;
        assert_eq!(
            unsafe { MsiGetSummaryInformationW(0, wide(&changed).as_ptr(), 1, &mut summary) },
            0
        );
        // PID_WORDCOUNT: compressed cabinet plus the limited-privilege bit.
        assert_eq!(
            unsafe { MsiSummaryInfoSetPropertyW(summary, 15, 3, 10, ptr::null(), ptr::null()) },
            0
        );
        assert_eq!(unsafe { MsiSummaryInfoPersist(summary) }, 0);
        assert_eq!(unsafe { MsiCloseHandle(summary) }, 0);
        assert!(
            inspect_package(&changed)
                .unwrap_err()
                .contains("allow native elevation")
        );
        assert_eq!(inspect_package(original).unwrap().3, "dual");
    }

    #[test]
    fn physical_dual_identity_is_shared_but_legacy_authority_stays_context_specific() {
        let bytes = b"retained exact input";
        assert_eq!(
            package_code(DUAL, false, bytes).unwrap(),
            package_code(DUAL, true, bytes).unwrap()
        );
        assert_ne!(
            package_code(USER, false, bytes).unwrap(),
            package_code(MACHINE, true, bytes).unwrap()
        );
        assert!(package_code(USER, true, bytes).is_err());
        assert!(package_code(MACHINE, false, bytes).is_err());
        assert!(package_code("foreign", false, bytes).is_err());
    }
}
