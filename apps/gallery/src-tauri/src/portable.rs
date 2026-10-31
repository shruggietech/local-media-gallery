// SPDX-License-Identifier: Apache-2.0
use cap_fs_ext::{FollowSymlinks, MetadataExt, OpenOptionsFollowExt};
use cap_std::fs::{Dir, OpenOptions};
use gallery_core::GalleryError;
use serde_json::{Map, Value, json};
use std::io::{Read, Write};

const LIMIT: u64 = 1024 * 1024;
const FILE: &str = "settings.json";
const LOCK: &str = ".local-media-gallery-settings.lock";

pub struct Portable {
    pub choices: Map<String, Value>,
    bytes: Option<Vec<u8>>,
    document: Value,
    pub warning: Option<String>,
    pub diagnostic: Option<gallery_core::diagnostics::Event>,
}
fn error(message: impl ToString) -> GalleryError {
    GalleryError::new(
        "portable_unavailable",
        format!("Portable settings were preserved: {}", message.to_string()),
    )
}
fn regular(metadata: &cap_std::fs::Metadata) -> Result<(), GalleryError> {
    if !metadata.is_file() || metadata.nlink() != 1 {
        return Err(error(
            "The destination must be a regular, singly linked file.",
        ));
    }
    #[cfg(windows)]
    {
        use cap_std::fs::MetadataExt as _;
        if metadata.file_attributes() & 0x400 != 0 {
            return Err(error("Reparse destinations are unsupported."));
        }
    }
    Ok(())
}
fn read(dir: &Dir) -> Result<Option<Vec<u8>>, GalleryError> {
    let metadata = match dir.symlink_metadata(FILE) {
        Ok(metadata) => metadata,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(error(e)),
    };
    regular(&metadata)?;
    let mut options = OpenOptions::new();
    options.read(true).follow(FollowSymlinks::No);
    let file = dir.open_with(FILE, &options).map_err(error)?;
    regular(&file.metadata().map_err(error)?)?;
    let mut bytes = Vec::new();
    file.take(LIMIT + 1)
        .read_to_end(&mut bytes)
        .map_err(error)?;
    if bytes.len() as u64 > LIMIT {
        return Err(error("The one MiB limit was exceeded."));
    }
    Ok(Some(bytes))
}
impl Portable {
    pub fn load(dir: &Dir, test: bool) -> Self {
        let empty = json!({"product":"local-media-gallery","kind":"gallery-settings","version":env!("CARGO_PKG_VERSION"),"formatVersion":1,"choices":{}});
        let loaded = (|| {
            let bytes = read(dir)?;
            let document = match &bytes {
                Some(bytes) => serde_json::from_slice(bytes).map_err(|_| {
                    GalleryError::new(
                        "portable_invalid",
                        "Portable settings contain invalid JSON; original bytes were preserved.",
                    )
                })?,
                None => empty.clone(),
            };
            if document.get("product") != Some(&json!("local-media-gallery"))
                || document.get("kind") != Some(&json!("gallery-settings"))
                || document.get("version") != Some(&json!(env!("CARGO_PKG_VERSION")))
                || document.get("formatVersion") != Some(&json!(1))
            {
                return Err(GalleryError::new(
                    "portable_version",
                    "This product, release or format is unsupported. Original bytes were preserved.",
                ));
            }
            let choices = crate::settings::validate_choices(
                document.get("choices").unwrap_or(&Value::Null),
                test,
            )?;
            Ok((bytes, document, choices))
        })();
        match loaded {
            Ok((bytes, document, choices)) => Self {
                bytes,
                document,
                choices,
                warning: None,
                diagnostic: None,
            },
            Err(e) => Self {
                bytes: None,
                document: empty,
                choices: Map::new(),
                diagnostic: Some(gallery_core::diagnostics::Event::from_code(&e.code)),
                warning: Some(e.message),
            },
        }
    }
    pub fn save(
        &mut self,
        dir: &Dir,
        patch: &Map<String, Value>,
        remove: Option<&str>,
    ) -> Result<(), GalleryError> {
        if let Some(warning) = &self.warning {
            return Err(error(warning));
        }
        if let Ok(metadata) = dir.symlink_metadata(LOCK) {
            regular(&metadata)?;
        }
        let mut options = OpenOptions::new();
        options
            .create(true)
            .read(true)
            .write(true)
            .follow(FollowSymlinks::No);
        let lock = dir.open_with(LOCK, &options).map_err(error)?;
        let identity = lock.metadata().map_err(error)?;
        regular(&identity)?;
        let lock = lock.into_std();
        let _lock = crate::state_lock::StateLock::try_acquire(lock).map_err(error)?;
        let current_lock = dir.symlink_metadata(LOCK).map_err(error)?;
        if identity.dev() != current_lock.dev() || identity.ino() != current_lock.ino() {
            return Err(error("The coordination file changed."));
        }
        if read(dir)? != self.bytes {
            return Err(GalleryError::new(
                "portable_conflict",
                "Portable settings changed in another instance or editor. Reopen this gallery to reload them. Your choice remains temporary.",
            ));
        }
        let mut choices = self.choices.clone();
        choices.extend(patch.clone());
        if let Some(field) = remove {
            choices.remove(field);
        }
        let mut document = self.document.clone();
        document["choices"] = Value::Object(choices.clone());
        let mut bytes = serde_json::to_vec_pretty(&document).map_err(error)?;
        bytes.push(b'\n');
        if bytes.len() as u64 > LIMIT {
            return Err(error("The one MiB limit was exceeded."));
        }
        let temporary = format!(".local-media-gallery-{}.tmp", uuid::Uuid::new_v4().simple());
        let written = (|| {
            let mut options = OpenOptions::new();
            options
                .create_new(true)
                .write(true)
                .follow(FollowSymlinks::No);
            let mut file = dir.open_with(&temporary, &options).map_err(error)?;
            file.write_all(&bytes).map_err(error)?;
            file.sync_all().map_err(error)?;
            drop(file);
            // Compare again after preparing the replacement. Editors that ignore
            // the lock can still race the final compare and rename.
            if read(dir)? != self.bytes {
                return Err(error("The destination changed while preparing this save."));
            }
            dir.rename(&temporary, dir, FILE).map_err(error)
        })();
        if written.is_err() {
            let _ = dir.remove_file(&temporary);
        }
        written?;
        self.bytes = Some(bytes);
        self.document = document;
        self.choices = choices;
        Ok(())
    }
}

/// The operand is the selected gallery directory, not an initialized settings file.
pub fn compatibility(path: &std::path::Path) -> Result<(), GalleryError> {
    if !path.try_exists().map_err(error)? {
        return Ok(());
    }
    let dir = Dir::open_ambient_dir(path, cap_std::ambient_authority()).map_err(error)?;
    let state = Portable::load(&dir, false);
    if let Some(warning) = state.warning {
        return Err(error(warning));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> (tempfile::TempDir, Dir) {
        let temp = tempfile::tempdir().unwrap();
        let dir = Dir::open_ambient_dir(temp.path(), cap_std::ambient_authority()).unwrap();
        (temp, dir)
    }
    #[test]
    fn sparse_unknown_conflict_and_removal() {
        let (temp, dir) = fixture();
        let mut first = Portable::load(&dir, false);
        assert_eq!(std::fs::read_dir(temp.path()).unwrap().count(), 0);
        first
            .save(&dir, json!({"fontScale":90}).as_object().unwrap(), None)
            .unwrap();
        let mut second = Portable::load(&dir, false);
        first
            .save(&dir, json!({"filter":"video"}).as_object().unwrap(), None)
            .unwrap();
        assert!(second.save(&dir, &Map::new(), Some("fontScale")).is_err());
        let mut value: Value =
            serde_json::from_slice(&std::fs::read(temp.path().join(FILE)).unwrap()).unwrap();
        value["future"] = json!({"keep":true});
        value["choices"]["unknown"] = json!([false, 0, null]);
        std::fs::write(temp.path().join(FILE), serde_json::to_vec(&value).unwrap()).unwrap();
        let mut store = Portable::load(&dir, false);
        store.save(&dir, &Map::new(), Some("fontScale")).unwrap();
        let value: Value =
            serde_json::from_slice(&std::fs::read(temp.path().join(FILE)).unwrap()).unwrap();
        assert_eq!(value["future"]["keep"], true);
        assert_eq!(value["choices"]["unknown"], json!([false, 0, null]));
        assert!(value["choices"].get("fontScale").is_none());
        assert_eq!(value["choices"].as_object().unwrap().len(), 2);
    }
    #[test]
    fn foreign_corrupt_future_oversized_and_hardlinks_preserve_bytes() {
        let (temp, dir) = fixture();
        for bytes in [b"invalid".to_vec(), b"{}".to_vec(), vec![b' '; LIMIT as usize + 1], serde_json::to_vec(&json!({"product":"local-media-gallery","kind":"gallery-settings","version":"0.0.0","formatVersion":2,"choices":{}})).unwrap()] {
            std::fs::write(temp.path().join(FILE), &bytes).unwrap();
            let mut store = Portable::load(&dir, false);
            assert!(store.warning.is_some());
            assert!(store.save(&dir, json!({"fontScale":90}).as_object().unwrap(), None).is_err());
            assert_eq!(std::fs::read(temp.path().join(FILE)).unwrap(), bytes);
        }
        std::fs::remove_file(temp.path().join(FILE)).unwrap();
        std::fs::write(temp.path().join("outside"), b"original").unwrap();
        std::fs::hard_link(temp.path().join("outside"), temp.path().join(FILE)).unwrap();
        assert!(Portable::load(&dir, false).warning.is_some());
        assert_eq!(
            std::fs::read(temp.path().join("outside")).unwrap(),
            b"original"
        );
    }
    #[test]
    fn linked_lock_and_symlink_destinations_never_write_their_targets() {
        let (temp, dir) = fixture();
        let outside = temp.path().join("original");
        std::fs::write(&outside, b"do not edit").unwrap();
        std::fs::hard_link(&outside, temp.path().join(LOCK)).unwrap();
        assert!(
            Portable::load(&dir, false)
                .save(
                    &dir,
                    serde_json::json!({"fontScale":90}).as_object().unwrap(),
                    None
                )
                .is_err()
        );
        assert!(!temp.path().join(FILE).exists());
        assert_eq!(std::fs::read(&outside).unwrap(), b"do not edit");
        std::fs::remove_file(temp.path().join(LOCK)).unwrap();
        #[cfg(windows)]
        std::os::windows::fs::symlink_file(&outside, temp.path().join(FILE)).unwrap();
        #[cfg(unix)]
        std::os::unix::fs::symlink(&outside, temp.path().join(FILE)).unwrap();
        assert!(Portable::load(&dir, false).warning.is_some());
        assert_eq!(std::fs::read(&outside).unwrap(), b"do not edit");
    }
    #[cfg(windows)]
    #[test]
    fn readonly_target_and_locked_destination_preserve_the_prior_document() {
        use std::os::windows::fs::OpenOptionsExt;
        let (temp, dir) = fixture();
        let mut store = Portable::load(&dir, false);
        store
            .save(
                &dir,
                serde_json::json!({"fontScale":90}).as_object().unwrap(),
                None,
            )
            .unwrap();
        let path = temp.path().join(FILE);
        let original = std::fs::read(&path).unwrap();
        let original_permissions = std::fs::metadata(&path).unwrap().permissions();
        let mut permissions = original_permissions.clone();
        permissions.set_readonly(true);
        std::fs::set_permissions(&path, permissions.clone()).unwrap();
        assert!(
            store
                .save(
                    &dir,
                    serde_json::json!({"fontScale":80}).as_object().unwrap(),
                    None
                )
                .is_err()
        );
        assert_eq!(std::fs::read(&path).unwrap(), original);
        std::fs::set_permissions(&path, original_permissions).unwrap();
        let lock = std::fs::OpenOptions::new()
            .read(true)
            .share_mode(0)
            .open(&path)
            .unwrap();
        assert!(store.save(&dir, &Map::new(), Some("fontScale")).is_err());
        drop(lock);
        assert_eq!(std::fs::read(&path).unwrap(), original);
        assert!(
            !std::fs::read_dir(temp.path()).unwrap().any(|e| e
                .unwrap()
                .file_name()
                .to_string_lossy()
                .ends_with(".tmp"))
        );
    }
}
