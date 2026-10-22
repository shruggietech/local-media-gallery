// SPDX-License-Identifier: Apache-2.0
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]
use gallery_core::{Engine, GalleryError, Snapshot};
use std::{ffi::OsString, path::PathBuf, sync::Mutex};
use tauri::{Manager, State, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

struct Runtime {
    engine: Engine,
    startup_error: Mutex<Option<String>>,
    transport_error: Mutex<Option<String>>,
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
) -> Result<Snapshot, GalleryError> {
    main_window(&window)?;
    let engine = runtime.engine.clone();
    let result = tauri::async_runtime::spawn_blocking(move || engine.open(&PathBuf::from(path)))
        .await
        .map_err(|_| GalleryError::new("internal", "Directory selection failed."))??;
    *runtime.startup_error.lock().unwrap() = None;
    Ok(result)
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
    let snapshot = tauri::async_runtime::spawn_blocking(move || engine.open(&path))
        .await
        .map_err(|_| GalleryError::new("internal", "Directory selection failed."))??;
    *runtime.startup_error.lock().unwrap() = None;
    Ok(Some(snapshot))
}
#[tauri::command]
async fn refresh(
    window: WebviewWindow,
    runtime: State<'_, Runtime>,
    session_id: String,
) -> Result<Snapshot, GalleryError> {
    main_window(&window)?;
    let engine = runtime.engine.clone();
    tauri::async_runtime::spawn_blocking(move || engine.refresh(&session_id))
        .await
        .map_err(|_| GalleryError::new("internal", "Refresh failed."))?
}
#[tauri::command]
fn close_gallery(
    window: WebviewWindow,
    runtime: State<Runtime>,
    session_id: String,
) -> Result<(), GalleryError> {
    main_window(&window)?;
    runtime.engine.close(&session_id)
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
    let error = initial.and_then(|path| engine.open(&path).err().map(|e| e.message));
    let builder = tauri::Builder::default().plugin(tauri_plugin_dialog::init());
    #[cfg(feature = "native-tests")]
    let builder = builder.plugin(tauri_plugin_wdio_webdriver::init());
    builder
        .manage(Runtime {
            engine,
            startup_error: Mutex::new(error),
            transport_error: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            startup,
            snapshot,
            open_gallery,
            choose_directory,
            refresh,
            close_gallery
        ])
        .setup(|app| {
            let engine = app.state::<Runtime>().engine.clone();
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = gallery_core::serve_media(engine).await {
                    *handle.state::<Runtime>().transport_error.lock().unwrap() = Some(format!(
                        "Local media transport failed: {error}. Restart the application to retry."
                    ));
                }
            });
            let engine = app.state::<Runtime>().engine.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    let current = engine.clone();
                    if tauri::async_runtime::spawn_blocking(move || current.reconcile())
                        .await
                        .is_err()
                    {
                        break;
                    }
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                }
            });
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
