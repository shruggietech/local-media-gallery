// SPDX-License-Identifier: Apache-2.0
#![cfg_attr(windows, windows_subsystem = "windows")]
#[cfg(windows)]
fn run() -> Result<serde_json::Value, String> {
    use gallery_windows_package::{FileRecord, SETUP, native, open_verified_input};
    use std::{
        os::windows::process::CommandExt,
        path::PathBuf,
        process::{Command, Stdio},
        time::{Duration, Instant},
    };
    let input: serde_json::Value =
        serde_json::from_str(SETUP).map_err(|_| "This maintainer build has no candidate inputs")?;
    let machine = input["scope"] == "machine";
    let base = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("Missing package directory")?
        .to_owned();
    let mut input_locks = Vec::new();
    for key in ["msi", "bootstrapper"] {
        let record = &input[key];
        let file = base.join(record["path"].as_str().ok_or("Invalid input path")?);
        let identity: FileRecord =
            serde_json::from_value(record.clone()).map_err(|e| e.to_string())?;
        input_locks.push(open_verified_input(&file,&identity).map_err(|e|format!("Candidate input changed or unavailable: {e}. Extract the complete original candidate again"))?);
    }
    let mut directory = None;
    let mut remove = false;
    let mut provision = false;
    let mut args = std::env::args_os().skip(1);
    while let Some(arg) = args.next() {
        match arg.to_str() {
            Some("--directory") => {
                directory = Some(PathBuf::from(
                    args.next().ok_or("--directory needs an absolute path")?,
                ))
            }
            Some("--remove") => remove = true,
            Some("--provision-runtime") => provision = true,
            Some("--quiet" | "--json") => {}
            _ => return Err(
                "Use --directory ABSOLUTE_PATH, --remove, --provision-runtime, --quiet or --json"
                    .into(),
            ),
        }
    }
    let directory = directory
        .or(native::installed_directory(machine)?)
        .unwrap_or_else(|| {
            PathBuf::from(
                std::env::var_os(if machine {
                    "ProgramFiles"
                } else {
                    "LOCALAPPDATA"
                })
                .unwrap_or_default(),
            )
            .join(if machine {
                "Local Media Gallery"
            } else {
                "Programs\\Local Media Gallery"
            })
        });
    gallery_windows_package::check_path(&directory)?;
    native::validate_destination(&directory, machine)?;
    if !std::env::args_os().any(|a| a == "--quiet" || a == "--json")
        && !confirm(&format!(
            "{} Local Media Gallery Full for {} at {}?\n\nApplication integration: Start menu and PATH. Installation verifies shared Microsoft WebView2 and may use its online bootstrapper. Removal retains galleries, preferences/history and shared runtime.",
            if remove { "Remove" } else { "Install" },
            if machine {
                "all users (administrator scope)"
            } else {
                "the current user"
            },
            directory.display()
        ))
    {
        return Err("Canceled before application or runtime changes".into());
    }
    let invoke = |file: PathBuf, args: Vec<std::ffi::OsString>| -> Result<u32, String> {
        let mut child = Command::new(file)
            .args(args)
            .creation_flags(0x08000000)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| e.to_string())?;
        let deadline = Instant::now() + Duration::from_secs(180);
        loop {
            if let Some(s) = child.try_wait().map_err(|e| e.to_string())? {
                return Ok(s.code().unwrap_or(-1) as u32);
            }
            if Instant::now() >= deadline {
                let _ = child.kill();
                return Err("Installer wait expired. Windows Installer may still be finalizing; inspect registration and the installation log before retrying".into());
            }
            std::thread::sleep(Duration::from_millis(100));
        }
    };
    let before = native::scoped_runtime(machine);
    let mut runtime_exit = None;
    if !remove && (before.is_err() || provision) {
        eprintln!("Verifying Microsoft WebView2 prerequisite through its pinned bootstrapper");
        let status = invoke(
            base.join(input["bootstrapper"]["path"].as_str().unwrap()),
            vec!["/silent".into(), "/install".into()],
        )?;
        runtime_exit = Some(status);
        if ![0, 3010].contains(&status) {
            return Err(format!(
                "Microsoft WebView2 prerequisite returned {status}; install Evergreen Runtime and retry"
            ));
        }
    }
    if !remove {
        native::scoped_runtime(machine)?;
    }
    let system =
        PathBuf::from(std::env::var_os("SystemRoot").ok_or("Missing Windows system directory")?)
            .join("System32\\msiexec.exe");
    let log = std::env::temp_dir().join(format!(
        "local-media-gallery-{}-{}.log",
        if machine { "machine" } else { "user" },
        std::process::id()
    ));
    let mut msi_args = vec![
        if remove { "/x".into() } else { "/i".into() },
        base.join(input["msi"]["path"].as_str().unwrap())
            .into_os_string(),
        "/qn".into(),
        "/norestart".into(),
        "/L*v".into(),
        log.as_os_str().to_owned(),
    ];
    let mut target = std::ffi::OsString::from("INSTALLDIR=");
    target.push(&directory);
    msi_args.push(target);
    eprintln!("Starting Windows Installer; log: {}", log.display());
    let status = invoke(system, msi_args)
        .map_err(|error| format!("{error}. Installation log: {}", log.display()))?;
    if ![0, 3010].contains(&status) {
        return Err(format!(
            "Windows Installer returned {status}. No verified success. Inspect {} and retained installation state before retrying",
            log.display()
        ));
    }
    if !remove {
        native::verify_install(&directory, machine)?;
    } else {
        native::verify_removed(&directory, machine)?;
    }
    Ok(
        serde_json::json!({"result":"pass","operation":if remove{"remove"}else{"install"},"scope":if machine{"machine"}else{"user"},"directoryDisplay":directory.display().to_string(),"nativeDirectory":native_path(&directory),"runtimeBefore":before.ok(),"runtimeAfter":native::scoped_runtime(machine).ok(),"runtimeBootstrapperExit":runtime_exit,"installerExit":status,"logDisplay":log.display().to_string(),"nativeLog":native_path(&log),"candidate":true}),
    )
}
#[cfg(windows)]
fn native_path(path: &std::path::Path) -> serde_json::Value {
    use std::os::windows::ffi::OsStrExt;
    let bytes = path
        .as_os_str()
        .encode_wide()
        .flat_map(u16::to_le_bytes)
        .collect::<Vec<_>>();
    serde_json::json!({"encoding":"windows-utf16le","bytes":bytes})
}
fn main() {
    #[cfg(windows)]
    {
        let quiet = std::env::args_os().any(|a| a == "--quiet" || a == "--json");
        match run() {
            Ok(value) => {
                println!("{value}");
                if !quiet {
                    show(
                        "Local Media Gallery operation completed. Galleries, user state and shared runtime remain independent.",
                    );
                }
            }
            Err(error) => {
                eprintln!("{error}");
                if !quiet {
                    show(&error);
                }
                std::process::exit(1);
            }
        }
    }
    #[cfg(not(windows))]
    {
        eprintln!("Windows candidate entrypoint requires Windows");
        std::process::exit(2);
    }
}
#[cfg(windows)]
fn show(message: &str) {
    use std::os::windows::ffi::OsStrExt;
    #[link(name = "user32")]
    unsafe extern "system" {
        fn MessageBoxW(window: isize, text: *const u16, title: *const u16, kind: u32) -> i32;
    }
    let wide = |s: &str| {
        std::ffi::OsStr::new(s)
            .encode_wide()
            .chain(Some(0))
            .collect::<Vec<_>>()
    };
    unsafe {
        MessageBoxW(
            0,
            wide(message).as_ptr(),
            wide("Local Media Gallery").as_ptr(),
            0x40,
        );
    }
}
#[cfg(windows)]
fn confirm(message: &str) -> bool {
    use std::os::windows::ffi::OsStrExt;
    #[link(name = "user32")]
    unsafe extern "system" {
        fn MessageBoxW(window: isize, text: *const u16, title: *const u16, kind: u32) -> i32;
    }
    let wide = |s: &str| {
        std::ffi::OsStr::new(s)
            .encode_wide()
            .chain(Some(0))
            .collect::<Vec<_>>()
    };
    unsafe {
        MessageBoxW(
            0,
            wide(message).as_ptr(),
            wide("Local Media Gallery scope and destination").as_ptr(),
            0x24,
        ) == 6
    }
}
