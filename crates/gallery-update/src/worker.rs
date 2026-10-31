// SPDX-License-Identifier: Apache-2.0
//! Native command supervision survives termination of the coordinating CLI.
use super::*;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Job {
    format_version: u32,
    binding: String,
    transaction: PathBuf,
    directory: PathBuf,
    side: String,
    action: String,
    target_prior: bool,
    reinstall: bool,
    log: PathBuf,
}
fn read_job(path: &Path) -> Result<(Job, Journal)> {
    physical(path)?;
    let base = path.parent().ok_or("Missing worker parent")?;
    private_directory(base)?;
    let job: Job =
        serde_json::from_slice(&read_bounded(path, 16384)?).map_err(|e| e.to_string())?;
    if job.format_version != 1
        || job.transaction != base
        || !matches!(job.side.as_str(), "prior" | "next")
        || job.log.parent() != Some(base)
    {
        return Err("Foreign native worker job".into());
    }
    physical(&base.join("journal.json"))?;
    physical(&base.join("identity.json"))?;
    let journal: Journal =
        serde_json::from_slice(&read_bounded(&base.join("journal.json"), 8 * 1024 * 1024)?)
            .map_err(|e| e.to_string())?;
    let identity = read_bounded(&base.join("identity.json"), 8 * 1024 * 1024)?;
    let expected = serde_json::json!({"formatVersion":1,"transaction":base,"directory":journal.directory,"prior":journal.prior,"next":journal.next,"state":journal.state});
    if hash(&identity) != job.binding
        || journal.binding != job.binding
        || job.directory != journal.directory
        || journal.transaction != base
        || serde_json::from_slice::<serde_json::Value>(&identity).map_err(|e| e.to_string())?
            != expected
    {
        return Err("Native worker identity changed".into());
    }
    #[cfg(windows)]
    {
        let machine = machine_scope(&journal.prior);
        let _pins = gallery_windows_package::private::validate_directory(base, machine)?;
        for name in ["identity.json", "journal.json"] {
            gallery_windows_package::private::validate_file(&base.join(name), machine)?;
        }
        gallery_windows_package::private::validate_file(path, machine)?;
        for (side, c) in [("prior", &journal.prior), ("next", &journal.next)] {
            for f in &c.files {
                gallery_windows_package::private::validate_file(
                    &base.join(side).join(&f.path),
                    machine,
                )?;
            }
            gallery_windows_package::private::validate_file(
                &base.join(format!("{side}-package.msi")),
                machine,
            )?;
        }
    }
    journal.prior.validate()?;
    journal.next.validate()?;
    journal.prior.verify(&base.join("prior"))?;
    journal.next.verify(&base.join("next"))?;
    Ok((job, journal))
}
fn private_directory(base: &Path) -> Result<()> {
    physical(base)?;
    #[cfg(windows)]
    gallery_windows_package::private::context(base)?;
    let m = io(fs::metadata(base))?;
    if !m.is_dir() {
        return Err("Native job parent is not a directory".into());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::{MetadataExt, PermissionsExt};
        unsafe extern "C" {
            fn geteuid() -> u32;
        }
        if m.uid() != unsafe { geteuid() } || m.permissions().mode() & 0o077 != 0 {
            return Err("Native worker requires its elected private transaction owner".into());
        }
    }
    Ok(())
}
fn receipt(
    base: &Path,
    job: &Path,
    terminal: bool,
    code: Option<i32>,
    client: Option<u32>,
) -> Result<()> {
    durable_json(
        &base.join("native-process.json"),
        &serde_json::json!({"pid":std::process::id(),"job":job,"terminal":terminal,"code":code,"clientPid":client}),
    )
}
pub fn entry(path: &Path) -> Result<i32> {
    let (job, journal) = read_job(path)?;
    let base = &job.transaction;
    let _lease = native_lease(&job.directory, machine_scope(&journal.prior))?;
    receipt(base, path, false, None, None)?;
    let selected = if job.target_prior {
        &journal.prior
    } else {
        &journal.next
    };
    let other = if job.target_prior {
        &journal.next
    } else {
        &journal.prior
    };
    check_compatible_state(
        selected,
        &base.join(if job.target_prior { "prior" } else { "next" }),
        other,
        &base.join(if job.target_prior { "next" } else { "prior" }),
        &journal.state,
    )?;
    Transaction::active(&job.directory, &journal.prior)?;
    Transaction::active(&job.directory, &journal.next)?;
    let source = if job.side == "prior" {
        &journal.prior
    } else {
        &journal.next
    };
    let package = base.join(format!(
        "{}-package.{}",
        job.side,
        if cfg!(windows) { "msi" } else { "deb" }
    ));
    let artifact = source
        .artifact()
        .ok_or("Worker source has no native artifact")?;
    let record = FileRecord {
        path: "package".into(),
        bytes: artifact.bytes.clone(),
        sha256: artifact.sha256.clone(),
        mode: 644,
    };
    verify_file(&package, &record)?;
    let mut command;
    #[cfg(windows)]
    let _input;
    match &source.native {
        Native::WindowsMsi {
            scope,
            package_code,
            ..
        } => {
            #[cfg(windows)]
            {
                _input = gallery_windows_package::open_verified_input(
                    &package,
                    &gallery_windows_package::FileRecord {
                        path: "package.msi".into(),
                        bytes: artifact.bytes.clone(),
                        sha256: artifact.sha256.clone(),
                    },
                )?;
                if !matches!(job.action.as_str(), "install" | "remove") {
                    return Err("Invalid MSI worker operation".into());
                }
                if job.action == "remove"
                    && gallery_windows_package::native::registered_package(scope == "machine")?
                        .as_deref()
                        != Some(package_code)
                {
                    return Err("Installed MSI changed before native removal".into());
                }
                let system = windows_system_tool("msiexec.exe")?;
                command = Command::new(system);
                command
                    .args([if job.action == "remove" { "/x" } else { "/i" }])
                    .arg(&package)
                    .args(["/qn", "/norestart", "/L*v"])
                    .arg(&job.log);
                use std::os::windows::process::CommandExt;
                let directory = job.directory.to_str().ok_or("Invalid MSI destination")?;
                let journal = base.join("journal.json");
                let journal = journal.to_str().ok_or("Invalid MSI recovery path")?;
                if directory.contains(['\"', '\r', '\n']) || journal.contains(['\"', '\r', '\n']) {
                    return Err("Invalid MSI property".into());
                }
                command
                    .raw_arg(format!("INSTALLDIR=\"{directory}\""))
                    .raw_arg(format!("LMG_RECOVERY=\"{journal}\""));
                if job.reinstall {
                    command.args(["REINSTALL=ALL", "REINSTALLMODE=vamus"]);
                }
                command.creation_flags(0x08000000);
            }
            #[cfg(not(windows))]
            {
                let _ = (scope, package_code);
                return Err("MSI worker requires Windows".into());
            }
        }
        Native::LinuxDeb { .. } => {
            #[cfg(target_os = "linux")]
            {
                unsafe extern "C" {
                    fn geteuid() -> u32;
                }
                if unsafe { geteuid() } != 0 {
                    return Err("Full native worker requires prior root elevation".into());
                }
                native::linux_authority(&journal)?;
                command = Command::new("/usr/bin/dpkg");
                match job.action.as_str() {
                    "unpack" => {
                        command.arg("--unpack").arg(&package);
                    }
                    "remove" => {
                        source.verify(&job.directory)?;
                        command.args(["--remove", "local-media-gallery"]);
                    }
                    "configure" => {
                        command.args(["--configure", "local-media-gallery"]);
                    }
                    _ => return Err("Invalid dpkg worker action".into()),
                }
                command.env("DEBIAN_FRONTEND", "noninteractive");
            }
            #[cfg(not(target_os = "linux"))]
            return Err("Debian worker requires Linux".into());
        }
        Native::Direct => return Err("Direct replacement does not use a native worker".into()),
    }
    let stdout_path = path.with_extension("stdout");
    let stderr_path = path.with_extension("stderr");
    physical(&stdout_path)?;
    physical(&stderr_path)?;
    let stdout = io(OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&stdout_path))?;
    let stderr = io(OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&stderr_path))?;
    let mut child = io(command
        .stdin(Stdio::null())
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr))
        .spawn())?;
    receipt(base, path, false, None, Some(child.id()))?;
    // Continue supervision after the caller deadline. A timeout is not termination.
    let status = loop {
        if let Some(status) = io(child.try_wait())? {
            break status;
        }
        std::thread::sleep(Duration::from_millis(100));
    };
    let code = status.code().unwrap_or(2);
    receipt(base, path, true, Some(code), Some(child.id()))?;
    Ok(code)
}
pub(super) fn execute(
    op: &Transaction,
    side: &str,
    action: &str,
    reinstall: bool,
    log: &Path,
) -> Result<std::process::Output> {
    process::active(&op.base.join("native-process.json"))?;
    let nonce = hash(
        format!(
            "{}:{}:{side}:{action}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|e| e.to_string())?
                .as_nanos()
        )
        .as_bytes(),
    );
    let path = op.base.join(format!("native-job-{}.json", &nonce[..24]));
    let job = Job {
        format_version: 1,
        binding: op.journal.binding.clone(),
        transaction: op.base.clone(),
        directory: op.journal.directory.clone(),
        side: side.into(),
        action: action.into(),
        target_prior: op.journal.target_prior,
        reinstall,
        log: log.into(),
    };
    let mut file = temporary(&op.base, true)?;
    io(file.write_all(&serde_json::to_vec_pretty(&job).map_err(|e| e.to_string())?))?;
    io(file.as_file().sync_all())?;
    file.persist_noclobber(&path).map_err(|e| e.to_string())?;
    sync_directory(&op.base)?;
    durable_json(
        &op.base.join("native-intent.json"),
        &serde_json::json!({"job":path}),
    )?;
    let mut command = Command::new(io(std::env::current_exe())?);
    command
        .arg("--__native-worker")
        .arg(&path)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(error) => {
            durable_json(
                &op.base.join("native-process.json"),
                &serde_json::json!({"job":path,"pid":std::process::id(),"terminal":true,"code":2,"clientPid":null}),
            )?;
            return Err(format!("Native worker could not start: {error}"));
        }
    };
    let started = Instant::now();
    let mut announced = false;
    let status = loop {
        if !announced
            && std::env::var("LMG_UPDATE_EVENTS").as_deref() == Ok("1")
            && let Ok(bytes) = read_bounded(&op.base.join("native-process.json"), 16384)
            && let Ok(record) = serde_json::from_slice::<serde_json::Value>(&bytes)
            && record["job"] == serde_json::json!(path)
            && record["terminal"] == false
            && record["clientPid"].as_u64().is_some()
        {
            println!(
                "{}",
                serde_json::json!({"event":"native-client","pid":child.id(),"clientPid":record["clientPid"],"meaning":"Independent supervisor has retained an active actual native client"})
            );
            io(std::io::stdout().flush())?;
            announced = true;
        }
        if let Some(status) = io(child.try_wait())? {
            break status;
        }
        if started.elapsed() >= Duration::from_secs(180) {
            return Err(format!(
                "incomplete: Native supervisor {} is still observing its client; retain the transaction and wait before recovery",
                child.id()
            ));
        }
        std::thread::sleep(Duration::from_millis(20));
    };
    let result: serde_json::Value =
        serde_json::from_slice(&read_bounded(&op.base.join("native-process.json"), 16384)?)
            .map_err(|_| "incomplete: Native worker has no readable terminal receipt")?;
    if result["job"] != serde_json::json!(path)
        || result["terminal"] != true
        || result["code"].as_i64() != status.code().map(i64::from)
    {
        return Err("incomplete: Native worker exited without a matching terminal receipt; inspect retained logs before further mutation".into());
    }
    Ok(std::process::Output {
        status,
        stdout: if path.with_extension("stdout").exists() {
            read_bounded(&path.with_extension("stdout"), 16 * 1024 * 1024)?
        } else {
            vec![]
        },
        stderr: if path.with_extension("stderr").exists() {
            read_bounded(&path.with_extension("stderr"), 16 * 1024 * 1024)?
        } else {
            result["error"]
                .as_str()
                .unwrap_or("Native worker failed before client launch")
                .as_bytes()
                .to_vec()
        },
    })
}

pub fn run(path: &Path) -> Result<i32> {
    match entry(path) {
        Ok(code) => Ok(code),
        Err(error) => {
            if let Ok((job, _)) = read_job(path) {
                let record = job.transaction.join("native-process.json");
                if let Ok(bytes) = read_bounded(&record, 16384)
                    && let Ok(value) = serde_json::from_slice::<serde_json::Value>(&bytes)
                    && value["job"] == serde_json::json!(path)
                    && value["clientPid"].is_null()
                {
                    let _ = durable_json(
                        &record,
                        &serde_json::json!({"job":path,"pid":std::process::id(),"terminal":true,"code":2,"clientPid":null,"error":error}),
                    );
                }
            }
            Err(error)
        }
    }
}
