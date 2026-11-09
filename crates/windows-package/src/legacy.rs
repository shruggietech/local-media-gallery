// SPDX-License-Identifier: Apache-2.0
//! Compatibility guard embedded in payload-specific legacy MSI patches.
use super::*;
#[link(name = "msi")]
unsafe extern "system" {
    fn MsiGetComponentPathW(
        product: *const u16,
        component: *const u16,
        path: *mut u16,
        length: *mut u32,
    ) -> i32;
    fn MsiQueryComponentStateW(
        product: *const u16,
        sid: *const u16,
        context: u32,
        component: *const u16,
        state: *mut i32,
    ) -> u32;
    fn MsiEnumClientsExW(
        component: *const u16,
        sid: *const u16,
        context: u32,
        index: u32,
        product: *mut u16,
        actual_context: *mut u32,
        actual_sid: *mut u16,
        sid_length: *mut u32,
    ) -> u32;
}
struct ComponentObservation<'a> {
    extended: i32,
    extended_path: &'a Path,
    ordinary: i32,
    ordinary_path: &'a Path,
    registered: i32,
    clients: &'a [(String, u32)],
}
fn verify_legacy_component_observations(
    expected: &Path,
    value: &ComponentObservation<'_>,
    product: &str,
    context: u32,
) -> Result<(), String> {
    if value.registered != 3
        || ![2, 3].contains(&value.ordinary)
        || !equal_path(value.ordinary_path, expected)
        || !matches!(value.extended, -1 | 3)
        || (value.extended == 3 && !equal_path(value.extended_path, expected))
        || value.clients.len() != 1
        || !value.clients[0].0.eq_ignore_ascii_case(product)
        || value.clients[0].1 != context
    {
        return Err("Legacy component identity, context or registered path differs".into());
    }
    Ok(())
}
fn component_identity(directory: &Path, machine: bool) -> Result<(), String> {
    let context = if machine { 4 } else { 2 };
    let product = product(machine);
    let component = guid(
        if machine { "machine" } else { "user" },
        &hash(b"component:local-media-gallery.exe"),
    );
    let (mut extended, mut ordinary) = (vec![0u16; 32768], vec![0u16; 32768]);
    let (mut extended_length, mut ordinary_length) = (32768u32, 32768u32);
    let extended_state = unsafe {
        MsiGetComponentPathExW(
            wide(product).as_ptr(),
            wide(&component).as_ptr(),
            ptr::null(),
            context,
            extended.as_mut_ptr(),
            &mut extended_length,
        )
    };
    let ordinary_state = unsafe {
        MsiGetComponentPathW(
            wide(product).as_ptr(),
            wide(&component).as_ptr(),
            ordinary.as_mut_ptr(),
            &mut ordinary_length,
        )
    };
    if ordinary_length >= 32768 || (extended_state == 3 && extended_length >= 32768) {
        return Err("Legacy component lookup exceeded its buffer".into());
    }
    let (extended_path, ordinary_path) = (
        if extended_state == 3 {
            PathBuf::from(OsString::from_wide(&extended[..extended_length as usize]))
        } else {
            PathBuf::new()
        },
        PathBuf::from(OsString::from_wide(&ordinary[..ordinary_length as usize])),
    );
    let mut state = 0;
    let status = unsafe {
        MsiQueryComponentStateW(
            wide(product).as_ptr(),
            ptr::null(),
            context,
            wide(&component).as_ptr(),
            &mut state,
        )
    };
    if status != 0 {
        return Err(format!("Legacy component state: {status}"));
    }
    let mut clients = vec![];
    for index in 0..16 {
        let (mut client, mut sid) = (vec![0u16; 39], vec![0u16; 1024]);
        let (mut actual_context, mut sid_length) = (0, 1024u32);
        let status = unsafe {
            MsiEnumClientsExW(
                wide(&component).as_ptr(),
                ptr::null(),
                context,
                index,
                client.as_mut_ptr(),
                &mut actual_context,
                sid.as_mut_ptr(),
                &mut sid_length,
            )
        };
        if status == 259 {
            break;
        }
        if status != 0 || sid_length >= 1024 {
            return Err(format!("Legacy component clients: {status}"));
        }
        let length = client
            .iter()
            .position(|&c| c == 0)
            .ok_or("Invalid component client")?;
        clients.push((
            String::from_utf16(&client[..length]).map_err(|e| e.to_string())?,
            actual_context,
        ));
    }
    verify_legacy_component_observations(
        &directory.join("local-media-gallery.exe"),
        &ComponentObservation {
            extended: extended_state,
            extended_path: &extended_path,
            ordinary: ordinary_state,
            ordinary_path: &ordinary_path,
            registered: state,
            clients: &clients,
        },
        product,
        context,
    )
}
fn scope(h: u32) -> Result<bool, String> {
    match text(h, "ProductCode")?.as_str() {
        MACHINE => Ok(true),
        USER => Ok(false),
        _ => Err("Legacy recovery patch has a different ProductCode".into()),
    }
}
fn configure(h: u32) -> Result<(), String> {
    if scope(h)? {
        // Set before costing. Do not retarget an already-costed read-only OS folder.
        set(
            h,
            "MachinePrograms",
            known_folder(&FOLDERID_CommonPrograms)?,
        )?;
    }
    Ok(())
}
fn preflight(h: u32) -> Result<(), String> {
    let machine = scope(h)?;
    let payload: Payload = serde_json::from_str(PAYLOAD).map_err(|e| e.to_string())?;
    payload.validate()?;
    if !matches!(payload.version.as_str(), "0.1.0" | "0.2.0") || payload.edition != "full" {
        return Err("This patch was not built for a supported published predecessor".into());
    }
    let expected_package = guid(
        if machine { "machine" } else { "user" },
        &hash(PAYLOAD.as_bytes()),
    );
    if registered_for(product(machine), machine, "PackageCode")?
        != Some(OsString::from(&expected_package))
        || registered_product(machine)?.as_deref() != Some(product(machine))
    {
        return Err("Legacy recovery requires its exact scoped installed package".into());
    }
    let directory = PathBuf::from(get(h, "INSTALLDIR")?);
    let registered =
        registered_install_directory(machine)?.ok_or("Legacy installed location missing")?;
    if !equal_path(&directory, &registered) {
        return Err("Legacy registered destination differs".into());
    }
    let _pins = crate::private::pin_physical(&directory)?;
    component_identity(&directory, machine)?;
    payload.verify(&directory, true)?;
    verify_manifest(&directory, true)?;
    verify_integrations_for(
        machine,
        &directory,
        &expected_package,
        false,
        &hash(PAYLOAD.as_bytes()),
    )?;
    if machine
        && !equal_path(
            Path::new(&get(h, "MachinePrograms")?),
            &known_folder(&FOLDERID_CommonPrograms)?,
        )
    {
        return Err("Legacy common Programs binding differs".into());
    }
    if text(h, "REMOVE")? != "ALL" {
        scoped_runtime(machine)?;
    }
    // Preserve the original DLL's deferred verification contract.
    let mut data = directory.into_os_string();
    data.push(if machine { "|machine" } else { "|user" });
    set(h, "VerifyInstalled", data)?;
    Ok(())
}
#[unsafe(no_mangle)]
pub extern "system" fn LegacyConfigure(h: u32) -> u32 {
    std::panic::catch_unwind(|| report(h, configure(h))).unwrap_or(1603)
}
#[unsafe(no_mangle)]
pub extern "system" fn LegacyPreflight(h: u32) -> u32 {
    std::panic::catch_unwind(|| report(h, preflight(h))).unwrap_or(1603)
}
pub(super) fn needs_patch(directory: &Path, machine: bool) -> Result<bool, String> {
    let component = guid(
        if machine { "machine" } else { "user" },
        &hash(b"component:local-media-gallery.exe"),
    );
    let mut buffer = vec![0u16; 32768];
    let mut length = 32768u32;
    let state = unsafe {
        MsiGetComponentPathExW(
            wide(product(machine)).as_ptr(),
            wide(&component).as_ptr(),
            ptr::null(),
            if machine { 4 } else { 2 },
            buffer.as_mut_ptr(),
            &mut length,
        )
    };
    match state {
        -1 | 2 => Ok(true),
        3 if length < 32768
            && equal_path(
                &PathBuf::from(OsString::from_wide(&buffer[..length as usize])),
                &directory.join("local-media-gallery.exe"),
            ) =>
        {
            Ok(false)
        }
        _ => Err("Unexpected legacy extended component identity".into()),
    }
}

pub(super) fn patch_applied(file: &Path, machine: bool) -> Result<bool, String> {
    #[link(name = "msi")]
    unsafe extern "system" {
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
        fn MsiGetPatchInfoExW(
            patch: *const u16,
            product: *const u16,
            sid: *const u16,
            context: u32,
            property: *const u16,
            value: *mut u16,
            length: *mut u32,
        ) -> u32;
    }
    let mut summary = 0;
    let code = unsafe { MsiGetSummaryInformationW(0, wide(file).as_ptr(), 0, &mut summary) };
    if code != 0 {
        return Err(format!("Cannot read legacy patch identity: {code}"));
    }
    let (mut kind, mut integer, mut time, mut buffer, mut length) =
        (0, 0, [0u32; 2], vec![0u16; 256], 256u32);
    let code = unsafe {
        let code = MsiSummaryInfoGetPropertyW(
            summary,
            9,
            &mut kind,
            &mut integer,
            time.as_mut_ptr().cast(),
            buffer.as_mut_ptr(),
            &mut length,
        );
        MsiCloseHandle(summary);
        code
    };
    if code != 0 || length >= 256 {
        return Err(format!("Invalid legacy patch summary: {code}"));
    }
    let patch = String::from_utf16(&buffer[..length as usize]).map_err(|e| e.to_string())?;
    let bytes = patch.as_bytes();
    if bytes.len() != 38
        || bytes[0] != b'{'
        || bytes[37] != b'}'
        || !bytes[1..37].iter().enumerate().all(|(i, c)| {
            if [8, 13, 18, 23].contains(&i) {
                *c == b'-'
            } else {
                c.is_ascii_hexdigit()
            }
        })
    {
        return Err("Invalid legacy patch GUID".into());
    }
    let mut output = vec![0u16; 16];
    let mut count = 16;
    let code = unsafe {
        MsiGetPatchInfoExW(
            wide(&patch).as_ptr(),
            wide(product(machine)).as_ptr(),
            ptr::null(),
            if machine { 4 } else { 2 },
            wide("State").as_ptr(),
            output.as_mut_ptr(),
            &mut count,
        )
    };
    if code == 1647 {
        return Ok(false);
    }
    if code != 0 || count >= 16 {
        return Err(format!("Cannot inspect scoped legacy patch state: {code}"));
    }
    let state = String::from_utf16(&output[..count as usize]).map_err(|e| e.to_string())?;
    if state != "1" {
        return Err(format!(
            "Selected legacy patch is not the active applied patch: {state}"
        ));
    }
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn failed_extended_lookup_requires_all_independent_component_proofs() {
        let expected = PathBuf::from(r"C:\owned legacy\local-media-gallery.exe");
        let client = (MACHINE.to_string(), 4);
        let clients = std::slice::from_ref(&client);
        let observation = ComponentObservation {
            extended: -1,
            extended_path: Path::new(""),
            ordinary: 3,
            ordinary_path: &expected,
            registered: 3,
            clients,
        };
        let check = |v: &ComponentObservation<'_>| {
            verify_legacy_component_observations(&expected, v, MACHINE, 4)
        };
        assert!(check(&observation).is_ok());
        assert!(
            check(&ComponentObservation {
                extended: 3,
                extended_path: &expected,
                ..observation
            })
            .is_ok()
        );
        assert!(
            check(&ComponentObservation {
                ordinary: 2,
                ..observation
            })
            .is_ok()
        );
        assert!(
            check(&ComponentObservation {
                extended: 2,
                ..observation
            })
            .is_err()
        );
        assert!(
            check(&ComponentObservation {
                ordinary: -1,
                ..observation
            })
            .is_err()
        );
        assert!(
            check(&ComponentObservation {
                registered: 2,
                ..observation
            })
            .is_err()
        );
        assert!(
            check(&ComponentObservation {
                extended: 3,
                extended_path: Path::new(r"C:\foreign"),
                ..observation
            })
            .is_err()
        );
        assert!(
            check(&ComponentObservation {
                ordinary_path: Path::new(r"C:\foreign"),
                ..observation
            })
            .is_err()
        );
        assert!(
            check(&ComponentObservation {
                clients: &[],
                ..observation
            })
            .is_err()
        );
        assert!(
            check(&ComponentObservation {
                clients: &[client.clone(), client.clone()],
                ..observation
            })
            .is_err()
        );
        assert!(
            check(&ComponentObservation {
                clients: &[(MACHINE.into(), 2)],
                ..observation
            })
            .is_err()
        );
        assert!(
            check(&ComponentObservation {
                clients: &[(USER.into(), 4)],
                ..observation
            })
            .is_err()
        );
    }
}
