// SPDX-License-Identifier: Apache-2.0
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]
mod discovery;
mod gallery_state;
mod history;
mod launch;
mod portable;
mod settings;
use discovery::DiscoveryWorker;
use gallery_core::{Engine, GalleryError, MetadataRequest, MetadataResult, Snapshot};
use gallery_state::{Envelope, GalleryState};
use settings::SettingsStore;
use std::{
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
    startup_receipt: Arc<Mutex<Option<launch::ReceiptTarget>>>,
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
    let result = if let Some(path) = runtime.initial_root.lock().unwrap().take() {
        enqueue_open(&window.app_handle().clone(), &runtime, path)
    } else {
        Ok(current(&runtime))
    };
    if let Some(target) = runtime.startup_receipt.lock().unwrap().take() {
        let mut receipt = match &result {
            Ok(snapshot) => {
                let mut r = launch::OperationResult::new(
                    launch::Operation::Open,
                    target.operation_id.clone(),
                    "ui-startup",
                    launch::Status::Accepted,
                );
                r.session_id = snapshot
                    .discovery
                    .as_ref()
                    .and_then(|d| d.session_id.clone());
                r.discovery_operation_id = snapshot.discovery.as_ref().map(|d| d.id.clone());
                r
            }
            Err(error) => launch::OperationResult::failure(
                launch::Operation::Open,
                target.operation_id.clone(),
                error.clone(),
            ),
        };
        receipt.boundary = "ui-startup".into();
        let _ = std::thread::Builder::new()
            .name("startup-receipt".into())
            .spawn(move || target.send(receipt));
    }
    result
}
#[tauri::command]
fn application_info(window: WebviewWindow) -> Result<launch::OperationResult, GalleryError> {
    main_window(&window)?;
    let request = launch::Request {
        operation: launch::Operation::Capabilities,
        root: None,
        mode: launch::Mode::Wait,
        json: true,
    };
    Ok(launch::finite(
        &request,
        uuid::Uuid::new_v4().simple().to_string(),
        None,
    ))
}
#[tauri::command]
fn operation_result(
    window: WebviewWindow,
    runtime: State<Runtime>,
    operation_id: String,
) -> Result<launch::OperationResult, GalleryError> {
    main_window(&window)?;
    launch::discovery_result(&current(&runtime), &operation_id)
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
) -> Result<serde_json::Value, GalleryError> {
    main_window(&window)?;
    if action == "s011_resource_snapshot" {
        return Ok(serde_json::to_value(runtime.engine.test_resource_snapshot()).unwrap());
    }
    if action.starts_with("metadata_") {
        return runtime
            .engine
            .test_metadata_control(&action)
            .map(serde_json::Value::Bool);
    }
    if action.starts_with("profile_") {
        return state
            .test_profile_read(&action)
            .map(serde_json::Value::Bool);
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
    Ok(serde_json::Value::Bool(
        runtime.engine.test_discovery_paused(),
    ))
}

fn run_application(
    initial: Option<PathBuf>,
    startup_receipt: Arc<Mutex<Option<launch::ReceiptTarget>>>,
) -> Result<i32, GalleryError> {
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
        operation_result,
        application_info,
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
        operation_result,
        application_info,
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
    let mut context = tauri::generate_context!();
    context.config_mut().identifier = launch::identifier(launch::edition()).into();
    let app=builder
        .manage(Runtime {
            engine,
            initial_root: Mutex::new(initial),
            worker: OnceLock::new(),
            transport_error: Mutex::new(transport_error),
            publication: Mutex::new(()),
            startup_receipt,
        })
        .setup(move |app| {
            let settings = match app.path().app_config_dir().map(launch::shared_state_directory) {
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
            let history_path=history::location(app.path().app_local_data_dir().ok().map(launch::shared_state_directory));
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
        .build(context)
        .map_err(|e|GalleryError::new("launch_failed",format!("The native application could not start: {e}. {}",launch::runtime_guidance())))?;
    Ok(app.run_return(|_, _| {}))
}

fn output(result: &launch::OperationResult, machine: bool) -> i32 {
    match launch::emit(result, machine) {
        Ok(()) => result.exit_code(),
        Err(_) => 1,
    }
}
fn main() {
    use launch::{Mode, Operation, OperationResult, Status};
    let args: Vec<_> = std::env::args_os().skip(1).collect();
    let machine = launch::requested_json(&args);
    let id = uuid::Uuid::new_v4().simple().to_string();
    let request = match launch::parse(args) {
        Ok(v) => v,
        Err(e) => std::process::exit(output(
            &OperationResult::failure(Operation::Arguments, id, e),
            machine,
        )),
    };
    let target = match launch::ReceiptTarget::from_environment() {
        Ok(v) => v,
        Err(e) => std::process::exit(output(
            &OperationResult::failure(request.operation, id, e),
            machine,
        )),
    };
    let receipt = Arc::new(Mutex::new(target));
    let failed = |mut result: OperationResult| {
        result.boundary = if request.operation == Operation::Open {
            "ui-startup"
        } else {
            "request"
        }
        .into();
        if let Some(target) = receipt.lock().unwrap().take() {
            target.send(result.clone());
        } else if request.operation == Operation::Open
            && !machine
            && let Some(error) = &result.error
        {
            launch::notify_gui_error(&error.message);
        }
        output(&result, machine)
    };
    let root = if matches!(
        request.operation,
        Operation::Open | Operation::Resolve | Operation::Prepare
    ) {
        match launch::Placement::current()
            .and_then(|p| launch::resolve_root(launch::edition(), request.root.clone(), &p))
        {
            Ok(v) => v,
            Err(e) => {
                std::process::exit(failed(OperationResult::failure(request.operation, id, e)))
            }
        }
    } else {
        None
    };
    if request.operation != Operation::Open {
        std::process::exit(output(
            &launch::finite(&request, id, root.as_deref()),
            request.json,
        ));
    }
    if let Err(e) = launch::gui_prerequisite() {
        std::process::exit(failed(OperationResult::failure(Operation::Open, id, e)));
    }
    if request.mode == Mode::Detach {
        if receipt.lock().unwrap().is_some() {
            std::process::exit(failed(OperationResult::failure(
                Operation::Open,
                id,
                GalleryError::new(
                    "invalid_arguments",
                    "A startup child cannot detach recursively.",
                ),
            )));
        }
        std::process::exit(output(&launch::detach(root.as_deref(), id), request.json));
    }
    let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        run_application(root.clone(), receipt.clone())
    }));
    let native_code = match outcome {
        Ok(Ok(code)) => code,
        Ok(Err(e)) => std::process::exit(failed(OperationResult::failure(Operation::Open, id, e))),
        Err(_) => std::process::exit(failed(OperationResult::failure(
            Operation::Open,
            id,
            GalleryError::new(
                "launch_failed",
                format!(
                    "The native application failed during startup or UI lifetime. {}",
                    launch::runtime_guidance()
                ),
            ),
        ))),
    };
    let mut result = OperationResult::new(
        Operation::Open,
        id,
        "ui-lifetime",
        if native_code == 0 {
            Status::Success
        } else {
            Status::Failed
        },
    );
    result.root = root.as_deref().map(gallery_core::NativePath::from_path);
    result.data = Some(
        serde_json::json!({"nativeExitCode":native_code.to_string(),"meaning":"UI lifetime ended; discovery has its own outcome"}),
    );
    if native_code != 0 {
        result.error = Some(launch::OperationError {
            code: "native_exit".into(),
            message: "The native application exited unsuccessfully.".into(),
        });
    }
    std::process::exit(if request.json || native_code != 0 {
        output(&result, request.json)
    } else {
        0
    });
}
