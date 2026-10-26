// SPDX-License-Identifier: Apache-2.0
//! Readonly gallery sessions. Display labels never authorize filesystem access.
mod discovery;
mod metadata;
mod metadata_json;
mod native_path;
mod transport;
#[cfg(any(test, feature = "discovery-tests"))]
pub use discovery::TestDiscoveryConfig;
pub use discovery::{DiscoveryRequest, DiscoveryState, root_identity};
pub use metadata::{MetadataRead, MetadataRequest, MetadataResult};
pub use metadata_json::{JsonNode, parse_metadata_json};
pub use native_path::{NativePath, PathEncoding};
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
    pub native_root: Option<NativePath>,
    pub status: String,
    pub revision: String,
    pub media_origin: String,
    pub metadata_revision: String,
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
    json: HashMap<OsString, metadata::JsonObservation>,
    json_limited: bool,
    metadata_revision: String,
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
    state_gate: Mutex<()>,
    metadata_admission: Arc<tokio::sync::Semaphore>,
    media_admission: Arc<tokio::sync::Semaphore>,
    #[cfg(any(test, feature = "discovery-tests"))]
    metadata_control: metadata::TestControl,
    #[cfg(any(test, feature = "discovery-tests"))]
    controls: discovery::TestControls,
}
#[derive(Clone)]
pub struct Engine {
    inner: Arc<Inner>,
}
#[cfg(any(test, feature = "discovery-tests"))]
#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestResourceSnapshot {
    pub media_responses_active: usize,
    pub media_responses_cap: usize,
    pub metadata_active: usize,
    pub metadata_cap: usize,
    pub discovery_active: Option<usize>,
    pub discovery_cap: usize,
}
/// Owned read capability. Capture again to validate before installing prepared state.
pub struct RootGrant {
    pub dir: Arc<Dir>,
    pub path: std::path::PathBuf,
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
    /// Capture read authority briefly, without retaining the discovery control lock.
    pub fn capture_current_root(
        &self,
        expected: Option<&str>,
    ) -> Result<Option<RootGrant>, GalleryError> {
        let hub = self.inner.hub.lock().unwrap();
        match (&hub.session, expected) {
            (None, None) => Ok(None),
            (Some(session), Some(id)) if session.id == id && !session.cancel.is_cancelled() => {
                Ok(Some(RootGrant {
                    dir: session.dir.clone(),
                    path: session.root.clone(),
                }))
            }
            _ => Err(GalleryError::new(
                "stale_session",
                "The selected directory changed. Retry in the current gallery.",
            )),
        }
    }
    /// Admit a state write before root retirement. Filesystem I/O never holds Hub.
    /// Read preparation must happen before entering this commit gate.
    pub fn with_current_root<T>(
        &self,
        expected: Option<&str>,
        operation: impl FnOnce(Option<(&Dir, &Path)>) -> Result<T, GalleryError>,
    ) -> Result<T, GalleryError> {
        let _commit = self.inner.state_gate.lock().unwrap();
        let root = self.capture_current_root(expected)?;
        operation(
            root.as_ref()
                .map(|root| (root.dir.as_ref(), root.path.as_path())),
        )
    }
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Inner {
                hub: Mutex::new(Hub::default()),
                scan: Mutex::new(()),
                state_gate: Mutex::new(()),
                metadata_admission: Arc::new(tokio::sync::Semaphore::new(1)),
                media_admission: Arc::new(tokio::sync::Semaphore::new(32)),
                #[cfg(any(test, feature = "discovery-tests"))]
                metadata_control: metadata::TestControl::default(),
                #[cfg(any(test, feature = "discovery-tests"))]
                controls: discovery::TestControls::default(),
            }),
        }
    }
    pub fn set_media_origin(&self, origin: String) {
        self.inner.hub.lock().unwrap().media_origin = origin;
    }
    #[cfg(any(test, feature = "discovery-tests"))]
    pub fn test_resource_snapshot(&self) -> TestResourceSnapshot {
        let discovery_active = match self.inner.scan.try_lock() {
            Ok(_) => Some(0),
            Err(std::sync::TryLockError::WouldBlock) => Some(1),
            Err(std::sync::TryLockError::Poisoned(_)) => None,
        };
        TestResourceSnapshot {
            media_responses_active: 32 - self.inner.media_admission.available_permits(),
            media_responses_cap: 32,
            metadata_active: 1 - self.inner.metadata_admission.available_permits(),
            metadata_cap: 1,
            discovery_active,
            discovery_cap: 1,
        }
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
