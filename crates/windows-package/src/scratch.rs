// SPDX-License-Identifier: Apache-2.0
//! Disposable staging is owned by a validated marker and an exclusive lease.
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeSet,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
};
const MARKER: &str = ".stage-owner.json";
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Owner {
    format: u32,
    purpose: String,
    path: PathBuf,
    files: BTreeSet<String>,
    trees: BTreeSet<String>,
}
pub struct Stage {
    path: PathBuf,
    machine: bool,
    armed: bool,
    _lease: fs::File,
}
fn key(path: &Path) -> String {
    format!(
        "stage-{}.lock",
        crate::hash(path.as_os_str().as_encoded_bytes())
    )
}
fn owned(path: &Path, purpose: &str, machine: bool) -> Result<Owner, String> {
    let _pins = crate::private::validate_directory(path, machine)?;
    let marker = path.join(MARKER);
    crate::private::validate_file(&marker, machine)?;
    let mut bytes = Vec::new();
    fs::File::open(&marker)
        .map_err(|e| e.to_string())?
        .take(1024 * 1024 + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > 1024 * 1024 {
        return Err("Oversized scratch ownership marker".into());
    }
    let owner: Owner = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    if owner.format != 1
        || owner.purpose != purpose
        || owner.path != path
        || owner
            .files
            .iter()
            .chain(owner.trees.iter())
            .any(|s| !crate::portable(s))
    {
        return Err("Foreign scratch ownership marker".into());
    }
    inspect(path, path, &owner, machine, false)?;
    Ok(owner)
}
/// A complete directory can become visible before its publisher removes the
/// staging marker. Only that exact owned manifest is permitted as metadata;
/// payload completeness and hashes are still checked by the retention reader.
pub(crate) fn validate_published_marker(
    directory: &Path,
    expected: &BTreeSet<String>,
    machine: bool,
) -> Result<(), String> {
    let marker = directory.join(MARKER);
    let file = match crate::private::read_file(&marker, machine) {
        Ok(file) => file,
        Err(error) => {
            if fs::symlink_metadata(&marker)
                .is_err_and(|e| e.kind() == std::io::ErrorKind::NotFound)
            {
                return Ok(());
            }
            return Err(error);
        }
    };
    let mut bytes = Vec::new();
    file.take(1024 * 1024 + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > 1024 * 1024 {
        return Err("Oversized published staging marker".into());
    }
    let owner: Owner = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    let stage_name = owner
        .path
        .file_name()
        .and_then(|s| s.to_str())
        .and_then(|s| s.strip_prefix(".lmg-retaining-"));
    if owner.format != 1
        || owner.purpose != "embedded"
        || owner.path.parent() != directory.parent()
        || !stage_name.is_some_and(|s| s.len() == 32 && s.bytes().all(|c| c.is_ascii_hexdigit()))
        || !owner.trees.is_empty()
        || owner.files.len() != expected.len()
        || owner.files.iter().any(|s| !crate::portable(s))
        || owner
            .files
            .iter()
            .map(|s| s.to_lowercase())
            .collect::<BTreeSet<_>>()
            != *expected
    {
        return Err("Foreign published staging marker".into());
    }
    Ok(())
}
fn inspect(
    root: &Path,
    at: &Path,
    owner: &Owner,
    machine: bool,
    remove: bool,
) -> Result<(), String> {
    let pins = crate::private::validate_directory(at, machine)?;
    let mut marker = None;
    for entry in fs::read_dir(at).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let relative = path
            .strip_prefix(root)
            .map_err(|e| e.to_string())?
            .to_str()
            .ok_or("Non-Unicode scratch entry")?
            .replace('\\', "/");
        if relative == MARKER {
            marker = Some(path);
            continue;
        }
        let tree = owner
            .trees
            .iter()
            .any(|t| relative == *t || relative.starts_with(&(t.clone() + "/")));
        let kind = entry.file_type().map_err(|e| e.to_string())?;
        if kind.is_dir() {
            if !tree
                && !owner
                    .files
                    .iter()
                    .any(|f| f.starts_with(&(relative.clone() + "/")))
                && !owner
                    .trees
                    .iter()
                    .any(|t| t.starts_with(&(relative.clone() + "/")))
            {
                return Err("Foreign scratch directory retained".into());
            }
            inspect(root, &path, owner, machine, remove)?;
        } else if kind.is_file() && (tree || owner.files.contains(&relative)) {
            crate::private::validate_file(&path, machine)?;
            if remove {
                fs::remove_file(&path).map_err(|e| e.to_string())?;
            }
        } else {
            return Err("Foreign scratch content retained".into());
        }
    }
    if remove {
        if let Some(marker) = marker {
            crate::private::validate_file(&marker, machine)?;
            fs::remove_file(marker).map_err(|e| e.to_string())?;
        }
        drop(pins);
        fs::remove_dir(at).map_err(|e| e.to_string())?;
    }
    Ok(())
}
impl Stage {
    pub fn create(
        storage: &Path,
        path: &Path,
        purpose: &str,
        files: BTreeSet<String>,
        trees: BTreeSet<String>,
        machine: bool,
    ) -> Result<Self, String> {
        let lease = crate::private::coordination_lease_at(storage, &key(path), machine)?;
        drop(crate::private::create_directory(path, machine)?);
        let owner = Owner {
            format: 1,
            purpose: purpose.into(),
            path: path.into(),
            files,
            trees,
        };
        let mut marker = crate::private::create_file(&path.join(MARKER))?;
        marker
            .write_all(&serde_json::to_vec(&owner).map_err(|e| e.to_string())?)
            .and_then(|_| marker.sync_all())
            .map_err(|e| e.to_string())?;
        Ok(Self {
            path: path.into(),
            machine,
            armed: true,
            _lease: lease,
        })
    }
    pub fn validate(&self, purpose: &str) -> Result<(), String> {
        owned(&self.path, purpose, self.machine).map(|_| ())
    }
    pub fn published(&mut self, destination: &Path) -> Result<(), String> {
        self.armed = false;
        let marker = destination.join(MARKER);
        crate::private::validate_file(&marker, self.machine)?;
        fs::remove_file(marker).map_err(|e| e.to_string())
    }
    pub fn reclaim(
        storage: &Path,
        parent: &Path,
        prefix: &str,
        purpose: &str,
        machine: bool,
        ready: impl Fn(&Path) -> bool,
    ) -> Result<(), String> {
        for entry in fs::read_dir(parent).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if !entry.file_name().to_string_lossy().starts_with(prefix) || !ready(&path) {
                continue;
            }
            let Ok(_lease) = crate::private::coordination_lease_at(storage, &key(&path), machine)
            else {
                continue;
            };
            if let Ok(owner) = owned(&path, purpose, machine) {
                inspect(&path, &path, &owner, machine, true)?;
            }
        }
        Ok(())
    }
}
impl Drop for Stage {
    fn drop(&mut self) {
        if !self.armed {
            return;
        }
        let receipt = self.path.join("native-process.json");
        if receipt.exists()
            && fs::read(&receipt)
                .ok()
                .and_then(|b| serde_json::from_slice::<serde_json::Value>(&b).ok())
                .is_none_or(|v| v["terminal"] != true)
        {
            return;
        }
        if let Ok(owner) = owned(&self.path, "transaction", self.machine)
            .or_else(|_| owned(&self.path, "embedded", self.machine))
        {
            let _ = inspect(&self.path, &self.path, &owner, self.machine, true);
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn active_stage_is_retained_and_foreign_content_is_not_removed() {
        let temp = tempfile::tempdir().unwrap();
        let storage = temp.path().join("storage");
        crate::private::ensure_storage_at(&storage, false).unwrap();
        let path = storage.join(".lmg-retaining-test");
        let stage = Stage::create(
            &storage,
            &path,
            "embedded",
            BTreeSet::from(["payload".into()]),
            BTreeSet::new(),
            false,
        )
        .unwrap();
        {
            let mut file = crate::private::create_file(&path.join("payload")).unwrap();
            file.write_all(b"owned").unwrap();
        }
        Stage::reclaim(
            &storage,
            &storage,
            ".lmg-retaining-",
            "embedded",
            false,
            |_| true,
        )
        .unwrap();
        assert!(path.exists());
        drop(stage);
        assert!(!path.exists());
        let stage = Stage::create(
            &storage,
            &path,
            "embedded",
            BTreeSet::new(),
            BTreeSet::new(),
            false,
        )
        .unwrap();
        {
            let mut file = crate::private::create_file(&path.join("foreign")).unwrap();
            file.write_all(b"keep").unwrap();
        }
        drop(stage);
        assert_eq!(fs::read(path.join("foreign")).unwrap(), b"keep");
    }
}
