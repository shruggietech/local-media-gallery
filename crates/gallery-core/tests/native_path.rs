// SPDX-License-Identifier: Apache-2.0
use gallery_core::{Engine, NativePath};
use std::{ffi::OsString, path::PathBuf};

fn unusual() -> PathBuf {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStringExt;
        OsString::from_wide(&[65, 0xd800, 66]).into()
    }
    #[cfg(unix)]
    {
        use std::os::unix::ffi::OsStringExt;
        OsString::from_vec(vec![65, 0xff, 66]).into()
    }
}
#[test]
fn native_path_roundtrip_and_exact_requested_root() {
    let path = unusual();
    let encoded = NativePath::from_path(&path);
    assert_eq!(encoded.to_path().unwrap(), path);
    let json = serde_json::to_vec(&encoded).unwrap();
    let decoded: NativePath = serde_json::from_slice(&json).unwrap();
    assert_eq!(decoded.to_path().unwrap(), path);
    let engine = Engine::new();
    let request = engine.begin_open(&path);
    let snap = engine.snapshot();
    let discovery = snap.discovery.unwrap();
    assert_eq!(discovery.id, request.id);
    assert_eq!(
        discovery.requested_native_root.unwrap().to_path().unwrap(),
        path
    );
    assert!(snap.native_root.is_none());
}
#[test]
fn invalid_native_encoding_is_attributable() {
    let malformed: NativePath =
        serde_json::from_str(r#"{"encoding":"windows-utf16le","bytes":[65]}"#).unwrap();
    assert_eq!(
        malformed.to_path().unwrap_err().code,
        "native_path_encoding"
    );
    assert!(serde_json::from_str::<NativePath>(r#"{"encoding":"other","bytes":[]}"#).is_err());
    assert!(
        serde_json::from_str::<NativePath>(r#"{"encoding":"unix-bytes","bytes":[256]}"#).is_err()
    );
}

#[test]
fn failed_pending_selection_does_not_borrow_prior_session() {
    let directory = tempfile::tempdir().unwrap();
    let engine = Engine::new();
    let first = engine.begin_open(directory.path());
    engine.run_discovery(&first, || {}).unwrap();
    let prior = engine.snapshot().session_id.unwrap();
    let pending = engine.begin_open(&directory.path().join("absent"));
    assert!(engine.snapshot().discovery.unwrap().session_id.is_none());
    let _ = engine.run_discovery(&pending, || {});
    let snap = engine.snapshot();
    assert_eq!(snap.session_id.as_deref(), Some(prior.as_str()));
    assert!(snap.discovery.unwrap().session_id.is_none());
}
