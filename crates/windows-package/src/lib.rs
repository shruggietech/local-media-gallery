// SPDX-License-Identifier: Apache-2.0
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::Read;
use std::{fs, path::Path};

#[cfg(windows)]
pub mod native;
pub const PAYLOAD: &str = include_str!(concat!(env!("OUT_DIR"), "/payload.json"));
pub const SETUP: &str = include_str!(concat!(env!("OUT_DIR"), "/setup.json"));
pub fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
pub fn runtime_for_scope<T>(
    machine: bool,
    user: impl FnOnce() -> Result<T, String>,
    system: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
    if machine {
        system()
    } else {
        user().or_else(|_| system())
    }
}
/// Keep the verified input open without Windows write/delete sharing through use.
pub fn open_verified_input(path: &Path, record: &FileRecord) -> Result<fs::File, String> {
    check_path(path)?;
    let expected: u64 = record.bytes.parse().map_err(|_| "Invalid input size")?;
    if expected > 1073741824 || record.bytes != expected.to_string() || !hex(&record.sha256, 64) {
        return Err("Invalid input identity".into());
    }
    let mut options = fs::OpenOptions::new();
    options.read(true);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options.share_mode(1).custom_flags(0x00200000);
    }
    let mut file = options
        .open(path)
        .map_err(|e| format!("Cannot lock {}: {e}", path.display()))?;
    let metadata = file.metadata().map_err(|e| e.to_string())?;
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return Err("Redirected input".into());
        }
    }
    if !metadata.is_file() || metadata.len() != expected {
        return Err(format!("Input size/type differs: {}", path.display()));
    }
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536];
    let mut total = 0u64;
    loop {
        let n = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        total += n as u64;
        if total > expected {
            return Err("Input grew during verification".into());
        }
        hasher.update(&buffer[..n]);
    }
    if total != expected || format!("{:x}", hasher.finalize()) != record.sha256 {
        return Err(format!("Input identity differs: {}", path.display()));
    }
    Ok(file)
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileRecord {
    pub path: String,
    pub bytes: String,
    pub sha256: String,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Payload {
    pub generation: String,
    pub product: String,
    pub kind: String,
    pub format_version: u32,
    pub version: String,
    pub edition: String,
    pub os: String,
    pub arch: String,
    pub target_triple: String,
    pub build_profile: String,
    pub revision: String,
    pub source: Source,
    pub binary: String,
    pub files: Vec<FileRecord>,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Source {
    pub sha256: String,
    pub files: u32,
}
fn hex(value: &str, length: usize) -> bool {
    value.len() == length
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}
pub fn portable(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 240
        && value.split('/').all(|p| {
            let stem = p.split('.').next().unwrap_or("").to_ascii_uppercase();
            !p.is_empty()
                && p != "."
                && p != ".."
                && !p.ends_with(['.', ' '])
                && !p.chars().any(|c| c < ' ' || "<>:\"\\|?*".contains(c))
                && !["CON", "PRN", "AUX", "NUL"].contains(&stem.as_str())
                && !(stem.len() == 4
                    && (stem.starts_with("COM") || stem.starts_with("LPT"))
                    && matches!(stem.as_bytes()[3], b'1'..=b'9'))
        })
}
impl Payload {
    pub fn validate(&self) -> Result<(), String> {
        if !hex(&self.generation, 32)
            || self.product != "local-media-gallery"
            || self.kind != "windows-application-payload"
            || self.format_version != 1
            || self.version != "0.0.0"
            || !["full", "lite"].contains(&self.edition.as_str())
            || self.os != "windows"
            || self.arch != "x86_64"
            || self.target_triple != "x86_64-pc-windows-msvc"
            || self.build_profile != "release"
            || !hex(&self.revision, 40)
            || !hex(&self.source.sha256, 64)
            || self.source.files == 0
            || self.files.is_empty()
            || self.files.len() > 4096
        {
            return Err("Invalid candidate identity".into());
        }
        let mut names = std::collections::HashSet::new();
        let mut total = 0u64;
        for f in &self.files {
            let n: u64 = f.bytes.parse().map_err(|_| "Invalid byte count")?;
            total = total.checked_add(n).ok_or("Payload overflow")?;
            if !portable(&f.path)
                || !names.insert(f.path.to_lowercase())
                || !hex(&f.sha256, 64)
                || n.to_string() != f.bytes
                || total > 1073741824
            {
                return Err("Invalid owned payload member".into());
            }
        }
        if !self.files.iter().any(|f| f.path == self.binary) {
            return Err("Missing binary".into());
        }
        Ok(())
    }
    pub fn verify(&self, root: &Path, allow_missing: bool) -> Result<(), String> {
        self.validate()?;
        check_path(root)?;
        for f in &self.files {
            let file = root.join(&f.path);
            check_path(&file)?;
            match fs::symlink_metadata(&file) {
                Ok(_) => {}
                Err(e) if allow_missing && e.kind() == std::io::ErrorKind::NotFound => continue,
                Err(e) => return Err(format!("Cannot read {}: {e}", file.display())),
            };
            let _held = open_verified_input(&file, f).map_err(|e| {
                format!("Owned file differs; preserve and recover before retrying: {e}")
            })?;
        }
        Ok(())
    }
}
pub fn check_path(path: &Path) -> Result<(), String> {
    if !path.is_absolute() {
        return Err("Absolute installation path required".into());
    }
    for at in path.ancestors() {
        match fs::symlink_metadata(at) {
            Ok(m) => {
                #[cfg(windows)]
                {
                    use std::os::windows::fs::MetadataExt;
                    if m.file_attributes() & 0x400 != 0 {
                        return Err(format!("Redirected installation path: {}", at.display()));
                    }
                }
                if m.is_symlink() {
                    return Err("Redirected installation path".into());
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn machine_scope_cannot_be_satisfied_by_a_user_only_runtime() {
        let result = runtime_for_scope(
            true,
            || Ok("per-user-only"),
            || Err("machine runtime absent".into()),
        );
        assert_eq!(result, Err("machine runtime absent".into()));
        assert_eq!(
            runtime_for_scope(false, || Err("user absent".into()), || Ok("machine shared")),
            Ok("machine shared")
        );
        assert_eq!(
            runtime_for_scope(
                true,
                || panic!("must not probe user discovery for machine scope"),
                || Ok("machine shared")
            ),
            Ok("machine shared")
        );
    }
    #[cfg(windows)]
    #[test]
    fn verified_input_stays_locked_against_substitution_until_use_finishes() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("candidate.msi");
        fs::write(&file, b"verified").unwrap();
        let record = FileRecord {
            path: "candidate.msi".into(),
            bytes: "8".into(),
            sha256: hash(b"verified"),
        };
        let held = open_verified_input(&file, &record).unwrap();
        assert!(fs::write(&file, b"tampered").is_err());
        assert!(fs::remove_file(&file).is_err());
        drop(held);
        assert!(fs::write(&file, b"tampered").is_ok());
        assert!(open_verified_input(&file, &record).is_err());
    }
    #[test]
    fn rejects_windows_aliases_and_traversal() {
        for s in [
            "../x", "C:/x", "/x", "x\\y", "AUX.txt", "con", "a//b", "x.", "x ", "x:ads",
        ] {
            assert!(!portable(s), "{s}");
        }
        assert!(portable("licenses/dependencies/a.txt"));
    }
    #[test]
    fn actual_owned_bytes_not_unrelated_files() {
        let dir = tempfile::tempdir().unwrap();
        // macOS exposes its system temporary parent through /var. The package
        // authority takes a physical path; do not weaken redirect rejection.
        let physical = dir.path().canonicalize().unwrap();
        fs::write(dir.path().join("app.exe"), b"x").unwrap();
        let mut p = Payload {
            generation: "c".repeat(32),
            product: "local-media-gallery".into(),
            kind: "windows-application-payload".into(),
            format_version: 1,
            version: "0.0.0".into(),
            edition: "full".into(),
            os: "windows".into(),
            arch: "x86_64".into(),
            target_triple: "x86_64-pc-windows-msvc".into(),
            build_profile: "release".into(),
            revision: "a".repeat(40),
            source: Source {
                sha256: "b".repeat(64),
                files: 1,
            },
            binary: "app.exe".into(),
            files: vec![FileRecord {
                path: "app.exe".into(),
                bytes: "1".into(),
                sha256: hash(b"x"),
            }],
        };
        fs::write(dir.path().join("foreign.txt"), b"retain").unwrap();
        assert!(p.verify(&physical, false).is_ok());
        fs::write(dir.path().join("app.exe"), b"y").unwrap();
        assert!(p.verify(&physical, true).is_err());
        p.files.push(p.files[0].clone());
        assert!(p.validate().is_err());
    }
    #[cfg(unix)]
    #[test]
    fn physical_root_remains_distinct_from_a_redirected_alias() {
        let dir = tempfile::tempdir().unwrap();
        let physical = dir.path().canonicalize().unwrap();
        assert!(check_path(&physical).is_ok());
        let alias = physical.join("redirect");
        std::os::unix::fs::symlink(&physical, &alias).unwrap();
        assert!(check_path(&alias).is_err());
    }
}
