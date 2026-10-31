// SPDX-License-Identifier: Apache-2.0
//! Finite read-only recipient state preflight. No Tauri window or state initialization.
use std::{
    ffi::OsString,
    path::{Path, PathBuf},
};
fn physical(p: &Path) -> Result<(), String> {
    if !p.is_absolute() {
        return Err("Supply absolute selected recipient state paths".into());
    }
    let mut part = PathBuf::new();
    for c in p.components() {
        if matches!(
            c,
            std::path::Component::ParentDir | std::path::Component::CurDir
        ) {
            return Err("Dot state paths are unsupported".into());
        }
        part.push(c);
        if matches!(c, std::path::Component::Prefix(_)) {
            continue;
        }
        match std::fs::symlink_metadata(&part) {
            Ok(m) => {
                if m.file_type().is_symlink() {
                    return Err("Linked state paths are unsupported".into());
                }
                #[cfg(windows)]
                {
                    use std::os::windows::fs::MetadataExt;
                    if m.file_attributes() & 0x400 != 0 {
                        return Err("Reparse state path".into());
                    }
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(())
}
pub fn probe(args: &[OsString]) -> Result<serde_json::Value, String> {
    let mut results = vec![];
    let mut args = args.iter();
    let mut json = false;
    while let Some(flag) = args.next() {
        if flag == "--json" {
            if json {
                return Err("Duplicate --json".into());
            }
            json = true;
            continue;
        }
        let kind = flag.to_str().ok_or("Invalid option")?;
        if !matches!(kind, "--settings" | "--portable" | "--history") {
            return Err("Use --settings FILE, --portable DIRECTORY or --history DATABASE".into());
        }
        let path = PathBuf::from(args.next().ok_or("Missing state operand")?);
        physical(&path)?;
        let result = match kind {
            "--settings" => crate::settings::compatibility(&path),
            "--portable" => crate::portable::compatibility(&path),
            "--history" => crate::history::compatibility(&path),
            _ => unreachable!(),
        };
        results.push(serde_json::json!({"kind":kind.trim_start_matches("--"),"path":gallery_core::NativePath::from_path(&path),"compatible":result.is_ok(),"error":result.err().map(|e|e.to_string())}));
    }
    if !json || results.is_empty() {
        return Err("Supply --json and explicit selected recipient state operands; elevated HOME is not recipient authority".into());
    }
    Ok(
        serde_json::json!({"product":"local-media-gallery","version":env!("CARGO_PKG_VERSION"),"formatVersion":1,"compatible":results.iter().all(|r|r["compatible"]==true),"states":results,"meaning":"Selected operands checked read-only; other profiles retain ordinary writer compatibility guards"}),
    )
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn absent_future_and_corrupt_are_preserved() {
        let t = tempfile::tempdir().unwrap();
        let physical = std::fs::canonicalize(t.path()).unwrap();
        let settings = physical.join("settings.json");
        let args = vec![
            "--json".into(),
            "--settings".into(),
            settings.clone().into_os_string(),
        ];
        assert_eq!(probe(&args).unwrap()["compatible"], true);
        assert!(!settings.exists());
        for bytes in [b"{}".as_slice(), b"corrupt"] {
            std::fs::write(&settings, bytes).unwrap();
            assert_eq!(probe(&args).unwrap()["compatible"], false);
            assert_eq!(std::fs::read(&settings).unwrap(), bytes);
        }
        let history = physical.join("history.sqlite3");
        std::fs::write(&history, b"foreign").unwrap();
        assert!(crate::history::compatibility(&history).is_err());
        assert_eq!(std::fs::read(&history).unwrap(), b"foreign");
    }
}
