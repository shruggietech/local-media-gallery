// SPDX-License-Identifier: Apache-2.0
use crate::{GalleryError, NativePath};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use cap_fs_ext::{DirExt, FollowSymlinks, MetadataExt, OpenOptionsFollowExt};
use cap_std::fs::{Dir, OpenOptions};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    ffi::OsStr,
    io::{Read, Write},
    path::{Component, Path},
    sync::Arc,
};
use tokio_util::sync::CancellationToken;
pub const POLICY: &str = "png-fit320-first-unmanaged-v1";
pub const PORTABLE: &str = ".local-media-gallery-thumbnails-v1";
pub const ENTRY_LIMIT: usize = 6 * 1024 * 1024;
pub const OUTPUT_LIMIT: usize = 4 * 1024 * 1024;
pub const SLOTS: usize = 16;
pub fn error(code: &str) -> GalleryError {
    GalleryError::new(
        code,
        match code {
            "cancelled" => "Preparation was cancelled; completed entries remain usable.",
            "cache_conflict" => {
                "The cache destination conflicts with the preview. Preserve its contents and preview again."
            }
            "source_changed" => "The original file changed. Refresh and preview again.",
            "cache_invalid" => "The cache record is invalid. The original remains available.",
            _ => "Optional preparation is unavailable. Check storage and obtain a new preview.",
        },
    )
}
pub fn sha(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
pub fn digest(
    file: &mut std::fs::File,
    cancel: &CancellationToken,
) -> Result<String, GalleryError> {
    digest_checked(file, cancel, || false)
}
pub fn digest_checked(
    file: &mut std::fs::File,
    cancel: &CancellationToken,
    retired: impl Fn() -> bool,
) -> Result<String, GalleryError> {
    use std::io::{Seek, SeekFrom};
    file.seek(SeekFrom::Start(0))
        .map_err(|_| error("source_changed"))?;
    let mut hasher = Sha256::new();
    let mut buf = [0; 65536];
    loop {
        if cancel.is_cancelled() || retired() {
            return Err(error("cancelled"));
        }
        let n = file.read(&mut buf).map_err(|_| error("source_changed"))?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    file.seek(SeekFrom::Start(0))
        .map_err(|_| error("source_changed"))?;
    Ok(format!("{:x}", hasher.finalize()))
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SourceName {
    pub encoding: String,
    pub bytes: Vec<u8>,
}
impl SourceName {
    pub fn new(name: &OsStr) -> Result<Self, GalleryError> {
        let p = Path::new(name);
        if p.components().count() != 1
            || !matches!(p.components().next(), Some(Component::Normal(_)))
        {
            return Err(error("cache_invalid"));
        }
        Ok(if let Some(s) = name.to_str() {
            Self {
                encoding: "utf8".into(),
                bytes: s.as_bytes().to_vec(),
            }
        } else {
            let n = NativePath::from_path(p);
            Self {
                encoding: n.encoding.as_str().into(),
                bytes: n.bytes,
            }
        })
    }
    pub fn key(&self) -> String {
        sha(&serde_json::to_vec(self).unwrap())
    }
    fn valid(&self) -> bool {
        if self.bytes.is_empty() || self.bytes.len() > 32768 {
            return false;
        }
        let p = if self.encoding == "utf8" {
            match std::str::from_utf8(&self.bytes) {
                Ok(s) => std::path::PathBuf::from(s),
                Err(_) => return false,
            }
        } else {
            let enc = match self.encoding.as_str() {
                "windows-utf16le" => crate::PathEncoding::WindowsUtf16Le,
                "unix-bytes" => crate::PathEncoding::UnixBytes,
                _ => return false,
            };
            match (NativePath {
                encoding: enc,
                bytes: self.bytes.clone(),
            })
            .to_path()
            {
                Ok(p) => p,
                Err(_) => return false,
            }
        };
        p.components().count() == 1 && matches!(p.components().next(), Some(Component::Normal(_)))
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CacheEntry {
    pub product: String,
    pub kind: String,
    pub format_version: u8,
    pub source_name: SourceName,
    pub source_sha256: String,
    pub source_bytes: String,
    pub policy: String,
    pub provider: String,
    pub output_png: String,
    pub output_sha256: String,
    pub width: u32,
    pub height: u32,
    pub complete: bool,
    pub generation: String,
}
fn hex(s: &str) -> bool {
    s.len() == 64
        && s.bytes()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase())
}
impl CacheEntry {
    pub fn new(
        name: SourceName,
        source_sha256: String,
        source_bytes: u64,
        provider: String,
        png: Vec<u8>,
        generation: String,
    ) -> Result<Self, GalleryError> {
        let (w, h) = validate_png(&png)?;
        Ok(Self {
            product: "local-media-gallery".into(),
            kind: "thumbnail".into(),
            format_version: 1,
            source_name: name,
            source_sha256,
            source_bytes: source_bytes.to_string(),
            policy: POLICY.into(),
            provider,
            output_sha256: sha(&png),
            output_png: STANDARD.encode(png),
            width: w,
            height: h,
            complete: true,
            generation,
        })
    }
    pub fn parse(bytes: &[u8]) -> Result<Self, GalleryError> {
        if bytes.len() > ENTRY_LIMIT {
            return Err(error("cache_invalid"));
        }
        let e: Self = serde_json::from_slice(bytes).map_err(|_| error("cache_invalid"))?;
        if e.product != "local-media-gallery"
            || e.kind != "thumbnail"
            || e.format_version != 1
            || !e.complete
            || e.policy != POLICY
            || !e.source_name.valid()
            || !hex(&e.source_sha256)
            || !hex(&e.output_sha256)
            || e.source_bytes.parse::<u64>().is_err()
            || !(e.provider == "image-0.25.10"
                || e.provider.strip_prefix("ffmpeg:").is_some_and(hex))
            || e.generation.len() != 32
            || !e
                .generation
                .bytes()
                .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
        {
            return Err(error("cache_invalid"));
        }
        let png = e.png()?;
        if sha(&png) != e.output_sha256 || validate_png(&png)? != (e.width, e.height) {
            return Err(error("cache_invalid"));
        }
        Ok(e)
    }
    pub fn png(&self) -> Result<Vec<u8>, GalleryError> {
        if self.output_png.len() > OUTPUT_LIMIT.div_ceil(3) * 4 {
            return Err(error("cache_invalid"));
        }
        let p = STANDARD
            .decode(&self.output_png)
            .map_err(|_| error("cache_invalid"))?;
        if p.len() > OUTPUT_LIMIT {
            return Err(error("cache_invalid"));
        }
        Ok(p)
    }
    pub fn content_key(&self) -> String {
        content_key(&self.source_sha256, &self.source_bytes)
    }
}
pub fn content_key(digest: &str, length: &str) -> String {
    sha(format!("{digest}:{length}:{POLICY}").as_bytes())
}
pub fn validate_png(bytes: &[u8]) -> Result<(u32, u32), GalleryError> {
    use image::ImageDecoder;
    if bytes.len() > OUTPUT_LIMIT || !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        return Err(error("cache_invalid"));
    }
    let mut r =
        image::ImageReader::with_format(std::io::Cursor::new(bytes), image::ImageFormat::Png);
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(320);
    limits.max_image_height = Some(320);
    limits.max_alloc = Some(8 * 1024 * 1024);
    r.limits(limits);
    let d = r.into_decoder().map_err(|_| error("cache_invalid"))?;
    let (w, h) = d.dimensions();
    if w == 0 || h == 0 || w > 320 || h > 320 {
        return Err(error("cache_invalid"));
    }
    image::DynamicImage::from_decoder(d).map_err(|_| error("cache_invalid"))?;
    Ok((w, h))
}
fn regular(m: &cap_std::fs::Metadata) -> bool {
    if !m.is_file() {
        return false;
    }
    #[cfg(windows)]
    {
        use cap_std::fs::MetadataExt as _;
        if m.file_attributes() & 0x400 != 0 {
            return false;
        }
    }
    true
}
pub fn read_bounded(dir: &Dir, name: &str, limit: usize) -> Result<Option<Vec<u8>>, GalleryError> {
    let mut opt = OpenOptions::new();
    opt.read(true).follow(FollowSymlinks::No);
    let f = match dir.open_with(name, &opt) {
        Ok(f) => f,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err(error("cache_invalid")),
    };
    let m = f.metadata().map_err(|_| error("cache_invalid"))?;
    if !regular(&m) || m.len() > limit as u64 {
        return Err(error("cache_invalid"));
    }
    let mut bytes = Vec::new();
    f.take(limit as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| error("cache_invalid"))?;
    if bytes.len() > limit {
        return Err(error("cache_invalid"));
    }
    Ok(Some(bytes))
}
const OWNER: &[u8] =
    b"{\"product\":\"local-media-gallery\",\"kind\":\"thumbnail-cache\",\"formatVersion\":1}\n";
#[derive(Clone)]
pub struct CacheDir {
    #[cfg(any(test, feature = "discovery-tests"))]
    write_failure: Arc<std::sync::Mutex<Option<(usize, std::io::ErrorKind)>>>,
    pub dir: Arc<Dir>,
    parent: Arc<Dir>,
    leaf: std::ffi::OsString,
    identity: String,
    parent_path: Option<std::path::PathBuf>,
}
impl CacheDir {
    pub fn open(
        parent: Arc<Dir>,
        leaf: &OsStr,
        create: bool,
    ) -> Result<Option<Self>, GalleryError> {
        let existed = match parent.symlink_metadata(leaf) {
            Ok(_) => true,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => false,
            Err(_) => return Err(error("cache_conflict")),
        };
        if !existed {
            if !create {
                return Ok(None);
            }
            parent
                .create_dir(leaf)
                .map_err(|_| error("cache_conflict"))?;
        }
        let dir = parent
            .open_dir_nofollow(leaf)
            .map_err(|_| error("cache_conflict"))?;
        if !existed {
            let mut o = OpenOptions::new();
            o.create_new(true).write(true).follow(FollowSymlinks::No);
            let mut f = dir
                .open_with("owner.json", &o)
                .map_err(|_| error("cache_conflict"))?;
            f.write_all(OWNER)
                .and_then(|_| f.sync_all())
                .map_err(|_| error("cache_conflict"))?;
        }
        if read_bounded(&dir, "owner.json", 1024)?.as_deref() != Some(OWNER) {
            return Err(error("cache_conflict"));
        }
        let identity = directory_identity(&dir)?;
        Ok(Some(Self {
            #[cfg(any(test, feature = "discovery-tests"))]
            write_failure: Arc::new(std::sync::Mutex::new(None)),
            dir: Arc::new(dir),
            parent,
            leaf: leaf.to_os_string(),
            identity,
            parent_path: None,
        }))
    }
    #[cfg(any(test, feature = "discovery-tests"))]
    pub fn test_write_failure(&self, after: usize, kind: std::io::ErrorKind) {
        *self.write_failure.lock().unwrap() = Some((after, kind));
    }
    pub fn with_parent_path(mut self, path: std::path::PathBuf) -> Self {
        self.parent_path = Some(path);
        self
    }
    pub fn check(&self) -> Result<(), GalleryError> {
        if let Some(path) = &self.parent_path {
            crate::root_identity(&self.parent, path)?;
        }
        let named = self
            .parent
            .open_dir_nofollow(&self.leaf)
            .map_err(|_| error("cache_conflict"))?;
        if directory_identity(&named)? != self.identity
            || read_bounded(&self.dir, "owner.json", 1024)?.as_deref() != Some(OWNER)
        {
            return Err(error("cache_conflict"));
        }
        Ok(())
    }
    pub fn has_records(&self) -> Result<bool, GalleryError> {
        self.check()?;
        for entry in self.dir.entries().map_err(io_error)?.take(3) {
            let name = entry.map_err(io_error)?.file_name();
            if name != "owner.json" && name != "writer.lock" {
                return Ok(true);
            }
        }
        Ok(false)
    }
    pub fn slot(name: &SourceName, content: &str, index: usize) -> String {
        format!("{}-{content}-{index}.json", name.key())
    }
    pub fn plan(
        &self,
        name: &SourceName,
        content: &str,
        provider: Option<&str>,
    ) -> Result<(String, Option<CacheEntry>, bool), GalleryError> {
        self.check()?;
        let mut empty = None;
        let mut invalid = false;
        for n in 0..SLOTS {
            let slot = Self::slot(name, content, n);
            match read_bounded(&self.dir, &slot, ENTRY_LIMIT) {
                Ok(None) => {
                    if empty.is_none() {
                        empty = Some(slot)
                    }
                }
                Ok(Some(bytes)) => match CacheEntry::parse(&bytes) {
                    Ok(entry) if entry.source_name == *name && entry.content_key() == content => {
                        if provider.is_none_or(|p| entry.provider == p) {
                            return Ok((slot, Some(entry), invalid));
                        }
                    }
                    _ => invalid = true,
                },
                Err(_) => {
                    invalid = true;
                }
            }
        }
        empty
            .map(|s| (s, None, invalid))
            .ok_or_else(|| error("cache_conflict"))
    }
    pub fn publish(
        &self,
        slot: &str,
        entry: &CacheEntry,
        cancel: &CancellationToken,
    ) -> Result<(), GalleryError> {
        self.check()?;
        if !(0..SLOTS).any(|n| Self::slot(&entry.source_name, &entry.content_key(), n) == slot) {
            return Err(error("cache_conflict"));
        }
        let bytes = serde_json::to_vec(entry).map_err(|_| error("cache_invalid"))?;
        CacheEntry::parse(&bytes)?;
        let _lock = self.writer_lock()?;
        if self.dir.symlink_metadata(slot).is_ok() {
            return Err(error("cache_conflict"));
        }
        let stage = format!("stage-{}.json", entry.generation);
        let mut o = OpenOptions::new();
        o.write(true).create_new(true).follow(FollowSymlinks::No);
        let mut owned_stage = None;
        let result = (|| {
            let mut f = self.dir.open_with(&stage, &o).map_err(io_error)?;
            let identity = f.metadata().map_err(|_| error("cache_unavailable"))?;
            owned_stage = Some((identity.dev(), identity.ino()));
            #[cfg(any(test, feature = "discovery-tests"))]
            if let Some((after, kind)) = *self.write_failure.lock().unwrap() {
                f.write_all(&bytes[..after.min(bytes.len())])
                    .map_err(io_error)?;
                return Err(io_error(std::io::Error::from(kind)));
            }
            f.write_all(&bytes)
                .and_then(|_| f.sync_all())
                .map_err(io_error)?;
            drop(f);
            let staged = read_bounded(&self.dir, &stage, ENTRY_LIMIT)?
                .ok_or_else(|| error("cache_invalid"))?;
            CacheEntry::parse(&staged)?;
            self.check()?;
            if cancel.is_cancelled() {
                return Err(error("cancelled"));
            }
            if self.dir.hard_link(&stage, &self.dir, slot).is_err() {
                let mut f = self
                    .dir
                    .open_with(slot, &o)
                    .map_err(|_| error("cache_conflict"))?;
                f.write_all(&staged)
                    .and_then(|_| f.sync_all())
                    .map_err(io_error)?;
            }
            Ok(())
        })();
        if let Some((dev, ino)) = owned_stage
            && let Ok(named) = self.dir.symlink_metadata(&stage)
            && named.dev() == dev
            && named.ino() == ino
        {
            let _ = self.dir.remove_file(&stage);
        }
        result
    }
    fn writer_lock(&self) -> Result<Unlock, GalleryError> {
        let mut options = OpenOptions::new();
        options
            .read(true)
            .write(true)
            .create(true)
            .follow(FollowSymlinks::No);
        let lock = self
            .dir
            .open_with("writer.lock", &options)
            .map_err(|_| error("cache_conflict"))?;
        let m = lock.metadata().map_err(|_| error("cache_conflict"))?;
        if !regular(&m) || m.nlink() != 1 {
            return Err(error("cache_conflict"));
        }
        let lock = lock.into_std();
        lock.try_lock().map_err(|_| error("cache_conflict"))?;
        let guard = Unlock(lock);
        let named = self
            .dir
            .symlink_metadata("writer.lock")
            .map_err(|_| error("cache_conflict"))?;
        if named.dev() != m.dev() || named.ino() != m.ino() {
            return Err(error("cache_conflict"));
        }
        Ok(guard)
    }
    pub fn cleanup(
        &self,
        cancel: &CancellationToken,
        mut progress: impl FnMut(CleanupProgress),
    ) -> Result<CleanupProgress, GalleryError> {
        self.check()?;
        let _lock = self.writer_lock()?;
        let mut stats = CleanupProgress::default();
        for entry in self.dir.entries().map_err(io_error)? {
            if cancel.is_cancelled() {
                return Err(error("cancelled"));
            }
            let entry = entry.map_err(io_error)?;
            stats.examined += 1;
            let name = entry.file_name();
            let Some(name) = name.to_str() else {
                stats.retained += 1;
                progress(stats);
                continue;
            };
            let owned = if name == "owner.json" || name == "writer.lock" {
                None
            } else {
                read_bounded(&self.dir, name, ENTRY_LIMIT)
                    .ok()
                    .flatten()
                    .and_then(|bytes| {
                        CacheEntry::parse(&bytes)
                            .ok()
                            .filter(|parsed| {
                                (0..SLOTS).any(|n| {
                                    Self::slot(&parsed.source_name, &parsed.content_key(), n)
                                        == name
                                }) || name == format!("stage-{}.json", parsed.generation)
                            })
                            .map(|_| bytes)
                    })
            };
            if let Some(bytes) = owned {
                self.check()?;
                if read_bounded(&self.dir, name, ENTRY_LIMIT)?.as_deref() == Some(bytes.as_slice())
                {
                    if let Err(e) = self.dir.remove_file(name) {
                        stats.failed += 1;
                        progress(stats);
                        return Err(io_error(e));
                    }
                    stats.removed += 1;
                } else {
                    stats.retained += 1;
                }
            } else {
                stats.retained += 1;
            }
            progress(stats);
        }
        Ok(stats)
    }
}
#[derive(Clone, Copy, Debug, Default)]
pub struct CleanupProgress {
    pub examined: u64,
    pub removed: u64,
    pub retained: u64,
    pub failed: u64,
}
struct Unlock(std::fs::File);
impl Drop for Unlock {
    fn drop(&mut self) {
        let _ = self.0.unlock();
    }
}

fn directory_identity(dir: &Dir) -> Result<String, GalleryError> {
    let m = dir.dir_metadata().map_err(|_| error("cache_conflict"))?;
    Ok(format!("{}:{}", m.dev(), m.ino()))
}

fn io_error(error: std::io::Error) -> GalleryError {
    crate::cache::error(match error.kind() {
        std::io::ErrorKind::PermissionDenied => "cache_permission",
        std::io::ErrorKind::StorageFull | std::io::ErrorKind::QuotaExceeded => "cache_storage_full",
        std::io::ErrorKind::AlreadyExists => "cache_conflict",
        _ => "cache_unavailable",
    })
}
