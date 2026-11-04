// SPDX-License-Identifier: Apache-2.0
//! Finite Lite maintenance from the separate downloaded replacement executable.
#[cfg(any(not(feature = "tooling-state"), test))]
use std::path::Path;
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
#[cfg(any(not(feature = "tooling-state"), test))]
fn state_operands(
    config: Option<PathBuf>,
    local_data: Option<PathBuf>,
    target: &Path,
) -> Result<Vec<gallery_update::StateOperand>, String> {
    // Share the writer's namespace and OS-specific history policy. In particular,
    // Linux history belongs to XDG_STATE_HOME, independently of XDG_DATA_HOME.
    let identifier = if cfg!(windows) {
        "local-media-gallery"
    } else {
        crate::launch::identifier(crate::launch::Edition::Full)
    };
    let mut state = Vec::new();
    if let Some(base) = config {
        state.push(gallery_update::StateOperand {
            kind: "settings".into(),
            path: base.join(identifier).join("settings.json"),
        });
    }
    if let Some(path) = crate::history::location(local_data.map(|p| p.join(identifier))) {
        state.push(gallery_update::StateOperand {
            kind: "history".into(),
            path,
        });
    }
    state.push(gallery_update::StateOperand {
        kind: "portable".into(),
        path: target
            .parent()
            .ok_or("Missing old executable parent")?
            .to_owned(),
    });
    Ok(state)
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
        #[cfg(not(feature = "tooling-state"))]
        let state = state_operands(dirs::config_dir(), dirs::data_local_dir(), &target)?;
        #[cfg(feature = "tooling-state")]
        let state = {
            let paths = crate::storage::paths()
                .map_err(|e| e.to_string())?
                .ok_or("Missing tooling storage")?;
            vec![
                gallery_update::StateOperand {
                    kind: "settings".into(),
                    path: paths.config.join("settings.json"),
                },
                gallery_update::StateOperand {
                    kind: "history".into(),
                    path: crate::history::location(Some(paths.local.clone()))
                        .ok_or("Missing tooling history")?,
                },
                gallery_update::StateOperand {
                    kind: "portable".into(),
                    path: target
                        .parent()
                        .ok_or("Missing old executable parent")?
                        .into(),
                },
            ]
        };
        #[cfg(feature = "tooling-state")]
        {
            let paths = crate::storage::paths()
                .map_err(|e| e.to_string())?
                .ok_or("Missing tooling storage")?;
            gallery_update::ordinary::execute_in(
                operation,
                &target,
                &replacement,
                &state,
                &paths.local.join("updates"),
            )
        }
        #[cfg(not(feature = "tooling-state"))]
        {
            gallery_update::ordinary::execute(operation, &target, &replacement, &state)
        }
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
    #[test]
    fn ordinary_maintenance_uses_the_writer_history_policy_instead_of_data_home() {
        let t = tempfile::tempdir().unwrap();
        let config = t.path().join("config");
        let local_data = t.path().join("data-marker");
        let target = t.path().join("gallery/old-executable");
        let operands =
            state_operands(Some(config.clone()), Some(local_data.clone()), &target).unwrap();
        let identifier = if cfg!(windows) {
            "local-media-gallery"
        } else {
            crate::launch::identifier(crate::launch::Edition::Full)
        };
        assert_eq!(
            operands.iter().find(|p| p.kind == "settings").unwrap().path,
            config.join(identifier).join("settings.json")
        );
        let selected = operands
            .iter()
            .find(|p| p.kind == "history")
            .map(|p| p.path.clone());
        assert_eq!(
            selected,
            crate::history::location(Some(local_data.join(identifier)))
        );
        #[cfg(target_os = "linux")]
        if let Some(path) = selected {
            assert!(
                !path.starts_with(&local_data),
                "Linux history must not use XDG_DATA_HOME"
            );
        }
        assert_eq!(
            std::fs::read_dir(t.path()).unwrap().count(),
            0,
            "Selection does not initialize any profile/gallery"
        );
    }
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
