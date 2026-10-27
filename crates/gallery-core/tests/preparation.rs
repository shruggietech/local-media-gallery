use gallery_core::cache::{CacheEntry, POLICY, SourceName};
use std::ffi::OsStr;
#[test]
fn relative_keys_preserve_spelling_and_never_accept_traversal() {
    let a = SourceName::new(OsStr::new("é.png")).unwrap();
    assert_ne!(a.key(), SourceName::new(OsStr::new("e.png")).unwrap().key());
    assert!(SourceName::new(OsStr::new("../outside.png")).is_err());
    assert_eq!(POLICY, "png-fit320-first-unmanaged-v1");
}
#[test]
fn incomplete_future_and_oversized_entries_are_misses() {
    for value in [
        br#"{"formatVersion":2}"#.as_slice(),
        br#"{"complete":false}"#.as_slice(),
    ] {
        assert!(CacheEntry::parse(value).is_err());
    }
    assert!(CacheEntry::parse(&vec![0; 6 * 1024 * 1024 + 1]).is_err());
}

use gallery_core::{
    Engine,
    thumbnail::{DestinationKind, PreparationService},
};
use std::sync::Arc;
#[test]
fn preview_is_write_free_and_generation_reuses_relocatable_validated_cache() {
    let root = tempfile::tempdir().unwrap();
    let cache = tempfile::tempdir().unwrap();
    image::RgbaImage::from_pixel(640, 360, image::Rgba([20, 30, 40, 255]))
        .save(root.path().join("photo.png"))
        .unwrap();
    let before = std::fs::read(root.path().join("photo.png")).unwrap();
    let engine = Engine::new();
    let opened = engine.open(root.path()).unwrap();
    let session = opened.session_id.unwrap();
    let service = Arc::new(PreparationService::new(
        engine.clone(),
        cache.path().join("absent"),
        None,
    ));
    let job = service
        .preview(&session, DestinationKind::Portable)
        .unwrap();
    let ready = service.wait(&job.id);
    assert_eq!(ready.phase, "ready");
    assert!(!root.path().join(gallery_core::cache::PORTABLE).exists());
    assert!(!cache.path().join("absent").exists());
    let running = service.start(&session, &job.id, false).unwrap();
    assert!(
        running.sequence.parse::<u64>().unwrap() > ready.sequence.parse::<u64>().unwrap(),
        "Starting a job must advance its sequence before returning running state"
    );
    let done = service.wait(&job.id);
    assert_eq!(done.phase, "success");
    assert_eq!(done.completed, "1");
    assert_eq!(
        service.cancel(&session, &job.id).unwrap().phase,
        "success",
        "Late cancellation must preserve a completed outcome"
    );
    assert_eq!(
        before,
        std::fs::read(root.path().join("photo.png")).unwrap()
    );
    let item = &opened.items[0];
    let png = service
        .lookup(
            &session,
            &item.id,
            &item.revision,
            &tokio_util::sync::CancellationToken::new(),
        )
        .unwrap()
        .unwrap();
    assert_eq!(gallery_core::cache::validate_png(&png).unwrap(), (320, 180));
    let job = service
        .preview(&session, DestinationKind::Portable)
        .unwrap();
    let ready = service.wait(&job.id);
    assert_eq!(ready.reused, "1");
}
#[test]
fn unrelated_cache_and_changed_source_never_get_overwritten() {
    let root = tempfile::tempdir().unwrap();
    let cache = tempfile::tempdir().unwrap();
    image::RgbaImage::new(5, 5)
        .save(root.path().join("a.png"))
        .unwrap();
    let engine = Engine::new();
    let opened = engine.open(root.path()).unwrap();
    let s = opened.session_id.unwrap();
    let service = Arc::new(PreparationService::new(engine, cache.path().into(), None));
    let job = service.preview(&s, DestinationKind::Portable).unwrap();
    assert_eq!(service.wait(&job.id).phase, "ready");
    std::fs::create_dir(root.path().join(gallery_core::cache::PORTABLE)).unwrap();
    std::fs::write(
        root.path()
            .join(gallery_core::cache::PORTABLE)
            .join("private"),
        b"keep",
    )
    .unwrap();
    service.start(&s, &job.id, false).unwrap();
    assert_eq!(service.wait(&job.id).phase, "failed");
    assert_eq!(
        std::fs::read(
            root.path()
                .join(gallery_core::cache::PORTABLE)
                .join("private")
        )
        .unwrap(),
        b"keep"
    );
}

#[test]
fn portable_relocation_invalid_cache_and_same_size_source_change_fall_back() {
    let outer = tempfile::tempdir().unwrap();
    let original = outer.path().join("before");
    std::fs::create_dir(&original).unwrap();
    let source = original.join("é.png");
    image::RgbaImage::from_pixel(8, 8, image::Rgba([1, 2, 3, 255]))
        .save(&source)
        .unwrap();
    let engine = Engine::new();
    let snap = engine.open(&original).unwrap();
    let session = snap.session_id.unwrap();
    let service = Arc::new(PreparationService::new(
        engine.clone(),
        outer.path().join("local"),
        None,
    ));
    let job = service
        .preview(&session, DestinationKind::Portable)
        .unwrap();
    assert_eq!(service.wait(&job.id).phase, "ready");
    service.start(&session, &job.id, false).unwrap();
    assert_eq!(service.wait(&job.id).phase, "success");
    engine.close(&session).unwrap();
    let moved = outer.path().join("after");
    std::fs::rename(&original, &moved).unwrap();
    let snap = engine.open(&moved).unwrap();
    let session = snap.session_id.unwrap();
    let item = &snap.items[0];
    let cancel = tokio_util::sync::CancellationToken::new();
    assert!(
        service
            .lookup(&session, &item.id, &item.revision, &cancel)
            .unwrap()
            .is_some()
    );
    let path = moved.join("é.png");
    let f = std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(&path)
        .unwrap();
    let m = f.metadata().unwrap();
    let mut bytes = std::fs::read(&path).unwrap();
    let n = bytes.len();
    bytes[n - 1] ^= 1;
    std::fs::write(&path, &bytes).unwrap();
    f.set_modified(m.modified().unwrap()).unwrap();
    assert!(
        service
            .lookup(&session, &item.id, &item.revision, &cancel)
            .unwrap()
            .is_none()
    );
}
#[test]
fn cancellation_and_retired_root_never_commit_new_entries() {
    let root = tempfile::tempdir().unwrap();
    let local = tempfile::tempdir().unwrap();
    for n in 0..20 {
        image::RgbaImage::new(64, 64)
            .save(root.path().join(format!("{n}.png")))
            .unwrap();
    }
    let engine = Engine::new();
    let s = engine.open(root.path()).unwrap().session_id.unwrap();
    let service = Arc::new(PreparationService::new(
        engine.clone(),
        local.path().join("cache"),
        None,
    ));
    let job = service.preview(&s, DestinationKind::Portable).unwrap();
    service.cancel(&s, &job.id).unwrap();
    assert_eq!(service.wait(&job.id).phase, "cancelled");
    assert!(!root.path().join(gallery_core::cache::PORTABLE).exists());
    let job = service.preview(&s, DestinationKind::Portable).unwrap();
    assert_eq!(service.wait(&job.id).phase, "ready");
    engine.close(&s).unwrap();
    service.start(&s, &job.id, false).unwrap();
    assert_eq!(service.wait(&job.id).phase, "failed");
    assert!(!root.path().join(gallery_core::cache::PORTABLE).exists());
}

#[cfg(feature = "discovery-tests")]
#[test]
fn admitted_generation_cancellation_preserves_prior_and_blocks_retired_commit() {
    let root = tempfile::tempdir().unwrap();
    let local = tempfile::tempdir().unwrap();
    image::RgbaImage::new(64, 64)
        .save(root.path().join("a.png"))
        .unwrap();
    let engine = Engine::new();
    let s = engine.open(root.path()).unwrap().session_id.unwrap();
    let service = Arc::new(PreparationService::new(
        engine.clone(),
        local.path().join("cache"),
        None,
    ));
    let job = service.preview(&s, DestinationKind::Portable).unwrap();
    assert_eq!(service.wait(&job.id).phase, "ready");
    service.test_control("arm").unwrap();
    service.start(&s, &job.id, false).unwrap();
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
    while !service.test_control("status").unwrap() {
        assert!(std::time::Instant::now() < deadline);
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
    assert!(service.preview(&s, DestinationKind::Portable).is_err());
    service.cancel(&s, &job.id).unwrap();
    assert_eq!(service.wait(&job.id).phase, "cancelled");
    let names = std::fs::read_dir(root.path().join(gallery_core::cache::PORTABLE))
        .unwrap()
        .map(|e| e.unwrap().file_name())
        .collect::<Vec<_>>();
    assert!(
        !names
            .iter()
            .any(|n| n.to_string_lossy().ends_with("-0.json"))
    );
    service.test_control("release").unwrap();
}

#[test]
fn staging_name_collision_never_deletes_unrelated_bytes() {
    let root = tempfile::tempdir().unwrap();
    let parent = Arc::new(
        cap_std::fs::Dir::open_ambient_dir(root.path(), cap_std::ambient_authority()).unwrap(),
    );
    let cache = gallery_core::cache::CacheDir::open(parent, OsStr::new("cache"), true)
        .unwrap()
        .unwrap();
    let mut png = std::io::Cursor::new(Vec::new());
    image::DynamicImage::new_rgba8(1, 1)
        .write_to(&mut png, image::ImageFormat::Png)
        .unwrap();
    let generation = "a".repeat(32);
    let entry = CacheEntry::new(
        SourceName::new(OsStr::new("a.png")).unwrap(),
        "b".repeat(64),
        0,
        "image-0.25.10".into(),
        png.into_inner(),
        generation.clone(),
    )
    .unwrap();
    let stage = root
        .path()
        .join("cache")
        .join(format!("stage-{generation}.json"));
    std::fs::write(&stage, b"UNRELATED").unwrap();
    let slot = gallery_core::cache::CacheDir::slot(&entry.source_name, &entry.content_key(), 0);
    assert!(
        cache
            .publish(&slot, &entry, &tokio_util::sync::CancellationToken::new())
            .is_err()
    );
    assert_eq!(std::fs::read(&stage).unwrap(), b"UNRELATED");
}

#[cfg(feature = "discovery-tests")]
#[test]
fn injected_short_storage_and_permission_writes_preserve_prior_entries() {
    let root = tempfile::tempdir().unwrap();
    let parent = Arc::new(
        cap_std::fs::Dir::open_ambient_dir(root.path(), cap_std::ambient_authority()).unwrap(),
    );
    let cache = gallery_core::cache::CacheDir::open(parent, OsStr::new("cache"), true)
        .unwrap()
        .unwrap();
    let mut png = std::io::Cursor::new(Vec::new());
    image::DynamicImage::new_rgba8(1, 1)
        .write_to(&mut png, image::ImageFormat::Png)
        .unwrap();
    let entry = CacheEntry::new(
        SourceName::new(OsStr::new("a.png")).unwrap(),
        "b".repeat(64),
        0,
        "image-0.25.10".into(),
        png.into_inner(),
        "a".repeat(32),
    )
    .unwrap();
    let first = gallery_core::cache::CacheDir::slot(&entry.source_name, &entry.content_key(), 0);
    let second = gallery_core::cache::CacheDir::slot(&entry.source_name, &entry.content_key(), 1);
    let cancel = tokio_util::sync::CancellationToken::new();
    cache.publish(&first, &entry, &cancel).unwrap();
    let prior = std::fs::read(root.path().join("cache").join(&first)).unwrap();
    for (kind, code) in [
        (std::io::ErrorKind::StorageFull, "cache_storage_full"),
        (std::io::ErrorKind::PermissionDenied, "cache_permission"),
    ] {
        cache.test_write_failure(5, kind);
        assert_eq!(
            cache.publish(&second, &entry, &cancel).unwrap_err().code,
            code
        );
        assert_eq!(
            std::fs::read(root.path().join("cache").join(&first)).unwrap(),
            prior
        );
        assert!(!root.path().join("cache").join(&second).exists());
    }
}

#[test]
fn non_unicode_colliding_display_names_generate_distinct_native_entries() {
    #[cfg(windows)]
    let names = {
        use std::os::windows::ffi::OsStringExt;
        [
            std::ffi::OsString::from_wide(&[0xd800, 46, 112, 110, 103]),
            std::ffi::OsString::from_wide(&[0xd801, 46, 112, 110, 103]),
        ]
    };
    #[cfg(unix)]
    let names = {
        use std::os::unix::ffi::OsStringExt;
        [
            std::ffi::OsString::from_vec(vec![0xfe, 46, 112, 110, 103]),
            std::ffi::OsString::from_vec(vec![0xff, 46, 112, 110, 103]),
        ]
    };
    assert_eq!(names[0].to_string_lossy(), names[1].to_string_lossy());
    let root = tempfile::tempdir().unwrap();
    let local = tempfile::tempdir().unwrap();
    let mut png = std::io::Cursor::new(Vec::new());
    image::DynamicImage::new_rgba8(4, 7)
        .write_to(&mut png, image::ImageFormat::Png)
        .unwrap();
    for name in &names {
        if let Err(error) = std::fs::write(root.path().join(name), png.get_ref()) {
            // APFS rejects ill-formed UTF-8 filenames; exercise byte-preserving names on filesystems that admit them.
            #[cfg(target_os = "macos")]
            if error.raw_os_error() == Some(92) {
                return;
            }
            panic!("Native filename creation failed: {error}");
        }
    }
    let engine = Engine::new();
    let s = engine.open(root.path()).unwrap().session_id.unwrap();
    let service = Arc::new(PreparationService::new(
        engine.clone(),
        local.path().into(),
        None,
    ));
    let job = service.preview(&s, DestinationKind::Portable).unwrap();
    assert_eq!(service.wait(&job.id).phase, "ready");
    service.start(&s, &job.id, false).unwrap();
    assert_eq!(service.wait(&job.id).completed, "2");
    for item in engine.snapshot().items {
        assert!(
            service
                .lookup(
                    &s,
                    &item.id,
                    &item.revision,
                    &tokio_util::sync::CancellationToken::new()
                )
                .unwrap()
                .is_some()
        );
    }
    assert_ne!(
        SourceName::new(&names[0]).unwrap().key(),
        SourceName::new(&names[1]).unwrap().key()
    );
}
#[test]
fn valid_video_cache_consumption_does_not_require_an_encoder() {
    let root = tempfile::tempdir().unwrap();
    let local = tempfile::tempdir().unwrap();
    let bytes = b"video source bytes owned by the fixture";
    std::fs::write(root.path().join("clip.mp4"), bytes).unwrap();
    let engine = Engine::new();
    let snap = engine.open(root.path()).unwrap();
    let s = snap.session_id.unwrap();
    let grant = engine.capture_current_root(Some(&s)).unwrap().unwrap();
    let cache = gallery_core::cache::CacheDir::open(
        grant.dir,
        OsStr::new(gallery_core::cache::PORTABLE),
        true,
    )
    .unwrap()
    .unwrap();
    let mut png = std::io::Cursor::new(Vec::new());
    image::DynamicImage::new_rgba8(8, 4)
        .write_to(&mut png, image::ImageFormat::Png)
        .unwrap();
    let entry = CacheEntry::new(
        SourceName::new(OsStr::new("clip.mp4")).unwrap(),
        gallery_core::cache::sha(bytes),
        bytes.len() as u64,
        format!("ffmpeg:{}", "0".repeat(64)),
        png.into_inner(),
        "a".repeat(32),
    )
    .unwrap();
    let slot = gallery_core::cache::CacheDir::slot(&entry.source_name, &entry.content_key(), 0);
    cache
        .publish(&slot, &entry, &tokio_util::sync::CancellationToken::new())
        .unwrap();
    let service = PreparationService::new(engine, local.path().into(), None);
    assert!(
        service
            .lookup(
                &s,
                &snap.items[0].id,
                &snap.items[0].revision,
                &tokio_util::sync::CancellationToken::new()
            )
            .unwrap()
            .is_some()
    );
}

#[test]
fn cleanup_cancellation_retains_exact_completed_count_and_remaining_entries() {
    let root = tempfile::tempdir().unwrap();
    let parent = Arc::new(
        cap_std::fs::Dir::open_ambient_dir(root.path(), cap_std::ambient_authority()).unwrap(),
    );
    let cache = gallery_core::cache::CacheDir::open(parent, OsStr::new("cache"), true)
        .unwrap()
        .unwrap();
    let mut png = std::io::Cursor::new(Vec::new());
    image::DynamicImage::new_rgba8(1, 1)
        .write_to(&mut png, image::ImageFormat::Png)
        .unwrap();
    let entry = CacheEntry::new(
        SourceName::new(OsStr::new("a.png")).unwrap(),
        "b".repeat(64),
        0,
        "image-0.25.10".into(),
        png.into_inner(),
        "a".repeat(32),
    )
    .unwrap();
    let cancel = tokio_util::sync::CancellationToken::new();
    for n in 0..2 {
        cache
            .publish(
                &gallery_core::cache::CacheDir::slot(&entry.source_name, &entry.content_key(), n),
                &entry,
                &cancel,
            )
            .unwrap();
    }
    let mut completed = 0;
    let error = cache
        .cleanup(&cancel, |stats| {
            completed = stats.removed;
            if completed == 1 {
                cancel.cancel();
            }
        })
        .unwrap_err();
    assert_eq!(error.code, "cancelled");
    assert_eq!(completed, 1);
    let remaining = std::fs::read_dir(root.path().join("cache"))
        .unwrap()
        .filter(|e| {
            e.as_ref()
                .unwrap()
                .file_name()
                .to_string_lossy()
                .starts_with(&entry.source_name.key())
        })
        .count();
    assert_eq!(remaining, 1);
}

#[test]
fn metadata_only_cache_does_not_require_an_original_read() {
    let root = tempfile::tempdir().unwrap();
    let local = tempfile::tempdir().unwrap();
    let file = root.path().join("source.png");
    image::RgbaImage::new(4, 4).save(&file).unwrap();
    let engine = Engine::new();
    let snapshot = engine.open(root.path()).unwrap();
    let session = snapshot.session_id.unwrap();
    let grant = engine
        .capture_current_root(Some(&session))
        .unwrap()
        .unwrap();
    gallery_core::cache::CacheDir::open(grant.dir, OsStr::new(gallery_core::cache::PORTABLE), true)
        .unwrap();
    std::fs::remove_file(file).unwrap();
    let service = PreparationService::new(engine, local.path().join("cache"), None);
    assert!(
        service
            .lookup(
                &session,
                &snapshot.items[0].id,
                &snapshot.items[0].revision,
                &tokio_util::sync::CancellationToken::new()
            )
            .unwrap()
            .is_none()
    );
}

#[test]
fn reused_preview_is_revalidated_after_cache_cleanup_or_source_change() {
    for change_source in [false, true] {
        let root = tempfile::tempdir().unwrap();
        let local = tempfile::tempdir().unwrap();
        let source = root.path().join("photo.png");
        image::RgbaImage::new(8, 8).save(&source).unwrap();
        let engine = Engine::new();
        let s = engine.open(root.path()).unwrap().session_id.unwrap();
        let service = Arc::new(PreparationService::new(
            engine.clone(),
            local.path().join("cache"),
            None,
        ));
        let first = service.preview(&s, DestinationKind::Portable).unwrap();
        service.wait(&first.id);
        service.start(&s, &first.id, false).unwrap();
        assert_eq!(service.wait(&first.id).completed, "1");
        let next = service.preview(&s, DestinationKind::Portable).unwrap();
        assert_eq!(service.wait(&next.id).reused, "1");
        if change_source {
            let mut bytes = std::fs::read(&source).unwrap();
            let n = bytes.len();
            bytes[n - 1] ^= 1;
            let file = std::fs::OpenOptions::new()
                .read(true)
                .write(true)
                .open(&source)
                .unwrap();
            let modified = file.metadata().unwrap().modified().unwrap();
            std::fs::write(&source, bytes).unwrap();
            file.set_modified(modified).unwrap();
        } else {
            let cache = root.path().join(gallery_core::cache::PORTABLE);
            for e in std::fs::read_dir(cache).unwrap() {
                let e = e.unwrap();
                if e.file_name()
                    .to_string_lossy()
                    .starts_with(&SourceName::new(OsStr::new("photo.png")).unwrap().key())
                {
                    std::fs::remove_file(e.path()).unwrap();
                }
            }
        }
        service.start(&s, &next.id, false).unwrap();
        let result = service.wait(&next.id);
        assert_ne!(
            result.phase, "success",
            "A stale reused preview must not certify successful generation"
        );
        assert_eq!(result.reused, "0");
        assert_eq!(result.failed, "1");
    }
}
