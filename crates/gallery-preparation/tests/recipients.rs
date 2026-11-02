// SPDX-License-Identifier: Apache-2.0
use gallery_preparation::{
    Artifact, FileRecord, InventoryIdentity, Prepared, Release, extract, hash, portable_path,
};
use serde_json::json;
use std::io::Write;
use tokio_util::sync::CancellationToken;
const CANONICAL: &[u8] = include_bytes!("fixtures/release-0.1.0.json");
fn canonical(value: &serde_json::Value) -> Vec<u8> {
    let mut v = value.clone();
    v.sort_all_objects();
    serde_json::to_vec(&v).unwrap()
}
fn archive(entries: &[(&str, &[u8], u32)]) -> Vec<u8> {
    let mut writer = zip::ZipWriter::new(std::io::Cursor::new(Vec::new()));
    for (name, bytes, mode) in entries {
        writer
            .start_file(
                *name,
                zip::write::SimpleFileOptions::default().unix_permissions(*mode),
            )
            .unwrap();
        writer.write_all(bytes).unwrap();
    }
    writer.finish().unwrap().into_inner()
}
fn fixture(bytes: &[u8], entries: &[(&str, &[u8], u32)]) -> (Release, Artifact) {
    let mut files = entries
        .iter()
        .map(|(path, bytes, _)| FileRecord {
            path: path.to_string(),
            bytes: bytes.len().to_string(),
            sha256: hash(bytes),
            mode: None,
        })
        .collect::<Vec<_>>();
    files.sort_by(|a, b| a.path.cmp(&b.path));
    let artifact = Artifact {
        platform: "windows".into(),
        architecture: "x86_64".into(),
        name: "fixture.zip".into(),
        format: "zip".into(),
        bytes: bytes.len().to_string(),
        sha256: hash(bytes),
        url: "https://github.com/fixture".into(),
        inventory: InventoryIdentity {
            files: files.len(),
            bytes: entries
                .iter()
                .map(|(_, b, _)| b.len())
                .sum::<usize>()
                .to_string(),
            sha256: hash(&canonical(&serde_json::to_value(files).unwrap())),
        },
    };
    let release = Release {
        version: "0.1.0".into(),
        candidate_id: "f".repeat(64),
        artifacts: vec![artifact.clone()],
        bytes: b"fixture release\n".to_vec(),
    };
    (release, artifact)
}
#[test]
fn actual_published_record_has_native_publication_and_complete_recipient_matrix() {
    assert_eq!(
        hash(CANONICAL),
        "079615f3ff8434b32c3c632190b544c6c32e17513fa125ec7e07f679a1c65f1f"
    );
    let r = Release::parse(CANONICAL).unwrap();
    assert_eq!(r.version, "0.1.0");
    assert_eq!(r.artifacts.len(), 3);
    for transform in [
        "fixture",
        "candidate",
        "digest",
        "publication",
        "duplicate",
        "noncanonical",
    ] {
        let mut v: serde_json::Value = serde_json::from_slice(CANONICAL).unwrap();
        match transform {
            "fixture" => v["qualification"]["mode"] = json!("fixture"),
            "candidate" => v["state"] = json!("candidate"),
            "digest" => v["candidateId"] = json!("0".repeat(64)),
            "publication" => v["publication"]["assets"][0]["sha256"] = json!("0".repeat(64)),
            "duplicate" => v["publication"]["assets"][1] = v["publication"]["assets"][0].clone(),
            _ => {}
        }
        let mut bytes = canonical(&v);
        bytes.push(b'\n');
        if transform == "noncanonical" {
            bytes.push(b' ');
        }
        assert!(Release::parse(&bytes).is_err(), "{transform}");
    }
}
#[test]
fn preview_is_write_free_then_commits_reuses_and_relocates_complete_payload() {
    let entries = [
        (
            "local-media-gallery.exe",
            b"native fixture".as_slice(),
            0o755,
        ),
        ("licenses/notice.txt", b"retain notice".as_slice(), 0o644),
    ];
    let bytes = archive(&entries);
    let (release, artifact) = fixture(&bytes, &entries);
    let cancel = CancellationToken::new();
    let parent = tempfile::tempdir().unwrap();
    let gallery = parent.path().join("gallery");
    std::fs::create_dir(&gallery).unwrap();
    std::fs::write(gallery.join("media.jpg"), b"original").unwrap();
    let root = cap_std::fs::Dir::open_ambient_dir(&gallery, cap_std::ambient_authority()).unwrap();
    let mut prepared = Prepared::from_archive(&release, &artifact, &bytes, &cancel).unwrap();
    prepared.inspect(&root, &cancel).unwrap();
    assert_eq!(std::fs::read_dir(&gallery).unwrap().count(), 1);
    assert_eq!(prepared.preview.disposition, "new");
    prepared.commit(&root, &cancel, |_| {}).unwrap();
    prepared.inspect(&root, &cancel).unwrap();
    assert_eq!(prepared.preview.disposition, "reuse");
    let m = std::fs::metadata(gallery.join("local-media-gallery.exe"))
        .unwrap()
        .modified()
        .unwrap();
    prepared.commit(&root, &cancel, |_| {}).unwrap();
    assert_eq!(
        std::fs::metadata(gallery.join("local-media-gallery.exe"))
            .unwrap()
            .modified()
            .unwrap(),
        m
    );
    assert_eq!(
        std::fs::read(gallery.join("LMG-windows-x86_64/fixture.zip")).unwrap(),
        bytes
    );
    assert_eq!(
        std::fs::read(gallery.join("LMG-windows-x86_64/bundle/licenses/notice.txt")).unwrap(),
        b"retain notice"
    );
    drop(root);
    let moved = parent.path().join("moved 雪");
    std::fs::rename(gallery, &moved).unwrap();
    let root = cap_std::fs::Dir::open_ambient_dir(&moved, cap_std::ambient_authority()).unwrap();
    prepared.inspect(&root, &cancel).unwrap();
    assert_eq!(prepared.preview.disposition, "reuse");
    assert_eq!(std::fs::read(moved.join("media.jpg")).unwrap(), b"original");
}
#[test]
fn unrelated_changed_and_redirected_outputs_are_preserved() {
    let entries = [("local-media-gallery.exe", b"native".as_slice(), 0o755)];
    let bytes = archive(&entries);
    let (r, a) = fixture(&bytes, &entries);
    let cancel = CancellationToken::new();
    let gallery = tempfile::tempdir().unwrap();
    let root =
        cap_std::fs::Dir::open_ambient_dir(gallery.path(), cap_std::ambient_authority()).unwrap();
    let mut p = Prepared::from_archive(&r, &a, &bytes, &cancel).unwrap();
    std::fs::write(gallery.path().join("local-media-gallery.exe"), b"unrelated").unwrap();
    assert!(p.inspect(&root, &cancel).is_err());
    assert!(p.commit(&root, &cancel, |_| {}).is_err());
    assert_eq!(
        std::fs::read(gallery.path().join("local-media-gallery.exe")).unwrap(),
        b"unrelated"
    );
    std::fs::remove_file(gallery.path().join("local-media-gallery.exe")).unwrap();
    p.commit(&root, &cancel, |_| {}).unwrap();
    std::fs::write(
        gallery.path().join("LMG-windows-x86_64/foreign.txt"),
        b"retain",
    )
    .unwrap();
    assert!(p.inspect(&root, &cancel).is_err());
    assert_eq!(
        std::fs::read(gallery.path().join("LMG-windows-x86_64/foreign.txt")).unwrap(),
        b"retain"
    );
}
#[test]
fn cancellation_can_resume_only_matching_completed_files() {
    let entries = [
        ("local-media-gallery.exe", b"native".as_slice(), 0o755),
        ("notice.txt", b"notice".as_slice(), 0o644),
    ];
    let bytes = archive(&entries);
    let (r, a) = fixture(&bytes, &entries);
    let cancel = CancellationToken::new();
    let gallery = tempfile::tempdir().unwrap();
    let root =
        cap_std::fs::Dir::open_ambient_dir(gallery.path(), cap_std::ambient_authority()).unwrap();
    let mut p = Prepared::from_archive(&r, &a, &bytes, &cancel).unwrap();
    assert!(p.commit(&root, &cancel, |_| cancel.cancel()).is_err());
    let fresh = CancellationToken::new();
    p.inspect(&root, &fresh).unwrap();
    assert_eq!(p.preview.disposition, "resume");
    p.commit(&root, &fresh, |_| {}).unwrap();
    p.inspect(&root, &fresh).unwrap();
    assert_eq!(p.preview.disposition, "reuse");
}
#[test]
fn archive_paths_integrity_duplicate_entries_and_inventory_mismatches_fail() {
    for path in [
        "../outside",
        "/root",
        "a/../b",
        "a\\b",
        "C:/file",
        "a//b",
        "NUL.txt",
        "a. ",
    ] {
        assert!(portable_path(path).is_err(), "{path}");
    }
    for entries in [
        vec![("../outside", b"x".as_slice(), 0o644)],
        vec![
            ("Same", b"a".as_slice(), 0o644),
            ("same", b"b".as_slice(), 0o644),
        ],
        vec![
            ("Upper/a", b"a".as_slice(), 0o644),
            ("upper/b", b"b".as_slice(), 0o644),
        ],
    ] {
        let bytes = archive(&entries);
        let (_, a) = fixture(&bytes, &entries);
        let dir = tempfile::tempdir().unwrap();
        assert!(extract(&bytes, &a, dir.path(), &CancellationToken::new()).is_err());
    }
    let entries = [("local-media-gallery.exe", b"native".as_slice(), 0o755)];
    let bytes = archive(&entries);
    let (_, mut a) = fixture(&bytes, &entries);
    let dir = tempfile::tempdir().unwrap();
    a.sha256 = "0".repeat(64);
    assert!(extract(&bytes, &a, dir.path(), &CancellationToken::new()).is_err());
    a.sha256 = hash(&bytes);
    a.inventory.sha256 = "0".repeat(64);
    assert!(extract(&bytes, &a, dir.path(), &CancellationToken::new()).is_err());
}

fn tar_bytes(kind: tar::EntryType, name: &str, bytes: &[u8], permissions: u32) -> Vec<u8> {
    let mut builder = tar::Builder::new(Vec::new());
    let mut header = tar::Header::new_gnu();
    header.set_size(bytes.len() as u64);
    header.set_mode(permissions);
    header.set_uid(0);
    header.set_gid(0);
    header.set_mtime(0);
    header.set_entry_type(kind);
    if kind.is_symlink() {
        header.set_link_name("../outside").unwrap();
    }
    header.set_cksum();
    builder.append_data(&mut header, name, bytes).unwrap();
    let raw = builder.into_inner().unwrap();
    let mut gzip = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    gzip.write_all(&raw).unwrap();
    gzip.finish().unwrap()
}
#[test]
fn tar_preserves_executable_modes_and_refuses_links_and_oversized_metadata() {
    let payload = b"native ELF fixture";
    let bytes = tar_bytes(
        tar::EntryType::Regular,
        "local-media-gallery.bin",
        payload,
        0o755,
    );
    let (_, mut a) = fixture(&bytes, &[]);
    a.platform = "linux".into();
    a.format = "tar.gz".into();
    a.name = "fixture.tar.gz".into();
    let expected = vec![FileRecord {
        path: "local-media-gallery.bin".into(),
        bytes: payload.len().to_string(),
        sha256: hash(payload),
        mode: Some("755".into()),
    }];
    a.inventory = InventoryIdentity {
        bytes: payload.len().to_string(),
        files: 1,
        sha256: hash(&canonical(&serde_json::to_value(&expected).unwrap())),
    };
    let dir = tempfile::tempdir().unwrap();
    assert_eq!(
        extract(&bytes, &a, dir.path(), &CancellationToken::new()).unwrap(),
        expected
    );
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        assert_eq!(
            std::fs::metadata(dir.path().join("local-media-gallery.bin"))
                .unwrap()
                .permissions()
                .mode()
                & 0o777,
            0o755
        );
    }
    for (kind, name, data, expected) in [
        (
            tar::EntryType::Symlink,
            "escape",
            vec![],
            "links or special",
        ),
        (
            tar::EntryType::XHeader,
            "metadata",
            vec![b'a'; 65537],
            "metadata budget",
        ),
    ] {
        let bytes = tar_bytes(kind, name, &data, 0o644);
        a.bytes = bytes.len().to_string();
        a.sha256 = hash(&bytes);
        let out = tempfile::tempdir().unwrap();
        assert!(
            extract(&bytes, &a, out.path(), &CancellationToken::new())
                .unwrap_err()
                .contains(expected)
        );
    }
}
#[test]
fn canceled_download_and_missing_optional_artifact_do_not_contact_the_network() {
    let cancel = CancellationToken::new();
    cancel.cancel();
    assert_eq!(
        gallery_preparation::download("https://github.com/never-contacted", 16, &cancel, |_| {})
            .unwrap_err(),
        "cancelled"
    );
    let release = Release {
        version: "0.1.0".into(),
        candidate_id: "f".repeat(64),
        artifacts: vec![],
        bytes: vec![],
    };
    assert!(
        matches!(Prepared::acquire(&release,"windows",&CancellationToken::new(),|_|{}),Err(e) if e.contains("unavailable"))
    );
}
