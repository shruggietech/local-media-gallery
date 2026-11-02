// SPDX-License-Identifier: Apache-2.0
//! Independent preparation actions coordinated around existing native workers.
use crate::{gallery_state::GalleryState, portable::Portable};
use gallery_core::{
    Engine, GalleryError, NativePath, RootGrant,
    thumbnail::{DestinationKind, JobStatus, PreparationService},
};
use gallery_preparation::{Prepared, Release};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use tokio_util::sync::CancellationToken;
#[derive(Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Selection {
    pub presentation: bool,
    pub thumbnails: bool,
    pub recipients: Vec<String>,
}
impl Selection {
    fn validate(&self) -> Result<(), GalleryError> {
        let mut seen = std::collections::BTreeSet::new();
        if self
            .recipients
            .iter()
            .any(|p| !matches!(p.as_str(), "windows" | "linux" | "macos") || !seen.insert(p))
        {
            return Err(error("Choose each supported recipient once."));
        }
        Ok(())
    }
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Action {
    pub name: String,
    pub phase: String,
    pub error: Option<String>,
    pub recipient: Option<gallery_preparation::Preview>,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub id: String,
    pub session_id: String,
    pub sequence: String,
    pub phase: String,
    pub root: NativePath,
    pub selection: Selection,
    pub actions: Vec<Action>,
    pub active_action: Option<String>,
    pub transferred_bytes: String,
    pub thumbnail: Option<JobStatus>,
    pub presentation_bytes: Option<String>,
    pub presentation_sha256: Option<String>,
    pub error: Option<String>,
}
struct Preview {
    root: RootGrant,
    revision: String,
    patch: Value,
    recipients: Vec<Prepared>,
    thumbnail_id: Option<String>,
}
struct Active {
    status: Status,
    cancel: CancellationToken,
    preview: Option<Preview>,
    busy: bool,
}
pub struct Service {
    engine: Engine,
    thumbnails: Arc<PreparationService>,
    settings: Arc<GalleryState>,
    state: Mutex<Option<Active>>,
    closed: AtomicBool,
}
fn error(message: impl ToString) -> GalleryError {
    GalleryError::new("preparation_unavailable", message.to_string())
}
impl Service {
    pub fn new(
        engine: Engine,
        thumbnails: Arc<PreparationService>,
        settings: Arc<GalleryState>,
    ) -> Self {
        Self {
            engine,
            thumbnails,
            settings,
            state: Mutex::new(None),
            closed: AtomicBool::new(false),
        }
    }
    fn change(&self, id: &str, f: impl FnOnce(&mut Status)) {
        if let Some(a) = self
            .state
            .lock()
            .unwrap()
            .as_mut()
            .filter(|a| a.status.id == id)
        {
            f(&mut a.status);
            a.status.sequence = (a.status.sequence.parse::<u64>().unwrap() + 1).to_string();
        }
    }
    fn action(&self, id: &str, name: &str, phase: &str, failure: Option<String>) {
        self.change(id, |s| {
            if let Some(a) = s.actions.iter_mut().find(|a| a.name == name) {
                a.phase = phase.into();
                a.error = failure;
            }
        });
    }
    pub fn status(&self, session: &str, id: &str) -> Result<Status, GalleryError> {
        self.state
            .lock()
            .unwrap()
            .as_ref()
            .filter(|a| a.status.id == id && a.status.session_id == session)
            .map(|a| a.status.clone())
            .ok_or_else(|| error("This preparation job is no longer current."))
    }
    fn cancel_active(a: &mut Active) {
        a.cancel.cancel();
        if a.busy {
            a.status.phase = "cancelling".into();
        } else if a.status.phase == "ready" {
            a.status.phase = "cancelled".into();
            a.preview = None;
        }
        a.status.sequence = (a.status.sequence.parse::<u64>().unwrap() + 1).to_string();
    }
    pub fn cancel_current(&self) {
        if let Some(a) = self.state.lock().unwrap().as_mut() {
            Self::cancel_active(a);
        }
    }
    pub fn cancel_session(&self, session: &str) {
        if let Some(a) = self
            .state
            .lock()
            .unwrap()
            .as_mut()
            .filter(|a| a.status.session_id == session)
        {
            Self::cancel_active(a);
        }
    }
    pub fn cancel(&self, session: &str, id: &str) -> Result<Status, GalleryError> {
        let mut state = self.state.lock().unwrap();
        let a = state
            .as_mut()
            .filter(|a| a.status.session_id == session && a.status.id == id)
            .ok_or_else(|| error("This preparation job is no longer current."))?;
        Self::cancel_active(a);
        Ok(a.status.clone())
    }
    pub fn wait_session_idle(&self, session: &str) {
        while self
            .state
            .lock()
            .unwrap()
            .as_ref()
            .is_some_and(|a| a.status.session_id == session && a.busy)
        {
            std::thread::sleep(Duration::from_millis(20));
        }
    }
    pub fn shutdown(&self) {
        self.closed.store(true, Ordering::SeqCst);
        self.cancel_current();
        while self.state.lock().unwrap().as_ref().is_some_and(|a| a.busy) {
            std::thread::sleep(Duration::from_millis(20));
        }
    }
    pub fn preview(
        self: &Arc<Self>,
        session: &str,
        revision: &str,
        selection: Selection,
    ) -> Result<Status, GalleryError> {
        selection.validate()?;
        let root = self
            .engine
            .capture_current_root(Some(session))?
            .ok_or_else(|| error("Open a gallery first."))?;
        let mut state = self.state.lock().unwrap();
        if self.closed.load(Ordering::SeqCst) || state.as_ref().is_some_and(|a| a.busy) {
            return Err(error("Preparation is already active."));
        }
        let id = uuid::Uuid::new_v4().simple().to_string();
        let cancel = CancellationToken::new();
        let mut names = Vec::new();
        if selection.presentation {
            names.push("presentation".into());
        }
        if selection.thumbnails {
            names.push("thumbnails".into());
        }
        names.extend(selection.recipients.clone());
        let status = Status {
            id: id.clone(),
            session_id: session.into(),
            sequence: "1".into(),
            phase: "previewing".into(),
            root: NativePath::from_path(&root.path),
            selection: selection.clone(),
            actions: names
                .into_iter()
                .map(|name| Action {
                    name,
                    phase: "pending".into(),
                    error: None,
                    recipient: None,
                })
                .collect(),
            active_action: None,
            transferred_bytes: "0".into(),
            thumbnail: None,
            presentation_bytes: None,
            presentation_sha256: None,
            error: None,
        };
        *state = Some(Active {
            status: status.clone(),
            cancel: cancel.clone(),
            preview: None,
            busy: true,
        });
        drop(state);
        let service = self.clone();
        let session = session.to_owned();
        let revision = revision.to_owned();
        std::thread::spawn(move || {
            let result = service.build_preview(&id, &session, root, revision, selection, &cancel);
            let mut state = service.state.lock().unwrap();
            let a = state.as_mut().unwrap();
            match result {
                Ok(preview) if !cancel.is_cancelled() => {
                    a.preview = Some(preview);
                    a.status.phase = "ready".into();
                }
                Ok(_) => a.status.phase = "cancelled".into(),
                Err(e) => {
                    a.status.phase = if cancel.is_cancelled() {
                        "cancelled"
                    } else {
                        "failed"
                    }
                    .into();
                    a.status.error = Some(e.message);
                }
            }
            a.status.active_action = None;
            a.status.sequence = (a.status.sequence.parse::<u64>().unwrap() + 1).to_string();
            a.busy = false;
        });
        Ok(status)
    }
    fn build_preview(
        &self,
        id: &str,
        session: &str,
        root: RootGrant,
        revision: String,
        selection: Selection,
        cancel: &CancellationToken,
    ) -> Result<Preview, GalleryError> {
        let envelope = self.settings.load(Some(session))?;
        gallery_core::root_identity(&root.dir, &root.path)?;
        let mut patch = serde_json::to_value(&envelope.settings).map_err(error)?;
        patch
            .as_object_mut()
            .unwrap()
            .retain(|k, _| crate::settings::FIELDS.contains(&k.as_str()));
        if selection.presentation && envelope.revision != revision {
            self.action(
                id,
                "presentation",
                "failed",
                Some("Presentation changed. Preview preparation again.".into()),
            );
        } else if selection.presentation {
            let result =
                Portable::load(&root.dir, false).prepared_bytes(patch.as_object().unwrap());
            match result {
                Ok(bytes) => {
                    self.change(id, |s| {
                        s.presentation_bytes = Some(bytes.len().to_string());
                        s.presentation_sha256 = Some(gallery_preparation::hash(&bytes));
                    });
                    self.action(id, "presentation", "ready", None);
                }
                Err(e) => self.action(id, "presentation", "failed", Some(e.message)),
            }
        }
        let thumbnail_id = if selection.thumbnails {
            match self.thumbnails.preview(session, DestinationKind::Portable) {
                Ok(job) => {
                    let job_id = job.id;
                    let result = self.wait_thumbnail(id, session, &job_id, cancel)?;
                    self.change(id, |s| s.thumbnail = Some(result.clone()));
                    if result.phase == "ready" {
                        self.action(id, "thumbnails", "ready", None);
                        Some(job_id)
                    } else {
                        self.action(
                            id,
                            "thumbnails",
                            "failed",
                            Some(result.error.unwrap_or(result.phase)),
                        );
                        None
                    }
                }
                Err(e) => {
                    self.action(id, "thumbnails", "failed", Some(e.message));
                    None
                }
            }
        } else {
            None
        };
        let mut recipients = Vec::new();
        if !selection.recipients.is_empty() {
            self.change(id, |s| {
                s.active_action = Some("Resolve published release".into())
            });
            match Release::resolve(cancel, |_| {}) {
                Ok(release) => {
                    for platform in selection.recipients {
                        if cancel.is_cancelled() {
                            return Err(error("cancelled"));
                        }
                        self.change(id, |s| {
                            s.active_action = Some(platform.clone());
                            s.transferred_bytes = "0".into();
                        });
                        match Prepared::acquire(&release, &platform, cancel, |bytes| {
                            self.change(id, |s| s.transferred_bytes = bytes.to_string())
                        }) {
                            Ok(mut p) => {
                                let inspected = p.inspect(&root.dir, cancel);
                                if inspected.is_err() {
                                    p.preview.disposition = "collision".into();
                                }
                                self.change(id, |s| {
                                    let a =
                                        s.actions.iter_mut().find(|a| a.name == platform).unwrap();
                                    a.recipient = Some(p.preview.clone());
                                    a.phase =
                                        if inspected.is_ok() { "ready" } else { "failed" }.into();
                                    a.error = inspected.as_ref().err().cloned();
                                });
                                if inspected.is_ok() {
                                    recipients.push(p);
                                }
                            }
                            Err(e) => self.action(id, &platform, "failed", Some(e)),
                        }
                    }
                }
                Err(e) => {
                    for platform in &selection.recipients {
                        self.action(id, platform, "failed", Some(e.clone()));
                    }
                }
            }
        }
        self.engine.capture_current_root(Some(session))?;
        gallery_core::root_identity(&root.dir, &root.path)?;
        Ok(Preview {
            root,
            revision,
            patch,
            recipients,
            thumbnail_id,
        })
    }
    fn wait_thumbnail(
        &self,
        id: &str,
        session: &str,
        job: &str,
        cancel: &CancellationToken,
    ) -> Result<JobStatus, GalleryError> {
        loop {
            if cancel.is_cancelled() {
                let _ = self.thumbnails.cancel(session, job);
            }
            let status = self.thumbnails.status(session, job)?;
            self.change(id, |s| s.thumbnail = Some(status.clone()));
            if status.terminal() {
                return Ok(status);
            }
            std::thread::sleep(Duration::from_millis(100));
        }
    }
    pub fn start(self: &Arc<Self>, session: &str, id: &str) -> Result<Status, GalleryError> {
        let mut state = self.state.lock().unwrap();
        let a = state
            .as_mut()
            .filter(|a| {
                a.status.id == id
                    && a.status.session_id == session
                    && !a.busy
                    && a.status.phase == "ready"
                    && !a.cancel.is_cancelled()
            })
            .ok_or_else(|| error("Preview preparation again."))?;
        let preview = a
            .preview
            .take()
            .ok_or_else(|| error("Preview is unavailable."))?;
        a.busy = true;
        a.status.phase = "running".into();
        a.status.transferred_bytes = "0".into();
        a.status.sequence = (a.status.sequence.parse::<u64>().unwrap() + 1).to_string();
        let status = a.status.clone();
        let cancel = a.cancel.clone();
        drop(state);
        let service = self.clone();
        let id = id.to_owned();
        let session = session.to_owned();
        std::thread::spawn(move || {
            let result = service.run(&id, &session, preview, &cancel);
            let mut state = service.state.lock().unwrap();
            let a = state.as_mut().unwrap();
            if cancel.is_cancelled() {
                a.status.phase = "cancelled".into();
            } else if let Err(e) = result {
                a.status.phase = "failed".into();
                a.status.error = Some(e.message);
            } else {
                let incomplete = a
                    .status
                    .actions
                    .iter()
                    .any(|a| !matches!(a.phase.as_str(), "success" | "reused"));
                let completed = a
                    .status
                    .actions
                    .iter()
                    .any(|a| matches!(a.phase.as_str(), "success" | "reused"))
                    || a.status
                        .thumbnail
                        .as_ref()
                        .is_some_and(|t| t.completed != "0" || t.reused != "0");
                a.status.phase = if !incomplete {
                    "success"
                } else if completed {
                    "partial"
                } else {
                    "failed"
                }
                .into();
            }
            a.status.active_action = None;
            a.status.sequence = (a.status.sequence.parse::<u64>().unwrap() + 1).to_string();
            a.busy = false;
        });
        Ok(status)
    }
    fn run(
        &self,
        id: &str,
        session: &str,
        preview: Preview,
        cancel: &CancellationToken,
    ) -> Result<(), GalleryError> {
        self.engine.capture_current_root(Some(session))?;
        gallery_core::root_identity(&preview.root.dir, &preview.root.path)?;
        let status = self.status(session, id)?;
        if status.selection.presentation
            && status
                .actions
                .iter()
                .any(|a| a.name == "presentation" && a.phase == "ready")
            && !cancel.is_cancelled()
        {
            self.change(id, |s| s.active_action = Some("presentation".into()));
            match self
                .settings
                .prepare_portable(session, &preview.revision, preview.patch)
            {
                Ok(_) => self.action(id, "presentation", "success", None),
                Err(e) => self.action(id, "presentation", "failed", Some(e.message)),
            }
        }
        if let Some(job) = preview.thumbnail_id
            && !cancel.is_cancelled()
        {
            self.change(id, |s| s.active_action = Some("thumbnails".into()));
            let result = self
                .thumbnails
                .start(session, &job, false)
                .and_then(|_| self.wait_thumbnail(id, session, &job, cancel));
            match result {
                Ok(s) => self.action(id, "thumbnails", &s.phase, s.error),
                Err(e) => self.action(id, "thumbnails", "failed", Some(e.message)),
            }
        }
        for mut recipient in preview.recipients {
            if cancel.is_cancelled() {
                break;
            }
            let name = recipient.preview.platform.clone();
            self.change(id, |s| {
                s.active_action = Some(name.clone());
                s.transferred_bytes = "0".into();
            });
            let result = (|| -> Result<(), GalleryError> {
                self.engine.capture_current_root(Some(session))?;
                recipient
                    .inspect(&preview.root.dir, cancel)
                    .map_err(error)?;
                for index in 0..recipient.files.len() {
                    self.engine.with_current_root(Some(session), |current| {
                        let (dir, path) = current.ok_or_else(|| error("Gallery changed."))?;
                        gallery_core::root_identity(dir, path)?;
                        recipient.commit_file(dir, index, cancel).map_err(error)
                    })?;
                    self.change(id, |s| s.transferred_bytes = (index + 1).to_string());
                }
                self.engine.capture_current_root(Some(session))?;
                recipient
                    .verify_complete(&preview.root.dir, cancel)
                    .map_err(error)
            })();
            match result {
                Ok(()) => self.action(
                    id,
                    &name,
                    if recipient.preview.disposition == "reuse" {
                        "reused"
                    } else {
                        "success"
                    },
                    None,
                ),
                Err(e) => self.action(id, &name, "failed", Some(e.message)),
            }
        }
        if cancel.is_cancelled() {
            self.change(id, |s| {
                for a in &mut s.actions {
                    if matches!(a.phase.as_str(), "ready" | "pending") {
                        a.phase = "cancelled".into();
                    }
                }
            });
        }
        Ok(())
    }
}

#[tauri::command]
pub async fn guided_preview(
    window: tauri::WebviewWindow,
    service: tauri::State<'_, Arc<Service>>,
    session_id: String,
    expected_revision: String,
    selection: Selection,
) -> Result<Status, GalleryError> {
    crate::main_window(&window)?;
    let service = service.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        service.preview(&session_id, &expected_revision, selection)
    })
    .await
    .map_err(|_| error("Preview admission failed."))?
}
#[tauri::command]
pub fn guided_start(
    window: tauri::WebviewWindow,
    service: tauri::State<Arc<Service>>,
    session_id: String,
    preview_id: String,
) -> Result<Status, GalleryError> {
    crate::main_window(&window)?;
    service.start(&session_id, &preview_id)
}
#[tauri::command]
pub fn guided_status(
    window: tauri::WebviewWindow,
    service: tauri::State<Arc<Service>>,
    session_id: String,
    job_id: String,
) -> Result<Status, GalleryError> {
    crate::main_window(&window)?;
    service.status(&session_id, &job_id)
}
#[tauri::command]
pub fn guided_cancel(
    window: tauri::WebviewWindow,
    service: tauri::State<Arc<Service>>,
    session_id: String,
    job_id: String,
) -> Result<Status, GalleryError> {
    crate::main_window(&window)?;
    service.cancel(&session_id, &job_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn fixture() -> (tempfile::TempDir, Arc<Service>, String) {
        let temp = tempfile::tempdir().unwrap();
        let gallery = temp.path().join("gallery");
        std::fs::create_dir(&gallery).unwrap();
        std::fs::write(
            gallery.join("red.png"),
            include_bytes!("../../../../brand/kit/icons/web/favicon-48x48.png"),
        )
        .unwrap();
        let engine = Engine::new();
        let session = engine.open(&gallery).unwrap().session_id.unwrap();
        let thumbnail = Arc::new(PreparationService::new(
            engine.clone(),
            temp.path().join("cache"),
            None,
        ));
        let settings = Arc::new(GalleryState::new(
            engine.clone(),
            crate::settings::SettingsStore::load(temp.path().join("user.json"), false),
            crate::history::History::new(None, false),
        ));
        (
            temp,
            Arc::new(Service::new(engine, thumbnail, settings)),
            session,
        )
    }
    fn settled(service: &Service, session: &str, id: &str) -> Status {
        let end = std::time::Instant::now() + Duration::from_secs(10);
        loop {
            let s = service.status(session, id).unwrap();
            if !matches!(s.phase.as_str(), "previewing" | "running" | "cancelling") {
                return s;
            }
            assert!(std::time::Instant::now() < end, "job deadline");
            std::thread::sleep(Duration::from_millis(10));
        }
    }
    #[test]
    fn stale_job_and_other_session_cancellation_leave_the_current_preview_ready() {
        let (_temp, service, session) = fixture();
        let revision = service.settings.load(Some(&session)).unwrap().revision;
        let old = service
            .preview(&session, &revision, Selection::default())
            .unwrap();
        settled(&service, &session, &old.id);
        let next = service
            .preview(&session, &revision, Selection::default())
            .unwrap();
        settled(&service, &session, &next.id);
        assert!(service.cancel(&session, &old.id).is_err());
        service.cancel_session("retired-session");
        assert_eq!(service.status(&session, &next.id).unwrap().phase, "ready");
        service.start(&session, &next.id).unwrap();
        assert_eq!(settled(&service, &session, &next.id).phase, "success");
        service.shutdown();
        service.thumbnails.shutdown();
    }
    #[test]
    fn unrelated_view_changes_do_not_invalidate_thumbnail_only_preparation() {
        let (_temp, service, session) = fixture();
        let revision = service.settings.load(Some(&session)).unwrap().revision;
        let job = service
            .preview(
                &session,
                &revision,
                Selection {
                    thumbnails: true,
                    ..Selection::default()
                },
            )
            .unwrap();
        settled(&service, &session, &job.id);
        service
            .settings
            .change(
                Some(&session),
                &revision,
                "session",
                json!({"sort":"size"}),
                None,
                false,
            )
            .unwrap();
        service.start(&session, &job.id).unwrap();
        assert_eq!(settled(&service, &session, &job.id).phase, "success");
        service.shutdown();
        service.thumbnails.shutdown();
    }
    #[test]
    fn no_choices_and_independent_presentation_thumbnail_combinations() {
        for (presentation, thumbnails) in
            [(false, false), (true, false), (false, true), (true, true)]
        {
            let (temp, service, session) = fixture();
            let revision = service.settings.load(Some(&session)).unwrap().revision;
            let job = service
                .preview(
                    &session,
                    &revision,
                    Selection {
                        presentation,
                        thumbnails,
                        recipients: vec![],
                    },
                )
                .unwrap();
            assert_eq!(settled(&service, &session, &job.id).phase, "ready");
            let gallery = temp.path().join("gallery");
            assert_eq!(
                std::fs::read_dir(&gallery).unwrap().count(),
                1,
                "preview writes nothing"
            );
            service.start(&session, &job.id).unwrap();
            let terminal = settled(&service, &session, &job.id);
            assert_eq!(
                terminal.phase,
                "success",
                "{}",
                serde_json::to_string(&terminal).unwrap()
            );
            assert_eq!(gallery.join("settings.json").exists(), presentation);
            if presentation {
                let value: Value =
                    serde_json::from_slice(&std::fs::read(gallery.join("settings.json")).unwrap())
                        .unwrap();
                assert_eq!(value["version"], "0.1.0");
                assert_eq!(value["choices"]["pageSize"], 48);
                assert!(
                    !value
                        .to_string()
                        .contains(&temp.path().to_string_lossy().to_string())
                );
            }
            assert!(gallery.join("red.png").is_file());
            service.shutdown();
            service.thumbnails.shutdown();
        }
    }
    #[test]
    fn stale_revision_and_retired_root_cannot_commit() {
        let (temp, service, session) = fixture();
        let revision = service.settings.load(Some(&session)).unwrap().revision;
        let job = service
            .preview(
                &session,
                &revision,
                Selection {
                    presentation: true,
                    ..Selection::default()
                },
            )
            .unwrap();
        settled(&service, &session, &job.id);
        service
            .settings
            .change(
                Some(&session),
                &revision,
                "session",
                json!({"controlsExpanded":true}),
                None,
                false,
            )
            .unwrap();
        service.start(&session, &job.id).unwrap();
        assert_eq!(settled(&service, &session, &job.id).phase, "failed");
        assert!(!temp.path().join("gallery/settings.json").exists());
        let revision = service.settings.load(Some(&session)).unwrap().revision;
        let job = service
            .preview(
                &session,
                &revision,
                Selection {
                    presentation: true,
                    ..Selection::default()
                },
            )
            .unwrap();
        settled(&service, &session, &job.id);
        service.engine.close(&session).unwrap();
        service.start(&session, &job.id).unwrap();
        assert_eq!(settled(&service, &session, &job.id).phase, "failed");
        assert!(!temp.path().join("gallery/settings.json").exists());
        service.shutdown();
        service.thumbnails.shutdown();
    }
    #[test]
    fn presentation_collision_keeps_other_elected_work_and_original_bytes() {
        let (temp, service, session) = fixture();
        std::fs::write(temp.path().join("gallery/settings.json"), b"unrelated").unwrap();
        let revision = service.settings.load(Some(&session)).unwrap().revision;
        let job = service
            .preview(
                &session,
                &revision,
                Selection {
                    presentation: true,
                    thumbnails: true,
                    recipients: vec![],
                },
            )
            .unwrap();
        let ready = settled(&service, &session, &job.id);
        assert_eq!(ready.phase, "ready");
        assert_eq!(ready.actions[0].phase, "failed");
        service.start(&session, &job.id).unwrap();
        let terminal = settled(&service, &session, &job.id);
        assert_eq!(terminal.phase, "partial");
        assert_eq!(terminal.actions[1].phase, "success");
        assert_eq!(
            std::fs::read(temp.path().join("gallery/settings.json")).unwrap(),
            b"unrelated"
        );
        service.shutdown();
        service.thumbnails.shutdown();
    }
    #[test]
    fn canceled_preview_releases_its_staged_work_and_never_writes_gallery() {
        let (temp, service, session) = fixture();
        let revision = service.settings.load(Some(&session)).unwrap().revision;
        let job = service
            .preview(
                &session,
                &revision,
                Selection {
                    presentation: true,
                    ..Selection::default()
                },
            )
            .unwrap();
        service.cancel(&session, &job.id).unwrap();
        assert_eq!(settled(&service, &session, &job.id).phase, "cancelled");
        assert!(service.start(&session, &job.id).is_err());
        assert_eq!(
            std::fs::read_dir(temp.path().join("gallery"))
                .unwrap()
                .count(),
            1
        );
        service.shutdown();
        service.thumbnails.shutdown();
    }
}
