// SPDX-License-Identifier: Apache-2.0
use super::*;
use crate::metadata_json::{JsonNode, MAX_DOCUMENT_BYTES, parse_metadata_json};
use serde::Deserialize;
use std::io::Read;

pub(super) const MAX_CATALOG: usize = 256;
const MAX_DOCUMENTS: usize = 32;
const MAX_INSPECTION_BYTES: usize = 8 * 1024 * 1024;

#[derive(Clone)]
pub(super) struct JsonObservation {
    pub name: OsString,
    pub signature: String,
    pub issue: Option<String>,
    pub stale: bool,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MetadataRequest {
    pub session_id: String,
    pub item_id: String,
    pub item_revision: String,
    pub metadata_revision: String,
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetadataResult {
    pub session_id: String,
    pub item_id: String,
    pub item_revision: String,
    pub metadata_revision: String,
    pub documents: Vec<MetadataDocument>,
    pub limitations: Vec<String>,
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetadataDocument {
    source: String,
    label: String,
    basis: String,
    rank: u8,
    ambiguous: bool,
    stale: bool,
    status: String,
    message: Option<String>,
    node: Option<JsonNode>,
    source_text: Option<String>,
    record_path: Option<String>,
}
struct DocumentRead {
    status: String,
    message: Option<String>,
    source_text: Option<String>,
    node: Option<JsonNode>,
    bytes_read: usize,
}
pub struct MetadataRead {
    engine: Engine,
    request: MetadataRequest,
    dir: Arc<Dir>,
    root: std::path::PathBuf,
    item: Entry,
    names: Vec<OsString>,
    documents: Vec<JsonObservation>,
    limited: bool,
    incomplete: bool,
    _permit: tokio::sync::OwnedSemaphorePermit,
}
fn stale() -> GalleryError {
    GalleryError::new(
        "stale_metadata",
        "The item, metadata or folder changed. Refresh and retry in the current gallery.",
    )
}
impl Engine {
    /// Admission and authority capture are filesystem-free and occur before spawn.
    pub fn metadata_request(&self, request: MetadataRequest) -> Result<MetadataRead, GalleryError> {
        let permit = self
            .inner
            .metadata_admission
            .clone()
            .try_acquire_owned()
            .map_err(|_| {
                GalleryError::new(
                    "metadata_busy",
                    "Another metadata inspection is still running. Retry when it finishes.",
                )
            })?;
        let hub = self.inner.hub.lock().unwrap();
        let s = hub
            .session
            .as_ref()
            .filter(|s| {
                s.id == request.session_id
                    && s.metadata_revision == request.metadata_revision
                    && s.status != "unavailable"
                    && !s.cancel.is_cancelled()
            })
            .ok_or_else(stale)?;
        if hub
            .discovery
            .as_ref()
            .is_some_and(|d| matches!(d.phase.as_str(), "opening" | "scanning"))
        {
            return Err(GalleryError::new(
                "metadata_pending",
                "Discovery is still updating metadata observations.",
            ));
        }
        let item = s
            .entries
            .values()
            .find(|e| {
                e.item.id == request.item_id
                    && e.item.revision == request.item_revision
                    && !e.cancel.is_cancelled()
            })
            .ok_or_else(stale)?
            .clone();
        Ok(MetadataRead {
            engine: self.clone(),
            request,
            dir: s.dir.clone(),
            root: s.root.clone(),
            item,
            names: s.entries.keys().cloned().collect(),
            documents: s.json.values().cloned().collect(),
            limited: s.json_limited,
            incomplete: hub
                .discovery
                .as_ref()
                .is_some_and(|d| d.phase != "complete"),
            _permit: permit,
        })
    }
}

fn direct_name(name: &str) -> bool {
    !name.is_empty()
        && name != "."
        && name != ".."
        && !name.contains(['/', '\\', '\0'])
        && !name.contains("://")
        && !Path::new(name).is_absolute()
        && Path::new(name).components().count() == 1
        && (!cfg!(windows) || !name.contains(':'))
}
fn index_source(name: &std::ffi::OsStr) -> String {
    if let Some(name) = name.to_str() {
        return format!("index:{name}");
    }
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        format!(
            "index-native:windows:{}",
            name.encode_wide()
                .map(|unit| format!("{unit:04x}"))
                .collect::<String>()
        )
    }
    #[cfg(unix)]
    {
        use std::os::unix::ffi::OsStrExt;
        format!(
            "index-native:unix:{}",
            name.as_bytes()
                .iter()
                .map(|byte| format!("{byte:02x}"))
                .collect::<String>()
        )
    }
}
/// Case aliases must have native identity, not merely a folded display string.
fn native_name(
    dir: &Dir,
    observed: &std::ffi::OsStr,
    wanted: &std::ffi::OsStr,
    observed_names: &[OsString],
) -> bool {
    if observed == wanted {
        return true;
    }
    // A separately observed exact filename wins, even if two hardlinks share identity.
    if observed_names.iter().any(|name| name == wanted) {
        return false;
    }
    let same = (|| -> std::io::Result<bool> {
        let a = dir.symlink_metadata(observed)?;
        let b = dir.symlink_metadata(wanted)?;
        Ok(discovery::visible(observed, &a)
            && discovery::visible(wanted, &b)
            && discovery::opened_signature(&a) == discovery::opened_signature(&b))
    })();
    same.unwrap_or(false)
}
fn slot(
    dir: &Dir,
    document: &OsString,
    media: &std::ffi::OsStr,
    observed_names: &[OsString],
) -> Option<(&'static str, u8)> {
    let mut full = media.to_os_string();
    full.push("_meta.json");
    if native_name(dir, document, &full, observed_names) {
        return Some(("full-name-meta", 0));
    }
    let mut full = media.to_os_string();
    full.push(".json");
    if native_name(dir, document, &full, observed_names) {
        return Some(("full-name-json", 1));
    }
    let mut stem = Path::new(media).file_stem()?.to_os_string();
    stem.push(".json");
    native_name(dir, document, &stem, observed_names).then_some(("stem-json", 2))
}
fn string_values<'a>(node: &'a JsonNode, key: &str) -> Vec<&'a str> {
    match node {
        JsonNode::Object { members } => members
            .iter()
            .filter(|m| m.key == key)
            .filter_map(|m| match &m.value {
                JsonNode::String { value } => Some(value.as_str()),
                _ => None,
            })
            .collect(),
        _ => vec![],
    }
}
fn has_key(node: &JsonNode, key: &str) -> bool {
    matches!(node,JsonNode::Object {members} if members.iter().any(|m|m.key==key))
}
fn directory_or_link(node: &JsonNode) -> bool {
    matches!(node,JsonNode::Object {members} if members.iter().any(|m|matches!(m.key.as_str(),"IsDirectory"|"IsLink") && matches!(m.value,JsonNode::Boolean {value:true})))
}
fn reference_key(node: &JsonNode) -> Option<&'static str> {
    ["StorageName", "Name", "filename", "file", "path"]
        .into_iter()
        .find(|key| has_key(node, key))
}
fn references(node: &JsonNode) -> Vec<&str> {
    reference_key(node).map_or_else(Vec::new, |key| string_values(node, key))
}
fn ambiguous_reference(node: &JsonNode) -> bool {
    let Some(key) = reference_key(node) else {
        return false;
    };
    matches!(node, JsonNode::Object {members} if members.iter().filter(|member|member.key==key).count()>1)
}
fn records(node: &JsonNode) -> Vec<(String, &JsonNode)> {
    let mut values = Vec::new();
    if !directory_or_link(node) && reference_key(node).is_some() {
        values.push(("$".into(), node));
    }
    match node {
        JsonNode::Array { items } => {
            for (index, item) in items.iter().enumerate() {
                if !directory_or_link(item) {
                    values.push((format!("$/{index}"), item));
                }
            }
        }
        JsonNode::Object { members } => {
            for member in members {
                if matches!(member.key.as_str(), "Items" | "items" | "files")
                    && let JsonNode::Array { items } = &member.value
                {
                    for (index, item) in items.iter().enumerate() {
                        if !directory_or_link(item) {
                            values.push((format!("$/{}/{index}", member.key), item));
                        }
                    }
                }
            }
        }
        _ => {}
    }
    values
}

impl MetadataRead {
    fn current(&self) -> Result<(), GalleryError> {
        let hub = self.engine.inner.hub.lock().unwrap();
        let s = hub
            .session
            .as_ref()
            .filter(|s| {
                s.id == self.request.session_id
                    && s.metadata_revision == self.request.metadata_revision
                    && !s.cancel.is_cancelled()
            })
            .ok_or_else(stale)?;
        if self.item.cancel.is_cancelled()
            || !s.entries.values().any(|e| {
                e.item.id == self.request.item_id
                    && e.item.revision == self.request.item_revision
                    && !e.cancel.is_cancelled()
            })
        {
            return Err(stale());
        }
        Ok(())
    }
    fn read_document(&self, observation: &JsonObservation, allowance: usize) -> DocumentRead {
        let mut bytes_read = 0usize;
        let result = (|| -> Result<Vec<u8>, String> {
            discovery::root_identity(&self.dir, &self.root).map_err(|_| "changed".to_string())?;
            let named = self
                .dir
                .symlink_metadata(&observation.name)
                .map_err(|_| "unreadable".to_string())?;
            if !discovery::visible(&observation.name, &named)
                || discovery::opened_signature(&named) != observation.signature
            {
                return Err("changed".into());
            }
            let mut options = OpenOptions::new();
            options.read(true).follow(FollowSymlinks::No);
            let file = self
                .dir
                .open_with(&observation.name, &options)
                .map_err(|_| "unreadable".to_string())?;
            let before = file.metadata().map_err(|_| "unreadable".to_string())?;
            if !discovery::visible(&observation.name, &before)
                || discovery::opened_signature(&before) != observation.signature
            {
                return Err("changed".into());
            }
            if before.len() > MAX_DOCUMENT_BYTES as u64 || before.len() > allowance as u64 {
                return Err("limited".into());
            }
            let mut bytes = Vec::new();
            let read = (&file)
                .take((MAX_DOCUMENT_BYTES + 1).min(allowance) as u64)
                .read_to_end(&mut bytes);
            bytes_read = bytes.len();
            read.map_err(|_| "unreadable".to_string())?;
            if bytes.len() as u64 != before.len() {
                return Err("changed".into());
            }
            if bytes.len() > MAX_DOCUMENT_BYTES {
                return Err("limited".into());
            }
            let after = file.metadata().map_err(|_| "changed".to_string())?;
            let named = self
                .dir
                .symlink_metadata(&observation.name)
                .map_err(|_| "changed".to_string())?;
            if discovery::opened_signature(&after) != observation.signature
                || !discovery::visible(&observation.name, &named)
                || discovery::opened_signature(&named) != observation.signature
                || discovery::root_identity(&self.dir, &self.root).is_err()
            {
                return Err("changed".into());
            }
            Ok(bytes)
        })();
        let bytes = match result {
            Ok(bytes) => bytes,
            Err(code) => return DocumentRead {status:code.clone(),message:Some(match code.as_str() {
                "limited" => "Metadata exceeds the one MiB document or remaining eight MiB inspection budget.",
                "changed" => "This metadata resource changed or its root is unavailable. Refresh to observe it again.",
                _ => "This observed metadata document cannot be read. Refresh to retry.",
            }.into()),source_text:None,node:None,bytes_read},
        };
        let source = match String::from_utf8(bytes) {
            Ok(source) => source,
            Err(_) => {
                return DocumentRead {
                    status: "encoding".into(),
                    message: Some(
                        "Only UTF-8 JSON is supported. Original bytes were preserved.".into(),
                    ),
                    source_text: None,
                    node: None,
                    bytes_read,
                };
            }
        };
        let bom = source.starts_with('\u{feff}');
        match parse_metadata_json(source.strip_prefix('\u{feff}').unwrap_or(&source)) {
            Ok(node) => DocumentRead {
                status: "ready".into(),
                message: bom
                    .then(|| "Leading UTF-8 BOM accepted; original source retained.".into()),
                source_text: Some(source),
                node: Some(node),
                bytes_read,
            },
            Err(message) => DocumentRead {
                status: if message.starts_with("Resource limit:") {
                    "limited"
                } else {
                    "invalid"
                }
                .into(),
                message: Some(message),
                source_text: Some(source),
                node: None,
                bytes_read,
            },
        }
    }
    /// No settings or discovery authority lock is held across file or parser work.
    pub fn read(mut self) -> Result<MetadataResult, GalleryError> {
        self.current()?;
        #[cfg(any(test, feature = "discovery-tests"))]
        self.engine.inner.metadata_control.boundary();
        self.current()?;
        discovery::root_identity(&self.dir, &self.root).map_err(|_| stale())?;
        let mut result = MetadataResult {
            session_id: self.request.session_id.clone(),
            item_id: self.request.item_id.clone(),
            item_revision: self.request.item_revision.clone(),
            metadata_revision: self.request.metadata_revision.clone(),
            documents: vec![],
            limitations: vec![],
        };
        if self.limited {
            result.limitations.push(
                "JSON catalog limited to 256 observed documents. Association search is incomplete."
                    .into(),
            );
        }
        if self.incomplete {
            result.limitations.push("Discovery is incomplete. Prior unconfirmed metadata is labelled; Refresh to reconcile.".into());
        }
        let document_names: Vec<_> = self.documents.iter().map(|d| d.name.clone()).collect();
        let mut ranked: Vec<_> = std::mem::take(&mut self.documents)
            .into_iter()
            .map(|document| {
                let direct = slot(&self.dir, &document.name, &self.item.name, &document_names);
                (document, direct)
            })
            .collect();
        ranked.sort_by(|(a, sa), (b, sb)| {
            sa.map_or(3, |(_, r)| r)
                .cmp(&sb.map_or(3, |(_, r)| r))
                .then(a.name.cmp(&b.name))
        });
        let mut source_bytes = 0usize;
        let mut wire_bytes = 0usize;
        let mut stale_records = 0usize;
        for (index, (observation, direct)) in ranked.iter().enumerate() {
            self.current()?;
            if index >= MAX_DOCUMENTS || source_bytes >= MAX_INSPECTION_BYTES {
                result.limitations.push("Association search limited to 32 documents or eight MiB. Some observed documents were not inspected.".into());
                break;
            }
            let direct = *direct;
            let DocumentRead {
                status,
                mut message,
                source_text,
                node,
                bytes_read,
            } = self.read_document(observation, MAX_INSPECTION_BYTES - source_bytes);
            source_bytes += bytes_read;
            let label = observation.name.to_string_lossy().into_owned();
            if observation.name.to_str().is_none() {
                let note = "The filename label contains replacement characters. The source identifier preserves its native filename encoding.";
                message = Some(
                    message.map_or_else(|| note.into(), |message| format!("{message} {note}")),
                );
            }
            let mut documents = Vec::new();
            if let Some((source, rank)) = direct {
                let ambiguous = rank == 2
                    && self
                        .names
                        .iter()
                        .filter(|name| {
                            slot(&self.dir, &observation.name, name, &document_names)
                                .is_some_and(|(_, r)| r == 2)
                        })
                        .count()
                        > 1;
                documents.push(MetadataDocument {
                    source: source.into(),
                    label: label.clone(),
                    basis: match rank {
                        0 => "Full filename + _meta.json",
                        1 => "Full filename + .json",
                        _ => "Stem + .json",
                    }
                    .into(),
                    rank,
                    ambiguous,
                    stale: observation.stale,
                    status,
                    message: message.or_else(|| observation.issue.clone()),
                    node,
                    source_text,
                    record_path: None,
                });
            } else if let Some(node) = node {
                let mut raw = source_text;
                for (path, record) in records(&node) {
                    let refs = references(record);
                    if refs.is_empty() {
                        if reference_key(record).is_some() {
                            stale_records += 1;
                        }
                        continue;
                    }
                    let matches = |reference: &&str, name: &OsString| {
                        direct_name(reference)
                            && native_name(
                                &self.dir,
                                name,
                                std::ffi::OsStr::new(reference),
                                &self.names,
                            )
                    };
                    let current = refs
                        .iter()
                        .any(|reference| matches(reference, &self.item.name));
                    if !current {
                        if !refs
                            .iter()
                            .any(|reference| self.names.iter().any(|name| matches(reference, name)))
                        {
                            stale_records += 1;
                        }
                        continue;
                    }
                    documents.push(MetadataDocument {
                        source: index_source(&observation.name),
                        label: label.clone(),
                        basis: if has_key(record, "StorageName") {
                            "Index StorageName"
                        } else if has_key(record, "Name") {
                            "Index Name"
                        } else {
                            "Explicit index filename/reference"
                        }
                        .into(),
                        rank: 3,
                        ambiguous: ambiguous_reference(record),
                        stale: observation.stale,
                        status: status.clone(),
                        message: message.clone(),
                        node: Some(record.clone()),
                        source_text: raw.take(),
                        record_path: Some(path),
                    });
                    if documents.len() >= MAX_DOCUMENTS {
                        result
                            .limitations
                            .push(format!("{label}: matching records limited to 32."));
                        break;
                    }
                }
            } else {
                result.limitations.push(format!(
                    "{label}: {status}; index associations could not be determined."
                ));
            }
            if direct.is_none() && documents.len() > 1 {
                for document in &mut documents {
                    document.ambiguous = true;
                }
            }
            for document in documents {
                let bytes = serde_json::to_vec(&document)
                    .map_err(|_| {
                        GalleryError::new("internal", "Metadata could not be represented.")
                    })?
                    .len();
                if result.documents.len() >= MAX_DOCUMENTS
                    || wire_bytes + bytes > MAX_INSPECTION_BYTES
                {
                    result.limitations.push(
                        "Metadata result limited to 32 sources or eight MiB of represented data."
                            .into(),
                    );
                    break;
                }
                wire_bytes += bytes;
                result.documents.push(document);
            }
        }
        if stale_records > 0 {
            result.limitations.push(format!("{stale_records} stale or out-of-scope index records did not match a current direct media observation."));
        }
        self.current()?;
        discovery::root_identity(&self.dir, &self.root).map_err(|_| stale())?;
        Ok(result)
    }
}

#[cfg(any(test, feature = "discovery-tests"))]
#[derive(Default)]
pub(super) struct TestControl {
    state: Mutex<(bool, bool, bool)>,
    changed: std::sync::Condvar,
}
#[cfg(any(test, feature = "discovery-tests"))]
impl TestControl {
    fn boundary(&self) {
        let mut s = self.state.lock().unwrap();
        if !s.0 {
            return;
        }
        s.1 = true;
        while !s.2 {
            s = self.changed.wait(s).unwrap();
        }
        *s = (false, false, false);
    }
}
#[cfg(any(test, feature = "discovery-tests"))]
impl Engine {
    pub fn test_metadata_control(&self, action: &str) -> Result<bool, GalleryError> {
        let gate = &self.inner.metadata_control;
        let mut s = gate.state.lock().unwrap();
        match action {
            "metadata_arm" => *s = (true, false, false),
            "metadata_release" => {
                s.2 = true;
                gate.changed.notify_all();
            }
            "metadata_status" => {}
            _ => {
                return Err(GalleryError::new(
                    "invalid_test_action",
                    "Unknown metadata test action.",
                ));
            }
        }
        Ok(s.1 && !s.2)
    }
}
