// SPDX-License-Identifier: Apache-2.0
use super::*;
use cap_fs_ext::MetadataExt as _;
use std::{
    collections::HashSet,
    path::PathBuf,
    time::{Duration, Instant},
};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveryState {
    pub id: String,
    pub generation: String,
    pub kind: String,
    pub phase: String,
    pub entries_seen: String,
    pub media_seen: String,
    pub requested_root: Option<String>,
    pub message: Option<String>,
}

#[derive(Clone)]
enum Target {
    Open(PathBuf),
    Refresh(String),
}

#[derive(Clone)]
pub struct DiscoveryRequest {
    pub id: String,
    pub generation: u64,
    target: Target,
    cancel: CancellationToken,
    #[cfg(any(test, feature = "discovery-tests"))]
    control: Option<Arc<TestGate>>,
}

/// Compare handle-derived native identity. Never use a display label as authority.
pub fn root_identity(dir: &Dir, path: &Path) -> Result<(), GalleryError> {
    let same = (|| -> std::io::Result<bool> {
        let held = dir.dir_metadata()?;
        let named = Dir::open_ambient_dir(path, ambient_authority())?.dir_metadata()?;
        Ok(held.dev() == named.dev() && held.ino() == named.ino())
    })();
    if same.unwrap_or(false) {
        Ok(())
    } else {
        Err(GalleryError::new(
            "root_unavailable",
            "This directory is unavailable or its native location changed. Retry explicitly, or choose its current location.",
        ))
    }
}

pub(super) fn visible(name: &std::ffi::OsStr, metadata: &cap_std::fs::Metadata) -> bool {
    if name.to_string_lossy().starts_with('.')
        || !metadata.is_file()
        || metadata.file_type().is_symlink()
    {
        return false;
    }
    #[cfg(windows)]
    {
        use cap_std::fs::MetadataExt;
        if metadata.file_attributes() & (0x2 | 0x4 | 0x400) != 0 {
            return false;
        }
    }
    true
}

pub(super) fn opened_signature(metadata: &cap_std::fs::Metadata) -> String {
    format!(
        "{}:{}:{}",
        facts(metadata).2,
        metadata.dev(),
        metadata.ino()
    )
}

#[derive(Clone, Copy)]
struct DiscoveryTerminal<'a> {
    phase: &'a str,
    media: &'a HashSet<OsString>,
    json: &'a HashMap<OsString, metadata::JsonObservation>,
    json_limited: bool,
}

fn rebuild(session: &mut Session) {
    session.items = session
        .entries
        .values()
        .map(|entry| entry.item.clone())
        .collect();
    session
        .items
        .sort_by(|a, b| a.name.cmp(&b.name).then(a.id.cmp(&b.id)));
}

impl Engine {
    fn reserve(&self, hub: &mut Hub, target: Target) -> DiscoveryRequest {
        if let Some(old) = &hub.request {
            old.cancel.cancel();
        }
        hub.generation += 1;
        let request = DiscoveryRequest {
            id: opaque(),
            generation: hub.generation,
            target: target.clone(),
            cancel: CancellationToken::new(),
            #[cfg(any(test, feature = "discovery-tests"))]
            control: self.inner.controls.take(),
        };
        hub.discovery = Some(DiscoveryState {
            id: request.id.clone(),
            generation: request.generation.to_string(),
            kind: if matches!(target, Target::Open(_)) {
                "open"
            } else {
                "refresh"
            }
            .into(),
            phase: if matches!(target, Target::Open(_)) {
                "opening"
            } else {
                "scanning"
            }
            .into(),
            entries_seen: "0".into(),
            media_seen: "0".into(),
            requested_root: match target {
                Target::Open(path) => Some(path.to_string_lossy().into_owned()),
                _ => None,
            },
            message: None,
        });
        hub.request = Some(request.clone());
        hub.sequence += 1;
        request
    }
    /// Reserve intent without touching the filesystem or replacing a usable root.
    pub fn begin_open(&self, root: &Path) -> DiscoveryRequest {
        self.reserve(
            &mut self.inner.hub.lock().unwrap(),
            Target::Open(root.to_owned()),
        )
    }
    pub fn begin_refresh(&self, session: &str) -> Result<DiscoveryRequest, GalleryError> {
        let mut hub = self.inner.hub.lock().unwrap();
        if hub.session.as_ref().is_none_or(|s| s.id != session) {
            return Err(GalleryError::new(
                "stale_session",
                "This gallery session has ended.",
            ));
        }
        if let Some(s) = hub.session.as_mut() {
            s.metadata_revision = opaque();
            for document in s.json.values_mut() {
                document.stale = true;
            }
        }
        Ok(self.reserve(&mut hub, Target::Refresh(session.into())))
    }
    fn active(hub: &Hub, request: &DiscoveryRequest) -> bool {
        hub.request
            .as_ref()
            .is_some_and(|r| r.id == request.id && !r.cancel.is_cancelled())
            && hub
                .discovery
                .as_ref()
                .is_some_and(|d| matches!(d.phase.as_str(), "opening" | "scanning"))
    }
    fn is_active(&self, request: &DiscoveryRequest) -> bool {
        Self::active(&self.inner.hub.lock().unwrap(), request)
    }
    pub fn cancel_discovery(&self, id: &str) -> Result<Snapshot, GalleryError> {
        {
            let mut hub = self.inner.hub.lock().unwrap();
            if hub.request.as_ref().is_none_or(|r| r.id != id) {
                return Err(GalleryError::new(
                    "stale_operation",
                    "This discovery request has ended.",
                ));
            }
            if hub
                .discovery
                .as_ref()
                .is_some_and(|d| matches!(d.phase.as_str(), "opening" | "scanning"))
            {
                hub.request.as_ref().unwrap().cancel.cancel();
                let state = hub.discovery.as_mut().unwrap();
                state.phase = "cancelled".into();
                state.message = Some("Discovery cancelled. Available observations remain; Refresh to check the folder again.".into());
                hub.sequence += 1;
            }
        }
        Ok(self.snapshot())
    }
    pub fn cancel_pending(&self) {
        let mut hub = self.inner.hub.lock().unwrap();
        if let Some(request) = hub.request.take() {
            request.cancel.cancel();
        }
        hub.discovery = None;
        hub.sequence += 1;
    }
    pub fn close(&self, id: &str) -> Result<(), GalleryError> {
        // Cancel discovery before waiting for an already admitted state write.
        {
            let mut hub = self.inner.hub.lock().unwrap();
            if hub.session.as_ref().is_none_or(|s| s.id != id) {
                return Err(GalleryError::new(
                    "stale_session",
                    "This gallery session has ended.",
                ));
            }
            if let Some(request) = hub.request.take() {
                request.cancel.cancel();
            }
            hub.discovery = None;
            hub.sequence += 1;
        }
        let _commit = self.inner.state_gate.lock().unwrap();
        let mut hub = self.inner.hub.lock().unwrap();
        if hub.session.as_ref().is_none_or(|s| s.id != id) {
            return Err(GalleryError::new(
                "stale_session",
                "This gallery session has ended.",
            ));
        }
        if let Some(request) = hub.request.take() {
            request.cancel.cancel();
        }
        hub.session.take().unwrap().cancel.cancel();
        hub.discovery = None;
        hub.sequence += 1;
        Ok(())
    }
    pub fn open(&self, root: &Path) -> Result<Snapshot, GalleryError> {
        self.run_discovery(&self.begin_open(root), || {})
    }
    pub fn refresh(&self, session: &str) -> Result<Snapshot, GalleryError> {
        self.run_discovery(&self.begin_refresh(session)?, || {})
    }
    pub fn snapshot(&self) -> Snapshot {
        let hub = self.inner.hub.lock().unwrap();
        let mut snapshot = Snapshot {
            version: env!("CARGO_PKG_VERSION").into(),
            sequence: hub.sequence.to_string(),
            discovery: hub.discovery.clone(),
            session_id: None,
            root: None,
            status: "selection".into(),
            revision: "0".into(),
            media_origin: hub.media_origin.clone(),
            metadata_revision: "0".into(),
            items: vec![],
            issues: vec![],
        };
        if let Some(s) = &hub.session {
            snapshot.session_id = Some(s.id.clone());
            snapshot.root = Some(s.root.to_string_lossy().into_owned());
            snapshot.status = s.status.clone();
            snapshot.revision = s.revision.to_string();
            snapshot.metadata_revision = s.metadata_revision.clone();
            snapshot.items = s.items.clone();
            snapshot.issues = s.issues.clone();
        }
        if let Some(d) = &hub.discovery {
            // A failed pending selection can coexist with the previous usable session.
            snapshot.status = d.phase.clone();
            if let Some(message) = &d.message {
                snapshot.issues.push(message.clone());
            }
        }
        snapshot
    }
    pub fn fail_discovery(&self, request: &DiscoveryRequest, message: &str) -> bool {
        self.finish_error(request, &GalleryError::new("internal", message))
    }
    fn finish_error(&self, request: &DiscoveryRequest, error: &GalleryError) -> bool {
        let mut hub = self.inner.hub.lock().unwrap();
        if !Self::active(&hub, request) {
            return false;
        }
        let unavailable = error.code == "root_unavailable";
        if (matches!(request.target, Target::Refresh(_))
            || hub
                .discovery
                .as_ref()
                .is_some_and(|d| d.phase == "scanning"))
            && let Some(session) = hub.session.as_mut()
        {
            session.status = if unavailable { "unavailable" } else { "failed" }.into();
            for entry in session.entries.values_mut() {
                entry.item.stale = true;
            }
            rebuild(session);
        }
        let state = hub.discovery.as_mut().unwrap();
        state.phase = if unavailable { "unavailable" } else { "failed" }.into();
        state.message = Some(error.message.clone());
        hub.sequence += 1;
        true
    }
    /// Executes on the host's single worker. Observer runs without core locks.
    pub fn run_discovery(
        &self,
        request: &DiscoveryRequest,
        mut observer: impl FnMut(),
    ) -> Result<Snapshot, GalleryError> {
        let _serial = self.inner.scan.lock().unwrap();
        {
            let hub = self.inner.hub.lock().unwrap();
            if hub.request.as_ref().is_none_or(|r| r.id != request.id) {
                return Err(GalleryError::new(
                    "stale_operation",
                    "A newer request retired this discovery.",
                ));
            }
        }
        if !self.is_active(request) {
            return Ok(self.snapshot());
        }
        let result = self.discover(request, &mut observer);
        if let Err(error) = &result
            && self.finish_error(request, error)
        {
            observer();
        }
        result.map(|()| self.snapshot())
    }
    fn discover(
        &self,
        request: &DiscoveryRequest,
        observer: &mut impl FnMut(),
    ) -> Result<(), GalleryError> {
        #[cfg(any(test, feature = "discovery-tests"))]
        if let Some(control) = &request.control {
            control.start()?;
        }
        if !self.is_active(request) {
            return Ok(());
        }
        let (id, root, dir, old, session_cancel) = match &request.target {
            Target::Open(path) => {
                let root = std::fs::canonicalize(path).map_err(|e| {
                    GalleryError::new(
                        "root_unavailable",
                        format!(
                            "Cannot open the selected folder: {e}. Choose it again when available."
                        ),
                    )
                })?;
                if !self.is_active(request) {
                    return Ok(());
                }
                let dir = Dir::open_ambient_dir(&root, ambient_authority()).map_err(|e| {
                    GalleryError::new(
                        "root_unavailable",
                        format!("Cannot read the selected folder: {e}."),
                    )
                })?;
                if !self.is_active(request) {
                    return Ok(());
                }
                dir.entries().map_err(|e| {
                    GalleryError::new(
                        "root_unavailable",
                        format!("Cannot list the selected folder: {e}."),
                    )
                })?;
                if !self.is_active(request) {
                    return Ok(());
                }
                root_identity(&dir, &root)?;
                let _commit = self.inner.state_gate.lock().unwrap();
                let mut hub = self.inner.hub.lock().unwrap();
                if !Self::active(&hub, request) {
                    return Ok(());
                }
                if let Some(old) = hub.session.take() {
                    old.cancel.cancel();
                }
                let id = opaque();
                let dir = Arc::new(dir);
                let cancel = CancellationToken::new();
                hub.session = Some(Session {
                    id: id.clone(),
                    root: root.clone(),
                    dir: dir.clone(),
                    entries: HashMap::new(),
                    json: HashMap::new(),
                    json_limited: false,
                    metadata_revision: opaque(),
                    status: "scanning".into(),
                    issues: vec![],
                    revision: 0,
                    cancel: cancel.clone(),
                    items: vec![],
                });
                hub.discovery.as_mut().unwrap().phase = "scanning".into();
                hub.sequence += 1;
                (id, root, dir, HashMap::new(), cancel)
            }
            Target::Refresh(expected) => {
                let mut hub = self.inner.hub.lock().unwrap();
                if !Self::active(&hub, request) {
                    return Ok(());
                }
                let s = hub
                    .session
                    .as_mut()
                    .filter(|s| s.id == *expected)
                    .ok_or_else(|| {
                        GalleryError::new("stale_session", "This gallery session has ended.")
                    })?;
                let values = (
                    s.id.clone(),
                    s.root.clone(),
                    s.dir.clone(),
                    s.entries.clone(),
                    s.cancel.clone(),
                );
                for entry in s.entries.values_mut() {
                    entry.item.stale = true;
                }
                rebuild(s);
                hub.sequence += 1;
                values
            }
        };
        observer();
        if !self.is_active(request) {
            return Ok(());
        }
        root_identity(&dir, &root)?;
        if !self.is_active(request) {
            return Ok(());
        }
        let mut entries = dir.entries().map_err(|e| {
            GalleryError::new(
                "root_unavailable",
                format!("This folder cannot be listed: {e}. Retry explicitly when it returns."),
            )
        })?;
        let mut seen = HashSet::new();
        let mut batch = Vec::new();
        let mut json_batch = Vec::new();
        let mut seen_json = HashMap::new();
        let mut json_count = 0usize;
        let mut issues = Vec::new();
        let mut entries_seen = 0usize;
        let mut media_seen = 0usize;
        let mut published_at = 0usize;
        let mut last = Instant::now();
        loop {
            if !self.is_active(request) {
                return Ok(());
            }
            #[cfg(any(test, feature = "discovery-tests"))]
            if let Some(control) = &request.control {
                match control.boundary(entries_seen) {
                    Ok(()) => {}
                    Err(error) => {
                        issues.push(error.message);
                        break;
                    }
                }
            }
            if !self.is_active(request) {
                return Ok(());
            }
            let Some(entry) = entries.next() else {
                break;
            };
            entries_seen += 1;
            let observed = (|| -> Result<Option<(OsString, Entry)>, String> {
                let entry = entry.map_err(|e| format!("An entry could not be listed: {e}"))?;
                let name = entry.file_name();
                let media_kind = candidate(&name);
                let is_json = Path::new(&name)
                    .extension()
                    .is_some_and(|e| e.eq_ignore_ascii_case("json"));
                if media_kind.is_none() && !is_json {
                    return Ok(None);
                }
                if !self.is_active(request) {
                    return Ok(None);
                }
                let metadata = dir.symlink_metadata(&name);
                if metadata.as_ref().is_ok_and(|m| !visible(&name, m))
                    || name.to_string_lossy().starts_with('.')
                {
                    return Ok(None);
                }
                let (mut size, mut modified_ms, mut signature, mut issue) = match metadata {
                    Ok(m) => {
                        let (size, modified, signature) = facts(&m);
                        (Some(size), modified, signature, None)
                    }
                    Err(e) => (
                        None,
                        None,
                        "unreadable".into(),
                        Some(format!("Cannot inspect this entry: {e}")),
                    ),
                };
                if !self.is_active(request) {
                    return Ok(None);
                }
                if issue.is_none() {
                    let mut options = OpenOptions::new();
                    options.read(true).follow(FollowSymlinks::No);
                    match dir
                        .open_with(&name, &options)
                        .and_then(|file| file.metadata())
                    {
                        Ok(metadata) if visible(&name, &metadata) => {
                            let current = facts(&metadata);
                            size = Some(current.0);
                            modified_ms = current.1;
                            signature = opened_signature(&metadata);
                        }
                        Ok(_) => {
                            return Ok(None);
                        }
                        Err(e) => {
                            issue = Some(format!("Cannot read {}: {e}", name.to_string_lossy()));
                            signature.push_str(":unreadable");
                        }
                    }
                }
                if is_json {
                    json_count += 1;
                    let document = metadata::JsonObservation {
                        name: name.clone(),
                        signature,
                        issue,
                        stale: false,
                    };
                    if seen_json.len() < metadata::MAX_CATALOG {
                        seen_json.insert(name.clone(), document.clone());
                    }
                    json_batch.push((name, document));
                    return Ok(None);
                }
                let (kind, mime) = media_kind.unwrap();
                let prior = old.get(&name);
                if let Some(prior) = prior.filter(|p| p.signature == signature) {
                    let mut entry = prior.clone();
                    entry.item.stale = false;
                    return Ok(Some((name, entry)));
                }
                let label = name.to_string_lossy().into_owned();
                Ok(Some((
                    name.clone(),
                    Entry {
                        name,
                        signature,
                        cancel: session_cancel.child_token(),
                        item: MediaItem {
                            id: prior.map_or_else(opaque, |p| p.item.id.clone()),
                            revision: opaque(),
                            name: label.clone(),
                            relative_path: label,
                            kind: kind.into(),
                            mime: mime.into(),
                            size,
                            modified_ms,
                            issue,
                            stale: false,
                        },
                    },
                )))
            })();
            match observed {
                Ok(Some((name, entry))) => {
                    media_seen += 1;
                    if let Some(issue) = &entry.item.issue
                        && issues.len() < 64
                    {
                        issues.push(issue.clone());
                    }
                    seen.insert(name.clone());
                    batch.push((name, entry));
                }
                Ok(None) => {}
                Err(error) => {
                    if issues.len() < 64 {
                        issues.push(error);
                    }
                }
            }
            if media_seen == 1 && !batch.is_empty()
                || entries_seen - published_at >= 32
                || last.elapsed() >= Duration::from_millis(100)
            {
                if !self.is_active(request) {
                    return Ok(());
                }
                root_identity(&dir, &root)?;
                if !self.commit_batch(
                    request,
                    &id,
                    &mut batch,
                    &mut json_batch,
                    entries_seen,
                    media_seen,
                    &issues,
                    None,
                ) {
                    return Ok(());
                }
                observer();
                last = Instant::now();
                published_at = entries_seen;
            }
        }
        if !self.is_active(request) {
            return Ok(());
        }
        root_identity(&dir, &root)?;
        let status = if issues.is_empty() {
            "complete"
        } else {
            "partial"
        };
        if self.commit_batch(
            request,
            &id,
            &mut batch,
            &mut json_batch,
            entries_seen,
            media_seen,
            &issues,
            Some(DiscoveryTerminal {
                phase: status,
                media: &seen,
                json: &seen_json,
                json_limited: json_count > metadata::MAX_CATALOG,
            }),
        ) {
            observer();
        }
        Ok(())
    }
    #[allow(clippy::too_many_arguments)]
    fn commit_batch(
        &self,
        request: &DiscoveryRequest,
        id: &str,
        batch: &mut Vec<(OsString, Entry)>,
        json_batch: &mut Vec<(OsString, metadata::JsonObservation)>,
        entries_seen: usize,
        media_seen: usize,
        issues: &[String],
        terminal: Option<DiscoveryTerminal<'_>>,
    ) -> bool {
        let mut hub = self.inner.hub.lock().unwrap();
        if !Self::active(&hub, request) {
            return false;
        }
        let Some(s) = hub.session.as_mut().filter(|s| s.id == id) else {
            return false;
        };
        let mut changed = false;
        for (name, entry) in batch.drain(..) {
            if let Some(prior) = s.entries.get(&name) {
                if prior.item.revision != entry.item.revision {
                    prior.cancel.cancel();
                    changed = true;
                }
            } else {
                changed = true;
            }
            s.entries.insert(name, entry);
        }
        if !json_batch.is_empty() || terminal.is_some() {
            s.metadata_revision = opaque();
        }
        for (name, document) in json_batch.drain(..) {
            if s.json.len() < metadata::MAX_CATALOG || s.json.contains_key(&name) {
                s.json.insert(name, document);
            } else {
                s.json_limited = true;
            }
        }
        if let Some(terminal) = terminal.filter(|t| t.phase == "complete") {
            s.json = terminal.json.clone();
            s.json_limited = terminal.json_limited;
            let seen = terminal.media;
            s.entries.retain(|name, entry| {
                let keep = seen.contains(name);
                if !keep {
                    entry.cancel.cancel();
                    changed = true;
                }
                keep
            });
        }
        s.status = terminal
            .map_or("scanning", |terminal| terminal.phase)
            .into();
        s.issues = issues.to_vec();
        if changed {
            s.revision += 1;
        }
        rebuild(s);
        let state = hub.discovery.as_mut().unwrap();
        state.phase = terminal
            .map_or("scanning", |terminal| terminal.phase)
            .into();
        state.entries_seen = entries_seen.to_string();
        state.media_seen = media_seen.to_string();
        hub.sequence += 1;
        true
    }
}

#[cfg(any(test, feature = "discovery-tests"))]
#[derive(Default, Clone, serde::Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct TestDiscoveryConfig {
    pub pause_after: Option<usize>,
    pub fail_after: Option<usize>,
    pub unavailable: bool,
    pub internal_failure: bool,
}
#[cfg(any(test, feature = "discovery-tests"))]
struct TestGate {
    config: TestDiscoveryConfig,
    state: Mutex<(bool, bool)>,
    changed: std::sync::Condvar,
}
#[cfg(any(test, feature = "discovery-tests"))]
impl TestGate {
    fn start(&self) -> Result<(), GalleryError> {
        if self.config.unavailable {
            return Err(GalleryError::new(
                "root_unavailable",
                "Synthetic requested root failure. Retry explicitly.",
            ));
        }
        if self.config.internal_failure {
            return Err(GalleryError::new(
                "internal",
                "Synthetic internal discovery failure.",
            ));
        }
        Ok(())
    }
    fn boundary(&self, count: usize) -> Result<(), GalleryError> {
        if self.config.pause_after == Some(count) {
            let mut state = self.state.lock().unwrap();
            state.0 = true;
            while !state.1 {
                state = self.changed.wait(state).unwrap();
            }
        }
        if self.config.fail_after == Some(count) {
            return Err(GalleryError::new(
                "partial",
                "Synthetic directory iterator failure after accessible observations.",
            ));
        }
        Ok(())
    }
}
#[cfg(any(test, feature = "discovery-tests"))]
#[derive(Default)]
pub(super) struct TestControls {
    next: Mutex<Option<TestDiscoveryConfig>>,
    gates: Mutex<Vec<std::sync::Weak<TestGate>>>,
}
#[cfg(any(test, feature = "discovery-tests"))]
impl TestControls {
    fn take(&self) -> Option<Arc<TestGate>> {
        let config = self.next.lock().unwrap().take()?;
        let gate = Arc::new(TestGate {
            config,
            state: Mutex::new((false, false)),
            changed: std::sync::Condvar::new(),
        });
        let mut gates = self.gates.lock().unwrap();
        gates.retain(|g| g.strong_count() > 0);
        gates.push(Arc::downgrade(&gate));
        Some(gate)
    }
}
#[cfg(any(test, feature = "discovery-tests"))]
impl Engine {
    pub fn configure_test_discovery(&self, config: TestDiscoveryConfig) {
        *self.inner.controls.next.lock().unwrap() = Some(config);
    }
    pub fn test_discovery_paused(&self) -> bool {
        self.inner
            .controls
            .gates
            .lock()
            .unwrap()
            .iter()
            .filter_map(|g| g.upgrade())
            .any(|g| {
                let state = g.state.lock().unwrap();
                state.0 && !state.1
            })
    }
    pub fn release_test_discovery(&self) {
        for gate in self
            .inner
            .controls
            .gates
            .lock()
            .unwrap()
            .iter()
            .filter_map(|g| g.upgrade())
        {
            gate.state.lock().unwrap().1 = true;
            gate.changed.notify_all();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;
    #[test]
    fn iterator_failure_retains_unconfirmed_prior_items_and_complete_retry_prunes() {
        let root = TempDir::new().unwrap();
        for name in ["one.jpg", "two.jpg", "three.jpg"] {
            fs::write(root.path().join(name), b"media").unwrap();
        }
        let engine = Engine::new();
        let first = engine.open(root.path()).unwrap();
        fs::remove_file(root.path().join("three.jpg")).unwrap();
        engine.configure_test_discovery(TestDiscoveryConfig {
            fail_after: Some(1),
            ..Default::default()
        });
        let partial = engine.refresh(first.session_id.as_ref().unwrap()).unwrap();
        assert_eq!(partial.status, "partial");
        assert_eq!(partial.items.len(), 3);
        assert_eq!(partial.items.iter().filter(|item| item.stale).count(), 2);
        let complete = engine.refresh(first.session_id.as_ref().unwrap()).unwrap();
        assert_eq!(complete.status, "complete");
        assert_eq!(complete.items.len(), 2);
        assert!(complete.items.iter().all(|item| !item.stale));
        assert_eq!(fs::read(root.path().join("one.jpg")).unwrap(), b"media");
    }
    #[test]
    fn root_failure_and_internal_failure_are_distinct_and_retry_is_explicit() {
        let root = TempDir::new().unwrap();
        fs::write(root.path().join("one.jpg"), b"media").unwrap();
        let engine = Engine::new();
        let first = engine.open(root.path()).unwrap();
        let id = first.session_id.unwrap();
        engine.configure_test_discovery(TestDiscoveryConfig {
            unavailable: true,
            ..Default::default()
        });
        assert!(engine.refresh(&id).is_err());
        let unavailable = engine.snapshot();
        assert_eq!(unavailable.status, "unavailable");
        assert_eq!(unavailable.items.len(), 1);
        assert!(unavailable.items[0].stale);
        for _ in 0..3 {
            assert_eq!(engine.snapshot().sequence, unavailable.sequence);
        }
        let item = &unavailable.items[0];
        assert!(engine.open_media(&id, &item.id, &item.revision).is_err());
        assert_eq!(engine.refresh(&id).unwrap().status, "complete");
        engine.configure_test_discovery(TestDiscoveryConfig {
            internal_failure: true,
            ..Default::default()
        });
        assert!(engine.refresh(&id).is_err());
        assert_eq!(engine.snapshot().status, "failed");
        assert_eq!(engine.refresh(&id).unwrap().status, "complete");
    }
    #[test]
    fn queued_refresh_cancellation_does_not_wait_for_serial_worker() {
        use std::sync::{Barrier, mpsc};
        let root = TempDir::new().unwrap();
        fs::write(root.path().join("one.jpg"), b"media").unwrap();
        let engine = Engine::new();
        let id = engine.open(root.path()).unwrap().session_id.unwrap();
        let entered = Arc::new(Barrier::new(2));
        let release = Arc::new(Barrier::new(2));
        let wait = entered.clone();
        let finish = release.clone();
        let running = engine.clone();
        let request = engine.begin_refresh(&id).unwrap();
        let worker = std::thread::spawn(move || {
            let mut held = false;
            running
                .run_discovery(&request, || {
                    if !held {
                        held = true;
                        wait.wait();
                        finish.wait();
                    }
                })
                .unwrap();
        });
        entered.wait();
        let queued = engine.begin_refresh(&id).unwrap();
        let queued_engine = engine.clone();
        let queued_request = queued.clone();
        let (sent, received) = mpsc::channel();
        let pending = std::thread::spawn(move || {
            let value = queued_engine.run_discovery(&queued_request, || {
                panic!("Cancelled queued work must not publish")
            });
            sent.send(value.unwrap().status).unwrap();
        });
        let cancelled = engine.cancel_discovery(&queued.id).unwrap();
        assert_eq!(cancelled.status, "cancelled");
        release.wait();
        worker.join().unwrap();
        pending.join().unwrap();
        assert_eq!(received.recv().unwrap(), "cancelled");
        assert_eq!(engine.snapshot().sequence, cancelled.sequence);
    }
    #[cfg(unix)]
    #[test]
    fn same_path_replacement_never_retargets_held_root() {
        let parent = TempDir::new().unwrap();
        let root = parent.path().join("root");
        fs::create_dir(&root).unwrap();
        fs::write(root.join("old.jpg"), b"old").unwrap();
        let engine = Engine::new();
        let first = engine.open(&root).unwrap();
        fs::rename(&root, parent.path().join("moved")).unwrap();
        fs::create_dir(&root).unwrap();
        fs::write(root.join("replacement.jpg"), b"replacement").unwrap();
        assert!(engine.refresh(first.session_id.as_ref().unwrap()).is_err());
        assert_eq!(engine.snapshot().status, "unavailable");
        assert_eq!(engine.snapshot().items[0].name, "old.jpg");
        assert_eq!(engine.open(&root).unwrap().items[0].name, "replacement.jpg");
    }
}
