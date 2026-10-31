// SPDX-License-Identifier: Apache-2.0
#![cfg_attr(windows, windows_subsystem = "windows")]
use gallery_update::{Candidate, StateOperand, Transaction};
use std::{collections::BTreeMap, path::PathBuf};
fn run() -> Result<serde_json::Value, String> {
    let mut args = std::env::args_os()
        .skip(1)
        .map(|arg| {
            arg.into_string().map_err(|_| {
                "The update journal requires Unicode native paths; no replacement was started"
                    .to_string()
            })
        })
        .collect::<Result<Vec<_>, _>>()?
        .into_iter();
    let operation = args
        .next()
        .ok_or("Use update, recover, rollback or status")?;
    let mut opts = BTreeMap::new();
    let mut state = vec![];
    while let Some(k) = args.next() {
        if k == "--events" {
            if args.next().as_deref() != Some("1") {
                return Err("--events expects 1".into());
            }
            unsafe {
                std::env::set_var("LMG_UPDATE_EVENTS", "1");
            }
            continue;
        }
        if k == "--json" {
            continue;
        }
        let v = args.next().ok_or("Missing option value")?;
        if let Some(kind) = k.strip_prefix("--state-") {
            state.push(StateOperand {
                kind: kind.into(),
                path: PathBuf::from(v),
            });
        } else if !matches!(
            k.as_str(),
            "--transaction" | "--directory" | "--from" | "--to" | "--source"
        ) || opts.insert(k, v).is_some()
        {
            return Err("Unknown or duplicate option".into());
        }
    }
    let path = |k: &str| -> Result<PathBuf, String> {
        opts.get(k).map(PathBuf::from).ok_or(format!("Missing {k}"))
    };
    let base = path("--transaction")?;
    let outcome = match operation.as_str() {
        "update" | "prepare" => {
            if state.is_empty() {
                return Err("Supply explicit selected --state-settings, --state-history or --state-portable operands; absent paths are checked without initialization".into());
            }
            let prior = Candidate::read(&path("--from")?)?;
            let next = Candidate::read(&path("--to")?)?;
            let mut op = Transaction::prepare(
                &base,
                &path("--directory")?,
                &prior,
                &next,
                &path("--source")?,
                &state,
            )?;
            if operation == "prepare" {
                op.status()?
            } else {
                op.apply_verified(false)?
            }
        }
        "recover" | "rollback" | "status" => {
            if opts.len() != 1 || !state.is_empty() {
                return Err(
                    "Recovery uses retained journal operands; only --transaction is accepted"
                        .into(),
                );
            }
            let command = match operation.as_str() {
                "status" => gallery_update::RecoveryCommand::Status,
                "rollback" => gallery_update::RecoveryCommand::Rollback,
                _ => gallery_update::RecoveryCommand::Recover,
            };
            Transaction::resume(&base, command)?
        }
        _ => return Err("Use update, recover, rollback or status".into()),
    };
    serde_json::to_value(outcome).map_err(|e| e.to_string())
}
fn main() {
    let worker_args = std::env::args_os().skip(1).collect::<Vec<_>>();
    if worker_args
        .first()
        .is_some_and(|s| s == "--__native-worker")
    {
        if worker_args.len() != 2 {
            std::process::exit(2)
        }
        match gallery_update::run_native_worker(&PathBuf::from(&worker_args[1])) {
            Ok(code) => std::process::exit(code),
            Err(error) => {
                eprintln!("{error}");
                std::process::exit(2)
            }
        }
    }
    match run() {
        Ok(v) => println!("{v}"),
        Err(e) => {
            println!(
                "{}",
                serde_json::json!({"status":if e.starts_with("incomplete:"){ "incomplete" }else{ "conflict" },"error":e,"transaction":worker_args.windows(2).find(|p|p[0]=="--transaction").map(|p|p[1].to_string_lossy().into_owned()),"recovery":"Retain the transaction; inspect status and recover or rollback after resolving the observed conflict."})
            );
            std::process::exit(2)
        }
    }
}
