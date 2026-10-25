// SPDX-License-Identifier: Apache-2.0
use gallery_core::{Engine, MetadataRequest, parse_metadata_json};
use serde_json::{Value, json};
use std::fs;
use tempfile::TempDir;

fn inspect(engine: &Engine, name: &str) -> Value {
    let s = engine.snapshot();
    let item = s.items.iter().find(|i| i.name == name).unwrap();
    let request = MetadataRequest {
        session_id: s.session_id.unwrap(),
        item_id: item.id.clone(),
        item_revision: item.revision.clone(),
        metadata_revision: s.metadata_revision,
    };
    serde_json::to_value(engine.metadata_request(request).unwrap().read().unwrap()).unwrap()
}
#[test]
fn exact_tree_preserves_order_duplicates_numbers_and_all_empty_values() {
    let source = r#"{"n":900719925474099312345,"n":1.00e+999,"empty":"","nil":null,"false":false,"zero":-0,"array":[],"object":{},"a/b~":{"":0}}"#;
    let tree = serde_json::to_value(parse_metadata_json(source).unwrap()).unwrap();
    let members = tree["members"].as_array().unwrap();
    assert_eq!(members[0]["key"], "n");
    assert_eq!(
        members[0]["value"],
        json!({"type":"number","value":"900719925474099312345"})
    );
    assert_eq!(members[1]["value"]["value"], "1.00e+999");
    assert_eq!(members[2]["value"]["value"], "");
    assert_eq!(members[3]["value"]["type"], "null");
    assert_eq!(members[4]["value"]["value"], false);
    assert_eq!(members[5]["value"]["value"], "-0");
    assert_eq!(members[6]["value"]["items"], json!([]));
    assert_eq!(members[7]["value"]["members"], json!([]));
    assert_eq!(
        serde_json::to_value(parse_metadata_json("false").unwrap()).unwrap()["value"],
        false
    );
    for bad in [
        "01",
        "1e",
        "[0,]",
        "{\"a\":1,}",
        "true false",
        "\"\\uDEAD\"",
    ] {
        assert!(parse_metadata_json(bad).is_err(), "{bad}");
    }
}
#[test]
fn exact_stem_and_legacy_records_are_attributed_without_source_writes() {
    let dir = TempDir::new().unwrap();
    for name in ["harbor.jpg", "harbor.png"] {
        fs::write(dir.path().join(name), b"media").unwrap();
    }
    let sources = [
        (
            "harbor.jpg_meta.json",
            r#"{"Title":"Direct","odd":[false,null,0,""]}"#,
        ),
        ("harbor.jpg.json", "42"),
        ("harbor.json", r#"{"Title":"Ambiguous"}"#),
        (
            "index.json",
            r#"{"Items":[{"Name":"original.jpg","StorageName":"harbor.jpg","Metadata":[{"Source":"camera","Type":"capture","Data":{"Exact":9007199254740993}}]},{"Name":"deleted.jpg"},{"IsDirectory":true,"Items":[{"Name":"harbor.jpg","Title":"Wrong nested"}]},{"Name":"../harbor.jpg"}]}"#,
        ),
        ("unrelated.json", r#"{"Title":"Unrelated"}"#),
    ];
    for (name, text) in sources {
        fs::write(dir.path().join(name), text).unwrap();
    }
    let engine = Engine::new();
    let s = engine.open(dir.path()).unwrap();
    assert_eq!(s.items.len(), 2);
    let result = inspect(&engine, "harbor.jpg");
    let docs = result["documents"].as_array().unwrap();
    assert_eq!(docs.len(), 4, "{result}");
    assert_eq!(docs[0]["source"], "full-name-meta");
    assert_eq!(docs[1]["node"]["value"], "42");
    assert_eq!(docs[2]["ambiguous"], true);
    assert_eq!(docs[3]["source"], "index:index.json");
    assert!(docs[3]["recordPath"].as_str().unwrap().contains("Items"));
    assert!(result["limitations"].to_string().contains("stale"));
    for (name, text) in sources {
        assert_eq!(fs::read(dir.path().join(name)).unwrap(), text.as_bytes());
    }
}
#[test]
fn sidecar_only_refresh_retires_reads_without_revising_media() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("clip.mp4"), b"media").unwrap();
    fs::write(dir.path().join("clip.mp4.json"), "1").unwrap();
    let engine = Engine::new();
    let a = engine.open(dir.path()).unwrap();
    let i = &a.items[0];
    let old = engine
        .metadata_request(MetadataRequest {
            session_id: a.session_id.clone().unwrap(),
            item_id: i.id.clone(),
            item_revision: i.revision.clone(),
            metadata_revision: a.metadata_revision.clone(),
        })
        .unwrap();
    fs::write(dir.path().join("clip.mp4.json"), "2").unwrap();
    let b = engine.refresh(a.session_id.as_ref().unwrap()).unwrap();
    assert_eq!(a.items[0].revision, b.items[0].revision);
    assert_ne!(a.metadata_revision, b.metadata_revision);
    assert_eq!(old.read().unwrap_err().code, "stale_metadata");
    assert_eq!(
        inspect(&engine, "clip.mp4")["documents"][0]["node"]["value"],
        "2"
    );
}
#[test]
fn malformed_encoding_limits_and_replacements_are_item_scoped() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.jpg"), b"media").unwrap();
    let path = dir.path().join("a.jpg.json");
    fs::write(&path, "{").unwrap();
    let engine = Engine::new();
    let s = engine.open(dir.path()).unwrap();
    assert_eq!(
        inspect(&engine, "a.jpg")["documents"][0]["status"],
        "invalid"
    );
    for (bytes, status) in [
        (vec![0xff, 0xfe, 0, 0], "encoding"),
        (vec![b' '; 1024 * 1024 + 1], "limited"),
        (
            format!("{}0{}", "[".repeat(65), "]".repeat(65)).into_bytes(),
            "limited",
        ),
    ] {
        fs::write(&path, &bytes).unwrap();
        engine.refresh(s.session_id.as_ref().unwrap()).unwrap();
        assert_eq!(inspect(&engine, "a.jpg")["documents"][0]["status"], status);
        assert_eq!(fs::read(&path).unwrap(), bytes);
    }
    fs::write(&path, "1").unwrap();
    engine.refresh(s.session_id.as_ref().unwrap()).unwrap();
    fs::remove_file(&path).unwrap();
    fs::write(&path, "2").unwrap();
    assert_eq!(
        inspect(&engine, "a.jpg")["documents"][0]["status"],
        "changed"
    );
}

#[test]
fn parser_boundaries_and_bom_are_explicit_with_raw_source_recovery() {
    assert!(parse_metadata_json(&format!("{}0{}", "[".repeat(64), "]".repeat(64))).is_ok());
    assert!(parse_metadata_json(&format!("[{}]", vec!["0"; 19_999].join(","))).is_ok());
    assert!(
        parse_metadata_json(&format!("[{}]", vec!["0"; 20_000].join(",")))
            .unwrap_err()
            .starts_with("Resource limit:")
    );
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.jpg"), b"media").unwrap();
    let source = "\u{feff}{\"\\u006e\":1,\"n\":2}";
    fs::write(dir.path().join("a.jpg.json"), source).unwrap();
    let engine = Engine::new();
    engine.open(dir.path()).unwrap();
    let value = inspect(&engine, "a.jpg");
    assert_eq!(value["documents"][0]["sourceText"], source);
    assert!(
        value["documents"][0]["message"]
            .as_str()
            .unwrap()
            .contains("BOM")
    );
    assert_eq!(value["documents"][0]["node"]["members"][0]["key"], "n");
    assert_eq!(value["documents"][0]["node"]["members"][1]["key"], "n");
}

#[test]
fn admission_and_unrequested_changes_do_not_expand_or_rescan_authority() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.jpg"), b"media").unwrap();
    let engine = Engine::new();
    let before = engine.open(dir.path()).unwrap();
    fs::write(dir.path().join("a.jpg.json"), "42").unwrap();
    assert_eq!(
        inspect(&engine, "a.jpg")["documents"],
        json!([]),
        "Inspection must not discover new files"
    );
    let s = engine.refresh(before.session_id.as_ref().unwrap()).unwrap();
    let request = MetadataRequest {
        session_id: s.session_id.clone().unwrap(),
        item_id: s.items[0].id.clone(),
        item_revision: s.items[0].revision.clone(),
        metadata_revision: s.metadata_revision.clone(),
    };
    let held = engine.metadata_request(request.clone()).unwrap();
    assert_eq!(
        engine.metadata_request(request.clone()).err().unwrap().code,
        "metadata_busy"
    );
    drop(held);
    let held = engine.metadata_request(request.clone()).unwrap();
    engine.close(s.session_id.as_ref().unwrap()).unwrap();
    assert_eq!(held.read().unwrap_err().code, "stale_metadata");
    assert!(engine.metadata_request(request).is_err());
}

#[test]
fn catalog_and_search_exhaustion_are_visible_and_complete_retry_recovers() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.jpg"), b"media").unwrap();
    // Many tiny JSON documents exercise the catalog bound, not bulk media acceptance.
    for index in 0..257 {
        fs::write(dir.path().join(format!("doc{index:03}.json")), "{}").unwrap();
    }
    let engine = Engine::new();
    let s = engine.open(dir.path()).unwrap();
    let value = inspect(&engine, "a.jpg");
    assert!(value["limitations"].to_string().contains("256"));
    assert!(value["limitations"].to_string().contains("32"));
    for index in 0..257 {
        fs::remove_file(dir.path().join(format!("doc{index:03}.json"))).unwrap();
    }
    fs::write(dir.path().join("a.jpg.json"), "42").unwrap();
    engine.refresh(s.session_id.as_ref().unwrap()).unwrap();
    let value = inspect(&engine, "a.jpg");
    assert_eq!(value["documents"][0]["node"]["value"], "42");
    assert!(value["limitations"].as_array().unwrap().is_empty());
}

#[test]
fn index_references_keep_stored_precedence_and_duplicate_conflicts() {
    let dir = TempDir::new().unwrap();
    for name in ["one.jpg", "two.jpg"] {
        fs::write(dir.path().join(name), b"media").unwrap();
    }
    fs::write(dir.path().join("records.json"),r#"[{"StorageName":"two.jpg","Name":"one.jpg"},{"StorageName":"deleted.jpg","Name":"one.jpg"},{"Name":"one.jpg","Name":"two.jpg","Title":"Conflict"},{"file":"one.jpg"},{"path":"../one.jpg"},{"Name":"one.jpg","Name":null}]"#).unwrap();
    let engine = Engine::new();
    engine.open(dir.path()).unwrap();
    let value = inspect(&engine, "one.jpg");
    assert_eq!(value["documents"].as_array().unwrap().len(), 3);
    assert_eq!(value["documents"][0]["ambiguous"], true);
    assert_eq!(
        value["documents"][2]["ambiguous"], true,
        "Mixed-type duplicate reference members remain ambiguous"
    );
    assert!(value["limitations"].to_string().contains("stale"));
}

#[test]
fn failed_encoding_reads_still_consume_the_aggregate_source_budget() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.jpg"), b"media").unwrap();
    for index in 0..12 {
        fs::write(
            dir.path().join(format!("invalid{index:02}.json")),
            vec![0xff; 1024 * 1024],
        )
        .unwrap();
    }
    let engine = Engine::new();
    engine.open(dir.path()).unwrap();
    let value = inspect(&engine, "a.jpg");
    let limits = value["limitations"].as_array().unwrap();
    assert_eq!(
        limits
            .iter()
            .filter(|v| v.as_str().unwrap().contains(": encoding;"))
            .count(),
        8
    );
    assert!(
        limits
            .iter()
            .any(|v| v.as_str().unwrap().contains("eight MiB"))
    );
}

#[test]
fn reference_case_uses_actual_native_names_without_equating_distinct_hardlinks() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("one.jpg"), b"media").unwrap();
    fs::write(dir.path().join("index.json"), r#"{"Name":"ONE.JPG"}"#).unwrap();
    let engine = Engine::new();
    engine.open(dir.path()).unwrap();
    let exists = dir.path().join("ONE.JPG").exists();
    assert_eq!(
        inspect(&engine, "one.jpg")["documents"]
            .as_array()
            .unwrap()
            .len(),
        usize::from(exists)
    );
    if !exists {
        fs::hard_link(dir.path().join("one.jpg"), dir.path().join("ONE.JPG")).unwrap();
        engine
            .refresh(engine.snapshot().session_id.as_ref().unwrap())
            .unwrap();
        assert_eq!(inspect(&engine, "one.jpg")["documents"], json!([]));
        assert_eq!(
            inspect(&engine, "ONE.JPG")["documents"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
    }
}

#[test]
fn non_unicode_index_names_have_distinct_persistable_source_identity() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.jpg"), b"media").unwrap();
    #[cfg(windows)]
    let names = {
        use std::os::windows::ffi::OsStringExt;
        [
            std::ffi::OsString::from_wide(&[0xd800, 46, 106, 115, 111, 110]),
            std::ffi::OsString::from_wide(&[0xd801, 46, 106, 115, 111, 110]),
        ]
    };
    #[cfg(unix)]
    let names = {
        use std::os::unix::ffi::OsStringExt;
        [
            std::ffi::OsString::from_vec(vec![0xff, b'.', b'j', b's', b'o', b'n']),
            std::ffi::OsString::from_vec(vec![0xfe, b'.', b'j', b's', b'o', b'n']),
        ]
    };
    assert_eq!(names[0].to_string_lossy(), names[1].to_string_lossy());
    for name in names {
        fs::write(
            dir.path().join(name),
            r#"{"Name":"a.jpg","Exact":9007199254740993}"#,
        )
        .unwrap();
    }
    let engine = Engine::new();
    engine.open(dir.path()).unwrap();
    let value = inspect(&engine, "a.jpg");
    assert_eq!(value["documents"].as_array().unwrap().len(), 2);
    assert_ne!(
        value["documents"][0]["source"],
        value["documents"][1]["source"]
    );
}

#[cfg(windows)]
#[test]
fn windows_denied_and_reparse_sidecars_never_read_outside_bytes() {
    use std::os::windows::fs::OpenOptionsExt;
    let dir = TempDir::new().unwrap();
    let outside = TempDir::new().unwrap();
    fs::write(dir.path().join("a.jpg"), b"media").unwrap();
    let path = dir.path().join("a.jpg.json");
    fs::write(&path, "1").unwrap();
    fs::write(
        outside.path().join("secret.json"),
        r#"{"secret":"outside"}"#,
    )
    .unwrap();
    let engine = Engine::new();
    let s = engine.open(dir.path()).unwrap();
    let lock = fs::OpenOptions::new()
        .read(true)
        .share_mode(0)
        .open(&path)
        .unwrap();
    assert_eq!(
        inspect(&engine, "a.jpg")["documents"][0]["status"],
        "unreadable"
    );
    drop(lock);
    fs::remove_file(&path).unwrap();
    std::os::windows::fs::symlink_file(outside.path().join("secret.json"), &path).unwrap();
    let value = inspect(&engine, "a.jpg");
    assert_eq!(value["documents"][0]["status"], "changed");
    assert!(!value.to_string().contains("outside"));
    engine.refresh(s.session_id.as_ref().unwrap()).unwrap();
    assert_eq!(inspect(&engine, "a.jpg")["documents"], json!([]));
}

#[cfg(feature = "discovery-tests")]
#[test]
fn blocked_metadata_does_not_hold_discovery_or_retirement_and_old_results_are_rejected() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.jpg"), b"media").unwrap();
    fs::write(dir.path().join("a.jpg.json"), "1").unwrap();
    let engine = Engine::new();
    let s = engine.open(dir.path()).unwrap();
    engine.test_metadata_control("metadata_arm").unwrap();
    let read = engine
        .metadata_request(MetadataRequest {
            session_id: s.session_id.clone().unwrap(),
            item_id: s.items[0].id.clone(),
            item_revision: s.items[0].revision.clone(),
            metadata_revision: s.metadata_revision.clone(),
        })
        .unwrap();
    let worker = std::thread::spawn(move || read.read());
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(2);
    while !engine.test_metadata_control("metadata_status").unwrap() {
        assert!(std::time::Instant::now() < deadline);
        std::thread::yield_now();
    }
    let request = engine
        .begin_refresh(s.session_id.as_ref().unwrap())
        .unwrap();
    engine.cancel_discovery(&request.id).unwrap();
    engine.close(s.session_id.as_ref().unwrap()).unwrap();
    engine.test_metadata_control("metadata_release").unwrap();
    assert_eq!(worker.join().unwrap().unwrap_err().code, "stale_metadata");
}
