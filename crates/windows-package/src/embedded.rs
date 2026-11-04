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
    let embedded = Embedded::parse(crate::INSTALLER_BYTES)?;
    if (input["scope"] == "machine") != machine {
        return Err("Embedded scope differs".into());
    }
    let storage = crate::private::ensure_storage_root(machine)?;
    let directory = storage.join(format!("package-{}", hash(crate::SETUP.as_bytes())));
    let setup = FileRecord {
        path: "setup.json".into(),
        bytes: crate::SETUP.len().to_string(),
        sha256: hash(crate::SETUP.as_bytes()),
    };
    let entries: Vec<_> = embedded
        .files
        .iter()
        .map(|(record, data)| (record, *data))
        .chain(std::iter::once((&setup, crate::SETUP.as_bytes())))
        .collect();
    retain_complete(&directory, machine, &entries)
}
#[cfg(windows)]
fn retain_complete(
    directory: &std::path::Path,
    machine: bool,
    entries: &[(&FileRecord, &[u8])],
) -> Result<Retained, String> {
    retain_complete_with(
        directory,
        machine,
        entries,
        |file, bytes| {
            use std::io::Write;
            file.write_all(bytes)
        },
        publish_directory,
    )
}
#[cfg(windows)]
fn present(path: &std::path::Path) -> Result<bool, String> {
    match std::fs::symlink_metadata(path) {
        Ok(_) => Ok(true),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}
#[cfg(windows)]
fn verified_retention(
    directory: &std::path::Path,
    machine: bool,
    entries: &[(&FileRecord, &[u8])],
) -> Result<Retained, String> {
    let mut locks = crate::private::validate_directory(directory, machine)?;
    let expected: std::collections::BTreeSet<_> =
        entries.iter().map(|(r, _)| r.path.to_lowercase()).collect();
    let mut seen = std::collections::BTreeSet::new();
    fn visit(
        root: &std::path::Path,
        at: &std::path::Path,
        machine: bool,
        expected: &std::collections::BTreeSet<String>,
        seen: &mut std::collections::BTreeSet<String>,
        locks: &mut Vec<std::fs::File>,
    ) -> Result<(), String> {
        for child in std::fs::read_dir(at).map_err(|e| e.to_string())? {
            let child = child.map_err(|e| e.to_string())?;
            let path = child.path();
            let relative = path
                .strip_prefix(root)
                .map_err(|e| e.to_string())?
                .to_str()
                .ok_or("Non-Unicode retained member")?
                .replace('\\', "/")
                .to_lowercase();
            let kind = child.file_type().map_err(|e| e.to_string())?;
            if kind.is_dir() {
                if !expected
                    .iter()
                    .any(|name| name.starts_with(&(relative.clone() + "/")))
                {
                    return Err("Unexpected retained directory".into());
                }
                locks.extend(crate::private::validate_directory(&path, machine)?);
                visit(root, &path, machine, expected, seen, locks)?;
            } else if !kind.is_file() || !expected.contains(&relative) || !seen.insert(relative) {
                return Err("Unexpected retained file, alias or redirect".into());
            }
        }
        Ok(())
    }
    visit(
        directory, directory, machine, &expected, &mut seen, &mut locks,
    )?;
    if seen != expected {
        return Err("Retained directory is incomplete; preserve it before recovery".into());
    }
    for (record, _) in entries {
        let file = directory.join(&record.path);
        crate::private::validate_file(&file, machine)?;
        locks.push(crate::open_verified_input(&file, record)?);
    }
    Ok(Retained {
        directory: directory.to_owned(),
        _locks: locks,
    })
}
#[cfg(windows)]
fn publish_directory(stage: &std::path::Path, directory: &std::path::Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn MoveFileExW(from: *const u16, to: *const u16, flags: u32) -> i32;
    }
    let from: Vec<_> = stage.as_os_str().encode_wide().chain(Some(0)).collect();
    let to: Vec<_> = directory.as_os_str().encode_wide().chain(Some(0)).collect();
    // No REPLACE_EXISTING: even an empty competing directory is never overwritten.
    if unsafe { MoveFileExW(from.as_ptr(), to.as_ptr(), 8) } == 0 {
        return Err(std::io::Error::last_os_error().to_string());
    }
    Ok(())
}
#[cfg(windows)]
fn retain_complete_with(
    directory: &std::path::Path,
    machine: bool,
    entries: &[(&FileRecord, &[u8])],
    mut write: impl FnMut(&mut std::fs::File, &[u8]) -> std::io::Result<()>,
    publish: impl FnOnce(&std::path::Path, &std::path::Path) -> Result<(), String>,
) -> Result<Retained, String> {
    if present(directory)? {
        return verified_retention(directory, machine, entries);
    }
    let parent = directory.parent().ok_or("Missing retained parent")?;
    let _parent_pins = crate::private::validate_directory(parent, machine)?;
    crate::scratch::Stage::reclaim(
        parent,
        parent,
        ".lmg-retaining-",
        "embedded",
        machine,
        |_| true,
    )?;
    let id = unsafe { windows::Win32::System::Com::CoCreateGuid() }.map_err(|e| e.to_string())?;
    let stage = parent.join(format!(".lmg-retaining-{:032x}", id.to_u128()));
    // Incomplete stages are not authority. A terminated process can leave one;
    // retries create a distinct stage and never adopt or overwrite the orphan.
    let mut guard = crate::scratch::Stage::create(
        parent,
        &stage,
        "embedded",
        entries.iter().map(|(r, _)| r.path.clone()).collect(),
        Default::default(),
        machine,
    )?;
    for (record, data) in entries {
        if !portable(&record.path) {
            return Err("Invalid retained member".into());
        }
        let file = stage.join(&record.path);
        let folder = file.parent().ok_or("Missing staged parent")?;
        if !present(folder)? {
            crate::private::child_directories(folder)?;
        }
        let mut output = crate::private::create_file(&file)?;
        write(&mut output, data)
            .and_then(|_| output.sync_all())
            .map_err(|e| e.to_string())?;
    }
    // Release stage/file pins before the directory rename; they deny Windows deletion.
    guard.validate("embedded")?;
    for (record, _) in entries {
        drop(crate::open_verified_input(
            &stage.join(&record.path),
            record,
        )?);
    }
    if let Err(error) = publish(&stage, directory) {
        if !present(directory)? {
            return Err(error);
        }
        return verified_retention(directory, machine, entries);
    }
    guard.published(directory)?;
    verified_retention(directory, machine, entries)
}

#[cfg(windows)]
fn seed_published_predecessor(
    bundle: &Retained,
    input: &serde_json::Value,
    directory: &std::path::Path,
    registered: &str,
) -> Result<Option<std::path::PathBuf>, String> {
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
    let msi = predecessor["msi"]["path"]
        .as_str()
        .ok_or("Invalid published MSI path")?;
    if !portable(msi) || msi.contains('/') {
        return Err("Invalid published MSI leaf".into());
    }
    let mut owned = Vec::new();
    for name in [
        msi,
        "update.json",
        "payload.json",
        "setup.json",
        "release.json",
    ] {
        let data = std::fs::read(source.join(name)).map_err(|e| e.to_string())?;
        owned.push((
            FileRecord {
                path: name.into(),
                bytes: data.len().to_string(),
                sha256: hash(&data),
            },
            data,
        ));
    }
    let entries: Vec<_> = owned
        .iter()
        .map(|(record, data)| (record, data.as_slice()))
        .collect();
    let _complete = retain_complete(&retained, true, &entries)?;
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
                "local-media-gallery/settings.json",
            ),
            (
                "--state-history",
                "LOCALAPPDATA",
                "local-media-gallery/state/history.sqlite3",
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

    #[cfg(windows)]
    fn retention_fixture() -> (tempfile::TempDir, std::path::PathBuf) {
        let temp = tempfile::tempdir().unwrap();
        let private = temp.path().join("authority");
        crate::private::ensure_storage_at(&private, false).unwrap();
        (temp, private)
    }
    #[cfg(windows)]
    fn retained_test_record() -> FileRecord {
        FileRecord {
            path: "source/input.bin".into(),
            bytes: "24".into(),
            sha256: hash(b"complete retained input!"),
        }
    }
    #[cfg(windows)]
    fn retained_test_entries(record: &FileRecord) -> [(&FileRecord, &'static [u8]); 1] {
        [(record, b"complete retained input!")]
    }
    #[cfg(windows)]
    #[test]
    fn retention_child_fixture() {
        let Some(root) = std::env::var_os("LMG_RETENTION_KILL_ROOT") else {
            return;
        };
        let root = std::path::PathBuf::from(root);
        let record = retained_test_record();
        let _ = retain_complete_with(
            &root.join("package"),
            false,
            &retained_test_entries(&record),
            |file, bytes| {
                use std::io::Write;
                file.write_all(&bytes[..3])?;
                file.sync_all()?;
                std::fs::write(root.join("child-ready"), b"partial stage")?;
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(1));
                }
            },
            publish_directory,
        );
    }
    #[cfg(windows)]
    #[test]
    fn terminated_retention_child_leaves_only_orphan_stage_and_retry_succeeds() {
        use std::{
            os::windows::process::CommandExt,
            process::{Command, Stdio},
            time::{Duration, Instant},
        };
        let (_temp, root) = retention_fixture();
        let final_path = root.join("package");
        struct ChildGuard(std::process::Child);
        impl Drop for ChildGuard {
            fn drop(&mut self) {
                let _ = self.0.kill();
                let _ = self.0.wait();
            }
        }
        let mut child = ChildGuard(
            Command::new(std::env::current_exe().unwrap())
                .args([
                    "--exact",
                    "embedded::tests::retention_child_fixture",
                    "--nocapture",
                ])
                .env("LMG_RETENTION_KILL_ROOT", &root)
                .creation_flags(0x08000000)
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .unwrap(),
        );
        let deadline = Instant::now() + Duration::from_secs(15);
        while !root.join("child-ready").exists() {
            assert!(
                child.0.try_wait().unwrap().is_none(),
                "retention child exited before partial write"
            );
            assert!(
                Instant::now() < deadline,
                "retention child did not reach partial write"
            );
            std::thread::sleep(Duration::from_millis(20));
        }
        child.0.kill().unwrap();
        child.0.wait().unwrap();
        assert!(!final_path.exists());
        let orphans: Vec<_> = std::fs::read_dir(&root)
            .unwrap()
            .map(|e| e.unwrap().path())
            .filter(|p| {
                p.file_name()
                    .unwrap()
                    .to_string_lossy()
                    .starts_with(".lmg-retaining-")
            })
            .collect();
        assert_eq!(orphans.len(), 1);
        assert_eq!(
            std::fs::read(orphans[0].join("source/input.bin")).unwrap(),
            b"com"
        );
        let record = retained_test_record();
        let retained =
            retain_complete(&final_path, false, &retained_test_entries(&record)).unwrap();
        assert_eq!(
            std::fs::read(retained.directory.join("source/input.bin")).unwrap(),
            b"complete retained input!"
        );
        assert!(
            !orphans[0].exists(),
            "Validated abandoned stage must be reclaimed on retry"
        );
    }
    #[cfg(windows)]
    #[test]
    fn disk_full_staging_never_publishes_partial_authority_and_retry_succeeds() {
        let (_temp, root) = retention_fixture();
        let final_path = root.join("package");
        let record = retained_test_record();
        assert!(
            retain_complete_with(
                &final_path,
                false,
                &retained_test_entries(&record),
                |file, bytes| {
                    use std::io::Write;
                    file.write_all(&bytes[..3])?;
                    file.sync_all()?;
                    Err(std::io::Error::from_raw_os_error(112))
                },
                publish_directory
            )
            .is_err()
        );
        assert!(!final_path.exists());
        let retained =
            retain_complete(&final_path, false, &retained_test_entries(&record)).unwrap();
        assert_eq!(
            std::fs::read(retained.directory.join("source/input.bin")).unwrap(),
            b"complete retained input!"
        );
    }
    #[cfg(windows)]
    #[test]
    fn concurrent_complete_retention_publications_reuse_only_the_verified_winner() {
        use std::{sync::mpsc, time::Duration};
        let (_temp, root) = retention_fixture();
        let final_path = root.join("package");
        let record = retained_test_record();
        let entries = retained_test_entries(&record);
        let (ready_tx, ready_rx) = mpsc::channel();
        std::thread::scope(|scope| {
            let mut releases = Vec::new();
            let mut threads = Vec::new();
            for _ in 0..2 {
                let (release_tx, release_rx) = mpsc::channel();
                releases.push(release_tx);
                let ready = ready_tx.clone();
                let final_path = &final_path;
                let entries = &entries;
                threads.push(scope.spawn(move || {
                    retain_complete_with(
                        final_path,
                        false,
                        entries,
                        |file, bytes| {
                            use std::io::Write;
                            file.write_all(bytes)
                        },
                        |stage, directory| {
                            ready.send(()).map_err(|e| e.to_string())?;
                            release_rx
                                .recv_timeout(Duration::from_secs(15))
                                .map_err(|e| e.to_string())?;
                            publish_directory(stage, directory)
                        },
                    )
                }));
            }
            for _ in 0..2 {
                ready_rx.recv_timeout(Duration::from_secs(15)).unwrap();
            }
            for release in releases {
                release.send(()).unwrap();
            }
            for thread in threads {
                let retained = thread.join().unwrap().unwrap();
                assert_eq!(
                    std::fs::read(retained.directory.join("source/input.bin")).unwrap(),
                    b"complete retained input!"
                );
            }
        });
    }
    #[cfg(windows)]
    #[test]
    fn empty_foreign_and_incomplete_final_directories_are_never_overwritten_or_adopted() {
        use std::io::Write;
        for foreign in [None, Some(b"foreign".as_slice())] {
            let (_temp, root) = retention_fixture();
            let final_path = root.join("package");
            let record = retained_test_record();
            let result = retain_complete_with(
                &final_path,
                false,
                &retained_test_entries(&record),
                |file, bytes| file.write_all(bytes),
                |stage, directory| {
                    drop(crate::private::create_directory(directory, false)?);
                    if let Some(bytes) = foreign {
                        let mut f = crate::private::create_file(&directory.join("foreign.bin"))?;
                        f.write_all(bytes)
                            .and_then(|_| f.sync_all())
                            .map_err(|e| e.to_string())?;
                    }
                    publish_directory(stage, directory)
                },
            );
            assert!(result.is_err());
            assert!(!final_path.join("source/input.bin").exists());
            if let Some(bytes) = foreign {
                assert_eq!(
                    std::fs::read(final_path.join("foreign.bin")).unwrap(),
                    bytes
                );
            }
            assert!(retain_complete(&final_path, false, &retained_test_entries(&record)).is_err());
        }
        let (_temp, root) = retention_fixture();
        let final_path = root.join("package");
        drop(crate::private::create_directory(&final_path, false).unwrap());
        crate::private::child_directory(&final_path.join("source")).unwrap();
        {
            let mut file =
                crate::private::create_file(&final_path.join("source/input.bin")).unwrap();
            file.write_all(b"partial").unwrap();
            file.sync_all().unwrap();
        }
        let record = retained_test_record();
        assert!(retain_complete(&final_path, false, &retained_test_entries(&record)).is_err());
        assert_eq!(
            std::fs::read(final_path.join("source/input.bin")).unwrap(),
            b"partial"
        );
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
