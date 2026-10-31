// SPDX-License-Identifier: Apache-2.0
fn main() {
    if let Err(error) = run() {
        let args = std::env::args_os().collect::<Vec<_>>();
        let transaction = args
            .windows(2)
            .find(|p| p[0] == "--transaction")
            .map(|p| p[1].to_string_lossy().into_owned());
        eprintln!(
            "{error}{}",
            transaction
                .map(|p| format!(". Retain transaction: {p}"))
                .unwrap_or_default()
        );
        std::process::exit(1)
    }
}
#[cfg(not(target_os = "macos"))]
fn run() -> gallery_macos_package::Result<()> {
    Err("This installer requires macOS15 Apple Silicon".into())
}
#[cfg(target_os = "macos")]
fn run() -> gallery_macos_package::Result<()> {
    use gallery_macos_package::{Payload, destination, install, remove};
    use std::{
        path::{Path, PathBuf},
        process::Command,
    };
    let args: Vec<_> = std::env::args_os().skip(1).collect();
    if args.len() == 1 && args[0] == "--help" {
        println!(
            "lmg-setup install|remove|update --scope user|system [--directory ABSOLUTE_APP_PATH] [--command-directory ABSOLUTE_DIRECTORY]\nUser defaults: ~/Applications and ~/.local/bin. System: /Applications and /usr/local/bin; requires prior administrator elevation. No automatic elevation, profile editing or quarantine removal. Keep matching helper to remove. Close running gallery windows first. Update requires --transaction ABSOLUTE_PATH outside application/gallery and selected --state-settings FILE, --state-history DATABASE, --state-portable GALLERY operands. Lite update requires --prior candidate.json and explicit --directory APP. recover|rollback|status accept only --transaction PATH."
        );
        return Ok(());
    }
    let operation = args
        .first()
        .and_then(|v| v.to_str())
        .ok_or("Supply install or remove; use --help")?;
    if ![
        "install",
        "remove",
        "update",
        "prepare-update",
        "recover",
        "rollback",
        "status",
    ]
    .contains(&operation)
        || !(args.len() - 1).is_multiple_of(2)
    {
        return Err("Invalid operation/options".into());
    }
    let mut options = std::collections::HashMap::new();
    for pair in args[1..].chunks(2) {
        let key = pair[0].to_str().ok_or("Invalid option")?;
        if ![
            "--scope",
            "--directory",
            "--command-directory",
            "--transaction",
            "--prior",
            "--state-settings",
            "--state-history",
            "--state-portable",
            "--events",
        ]
        .contains(&key)
            || options.insert(key, pair[1].clone()).is_some()
        {
            return Err("Unknown/duplicate option".into());
        }
    }
    if options.get("--events").is_some_and(|v| v == "1") {
        unsafe {
            std::env::set_var("LMG_UPDATE_EVENTS", "1");
        }
        options.remove("--events");
    }
    if ["recover", "rollback", "status"].contains(&operation) {
        if options.len() != 1 {
            return Err("Recovery accepts only --transaction".into());
        }
        let transaction = options
            .get("--transaction")
            .map(PathBuf::from)
            .ok_or("Supply --transaction")?;
        let transaction = destination(&transaction)?;
        let action = match operation {
            "status" => gallery_update::RecoveryCommand::Status,
            "rollback" => gallery_update::RecoveryCommand::Rollback,
            _ => gallery_update::RecoveryCommand::Recover,
        };
        let result = gallery_update::Transaction::resume(&transaction, action)?;
        println!("{}", serde_json::to_string(&result)?);
        return Ok(());
    }
    let scope = options
        .get("--scope")
        .and_then(|v| v.to_str())
        .unwrap_or("user");
    if !["user", "system"].contains(&scope) {
        return Err("Scope must be user or system".into());
    }
    fn output(file: &str, args: &[&std::ffi::OsStr]) -> gallery_macos_package::Result<String> {
        let result = Command::new(file)
            .args(args)
            .stdin(std::process::Stdio::null())
            .output()?;
        if !result.status.success() {
            return Err(format!(
                "Native verification failed: {file}: {}",
                String::from_utf8_lossy(&result.stderr)
            )
            .into());
        }
        Ok(String::from_utf8(result.stdout)?.trim().into())
    }
    if std::env::consts::ARCH != "aarch64" {
        return Err("Unsupported architecture; requires Apple Silicon".into());
    }
    let os = output("/usr/bin/sw_vers", &["-productVersion".as_ref()])?;
    let major = os
        .split('.')
        .next()
        .and_then(|v| v.parse::<u32>().ok())
        .ok_or("Invalid OS version")?;
    if major < 15 {
        return Err("Requires macOS15 or later (qualified baseline15)".into());
    }
    if scope == "system" && output("/usr/bin/id", &["-u".as_ref()])? != "0" {
        return Err("System scope requires prior administrator elevation; no changes made".into());
    }
    if !Path::new("/System/Library/Frameworks/WebKit.framework").is_dir() {
        return Err("OS WKWebView framework unavailable; repair/update macOS".into());
    }
    let payload: Payload =
        serde_json::from_slice(include_bytes!(concat!(env!("OUT_DIR"), "/payload.json")))?;
    payload.validate()?;
    if payload.edition != "full" && !["update", "prepare-update"].contains(&operation) {
        return Err("Full installation requires Full payload".into());
    }
    let home = std::env::var_os("HOME")
        .map(PathBuf::from)
        .filter(|v| v.is_absolute())
        .ok_or("Absolute HOME unavailable")?;
    let app = destination(
        &options
            .get("--directory")
            .map(PathBuf::from)
            .unwrap_or_else(|| {
                if scope == "system" {
                    PathBuf::from("/Applications").join(&payload.bundle)
                } else {
                    home.join("Applications").join(&payload.bundle)
                }
            }),
    )?;
    let bin = destination(
        &options
            .get("--command-directory")
            .map(PathBuf::from)
            .unwrap_or_else(|| {
                if scope == "system" {
                    PathBuf::from("/usr/local/bin")
                } else {
                    home.join(".local/bin")
                }
            }),
    )?;
    if bin.starts_with(&app) || app.starts_with(&bin) {
        return Err("Application and command directory must be separate".into());
    }
    let command = bin.join("local-media-gallery");
    let source = std::env::current_exe()?
        .parent()
        .ok_or("Candidate parent unavailable")?
        .join(&payload.bundle);
    let result = if ["update", "prepare-update"].contains(&operation) {
        if payload.edition == "lite" && !options.contains_key("--directory") {
            return Err("Lite update requires explicit --directory APP".into());
        }
        let transaction = options
            .get("--transaction")
            .map(PathBuf::from)
            .ok_or("Update requires --transaction outside the app/gallery")?;
        let transaction = destination(&transaction)?;
        let prior = options
            .get("--prior")
            .map(|p| -> gallery_macos_package::Result<Payload> {
                Ok(serde_json::from_slice(&std::fs::read(p)?)?)
            })
            .transpose()?;
        let state = [
            ("settings", "--state-settings"),
            ("history", "--state-history"),
            ("portable", "--state-portable"),
        ]
        .into_iter()
        .filter_map(|(kind, key)| {
            options.get(key).map(|p| gallery_update::StateOperand {
                kind: kind.into(),
                path: PathBuf::from(p),
            })
        })
        .collect::<Vec<_>>();
        if state.is_empty() {
            return Err("Supply explicit selected recipient state operands; absent paths are observed without initialization".into());
        }
        gallery_macos_package::update(
            &source,
            &app,
            &command,
            scope,
            &payload,
            gallery_macos_package::UpdateOptions {
                prior_lite: prior.as_ref(),
                transaction: &transaction,
                state: &state,
                activate: operation == "update",
            },
        )?
    } else if operation == "install" {
        gallery_macos_package::verify(&source, &payload, true)?;
        let binary = source.join(&payload.binary);
        let identity: serde_json::Value = serde_json::from_str(&output(
            binary.to_str().ok_or("Invalid binary path")?,
            &["--version".as_ref(), "--json".as_ref()],
        )?)?;
        if identity["edition"] != "full"
            || identity["os"] != "macos"
            || identity["arch"] != "aarch64"
            || identity["version"] != payload.version
            || identity["data"]["buildProfile"] != "release"
            || identity["data"]["targetTriple"] != payload.target_triple
        {
            return Err("Compiled candidate identity differs".into());
        }
        let capabilities: serde_json::Value = serde_json::from_str(&output(
            binary.to_str().unwrap(),
            &["capabilities".as_ref(), "--json".as_ref()],
        )?)?;
        if capabilities["data"]["runtime"]["status"] != "available" {
            return Err("OS WKWebView unavailable; repair/update macOS".into());
        }
        install(
            &source,
            &app,
            &command,
            scope,
            &payload,
            &std::env::var_os("PATH").unwrap_or_default(),
        )?
    } else {
        remove(&app, &command, scope, &payload)?
    };
    println!("{}", serde_json::to_string(&result)?);
    Ok(())
}
