// SPDX-License-Identifier: Apache-2.0
use gallery_core::GalleryError;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::Mutex,
};

const MAX_SETTINGS_BYTES: u64 = 1024 * 1024;
pub const FIELDS: &[&str] = &[
    "pageSize",
    "cardSize",
    "fontScale",
    "controlsExpanded",
    "scrollIndicator",
    "metadataExpanded",
    "summaryFields",
    "filter",
    "sort",
    "direction",
];

/// Validate sparse intent against the same contract as legacy preferences.
/// Compatible unknown fields survive in storage, but never become UI settings.
pub fn validate_choices(
    value: &Value,
    test_page_size: bool,
) -> Result<Map<String, Value>, GalleryError> {
    let choices = value
        .as_object()
        .ok_or_else(|| GalleryError::new("settings_invalid", "Choices must be an object."))?;
    let mut merged = serde_json::to_value(Settings::default()).unwrap();
    for (key, value) in choices {
        if FIELDS.contains(&key.as_str()) {
            merged[key] = value.clone();
        }
    }
    Settings::parse(merged, test_page_size)?;
    Ok(choices.clone())
}

pub fn validate_patch(
    value: &Value,
    test_page_size: bool,
) -> Result<Map<String, Value>, GalleryError> {
    let patch = validate_choices(value, test_page_size)?;
    if patch.is_empty() || patch.keys().any(|key| !FIELDS.contains(&key.as_str())) {
        return Err(GalleryError::new(
            "settings_invalid",
            "Change one or more known presentation fields.",
        ));
    }
    Ok(patch)
}

fn default_font_scale() -> u8 {
    100
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum CardSize {
    Small,
    Medium,
    Large,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ScrollIndicator {
    Auto,
    Always,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Filter {
    All,
    Image,
    Video,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Sort {
    Name,
    Modified,
    Size,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    Asc,
    Desc,
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SummaryField {
    pub source: String,
    pub path: Vec<FieldStep>,
}
#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
pub enum FieldStep {
    Key { key: String, occurrence: u32 },
    Index { index: u32 },
}
fn valid_summary_fields(fields: &[SummaryField]) -> bool {
    fields.len() <= 32
        && fields.iter().enumerate().all(|(i, field)| {
            let source = field.source.as_str();
            let valid_native_source =
                source
                    .strip_prefix("index-native:windows:")
                    .is_some_and(|hex| {
                        !hex.is_empty()
                            && hex.len() % 4 == 0
                            && hex
                                .bytes()
                                .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
                    })
                    || source
                        .strip_prefix("index-native:unix:")
                        .is_some_and(|hex| {
                            !hex.is_empty()
                                && hex.len() % 2 == 0
                                && hex
                                    .bytes()
                                    .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
                        });
            let valid_source = valid_native_source
                || matches!(source, "full-name-meta" | "full-name-json" | "stem-json")
                || source.strip_prefix("index:").is_some_and(|name| {
                    !name.is_empty()
                        && name != "."
                        && name != ".."
                        && !name.contains(['/', '\\', '\0'])
                        && !name.contains("://")
                        && !std::path::Path::new(name).is_absolute()
                });
            valid_source
                && source.len() <= 1024
                && field.path.len() <= 64
                && !fields[..i].contains(field)
                && field.path.iter().all(|step| match step {
                    FieldStep::Key { key, occurrence } => key.len() <= 1024 && *occurrence < 20_000,
                    FieldStep::Index { index } => *index < 20_000,
                })
        })
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub version: String,
    pub format_version: u32,
    pub page_size: u16,
    pub card_size: CardSize,
    #[serde(default = "default_font_scale")]
    pub font_scale: u8,
    pub controls_expanded: bool,
    pub scroll_indicator: ScrollIndicator,
    pub metadata_expanded: bool,
    #[serde(default)]
    pub summary_fields: Vec<SummaryField>,
    pub filter: Filter,
    pub sort: Sort,
    pub direction: Direction,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            version: env!("CARGO_PKG_VERSION").into(),
            format_version: 1,
            page_size: 48,
            card_size: CardSize::Medium,
            font_scale: default_font_scale(),
            controls_expanded: false,
            scroll_indicator: ScrollIndicator::Auto,
            metadata_expanded: false,
            summary_fields: vec![],
            filter: Filter::All,
            sort: Sort::Name,
            direction: Direction::Asc,
            extra: Map::new(),
        }
    }
}
impl Settings {
    pub(crate) fn parse(value: Value, test_page_size: bool) -> Result<Self, GalleryError> {
        let settings: Self = serde_json::from_value(value).map_err(|e| {
            GalleryError::new(
                "settings_invalid",
                format!("Preferences contain an invalid or missing field: {e}"),
            )
        })?;
        if settings.version != env!("CARGO_PKG_VERSION") || settings.format_version != 1 {
            return Err(GalleryError::new(
                "settings_version",
                "This settings release or format version is unsupported.",
            ));
        }
        if !(matches!(settings.page_size, 24 | 48 | 96)
            || test_page_size && settings.page_size == 4)
        {
            return Err(GalleryError::new(
                "settings_invalid",
                "Choose a supported page size.",
            ));
        }
        if !matches!(settings.font_scale, 80 | 90 | 100) {
            return Err(GalleryError::new(
                "settings_invalid",
                "Choose a supported global font size.",
            ));
        }
        if !valid_summary_fields(&settings.summary_fields) {
            return Err(GalleryError::new(
                "settings_invalid",
                "Choose at most 32 unique metadata fields with supported relative source and field addresses.",
            ));
        }
        Ok(settings)
    }
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsEnvelope {
    pub settings: Settings,
    pub revision: String,
    pub warning: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub test_page_size: Option<u16>,
}
struct Stored {
    envelope: SettingsEnvelope,
    bytes: Option<Vec<u8>>,
    blocked: bool,
}
pub struct SettingsStore {
    path: PathBuf,
    state: Mutex<Stored>,
    test_page_size: bool,
}
fn revision() -> String {
    uuid::Uuid::new_v4().simple().to_string()
}
fn read_document(path: &Path) -> std::io::Result<Option<Vec<u8>>> {
    let file = match fs::File::open(path) {
        Ok(file) => file,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e),
    };
    let mut bytes = Vec::new();
    file.take(MAX_SETTINGS_BYTES + 1).read_to_end(&mut bytes)?;
    if bytes.len() as u64 > MAX_SETTINGS_BYTES {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Settings exceed the supported one MiB limit.",
        ));
    }
    Ok(Some(bytes))
}
impl SettingsStore {
    pub fn choices(&self) -> Map<String, Value> {
        let state = self.state.lock().unwrap();
        if state.blocked {
            return Map::new();
        }
        state
            .bytes
            .as_ref()
            .and_then(|bytes| serde_json::from_slice::<Value>(bytes).ok())
            .and_then(|value| value.as_object().cloned())
            .unwrap_or_default()
            .into_iter()
            .filter(|(key, _)| FIELDS.contains(&key.as_str()))
            .collect()
    }
    pub fn patch(&self, patch: &Map<String, Value>) -> Result<(), GalleryError> {
        let envelope = self.envelope();
        let mut value = serde_json::to_value(&envelope.settings).unwrap();
        value.as_object_mut().unwrap().extend(patch.clone());
        self.save(value, &envelope.revision).map(|_| ())
    }
    pub fn load(path: PathBuf, test_page_size: bool) -> Self {
        let mut envelope = SettingsEnvelope {
            settings: Settings::default(),
            revision: revision(),
            warning: None,
            test_page_size: test_page_size.then_some(4),
        };
        let mut blocked = false;
        let bytes = match read_document(&path) {
            Ok(bytes) => bytes,
            Err(error) => {
                envelope.warning = Some(format!(
                    "Preferences could not be read: {error}. Defaults are active. Changes remain in memory; repair the settings file and restart to save."
                ));
                blocked = true;
                None
            }
        };
        if let Some(bytes) = &bytes {
            match serde_json::from_slice::<Value>(bytes)
                .map_err(|e| e.to_string())
                .and_then(|value| Settings::parse(value, test_page_size).map_err(|e| e.message))
            {
                Ok(settings) => envelope.settings = settings,
                Err(error) => {
                    envelope.warning = Some(format!(
                        "The settings file was preserved: {error} Defaults are active. Changes remain in memory; repair or remove the file and restart to save."
                    ));
                    blocked = true;
                }
            }
        }
        Self {
            path,
            state: Mutex::new(Stored {
                envelope,
                bytes,
                blocked,
            }),
            test_page_size,
        }
    }
    pub fn unavailable(message: String) -> Self {
        let store = Self::load(PathBuf::new(), false);
        let mut state = store.state.lock().unwrap();
        state.blocked = true;
        state.envelope.warning = Some(message);
        drop(state);
        store
    }
    pub fn envelope(&self) -> SettingsEnvelope {
        self.state.lock().unwrap().envelope.clone()
    }
    pub fn save(
        &self,
        value: Value,
        expected_revision: &str,
    ) -> Result<SettingsEnvelope, GalleryError> {
        let mut settings = Settings::parse(value, self.test_page_size)?;
        let mut state = self.state.lock().unwrap();
        if state.blocked {
            return Err(GalleryError::new(
                "settings_unavailable",
                state.envelope.warning.clone().unwrap_or_else(|| {
                    "Preferences cannot be saved. Changes remain in memory.".into()
                }),
            ));
        }
        if state.envelope.revision != expected_revision {
            return Err(GalleryError::new(
                "settings_conflict",
                "Preferences changed since this save was prepared. Changes remain in memory; restart before saving again.",
            ));
        }
        let parent = self.path.parent().ok_or_else(|| {
            GalleryError::new(
                "settings_unavailable",
                "The user settings directory is unavailable.",
            )
        })?;
        fs::create_dir_all(parent).map_err(save_error)?;
        // An OS file lock coordinates separate app instances. Keep the lock file;
        // deleting it could let another process lock a different file identity.
        let lock = fs::OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(parent.join("settings.lock"))
            .map_err(save_error)?;
        lock.try_lock().map_err(|error| match error {
            fs::TryLockError::WouldBlock => GalleryError::new(
                "settings_conflict",
                "Another application instance is saving preferences. Changes remain in memory.",
            ),
            fs::TryLockError::Error(error) => save_error(error),
        })?;
        if read_document(&self.path).map_err(save_error)? != state.bytes {
            return Err(GalleryError::new(
                "settings_conflict",
                "Another application instance or editor changed settings.json. Changes remain in memory; restart to load it.",
            ));
        }
        for (key, value) in &state.envelope.settings.extra {
            settings
                .extra
                .entry(key.clone())
                .or_insert_with(|| value.clone());
        }
        let mut bytes = serde_json::to_vec_pretty(&settings)
            .map_err(|e| GalleryError::new("settings_invalid", e.to_string()))?;
        bytes.push(b'\n');
        if bytes.len() as u64 > MAX_SETTINGS_BYTES {
            return Err(GalleryError::new(
                "settings_invalid",
                "Preferences exceed the supported one MiB limit.",
            ));
        }
        let next_revision = revision();
        let temporary = parent.join(format!("settings.{next_revision}.tmp"));
        let written = (|| -> std::io::Result<()> {
            let mut file = fs::OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&temporary)?;
            file.write_all(&bytes)?;
            file.sync_all()?;
            drop(file);
            fs::rename(&temporary, &self.path)
        })();
        if let Err(error) = written {
            let _ = fs::remove_file(&temporary);
            return Err(save_error(error));
        }
        state.bytes = Some(bytes);
        state.envelope.settings = settings;
        state.envelope.revision = next_revision;
        state.envelope.warning = None;
        Ok(state.envelope.clone())
    }
}
fn save_error(error: std::io::Error) -> GalleryError {
    GalleryError::new(
        "settings_unavailable",
        format!("Preferences could not be saved: {error}. Changes remain in memory."),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn store(dir: &TempDir) -> SettingsStore {
        SettingsStore::load(dir.path().join("settings.json"), false)
    }
    #[test]
    fn defaults_load_without_writing_and_save_restores_immediately() {
        let dir = TempDir::new().unwrap();
        let store = store(&dir);
        let before = store.envelope();
        assert_eq!(before.settings.page_size, 48);
        assert!(!before.settings.metadata_expanded);
        assert!(!dir.path().join("settings.json").exists());
        let mut next = serde_json::to_value(&before.settings).unwrap();
        next["metadataExpanded"] = true.into();
        next["pageSize"] = 24.into();
        let saved = store.save(next, &before.revision).unwrap();
        assert_ne!(saved.revision, before.revision);
        let reopened = SettingsStore::load(dir.path().join("settings.json"), false).envelope();
        assert_eq!(reopened.settings.page_size, 24);
        assert!(reopened.settings.metadata_expanded);
        assert!(reopened.warning.is_none());
    }
    #[test]
    fn legacy_font_scale_defaults_without_rewriting_or_losing_preferences() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("settings.json");
        let mut legacy = serde_json::to_value(Settings::default()).unwrap();
        legacy.as_object_mut().unwrap().remove("fontScale");
        legacy["pageSize"] = 24.into();
        legacy["metadataExpanded"] = true.into();
        legacy["futurePreference"] = serde_json::json!({"retain": [1, 2]});
        let bytes = serde_json::to_vec(&legacy).unwrap();
        fs::write(&path, &bytes).unwrap();
        let store = store(&dir);
        let loaded = store.envelope();
        let value = serde_json::to_value(&loaded.settings).unwrap();
        assert_eq!(value["fontScale"], 100);
        assert_eq!(loaded.settings.page_size, 24);
        assert!(loaded.settings.metadata_expanded);
        assert!(loaded.warning.is_none());
        assert_eq!(fs::read(&path).unwrap(), bytes);
        let mut next = value;
        next["fontScale"] = 90.into();
        store.save(next, &loaded.revision).unwrap();
        let reopened = SettingsStore::load(path, false).envelope();
        let value = serde_json::to_value(&reopened.settings).unwrap();
        assert_eq!(value["fontScale"], 90);
        assert_eq!(value["pageSize"], 24);
        assert_eq!(value["metadataExpanded"], true);
        assert_eq!(value["futurePreference"], legacy["futurePreference"]);
    }
    #[test]
    fn supported_font_scales_persist_and_restore() {
        let dir = TempDir::new().unwrap();
        let store = store(&dir);
        assert_eq!(
            serde_json::to_value(store.envelope().settings).unwrap()["fontScale"],
            100
        );
        for scale in [80, 90, 100] {
            let before = store.envelope();
            let mut next = serde_json::to_value(&before.settings).unwrap();
            next["fontScale"] = scale.into();
            store.save(next, &before.revision).unwrap();
            let reopened = SettingsStore::load(dir.path().join("settings.json"), false).envelope();
            assert_eq!(
                serde_json::to_value(reopened.settings).unwrap()["fontScale"],
                scale
            );
            assert!(reopened.warning.is_none());
        }
    }
    #[test]
    fn invalid_font_scales_never_replace_valid_settings() {
        let dir = TempDir::new().unwrap();
        let store = store(&dir);
        let before = store.envelope();
        let saved = store
            .save(
                serde_json::to_value(&before.settings).unwrap(),
                &before.revision,
            )
            .unwrap();
        let prior = fs::read(dir.path().join("settings.json")).unwrap();
        for bad in [
            serde_json::json!(0),
            serde_json::json!(79),
            serde_json::json!(95),
            serde_json::json!(101),
            serde_json::json!(80.5),
            serde_json::json!(-1),
            serde_json::json!("90"),
            serde_json::json!(null),
            serde_json::json!(true),
        ] {
            let mut value = serde_json::to_value(&saved.settings).unwrap();
            value["fontScale"] = bad;
            assert_eq!(
                store.save(value, &saved.revision).unwrap_err().code,
                "settings_invalid"
            );
            assert_eq!(fs::read(dir.path().join("settings.json")).unwrap(), prior);
        }
    }
    #[test]
    fn invalid_stored_font_scale_is_preserved_with_default_and_warning() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("settings.json");
        let mut value = serde_json::to_value(Settings::default()).unwrap();
        value["fontScale"] = 95.into();
        let bytes = serde_json::to_vec(&value).unwrap();
        fs::write(&path, &bytes).unwrap();
        let store = store(&dir);
        let loaded = store.envelope();
        assert!(loaded.warning.is_some());
        assert_eq!(
            serde_json::to_value(&loaded.settings).unwrap()["fontScale"],
            100
        );
        assert_eq!(
            store
                .save(
                    serde_json::to_value(&loaded.settings).unwrap(),
                    &loaded.revision
                )
                .unwrap_err()
                .code,
            "settings_unavailable"
        );
        assert_eq!(fs::read(&path).unwrap(), bytes);
    }
    #[test]
    fn invalid_known_values_are_rejected_without_creating_a_file() {
        let dir = TempDir::new().unwrap();
        let store = store(&dir);
        let before = store.envelope();
        for (key, bad) in [
            ("pageSize", serde_json::json!(1)),
            ("sort", serde_json::json!("random")),
            ("metadataExpanded", serde_json::json!("yes")),
            ("version", serde_json::json!("99.0.0")),
            ("formatVersion", serde_json::json!(2)),
        ] {
            let mut value = serde_json::to_value(&before.settings).unwrap();
            value[key] = bad;
            assert!(store.save(value, &before.revision).is_err(), "{key}");
        }
        assert!(!dir.path().join("settings.json").exists());
    }
    #[test]
    fn unknown_compatible_fields_survive_a_known_fields_save() {
        let dir = TempDir::new().unwrap();
        let mut value = serde_json::to_value(Settings::default()).unwrap();
        value["futurePreference"] = serde_json::json!({"nested": ["retain", 3]});
        fs::write(
            dir.path().join("settings.json"),
            serde_json::to_vec(&value).unwrap(),
        )
        .unwrap();
        let store = store(&dir);
        let current = store.envelope();
        let saved = store
            .save(
                serde_json::to_value(Settings::default()).unwrap(),
                &current.revision,
            )
            .unwrap();
        assert_eq!(
            saved.settings.extra["futurePreference"],
            value["futurePreference"]
        );
        let bytes = fs::read(dir.path().join("settings.json")).unwrap();
        assert!(!bytes.starts_with(&[0xef, 0xbb, 0xbf]));
        assert!(!bytes.contains(&b'\r'));
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&bytes).unwrap()["futurePreference"],
            value["futurePreference"]
        );
    }
    #[test]
    fn malformed_and_newer_files_are_preserved_with_visible_fallback() {
        let dir = TempDir::new().unwrap();
        let mut newer = serde_json::to_value(Settings::default()).unwrap();
        newer["formatVersion"] = 2.into();
        for bytes in [b"{broken".to_vec(), serde_json::to_vec(&newer).unwrap()] {
            fs::write(dir.path().join("settings.json"), &bytes).unwrap();
            let store = store(&dir);
            let fallback = store.envelope();
            assert_eq!(fallback.settings.page_size, 48);
            assert!(fallback.warning.is_some());
            assert!(
                store
                    .save(
                        serde_json::to_value(&fallback.settings).unwrap(),
                        &fallback.revision
                    )
                    .is_err()
            );
            assert_eq!(fs::read(dir.path().join("settings.json")).unwrap(), bytes);
        }
    }
    #[test]
    fn stale_and_external_writes_conflict_without_overwriting() {
        let dir = TempDir::new().unwrap();
        let first = store(&dir);
        let second = store(&dir);
        let a = first.envelope();
        let b = second.envelope();
        first
            .save(serde_json::to_value(&a.settings).unwrap(), &a.revision)
            .unwrap();
        assert_eq!(
            first
                .save(serde_json::to_value(&a.settings).unwrap(), &a.revision)
                .unwrap_err()
                .code,
            "settings_conflict"
        );
        assert_eq!(
            second
                .save(serde_json::to_value(&b.settings).unwrap(), &b.revision)
                .unwrap_err()
                .code,
            "settings_conflict"
        );
    }
    #[test]
    fn failed_save_does_not_truncate_prior_settings() {
        let dir = TempDir::new().unwrap();
        let store = store(&dir);
        let before = store.envelope();
        let saved = store
            .save(
                serde_json::to_value(&before.settings).unwrap(),
                &before.revision,
            )
            .unwrap();
        let prior = fs::read(dir.path().join("settings.json")).unwrap();
        fs::remove_file(dir.path().join("settings.lock")).unwrap();
        fs::create_dir(dir.path().join("settings.lock")).unwrap();
        assert!(
            store
                .save(
                    serde_json::to_value(&saved.settings).unwrap(),
                    &saved.revision
                )
                .is_err()
        );
        assert_eq!(fs::read(dir.path().join("settings.json")).unwrap(), prior);
    }
    #[test]
    fn cross_process_lock_contention_is_a_conflict() {
        let dir = TempDir::new().unwrap();
        let store = store(&dir);
        let file = fs::OpenOptions::new()
            .create(true)
            .truncate(false)
            .write(true)
            .read(true)
            .open(dir.path().join("settings.lock"))
            .unwrap();
        file.lock().unwrap();
        let current = store.envelope();
        assert_eq!(
            store
                .save(
                    serde_json::to_value(&current.settings).unwrap(),
                    &current.revision
                )
                .unwrap_err()
                .code,
            "settings_conflict"
        );
        assert!(!dir.path().join("settings.json").exists());
    }
    #[test]
    fn oversized_preferences_are_bounded_and_preserved() {
        let dir = TempDir::new().unwrap();
        let store = store(&dir);
        let current = store.envelope();
        let mut large = serde_json::to_value(&current.settings).unwrap();
        large["largeFutureField"] = "x".repeat(MAX_SETTINGS_BYTES as usize).into();
        assert!(store.save(large, &current.revision).is_err());
        assert!(!dir.path().join("settings.json").exists());
        let bytes = vec![b' '; MAX_SETTINGS_BYTES as usize + 1];
        fs::write(dir.path().join("settings.json"), &bytes).unwrap();
        let reopened = SettingsStore::load(dir.path().join("settings.json"), false);
        let current = reopened.envelope();
        assert!(current.warning.is_some());
        assert!(
            reopened
                .save(
                    serde_json::to_value(&current.settings).unwrap(),
                    &current.revision
                )
                .is_err()
        );
        assert_eq!(fs::read(dir.path().join("settings.json")).unwrap(), bytes);
    }
    #[test]
    fn page_four_is_private_and_only_accepted_in_elected_test_store() {
        let dir = TempDir::new().unwrap();
        let ordinary = store(&dir);
        let initial = ordinary.envelope();
        let mut value = serde_json::to_value(&initial.settings).unwrap();
        value["pageSize"] = 4.into();
        assert!(ordinary.save(value.clone(), &initial.revision).is_err());
        let elected = SettingsStore::load(dir.path().join("settings.json"), true);
        let initial = elected.envelope();
        assert_eq!(initial.test_page_size, Some(4));
        assert!(elected.save(value, &initial.revision).is_ok());
    }
    #[test]
    fn summary_fields_are_known_bounded_and_legacy_default_empty() {
        let base = serde_json::to_value(Settings::default()).unwrap();
        for bad in [
            serde_json::json!("bad"),
            serde_json::json!([{"source":"../private","path":[]}]),
            serde_json::json!([{"source":"full-name-json","path":[{"kind":"key","key":"n","occurrence":-1}]}]),
        ] {
            let mut value = base.clone();
            value["summaryFields"] = bad;
            assert!(Settings::parse(value, false).is_err());
        }
        for source in [
            "index-native:windows:d800002e006a0073006f006e",
            "index-native:unix:ff2e6a736f6e",
        ] {
            assert!(
                validate_patch(
                    &serde_json::json!({"summaryFields":[{"source":source,"path":[]}]}),
                    false
                )
                .is_ok()
            );
        }
        let choice = serde_json::json!({"source":"full-name-json","path":[{"kind":"key","key":"a/b~","occurrence":1},{"kind":"index","index":0}]});
        let mut value = base.clone();
        value["summaryFields"] = serde_json::json!([choice.clone()]);
        assert!(
            validate_patch(
                &serde_json::json!({"summaryFields":[choice.clone()]}),
                false
            )
            .is_ok()
        );
        assert_eq!(
            serde_json::to_value(Settings::parse(value.clone(), false).unwrap()).unwrap()["summaryFields"],
            value["summaryFields"]
        );
        value["summaryFields"] = serde_json::json!([choice.clone(), choice.clone()]);
        assert!(Settings::parse(value.clone(), false).is_err());
        value["summaryFields"] = serde_json::json!(vec![choice; 33]);
        assert!(Settings::parse(value, false).is_err());
        let mut old = base;
        old.as_object_mut().unwrap().remove("summaryFields");
        assert_eq!(
            serde_json::to_value(Settings::parse(old, false).unwrap()).unwrap()["summaryFields"],
            serde_json::json!([])
        );
    }
}
