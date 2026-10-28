// SPDX-License-Identifier: Apache-2.0
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Component, Path, PathBuf},
};

pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;
pub fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct File {
    pub path: String,
    pub bytes: String,
    pub sha256: String,
    pub mode: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Payload {
    pub format_version: u8,
    pub product: String,
    pub kind: String,
    pub version: String,
    pub edition: String,
    pub os: String,
    pub arch: String,
    pub target_triple: String,
    pub build_profile: String,
    pub generation: String,
    pub source: serde_json::Value,
    pub revision: String,
    pub bundle: String,
    pub binary: String,
    pub files: Vec<File>,
}
impl Payload {
    pub fn validate(&self) -> Result<()> {
        if self.format_version != 1
            || self.product != "local-media-gallery"
            || self.kind != "macos-application-payload"
            || self.version != env!("CARGO_PKG_VERSION")
            || !["full", "lite"].contains(&self.edition.as_str())
            || self.os != "macos"
            || self.arch != "aarch64"
            || self.target_triple != "aarch64-apple-darwin"
            || self.build_profile != "release"
        {
            return Err("Invalid native package identity".into());
        }
        relative(&self.bundle)?;
        relative(&self.binary)?;
        if self.bundle.contains('/')
            || !self.bundle.ends_with(".app")
            || self.binary != "Contents/MacOS/local-media-gallery"
            || self.files.is_empty()
        {
            return Err("Invalid bundle structure".into());
        }
        let mut paths = std::collections::HashSet::new();
        for f in &self.files {
            relative(&f.path)?;
            if !paths.insert(&f.path)
                || f.sha256.len() != 64
                || !f
                    .sha256
                    .bytes()
                    .all(|v| v.is_ascii_digit() || (b'a'..=b'f').contains(&v))
                || f.bytes.parse::<u64>().is_err()
                || !["644", "755"].contains(&f.mode.as_str())
            {
                return Err("Invalid payload entry".into());
            }
        }
        if !self
            .files
            .iter()
            .any(|f| f.path == self.binary && f.mode == "755")
            || !self.files.iter().any(|f| f.path == "Contents/Info.plist")
            || !self
                .files
                .iter()
                .any(|f| f.path == "Contents/_CodeSignature/CodeResources")
        {
            return Err("Missing signed bundle assets".into());
        }
        Ok(())
    }
}
pub fn relative(value: &str) -> Result<()> {
    if value.is_empty()
        || value.contains(['\\', ':'])
        || value.chars().any(char::is_control)
        || value
            .split('/')
            .any(|s| s.is_empty() || s == "." || s == "..")
        || !Path::new(value)
            .components()
            .all(|c| matches!(c, Component::Normal(_)))
    {
        return Err("Unsafe payload path".into());
    }
    Ok(())
}
pub fn no_links(base: &Path, relative: &Path) -> Result<PathBuf> {
    let mut p = base.to_path_buf();
    if fs::symlink_metadata(&p)?.file_type().is_symlink() {
        return Err("Redirected bundle".into());
    }
    for c in relative.components() {
        if !matches!(c, Component::Normal(_)) {
            return Err("Unsafe path".into());
        }
        p.push(c);
        if fs::symlink_metadata(&p)?.file_type().is_symlink() {
            return Err("Redirected payload".into());
        }
    }
    Ok(p)
}
pub fn matches_file(base: &Path, entry: &File) -> Result<bool> {
    let p = no_links(base, Path::new(&entry.path))?;
    let meta = fs::symlink_metadata(&p)?;
    if !meta.is_file() {
        return Ok(false);
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if format!("{:03o}", meta.permissions().mode() & 0o777) != entry.mode {
            return Ok(false);
        }
    }
    Ok(meta.len().to_string() == entry.bytes && hash(&fs::read(p)?) == entry.sha256)
}
pub fn verify(base: &Path, payload: &Payload, exact: bool) -> Result<()> {
    payload.validate()?;
    for f in &payload.files {
        if !matches_file(base, f)? {
            return Err(format!("Changed package file: {}", f.path).into());
        }
    }
    if exact {
        let mut paths = Vec::new();
        walk(base, base, &mut paths)?;
        paths.sort();
        let mut expected: Vec<_> = payload.files.iter().map(|f| f.path.clone()).collect();
        expected.sort();
        if paths != expected {
            return Err("Unexpected bundle content".into());
        }
    }
    Ok(())
}
fn walk(base: &Path, dir: &Path, files: &mut Vec<String>) -> Result<()> {
    for e in fs::read_dir(dir)? {
        let e = e?;
        let m = fs::symlink_metadata(e.path())?;
        if m.file_type().is_symlink() {
            return Err("Payload link".into());
        }
        if m.is_dir() {
            walk(base, &e.path(), files)?
        } else if m.is_file() {
            files.push(
                e.path()
                    .strip_prefix(base)?
                    .to_str()
                    .ok_or("Invalid UTF8 payload path")?
                    .replace('\\', "/"),
            )
        } else {
            return Err("Special payload entry".into());
        }
    }
    Ok(())
}

/// Resolve existing OS aliases, then retain absent normal suffix components.
/// No mutation occurs here. An existing final symlink is always a collision.
pub fn destination(value: &Path) -> Result<PathBuf> {
    if !value.is_absolute()
        || value
            .components()
            .any(|c| matches!(c, Component::ParentDir | Component::CurDir))
        || value
            .as_os_str()
            .to_string_lossy()
            .chars()
            .any(char::is_control)
    {
        return Err("Supply a normal absolute destination".into());
    }
    if fs::symlink_metadata(value).is_ok_and(|m| m.file_type().is_symlink()) {
        return Err("Destination is a symlink".into());
    }
    let mut existing = value;
    let mut suffix = Vec::new();
    while !existing.exists() {
        suffix.push(
            existing
                .file_name()
                .ok_or("Invalid destination")?
                .to_owned(),
        );
        existing = existing.parent().ok_or("Invalid ancestor")?
    }
    let mut resolved = fs::canonicalize(existing)?;
    for c in suffix.into_iter().rev() {
        resolved.push(c)
    }
    Ok(resolved)
}

#[cfg(unix)]
mod lifecycle {
    use super::*;
    use std::os::unix::fs::{PermissionsExt, symlink};
    #[derive(Debug, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct Receipt {
        scope: String,
        directory: PathBuf,
        command: PathBuf,
        payload: Payload,
    }
    pub fn receipt_path(app: &Path) -> Result<PathBuf> {
        Ok(app.parent().ok_or("Missing parent")?.join(format!(
            ".{}.lmg-install.json",
            app.file_name()
                .ok_or("Missing app name")?
                .to_str()
                .ok_or("Invalid app name")?
        )))
    }
    fn receipt(app: &Path, command: &Path, scope: &str, payload: &Payload) -> Result<Receipt> {
        let file = receipt_path(app)?;
        if fs::symlink_metadata(&file)?.file_type().is_symlink() {
            return Err("Redirected receipt".into());
        }
        let r: Receipt = serde_json::from_slice(&fs::read(file)?)?;
        if r.scope != scope || r.directory != app || r.command != command || r.payload != *payload {
            return Err("Installation identity differs; use matching candidate".into());
        }
        Ok(r)
    }
    fn link(command: &Path, app: &Path, payload: &Payload) -> Result<()> {
        if !fs::symlink_metadata(command)?.file_type().is_symlink()
            || fs::read_link(command)? != app.join(&payload.binary)
        {
            return Err("Command ownership differs".into());
        }
        Ok(())
    }
    pub fn install(
        source: &Path,
        app: &Path,
        command: &Path,
        scope: &str,
        payload: &Payload,
        path: &std::ffi::OsStr,
    ) -> Result<serde_json::Value> {
        verify(source, payload, true)?;
        if !["user", "system"].contains(&scope)
            || app.extension().is_none_or(|v| v != "app")
            || command
                .file_name()
                .is_none_or(|v| v != "local-media-gallery")
            || source == app
        {
            return Err("Invalid installation request".into());
        }
        for dir in std::env::split_paths(path) {
            let candidate = dir.join("local-media-gallery");
            if fs::symlink_metadata(&candidate).is_ok() && candidate != command {
                return Err("Existing visible command collision".into());
            }
        }
        if app.exists() {
            receipt(app, command, scope, payload)?;
            verify(app, payload, true)?;
            link(command, app, payload)?;
            return Ok(
                serde_json::json!({"result":"already-installed","directory":app,"command":command,"scope":scope}),
            );
        }
        if fs::symlink_metadata(receipt_path(app)?).is_ok() || fs::symlink_metadata(command).is_ok()
        {
            return Err("Unowned receipt or command collision".into());
        }
        let parent = app.parent().ok_or("Missing app parent")?;
        let bin = command.parent().ok_or("Missing command parent")?;
        fs::create_dir_all(parent)?;
        fs::create_dir_all(bin)?;
        let stage = tempfile::Builder::new()
            .prefix(".lmg-stage-")
            .tempdir_in(parent)?;
        let staged = stage.path().join("application.app");
        fs::create_dir(&staged)?;
        for f in &payload.files {
            let to = staged.join(&f.path);
            fs::create_dir_all(to.parent().unwrap())?;
            fs::copy(no_links(source, Path::new(&f.path))?, &to)?;
            fs::set_permissions(
                to,
                fs::Permissions::from_mode(u32::from_str_radix(&f.mode, 8)?),
            )?
        }
        verify(&staged, payload, true)?;
        // create_dir is exclusive. It refuses a destination created after preflight.
        fs::create_dir(app)?;
        let outcome = (|| -> Result<()> {
            for e in fs::read_dir(&staged)? {
                let e = e?;
                fs::rename(e.path(), app.join(e.file_name()))?
            }
            verify(app, payload, true)?;
            symlink(app.join(&payload.binary), command)?;
            let r = Receipt {
                scope: scope.into(),
                directory: app.into(),
                command: command.into(),
                payload: payload.clone(),
            };
            let mut file = tempfile::NamedTempFile::new_in(parent)?;
            use std::io::Write;
            file.write_all(&serde_json::to_vec_pretty(&r)?)?;
            file.as_file().sync_all()?;
            file.persist_noclobber(receipt_path(app)?)?;
            Ok(())
        })();
        if let Err(error) = outcome {
            if link(command, app, payload).is_ok() {
                fs::remove_file(command)?
            }
            let _ = remove_files(app, payload);
            return Err(error);
        }
        Ok(
            serde_json::json!({"result":"installed","scope":scope,"directory":app,"command":command,"payloadSha256":hash(&serde_json::to_vec(payload)?)}),
        )
    }
    fn remove_files(app: &Path, payload: &Payload) -> Result<Vec<String>> {
        let mut retained = Vec::new();
        let mut dirs = std::collections::BTreeSet::new();
        for f in &payload.files {
            let p = app.join(&f.path);
            if !p.exists() && fs::symlink_metadata(&p).is_err() {
                continue;
            }
            if matches_file(app, f).unwrap_or(false) {
                fs::remove_file(&p)?
            } else {
                retained.push(f.path.clone())
            }
            let mut parent = p.parent();
            while let Some(d) = parent {
                if !d.starts_with(app) {
                    break;
                }
                dirs.insert(d.to_path_buf());
                if d == app {
                    break;
                }
                parent = d.parent()
            }
        }
        let mut dirs: Vec<_> = dirs.into_iter().collect();
        dirs.sort_by_key(|d| std::cmp::Reverse(d.components().count()));
        for d in dirs {
            let _ = fs::remove_dir(d);
        }
        if app.exists() {
            let mut extras = Vec::new();
            walk(app, app, &mut extras).unwrap_or(());
            retained.extend(extras);
            retained.sort();
            retained.dedup()
        }
        Ok(retained)
    }
    pub fn remove(
        app: &Path,
        command: &Path,
        scope: &str,
        payload: &Payload,
    ) -> Result<serde_json::Value> {
        payload.validate()?;
        receipt(app, command, scope, payload)?;
        link(command, app, payload)?;
        if fs::symlink_metadata(app)?.file_type().is_symlink() {
            return Err("Redirected application".into());
        }
        fs::remove_file(command)?;
        let retained = remove_files(app, payload)?;
        fs::remove_file(receipt_path(app)?)?;
        Ok(
            serde_json::json!({"result":"removed","scope":scope,"directory":app,"command":command,"retained":retained}),
        )
    }
}
#[cfg(unix)]
pub use lifecycle::{install, receipt_path, remove};

#[cfg(test)]
mod tests {
    use super::*;
    fn payload() -> Payload {
        serde_json::from_value(serde_json::json!({"formatVersion":1,"product":"local-media-gallery","kind":"macos-application-payload","version":"0.0.0","edition":"full","os":"macos","arch":"aarch64","targetTriple":"aarch64-apple-darwin","buildProfile":"release","generation":"test","source":{},"revision":"test","bundle":"Full.app","binary":"Contents/MacOS/local-media-gallery","files":[{"path":"Contents/MacOS/local-media-gallery","bytes":"3","sha256":hash(b"app"),"mode":"755"},{"path":"Contents/Info.plist","bytes":"3","sha256":hash(b"app"),"mode":"644"},{"path":"Contents/_CodeSignature/CodeResources","bytes":"3","sha256":hash(b"app"),"mode":"644"}]})).unwrap()
    }
    #[test]
    fn rejects_traversal_duplicate_missing_signature_and_wrong_identity() {
        let good = payload();
        good.validate().unwrap();
        for bad in ["../outside", "/absolute", "a//b", "a\\b", "a/./b", "a:b"] {
            assert!(relative(bad).is_err())
        }
        let mut p = good.clone();
        p.files.push(p.files[0].clone());
        assert!(p.validate().is_err());
        p = good.clone();
        p.files.pop();
        assert!(p.validate().is_err());
        p = good;
        p.arch = "x86_64".into();
        assert!(p.validate().is_err())
    }
    #[cfg(unix)]
    #[test]
    fn actual_install_repeat_collisions_and_selective_removal() {
        use std::os::unix::fs::PermissionsExt;
        let temp = tempfile::tempdir().unwrap();
        let source = temp.path().join("source.app");
        fs::create_dir(&source).unwrap();
        let p = payload();
        for f in &p.files {
            let v = source.join(&f.path);
            fs::create_dir_all(v.parent().unwrap()).unwrap();
            fs::write(&v, b"app").unwrap();
            fs::set_permissions(
                v,
                fs::Permissions::from_mode(u32::from_str_radix(&f.mode, 8).unwrap()),
            )
            .unwrap()
        }
        let app = temp.path().join("Application 雪.app");
        let command = temp.path().join("bin/local-media-gallery");
        install(
            &source,
            &app,
            &command,
            "user",
            &p,
            std::ffi::OsStr::new(""),
        )
        .unwrap();
        install(
            &source,
            &app,
            &command,
            "user",
            &p,
            std::ffi::OsStr::new(""),
        )
        .unwrap();
        fs::write(app.join("foreign-media.png"), b"retain").unwrap();
        assert!(
            install(
                &source,
                &app,
                &command,
                "user",
                &p,
                std::ffi::OsStr::new("")
            )
            .is_err()
        );
        fs::write(app.join("Contents/Info.plist"), b"changed").unwrap();
        let r = remove(&app, &command, "user", &p).unwrap();
        assert_eq!(fs::read(app.join("foreign-media.png")).unwrap(), b"retain");
        assert_eq!(
            fs::read(app.join("Contents/Info.plist")).unwrap(),
            b"changed"
        );
        assert!(!command.exists());
        assert!(r["retained"].as_array().unwrap().len() >= 2);
        assert!(
            install(
                &source,
                &app,
                &command,
                "user",
                &p,
                std::ffi::OsStr::new("")
            )
            .is_err()
        );
    }
    #[cfg(unix)]
    #[test]
    fn rejects_symlink_payload_and_command() {
        use std::os::unix::fs::symlink;
        let temp = tempfile::tempdir().unwrap();
        let outside = temp.path().join("outside");
        fs::write(&outside, b"retain").unwrap();
        let bundle = temp.path().join("app");
        fs::create_dir(&bundle).unwrap();
        symlink(&outside, bundle.join("file")).unwrap();
        assert!(no_links(&bundle, Path::new("file")).is_err());
        assert_eq!(fs::read(outside).unwrap(), b"retain");
        assert!(destination(&bundle.join("file")).is_err());
    }
}
