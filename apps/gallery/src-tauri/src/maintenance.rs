// SPDX-License-Identifier: Apache-2.0
//! Finite Lite maintenance from the separate downloaded replacement executable.
use std::{ffi::OsString, path::PathBuf};
fn arguments(args: &[OsString]) -> Result<(&str, PathBuf), String> {
    let usage = "Run the separate downloaded Lite executable: maintain replace|recover|rollback|status ABSOLUTE_OLD_EXECUTABLE [--json]. Close the old application first.";
    if args.len() < 3
        || args.len() > 4
        || args[0] != "maintain"
        || args.get(3).is_some_and(|a| a != "--json")
    {
        return Err(usage.into());
    }
    let operation = args[1].to_str().ok_or(usage)?;
    if !matches!(operation, "replace" | "recover" | "rollback" | "status") {
        return Err(usage.into());
    }
    let target = PathBuf::from(&args[2]);
    if !target.is_absolute() {
        return Err(usage.into());
    }
    Ok((operation, target))
}
pub fn intercept() -> Option<i32> {
    let args = std::env::args_os().skip(1).collect::<Vec<_>>();
    if args.first().is_none_or(|a| a != "maintain") {
        return None;
    }
    crate::launch::attach_terminal();
    let operation = args
        .get(1)
        .and_then(|a| a.to_str())
        .filter(|v| matches!(*v, "replace" | "recover" | "rollback" | "status"))
        .unwrap_or("invalid")
        .to_owned();
    let result = (|| {
        if !cfg!(feature = "lite") {
            return Err("Ordinary single-file maintenance runs from the downloaded Lite executable. Full uses its system installer.".into());
        }
        let (operation, target) = arguments(&args)?;
        let replacement = std::env::current_exe().map_err(|e| e.to_string())?;
        // These are the actual current user's supported locations, observed read-only
        // by both retained writers. They are not sent to an external service.
        let mut state = Vec::new();
        if let Some(config) = dirs::config_dir() {
            state.push(gallery_update::StateOperand {
                kind: "settings".into(),
                path: config.join("tech.shruggie.local-media-gallery/settings.json"),
            });
        }
        if let Some(local) = dirs::data_local_dir() {
            state.push(gallery_update::StateOperand {
                kind: "history".into(),
                path: local.join("tech.shruggie.local-media-gallery/state/history.sqlite3"),
            });
        }
        state.push(gallery_update::StateOperand {
            kind: "portable".into(),
            path: target
                .parent()
                .ok_or("Missing old executable parent")?
                .to_owned(),
        });
        gallery_update::ordinary::execute(operation, &target, &replacement, &state)
    })();
    match result {
        Ok(outcome) => {
            println!(
                "{}",
                serde_json::json!({"formatVersion":1,"product":"local-media-gallery","version":env!("CARGO_PKG_VERSION"),"operation":format!("maintain-{operation}"),"status":outcome.status,"outcome":outcome})
            );
            Some(0)
        }
        Err(error) => {
            println!(
                "{}",
                serde_json::json!({"formatVersion":1,"product":"local-media-gallery","version":env!("CARGO_PKG_VERSION"),"operation":format!("maintain-{operation}"),"status":if error.starts_with("incomplete:"){"incomplete"}else{"conflict"},"error":error,"recovery":"Retain this downloaded Lite executable and its private maintenance storage. Resolve the reported conflict, then use maintain recover or rollback with the same old executable path."})
            );
            Some(2)
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn args(a: &[&str]) -> Vec<OsString> {
        a.iter().map(OsString::from).collect()
    }
    #[test]
    fn ordinary_maintenance_cli_requires_known_operation_absolute_target_and_no_json_operands() {
        let target = if cfg!(windows) {
            "C:\\gallery\\local-media-gallery.exe"
        } else {
            "/tmp/gallery/local-media-gallery"
        };
        assert!(arguments(&args(&["maintain", "replace", target, "--json"])).is_ok());
        for a in [
            vec!["maintain", "replace", "relative"],
            vec!["maintain", "unknown", target],
            vec!["maintain", "recover", target, "--from"],
            vec!["maintain", "rollback"],
        ] {
            assert!(arguments(&args(&a)).is_err())
        }
    }
}
