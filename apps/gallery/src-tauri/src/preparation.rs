// SPDX-License-Identifier: Apache-2.0
use crate::{launch, main_window};
use gallery_core::{
    Engine, GalleryError,
    diagnostics::{DiagnosticContext, DiagnosticReport, Event},
    thumbnail::{DestinationKind, Helper, JobStatus, PreparationService},
};
use std::{
    path::{Path, PathBuf},
    sync::Arc,
};
use tauri::{State, WebviewWindow};
use tauri_plugin_dialog::DialogExt;
pub fn context() -> DiagnosticContext {
    let runtime = tauri::webview_version().ok().map(|version| {
        format!(
            "{} {version}",
            match std::env::consts::OS {
                "windows" => "WebView2",
                "macos" => "WKWebView",
                "linux" => "WebKitGTK",
                _ => "WebView",
            }
        )
    });
    DiagnosticContext::native(
        if cfg!(feature = "lite") {
            "lite"
        } else {
            "full"
        },
        Some(&launch::target_triple()),
        runtime.as_deref(),
    )
}
pub fn cache_root() -> Result<PathBuf, GalleryError> {
    crate::storage::cache_root()
}
/// Full's installer owns this metadata and helper next to the executable.
/// Lite never searches the sender profile or PATH for an automatic helper.
pub fn installed_helper() -> Result<Option<Helper>, GalleryError> {
    if cfg!(feature = "lite") {
        return Ok(None);
    }
    let executable =
        std::env::current_exe().map_err(|_| gallery_core::cache::error("helper_unavailable"))?;
    let directory = installed_helper_directory(&executable)?;
    let Some((binary, sha256)) = installed_helper_identity(&directory)? else {
        return Ok(None);
    };
    let mut helper = Helper::select(directory.join(binary), Some(&sha256))?;
    helper.origin = "bundled Full dependency; verified against installed helper metadata";
    Ok(Some(helper))
}
fn installed_helper_directory(executable: &Path) -> Result<PathBuf, GalleryError> {
    // macOS can report the command symlink as current_exe. Resolve that actual
    // executable before looking for its adjacent managed metadata and helper.
    let executable = std::fs::canonicalize(executable)
        .map_err(|_| gallery_core::cache::error("helper_unavailable"))?;
    if !std::fs::metadata(&executable).is_ok_and(|m| m.is_file()) {
        return Err(gallery_core::cache::error("helper_unavailable"));
    }
    executable
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| gallery_core::cache::error("helper_unavailable"))
}
fn installed_helper_identity(directory: &Path) -> Result<Option<(String, String)>, GalleryError> {
    use std::io::Read;
    let file = directory.join("feature-helper.json");
    let stat = match std::fs::symlink_metadata(&file) {
        Ok(value) => value,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err(gallery_core::cache::error("helper_unavailable")),
    };
    if !stat.is_file() || stat.is_symlink() || stat.len() > 1024 * 1024 {
        return Err(gallery_core::cache::error("helper_identity"));
    }
    let mut bytes = Vec::new();
    std::fs::File::open(&file)
        .and_then(|file| file.take(1024 * 1024 + 1).read_to_end(&mut bytes))
        .map_err(|_| gallery_core::cache::error("helper_unavailable"))?;
    if bytes.len() > 1024 * 1024 {
        return Err(gallery_core::cache::error("helper_identity"));
    }
    let metadata: serde_json::Value = serde_json::from_slice(&bytes)
        .map_err(|_| gallery_core::cache::error("helper_identity"))?;
    let expected = if cfg!(windows) {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    };
    let binary = metadata["binary"].as_str().unwrap_or("");
    let sha256 = metadata["sha256"].as_str().unwrap_or("");
    if binary != expected
        || sha256.len() != 64
        || !sha256
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
        || !std::fs::symlink_metadata(directory.join(binary))
            .is_ok_and(|s| s.is_file() && !s.is_symlink())
    {
        return Err(gallery_core::cache::error("helper_identity"));
    }
    Ok(Some((binary.into(), sha256.into())))
}
#[tauri::command]
pub async fn preparation_preview(
    window: WebviewWindow,
    service: State<'_, Arc<PreparationService>>,
    session_id: String,
    destination_kind: DestinationKind,
) -> Result<JobStatus, GalleryError> {
    main_window(&window)?;
    let service = service.inner().clone();
    tauri::async_runtime::spawn_blocking(move || service.preview(&session_id, destination_kind))
        .await
        .map_err(|_| GalleryError::new("internal", "Preview admission failed."))?
}
#[tauri::command]
pub fn preparation_start(
    window: WebviewWindow,
    service: State<Arc<PreparationService>>,
    session_id: String,
    preview_id: String,
) -> Result<JobStatus, GalleryError> {
    main_window(&window)?;
    service.start(&session_id, &preview_id, false)
}
#[tauri::command]
pub fn preparation_cleanup(
    window: WebviewWindow,
    service: State<Arc<PreparationService>>,
    session_id: String,
    preview_id: String,
) -> Result<JobStatus, GalleryError> {
    main_window(&window)?;
    service.start(&session_id, &preview_id, true)
}
#[tauri::command]
pub fn preparation_cancel(
    window: WebviewWindow,
    service: State<Arc<PreparationService>>,
    session_id: String,
    job_id: String,
) -> Result<JobStatus, GalleryError> {
    main_window(&window)?;
    service.cancel(&session_id, &job_id)
}
#[tauri::command]
pub fn preparation_status(
    window: WebviewWindow,
    service: State<Arc<PreparationService>>,
    session_id: String,
    job_id: String,
) -> Result<JobStatus, GalleryError> {
    main_window(&window)?;
    service.status(&session_id, &job_id)
}
#[tauri::command]
pub async fn select_thumbnail_helper(
    window: WebviewWindow,
    service: State<'_, Arc<PreparationService>>,
) -> Result<Option<Helper>, GalleryError> {
    main_window(&window)?;
    let picker = window
        .dialog()
        .file()
        .set_parent(&window)
        .set_title("Select optional FFmpeg executable (no download)");
    let selected = tauri::async_runtime::spawn_blocking(move || picker.blocking_pick_file())
        .await
        .map_err(|_| GalleryError::new("picker_failed", "The helper picker could not open."))?;
    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = selected
        .into_path()
        .map_err(|_| GalleryError::new("helper_unavailable", "Choose a local executable."))?;
    let selected_service = service.inner().clone();
    let helper =
        tauri::async_runtime::spawn_blocking(move || selected_service.inspect_helper(path, None))
            .await
            .map_err(|_| GalleryError::new("internal", "Helper inspection failed."))??;
    Ok(Some(helper))
}
#[tauri::command]
pub fn preparation_cancel_inspection(
    window: WebviewWindow,
    service: State<Arc<PreparationService>>,
) -> Result<(), GalleryError> {
    main_window(&window)?;
    service.cancel_current();
    Ok(())
}
#[tauri::command]
pub fn cache_interest(
    window: WebviewWindow,
    service: State<Arc<PreparationService>>,
    session_id: String,
    item_id: String,
    item_revision: String,
) -> Result<String, GalleryError> {
    main_window(&window)?;
    service.interest(&session_id, &item_id, &item_revision)
}
#[tauri::command]
pub fn cache_cancel(
    window: WebviewWindow,
    service: State<Arc<PreparationService>>,
    interest_id: String,
) -> Result<(), GalleryError> {
    main_window(&window)?;
    service.retire_interest(&interest_id);
    Ok(())
}
#[tauri::command]
pub fn diagnostics_snapshot(
    window: WebviewWindow,
    runtime: State<crate::Runtime>,
) -> Result<DiagnosticReport, GalleryError> {
    main_window(&window)?;
    Ok(runtime.engine.diagnostics().snapshot())
}
#[tauri::command]
pub async fn diagnostics_export(
    window: WebviewWindow,
    runtime: State<'_, crate::Runtime>,
) -> Result<bool, GalleryError> {
    main_window(&window)?;
    let report = runtime.engine.diagnostics().snapshot();
    let picker = window
        .dialog()
        .file()
        .set_parent(&window)
        .set_title(
            "Export diagnostics: context, categories, opaque IDs and recovery; no paths or media",
        )
        .set_file_name("local-media-gallery-diagnostics.json");
    let selected = tauri::async_runtime::spawn_blocking(move || picker.blocking_save_file())
        .await
        .map_err(|_| GalleryError::new("picker_failed", "The export picker could not open."))?;
    let Some(selected) = selected else {
        return Ok(false);
    };
    let path = selected
        .into_path()
        .map_err(|_| GalleryError::new("export_unavailable", "Choose a local destination."))?;
    tauri::async_runtime::spawn_blocking(move || export(&path, &report))
        .await
        .map_err(|_| GalleryError::new("internal", "Diagnostic export failed."))??;
    Ok(true)
}
pub fn export(path: &Path, report: &DiagnosticReport) -> Result<(), GalleryError> {
    use std::io::Write;
    let mut bytes = serde_json::to_vec_pretty(report)
        .map_err(|_| GalleryError::new("internal", "Diagnostic serialization failed."))?;
    bytes.push(b'\n');
    let mut f = std::fs::OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(path)
        .map_err(|_| {
            GalleryError::new(
                "export_unavailable",
                "Export requires a new writable file. Existing content was preserved.",
            )
        })?;
    f.write_all(&bytes).and_then(|_|f.sync_all()).map_err(|_|GalleryError::new("export_partial","Export may be incomplete. Preserve or remove the user-selected output before retrying."))
}
#[derive(Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Observation {
    ImageDecode,
    VideoDecode,
    PlaybackRejected,
}
#[tauri::command]
pub fn report_media_observation(
    window: WebviewWindow,
    runtime: State<crate::Runtime>,
    session_id: String,
    item_id: String,
    item_revision: String,
    observation: Observation,
) -> Result<(), GalleryError> {
    main_window(&window)?;
    runtime
        .engine
        .open_media(&session_id, &item_id, &item_revision)?;
    runtime.engine.diagnostics().observation(
        match observation {
            Observation::ImageDecode => Event::ImageDecode,
            Observation::VideoDecode => Event::VideoDecode,
            Observation::PlaybackRejected => Event::PlaybackRejected,
        },
        &session_id,
        &item_id,
    );
    Ok(())
}
pub fn finite(
    request: &launch::Request,
    id: String,
    root: Option<&Path>,
) -> launch::OperationResult {
    use launch::{Operation, OperationResult, Status};
    let engine = Engine::with_diagnostics(context());
    if request.operation == Operation::Diagnostics {
        let mut result =
            OperationResult::new(Operation::Diagnostics, id, "information", Status::Success);
        result.data = Some(
            serde_json::json!({"diagnostics":engine.diagnostics().snapshot(),"scope":"this invocation only"}),
        );
        return result;
    }
    let run = (|| -> Result<_, GalleryError> {
        let path = root.ok_or_else(|| {
            GalleryError::new(
                "root_unavailable",
                "Supply a directory for finite preparation.",
            )
        })?;
        let bundled = if request.preparation.helper.is_some() {
            None
        } else {
            installed_helper()?
        };
        let service = Arc::new(PreparationService::new(
            engine.clone(),
            cache_root()?,
            bundled,
        ));
        let signal_service = service.clone();
        let signal_engine = engine.clone();
        launch::attach_terminal();
        ctrlc::set_handler(move || {
            signal_service.retire();
            if let Some(d) = signal_engine.snapshot().discovery {
                let _ = signal_engine.cancel_discovery(&d.id);
            }
        })
        .map_err(|_| {
            GalleryError::new(
                "signal_unavailable",
                "Cancellation handling could not be installed.",
            )
        })?;
        if let Some(helper) = &request.preparation.helper {
            service.inspect_helper(helper.clone(), request.preparation.helper_hash.as_deref())?;
        }
        if service.retired() {
            return Err(gallery_core::cache::error("cancelled"));
        }
        let snapshot = engine.open(path)?;
        if service.retired() || snapshot.status == "cancelled" {
            return Err(gallery_core::cache::error("cancelled"));
        }
        if snapshot.status == "unavailable" {
            engine.diagnostics().record(Event::RootUnavailable);
            return Err(GalleryError::new(
                "root_unavailable",
                "The gallery directory is unavailable.",
            ));
        }
        let session = snapshot.session_id.clone().ok_or_else(|| {
            GalleryError::new("root_unavailable", "The gallery directory is unavailable.")
        })?;
        let job = service.preview(
            &session,
            if request.preparation.portable {
                DestinationKind::Portable
            } else {
                DestinationKind::Local
            },
        )?;
        let mut terminal = service.wait(&job.id);
        if terminal.phase == "ready"
            && (request.preparation.thumbnails || request.preparation.clean_cache)
        {
            service.start(&session, &job.id, request.preparation.clean_cache)?;
            terminal = service.wait(&job.id)
        }
        service.shutdown();
        Ok((snapshot, terminal))
    })();
    let mut result = match run {
        Ok((snapshot, terminal)) => preparation_result(id, snapshot, terminal),
        Err(e) => {
            engine.diagnostics().record(match e.code.as_str() {
                "root_unavailable" => Event::RootUnavailable,
                "helper_unavailable" | "helper_identity" => Event::HelperUnavailable,
                _ => Event::Internal,
            });
            let cancelled = e.code == "cancelled";
            let mut result = OperationResult::failure(Operation::Prepare, id, e);
            if cancelled {
                result.status = Status::Cancelled;
            } else if matches!(
                result.error.as_ref().map(|e| e.code.as_str()),
                Some("root_unavailable" | "helper_unavailable" | "cache_unavailable")
            ) {
                result.status = Status::Unavailable;
            }
            result
        }
    };
    result.root = root.map(gallery_core::NativePath::from_path);
    if request.preparation.diagnostics {
        let data = result.data.get_or_insert_with(|| serde_json::json!({}));
        data["diagnostics"] = serde_json::to_value(engine.diagnostics().snapshot()).unwrap();
    }
    result
}

fn preparation_result(
    id: String,
    snapshot: gallery_core::Snapshot,
    terminal: gallery_core::thumbnail::JobStatus,
) -> launch::OperationResult {
    use launch::{Operation, OperationResult, Status};
    let mut status = match terminal.phase.as_str() {
        "success" | "ready" => Status::Success,
        "partial" => Status::Partial,
        "cancelled" => Status::Cancelled,
        "unavailable" => Status::Unavailable,
        _ => Status::Failed,
    };
    if matches!(status, Status::Success | Status::Partial) {
        status = match snapshot.status.as_str() {
            "complete" => status,
            "partial" => Status::Partial,
            "cancelled" => Status::Cancelled,
            "unavailable" => Status::Unavailable,
            _ => Status::Failed,
        };
    }
    let mut result = OperationResult::new(Operation::Prepare, id, "finite-job", status);
    result.session_id = snapshot.session_id;
    if let Some(discovery) = &snapshot.discovery {
        result.discovery_operation_id = Some(discovery.id.clone());
        result.progress = Some(launch::Progress {
            entries_seen: discovery.entries_seen.clone(),
            media_seen: discovery.media_seen.clone(),
        });
    }
    result.error = terminal.error.as_ref().map(|c| launch::OperationError {
        code: c.clone(),
        message: "Preparation did not complete. Inspect the job and diagnostics for recovery."
            .into(),
    });
    result.data = Some(
        serde_json::json!({"preparation":terminal,"discovery":snapshot.discovery.map(|d|serde_json::json!({"id":d.id,"phase":d.phase,"entriesSeen":d.entries_seen,"mediaSeen":d.media_seen}))}),
    );
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn installed_helper_directory_uses_physical_executable_and_refuses_missing_or_directory() {
        let root = tempfile::tempdir().unwrap();
        let executable = root.path().join("app");
        std::fs::write(&executable, b"application").unwrap();
        assert_eq!(
            installed_helper_directory(&executable).unwrap(),
            std::fs::canonicalize(root.path()).unwrap()
        );
        assert!(installed_helper_directory(root.path()).is_err());
        assert!(installed_helper_directory(&root.path().join("missing")).is_err());
    }
    #[cfg(unix)]
    #[test]
    fn installed_helper_follows_the_invoked_command_to_the_actual_owned_executable() {
        use std::os::unix::fs::symlink;
        let root = tempfile::tempdir().unwrap();
        let application = root.path().join("Applications/Full 雪.app/Contents/MacOS");
        std::fs::create_dir_all(&application).unwrap();
        let executable = application.join("local-media-gallery");
        std::fs::write(&executable, b"application").unwrap();
        std::fs::write(application.join("ffmpeg"), b"bundled helper").unwrap();
        std::fs::write(
            application.join("feature-helper.json"),
            serde_json::to_vec(&serde_json::json!({"binary":"ffmpeg","sha256":"a".repeat(64)}))
                .unwrap(),
        )
        .unwrap();
        let bin = root.path().join("bin");
        std::fs::create_dir(&bin).unwrap();
        let command = bin.join("local-media-gallery");
        symlink(&executable, &command).unwrap();
        assert!(installed_helper_identity(&bin).unwrap().is_none());
        let directory = installed_helper_directory(&command).unwrap();
        assert_eq!(directory, std::fs::canonicalize(&application).unwrap());
        assert_eq!(
            installed_helper_identity(&directory).unwrap(),
            Some(("ffmpeg".into(), "a".repeat(64)))
        );
        std::fs::remove_file(&executable).unwrap();
        assert!(installed_helper_directory(&command).is_err());
    }
    #[test]
    fn installed_helper_metadata_is_bounded_and_never_selects_external_paths() {
        let root = tempfile::tempdir().unwrap();
        assert!(installed_helper_identity(root.path()).unwrap().is_none());
        let expected = if cfg!(windows) {
            "ffmpeg.exe"
        } else {
            "ffmpeg"
        };
        std::fs::write(root.path().join(expected), b"fixture").unwrap();
        let file = root.path().join("feature-helper.json");
        for value in [
            serde_json::json!({"binary":"../outside","sha256":"a".repeat(64)}),
            serde_json::json!({"binary":expected,"sha256":"invalid"}),
            serde_json::json!({"binary":"/usr/bin/ffmpeg","sha256":"a".repeat(64)}),
        ] {
            std::fs::write(&file, serde_json::to_vec(&value).unwrap()).unwrap();
            assert!(installed_helper_identity(root.path()).is_err());
        }
        std::fs::write(
            &file,
            serde_json::to_vec(&serde_json::json!({"binary":expected,"sha256":"a".repeat(64)}))
                .unwrap(),
        )
        .unwrap();
        assert_eq!(
            installed_helper_identity(root.path()).unwrap(),
            Some((expected.into(), "a".repeat(64)))
        );
        std::fs::write(&file, vec![b' '; 1024 * 1024 + 1]).unwrap();
        assert!(installed_helper_identity(root.path()).is_err());
    }
    #[test]
    fn finite_preparation_preserves_incomplete_discovery_and_exact_coverage() {
        let root = tempfile::tempdir().unwrap();
        let local = tempfile::tempdir().unwrap();
        let engine = Engine::new();
        let snapshot = engine.open(root.path()).unwrap();
        let service = Arc::new(PreparationService::new(engine, local.path().into(), None));
        let job = service
            .preview(
                snapshot.session_id.as_ref().unwrap(),
                DestinationKind::Local,
            )
            .unwrap();
        let terminal = service.wait(&job.id);
        assert_eq!(terminal.phase, "ready");
        for (phase, expected) in [("complete", 0), ("partial", 3), ("failed", 1)] {
            for preparation_phase in ["ready", "success"] {
                let mut discovered = snapshot.clone();
                discovered.status = phase.into();
                let discovery = discovered.discovery.as_mut().unwrap();
                discovery.phase = phase.into();
                discovery.entries_seen = "9007199254740993".into();
                discovery.media_seen = "7".into();
                let discovery_id = discovery.id.clone();
                let mut preparation = terminal.clone();
                preparation.phase = preparation_phase.into();
                let result = preparation_result("operation".into(), discovered, preparation);
                assert_eq!(result.status.exit_code(), expected);
                assert_eq!(
                    result.discovery_operation_id.as_deref(),
                    Some(discovery_id.as_str())
                );
                assert_eq!(result.progress.unwrap().entries_seen, "9007199254740993");
                let data = result.data.unwrap();
                assert_eq!(data["discovery"]["phase"], phase);
                assert_eq!(data["discovery"]["mediaSeen"], "7");
                assert_eq!(data["preparation"]["phase"], preparation_phase);
            }
        }
        service.shutdown();
    }
    #[test]
    fn diagnostic_export_is_explicit_utf8_and_preserves_existing_output() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("PRIVATE_PATH.json");
        let engine = Engine::with_diagnostics(context());
        engine.diagnostics().record(Event::StateInvalid);
        let report = engine.diagnostics().snapshot();
        export(&path, &report).unwrap();
        let before = std::fs::read(&path).unwrap();
        assert!(!before.starts_with(&[239, 187, 191]));
        assert!(!before.contains(&13));
        assert!(!String::from_utf8_lossy(&before).contains("PRIVATE_PATH"));
        assert!(export(&path, &report).is_err());
        assert_eq!(std::fs::read(&path).unwrap(), before);
    }
    #[test]
    fn reset_is_silent_and_io_diagnostics_exclude_private_paths() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("PRIVATE_PATH.json");
        std::fs::write(&path, b"invalid PRIVATE_SENTINEL").unwrap();
        let store = crate::settings::SettingsStore::load(path.clone(), false);
        assert!(store.diagnostic().is_none());
        assert!(store.envelope().warning.is_none());
        std::fs::remove_file(&path).unwrap();
        std::fs::create_dir(&path).unwrap();
        let store = crate::settings::SettingsStore::load(path, false);
        let engine = Engine::with_diagnostics(context());
        engine.diagnostics().record(store.diagnostic().unwrap());
        let report = serde_json::to_string(&engine.diagnostics().snapshot()).unwrap();
        assert!(report.contains("state_unavailable"));
        assert!(!report.contains("PRIVATE"));
    }
}
