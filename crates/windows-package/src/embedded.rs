// SPDX-License-Identifier: Apache-2.0
//! Strict self-contained installer container. No external neighbors are inputs.
use crate::{FileRecord, hash, portable};
use serde::Deserialize;
#[derive(Deserialize)]
struct Index {
    format_version: u32,
    files: Vec<FileRecord>,
}
pub struct Embedded<'a> {
    pub files: Vec<(FileRecord, &'a [u8])>,
}
impl<'a> Embedded<'a> {
    pub fn parse(bytes: &'a [u8]) -> Result<Self, String> {
        if bytes.len() < 8 {
            return Err("Truncated embedded header".into());
        }
        let size = u64::from_le_bytes(bytes[..8].try_into().unwrap());
        if size > 16 * 1024 * 1024 {
            return Err("Oversized embedded index".into());
        }
        let end = 8usize
            .checked_add(size as usize)
            .ok_or("Embedded overflow")?;
        let index: Index =
            serde_json::from_slice(bytes.get(8..end).ok_or("Truncated embedded index")?)
                .map_err(|e| e.to_string())?;
        if index.format_version != 1 || index.files.is_empty() || index.files.len() > 4096 {
            return Err("Invalid embedded index".into());
        }
        let mut cursor = end;
        let mut names = std::collections::HashSet::new();
        let mut files = Vec::new();
        for record in index.files {
            if !portable(&record.path) || !names.insert(record.path.to_ascii_lowercase()) {
                return Err("Invalid embedded path".into());
            }
            let n = record
                .bytes
                .parse::<u64>()
                .map_err(|_| "Invalid embedded size")?;
            if n > 1073741824 || n.to_string() != record.bytes {
                return Err("Invalid embedded size".into());
            }
            let next = cursor
                .checked_add(n as usize)
                .ok_or("Embedded size overflow")?;
            let data = bytes
                .get(cursor..next)
                .ok_or("Truncated embedded payload")?;
            if hash(data) != record.sha256 {
                return Err("Embedded input identity differs".into());
            }
            files.push((record, data));
            cursor = next;
        }
        if cursor != bytes.len() {
            return Err("Unexpected embedded trailing bytes".into());
        }
        Ok(Self { files })
    }
    pub fn record(&self, name: &str) -> Result<&FileRecord, String> {
        self.files
            .iter()
            .find(|(r, _)| r.path == name)
            .map(|(r, _)| r)
            .ok_or_else(|| format!("Missing embedded member {name}"))
    }
}
#[cfg(windows)]
pub struct Retained {
    pub directory: std::path::PathBuf,
    _locks: Vec<std::fs::File>,
}
#[cfg(windows)]
pub fn retain(machine: bool, input: &serde_json::Value) -> Result<Retained, String> {
    use std::io::Write;
    let embedded = Embedded::parse(crate::INSTALLER_BYTES)?;
    if (input["scope"] == "machine") != machine {
        return Err("Embedded scope differs".into());
    }
    let storage = crate::private::ensure_storage_root(machine)?;
    let directory = storage.join(format!("package-{}", hash(crate::SETUP.as_bytes())));
    let mut locks = if directory.exists() {
        crate::private::validate_directory(&directory, machine)?
    } else {
        crate::private::create_directory(&directory, machine)?
    };
    let setup = FileRecord {
        path: "setup.json".into(),
        bytes: crate::SETUP.len().to_string(),
        sha256: hash(crate::SETUP.as_bytes()),
    };
    for (record, data) in embedded
        .files
        .iter()
        .map(|(r, b)| (r, *b))
        .chain(std::iter::once((&setup, crate::SETUP.as_bytes())))
    {
        let file = directory.join(&record.path);
        let parent = file.parent().ok_or("Missing embedded parent")?;
        if !parent.exists() {
            crate::private::child_directories(parent)?;
        }
        if !file.exists() {
            let mut f = crate::private::create_file(&file)?;
            f.write_all(data)
                .and_then(|_| f.sync_all())
                .map_err(|e| e.to_string())?;
        }
        crate::private::validate_file(&file, machine)?;
        locks.push(crate::open_verified_input(&file, record)?);
    }
    Ok(Retained {
        directory,
        _locks: locks,
    })
}

#[cfg(windows)]
fn seed_published_predecessor(
    bundle: &Retained,
    input: &serde_json::Value,
    directory: &std::path::Path,
    registered: &str,
) -> Result<Option<std::path::PathBuf>, String> {
    use std::io::Write;
    let predecessor = &input["predecessor"];
    if predecessor["scope"] != "machine"
        || predecessor["msi"]["packageCode"].as_str() != Some(registered)
    {
        return Ok(None);
    }
    let source = bundle.directory.join("predecessors/0.1.0");
    let release_bytes = std::fs::read(source.join("release.json")).map_err(|e| e.to_string())?;
    validate_published_release(&release_bytes)?;
    let payload =
        std::fs::read_to_string(source.join("payload.json")).map_err(|e| e.to_string())?;
    // Never synthesize authority from observed installed bytes. The embedded,
    // canonical published inventory must match registration and every owned file.
    crate::native::verify_install_payload(directory, true, &payload, registered)?;
    let setup = std::fs::read(source.join("setup.json")).map_err(|e| e.to_string())?;
    let setup_value: serde_json::Value =
        serde_json::from_slice(&setup).map_err(|e| e.to_string())?;
    if setup_value != *predecessor {
        return Err("Published predecessor receipt differs".into());
    }
    let root = crate::private::storage_root(true)?;
    let retained = root.join(format!("package-{}", hash(&setup)));
    let _pins = if retained.exists() {
        crate::private::validate_directory(&retained, true)?
    } else {
        crate::private::create_directory(&retained, true)?
    };
    let msi = predecessor["msi"]["path"]
        .as_str()
        .ok_or("Invalid published MSI path")?;
    if !portable(msi) || msi.contains('/') {
        return Err("Invalid published MSI leaf".into());
    }
    for name in [
        msi,
        "update.json",
        "payload.json",
        "setup.json",
        "release.json",
    ] {
        let data = std::fs::read(source.join(name)).map_err(|e| e.to_string())?;
        let file = retained.join(name);
        let record = FileRecord {
            path: name.into(),
            bytes: data.len().to_string(),
            sha256: hash(&data),
        };
        if !file.exists() {
            let mut output = crate::private::create_file(&file)?;
            output
                .write_all(&data)
                .and_then(|_| output.sync_all())
                .map_err(|e| e.to_string())?;
        }
        crate::private::validate_file(&file, true)?;
        let _verified = crate::open_verified_input(&file, &record)?;
    }
    Ok(Some(retained))
}
#[cfg(any(windows, test))]
fn validate_published_release(bytes: &[u8]) -> Result<(), String> {
    if hash(bytes) != "079615f3ff8434b32c3c632190b544c6c32e17513fa125ec7e07f679a1c65f1f" {
        return Err("Published predecessor release identity differs".into());
    }
    let record: serde_json::Value = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
    if record["version"] != "0.1.0"
        || record["state"] != "published"
        || record["product"] != "local-media-gallery"
    {
        return Err("Published predecessor record is not the supported product release".into());
    }
    Ok(())
}
#[cfg(windows)]
pub fn maintenance(
    bundle: &Retained,
    input: &serde_json::Value,
    directory: &std::path::Path,
    operation: &str,
) -> Result<serde_json::Value, String> {
    use std::{
        os::windows::process::CommandExt,
        path::PathBuf,
        process::{Command, Stdio},
    };
    let machine = input["scope"] == "machine";
    let transaction = bundle
        .directory
        .parent()
        .ok_or("Missing maintenance parent")?
        .join(format!("ordinary-{}", hash(crate::SETUP.as_bytes())));
    let mut args: Vec<std::ffi::OsString> = vec![
        operation.into(),
        "--transaction".into(),
        transaction.as_os_str().to_owned(),
    ];
    let mut prior_locks = Vec::new();
    if operation == "update" {
        let package = crate::native::registered_package(machine)?
            .ok_or("No owned installation is registered for update")?;
        let mut prior = None;
        for entry in
            std::fs::read_dir(bundle.directory.parent().unwrap()).map_err(|e| e.to_string())?
        {
            let entry = entry.map_err(|e| e.to_string())?;
            let name = entry.file_name();
            if !name.to_string_lossy().starts_with("package-") {
                continue;
            }
            let path = entry.path();
            let setup = path.join("setup.json");
            if !setup.is_file() {
                continue;
            }
            let bytes = std::fs::read(&setup).map_err(|e| e.to_string())?;
            let value: serde_json::Value =
                serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
            if value["msi"]["packageCode"].as_str() == Some(&package)
                && value["scope"] == input["scope"]
            {
                prior_locks.extend(crate::private::validate_directory(&path, machine)?);
                crate::private::validate_file(&setup, machine)?;
                let identity = FileRecord {
                    path: "setup.json".into(),
                    bytes: bytes.len().to_string(),
                    sha256: hash(&bytes),
                };
                prior_locks.push(crate::open_verified_input(&setup, &identity)?);
                if name.to_string_lossy() != format!("package-{}", hash(&bytes)) {
                    return Err("Retained maintenance identity differs".into());
                }
                if prior.replace(path).is_some() {
                    return Err("Ambiguous retained installation metadata".into());
                }
            }
        }
        if prior.is_none() {
            prior = seed_published_predecessor(bundle, input, directory, &package)?;
        }
        let prior=prior.ok_or("Prior owned installer receipt is missing. Restore its managed recovery storage before updating")?;
        args.extend([
            "--directory".into(),
            directory.as_os_str().to_owned(),
            "--from".into(),
            prior.join("update.json").into_os_string(),
            "--to".into(),
            bundle.directory.join("update.json").into_os_string(),
            "--source".into(),
            bundle.directory.join("source").into_os_string(),
        ]);
        for (key, base, rel) in [
            (
                "--state-settings",
                "APPDATA",
                "tech.shruggie.local-media-gallery/settings.json",
            ),
            (
                "--state-history",
                "LOCALAPPDATA",
                "tech.shruggie.local-media-gallery/state/history.sqlite3",
            ),
        ] {
            let base =
                PathBuf::from(std::env::var_os(base).ok_or("Missing recipient profile location")?);
            args.extend([key.into(), base.join(rel).into_os_string()]);
        }
    }
    let output = Command::new(bundle.directory.join("lmg-update.exe"))
        .args(args)
        .creation_flags(0x08000000)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(format!(
            "Managed {operation} requires recovery: {} {}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .rev()
        .find_map(|line| serde_json::from_str(line).ok())
        .ok_or("Updater returned no terminal result".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn pack(paths: &[&str]) -> Vec<u8> {
        let files: Vec<_> = paths
            .iter()
            .map(|p| serde_json::json!({"path":p,"bytes":"1","sha256":hash(b"x")}))
            .collect();
        let index =
            serde_json::to_vec(&serde_json::json!({"format_version":1,"files":files})).unwrap();
        let mut b = (index.len() as u64).to_le_bytes().to_vec();
        b.extend(index);
        b.extend(vec![b'x'; paths.len()]);
        b
    }
    #[test]
    fn only_the_exact_published_predecessor_record_can_seed_authority() {
        let bytes = include_bytes!("../../gallery-preparation/tests/fixtures/release-0.1.0.json");
        assert!(validate_published_release(bytes).is_ok());
        let mut changed = bytes.to_vec();
        changed.push(b' ');
        assert!(validate_published_release(&changed).is_err());
        assert!(
            validate_published_release(
                br#"{"product":"local-media-gallery","version":"0.1.0","state":"published"}"#
            )
            .is_err()
        );
    }
    #[test]
    fn embedded_container_rejects_tampering_truncation_and_extra_bytes() {
        let b = pack(&["application.msi"]);
        assert!(Embedded::parse(&b).is_ok());
        for n in [0, 7, b.len() - 1] {
            assert!(Embedded::parse(&b[..n]).is_err())
        }
        let mut changed = b.clone();
        *changed.last_mut().unwrap() = b'y';
        assert!(Embedded::parse(&changed).is_err());
        let mut extra = b;
        extra.push(0);
        assert!(Embedded::parse(&extra).is_err());
    }
    #[test]
    fn embedded_container_rejects_aliases_traversal_and_duplicates() {
        for paths in [
            vec!["../setup.exe"],
            vec!["CON"],
            vec!["a.exe", "A.EXE"],
            vec!["x:stream"],
            vec!["/absolute"],
        ] {
            assert!(Embedded::parse(&pack(&paths)).is_err())
        }
    }
}
