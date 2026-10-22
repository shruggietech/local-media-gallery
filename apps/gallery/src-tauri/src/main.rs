// SPDX-License-Identifier: Apache-2.0
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]
mod settings;
use gallery_core::{Engine, GalleryError, Snapshot};
use settings::{SettingsEnvelope, SettingsStore};
use std::{
    ffi::OsString,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::{Emitter, Manager, State, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

struct Runtime {
    engine: Engine,
    startup_error: Mutex<Option<String>>,
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
    if let Some(error) = runtime.startup_error.lock().unwrap().as_ref() {
        snapshot.issues.push(error.clone());
        if snapshot.session_id.is_none() {
            snapshot.status = "unavailable".into();
        }
    }
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
fn load_settings(
    window: WebviewWindow,
    settings: State<Arc<SettingsStore>>,
) -> Result<SettingsEnvelope, GalleryError> {
    main_window(&window)?;
    Ok(settings.envelope())
}
#[tauri::command]
async fn save_settings(
    window: WebviewWindow,
    store: State<'_, Arc<SettingsStore>>,
    expected_revision: String,
    settings: serde_json::Value,
) -> Result<SettingsEnvelope, GalleryError> {
    main_window(&window)?;
    let store = Arc::clone(store.inner());
    tauri::async_runtime::spawn_blocking(move || store.save(settings, &expected_revision))
        .await
        .map_err(|_| {
            GalleryError::new(
                "internal",
                "Preferences could not be saved. Changes remain in memory.",
            )
        })?
}
#[tauri::command]
fn startup(window: WebviewWindow, runtime: State<Runtime>) -> Result<Snapshot, GalleryError> {
    main_window(&window)?;
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
    path: String,
    app: tauri::AppHandle,
) -> Result<Snapshot, GalleryError> {
    main_window(&window)?;
    let engine = runtime.engine.clone();
    tauri::async_runtime::spawn_blocking(move || engine.open(&PathBuf::from(path)))
        .await
        .map_err(|_| GalleryError::new("internal", "Directory selection failed."))??;
    *runtime.startup_error.lock().unwrap() = None;
    Ok(publish(&app, &runtime))
}
#[tauri::command]
async fn choose_directory(
    window: WebviewWindow,
    app: tauri::AppHandle,
    runtime: State<'_, Runtime>,
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
    let engine = runtime.engine.clone();
    tauri::async_runtime::spawn_blocking(move || engine.open(&path))
        .await
        .map_err(|_| GalleryError::new("internal", "Directory selection failed."))??;
    *runtime.startup_error.lock().unwrap() = None;
    Ok(Some(publish(&app, &runtime)))
}
#[tauri::command]
async fn refresh(
    window: WebviewWindow,
    runtime: State<'_, Runtime>,
    session_id: String,
    app: tauri::AppHandle,
) -> Result<Snapshot, GalleryError> {
    main_window(&window)?;
    let engine = runtime.engine.clone();
    tauri::async_runtime::spawn_blocking(move || engine.refresh(&session_id))
        .await
        .map_err(|_| GalleryError::new("internal", "Refresh failed."))??;
    Ok(publish(&app, &runtime))
}
#[tauri::command]
fn close_gallery(
    window: WebviewWindow,
    runtime: State<Runtime>,
    session_id: String,
    app: tauri::AppHandle,
) -> Result<Snapshot, GalleryError> {
    main_window(&window)?;
    runtime.engine.close(&session_id)?;
    Ok(publish(&app, &runtime))
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
    let error = initial.and_then(|path| engine.open(&path).err().map(|e| e.message));
    let builder = tauri::Builder::default().plugin(tauri_plugin_dialog::init());
    #[cfg(feature = "native-tests")]
    let builder = builder.plugin(tauri_plugin_wdio_webdriver::init());
    builder
        .manage(Runtime {
            engine,
            startup_error: Mutex::new(error),
            transport_error: Mutex::new(transport_error),
            publication: Mutex::new(()),
        })
        .invoke_handler(tauri::generate_handler![
            startup,
            snapshot,
            load_settings,
            save_settings,
            open_gallery,
            choose_directory,
            refresh,
            close_gallery
        ])
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
            app.manage(Arc::new(settings));
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
                let engine = &window.state::<Runtime>().engine;
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
