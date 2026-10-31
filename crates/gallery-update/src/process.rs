// SPDX-License-Identifier: Apache-2.0
//! Bounded headless observation. Native timeout retains a live-client receipt.
use super::*;
use std::time::{Duration, Instant};
pub(super) fn active(receipt: &Path) -> Result<()> {
    physical(receipt)?;
    let intent_path = receipt
        .parent()
        .ok_or("No native receipt parent")?
        .join("native-intent.json");
    physical(&intent_path)?;
    let intent = if intent_path.exists() {
        Some(
            serde_json::from_slice::<serde_json::Value>(&read_bounded(&intent_path, 16384)?)
                .map_err(|_| "Invalid native intent")?,
        )
    } else {
        None
    };
    if !receipt.exists() {
        if intent.is_some() {
            return Err(
                "incomplete: Native launch intent is awaiting its independent supervisor receipt"
                    .into(),
            );
        }
        return Ok(());
    }
    let v: serde_json::Value = serde_json::from_slice(&read_bounded(receipt, 16384)?)
        .map_err(|_| "Invalid native-process receipt")?;
    if intent.as_ref().is_some_and(|i| i["job"] != v["job"]) {
        return Err("incomplete: Native launch intent and supervisor receipt differ".into());
    }
    if v["terminal"] == true {
        return Ok(());
    }
    let pid = v["pid"]
        .as_u64()
        .filter(|n| *n > 0 && *n <= u32::MAX as u64)
        .ok_or("Invalid native-process id")? as u32;
    #[cfg(windows)]
    {
        let system = PathBuf::from(std::env::var_os("SystemRoot").ok_or("Missing SystemRoot")?)
            .join("System32/tasklist.exe");
        let out = command(
            &system,
            &[
                "/FI".into(),
                format!("PID eq {pid}"),
                "/FO".into(),
                "CSV".into(),
                "/NH".into(),
            ],
        )?;
        if !out.status.success() {
            return Err("incomplete: Could not observe retained native client".into());
        }
        if String::from_utf8_lossy(&out.stdout).contains(&format!("\"{pid}\"")) {
            return Err(
                "incomplete: The retained native client is still active; wait before recovery"
                    .into(),
            );
        }
    }
    #[cfg(unix)]
    {
        unsafe extern "C" {
            fn kill(pid: i32, sig: i32) -> i32;
        }
        if unsafe { kill(pid as i32, 0) } == 0 {
            return Err(
                "incomplete: The retained native client is still active; wait before recovery"
                    .into(),
            );
        }
    }
    if v["job"].is_string() {
        return Err("incomplete: Native supervisor ended without a terminal receipt; retain logs and inspect its client before any further mutation".into());
    }
    Ok(())
}
pub(super) fn capture(c: &mut Command, receipt: Option<&Path>) -> Result<std::process::Output> {
    if let Some(p) = receipt {
        active(p)?;
    }
    let stdout = io(tempfile::NamedTempFile::new())?;
    let stderr = io(tempfile::NamedTempFile::new())?;
    c.stdin(Stdio::null())
        .stdout(Stdio::from(io(stdout.as_file().try_clone())?))
        .stderr(Stdio::from(io(stderr.as_file().try_clone())?));
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        c.creation_flags(0x08000000);
    }
    let mut child = io(c.spawn())?;
    if let Some(p) = receipt
        && let Err(error) = durable_json(p, &serde_json::json!({"pid":child.id(),"terminal":false}))
    {
        return Err(format!(
            "incomplete: Native client {} started but receipt could not persist: {error}",
            child.id()
        ));
    }
    if receipt.is_some() && std::env::var("LMG_UPDATE_EVENTS").as_deref() == Ok("1") {
        println!(
            "{}",
            serde_json::json!({"event":"native-client","pid":child.id()})
        );
        io(std::io::stdout().flush())?;
    }
    let limit = if receipt.is_some() {
        Duration::from_secs(180)
    } else {
        Duration::from_secs(30)
    };
    let start = Instant::now();
    let status = loop {
        if let Some(status) = io(child.try_wait())? {
            break status;
        }
        if start.elapsed() >= limit {
            if receipt.is_none() {
                let _ = child.kill();
                let _ = child.wait();
                return Err("Finite compatibility/identity process exceeded its deadline".into());
            }
            return Err(format!(
                "incomplete: Native client {} exceeded its observation deadline; it or its service may still be writing. Retain inputs and inspect before recovery",
                child.id()
            ));
        }
        std::thread::sleep(Duration::from_millis(50));
    };
    if let Some(p) = receipt {
        durable_json(
            p,
            &serde_json::json!({"pid":child.id(),"terminal":true,"code":status.code()}),
        )?;
    }
    Ok(std::process::Output {
        status,
        stdout: read_bounded(stdout.path(), 16 * 1024 * 1024)?,
        stderr: read_bounded(stderr.path(), 16 * 1024 * 1024)?,
    })
}
