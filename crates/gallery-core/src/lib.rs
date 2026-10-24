// SPDX-License-Identifier: Apache-2.0
//! Readonly gallery sessions. Display labels never authorize filesystem access.
mod discovery;
mod transport;
#[cfg(any(test, feature = "discovery-tests"))]
pub use discovery::TestDiscoveryConfig;
pub use discovery::{DiscoveryRequest, DiscoveryState, root_identity};
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
    sync::{Arc, Mutex},
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
    pub stale: bool,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub version: String,
    pub sequence: String,
    pub discovery: Option<DiscoveryState>,
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
    sequence: u64,
    generation: u64,
    request: Option<DiscoveryRequest>,
    discovery: Option<DiscoveryState>,
}
struct Inner {
    hub: Mutex<Hub>,
    scan: Mutex<()>,
    #[cfg(any(test, feature = "discovery-tests"))]
    controls: discovery::TestControls,
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
    /// Run a bounded state operation while the selected root cannot be retired.
    /// Paths here are native identities; the snapshot label is never authority.
    pub fn with_current_root<T>(
        &self,
        expected: Option<&str>,
        operation: impl FnOnce(Option<(&Dir, &Path)>) -> Result<T, GalleryError>,
    ) -> Result<T, GalleryError> {
        let hub = self.inner.hub.lock().unwrap();
        match (&hub.session, expected) {
            (None, None) => operation(None),
            (Some(session), Some(id)) if session.id == id && !session.cancel.is_cancelled() => {
                operation(Some((&session.dir, &session.root)))
            }
            _ => Err(GalleryError::new(
                "stale_session",
                "The selected directory changed. Retry in the current gallery.",
            )),
        }
    }
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Inner {
                hub: Mutex::new(Hub::default()),
                scan: Mutex::new(()),
                #[cfg(any(test, feature = "discovery-tests"))]
                controls: discovery::TestControls::default(),
            }),
        }
    }
    pub fn set_media_origin(&self, origin: String) {
        self.inner.hub.lock().unwrap().media_origin = origin;
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
            || discovery::opened_signature(&metadata) != entry.signature
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
