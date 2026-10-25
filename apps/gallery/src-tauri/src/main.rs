// SPDX-License-Identifier: Apache-2.0
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]
mod discovery;
mod gallery_state;
mod history;
mod portable;
mod settings;
use discovery::DiscoveryWorker;
use gallery_core::{Engine, GalleryError, MetadataRequest, MetadataResult, Snapshot};
use gallery_state::{Envelope, GalleryState};
use settings::SettingsStore;
use std::{
    ffi::OsString,
    path::PathBuf,
    sync::{Arc, Mutex, OnceLock},
};
use tauri::{Emitter, Manager, State, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

struct Runtime {
    engine: Engine,
    initial_root: Mutex<Option<PathBuf>>,
    worker: OnceLock<DiscoveryWorker>,
    transport_error: Mutex<Option<String>>,
    publication: Mutex<()>,
}
enum Launch {
    Gallery(Option<PathBuf>),
    Output(String),
}
fn arguments(args: Vec<OsString>) -> Result<Launch, String> {
    if args.len() == 1 && args[0] == "--help" {
        return Ok(Launch::Output("Local Media Gallery\nUsage: local-media-gallery [DIRECTORY]\n       local-media-gallery --help | --version\nUse -- before a dash-leading directory. No directory opens the chooser.\n".into()));
    }
    if args.len() == 1 && args[0] == "--version" {
        return Ok(Launch::Output(format!(
            "Local Media Gallery {}\n",
            env!("CARGO_PKG_VERSION")
        )));
    }
    let mut ended = false;
    let mut root = None;
    for arg in args {
        if !ended && arg == "--" {
            ended = true;
            continue;
        }
        if !ended && arg.to_string_lossy().starts_with('-') {
            return Err("Unknown option. Use --help, or -- before a dash-leading path.".into());
        }
        if root.is_some() {
            return Err("Supply one directory. Use --help for usage.".into());
        }
        root = Some(PathBuf::from(arg));
    }
    Ok(Launch::Gallery(root))
}
fn attach_terminal() {
    #[cfg(windows)]
    unsafe {
        windows_sys::Win32::System::Console::AttachConsole(u32::MAX);
    }
}
fn main_window(window: &WebviewWindow) -> Result<(), GalleryError> {
    if window.label() == "main" {
        Ok(())
    } else {
        Err(GalleryError::new(
            "window_denied",
            "This window cannot access the gallery.",
        ))
    }
}
fn current(runtime: &Runtime) -> Snapshot {
    let mut snapshot = runtime.engine.snapshot();
    if let Some(error) = runtime.transport_error.lock().unwrap().as_ref() {
        snapshot.issues.push(error.clone());
        snapshot.status = if snapshot.session_id.is_some() {
            "partial"
        } else {
            "unavailable"
        }
        .into();
    }
    snapshot
}
fn publish(app: &tauri::AppHandle, runtime: &Runtime) -> Snapshot {
    let _order = runtime.publication.lock().unwrap();
    let snapshot = current(runtime);
    let _ = app.emit("gallery-changed", snapshot.clone());
    snapshot
}
#[tauri::command]
async fn load_settings(
    window: WebviewWindow,
    store: State<'_, Arc<GalleryState>>,
    session_id: Option<String>,
) -> Result<Envelope, GalleryError> {
    main_window(&window)?;
    let store = Arc::clone(store.inner());
    tauri::async_runtime::spawn_blocking(move || store.load(session_id.as_deref()))
        .await
        .map_err(|_| GalleryError::new("internal", "Presentation state could not be loaded."))?
}
#[tauri::command]
async fn inspect_metadata(
    window: WebviewWindow,
    runtime: State<'_, Runtime>,
    request: MetadataRequest,
) -> Result<MetadataResult, GalleryError> {
    main_window(&window)?;
    let prepared = runtime.engine.metadata_request(request)?;
    tauri::async_runtime::spawn_blocking(move || prepared.read())
        .await
        .map_err(|_| GalleryError::new("internal", "Metadata inspection could not finish."))?
}
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SaveRequest {
    session_id: Option<String>,
    expected_revision: String,
    destination: String,
    patch: serde_json::Value,
    remove: Option<String>,
    clear: bool,
}
#[tauri::command]
async fn save_settings(
    window: WebviewWindow,
    store: State<'_, Arc<GalleryState>>,
    request: SaveRequest,
) -> Result<Envelope, GalleryError> {
    main_window(&window)?;
    let store = Arc::clone(store.inner());
    tauri::async_runtime::spawn_blocking(move || {
        store.change(
            request.session_id.as_deref(),
            &request.expected_revision,
            &request.destination,
            request.patch,
            request.remove.as_deref(),
            request.clear,
        )
    })
    .await
    .map_err(|_| {
        GalleryError::new(
            "internal",
            "Presentation state could not be saved. Your choice remains temporary.",
        )
    })?
}
#[tauri::command]
async fn forget_history(
    window: WebviewWindow,
    store: State<'_, Arc<GalleryState>>,
    session_id: Option<String>,
    expected_revision: String,
    id: Option<String>,
) -> Result<Envelope, GalleryError> {
    main_window(&window)?;
    let store = Arc::clone(store.inner());
    tauri::async_runtime::spawn_blocking(move || {
        store.forget(id.as_deref(), session_id.as_deref(), &expected_revision)
    })
    .await
    .map_err(|_| GalleryError::new("internal", "History could not be changed."))?
}
#[tauri::command]
async fn reopen_recent(
    window: WebviewWindow,
    store: State<'_, Arc<GalleryState>>,
    runtime: State<'_, Runtime>,
    app: tauri::AppHandle,
    id: String,
) -> Result<Snapshot, GalleryError> {
    main_window(&window)?;
    let store = Arc::clone(store.inner());
    let path = tauri::async_runtime::spawn_blocking(move || store.recent_path(&id))
        .await
        .map_err(|_| GalleryError::new("internal", "The recent directory could not open."))??;
    enqueue_open(&app, &runtime, path)
}
#[tauri::command]
fn startup(window: WebviewWindow, runtime: State<Runtime>) -> Result<Snapshot, GalleryError> {
    main_window(&window)?;
    if let Some(path) = runtime.initial_root.lock().unwrap().take() {
        return enqueue_open(&window.app_handle().clone(), &runtime, path);
    }
    Ok(current(&runtime))
}
#[tauri::command]
fn snapshot(window: WebviewWindow, runtime: State<Runtime>) -> Result<Snapshot, GalleryError> {
    main_window(&window)?;
    Ok(current(&runtime))
}
#[tauri::command]
async fn open_gallery(
    window: WebviewWindow,
    runtime: State<'_, Runtime>,
    store: State<'_, Arc<GalleryState>>,
    path: String,
    app: tauri::AppHandle,
) -> Result<Snapshot, GalleryError> {
    main_window(&window)?;
    let _ = store;
    enqueue_open(&app, &runtime, PathBuf::from(path))
}
#[tauri::command]
async fn choose_directory(
    window: WebviewWindow,
    app: tauri::AppHandle,
    runtime: State<'_, Runtime>,
    store: State<'_, Arc<GalleryState>>,
) -> Result<Option<Snapshot>, GalleryError> {
    main_window(&window)?;
    let picker = app
        .dialog()
        .file()
        .set_parent(&window)
        .set_title("Choose a media directory");
    let selection = tauri::async_runtime::spawn_blocking(move || picker.blocking_pick_folder())
        .await
        .map_err(|_| GalleryError::new("picker_failed", "The directory chooser could not open."))?;
    let Some(selection) = selection else {
        return Ok(None);
    };
    let path = selection
        .into_path()
        .map_err(|_| GalleryError::new("invalid_root", "Choose a local directory."))?;
    let _ = store;
    enqueue_open(&app, &runtime, path).map(Some)
}
#[tauri::command]
async fn refresh(
    window: WebviewWindow,
    runtime: State<'_, Runtime>,
    session_id: String,
    app: tauri::AppHandle,
) -> Result<Snapshot, GalleryError> {
    main_window(&window)?;
    let request = runtime.engine.begin_refresh(&session_id)?;
    runtime
        .worker
        .get()
        .ok_or_else(|| GalleryError::new("internal", "Discovery is unavailable."))?
        .submit(request);
    Ok(publish(&app, &runtime))
}
#[tauri::command]
async fn close_gallery(
    window: WebviewWindow,
    runtime: State<'_, Runtime>,
    session_id: String,
    app: tauri::AppHandle,
) -> Result<Snapshot, GalleryError> {
    main_window(&window)?;
    let engine = runtime.engine.clone();
    tauri::async_runtime::spawn_blocking(move || engine.close(&session_id))
        .await
        .map_err(|_| GalleryError::new("internal", "Close could not finish."))??;
    Ok(publish(&app, &runtime))
}

fn enqueue_open(
    app: &tauri::AppHandle,
    runtime: &Runtime,
    path: PathBuf,
) -> Result<Snapshot, GalleryError> {
    let worker = runtime
        .worker
        .get()
        .ok_or_else(|| GalleryError::new("internal", "Discovery is unavailable."))?;
    worker.submit(runtime.engine.begin_open(&path));
    Ok(publish(app, runtime))
}
#[tauri::command]
fn cancel_discovery(
    window: WebviewWindow,
    runtime: State<Runtime>,
    operation_id: String,
    app: tauri::AppHandle,
) -> Result<Snapshot, GalleryError> {
    main_window(&window)?;
    runtime.engine.cancel_discovery(&operation_id)?;
    Ok(publish(&app, &runtime))
}
#[cfg(feature = "native-tests")]
#[tauri::command]
fn test_discovery_control(
    window: WebviewWindow,
    runtime: State<Runtime>,
    state: State<Arc<GalleryState>>,
    action: String,
    config: Option<gallery_core::TestDiscoveryConfig>,
) -> Result<bool, GalleryError> {
    main_window(&window)?;
    if action.starts_with("metadata_") {
        return runtime.engine.test_metadata_control(&action);
    }
    if action.starts_with("profile_") {
        return state.test_profile_read(&action);
    }
    match action.as_str() {
        "arm" => runtime
            .engine
            .configure_test_discovery(config.unwrap_or_default()),
        "release" => runtime.engine.release_test_discovery(),
        "status" => {}
        _ => {
            return Err(GalleryError::new(
                "invalid_test_action",
                "Unknown discovery test action.",
            ));
        }
    }
    Ok(runtime.engine.test_discovery_paused())
}

fn main() {
    let initial = match arguments(std::env::args_os().skip(1).collect()) {
        Ok(Launch::Output(output)) => {
            attach_terminal();
            print!("{output}");
            return;
        }
        Ok(Launch::Gallery(path)) => path,
        Err(error) => {
            attach_terminal();
            eprintln!("{error}");
            std::process::exit(2);
        }
    };
    let engine = Engine::new();
    let transport =
        std::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0)).and_then(|listener| {
            listener.set_nonblocking(true)?;
            engine.set_media_origin(format!("http://{}", listener.local_addr()?));
            Ok(listener)
        });
    let transport_error = transport.as_ref().err().map(|error| {
        format!("Local media transport failed: {error}. Restart the application to retry.")
    });
    let listener = transport.ok();
    let builder = tauri::Builder::default().plugin(tauri_plugin_dialog::init());
    #[cfg(feature = "native-tests")]
    let builder = builder.plugin(tauri_plugin_wdio_webdriver::init());
    #[cfg(feature = "native-tests")]
    let builder = builder.invoke_handler(tauri::generate_handler![
        startup,
        snapshot,
        load_settings,
        inspect_metadata,
        save_settings,
        forget_history,
        reopen_recent,
        open_gallery,
        choose_directory,
        refresh,
        close_gallery,
        cancel_discovery,
        test_discovery_control
    ]);
    #[cfg(not(feature = "native-tests"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        startup,
        snapshot,
        load_settings,
        inspect_metadata,
        save_settings,
        forget_history,
        reopen_recent,
        open_gallery,
        choose_directory,
        refresh,
        close_gallery,
        cancel_discovery
    ]);
    builder
        .manage(Runtime {
            engine,
            initial_root: Mutex::new(initial),
            worker: OnceLock::new(),
            transport_error: Mutex::new(transport_error),
            publication: Mutex::new(()),
        })
        .setup(move |app| {
            let settings = match app.path().app_config_dir() {
                Ok(directory) => {
                    #[cfg(feature = "native-tests")]
                    let directory = std::env::var_os("GALLERY_TEST_SETTINGS_DIR").map(PathBuf::from).unwrap_or(directory);
                    #[cfg(feature = "native-tests")]
                    let page_four = std::env::var("GALLERY_TEST_PAGE_SIZE").as_deref() == Ok("4");
                    #[cfg(not(feature = "native-tests"))]
                    let page_four = false;
                    SettingsStore::load(directory.join("settings.json"), page_four)
                }
                Err(error) => SettingsStore::unavailable(format!("The user settings directory is unavailable: {error}. Preferences remain in memory.")),
            };
            let history_path=history::location(app.path().app_local_data_dir().ok());
            #[cfg(feature="native-tests")]
            let history_path=std::env::var_os("GALLERY_TEST_HISTORY_DIR").map(PathBuf::from).map(|p|p.join("history.sqlite3")).or(history_path);
            let engine=app.state::<Runtime>().engine.clone();
            app.manage(Arc::new(GalleryState::new(engine,settings,history::History::new(history_path,cfg!(feature="native-tests")))));
            let handle = app.handle().clone();
            let engine = app.state::<Runtime>().engine.clone();
            let worker = DiscoveryWorker::start(engine, move || {
                publish(&handle, &handle.state::<Runtime>());
            })?;
            let _ = app.state::<Runtime>().worker.set(worker);
            if let Some(listener) = listener {
                let engine = app.state::<Runtime>().engine.clone();
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(error) = gallery_core::serve_media_listener(engine, listener).await {
                        let runtime = handle.state::<Runtime>();
                        *runtime.transport_error.lock().unwrap() = Some(format!(
                            "Local media transport failed: {error}. Restart the application to retry."
                        ));
                        publish(&handle, &runtime);
                    }
                });
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" && matches!(event, tauri::WindowEvent::Destroyed) {
                let runtime = window.state::<Runtime>();
                runtime.initial_root.lock().unwrap().take();
                if let Some(worker) = runtime.worker.get() { worker.shutdown(); }
                let engine = &runtime.engine;
                if let Some(id) = engine.snapshot().session_id {
                    let _ = engine.close(&id);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("The native application could not start");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn argument_contract() {
        assert!(matches!(arguments(vec![]).unwrap(), Launch::Gallery(None)));
        assert!(matches!(
            arguments(vec!["--version".into()]).unwrap(),
            Launch::Output(_)
        ));
        assert!(arguments(vec!["--bad".into()]).is_err());
        assert!(arguments(vec!["one".into(), "two".into()]).is_err());
        assert!(matches!(
            arguments(vec!["--".into(), "-gallery".into()]).unwrap(),
            Launch::Gallery(Some(_))
        ));
    }
}
