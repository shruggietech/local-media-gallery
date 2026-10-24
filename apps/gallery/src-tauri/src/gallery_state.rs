// SPDX-License-Identifier: Apache-2.0
use crate::{
    history::{History, Recent, Remembered, now},
    portable::Portable,
    settings::{FIELDS, Settings, SettingsStore, validate_patch},
};
use cap_fs_ext::MetadataExt as _;
use gallery_core::{Engine, GalleryError};
use serde::Serialize;
use serde_json::{Map, Value};
use std::{collections::BTreeMap, sync::Mutex};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Envelope {
    pub settings: Settings,
    pub revision: String,
    pub session_id: Option<String>,
    pub warning: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub test_page_size: Option<u16>,
    pub sources: BTreeMap<String, String>,
    pub saved_to: BTreeMap<String, String>,
    pub layers: BTreeMap<String, Map<String, Value>>,
    pub recents: Vec<Recent>,
    pub destinations: BTreeMap<String, String>,
}
#[derive(Default)]
struct Session {
    initialized: bool,
    id: Option<String>,
    temporary: Map<String, Value>,
    saved_to: BTreeMap<String, String>,
    portable: Option<Portable>,
    remembered: Option<Remembered>,
    warnings: Vec<String>,
    revision: String,
}
pub struct GalleryState {
    engine: Engine,
    user: SettingsStore,
    history: History,
    state: Mutex<Session>,
}
fn revision() -> String {
    uuid::Uuid::new_v4().simple().to_string()
}

pub fn resolve(
    layers: &[(&str, &Map<String, Value>)],
    test: bool,
) -> (Settings, BTreeMap<String, String>) {
    let mut value = serde_json::to_value(Settings::default()).unwrap();
    let mut sources = FIELDS
        .iter()
        .map(|key| (key.to_string(), "default".into()))
        .collect::<BTreeMap<_, _>>();
    for (name, choices) in layers {
        for (key, choice) in *choices {
            if FIELDS.contains(&key.as_str()) {
                value[key] = choice.clone();
                sources.insert(key.clone(), name.to_string());
            }
        }
    }
    (
        Settings::parse(value, test).expect("validated layers"),
        sources,
    )
}
fn root_identity(dir: &cap_std::fs::Dir, path: &std::path::Path) -> Result<(), GalleryError> {
    let observed = (|| -> std::io::Result<bool> {
        let held = dir.dir_metadata()?;
        let current = cap_std::fs::Dir::open_ambient_dir(path, cap_std::ambient_authority())?
            .dir_metadata()?;
        Ok(held.dev() == current.dev() && held.ino() == current.ino())
    })();
    if observed.unwrap_or(false) {
        Ok(())
    } else {
        Err(GalleryError::new(
            "history_identity_changed",
            "This directory's native location changed. Machine-local choices were not read or saved; reopen its current location. Portable settings still use the held gallery.",
        ))
    }
}
impl GalleryState {
    pub fn new(engine: Engine, user: SettingsStore, history: History) -> Self {
        Self {
            engine,
            user,
            history,
            state: Mutex::new(Session::default()),
        }
    }
    fn initialize(
        &self,
        state: &mut Session,
        id: Option<&str>,
        root: Option<(&cap_std::fs::Dir, &std::path::Path)>,
    ) {
        if state.initialized && state.id.as_deref() == id {
            return;
        }
        *state = Session {
            initialized: true,
            id: id.map(str::to_owned),
            revision: revision(),
            ..Session::default()
        };
        if let Some((dir, path)) = root {
            state.portable = Some(Portable::load(
                dir,
                self.user.envelope().test_page_size.is_some(),
            ));
            if let Err(e) = root_identity(dir, path) {
                state.warnings.push(e.message);
                return;
            }
            if let Err(e) = self.history.touch(path, now()) {
                state.warnings.push(e.message);
            }
            match self.history.recall(path, now()) {
                Ok(row) => state.remembered = row,
                Err(e) => state.warnings.push(e.message),
            }
        }
    }
    fn envelope(&self, state: &Session) -> Envelope {
        let user = self.user.envelope();
        let user_choices = self.user.choices();
        let empty = Map::new();
        let remembered = state
            .remembered
            .as_ref()
            .map(|v| &v.choices)
            .unwrap_or(&empty);
        let portable = state
            .portable
            .as_ref()
            .map(|v| &v.choices)
            .unwrap_or(&empty);
        let (settings, sources) = resolve(
            &[
                ("user", &user_choices),
                ("remembered", remembered),
                ("portable", portable),
                ("session", &state.temporary),
            ],
            user.test_page_size.is_some(),
        );
        let mut warnings = state.warnings.clone();
        if let Some(w) = user.warning {
            warnings.push(w);
        }
        if let Some(w) = state.portable.as_ref().and_then(|v| v.warning.clone()) {
            warnings.push(w);
        }
        let recents = match self.history.list(now()) {
            Ok(rows) => rows,
            Err(e) => {
                warnings.push(e.message);
                vec![]
            }
        };
        warnings.sort();
        warnings.dedup();
        let mut destinations = BTreeMap::new();
        destinations.insert("session".into(), "Until this gallery closes".into());
        destinations.insert("user".into(), "User defaults".into());
        if state.id.is_some() {
            destinations.insert(
                "remembered".into(),
                "Machine-local directory history".into(),
            );
            destinations.insert("portable".into(), "settings.json in this gallery".into());
        }
        Envelope {
            settings,
            revision: state.revision.clone(),
            session_id: state.id.clone(),
            warning: (!warnings.is_empty()).then(|| warnings.join(" ")),
            test_page_size: user.test_page_size,
            sources,
            saved_to: state.saved_to.clone(),
            layers: BTreeMap::from([
                ("user".into(), user_choices),
                ("remembered".into(), remembered.clone()),
                ("portable".into(), portable.clone()),
                ("session".into(), state.temporary.clone()),
            ]),
            recents,
            destinations,
        }
    }
    pub fn load(&self, id: Option<&str>) -> Result<Envelope, GalleryError> {
        self.engine.with_current_root(id, |root| {
            let mut state = self.state.lock().unwrap();
            self.initialize(&mut state, id, root);
            Ok(self.envelope(&state))
        })
    }
    pub fn change(
        &self,
        id: Option<&str>,
        expected: &str,
        target: &str,
        patch: Value,
        remove: Option<&str>,
        clear: bool,
    ) -> Result<Envelope, GalleryError> {
        self.engine.with_current_root(id, |root| {
            let mut state = self.state.lock().unwrap();
            self.initialize(&mut state, id, root);
            if state.revision != expected {
                return Err(GalleryError::new(
                    "state_conflict",
                    "Presentation state changed. Retry the current choice.",
                ));
            }
            if !["session", "user", "remembered", "portable"].contains(&target)
                || root.is_none() && ["remembered", "portable"].contains(&target)
            {
                return Err(GalleryError::new(
                    "settings_invalid",
                    "Choose an available save destination.",
                ));
            }
            if let Some(field) = remove
                && (!FIELDS.contains(&field) || !["remembered", "portable"].contains(&target))
            {
                return Err(GalleryError::new(
                    "settings_invalid",
                    "Remove a known remembered or portable field.",
                ));
            }
            if (clear || remove.is_some())
                && (!patch.as_object().is_some_and(|v| v.is_empty()) || clear && remove.is_some())
            {
                return Err(GalleryError::new(
                    "settings_invalid",
                    "Choose one patch, removal or temporary reset operation.",
                ));
            }
            let patch = if clear || remove.is_some() {
                Map::new()
            } else {
                validate_patch(&patch, self.user.envelope().test_page_size.is_some())?
            };
            if clear {
                state.temporary.clear();
                state.saved_to.clear();
            } else {
                for (key, value) in &patch {
                    state.temporary.insert(key.clone(), value.clone());
                    state.saved_to.remove(key);
                }
                let saved = match target {
                    "session" => Ok(()),
                    "user" => self.user.patch(&patch),
                    "portable" => {
                        state
                            .portable
                            .as_mut()
                            .unwrap()
                            .save(root.unwrap().0, &patch, remove)
                    }
                    "remembered" => {
                        let mut choices = state
                            .remembered
                            .as_ref()
                            .map(|v| v.choices.clone())
                            .unwrap_or_default();
                        choices.extend(patch.clone());
                        if let Some(field) = remove {
                            choices.remove(field);
                        }
                        root_identity(root.unwrap().0, root.unwrap().1).and_then(|()| {
                            self.history
                                .save(
                                    root.unwrap().1,
                                    state.remembered.as_ref().map(|v| v.revision.as_str()),
                                    &choices,
                                    now(),
                                )
                                .and_then(|()| {
                                    state.remembered =
                                        self.history.recall(root.unwrap().1, now())?;
                                    Ok(())
                                })
                        })
                    }
                    _ => unreachable!(),
                };
                match saved {
                    Ok(()) => {
                        if let Some(field) = remove {
                            state.temporary.remove(field);
                            state.saved_to.remove(field);
                        }
                        if target != "session" {
                            for key in patch.keys() {
                                state.saved_to.insert(key.clone(), target.into());
                            }
                        }
                    }
                    Err(e) => state.warnings.push(e.message),
                }
            }
            state.revision = revision();
            Ok(self.envelope(&state))
        })
    }
    pub fn recent_path(&self, id: &str) -> Result<std::path::PathBuf, GalleryError> {
        self.history.reopen(id, now())
    }
    pub fn forget(
        &self,
        id: Option<&str>,
        session: Option<&str>,
        expected: &str,
    ) -> Result<Envelope, GalleryError> {
        self.engine.with_current_root(session, |root| {
            let mut state = self.state.lock().unwrap();
            self.initialize(&mut state, session, root);
            if state.revision != expected {
                return Err(GalleryError::new(
                    "state_conflict",
                    "Presentation state changed. Retry this history action.",
                ));
            }
            match self.history.forget(id, now()) {
                Ok(()) => {
                    if id.is_none()
                        || state
                            .remembered
                            .as_ref()
                            .is_some_and(|row| Some(row.id.as_str()) == id)
                    {
                        state.remembered = None;
                    }
                }
                Err(e) => state.warnings.push(e.message),
            }
            state.revision = revision();
            Ok(self.envelope(&state))
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn precedence_explicit_defaults_false_and_omission() {
        let user = json!({"fontScale":90,"controlsExpanded":true,"sort":"size"});
        let remembered = json!({"fontScale":80});
        let portable = json!({"fontScale":100,"metadataExpanded":false});
        let session = json!({"filter":"video"});
        let (settings, sources) = resolve(
            &[
                ("user", user.as_object().unwrap()),
                ("remembered", remembered.as_object().unwrap()),
                ("portable", portable.as_object().unwrap()),
                ("session", session.as_object().unwrap()),
            ],
            false,
        );
        assert_eq!(settings.font_scale, 100);
        assert!(settings.controls_expanded);
        assert!(!settings.metadata_expanded);
        assert_eq!(sources["fontScale"], "portable");
        assert_eq!(sources["metadataExpanded"], "portable");
        assert_eq!(sources["sort"], "user");
        assert_eq!(sources["pageSize"], "default");
        assert_eq!(sources["filter"], "session");
    }
    #[test]
    fn independent_roots_forget_inheritance_and_stale_mutation() {
        let temp = tempfile::tempdir().unwrap();
        let a = temp.path().join("a");
        let b = temp.path().join("b");
        std::fs::create_dir(&a).unwrap();
        std::fs::create_dir(&b).unwrap();
        let engine = Engine::new();
        let state = GalleryState::new(
            engine.clone(),
            SettingsStore::load(temp.path().join("user/settings.json"), false),
            History::new(Some(temp.path().join("history/history.sqlite3")), false),
        );
        let id = engine.open(&a).unwrap().session_id.unwrap();
        let before = state.load(Some(&id)).unwrap();
        let after = state
            .change(
                Some(&id),
                &before.revision,
                "remembered",
                json!({"fontScale":90}),
                None,
                false,
            )
            .unwrap();
        assert!(after.warning.is_none(), "{:?}", after.warning);
        let bid = engine.open(&b).unwrap().session_id.unwrap();
        assert_eq!(state.load(Some(&bid)).unwrap().settings.font_scale, 100);
        assert!(
            state
                .change(
                    Some(&id),
                    &after.revision,
                    "portable",
                    json!({"fontScale":80}),
                    None,
                    false
                )
                .is_err()
        );
        assert!(!a.join("settings.json").exists());
        let id = engine.open(&a).unwrap().session_id.unwrap();
        let before = state.load(Some(&id)).unwrap();
        assert_eq!(before.settings.font_scale, 90);
        let row = before
            .recents
            .iter()
            .find(|r| {
                std::path::Path::new(&r.display_path)
                    .file_name()
                    .is_some_and(|v| v == "a")
            })
            .unwrap();
        let after = state
            .forget(Some(&row.id), Some(&id), &before.revision)
            .unwrap();
        assert_eq!(after.settings.font_scale, 100);
        assert!(after.layers["remembered"].is_empty());
    }
    #[cfg(not(windows))]
    #[test]
    fn renamed_root_keeps_portable_writes_on_the_held_directory() {
        let temp = tempfile::tempdir().unwrap();
        let original = temp.path().join("original");
        let moved = temp.path().join("moved");
        std::fs::create_dir(&original).unwrap();
        let engine = Engine::new();
        let state = GalleryState::new(
            engine.clone(),
            SettingsStore::load(temp.path().join("user/settings.json"), false),
            History::new(Some(temp.path().join("state/history.sqlite3")), false),
        );
        let id = engine.open(&original).unwrap().session_id.unwrap();
        let before = state.load(Some(&id)).unwrap();
        std::fs::rename(&original, &moved).unwrap();
        std::fs::create_dir(&original).unwrap();
        let after = state
            .change(
                Some(&id),
                &before.revision,
                "portable",
                serde_json::json!({"fontScale":90}),
                None,
                false,
            )
            .unwrap();
        assert!(after.warning.is_none());
        assert!(moved.join("settings.json").is_file());
        assert!(!original.join("settings.json").exists());
        let after = state
            .change(
                Some(&id),
                &after.revision,
                "remembered",
                serde_json::json!({"filter":"video"}),
                None,
                false,
            )
            .unwrap();
        assert!(after.warning.unwrap().contains("native location changed"));
        assert_eq!(after.sources["filter"], "session");
        assert!(!after.layers["remembered"].contains_key("filter"));
        let after = state.forget(None, Some(&id), &after.revision).unwrap();
        assert!(after.recents.is_empty());
        assert_eq!(after.settings.font_scale, 90);
        assert_eq!(after.sources["fontScale"], "session");
    }
    #[test]
    fn every_field_and_precedence_pair_resolves_explicit_defaults_and_omission() {
        let defaults = serde_json::to_value(Settings::default()).unwrap();
        let alternatives = serde_json::json!({"pageSize":24,"cardSize":"small","fontScale":80,"controlsExpanded":true,"scrollIndicator":"always","metadataExpanded":true,"filter":"video","sort":"size","direction":"desc"});
        let names = ["user", "remembered", "portable", "session"];
        for lower in 0..names.len() {
            for upper in lower + 1..names.len() {
                for field in FIELDS {
                    let low = Map::from_iter([(field.to_string(), alternatives[field].clone())]);
                    let high = Map::from_iter([(field.to_string(), defaults[field].clone())]);
                    let (resolved, sources) =
                        resolve(&[(names[lower], &low), (names[upper], &high)], false);
                    assert_eq!(
                        serde_json::to_value(resolved).unwrap()[field],
                        defaults[field]
                    );
                    assert_eq!(sources[*field], names[upper]);
                    let (resolved, sources) =
                        resolve(&[(names[lower], &low), (names[upper], &Map::new())], false);
                    assert_eq!(
                        serde_json::to_value(resolved).unwrap()[field],
                        alternatives[field]
                    );
                    assert_eq!(sources[*field], names[lower]);
                }
            }
        }
    }
    #[cfg(windows)]
    #[test]
    fn windows_held_root_prevents_rebinding_and_retired_writes() {
        let temp = tempfile::tempdir().unwrap();
        let original = temp.path().join("original");
        let moved = temp.path().join("moved");
        let other = temp.path().join("other");
        std::fs::create_dir(&original).unwrap();
        std::fs::create_dir(&other).unwrap();
        let engine = Engine::new();
        let state = GalleryState::new(
            engine.clone(),
            SettingsStore::load(temp.path().join("user/settings.json"), false),
            History::new(Some(temp.path().join("state/history.sqlite3")), false),
        );
        let id = engine.open(&original).unwrap().session_id.unwrap();
        let before = state.load(Some(&id)).unwrap();
        assert!(std::fs::rename(&original, &moved).is_err());
        engine
            .with_current_root(Some(&id), |root| {
                assert!(root_identity(root.unwrap().0, &other).is_err());
                Ok(())
            })
            .unwrap();
        let after = state
            .change(
                Some(&id),
                &before.revision,
                "portable",
                serde_json::json!({"fontScale":90}),
                None,
                false,
            )
            .unwrap();
        assert!(after.warning.is_none());
        assert!(original.join("settings.json").is_file());
        assert!(!other.join("settings.json").exists());
        let after = state.forget(None, Some(&id), &after.revision).unwrap();
        assert!(after.recents.is_empty());
        assert_eq!(after.settings.font_scale, 90);
        assert_eq!(after.sources["fontScale"], "session");
        engine.close(&id).unwrap();
        std::fs::rename(&original, &moved).unwrap();
        assert!(
            state
                .change(
                    Some(&id),
                    &after.revision,
                    "portable",
                    serde_json::json!({"fontScale":80}),
                    None,
                    false
                )
                .is_err()
        );
        let value: serde_json::Value =
            serde_json::from_slice(&std::fs::read(moved.join("settings.json")).unwrap()).unwrap();
        assert_eq!(value["choices"]["fontScale"], 90);
    }
}
