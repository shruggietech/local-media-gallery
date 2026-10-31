// SPDX-License-Identifier: Apache-2.0
use gallery_update::*;
use std::{fs, path::Path};
fn fixture() -> tempfile::TempDir {
    #[cfg(windows)]
    let parent = gallery_windows_package::private::storage_root(false).unwrap();
    #[cfg(not(windows))]
    let parent = fs::canonicalize(std::env::temp_dir()).unwrap();
    tempfile::Builder::new().tempdir_in(parent).unwrap()
}

fn candidate(base: &Path, generation: &str, bytes: &[u8]) -> Candidate {
    fs::create_dir_all(base).unwrap();
    fs::write(base.join("local-media-gallery"), bytes).unwrap();
    let file = FileRecord {
        path: "local-media-gallery".into(),
        bytes: bytes.len().to_string(),
        sha256: hash(bytes),
        mode: 644,
    };
    Candidate {
        format_version: 1,
        product: "local-media-gallery".into(),
        version: "0.0.0".into(),
        edition: "lite".into(),
        os: std::env::consts::OS.into(),
        arch: std::env::consts::ARCH.into(),
        generation: generation.into(),
        source: Source {
            sha256: "a".repeat(64),
            files: 1,
        },
        binary: file.path.clone(),
        files: vec![file],
        native: Native::Direct,
        integration: None,
    }
}
#[test]
fn replacement_rollback_and_repeat() {
    let t = fixture();
    let live = t.path().join("live");
    let next = t.path().join("next");
    let a = candidate(&live, "a", b"old");
    let b = candidate(&next, "b", b"new");
    let tx = t.path().join("transaction");
    let mut op = Transaction::prepare(&tx, &live, &a, &b, &next, &[]).unwrap();
    assert_eq!(op.apply(false).unwrap().status, "complete");
    assert_eq!(fs::read(live.join(&a.binary)).unwrap(), b"new");
    assert_eq!(op.apply(false).unwrap().status, "already-current");
    assert_eq!(op.apply(true).unwrap().status, "restored");
    assert_eq!(fs::read(live.join(&a.binary)).unwrap(), b"old");
}
#[test]
fn unknown_live_bytes_and_tampered_backup_refuse() {
    let t = fixture();
    let live = t.path().join("live");
    let next = t.path().join("next");
    let a = candidate(&live, "a", b"old");
    let b = candidate(&next, "b", b"new");
    let tx = t.path().join("transaction");
    let mut op = Transaction::prepare(&tx, &live, &a, &b, &next, &[]).unwrap();
    fs::write(live.join(&a.binary), b"foreign").unwrap();
    assert!(op.apply(false).is_err());
    assert_eq!(fs::read(live.join(&a.binary)).unwrap(), b"foreign");
    fs::write(live.join(&a.binary), b"old").unwrap();
    fs::write(tx.join("prior").join(&a.binary), b"changed").unwrap();
    assert!(op.apply(true).is_err());
}
#[test]
fn rejects_alias_traversal_target_and_unknown_fields() {
    let t = fixture();
    let mut c = candidate(&t.path().join("c"), "a", b"x");
    c.files[0].path = "../media.jpg".into();
    assert!(c.validate().is_err());
    c.files[0].path = "SETTINGS.json".into();
    assert!(c.validate().is_err());
    c.files[0].path = "local-media-gallery".into();
    c.files.push(c.files[0].clone());
    assert!(c.validate().is_err());
    let mut v = serde_json::to_value(c).unwrap();
    v["unknown"] = true.into();
    assert!(serde_json::from_value::<Candidate>(v).is_err());
}
#[test]
fn missing_live_after_prepared_recovers_twice() {
    let t = fixture();
    let live = t.path().join("live");
    let next = t.path().join("next");
    let a = candidate(&live, "a", b"old");
    let b = candidate(&next, "b", b"new");
    let tx = t.path().join("transaction");
    {
        let _op = Transaction::prepare(&tx, &live, &a, &b, &next, &[]).unwrap();
    }
    fs::remove_file(live.join(&a.binary)).unwrap();
    let mut op = Transaction::open(&tx).unwrap();
    assert_eq!(op.apply(false).unwrap().status, "complete");
    assert_eq!(op.apply(false).unwrap().status, "already-current");
}
#[test]
fn exclusive_operation_lock_and_foreign_destination() {
    let t = fixture();
    let live = t.path().join("live");
    let next = t.path().join("next");
    let a = candidate(&live, "a", b"old");
    let mut b = candidate(&next, "b", b"new");
    let tx = t.path().join("transaction");
    let _op = Transaction::prepare(&tx, &live, &a, &b, &next, &[]).unwrap();
    assert!(Transaction::open(&tx).is_err());
    b.files.push(FileRecord {
        path: "foreign.txt".into(),
        bytes: "1".into(),
        sha256: hash(b"x"),
        mode: 644,
    });
    fs::write(live.join("foreign.txt"), b"x").unwrap();
    fs::write(next.join("foreign.txt"), b"x").unwrap();
    assert!(Transaction::prepare(&t.path().join("other"), &live, &a, &b, &next, &[]).is_err());
}

#[test]
fn different_transactions_cannot_own_one_destination() {
    let t = fixture();
    let live = t.path().join("live");
    let next = t.path().join("next");
    let a = candidate(&live, "a", b"old");
    let b = candidate(&next, "b", b"new");
    let _one = Transaction::prepare(&t.path().join("one"), &live, &a, &b, &next, &[]).unwrap();
    assert!(Transaction::prepare(&t.path().join("two"), &live, &a, &b, &next, &[]).is_err());
}
#[test]
fn rename_before_journal_reconciles_but_unknown_displaced_bytes_block() {
    let t = fixture();
    let live = t.path().join("live");
    let next = t.path().join("next");
    let a = candidate(&live, "a", b"old");
    let b = candidate(&next, "b", b"new");
    let tx = t.path().join("transaction");
    {
        let _op = Transaction::prepare(&tx, &live, &a, &b, &next, &[]).unwrap();
    }
    use sha2::{Digest, Sha256};
    let journal: serde_json::Value =
        serde_json::from_slice(&fs::read(tx.join("journal.json")).unwrap()).unwrap();
    let name = hex::encode(Sha256::digest(
        live.join(&a.binary).to_string_lossy().as_bytes(),
    ));
    let sibling = live.join(format!(
        ".lmg-displaced-{}-{}",
        &journal["binding"].as_str().unwrap()[..12],
        &name[..12]
    ));
    fs::rename(live.join(&a.binary), &sibling).unwrap();
    {
        let mut op = Transaction::open(&tx).unwrap();
        assert_eq!(op.apply(false).unwrap().status, "complete");
    }
    fs::write(&sibling, b"external edit").unwrap();
    let mut op = Transaction::open(&tx).unwrap();
    assert!(op.apply(true).is_err());
    assert_eq!(fs::read(&sibling).unwrap(), b"external edit");
}

#[test]
fn foreign_worker_job_cannot_start_a_native_command() {
    let t = fixture();
    let job = t.path().join("job.json");
    fs::write(
        &job,
        br#"{"formatVersion":1,"program":"cmd.exe","arguments":["/c","echo unexpected"]}"#,
    )
    .unwrap();
    assert!(run_native_worker(&job).is_err());
    assert_eq!(fs::read_dir(t.path()).unwrap().count(), 1);
}
#[test]
fn changed_static_journal_identity_is_not_a_recovery_authority() {
    let t = fixture();
    let live = t.path().join("live");
    let next = t.path().join("next");
    let a = candidate(&live, "a", b"old");
    let b = candidate(&next, "b", b"new");
    let tx = t.path().join("transaction");
    {
        let _op = Transaction::prepare(&tx, &live, &a, &b, &next, &[]).unwrap();
    }
    let file = tx.join("journal.json");
    let mut v: serde_json::Value = serde_json::from_slice(&fs::read(&file).unwrap()).unwrap();
    v["directory"] = serde_json::json!(next);
    fs::write(file, serde_json::to_vec(&v).unwrap()).unwrap();
    assert!(Transaction::open(&tx).is_err());
    assert_eq!(fs::read(live.join(&a.binary)).unwrap(), b"old");
}

#[test]
fn failed_staging_collision_and_wrong_target_preserve_installation() {
    let t = fixture();
    let live = t.path().join("live");
    let next = t.path().join("next");
    let a = candidate(&live, "a", b"old");
    let mut b = candidate(&next, "b", b"new");
    let tx = t.path().join("transaction");
    fs::create_dir(&tx).unwrap();
    fs::write(tx.join("foreign"), b"keep").unwrap();
    assert!(Transaction::prepare(&tx, &live, &a, &b, &next, &[]).is_err());
    assert_eq!(fs::read(tx.join("foreign")).unwrap(), b"keep");
    b.arch = if std::env::consts::ARCH == "x86_64" {
        "aarch64"
    } else {
        "x86_64"
    }
    .into();
    assert!(Transaction::prepare(&t.path().join("wrong"), &live, &a, &b, &next, &[]).is_err());
    b.arch = a.arch.clone();
    b.edition = "full".into();
    assert!(Transaction::prepare(&t.path().join("edition"), &live, &a, &b, &next, &[]).is_err());
    assert_eq!(fs::read(live.join(&a.binary)).unwrap(), b"old");
}
#[test]
fn active_executable_refuses_before_staging() {
    let t = fixture();
    let live = t.path().join("live");
    let next = t.path().join("next");
    #[cfg(windows)]
    let bytes = b"owned executable fixture".to_vec();
    #[cfg(unix)]
    let bytes = fs::read("/bin/sleep").unwrap();
    let a = candidate(&live, "a", &bytes);
    let b = candidate(&next, "b", &bytes);
    #[cfg(unix)]
    let (a, b) = {
        let mut a = a;
        let mut b = b;
        use std::os::unix::fs::PermissionsExt;
        for p in [&live, &next] {
            fs::set_permissions(p.join(&a.binary), fs::Permissions::from_mode(0o755)).unwrap();
        }
        a.files[0].mode = 755;
        b.files[0].mode = 755;
        (a, b)
    };
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        let _held = fs::OpenOptions::new()
            .read(true)
            .share_mode(1)
            .open(live.join(&a.binary))
            .unwrap();
        assert!(Transaction::prepare(&t.path().join("active"), &live, &a, &b, &next, &[]).is_err());
    }
    #[cfg(unix)]
    {
        let mut child = std::process::Command::new(live.join(&a.binary))
            .arg("30")
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .unwrap();
        std::thread::sleep(std::time::Duration::from_millis(50));
        let refused =
            Transaction::prepare(&t.path().join("active"), &live, &a, &b, &next, &[]).is_err();
        let _ = child.kill();
        let _ = child.wait();
        assert!(refused);
    }
    assert!(!t.path().join("active").exists());
    assert_eq!(fs::read(live.join(&a.binary)).unwrap(), bytes);
}
