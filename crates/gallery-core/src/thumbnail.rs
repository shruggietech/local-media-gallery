// SPDX-License-Identifier: Apache-2.0
//! Explicit optional preparation. Captured native names, never display paths, authorize reads.
use crate::{
    Engine, GalleryError, RootGrant,
    cache::{self, CacheDir, CacheEntry, SourceName},
    diagnostics::Event,
};
use cap_std::{ambient_authority, fs::Dir};
use serde::{Deserialize, Serialize};
use std::{
    io::Read,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tokio_util::sync::CancellationToken;
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DestinationKind {
    Local,
    Portable,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Helper {
    #[serde(skip)]
    pub path: PathBuf,
    pub native_path: crate::NativePath,
    pub sha256: String,
    pub executable_bytes: String,
    pub version: String,
    pub origin: &'static str,
    pub download_bytes: Option<String>,
    pub associated_payload_bytes: Option<String>,
}
impl Helper {
    pub fn select(path: PathBuf, expected: Option<&str>) -> Result<Self, GalleryError> {
        Self::select_cancelled(path, expected, &CancellationToken::new(), || {})
    }
    fn select_cancelled(
        path: PathBuf,
        expected: Option<&str>,
        cancel: &CancellationToken,
        unknown: impl Fn(),
    ) -> Result<Self, GalleryError> {
        if !path.is_absolute() {
            return Err(cache::error("helper_unavailable"));
        }
        let mut file = helper_file(&path)?;
        if !file
            .metadata()
            .map_err(|_| cache::error("helper_unavailable"))?
            .is_file()
        {
            return Err(cache::error("helper_unavailable"));
        }
        let hash = cache::digest(&mut file, cancel)?;
        if expected.is_some_and(|v| v != hash) {
            return Err(cache::error("helper_identity"));
        }
        let version = run_tool(&path, &["-version"], None, cancel, 65536, &unknown)?;
        let version = String::from_utf8_lossy(&version)
            .lines()
            .next()
            .unwrap_or("")
            .chars()
            .take(256)
            .collect::<String>();
        if !version.starts_with("ffmpeg version ") {
            return Err(cache::error("helper_unavailable"));
        }
        let protocols = run_tool(
            &path,
            &["-hide_banner", "-protocols"],
            None,
            cancel,
            65536,
            &unknown,
        )?;
        let encoders = run_tool(
            &path,
            &["-hide_banner", "-encoders"],
            None,
            cancel,
            262144,
            &unknown,
        )?;
        if !helper_capabilities(&protocols, &encoders) {
            return Err(cache::error("helper_unavailable"));
        }
        let size = file
            .metadata()
            .map_err(|_| cache::error("helper_unavailable"))?
            .len();
        Ok(Self {
            native_path: crate::NativePath::from_path(&path),
            path,
            sha256: hash,
            executable_bytes: size.to_string(),
            version,
            origin: "user-selected local executable; hash identifies bytes, not publisher authenticity or dynamic dependencies",
            download_bytes: None,
            associated_payload_bytes: None,
        })
    }
    fn identity(&self) -> String {
        format!("ffmpeg:{}", self.sha256)
    }
    fn encode(
        &self,
        file: std::fs::File,
        cancel: &CancellationToken,
        unknown: impl Fn(),
    ) -> Result<Vec<u8>, GalleryError> {
        let mut selected = helper_file(&self.path)?;
        if cache::digest(&mut selected, cancel)? != self.sha256 {
            return Err(cache::error("helper_identity"));
        }
        let filter = "scale=w='max(1,trunc(iw*if(gt(sar,0),sar,1)*min(1,min(320/(iw*if(gt(sar,0),sar,1)),320/ih))))':h='max(1,trunc(ih*min(1,min(320/(iw*if(gt(sar,0),sar,1)),320/ih))))',setsar=1";
        run_tool(
            &self.path,
            &[
                "-hide_banner",
                "-loglevel",
                "error",
                "-nostdin",
                "-threads",
                "1",
                "-filter_threads",
                "1",
                "-max_alloc",
                "134217728",
                "-max_pixels",
                "33554432",
                "-protocol_whitelist",
                "fd",
                "-i",
                "fd:",
                "-map",
                "0:V:0",
                "-frames:v",
                "1",
                "-an",
                "-sn",
                "-dn",
                "-vf",
                filter,
                "-threads",
                "1",
                "-c:v",
                "png",
                "-f",
                "image2pipe",
                "pipe:1",
            ],
            Some(file),
            cancel,
            cache::OUTPUT_LIMIT,
            unknown,
        )
    }
}
fn helper_capabilities(protocols: &[u8], encoders: &[u8]) -> bool {
    let protocols = String::from_utf8_lossy(protocols);
    let Some((input, output)) = protocols
        .split_once("Input:")
        .and_then(|(_, s)| s.split_once("Output:"))
    else {
        return false;
    };
    input.lines().any(|line| line.trim() == "fd")
        && output.lines().any(|line| line.trim() == "pipe")
        && String::from_utf8_lossy(encoders)
            .lines()
            .any(|line| line.split_whitespace().nth(1) == Some("png"))
}
fn helper_file(path: &Path) -> Result<std::fs::File, GalleryError> {
    let mut o = std::fs::OpenOptions::new();
    o.read(true);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        o.share_mode(1);
    }
    o.open(path).map_err(|_| cache::error("helper_unavailable"))
}
fn drain(mut r: impl Read, limit: usize) -> (Vec<u8>, bool) {
    let mut out = Vec::new();
    let mut overflow = false;
    let mut buf = [0; 8192];
    loop {
        match r.read(&mut buf) {
            Ok(0) | Err(_) => break,
            Ok(n) => {
                let keep = n.min(limit.saturating_sub(out.len()));
                out.extend_from_slice(&buf[..keep]);
                overflow |= keep < n;
            }
        }
    }
    (out, overflow)
}
struct ToolPolicy {
    deadline: Duration,
    grace: Duration,
    kill: fn(&mut std::process::Child) -> std::io::Result<()>,
}
fn run_tool(
    path: &Path,
    args: &[&str],
    input: Option<std::fs::File>,
    cancel: &CancellationToken,
    limit: usize,
    unknown: impl Fn(),
) -> Result<Vec<u8>, GalleryError> {
    run_tool_with_policy(
        path,
        args,
        input,
        cancel,
        limit,
        unknown,
        ToolPolicy {
            deadline: Duration::from_secs(30),
            grace: Duration::from_secs(2),
            kill: |child| child.kill(),
        },
    )
}
fn run_tool_with_policy(
    path: &Path,
    args: &[&str],
    input: Option<std::fs::File>,
    cancel: &CancellationToken,
    limit: usize,
    unknown: impl Fn(),
    policy: ToolPolicy,
) -> Result<Vec<u8>, GalleryError> {
    let mut cmd = Command::new(path);
    cmd.args(args)
        .stdin(input.map(Stdio::from).unwrap_or_else(Stdio::null))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }
    let mut child = cmd
        .spawn()
        .map_err(|_| cache::error("helper_unavailable"))?;
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    let out = std::thread::spawn(move || drain(stdout, limit));
    let err = std::thread::spawn(move || drain(stderr, 16384));
    let started = Instant::now();
    let mut killed = false;
    let mut timed_out = false;
    let mut reported = false;
    let status = loop {
        match child.try_wait() {
            Ok(Some(s)) => break s,
            Ok(None) => {}
            Err(_) => {
                if !reported {
                    unknown();
                    reported = true
                }
            }
        }
        if cancel.is_cancelled() || started.elapsed() > policy.deadline {
            timed_out |= !cancel.is_cancelled();
            if !killed {
                let _ = (policy.kill)(&mut child);
                killed = true;
            }
            if started.elapsed() > policy.deadline + policy.grace && !reported {
                unknown();
                reported = true;
            }
        }
        std::thread::sleep(Duration::from_millis(20));
    };
    while !out.is_finished() || !err.is_finished() {
        if !reported && started.elapsed() > policy.deadline + policy.grace {
            unknown();
            reported = true;
        }
        std::thread::sleep(Duration::from_millis(20));
    }
    let (output, overflow) = out.join().map_err(|_| cache::error("helper_failed"))?;
    let _ = err.join();
    if cancel.is_cancelled() {
        return Err(cache::error("cancelled"));
    }
    if timed_out {
        return Err(cache::error("helper_timeout"));
    }
    if !status.success() || overflow {
        return Err(cache::error("helper_failed"));
    }
    Ok(output)
}
#[derive(Clone)]
struct Source {
    session: String,
    item: String,
    revision: String,
    name: SourceName,
    kind: String,
    cancel: CancellationToken,
}
impl Engine {
    fn thumbnail_sources(&self, session: &str) -> Result<Vec<Source>, GalleryError> {
        let hub = self.inner.hub.lock().unwrap();
        let s = hub
            .session
            .as_ref()
            .filter(|s| s.id == session && !s.cancel.is_cancelled() && s.status != "unavailable")
            .ok_or_else(|| cache::error("stale_session"))?;
        let mut entries = s
            .entries
            .values()
            .filter(|e| !e.cancel.is_cancelled() && !e.item.stale)
            .map(|e| {
                Ok(Source {
                    session: session.into(),
                    item: e.item.id.clone(),
                    revision: e.item.revision.clone(),
                    name: SourceName::new(&e.name)?,
                    kind: e.item.kind.clone(),
                    cancel: e.cancel.clone(),
                })
            })
            .collect::<Result<Vec<_>, GalleryError>>()?;
        entries.sort_by_cached_key(|a| a.name.key());
        Ok(entries)
    }
}
fn image_thumbnail(file: std::fs::File) -> Result<Vec<u8>, GalleryError> {
    use image::ImageDecoder;
    let mut reader = image::ImageReader::new(std::io::BufReader::new(file))
        .with_guessed_format()
        .map_err(|_| cache::error("unsupported_media"))?;
    if !matches!(
        reader.format(),
        Some(
            image::ImageFormat::Png
                | image::ImageFormat::Jpeg
                | image::ImageFormat::Gif
                | image::ImageFormat::WebP
                | image::ImageFormat::Bmp
                | image::ImageFormat::Tiff
        )
    ) {
        return Err(cache::error("unsupported_media"));
    }
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(16384);
    limits.max_image_height = Some(16384);
    limits.max_alloc = Some(192 * 1024 * 1024);
    reader.limits(limits);
    let mut decoder = reader
        .into_decoder()
        .map_err(|_| cache::error("unsupported_media"))?;
    let (w, h) = decoder.dimensions();
    if w == 0
        || h == 0
        || (w as u64) * (h as u64) > 33554432
        || decoder.total_bytes() > 128 * 1024 * 1024
    {
        return Err(cache::error("unsupported_media"));
    }
    let orientation = decoder
        .orientation()
        .map_err(|_| cache::error("unsupported_media"))?;
    let mut decoded = image::DynamicImage::from_decoder(decoder)
        .map_err(|_| cache::error("unsupported_media"))?;
    decoded.apply_orientation(orientation);
    let scaled = if decoded.width() > 320 || decoded.height() > 320 {
        decoded.thumbnail(320, 320)
    } else {
        decoded
    };
    let rgba = image::DynamicImage::ImageRgba8(scaled.to_rgba8());
    let mut output = std::io::Cursor::new(Vec::new());
    rgba.write_to(&mut output, image::ImageFormat::Png)
        .map_err(|_| cache::error("unsupported_media"))?;
    let bytes = output.into_inner();
    cache::validate_png(&bytes)?;
    Ok(bytes)
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemOutcome {
    pub item_id: String,
    pub code: String,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlannedOutput {
    pub item_id: String,
    pub slot: String,
    pub reused: bool,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JobStatus {
    pub planned_outputs: Vec<PlannedOutput>,
    pub dropped_planned_outputs: String,
    pub id: String,
    pub session_id: String,
    pub sequence: String,
    pub kind: String,
    pub phase: String,
    pub destination_kind: DestinationKind,
    pub destination: Option<crate::NativePath>,
    pub policy: &'static str,
    pub candidates: Option<String>,
    pub completed: String,
    pub reused: String,
    pub failed: String,
    pub skipped: String,
    pub remaining: Option<String>,
    pub storage_upper_bound_bytes: Option<String>,
    pub helper: Option<Helper>,
    pub helper_lifetime: Option<String>,
    pub error: Option<String>,
    pub outcomes: Vec<ItemOutcome>,
    pub dropped_outcomes: String,
}
impl JobStatus {
    pub fn terminal(&self) -> bool {
        matches!(
            self.phase.as_str(),
            "ready" | "success" | "partial" | "cancelled" | "unavailable" | "failed"
        )
    }
}
struct Planned {
    source: Source,
    digest: String,
    length: u64,
    slot: String,
    provider: String,
    reused: bool,
}
struct Preview {
    root: RootGrant,
    kind: DestinationKind,
    cache: Option<CacheDir>,
    plans: Vec<Planned>,
}
struct Active {
    status: JobStatus,
    cancel: CancellationToken,
    preview: Option<Preview>,
    busy: bool,
}
struct Interest {
    id: String,
    session: String,
    item: String,
    revision: String,
    cancel: CancellationToken,
}
type Notify = Arc<dyn Fn(JobStatus) + Send + Sync>;
pub struct PreparationService {
    #[cfg(any(test, feature = "discovery-tests"))]
    test_gate: (Mutex<(bool, bool)>, std::sync::Condvar),
    closed: std::sync::atomic::AtomicBool,
    inspection: std::sync::atomic::AtomicBool,
    inspection_cancel: Mutex<CancellationToken>,
    engine: Engine,
    local_base: PathBuf,
    helper: Mutex<Option<Helper>>,
    state: Mutex<Option<Active>>,
    notify: Mutex<Option<Notify>>,
    last_event: Mutex<Option<(String, u64, String, Instant)>>,
    validation: Arc<tokio::sync::Semaphore>,
    interests: Mutex<std::collections::VecDeque<Interest>>,
}
impl PreparationService {
    pub fn new(engine: Engine, local_base: PathBuf, helper: Option<Helper>) -> Self {
        Self {
            #[cfg(any(test, feature = "discovery-tests"))]
            test_gate: (Mutex::new((false, false)), std::sync::Condvar::new()),
            closed: std::sync::atomic::AtomicBool::new(false),
            inspection: std::sync::atomic::AtomicBool::new(false),
            inspection_cancel: Mutex::new(CancellationToken::new()),
            engine,
            local_base,
            helper: Mutex::new(helper),
            state: Mutex::new(None),
            notify: Mutex::new(None),
            last_event: Mutex::new(None),
            validation: Arc::new(tokio::sync::Semaphore::new(2)),
            interests: Mutex::new(std::collections::VecDeque::new()),
        }
    }
    fn thumbnail_source(
        &self,
        session: &str,
        item: &str,
        revision: &str,
    ) -> Result<Source, GalleryError> {
        let hub = self.engine.inner.hub.lock().unwrap();
        let s = hub
            .session
            .as_ref()
            .filter(|s| s.id == session && !s.cancel.is_cancelled())
            .ok_or_else(|| cache::error("stale_session"))?;
        let e = s
            .entries
            .values()
            .find(|e| e.item.id == item && e.item.revision == revision && !e.cancel.is_cancelled())
            .ok_or_else(|| cache::error("stale_item"))?;
        Ok(Source {
            session: session.into(),
            item: item.into(),
            revision: revision.into(),
            name: SourceName::new(&e.name)?,
            kind: e.item.kind.clone(),
            cancel: e.cancel.clone(),
        })
    }
    pub fn interest(
        &self,
        session: &str,
        item: &str,
        revision: &str,
    ) -> Result<String, GalleryError> {
        self.thumbnail_source(session, item, revision)?;
        let mut interests = self.interests.lock().unwrap();
        while interests.len() >= 96 {
            if let Some(old) = interests.pop_front() {
                old.cancel.cancel()
            }
        }
        let id = crate::opaque();
        interests.push_back(Interest {
            id: id.clone(),
            session: session.into(),
            item: item.into(),
            revision: revision.into(),
            cancel: CancellationToken::new(),
        });
        Ok(id)
    }
    pub fn retire_interest(&self, id: &str) {
        let mut interests = self.interests.lock().unwrap();
        if let Some(n) = interests.iter().position(|i| i.id == id) {
            interests.remove(n).unwrap().cancel.cancel()
        }
    }
    pub fn validation_permit(&self) -> Result<tokio::sync::OwnedSemaphorePermit, GalleryError> {
        self.validation
            .clone()
            .try_acquire_owned()
            .map_err(|_| cache::error("preparation_busy"))
    }
    pub fn lookup_interest(
        &self,
        session: &str,
        item: &str,
        revision: &str,
        id: &str,
        permit: tokio::sync::OwnedSemaphorePermit,
    ) -> Result<Option<Vec<u8>>, GalleryError> {
        let cancel = {
            let interests = self.interests.lock().unwrap();
            interests
                .iter()
                .find(|i| {
                    i.id == id && i.session == session && i.item == item && i.revision == revision
                })
                .map(|i| i.cancel.clone())
                .ok_or_else(|| cache::error("stale_item"))?
        };
        self.lookup_admitted(session, item, revision, &cancel, permit)
    }
    #[cfg(any(test, feature = "discovery-tests"))]
    pub fn test_control(&self, action: &str) -> Result<bool, GalleryError> {
        let mut gate = self.test_gate.0.lock().unwrap();
        match action {
            "arm" => *gate = (true, false),
            "release" => {
                gate.0 = false;
                self.test_gate.1.notify_all()
            }
            "status" => {}
            _ => {
                return Err(GalleryError::new(
                    "invalid_test_action",
                    "Unknown preparation test barrier action.",
                ));
            }
        }
        Ok(gate.1)
    }
    #[cfg(any(test, feature = "discovery-tests"))]
    fn test_pause(&self, cancel: &CancellationToken) {
        let mut gate = self.test_gate.0.lock().unwrap();
        if gate.0 {
            gate.1 = true;
            while gate.0 && !cancel.is_cancelled() {
                gate = self
                    .test_gate
                    .1
                    .wait_timeout(gate, Duration::from_millis(10))
                    .unwrap()
                    .0;
            }
            gate.1 = false;
        }
    }
    pub fn set_notify(&self, notify: Notify) {
        *self.notify.lock().unwrap() = Some(notify)
    }
    pub fn inspect_helper(
        &self,
        path: PathBuf,
        expected: Option<&str>,
    ) -> Result<Helper, GalleryError> {
        let mut state = self.state.lock().unwrap();
        if self.retired()
            || state.as_ref().is_some_and(|a| a.busy)
            || self
                .inspection
                .swap(true, std::sync::atomic::Ordering::SeqCst)
        {
            return Err(cache::error("preparation_busy"));
        }
        if let Some(a) = state.as_mut() {
            a.preview = None;
            a.status.phase = "cancelled".into();
        }
        let cancel = CancellationToken::new();
        *self.inspection_cancel.lock().unwrap() = cancel.clone();
        drop(state);
        struct Release<'a>(&'a std::sync::atomic::AtomicBool);
        impl Drop for Release<'_> {
            fn drop(&mut self) {
                self.0.store(false, std::sync::atomic::Ordering::SeqCst);
            }
        }
        let _release = Release(&self.inspection);
        let helper = Helper::select_cancelled(path, expected, &cancel, || {
            self.engine.diagnostics().record(Event::HelperTimeout)
        })?;
        *self.helper.lock().unwrap() = Some(helper.clone());
        Ok(helper)
    }
    fn change(&self, id: &str, f: impl FnOnce(&mut Active)) {
        let status = {
            let mut state = self.state.lock().unwrap();
            let Some(a) = state.as_mut().filter(|a| a.status.id == id) else {
                return;
            };
            f(a);
            a.status.sequence = (a.status.sequence.parse::<u64>().unwrap() + 1).to_string();
            a.status.clone()
        };
        self.notify_status(status);
    }
    fn notify_status(&self, status: JobStatus) {
        let mut last = self.last_event.lock().unwrap();
        let sequence = status.sequence.parse::<u64>().unwrap();
        if let Some((id, prior, phase, at)) = last.as_ref()
            && id == &status.id
            && (*prior >= sequence
                || (phase == &status.phase && at.elapsed() < Duration::from_millis(100)))
        {
            return;
        }
        *last = Some((
            status.id.clone(),
            sequence,
            status.phase.clone(),
            Instant::now(),
        ));
        drop(last);
        if let Some(cb) = self.notify.lock().unwrap().as_ref() {
            cb(status);
        }
    }
    pub fn status(&self, session: &str, id: &str) -> Result<JobStatus, GalleryError> {
        self.state
            .lock()
            .unwrap()
            .as_ref()
            .filter(|a| a.status.id == id && a.status.session_id == session)
            .map(|a| a.status.clone())
            .ok_or_else(|| cache::error("stale_job"))
    }
    pub fn wait(&self, id: &str) -> JobStatus {
        loop {
            let s = self.state.lock().unwrap().as_ref().unwrap().status.clone();
            if s.id != id || s.terminal() {
                return s;
            }
            std::thread::sleep(Duration::from_millis(10));
        }
    }
    pub fn cancel(&self, session: &str, id: &str) -> Result<JobStatus, GalleryError> {
        let s = self.status(session, id)?;
        self.change(id, |a| {
            if a.status.terminal() && a.status.phase != "ready" {
                return;
            }
            a.cancel.cancel();
            if a.busy {
                a.status.phase = "cancelling".into()
            } else {
                a.preview = None;
                a.status.phase = "cancelled".into()
            }
        });
        self.status(&s.session_id, id)
    }
    pub fn retired(&self) -> bool {
        self.closed.load(std::sync::atomic::Ordering::SeqCst)
    }
    pub fn retire(&self) {
        self.closed.store(true, std::sync::atomic::Ordering::SeqCst);
        self.cancel_current();
    }
    pub fn cancel_current(&self) {
        let status = {
            let mut state = self.state.lock().unwrap();
            self.inspection_cancel.lock().unwrap().cancel();
            state.as_mut().and_then(|a| {
                a.cancel.cancel();
                if !a.busy && a.status.phase == "ready" {
                    // Idle previews still own captured root/cache capabilities.
                    // Retiring them must release those handles before relocation.
                    a.preview = None;
                    a.status.phase = "cancelled".into();
                    a.status.sequence = (a.status.sequence.parse::<u64>().unwrap() + 1).to_string();
                    Some(a.status.clone())
                } else {
                    None
                }
            })
        };
        if let Some(status) = status {
            self.notify_status(status);
        }
    }
    pub fn shutdown(&self) {
        self.retire();
        loop {
            if self.state.lock().unwrap().as_ref().is_none_or(|a| !a.busy)
                && !self.inspection.load(std::sync::atomic::Ordering::SeqCst)
            {
                break;
            }
            std::thread::sleep(Duration::from_millis(20));
        }
    }
    pub fn preview(
        self: &Arc<Self>,
        session: &str,
        kind: DestinationKind,
    ) -> Result<JobStatus, GalleryError> {
        let root = self
            .engine
            .capture_current_root(Some(session))?
            .ok_or_else(|| cache::error("stale_session"))?;
        let sources = self.engine.thumbnail_sources(session)?;
        let mut state = self.state.lock().unwrap();
        if state.as_ref().is_some_and(|a| a.busy)
            || self.inspection.load(std::sync::atomic::Ordering::SeqCst)
        {
            return Err(cache::error("preparation_busy"));
        }
        let helper = self.helper.lock().unwrap().clone();
        let id = crate::opaque();
        let status = JobStatus {
            planned_outputs: Vec::new(),
            dropped_planned_outputs: "0".into(),
            id: id.clone(),
            session_id: session.into(),
            sequence: "1".into(),
            kind: "preview".into(),
            phase: "previewing".into(),
            destination_kind: kind,
            destination: self
                .destination(&root, kind)
                .as_deref()
                .map(crate::NativePath::from_path),
            policy: cache::POLICY,
            candidates: Some(sources.len().to_string()),
            completed: "0".into(),
            reused: "0".into(),
            failed: "0".into(),
            skipped: "0".into(),
            remaining: Some(sources.len().to_string()),
            storage_upper_bound_bytes: (sources.len() as u64)
                .checked_mul(cache::ENTRY_LIMIT as u64)
                .map(|n| n.to_string()),
            helper: helper.clone(),
            helper_lifetime: None,
            error: None,
            outcomes: vec![],
            dropped_outcomes: "0".into(),
        };
        let cancel = CancellationToken::new();
        *state = Some(Active {
            status: status.clone(),
            cancel: cancel.clone(),
            preview: None,
            busy: true,
        });
        drop(state);
        let service = self.clone();
        std::thread::spawn(move || {
            let result = service.build_preview(&id, root, kind, sources, helper, cancel);
            match result {
                Ok(preview) => service.change(&id, |a| {
                    a.preview = Some(preview);
                    a.busy = false;
                    a.status.phase = "ready".into();
                    a.status.remaining = Some("0".into())
                }),
                Err(e) => service.finish_error(&id, e),
            }
        });
        Ok(status)
    }
    fn destination(&self, root: &RootGrant, kind: DestinationKind) -> Option<PathBuf> {
        match kind {
            DestinationKind::Portable => Some(root.path.join(cache::PORTABLE)),
            DestinationKind::Local => self.local_base.is_absolute().then(|| {
                self.local_base.join(cache::sha(
                    &serde_json::to_vec(&crate::NativePath::from_path(&root.path)).unwrap(),
                ))
            }),
        }
    }
    fn location(
        &self,
        root: &RootGrant,
        kind: DestinationKind,
        create: bool,
    ) -> Result<Option<CacheDir>, GalleryError> {
        crate::root_identity(&root.dir, &root.path)?;
        match kind {
            DestinationKind::Portable => CacheDir::open(
                root.dir.clone(),
                std::ffi::OsStr::new(cache::PORTABLE),
                create,
            )
            .map(|c| c.map(|c| c.with_parent_path(root.path.clone()))),
            DestinationKind::Local => {
                if !self.local_base.is_absolute() {
                    return Err(cache::error("cache_unavailable"));
                }
                if !self.local_base.exists() {
                    if !create {
                        return Ok(None);
                    }
                    std::fs::create_dir_all(&self.local_base)
                        .map_err(|_| cache::error("cache_unavailable"))?;
                }
                let parent = Dir::open_ambient_dir(&self.local_base, ambient_authority())
                    .map_err(|_| cache::error("cache_unavailable"))?;
                let dest = self
                    .destination(root, kind)
                    .ok_or_else(|| cache::error("cache_unavailable"))?;
                CacheDir::open(Arc::new(parent), dest.file_name().unwrap(), create)
                    .map(|c| c.map(|c| c.with_parent_path(self.local_base.clone())))
            }
        }
    }
    fn read_source(
        &self,
        source: &Source,
        cancel: &CancellationToken,
    ) -> Result<(std::fs::File, String, u64), GalleryError> {
        if cancel.is_cancelled() || source.cancel.is_cancelled() {
            return Err(cache::error("cancelled"));
        }
        let mut opened = self
            .engine
            .open_media(&source.session, &source.item, &source.revision)?;
        let before = opened
            .file
            .metadata()
            .map_err(|_| cache::error("source_changed"))?;
        let hash =
            cache::digest_checked(&mut opened.file, cancel, || source.cancel.is_cancelled())?;
        let after = opened
            .file
            .metadata()
            .map_err(|_| cache::error("source_changed"))?;
        if before.len() != after.len()
            || before.modified().ok() != after.modified().ok()
            || source.cancel.is_cancelled()
        {
            return Err(cache::error("source_changed"));
        }
        self.engine
            .open_media(&source.session, &source.item, &source.revision)?;
        Ok((opened.file, hash, opened.size))
    }
    fn outcome(&self, id: &str, item: &str, code: &str, field: &str) {
        self.change(id, |a| {
            let value = match field {
                "reused" => &mut a.status.reused,
                "skipped" => &mut a.status.skipped,
                "completed" => &mut a.status.completed,
                _ => &mut a.status.failed,
            };
            *value = (value.parse::<u64>().unwrap() + 1).to_string();
            a.status.remaining = a
                .status
                .remaining
                .as_ref()
                .map(|n| n.parse::<u64>().unwrap().saturating_sub(1).to_string());
            if a.status.outcomes.len() == 64 {
                a.status.outcomes.remove(0);
                a.status.dropped_outcomes =
                    (a.status.dropped_outcomes.parse::<u64>().unwrap() + 1).to_string();
            }
            a.status.outcomes.push(ItemOutcome {
                item_id: item.into(),
                code: code.into(),
            });
        })
    }
    fn build_preview(
        &self,
        id: &str,
        root: RootGrant,
        kind: DestinationKind,
        sources: Vec<Source>,
        helper: Option<Helper>,
        cancel: CancellationToken,
    ) -> Result<Preview, GalleryError> {
        let existing = self.location(&root, kind, false)?;
        let mut plans = Vec::new();
        for source in sources {
            if cancel.is_cancelled() {
                return Err(cache::error("cancelled"));
            }
            let provider = if source.kind == "video" {
                match &helper {
                    Some(h) => h.identity(),
                    None => {
                        self.outcome(id, &source.item, "helper_unavailable", "skipped");
                        continue;
                    }
                }
            } else {
                "image-0.25.10".into()
            };
            match self.read_source(&source, &cancel) {
                Ok((_, digest, length)) => {
                    let content = cache::content_key(&digest, &length.to_string());
                    let (slot, reused) = if let Some(c) = &existing {
                        let (s, e, invalid) = c.plan(&source.name, &content, Some(&provider))?;
                        if invalid {
                            self.engine.diagnostics().observation(
                                Event::CacheInvalid,
                                &source.session,
                                &source.item,
                            );
                        }
                        (s, e.is_some())
                    } else {
                        (CacheDir::slot(&source.name, &content, 0), false)
                    };
                    if reused {
                        self.outcome(id, &source.item, "reuse", "reused")
                    } else {
                        self.change(id, |a| {
                            a.status.remaining =
                                a.status.remaining.as_ref().map(|n| {
                                    n.parse::<u64>().unwrap().saturating_sub(1).to_string()
                                })
                        })
                    }
                    self.change(id, |a| {
                        if a.status.planned_outputs.len() < 64 {
                            a.status.planned_outputs.push(PlannedOutput {
                                item_id: source.item.clone(),
                                slot: slot.clone(),
                                reused,
                            });
                        } else {
                            a.status.dropped_planned_outputs =
                                (a.status.dropped_planned_outputs.parse::<u64>().unwrap() + 1)
                                    .to_string();
                        }
                    });
                    plans.push(Planned {
                        source,
                        digest,
                        length,
                        slot,
                        provider,
                        reused,
                    })
                }
                Err(e) => {
                    if e.code == "cancelled" {
                        return Err(e);
                    }
                    self.outcome(id, &source.item, &e.code, "failed")
                }
            }
        }
        Ok(Preview {
            root,
            kind,
            cache: existing,
            plans,
        })
    }
    pub fn start(
        self: &Arc<Self>,
        session: &str,
        id: &str,
        cleanup: bool,
    ) -> Result<JobStatus, GalleryError> {
        let mut state = self.state.lock().unwrap();
        if self.retired() || self.inspection.load(std::sync::atomic::Ordering::SeqCst) {
            return Err(cache::error("preparation_busy"));
        }
        let a = state
            .as_mut()
            .filter(|a| {
                a.status.session_id == session
                    && a.status.id == id
                    && !a.busy
                    && a.status.phase == "ready"
            })
            .ok_or_else(|| cache::error("stale_job"))?;
        let preview = a.preview.take().ok_or_else(|| cache::error("stale_job"))?;
        a.busy = true;
        a.status.kind = if cleanup { "cleanup" } else { "generate" }.into();
        a.status.phase = "running".into();
        if cleanup {
            a.status.candidates = None;
            a.status.remaining = None;
            a.status.completed = "0".into();
            a.status.reused = "0".into();
            a.status.skipped = "0".into();
            a.status.failed = "0".into();
        } else {
            a.status.reused = "0".into();
            a.status.remaining = Some(preview.plans.len().to_string());
        }
        let cancel = a.cancel.clone();
        a.status.sequence = (a.status.sequence.parse::<u64>().unwrap() + 1).to_string();
        let status = a.status.clone();
        drop(state);
        self.notify_status(status.clone());
        let service = self.clone();
        let id = id.to_owned();
        std::thread::spawn(move || {
            if let Err(e) = service.generate(&id, preview, cancel, cleanup) {
                service.finish_error(&id, e)
            }
        });
        Ok(status)
    }
    fn finish_error(&self, id: &str, e: GalleryError) {
        let event = match e.code.as_str() {
            "cancelled" => Event::PreparationCancelled,
            "helper_timeout" => Event::HelperTimeout,
            "helper_failed" => Event::HelperFailed,
            "helper_unavailable" | "helper_identity" => Event::HelperUnavailable,
            "cache_conflict" => Event::Conflict,
            "stale_session" | "root_unavailable" => Event::RootUnavailable,
            _ => Event::PreparationPartial,
        };
        self.engine
            .diagnostics()
            .scoped(event, None, None, None, Some(id), None);
        self.change(id, |a| {
            a.busy = false;
            a.preview = None;
            a.status.phase = if e.code == "cancelled" {
                "cancelled"
            } else {
                "failed"
            }
            .into();
            a.status.error = Some(e.code)
        })
    }
    fn generate(
        &self,
        id: &str,
        preview: Preview,
        cancel: CancellationToken,
        cleanup: bool,
    ) -> Result<(), GalleryError> {
        if cancel.is_cancelled() {
            return Err(cache::error("cancelled"));
        }
        let session = self.status_session(id)?;
        let cache = self.engine.with_current_root(Some(&session), |_| {
            if let Some(c) = &preview.cache {
                c.check()?;
                Ok(c.clone())
            } else {
                if self.location(&preview.root, preview.kind, false)?.is_some() {
                    return Err(cache::error("cache_conflict"));
                }
                self.location(&preview.root, preview.kind, true)?
                    .ok_or_else(|| cache::error("cache_unavailable"))
            }
        })?;
        if cleanup {
            let stats = self.engine.with_current_root(Some(&session), |_| {
                cache.cleanup(&cancel, |stats| {
                    self.change(id, |a| {
                        a.status.completed = stats.removed.to_string();
                        a.status.skipped = stats.retained.to_string();
                        a.status.failed = stats.failed.to_string();
                    })
                })
            })?;
            self.change(id, |a| {
                a.status.candidates = Some(stats.examined.to_string());
                a.status.remaining = Some("0".into());
                a.status.phase = "success".into();
                a.busy = false;
            });
            return Ok(());
        }
        for plan in preview.plans {
            if cancel.is_cancelled() {
                return Err(cache::error("cancelled"));
            }
            let result = (|| {
                let (file, hash, length) = self.read_source(&plan.source, &cancel)?;
                if hash != plan.digest || length != plan.length {
                    return Err(cache::error("source_changed"));
                }
                if plan.reused {
                    return self.engine.with_current_root(Some(&session), |_| {
                        crate::root_identity(&preview.root.dir, &preview.root.path)?;
                        cache.check()?;
                        let bytes =
                            cache::read_bounded(&cache.dir, &plan.slot, cache::ENTRY_LIMIT)?
                                .ok_or_else(|| cache::error("cache_conflict"))?;
                        let entry = CacheEntry::parse(&bytes)?;
                        if entry.source_name != plan.source.name
                            || entry.source_sha256 != hash
                            || entry.source_bytes != length.to_string()
                            || entry.provider != plan.provider
                        {
                            return Err(cache::error("cache_conflict"));
                        }
                        Ok(())
                    });
                }
                let png = if plan.source.kind == "video" {
                    let h = self
                        .helper
                        .lock()
                        .unwrap()
                        .clone()
                        .ok_or_else(|| cache::error("helper_unavailable"))?;
                    if h.identity() != plan.provider {
                        return Err(cache::error("helper_identity"));
                    }
                    h.encode(file,&cancel,||self.change(id,|a|{a.status.helper_lifetime=Some("unknown; admission retained until exit and pipe closure are observed".into());a.status.phase="cancelling".into()}))?
                } else {
                    image_thumbnail(file)?
                };
                if cancel.is_cancelled() || plan.source.cancel.is_cancelled() {
                    return Err(cache::error("cancelled"));
                }
                #[cfg(any(test, feature = "discovery-tests"))]
                self.test_pause(&cancel);
                let entry = CacheEntry::new(
                    plan.source.name.clone(),
                    hash,
                    length,
                    plan.provider.clone(),
                    png,
                    id.into(),
                )?;
                self.engine.with_current_root(Some(&session), |_| {
                    crate::root_identity(&preview.root.dir, &preview.root.path)?;
                    let (_, hash, length) = self.read_source(&plan.source, &cancel)?;
                    if hash != plan.digest || length != plan.length || cancel.is_cancelled() {
                        return Err(cache::error("source_changed"));
                    }
                    cache.check()?;
                    cache.publish(&plan.slot, &entry, &cancel)
                })
            })();
            match result {
                Ok(()) => self.outcome(
                    id,
                    &plan.source.item,
                    if plan.reused { "reused" } else { "complete" },
                    if plan.reused { "reused" } else { "completed" },
                ),
                Err(e) => {
                    if e.code == "cancelled" {
                        return Err(e);
                    }
                    self.engine.diagnostics().scoped(
                        match e.code.as_str() {
                            "helper_timeout" => Event::HelperTimeout,
                            "helper_failed" => Event::HelperFailed,
                            "helper_unavailable" | "helper_identity" => Event::HelperUnavailable,
                            "unsupported_media" => Event::UnsupportedMedia,
                            "cache_storage_full" => Event::StorageFull,
                            "cache_permission" => Event::StoragePermission,
                            _ => Event::PreparationPartial,
                        },
                        None,
                        Some(&session),
                        Some(&plan.source.item),
                        Some(id),
                        None,
                    );
                    self.outcome(id, &plan.source.item, &e.code, "failed")
                }
            }
        }
        let status = self.status(&session, id)?;
        let partial = status.failed != "0" || status.skipped != "0";
        self.engine.diagnostics().scoped(
            if partial {
                Event::PreparationPartial
            } else {
                Event::PreparationComplete
            },
            None,
            Some(&session),
            None,
            Some(id),
            status.completed.parse().ok(),
        );
        self.change(id, |a| {
            a.busy = false;
            a.status.phase = if partial { "partial" } else { "success" }.into();
            a.status.helper_lifetime = if a.status.helper.is_some() {
                Some("exited".into())
            } else {
                None
            }
        });
        Ok(())
    }
    fn status_session(&self, id: &str) -> Result<String, GalleryError> {
        self.state
            .lock()
            .unwrap()
            .as_ref()
            .filter(|a| a.status.id == id)
            .map(|a| a.status.session_id.clone())
            .ok_or_else(|| cache::error("stale_job"))
    }
    pub fn lookup(
        &self,
        session: &str,
        item: &str,
        revision: &str,
        cancel: &CancellationToken,
    ) -> Result<Option<Vec<u8>>, GalleryError> {
        self.lookup_admitted(session, item, revision, cancel, self.validation_permit()?)
    }
    fn lookup_admitted(
        &self,
        session: &str,
        item: &str,
        revision: &str,
        cancel: &CancellationToken,
        _permit: tokio::sync::OwnedSemaphorePermit,
    ) -> Result<Option<Vec<u8>>, GalleryError> {
        let source = self.thumbnail_source(session, item, revision)?;
        let root = self
            .engine
            .capture_current_root(Some(session))?
            .ok_or_else(|| cache::error("stale_session"))?;
        // No cache directory means no source hash. Original media is independently available throughout.
        let mut locations = Vec::new();
        for kind in [DestinationKind::Portable, DestinationKind::Local] {
            match self.location(&root, kind, false) {
                Ok(Some(c)) => match c.has_records() {
                    Ok(true) => locations.push(c),
                    Ok(false) => {}
                    Err(_) => {
                        self.engine
                            .diagnostics()
                            .observation(Event::CacheInvalid, session, item)
                    }
                },
                Ok(None) => {}
                Err(_) => self.engine.diagnostics().record(Event::CacheInvalid),
            }
        }
        if locations.is_empty() {
            return Ok(None);
        }
        let (_, digest, length) = self.read_source(&source, cancel)?;
        let key = cache::content_key(&digest, &length.to_string());
        for cache in locations {
            if let Ok((_, entry, invalid)) = cache.plan(&source.name, &key, None) {
                if invalid {
                    self.engine
                        .diagnostics()
                        .observation(Event::CacheInvalid, session, item);
                }
                let Some(entry) = entry else { continue };
                if cancel.is_cancelled() || source.cancel.is_cancelled() {
                    return Err(cache::error("cancelled"));
                }
                self.engine.capture_current_root(Some(session))?;
                crate::root_identity(&root.dir, &root.path)?;
                return Ok(Some(entry.png()?));
            }
        }
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn child_lifetime_probe() {
        if std::env::args().any(|a| a == "--exact") {
            std::thread::sleep(Duration::from_millis(300));
        }
    }
    #[test]
    fn helper_timeout_observes_real_child_exit_and_bounds_output() {
        let executable = std::env::current_exe().unwrap();
        let cancel = CancellationToken::new();
        let e = run_tool_with_policy(
            &executable,
            &[
                "--exact",
                "thumbnail::tests::child_lifetime_probe",
                "--nocapture",
            ],
            None,
            &cancel,
            65536,
            || {},
            ToolPolicy {
                deadline: Duration::from_millis(20),
                grace: Duration::from_millis(10),
                kill: |child| child.kill(),
            },
        )
        .unwrap_err();
        assert_eq!(e.code, "helper_timeout");
        let e = run_tool(&executable, &["--list"], None, &cancel, 1, || {}).unwrap_err();
        assert_eq!(e.code, "helper_failed");
    }
    #[test]
    fn failed_termination_keeps_worker_until_observed_exit() {
        let unknown = Arc::new(std::sync::atomic::AtomicBool::new(false));
        let observed = unknown.clone();
        let worker = std::thread::spawn(move || {
            run_tool_with_policy(
                &std::env::current_exe().unwrap(),
                &[
                    "--exact",
                    "thumbnail::tests::child_lifetime_probe",
                    "--nocapture",
                ],
                None,
                &CancellationToken::new(),
                65536,
                || observed.store(true, std::sync::atomic::Ordering::SeqCst),
                ToolPolicy {
                    deadline: Duration::from_millis(20),
                    grace: Duration::from_millis(10),
                    kill: |_| Err(std::io::Error::from(std::io::ErrorKind::PermissionDenied)),
                },
            )
        });
        let deadline = Instant::now() + Duration::from_secs(5);
        while !unknown.load(std::sync::atomic::Ordering::SeqCst) {
            assert!(Instant::now() < deadline);
            std::thread::sleep(Duration::from_millis(5));
        }
        assert!(
            !worker.is_finished(),
            "Unknown lifetime cannot release the worker reservation"
        );
        assert_eq!(worker.join().unwrap().unwrap_err().code, "helper_timeout");
    }
    #[test]
    fn all_eight_embedded_orientations_are_applied() {
        use image::ImageEncoder;
        let colors = [[220, 20, 20], [20, 220, 20], [20, 20, 220], [220, 220, 20]];
        let expected = [
            [0, 1, 2, 3],
            [1, 0, 3, 2],
            [3, 2, 1, 0],
            [2, 3, 0, 1],
            [0, 2, 1, 3],
            [2, 0, 3, 1],
            [3, 1, 2, 0],
            [1, 3, 0, 2],
        ];
        for orientation in 1..=8u16 {
            let mut image = image::RgbImage::new(40, 60);
            for (x, y, p) in image.enumerate_pixels_mut() {
                *p = image::Rgb(colors[(x >= 20) as usize + 2 * (y >= 30) as usize]);
            }
            let mut exif = b"II".to_vec();
            exif.extend_from_slice(&42u16.to_le_bytes());
            exif.extend_from_slice(&8u32.to_le_bytes());
            exif.extend_from_slice(&1u16.to_le_bytes());
            exif.extend_from_slice(&0x112u16.to_le_bytes());
            exif.extend_from_slice(&3u16.to_le_bytes());
            exif.extend_from_slice(&1u32.to_le_bytes());
            exif.extend_from_slice(&orientation.to_le_bytes());
            exif.extend_from_slice(&[0, 0]);
            exif.extend_from_slice(&0u32.to_le_bytes());
            let temp = tempfile::tempfile().unwrap();
            let mut encoder =
                image::codecs::jpeg::JpegEncoder::new_with_quality(temp.try_clone().unwrap(), 100);
            encoder.set_exif_metadata(exif).unwrap();
            encoder
                .encode(image.as_raw(), 40, 60, image::ExtendedColorType::Rgb8)
                .unwrap();
            let mut source = temp;
            use std::io::{Seek, SeekFrom};
            source.seek(SeekFrom::Start(0)).unwrap();
            let png = image_thumbnail(source).unwrap();
            let decoded = image::load_from_memory(&png).unwrap().to_rgb8();
            let (w, h) = decoded.dimensions();
            assert_eq!((w, h), if orientation <= 4 { (40, 60) } else { (60, 40) });
            for (index, (x, y)) in [(4, 4), (w - 5, 4), (4, h - 5), (w - 5, h - 5)]
                .into_iter()
                .enumerate()
            {
                let actual = decoded.get_pixel(x, y).0;
                let wanted = colors[expected[orientation as usize - 1][index]];
                for channel in 0..3 {
                    assert!(
                        actual[channel].abs_diff(wanted[channel]) < 20,
                        "orientation {orientation}, corner {index}"
                    );
                }
            }
        }
    }
    #[test]
    fn helper_capabilities_require_input_fd_output_pipe_and_png() {
        assert!(helper_capabilities(
            b"Input:\n fd\nOutput:\n pipe\n",
            b" V....D png PNG encoder\n"
        ));
        assert!(!helper_capabilities(
            b"Input:\n file\nOutput:\n fd\n pipe\n",
            b" V....D png PNG encoder\n"
        ));
        assert!(!helper_capabilities(
            b"Input:\n fd\nOutput:\n pipe\n",
            b" V....D mjpeg JPEG encoder\n"
        ));
    }
}
