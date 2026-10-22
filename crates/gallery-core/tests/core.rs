use gallery_core::{Engine, byte_range};
use std::{fs, path::Path};
use tempfile::TempDir;

fn media(dir: &Path, name: &str) {
    fs::write(dir.join(name), b"fixture media bytes").unwrap();
}

#[test]
fn opening_discovers_without_a_background_worker_and_snapshots_are_cached() {
    let dir = TempDir::new().unwrap();
    media(dir.path(), "before.jpg");
    let engine = Engine::new();
    let first = engine.open(dir.path()).unwrap();
    assert_eq!(first.status, "complete");
    assert_eq!(first.items.len(), 1);
    media(dir.path(), "after.png");
    fs::remove_file(dir.path().join("before.jpg")).unwrap();
    let cached = engine.snapshot();
    assert_eq!(cached.revision, first.revision);
    assert_eq!(cached.items[0].name, "before.jpg");
    let refreshed = engine.refresh(first.session_id.as_ref().unwrap()).unwrap();
    assert_eq!(refreshed.items.len(), 1);
    assert_eq!(refreshed.items[0].name, "after.png");
    assert_ne!(refreshed.revision, first.revision);
    assert_eq!(
        engine
            .refresh(first.session_id.as_ref().unwrap())
            .unwrap()
            .revision,
        refreshed.revision
    );
}

#[test]
fn discovery_is_direct_optional_and_preserves_sources() {
    let dir = TempDir::new().unwrap();
    media(dir.path(), "image2.jpg");
    media(dir.path(), "clip.mp4");
    media(dir.path(), ".hidden.png");
    media(dir.path(), "notes.json");
    fs::create_dir(dir.path().join("nested")).unwrap();
    media(&dir.path().join("nested"), "child.png");
    let engine = Engine::new();
    engine.open(dir.path()).unwrap();
    engine
        .refresh(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    let snap = engine.snapshot();
    assert_eq!(snap.items.len(), 2);
    assert_eq!(snap.status, "complete");
    assert_eq!(
        fs::read(dir.path().join("image2.jpg")).unwrap(),
        b"fixture media bytes"
    );
    assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 5);
}

#[test]
fn root_replacement_revokes_old_grants_and_bad_selection_preserves_current() {
    let a = TempDir::new().unwrap();
    let b = TempDir::new().unwrap();
    media(a.path(), "a.jpg");
    media(b.path(), "b.png");
    let engine = Engine::new();
    engine.open(a.path()).unwrap();
    engine
        .refresh(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    let first = engine.snapshot();
    let item = &first.items[0];
    assert!(
        engine
            .open_media(first.session_id.as_ref().unwrap(), &item.id, &item.revision)
            .is_ok()
    );
    assert!(engine.open(&a.path().join("missing")).is_err());
    assert_eq!(engine.snapshot().session_id, first.session_id);
    engine.open(b.path()).unwrap();
    engine
        .refresh(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    assert!(
        engine
            .open_media(first.session_id.as_ref().unwrap(), &item.id, &item.revision)
            .is_err()
    );
    assert_eq!(engine.snapshot().items[0].name, "b.png");
}

#[test]
fn mutations_and_relocation_need_no_catalog() {
    let parent = TempDir::new().unwrap();
    let original = parent.path().join("one");
    fs::create_dir(&original).unwrap();
    media(&original, "frame.jpg");
    let engine = Engine::new();
    engine.open(&original).unwrap();
    engine
        .refresh(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    let first = engine.snapshot();
    let old = first.items[0].clone();
    fs::write(original.join("frame.jpg"), b"changed and longer image").unwrap();
    engine
        .refresh(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    assert_ne!(engine.snapshot().items[0].revision, old.revision);
    assert!(
        engine
            .open_media(first.session_id.as_ref().unwrap(), &old.id, &old.revision)
            .is_err()
    );
    fs::remove_file(original.join("frame.jpg")).unwrap();
    engine
        .refresh(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    assert!(engine.snapshot().items.is_empty());
    engine
        .close(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    let relocated = parent.path().join("two");
    fs::rename(&original, &relocated).unwrap();
    media(&relocated, "new.webp");
    engine.open(&relocated).unwrap();
    engine
        .refresh(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    assert_eq!(engine.snapshot().items[0].name, "new.webp");
}

#[test]
fn manual_refresh_reconciles_current_files_and_rejects_retired_sessions() {
    let dir = TempDir::new().unwrap();
    media(dir.path(), "before.jpg");
    let engine = Engine::new();
    let session = engine.open(dir.path()).unwrap().session_id.unwrap();
    assert_eq!(engine.refresh(&session).unwrap().items.len(), 1);
    media(dir.path(), "after.png");
    // No background reconciler runs in this test; refresh must observe the directory itself.
    let updated = engine.refresh(&session).unwrap();
    assert_eq!(updated.items.len(), 2);
    engine.close(&session).unwrap();
    assert!(engine.refresh(&session).is_err());
}

#[test]
fn labels_are_data_and_identifiers_cannot_be_paths() {
    let dir = TempDir::new().unwrap();
    media(dir.path(), "snow # 100% 雪.png");
    let engine = Engine::new();
    engine.open(dir.path()).unwrap();
    engine
        .refresh(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    let snap = engine.snapshot();
    assert_eq!(snap.items[0].name, "snow # 100% 雪.png");
    for id in [
        "../outside.jpg",
        "C:/Windows/win.ini",
        "%2e%2e%2foutside.jpg",
    ] {
        assert!(
            engine
                .open_media(snap.session_id.as_ref().unwrap(), id, "wrong")
                .is_err()
        );
    }
}

#[cfg(unix)]
#[test]
fn symlinks_are_neither_discovered_nor_opened_after_replacement() {
    let dir = TempDir::new().unwrap();
    let other = TempDir::new().unwrap();
    media(dir.path(), "one.jpg");
    media(other.path(), "secret.jpg");
    std::os::unix::fs::symlink(other.path().join("secret.jpg"), dir.path().join("link.jpg"))
        .unwrap();
    let engine = Engine::new();
    engine.open(dir.path()).unwrap();
    engine
        .refresh(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    let s = engine.snapshot();
    assert_eq!(s.items.len(), 1);
    fs::remove_file(dir.path().join("one.jpg")).unwrap();
    std::os::unix::fs::symlink(other.path().join("secret.jpg"), dir.path().join("one.jpg"))
        .unwrap();
    assert!(
        engine
            .open_media(
                s.session_id.as_ref().unwrap(),
                &s.items[0].id,
                &s.items[0].revision
            )
            .is_err()
    );
}

#[test]
fn ranges_are_exact_and_invalid_ranges_are_not_success() {
    assert_eq!(byte_range(None, 10).unwrap(), (0, 10, false));
    assert_eq!(byte_range(Some("bytes=2-4"), 10).unwrap(), (2, 3, true));
    assert_eq!(byte_range(Some("bytes=7-"), 10).unwrap(), (7, 3, true));
    assert_eq!(byte_range(Some("bytes=-3"), 10).unwrap(), (7, 3, true));
    for value in [
        "bytes=10-",
        "bytes=4-2",
        "bytes=0-1,3-4",
        "bytes=-0",
        "items=1-2",
        "bytes=abc",
    ] {
        assert!(byte_range(Some(value), 10).is_err(), "{value}");
    }
}

#[cfg(windows)]
#[test]
fn windows_denied_child_is_partial_and_recovers_without_losing_siblings() {
    use std::os::windows::fs::OpenOptionsExt;
    let dir = TempDir::new().unwrap();
    media(dir.path(), "readable.jpg");
    media(dir.path(), "locked.jpg");
    let lock = fs::OpenOptions::new()
        .read(true)
        .share_mode(0)
        .open(dir.path().join("locked.jpg"))
        .unwrap();
    let engine = Engine::new();
    engine.open(dir.path()).unwrap();
    engine
        .refresh(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    let partial = engine.snapshot();
    assert_eq!(partial.items.len(), 2);
    assert_eq!(partial.status, "partial");
    assert!(
        partial
            .items
            .iter()
            .find(|i| i.name == "locked.jpg")
            .unwrap()
            .issue
            .is_some()
    );
    let readable = partial
        .items
        .iter()
        .find(|i| i.name == "readable.jpg")
        .unwrap();
    assert!(
        engine
            .open_media(
                partial.session_id.as_ref().unwrap(),
                &readable.id,
                &readable.revision
            )
            .is_ok()
    );
    drop(lock);
    engine
        .refresh(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    assert_eq!(engine.snapshot().status, "complete");
    assert!(engine.snapshot().items.iter().all(|i| i.issue.is_none()));
}

#[cfg(windows)]
#[test]
fn windows_denied_root_does_not_replace_a_readable_session() {
    use std::os::windows::fs::OpenOptionsExt;
    let dir = TempDir::new().unwrap();
    let denied = TempDir::new().unwrap();
    let engine = Engine::new();
    let before = engine.open(dir.path()).unwrap();
    let lock = fs::OpenOptions::new()
        .read(true)
        .custom_flags(0x02000000)
        .share_mode(0)
        .open(denied.path())
        .unwrap();
    assert!(engine.open(denied.path()).is_err());
    assert_eq!(engine.snapshot().session_id, before.session_id);
    drop(lock);
    assert!(engine.open(denied.path()).is_ok());
}

#[cfg(windows)]
#[test]
fn windows_links_are_excluded_and_cannot_replace_a_resource_grant() {
    let dir = TempDir::new().unwrap();
    let outside = TempDir::new().unwrap();
    media(dir.path(), "one.jpg");
    media(outside.path(), "secret.jpg");
    std::os::windows::fs::symlink_file(
        outside.path().join("secret.jpg"),
        dir.path().join("link.jpg"),
    )
    .expect("Windows native link security test needs file-symlink creation");
    let engine = Engine::new();
    engine.open(dir.path()).unwrap();
    engine
        .refresh(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    let snapshot = engine.snapshot();
    assert_eq!(snapshot.items.len(), 1);
    fs::remove_file(dir.path().join("one.jpg")).unwrap();
    std::os::windows::fs::symlink_file(
        outside.path().join("secret.jpg"),
        dir.path().join("one.jpg"),
    )
    .unwrap();
    assert!(
        engine
            .open_media(
                snapshot.session_id.as_ref().unwrap(),
                &snapshot.items[0].id,
                &snapshot.items[0].revision
            )
            .is_err()
    );
}

#[tokio::test]
async fn native_transport_enforces_host_origin_grants_ranges_and_cancellation() {
    use axum::{
        body::{Body, to_bytes},
        http::Request,
    };
    use tower::ServiceExt;
    let dir = TempDir::new().unwrap();
    media(dir.path(), "bytes.jpg");
    let engine = Engine::new();
    engine.open(dir.path()).unwrap();
    engine
        .refresh(engine.snapshot().session_id.as_ref().unwrap())
        .unwrap();
    let snapshot = engine.snapshot();
    let item = &snapshot.items[0];
    let uri = format!(
        "/media/{}/{}/{}",
        snapshot.session_id.as_ref().unwrap(),
        item.id,
        item.revision
    );
    let router = gallery_core::media_router(engine.clone(), "127.0.0.1:1234".into());
    for (host, origin) in [
        ("attacker.example", "http://tauri.localhost"),
        ("127.0.0.1:1234", "https://attacker.example"),
    ] {
        let response = router
            .clone()
            .oneshot(
                Request::builder()
                    .uri(&uri)
                    .header("Host", host)
                    .header("Origin", origin)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), 403);
    }
    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .uri(&uri)
                .header("Host", "127.0.0.1:1234")
                .header("Origin", "http://tauri.localhost")
                .header("Range", "bytes=1-3")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), 206);
    assert_eq!(response.headers()["Content-Range"], "bytes 1-3/19");
    assert_eq!(
        response.headers()["Access-Control-Allow-Origin"],
        "http://tauri.localhost"
    );
    assert_eq!(
        to_bytes(response.into_body(), 100).await.unwrap().as_ref(),
        b"ixt"
    );
    let head = router
        .clone()
        .oneshot(
            Request::builder()
                .method("HEAD")
                .uri(&uri)
                .header("Host", "127.0.0.1:1234")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(head.headers()["Content-Length"], "19");
    assert!(to_bytes(head.into_body(), 100).await.unwrap().is_empty());
    let bad_range = router
        .clone()
        .oneshot(
            Request::builder()
                .uri(&uri)
                .header("Host", "127.0.0.1:1234")
                .header("Range", "bytes=999-")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(bad_range.status(), 416);
    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .uri(&uri)
                .header("Host", "127.0.0.1:1234")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    engine.close(snapshot.session_id.as_ref().unwrap()).unwrap();
    assert!(
        to_bytes(response.into_body(), 100)
            .await
            .unwrap()
            .is_empty(),
        "retired streams must stop"
    );
    let stale = router
        .oneshot(
            Request::builder()
                .uri(&uri)
                .header("Host", "127.0.0.1:1234")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(stale.status(), 404);
}
