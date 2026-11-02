// SPDX-License-Identifier: Apache-2.0
use gallery_update::FileRecord;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::Read;
use std::path::Path;

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(super) enum Phase {
    Prepared,
    Applying,
    Complete,
}
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Authority {
    pub format_version: u32,
    pub generation: String,
    pub descriptor_sha256: String,
    pub installer_sha256: String,
    pub inventory_sha256: String,
    pub phase: Phase,
}
impl Authority {
    pub fn same_inputs(&self, other: &Self) -> bool {
        self.format_version == 1
            && self.generation == other.generation
            && self.descriptor_sha256 == other.descriptor_sha256
            && self.installer_sha256 == other.installer_sha256
            && self.inventory_sha256 == other.inventory_sha256
    }
}
pub(super) struct Registration {
    pub state: String,
    pub version: String,
    pub arch: String,
}
pub(super) fn registration_active(
    registration: Option<&Registration>,
    version: &str,
) -> Result<bool, String> {
    let Some(r) = registration else {
        return Ok(false);
    };
    if r.arch != "amd64" {
        return Err("Fresh installation registration has a different architecture".into());
    }
    match r.state.as_str() {
        "not-installed" | "config-files" => Ok(false),
        "half-installed" | "unpacked" | "half-configured" | "triggers-awaited"
        | "triggers-pending" | "installed"
            if r.version == version =>
        {
            Ok(true)
        }
        _ => Err("Fresh installation registration differs from authorized package/version".into()),
    }
}
pub(super) fn inventory(files: &[FileRecord]) -> String {
    files
        .iter()
        .map(|f| format!("{}|{}|{}|/{}\n", f.sha256, f.mode, f.bytes, f.path))
        .collect()
}
pub(super) fn digest(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}
fn hash(path: &Path) -> Result<String, String> {
    let mut input = File::open(path).map_err(|e| e.to_string())?;
    let mut h = Sha256::new();
    let mut buffer = [0u8; 65536];
    loop {
        let n = input.read(&mut buffer).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        h.update(&buffer[..n]);
    }
    Ok(hex::encode(h.finalize()))
}
fn metadata(
    path: &Path,
    expected_owner: Option<(u32, u32)>,
) -> Result<Option<fs::Metadata>, String> {
    gallery_update::physical(path)?;
    let m = match fs::symlink_metadata(path) {
        Ok(m) => m,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e.to_string()),
    };
    if !m.is_file() || m.file_type().is_symlink() {
        return Err(format!(
            "Foreign fresh installation file: {}",
            path.display()
        ));
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        if m.nlink() != 1
            || m.mode() & 0o022 != 0
            || expected_owner.is_some_and(|(uid, gid)| m.uid() != uid || m.gid() != gid)
        {
            return Err("Fresh installation file owner, mode or hardlink differs".into());
        }
    }
    #[cfg(windows)]
    let _ = expected_owner;
    Ok(Some(m))
}
fn same_prefix(partial: &Path, complete: &Path) -> Result<bool, String> {
    let mut a = File::open(partial).map_err(|e| e.to_string())?;
    let mut b = File::open(complete).map_err(|e| e.to_string())?;
    if a.metadata().map_err(|e| e.to_string())?.len()
        > b.metadata().map_err(|e| e.to_string())?.len()
    {
        return Ok(false);
    }
    let mut left = [0u8; 65536];
    let mut right = [0u8; 65536];
    loop {
        let n = a.read(&mut left).map_err(|e| e.to_string())?;
        if n == 0 {
            return Ok(true);
        }
        b.read_exact(&mut right[..n]).map_err(|e| e.to_string())?;
        if left[..n] != right[..n] {
            return Ok(false);
        }
    }
}
pub(super) fn reconcile(
    base: &Path,
    files: &[FileRecord],
    phase: Phase,
    active: bool,
    expected_owner: Option<(u32, u32)>,
    source: Option<&Path>,
) -> Result<(), String> {
    if (phase == Phase::Prepared && active) || (phase == Phase::Complete && !active) {
        return Err("Fresh installation phase and registration differ".into());
    }
    for f in files {
        let path = base.join(&f.path);
        let current = metadata(&path, expected_owner)?;
        if let Some(m) = current {
            if phase == Phase::Prepared || !active {
                return Err(format!(
                    "Unattributed pre-install destination: {}",
                    path.display()
                ));
            }
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let expected =
                    u32::from_str_radix(&f.mode.to_string(), 8).map_err(|e| e.to_string())?;
                if m.permissions().mode() & 0o777 != expected {
                    return Err("Changed fresh installation mode".into());
                }
            }
            if f.bytes.parse::<u64>().ok() != Some(m.len()) || hash(&path)? != f.sha256 {
                return Err(format!(
                    "Changed fresh installation content: {}",
                    path.display()
                ));
            }
        } else if phase == Phase::Complete {
            return Err("Completed fresh installation has missing files".into());
        }
        for suffix in [".dpkg-new", ".dpkg-tmp", ".dpkg-old"] {
            let temporary = path.with_file_name(format!(
                "{}{}",
                path.file_name()
                    .ok_or("Missing owned file name")?
                    .to_string_lossy(),
                suffix
            ));
            if metadata(&temporary, expected_owner)?.is_some() {
                if phase != Phase::Applying || !active {
                    return Err("Unattributed native package temporary file".into());
                }
                if suffix == ".dpkg-new" {
                    let source =
                        source.ok_or("Retained source required for interrupted native file")?;
                    if !same_prefix(&temporary, &source.join(&f.path))? {
                        return Err("Foreign native unpack temporary content".into());
                    }
                } else if hash(&temporary)? != f.sha256 {
                    return Err("Foreign native backup content".into());
                }
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn files() -> Vec<FileRecord> {
        ["application", "notice"]
            .into_iter()
            .map(|name| FileRecord {
                path: name.into(),
                bytes: "8".into(),
                sha256: digest(b"approved"),
                mode: 644,
            })
            .collect()
    }
    fn owner() -> Option<(u32, u32)> {
        #[cfg(target_os = "linux")]
        {
            Some((unsafe { libc::getuid() }, unsafe { libc::getgid() }))
        }
        #[cfg(windows)]
        {
            None
        }
    }
    fn put(path: &Path, bytes: &[u8]) {
        fs::write(path, bytes).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(path, fs::Permissions::from_mode(0o644)).unwrap();
        }
    }
    #[test]
    fn interrupted_fresh_unpack_allows_only_attributable_missing_files() {
        let d = tempfile::tempdir().unwrap();
        let f = files();
        reconcile(d.path(), &f, Phase::Prepared, false, owner(), None).unwrap();
        put(&d.path().join("application"), b"approved");
        assert!(reconcile(d.path(), &f, Phase::Prepared, false, owner(), None).is_err());
        assert!(reconcile(d.path(), &f, Phase::Applying, false, owner(), None).is_err());
        reconcile(d.path(), &f, Phase::Applying, true, owner(), None).unwrap();
        assert!(reconcile(d.path(), &f, Phase::Complete, true, owner(), None).is_err());
        put(&d.path().join("notice"), b"approved");
        reconcile(d.path(), &f, Phase::Complete, true, owner(), None).unwrap();
        put(&d.path().join("application"), b"changed!");
        assert!(reconcile(d.path(), &f, Phase::Applying, true, owner(), None).is_err());
    }
    #[test]
    fn interrupted_native_temporary_must_match_the_retained_source() {
        let d = tempfile::tempdir().unwrap();
        let source = tempfile::tempdir().unwrap();
        for f in files() {
            put(&source.path().join(&f.path), b"approved");
        }
        put(&d.path().join("application.dpkg-new"), b"appro");
        reconcile(
            d.path(),
            &files(),
            Phase::Applying,
            true,
            owner(),
            Some(source.path()),
        )
        .unwrap();
        put(&d.path().join("application.dpkg-new"), b"foreign");
        assert!(
            reconcile(
                d.path(),
                &files(),
                Phase::Applying,
                true,
                owner(),
                Some(source.path())
            )
            .is_err()
        );
    }
    #[cfg(target_os = "linux")]
    #[test]
    fn fresh_reconciliation_refuses_links_redirects_and_foreign_owners() {
        let d = tempfile::tempdir().unwrap();
        let f = files();
        put(&d.path().join("application"), b"approved");
        fs::hard_link(d.path().join("application"), d.path().join("alias")).unwrap();
        assert!(reconcile(d.path(), &f, Phase::Applying, true, owner(), None).is_err());
        fs::remove_file(d.path().join("alias")).unwrap();
        let (uid, gid) = owner().unwrap();
        assert!(
            reconcile(
                d.path(),
                &f,
                Phase::Applying,
                true,
                Some((uid + 1, gid)),
                None
            )
            .is_err()
        );
        fs::remove_file(d.path().join("application")).unwrap();
        std::os::unix::fs::symlink(d.path().join("notice"), d.path().join("application")).unwrap();
        assert!(reconcile(d.path(), &f, Phase::Applying, true, owner(), None).is_err());
    }
    #[test]
    fn foreign_registration_never_authorizes_partial_files() {
        for (state, version, arch) in [
            ("installed", "0.1.0", "amd64"),
            ("half-installed", "0.2.0", "arm64"),
            ("unknown", "0.2.0", "amd64"),
        ] {
            assert!(
                registration_active(
                    Some(&Registration {
                        state: state.into(),
                        version: version.into(),
                        arch: arch.into()
                    }),
                    "0.2.0"
                )
                .is_err()
            );
        }
        assert!(
            registration_active(
                Some(&Registration {
                    state: "half-installed".into(),
                    version: "0.2.0".into(),
                    arch: "amd64".into()
                }),
                "0.2.0"
            )
            .unwrap()
        );
    }
    #[test]
    fn durable_authority_binds_all_retained_inputs_across_phase_changes() {
        let a = Authority {
            format_version: 1,
            generation: "a".repeat(32),
            descriptor_sha256: "b".repeat(64),
            installer_sha256: "c".repeat(64),
            inventory_sha256: digest(inventory(&files()).as_bytes()),
            phase: Phase::Prepared,
        };
        let mut b: Authority = serde_json::from_value(serde_json::to_value(&a).unwrap()).unwrap();
        b.phase = Phase::Applying;
        assert!(a.same_inputs(&b));
        b.installer_sha256 = "d".repeat(64);
        assert!(!a.same_inputs(&b));
        let mut value = serde_json::to_value(a).unwrap();
        value["phase"] = serde_json::json!("unknown");
        assert!(serde_json::from_value::<Authority>(value).is_err());
    }
}
