use gallery_core::Engine;
use std::fs;
#[cfg(windows)]
use std::path::Path;
use tempfile::TempDir;

#[test]
fn reservation_is_filesystem_free_and_failed_selection_preserves_current_root() {
    let root = TempDir::new().unwrap();
    fs::write(root.path().join("visible.jpg"), b"source").unwrap();
    let engine = Engine::new();
    let before = engine.open(root.path()).unwrap();
    let request = engine.begin_open(&root.path().join("missing"));
    assert_eq!(engine.snapshot().session_id, before.session_id);
    assert_eq!(
        engine.snapshot().discovery.as_ref().unwrap().phase,
        "opening"
    );
    assert!(engine.run_discovery(&request, || {}).is_err());
    let after = engine.snapshot();
    assert_eq!(after.session_id, before.session_id);
    assert_eq!(after.items[0].name, "visible.jpg");
    assert_eq!(after.discovery.unwrap().phase, "unavailable");
    assert!(after.sequence.parse::<u64>().unwrap() > before.sequence.parse::<u64>().unwrap());
}

#[test]
fn first_observation_is_usable_before_completion_and_cancel_rejects_late_work() {
    let root = TempDir::new().unwrap();
    for name in ["one.jpg", "two.png", "three.webp"] {
        fs::write(root.path().join(name), b"source").unwrap();
    }
    let engine = Engine::new();
    let request = engine.begin_open(root.path());
    let mut intermediate = None;
    engine
        .run_discovery(&request, || {
            let snapshot = engine.snapshot();
            if snapshot.status == "scanning" && !snapshot.items.is_empty() {
                let item = &snapshot.items[0];
                assert!(
                    engine
                        .open_media(
                            snapshot.session_id.as_ref().unwrap(),
                            &item.id,
                            &item.revision
                        )
                        .is_ok()
                );
                engine.cancel_discovery(&request.id).unwrap();
                intermediate = Some(engine.snapshot());
            }
        })
        .unwrap();
    let cancelled = intermediate.expect("First useful observation must publish before completion");
    assert_eq!(cancelled.status, "cancelled");
    assert_eq!(cancelled.items.len(), 1);
    assert_eq!(engine.snapshot().sequence, cancelled.sequence);
    assert_eq!(fs::read(root.path().join("one.jpg")).unwrap(), b"source");
}

#[test]
fn incomplete_refresh_retains_unobserved_items_until_complete_retry() {
    let root = TempDir::new().unwrap();
    for name in ["one.jpg", "two.png", "three.webp"] {
        fs::write(root.path().join(name), b"source").unwrap();
    }
    let engine = Engine::new();
    let first = engine.open(root.path()).unwrap();
    fs::remove_file(root.path().join("three.webp")).unwrap();
    let request = engine
        .begin_refresh(first.session_id.as_ref().unwrap())
        .unwrap();
    engine
        .run_discovery(&request, || {
            if engine.snapshot().discovery.as_ref().unwrap().media_seen == "1" {
                engine.cancel_discovery(&request.id).unwrap();
            }
        })
        .unwrap();
    let cancelled = engine.snapshot();
    assert_eq!(cancelled.status, "cancelled");
    assert_eq!(cancelled.items.len(), 3);
    assert!(cancelled.items.iter().any(|item| item.stale));
    let complete = engine.refresh(first.session_id.as_ref().unwrap()).unwrap();
    assert_eq!(complete.status, "complete");
    assert_eq!(complete.items.len(), 2);
    assert!(complete.items.iter().all(|item| !item.stale));
}

#[test]
fn replacing_and_closing_during_a_callback_cannot_restore_retired_root() {
    let a = TempDir::new().unwrap();
    let b = TempDir::new().unwrap();
    fs::write(a.path().join("old.jpg"), b"old").unwrap();
    fs::write(b.path().join("new.png"), b"new").unwrap();
    let engine = Engine::new();
    let request = engine.begin_open(a.path());
    let mut replacement = None;
    engine
        .run_discovery(&request, || {
            let snapshot = engine.snapshot();
            if snapshot.status == "scanning" && !snapshot.items.is_empty() && replacement.is_none()
            {
                let next = engine.begin_open(b.path());
                engine.close(snapshot.session_id.as_ref().unwrap()).unwrap();
                replacement = Some(next);
            }
        })
        .unwrap();
    assert!(engine.snapshot().session_id.is_none());
    assert_eq!(engine.snapshot().status, "selection");
    assert!(engine.run_discovery(&replacement.unwrap(), || {}).is_err());
    assert!(engine.snapshot().session_id.is_none());
    let reopened = engine.open(b.path()).unwrap();
    assert_eq!(reopened.items[0].name, "new.png");
}

#[test]
fn native_paths_and_aliases_preserve_source_and_direct_scope() {
    let parent = TempDir::new().unwrap();
    let root = parent.path().join("Gallery 雪 # + & 100%");
    fs::create_dir(&root).unwrap();
    let name = "Frame 雪 # + & 100%.jpg";
    fs::write(root.join(name), b"source").unwrap();
    fs::create_dir(root.join("nested")).unwrap();
    fs::write(root.join("nested/ignored.jpg"), b"nested").unwrap();
    let engine = Engine::new();
    let opened = engine.open(&root.join(".")).unwrap();
    assert_eq!(opened.items.len(), 1);
    assert_eq!(opened.items[0].name, name);
    engine.close(opened.session_id.as_ref().unwrap()).unwrap();
    let moved = parent.path().join("Moved 雪");
    fs::rename(root, &moved).unwrap();
    assert_eq!(engine.open(&moved).unwrap().items[0].name, name);
    assert_eq!(fs::read(moved.join(name)).unwrap(), b"source");
}

#[cfg(windows)]
#[test]
fn explicit_root_alias_is_resolved_but_nested_links_and_cycles_are_not_entered() {
    let parent = TempDir::new().unwrap();
    let root = parent.path().join("Native Root 雪");
    fs::create_dir(&root).unwrap();
    fs::write(root.join("one.jpg"), b"source").unwrap();
    fs::create_dir(root.join("nested.jpg")).unwrap();
    fs::write(root.join("nested.jpg/ignored.png"), b"nested").unwrap();
    std::os::windows::fs::symlink_dir(&root, root.join("cycle.jpg"))
        .expect("Native traversal qualification requires directory-symlink creation");
    let alias = parent.path().join("alias");
    std::os::windows::fs::symlink_dir(&root, &alias).unwrap();
    let engine = Engine::new();
    let snapshot = engine.open(&alias).unwrap();
    assert_eq!(snapshot.items.len(), 1);
    assert_eq!(snapshot.items[0].name, "one.jpg");
    assert_eq!(
        Path::new(snapshot.root.as_ref().unwrap()),
        fs::canonicalize(&root).unwrap()
    );
    engine.close(snapshot.session_id.as_ref().unwrap()).unwrap();
    fs::remove_dir(root.join("cycle.jpg")).unwrap();
    fs::remove_dir(alias).unwrap();
}

#[cfg(unix)]
#[test]
fn native_names_keep_distinct_grants_under_host_filesystem_rules() {
    #[cfg(not(target_os = "macos"))]
    use std::os::unix::ffi::OsStringExt;
    let root = TempDir::new().unwrap();
    #[cfg(not(target_os = "macos"))]
    let names =
        [0xfe, 0xff].map(|byte| std::ffi::OsString::from_vec(vec![byte, b'.', b'j', b'p', b'g']));
    // The hosted Mac filesystem rejects invalid UTF-8 before discovery. Exercise
    // real native grants there with distinct Unicode names; the in-memory codec
    // regression separately retains colliding lossy labels on every platform.
    #[cfg(target_os = "macos")]
    let names = [
        std::ffi::OsString::from("native é.jpg"),
        std::ffi::OsString::from("native 雪.jpg"),
    ];
    for (index, name) in names.iter().enumerate() {
        fs::write(root.path().join(name), [index as u8]).unwrap();
    }
    let engine = Engine::new();
    let snapshot = engine.open(root.path()).unwrap();
    assert_eq!(snapshot.items.len(), 2);
    #[cfg(not(target_os = "macos"))]
    assert_eq!(snapshot.items[0].name, snapshot.items[1].name);
    #[cfg(target_os = "macos")]
    assert_ne!(snapshot.items[0].name, snapshot.items[1].name);
    assert_ne!(snapshot.items[0].id, snapshot.items[1].id);
    use std::io::Read;
    let mut observed = std::collections::HashSet::new();
    for item in &snapshot.items {
        let mut opened = engine
            .open_media(
                snapshot.session_id.as_ref().unwrap(),
                &item.id,
                &item.revision,
            )
            .unwrap();
        let mut bytes = Vec::new();
        opened.file.read_to_end(&mut bytes).unwrap();
        observed.insert(bytes);
    }
    assert_eq!(
        observed,
        std::collections::HashSet::from([vec![0], vec![1]])
    );
}
