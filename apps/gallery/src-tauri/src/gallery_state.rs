// SPDX-License-Identifier: Apache-2.0
use crate::{
    history::{History, Recent, Remembered, expired, now},
    portable::Portable,
    settings::{FIELDS, Settings, SettingsStore, validate_patch},
};
use gallery_core::{Engine, GalleryError, root_identity};
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
    #[cfg(feature = "native-tests")]
    read_gate: (Mutex<(bool, bool)>, std::sync::Condvar),
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
impl GalleryState {
    pub fn new(engine: Engine, user: SettingsStore, history: History) -> Self {
        if let Some(event) = user.diagnostic() {
            engine.diagnostics().record(event);
        }
        Self {
            engine,
            user,
            history,
            state: Mutex::new(Session::default()),
            #[cfg(feature = "native-tests")]
            read_gate: (Mutex::new((false, false)), std::sync::Condvar::new()),
        }
    }
    #[cfg(feature = "native-tests")]
    pub fn test_profile_read(&self, action: &str) -> Result<bool, GalleryError> {
        let (lock, wake) = &self.read_gate;
        let mut gate = lock.lock().unwrap();
        match action {
            "profile_arm" => *gate = (true, false),
            "profile_release" => {
                gate.0 = false;
                wake.notify_all();
            }
            "profile_status" => {}
            _ => {
                return Err(GalleryError::new(
                    "invalid_test_action",
                    "Unknown profile read test action.",
                ));
            }
        }
        Ok(gate.1)
    }
    #[cfg(feature = "native-tests")]
    fn pause_profile_read(&self) {
        let (lock, wake) = &self.read_gate;
        let mut gate = lock.lock().unwrap();
        if gate.0 {
            gate.1 = true;
            while gate.0 {
                gate = wake.wait(gate).unwrap();
            }
            gate.1 = false;
        }
    }
    fn prepare(
        &self,
        id: Option<&str>,
        root: Option<(&cap_std::fs::Dir, &std::path::Path)>,
    ) -> Result<Session, GalleryError> {
        let mut state = Session {
            initialized: true,
            id: id.map(str::to_owned),
            revision: revision(),
            ..Session::default()
        };
        if let Some((dir, path)) = root {
            #[cfg(feature = "native-tests")]
            self.pause_profile_read();
            state.portable = Some(Portable::load(
                dir,
                self.user.envelope().test_page_size.is_some(),
            ));
            if let Some(event) = state.portable.as_ref().and_then(|p| p.diagnostic) {
                self.engine.diagnostics().record(event);
            }
            if let Err(e) = root_identity(dir, path) {
                self.engine
                    .diagnostics()
                    .record(gallery_core::diagnostics::Event::from_code(&e.code));
                state.warnings.push(e.message);
                return Ok(state);
            }
            // Touch is a write, admitted only while this root still owns authority.
            // Keep touch before recall because expiry can replace its revision.
            self.engine.with_current_root(id, |_| {
                if let Err(e) = self.history.touch(path, now()) {
                    self.engine
                        .diagnostics()
                        .record(gallery_core::diagnostics::Event::from_code(&e.code));
                    state.warnings.push(e.message);
                }
                Ok(())
            })?;
            match self.history.recall(path, now()) {
                Ok(row) => state.remembered = row,
                Err(e) => {
                    self.engine
                        .diagnostics()
                        .record(gallery_core::diagnostics::Event::from_code(&e.code));
                    state.warnings.push(e.message)
                }
            }
        }
        Ok(state)
    }
    fn envelope(&self, state: &Session) -> Envelope {
        let time = now();
        let user = self.user.envelope();
        let user_choices = self.user.choices();
        let empty = Map::new();
        let remembered = state
            .remembered
            .as_ref()
            .filter(|v| !expired(v.last_activity_ms, time))
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
        let recents = match self.history.list(time) {
            Ok(rows) => rows,
            Err(e) => {
                self.engine.diagnostics().observation(
                    gallery_core::diagnostics::Event::from_code(&e.code),
                    state.id.as_deref().unwrap_or(""),
                    "",
                );
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
    pub fn diagnose(&self, e: &GalleryError) {
        self.engine
            .diagnostics()
            .record(gallery_core::diagnostics::Event::from_code(&e.code));
    }
    pub fn load(&self, id: Option<&str>) -> Result<Envelope, GalleryError> {
        self.load_with_probe(id, || {})
            .inspect_err(|e| self.diagnose(e))
    }
    fn load_with_probe(
        &self,
        id: Option<&str>,
        before_read: impl FnOnce(),
    ) -> Result<Envelope, GalleryError> {
        // All state operations acquire state before the commit gate, never Hub -> state.
        let mut state = self.state.lock().unwrap();
        let root = self.engine.capture_current_root(id)?;
        if !state.initialized || state.id.as_deref() != id {
            before_read();
            let prepared = self.prepare(
                id,
                root.as_ref()
                    .map(|root| (root.dir.as_ref(), root.path.as_path())),
            )?;
            let envelope = self.envelope(&prepared);
            self.engine.with_current_root(id, |_| {
                *state = prepared;
                Ok(())
            })?;
            Ok(envelope)
        } else {
            let envelope = self.envelope(&state);
            self.engine.capture_current_root(id)?;
            Ok(envelope)
        }
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
        self.load(id)?;
        let mut state = self.state.lock().unwrap();
        self.engine.with_current_root(id, |root| {
            if state.id.as_deref() != id {
                return Err(GalleryError::new(
                    "stale_session",
                    "Presentation state belongs to another gallery.",
                ));
            }
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
            Ok(())
        })?;
        let envelope = self.envelope(&state);
        self.engine.capture_current_root(id)?;
        Ok(envelope)
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
        self.load(session)?;
        let mut state = self.state.lock().unwrap();
        self.engine.with_current_root(session, |_| {
            if state.id.as_deref() != session {
                return Err(GalleryError::new(
                    "stale_session",
                    "Presentation state belongs to another gallery.",
                ));
            }
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
            Ok(())
        })?;
        let envelope = self.envelope(&state);
        self.engine.capture_current_root(session)?;
        Ok(envelope)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn blocked_profile_read_does_not_block_discovery_controls_or_retirement() {
        use std::sync::{Arc, Barrier, mpsc};
        use std::time::Duration;
        let temp = tempfile::tempdir().unwrap();
        let a = temp.path().join("a");
        let b = temp.path().join("b");
        std::fs::create_dir(&a).unwrap();
        std::fs::create_dir(&b).unwrap();
        let engine = Engine::new();
        let state = Arc::new(GalleryState::new(
            engine.clone(),
            SettingsStore::load(temp.path().join("user/settings.json"), false),
            History::new(Some(temp.path().join("history/history.sqlite3")), false),
        ));
        let id = engine.open(&a).unwrap().session_id.unwrap();
        let request = engine.begin_refresh(&id).unwrap();
        let entered = Arc::new(Barrier::new(2));
        let release = Arc::new(Barrier::new(2));
        let reader = {
            let (state, id, entered, release) =
                (state.clone(), id.clone(), entered.clone(), release.clone());
            std::thread::spawn(move || {
                state.load_with_probe(Some(&id), || {
                    entered.wait();
                    release.wait();
                })
            })
        };
        entered.wait();
        let (send, receive) = mpsc::channel();
        let controls = {
            let engine = engine.clone();
            std::thread::spawn(move || {
                engine.cancel_discovery(&request.id).unwrap();
                assert_eq!(engine.snapshot().discovery.unwrap().phase, "cancelled");
                engine.close(&id).unwrap();
                assert!(engine.snapshot().session_id.is_none());
                engine.open(&b).unwrap();
                send.send(()).unwrap();
            })
        };
        let responsive = receive.recv_timeout(Duration::from_secs(2)).is_ok();
        release.wait();
        controls.join().unwrap();
        let result = reader.join().unwrap();
        assert!(
            responsive,
            "profile reads must not hold the discovery control or root commit lock"
        );
        assert!(matches!(result, Err(GalleryError { ref code, .. }) if code == "stale_session"));
        assert!(
            state.history.list(now()).unwrap().is_empty(),
            "retired read must not create a recent-directory row"
        );
        assert!(!a.join("settings.json").exists());
    }
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
        let alternatives = serde_json::json!({"pageSize":24,"cardSize":"small","fontScale":80,"controlsExpanded":true,"scrollIndicator":"always","metadataExpanded":true,"summaryFields":[{"source":"full-name-json","path":[]}],"loadingMode":"conservative","filter":"video","sort":"size","direction":"desc"});
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
