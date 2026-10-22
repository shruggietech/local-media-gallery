// SPDX-License-Identifier: Apache-2.0
//! Readonly gallery sessions. Display labels never authorize filesystem access.
mod transport;
pub use transport::{byte_range, media_router, serve_media, serve_media_listener};

use cap_fs_ext::{FollowSymlinks, OpenOptionsFollowExt};
use cap_std::{
    ambient_authority,
    fs::{Dir, OpenOptions},
};
use serde::Serialize;
use std::{
    collections::HashMap,
    ffi::OsString,
    fmt,
    fs::File,
    path::Path,
    sync::{
        Arc, Mutex,
        atomic::{AtomicU64, Ordering},
    },
    time::UNIX_EPOCH,
};
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GalleryError {
    pub code: String,
    pub message: String,
}
impl GalleryError {
    pub fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }
}
impl fmt::Display for GalleryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}
impl std::error::Error for GalleryError {}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaItem {
    pub id: String,
    pub revision: String,
    pub name: String,
    pub relative_path: String,
    pub kind: String,
    pub mime: String,
    pub size: Option<String>,
    pub modified_ms: Option<String>,
    pub issue: Option<String>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub version: String,
    pub session_id: Option<String>,
    pub root: Option<String>,
    pub status: String,
    pub revision: String,
    pub media_origin: String,
    pub items: Vec<MediaItem>,
    pub issues: Vec<String>,
}
#[derive(Clone)]
struct Entry {
    item: MediaItem,
    name: OsString,
    signature: String,
    cancel: CancellationToken,
}
struct Session {
    id: String,
    root: std::path::PathBuf,
    dir: Arc<Dir>,
    entries: HashMap<OsString, Entry>,
    status: String,
    issues: Vec<String>,
    revision: u64,
    cancel: CancellationToken,
    items: Vec<MediaItem>,
}
#[derive(Default)]
struct Hub {
    session: Option<Session>,
    media_origin: String,
}
struct Inner {
    hub: Mutex<Hub>,
    scan: Mutex<()>,
    intent: AtomicU64,
}
#[derive(Clone)]
pub struct Engine {
    inner: Arc<Inner>,
}
pub struct OpenedMedia {
    pub file: File,
    pub size: u64,
    pub mime: String,
    pub cancel: CancellationToken,
}

fn opaque() -> String {
    Uuid::new_v4().simple().to_string()
}
fn candidate(name: &std::ffi::OsStr) -> Option<(&'static str, &'static str)> {
    let extension = Path::new(name).extension()?.to_str()?.to_ascii_lowercase();
    Some(match extension.as_str() {
        "jpg" | "jpeg" => ("image", "image/jpeg"),
        "png" => ("image", "image/png"),
        "webp" => ("image", "image/webp"),
        "gif" => ("image", "image/gif"),
        "avif" => ("image", "image/avif"),
        "bmp" => ("image", "image/bmp"),
        "tif" | "tiff" => ("image", "image/tiff"),
        "mp4" | "m4v" => ("video", "video/mp4"),
        "mov" => ("video", "video/quicktime"),
        "webm" => ("video", "video/webm"),
        "mkv" => ("video", "video/x-matroska"),
        "avi" => ("video", "video/x-msvideo"),
        _ => return None,
    })
}
fn hidden(root: &Path, name: &std::ffi::OsStr) -> bool {
    if name.to_string_lossy().starts_with('.') {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        // This observation only filters labels. All data opens use the capability handle below.
        if let Ok(metadata) = std::fs::symlink_metadata(root.join(name))
            && metadata.file_attributes() & (0x2 | 0x4 | 0x400) != 0
        {
            return true;
        }
    }
    #[cfg(not(windows))]
    let _ = root;
    false
}
fn facts(metadata: &cap_std::fs::Metadata) -> (String, Option<String>, String) {
    let size = metadata.len().to_string();
    let modified = metadata.modified().ok().map(|t| t.into_std()).map(|t| {
        match t.duration_since(UNIX_EPOCH) {
            Ok(d) => d.as_millis().to_string(),
            Err(e) => format!("-{}", e.duration().as_millis()),
        }
    });
    let signature = format!(
        "{}:{:?}:{:?}",
        metadata.len(),
        metadata.modified(),
        metadata.created()
    );
    (size, modified, signature)
}

impl Default for Engine {
    fn default() -> Self {
        Self::new()
    }
}
impl Engine {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Inner {
                hub: Mutex::new(Hub::default()),
                scan: Mutex::new(()),
                intent: AtomicU64::new(0),
            }),
        }
    }
    pub fn set_media_origin(&self, origin: String) {
        self.inner.hub.lock().unwrap().media_origin = origin;
    }
    pub fn open(&self, root: &Path) -> Result<Snapshot, GalleryError> {
        let intent = self.inner.intent.fetch_add(1, Ordering::SeqCst) + 1;
        let root = std::fs::canonicalize(root).map_err(|e| {
            GalleryError::new(
                "root_unavailable",
                format!("Cannot open this directory: {e}"),
            )
        })?;
        let dir = Dir::open_ambient_dir(&root, ambient_authority()).map_err(|e| {
            GalleryError::new(
                "root_unavailable",
                format!("Cannot read this directory: {e}"),
            )
        })?;
        // Probe enumeration before replacing a usable session.
        dir.entries().map_err(|e| {
            GalleryError::new(
                "root_unavailable",
                format!("Cannot list this directory: {e}"),
            )
        })?;
        let mut hub = self.inner.hub.lock().unwrap();
        if self.inner.intent.load(Ordering::SeqCst) != intent {
            return Err(GalleryError::new(
                "cancelled",
                "A newer directory selection replaced this request.",
            ));
        }
        if let Some(old) = hub.session.take() {
            old.cancel.cancel();
        }
        let id = opaque();
        hub.session = Some(Session {
            id: id.clone(),
            root,
            dir: Arc::new(dir),
            entries: HashMap::new(),
            status: "scanning".into(),
            issues: vec![],
            revision: 0,
            cancel: CancellationToken::new(),
            items: vec![],
        });
        drop(hub);
        self.reconcile(&id)?;
        self.current_session(&id)
    }
    pub fn close(&self, id: &str) -> Result<(), GalleryError> {
        let mut hub = self.inner.hub.lock().unwrap();
        if hub.session.as_ref().is_some_and(|s| s.id == id) {
            self.inner.intent.fetch_add(1, Ordering::SeqCst);
            hub.session.take().unwrap().cancel.cancel();
            Ok(())
        } else {
            Err(GalleryError::new(
                "stale_session",
                "This gallery session has ended.",
            ))
        }
    }
    pub fn refresh(&self, id: &str) -> Result<Snapshot, GalleryError> {
        self.reconcile(id)?;
        self.current_session(id)
    }
    fn current_session(&self, id: &str) -> Result<Snapshot, GalleryError> {
        let snapshot = self.snapshot();
        if snapshot.session_id.as_deref() == Some(id) {
            Ok(snapshot)
        } else {
            Err(GalleryError::new(
                "stale_session",
                "This gallery session has ended.",
            ))
        }
    }
    pub fn snapshot(&self) -> Snapshot {
        let hub = self.inner.hub.lock().unwrap();
        let mut snapshot = Snapshot {
            version: env!("CARGO_PKG_VERSION").into(),
            session_id: None,
            root: None,
            status: "selection".into(),
            revision: "0".into(),
            media_origin: hub.media_origin.clone(),
            items: vec![],
            issues: vec![],
        };
        if let Some(s) = &hub.session {
            snapshot.session_id = Some(s.id.clone());
            snapshot.root = Some(s.root.to_string_lossy().into_owned());
            snapshot.status = s.status.clone();
            snapshot.revision = s.revision.to_string();
            snapshot.items = s.items.clone();
            snapshot.issues = s.issues.clone();
        }
        snapshot
    }
    fn reconcile(&self, expected_id: &str) -> Result<(), GalleryError> {
        let _scan = self.inner.scan.lock().unwrap();
        let (id, root, dir, old, cancel) = {
            let hub = self.inner.hub.lock().unwrap();
            let s = hub
                .session
                .as_ref()
                .filter(|s| s.id == expected_id)
                .ok_or_else(|| {
                    GalleryError::new("stale_session", "This gallery session has ended.")
                })?;
            (
                s.id.clone(),
                s.root.clone(),
                s.dir.clone(),
                s.entries.clone(),
                s.cancel.clone(),
            )
        };
        let mut next = HashMap::new();
        let mut issues = vec![];
        let entries = dir.entries();
        let unavailable = !root.is_dir() || entries.is_err();
        if !unavailable {
            for entry in entries.unwrap() {
                if cancel.is_cancelled() {
                    return Err(GalleryError::new(
                        "stale_session",
                        "This gallery session has ended.",
                    ));
                }
                let entry = match entry {
                    Ok(e) => e,
                    Err(e) => {
                        issues.push(format!("An entry could not be listed: {e}"));
                        continue;
                    }
                };
                let name = entry.file_name();
                let Some((kind, mime)) = candidate(&name) else {
                    continue;
                };
                if hidden(&root, &name) {
                    continue;
                }
                let metadata = dir.symlink_metadata(&name);
                if metadata
                    .as_ref()
                    .is_ok_and(|m| !m.is_file() || m.file_type().is_symlink())
                {
                    continue;
                }
                let (size, modified_ms, mut signature, mut issue) = match metadata {
                    Ok(m) => {
                        let (size, modified, signature) = facts(&m);
                        (Some(size), modified, signature, None)
                    }
                    Err(e) => {
                        let issue = format!("Cannot inspect this entry: {e}");
                        issues.push(issue.clone());
                        (None, None, "unreadable".into(), Some(issue))
                    }
                };
                if issue.is_none() {
                    let mut options = OpenOptions::new();
                    options.read(true).follow(FollowSymlinks::No);
                    if let Err(error) = dir.open_with(&name, &options) {
                        let message = format!("Cannot read {}: {error}", name.to_string_lossy());
                        issues.push(message.clone());
                        issue = Some(message);
                        signature.push_str(":unreadable");
                    }
                }
                let prior = old.get(&name);
                if let Some(prior) = prior.filter(|e| e.signature == signature) {
                    next.insert(name, prior.clone());
                    continue;
                }
                if let Some(prior) = prior {
                    prior.cancel.cancel();
                }
                let label = name.to_string_lossy().into_owned();
                let item = MediaItem {
                    id: prior.map_or_else(opaque, |e| e.item.id.clone()),
                    revision: opaque(),
                    name: label.clone(),
                    relative_path: label,
                    kind: kind.into(),
                    mime: mime.into(),
                    size,
                    modified_ms,
                    issue,
                };
                next.insert(
                    name.clone(),
                    Entry {
                        item,
                        name,
                        signature,
                        cancel: cancel.child_token(),
                    },
                );
            }
        } else {
            issues.push(
                "The selected directory is unavailable. Choose it again when it returns.".into(),
            );
        }
        let mut hub = self.inner.hub.lock().unwrap();
        let s =
            hub.session.as_mut().filter(|s| s.id == id).ok_or_else(|| {
                GalleryError::new("stale_session", "This gallery session has ended.")
            })?;
        let status = if unavailable {
            "unavailable"
        } else if issues.is_empty() {
            "complete"
        } else {
            "partial"
        };
        let changed = s.status != status
            || s.issues != issues
            || s.entries.len() != next.len()
            || next.iter().any(|(k, v)| {
                s.entries
                    .get(k)
                    .is_none_or(|e| e.item.revision != v.item.revision)
            });
        if !unavailable {
            for (name, prior) in &s.entries {
                if !next.contains_key(name) {
                    prior.cancel.cancel();
                }
            }
            s.items = next.values().map(|entry| entry.item.clone()).collect();
            s.items
                .sort_by(|a, b| a.name.cmp(&b.name).then(a.id.cmp(&b.id)));
            s.entries = next;
        }
        s.status = status.into();
        s.issues = issues;
        if changed {
            s.revision += 1;
        }
        Ok(())
    }
    pub fn open_media(
        &self,
        session: &str,
        item_id: &str,
        revision: &str,
    ) -> Result<OpenedMedia, GalleryError> {
        let (dir, entry) = {
            let hub = self.inner.hub.lock().unwrap();
            let s = hub
                .session
                .as_ref()
                .filter(|s| s.id == session && s.status != "unavailable")
                .ok_or_else(|| {
                    GalleryError::new("stale_session", "This gallery is no longer available.")
                })?;
            let entry = s
                .entries
                .values()
                .find(|e| {
                    e.item.id == item_id && e.item.revision == revision && !e.cancel.is_cancelled()
                })
                .ok_or_else(|| {
                    GalleryError::new(
                        "stale_item",
                        "This item has changed or is no longer available.",
                    )
                })?;
            (s.dir.clone(), entry.clone())
        };
        let mut options = OpenOptions::new();
        options.read(true).follow(FollowSymlinks::No);
        let file = dir.open_with(&entry.name, &options).map_err(|_| {
            GalleryError::new(
                "item_unavailable",
                "This file is unreadable or changed. Refresh the gallery.",
            )
        })?;
        let metadata = file.metadata().map_err(|_| {
            GalleryError::new("item_unavailable", "Cannot inspect the opened file.")
        })?;
        if !metadata.is_file()
            || entry.cancel.is_cancelled()
            || facts(&metadata).2 != entry.signature
        {
            return Err(GalleryError::new(
                "stale_item",
                "This file changed. Refresh the gallery.",
            ));
        }
        Ok(OpenedMedia {
            file: file.into_std(),
            size: metadata.len(),
            mime: entry.item.mime.clone(),
            cancel: entry.cancel.clone(),
        })
    }
}
