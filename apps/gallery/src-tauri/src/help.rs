// SPDX-License-Identifier: Apache-2.0
use gallery_core::GalleryError;
use tauri::WebviewWindow;

const DOCUMENTATION: &str = "https://localmedia.gallery/docs";

#[derive(serde::Serialize)]
pub struct Notice {
    title: &'static str,
    contents: &'static str,
}

#[tauri::command]
pub fn application_notices(window: WebviewWindow) -> Result<Vec<Notice>, GalleryError> {
    super::main_window(&window)?;
    Ok(vec![
        Notice {
            title: "Application license",
            contents: include_str!("../../../../LICENSE"),
        },
        Notice {
            title: "Application notices",
            contents: include_str!("../../../../NOTICE"),
        },
        Notice {
            title: "Brand kit license",
            contents: include_str!("../../../../brand/kit/LICENSE"),
        },
        Notice {
            title: "Brand asset terms",
            contents: include_str!("../../../../brand/kit/LICENSE-BRAND.md"),
        },
        Notice {
            title: "Brand notices",
            contents: include_str!("../../../../brand/kit/NOTICE"),
        },
        Notice {
            title: "Geist and Geist Mono font license",
            contents: include_str!("../../../../brand/kit/fonts/licenses/OFL-Geist.txt"),
        },
        Notice {
            title: "Space Grotesk font license",
            contents: include_str!("../../../../brand/kit/fonts/licenses/OFL-Space-Grotesk.txt"),
        },
    ])
}

fn unavailable() -> GalleryError {
    GalleryError::new(
        "documentation_unavailable",
        "The default browser could not be requested. Copy the documentation address and open it in your browser.",
    )
}

#[cfg(windows)]
fn request_documentation() -> Result<(), GalleryError> {
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    let operation: Vec<u16> = "open\0".encode_utf16().collect();
    let url: Vec<u16> = DOCUMENTATION.encode_utf16().chain([0]).collect();
    // A fixed HTTPS URI is handed to the registered GUI browser. No console,
    // command shell, process environment or caller-selected executable is used.
    let result = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            operation.as_ptr(),
            url.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            1,
        )
    };
    if result as isize <= 32 {
        Err(unavailable())
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn request_documentation() -> Result<(), GalleryError> {
    use std::process::{Command, Stdio};
    #[cfg(target_os = "macos")]
    let program = "/usr/bin/open";
    #[cfg(not(target_os = "macos"))]
    let program = "xdg-open";
    let mut child = Command::new(program)
        .arg(DOCUMENTATION)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| unavailable())?;
    // Some browser launchers remain alive with the browser. Observe immediate
    // rejection, then acknowledge only the request and reap independently.
    let until = std::time::Instant::now() + std::time::Duration::from_millis(250);
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                return if status.success() {
                    Ok(())
                } else {
                    Err(unavailable())
                };
            }
            Err(_) => {
                std::thread::spawn(move || {
                    let _ = child.wait();
                });
                return Err(unavailable());
            }
            Ok(None) if std::time::Instant::now() < until => {
                std::thread::sleep(std::time::Duration::from_millis(10))
            }
            Ok(None) => {
                std::thread::spawn(move || {
                    let _ = child.wait();
                });
                return Ok(());
            }
        }
    }
}

#[tauri::command]
pub async fn open_documentation(window: WebviewWindow) -> Result<(), GalleryError> {
    super::main_window(&window)?;
    tauri::async_runtime::spawn_blocking(request_documentation)
        .await
        .map_err(|_| unavailable())?
}
