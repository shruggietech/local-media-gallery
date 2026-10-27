// SPDX-License-Identifier: Apache-2.0
//! Process-local allowlisted diagnostics. Raw errors, paths and payloads never enter records.
use serde::Serialize;
use std::{
    collections::VecDeque,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticContext {
    pub product: &'static str,
    pub version: &'static str,
    pub edition: String,
    pub os: &'static str,
    pub arch: &'static str,
    pub target: Option<String>,
    pub runtime: Option<String>,
}
impl DiagnosticContext {
    pub fn native(edition: &str, target: Option<&str>, runtime: Option<&str>) -> Self {
        Self {
            product: "local-media-gallery",
            version: env!("CARGO_PKG_VERSION"),
            edition: match edition {
                "full" => "full",
                "lite" => "lite",
                _ => "unknown",
            }
            .into(),
            os: std::env::consts::OS,
            arch: std::env::consts::ARCH,
            target: target
                .filter(|s| {
                    s.len() <= 128
                        && s.bytes()
                            .all(|c| c.is_ascii_alphanumeric() || b"-_.".contains(&c))
                })
                .map(str::to_owned),
            runtime: runtime
                .filter(|s| {
                    s.len() <= 128
                        && s.bytes()
                            .all(|c| c.is_ascii_alphanumeric() || b"-_. ".contains(&c))
                })
                .map(str::to_owned),
        }
    }
}
#[derive(Clone, Copy, Debug)]
pub enum Event {
    RootUnavailable,
    ItemUnavailable,
    UnsupportedMedia,
    StateInvalid,
    StateVersion,
    StateUnavailable,
    Conflict,
    PreparationComplete,
    PreparationPartial,
    PreparationCancelled,
    HelperUnavailable,
    HelperFailed,
    HelperTimeout,
    CacheInvalid,
    StorageFull,
    StoragePermission,
    Internal,
    ImageDecode,
    VideoDecode,
    PlaybackRejected,
    DiscoveryComplete,
    DiscoveryPartial,
    DiscoveryCancelled,
    MediaRead,
}
impl Event {
    pub fn from_code(code: &str) -> Self {
        match code {
            "settings_invalid" | "portable_invalid" | "history_invalid" => Self::StateInvalid,
            "settings_version" | "portable_version" | "history_version" => Self::StateVersion,
            "settings_conflict" | "portable_conflict" | "history_conflict" | "state_conflict"
            | "cache_conflict" => Self::Conflict,
            "settings_unavailable" | "portable_unavailable" | "history_unavailable" => {
                Self::StateUnavailable
            }
            "root_unavailable" | "stale_session" => Self::RootUnavailable,
            "item_unavailable" | "stale_item" | "source_changed" => Self::ItemUnavailable,
            "unsupported_media" => Self::UnsupportedMedia,
            "helper_unavailable" | "helper_identity" => Self::HelperUnavailable,
            "helper_failed" => Self::HelperFailed,
            "helper_timeout" => Self::HelperTimeout,
            "cancelled" => Self::PreparationCancelled,
            "cache_storage_full" => Self::StorageFull,
            "cache_permission" => Self::StoragePermission,
            "cache_invalid" => Self::CacheInvalid,
            _ => Self::Internal,
        }
    }

    fn facts(self) -> (&'static str, &'static str, &'static str, &'static str) {
        match self {
            Self::RootUnavailable => (
                "root",
                "unavailable",
                "root_unavailable",
                "Choose an available directory or retry Refresh.",
            ),
            Self::ItemUnavailable => (
                "media",
                "unavailable",
                "item_unavailable",
                "Refresh the gallery after checking the original file.",
            ),
            Self::UnsupportedMedia => (
                "media",
                "unavailable",
                "unsupported_media",
                "Browse the original with a compatible decoder.",
            ),
            Self::StateInvalid => (
                "state",
                "failed",
                "state_invalid",
                "Preserve the state file; use in-memory defaults or restore a valid backup.",
            ),
            Self::StateVersion => (
                "state",
                "unavailable",
                "state_version",
                "Preserve the state file and use a compatible application version.",
            ),
            Self::StateUnavailable => (
                "state",
                "unavailable",
                "state_unavailable",
                "Check state storage availability; browsing can continue in memory.",
            ),
            Self::Conflict => (
                "state",
                "failed",
                "conflict",
                "Inspect the current destination and obtain a new preview before retrying.",
            ),
            Self::PreparationComplete => (
                "prepare",
                "success",
                "preparation_complete",
                "Completed entries remain available; originals are unchanged.",
            ),
            Self::PreparationPartial => (
                "prepare",
                "partial",
                "preparation_partial",
                "Inspect item outcomes and retry only after resolving their causes.",
            ),
            Self::PreparationCancelled => (
                "prepare",
                "cancelled",
                "preparation_cancelled",
                "Completed entries remain usable. Obtain a new preview to resume.",
            ),
            Self::HelperUnavailable => (
                "helper",
                "unavailable",
                "helper_unavailable",
                "Select an absolute helper executable and verify its displayed identity.",
            ),
            Self::HelperFailed => (
                "helper",
                "failed",
                "helper_failed",
                "Inspect the selected helper capabilities and try the original media.",
            ),
            Self::HelperTimeout => (
                "helper",
                "failed",
                "helper_timeout",
                "Wait for observed process exit before retrying preparation.",
            ),
            Self::StorageFull => (
                "cache",
                "failed",
                "cache_storage_full",
                "Free storage or choose a different cache destination, then preview again. Completed entries and originals remain intact.",
            ),
            Self::StoragePermission => (
                "cache",
                "failed",
                "cache_permission",
                "Check the chosen cache permissions or select another destination, then preview again.",
            ),
            Self::CacheInvalid => (
                "cache",
                "unavailable",
                "cache_invalid",
                "Use originals. Explicit cleanup removes only validated owned entries.",
            ),
            Self::Internal => (
                "internal",
                "failed",
                "internal_error",
                "Retry the operation and explicitly export diagnostics if it persists.",
            ),
            Self::ImageDecode => (
                "media",
                "failed",
                "image_decode",
                "Use a compatible image decoder or inspect the original file.",
            ),
            Self::VideoDecode => (
                "media",
                "failed",
                "video_decode",
                "Use a compatible video decoder or inspect the original file.",
            ),
            Self::PlaybackRejected => (
                "media",
                "failed",
                "playback_rejected",
                "Start playback directly using the player controls.",
            ),
            Self::DiscoveryPartial => (
                "discovery",
                "partial",
                "discovery_partial",
                "Available items remain usable. Retry explicit Refresh after resolving access failures.",
            ),
            Self::DiscoveryCancelled => (
                "discovery",
                "cancelled",
                "discovery_cancelled",
                "Available observations are retained. Use explicit Refresh to resume.",
            ),
            Self::DiscoveryComplete => (
                "discovery",
                "success",
                "discovery_complete",
                "Use explicit Refresh to observe later changes.",
            ),
            Self::MediaRead => (
                "media",
                "failed",
                "media_read",
                "Check the original file and Refresh the gallery.",
            ),
        }
    }
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticRecord {
    pub sequence: String,
    pub time_ms: String,
    pub operation_id: Option<String>,
    pub session_id: Option<String>,
    pub item_id: Option<String>,
    pub job_id: Option<String>,
    pub operation: &'static str,
    pub boundary: &'static str,
    pub status: &'static str,
    pub category: &'static str,
    pub code: &'static str,
    pub message: &'static str,
    pub recovery: &'static str,
    pub count: Option<String>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticReport {
    pub format_version: u8,
    pub context: DiagnosticContext,
    pub records: Vec<DiagnosticRecord>,
    pub dropped: String,
    pub serialized_bytes: String,
    pub contents: &'static str,
}
struct Ring {
    records: VecDeque<(DiagnosticRecord, usize)>,
    bytes: usize,
    sequence: u64,
    dropped: u64,
    observations: VecDeque<String>,
}
pub struct DiagnosticStore {
    context: DiagnosticContext,
    ring: Mutex<Ring>,
}
fn opaque(s: Option<&str>) -> Option<String> {
    s.filter(|s| !s.is_empty() && s.len() <= 64 && s.bytes().all(|b| b.is_ascii_hexdigit()))
        .map(str::to_owned)
}
impl DiagnosticStore {
    pub fn new(context: DiagnosticContext) -> Self {
        Self {
            context,
            ring: Mutex::new(Ring {
                records: VecDeque::new(),
                bytes: 0,
                sequence: 0,
                dropped: 0,
                observations: VecDeque::new(),
            }),
        }
    }
    pub fn record(&self, event: Event) {
        self.scoped(event, None, None, None, None, None)
    }
    pub fn scoped(
        &self,
        event: Event,
        operation: Option<&str>,
        session: Option<&str>,
        item: Option<&str>,
        job: Option<&str>,
        count: Option<u64>,
    ) {
        let (kind, status, code, recovery) = event.facts();
        let mut ring = self.ring.lock().unwrap();
        ring.sequence = ring.sequence.saturating_add(1);
        let record = DiagnosticRecord {
            sequence: ring.sequence.to_string(),
            time_ms: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
                .to_string(),
            operation_id: opaque(operation),
            session_id: opaque(session),
            item_id: opaque(item),
            job_id: opaque(job),
            operation: kind,
            boundary: "observed",
            status,
            category: code,
            code,
            message: code,
            recovery,
            count: count.map(|n| n.to_string()),
        };
        let size = serde_json::to_vec(&record)
            .expect("fixed diagnostic serialization")
            .len();
        if size > 262144 {
            ring.dropped = ring.dropped.saturating_add(1);
            return;
        }
        while ring.records.len() >= 256 || ring.bytes + size > 262144 {
            if let Some((_, n)) = ring.records.pop_front() {
                ring.bytes -= n;
                ring.dropped = ring.dropped.saturating_add(1);
            } else {
                break;
            }
        }
        ring.bytes += size;
        ring.records.push_back((record, size));
    }
    pub fn discovery(&self, id: &str, session: Option<&str>, phase: &str, count: u64) {
        let event = match phase {
            "complete" => Event::DiscoveryComplete,
            "partial" => Event::DiscoveryPartial,
            "cancelled" => Event::DiscoveryCancelled,
            "unavailable" => Event::RootUnavailable,
            "failed" => Event::Internal,
            _ => return,
        };
        {
            let mut r = self.ring.lock().unwrap();
            let key = format!("discovery:{id}");
            if r.observations.contains(&key) {
                return;
            }
            if r.observations.len() >= 256 {
                r.observations.pop_front();
            }
            r.observations.push_back(key);
        }
        self.scoped(event, Some(id), session, None, None, Some(count));
    }
    pub fn observation(&self, event: Event, session: &str, item: &str) {
        let key = format!("{session}:{item}:{}", event.facts().2);
        {
            let mut r = self.ring.lock().unwrap();
            if r.observations.contains(&key) {
                return;
            }
            if r.observations.len() >= 256 {
                r.observations.pop_front();
            }
            r.observations.push_back(key);
        }
        self.scoped(event, None, Some(session), Some(item), None, None)
    }
    pub fn snapshot(&self) -> DiagnosticReport {
        let r = self.ring.lock().unwrap();
        DiagnosticReport {
            format_version: 1,
            context: self.context.clone(),
            records: r.records.iter().map(|(v, _)| v.clone()).collect(),
            dropped: r.dropped.to_string(),
            serialized_bytes: r.bytes.to_string(),
            contents: "Product/version/edition/runtime context and bounded operation categories, opaque identities, exact counts and recovery guidance. No paths, credentials, raw errors, media or sidecar contents. Process memory only; export is explicit.",
        }
    }
}
