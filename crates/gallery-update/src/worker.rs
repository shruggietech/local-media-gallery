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
    let expected = identity_record(&journal);
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
        let validator = gallery_windows_package::private::FileValidator::new(machine)?;
        let _pins = gallery_windows_package::private::validate_directory(base, machine)?;
        for name in ["identity.json", "journal.json"] {
            validator.validate(&base.join(name))?;
        }
        validator.validate(path)?;
        for (side, c) in [("prior", &journal.prior), ("next", &journal.next)] {
            c.verify_inventory(&base.join(side), Some(&validator))?;
            validator.validate(&base.join(format!("{side}-package.msi")))?;
        }
    }
    journal.prior.validate()?;
    journal.next.validate()?;
    #[cfg(not(windows))]
    {
        journal.prior.verify(&base.join("prior"))?;
        journal.next.verify(&base.join("next"))?;
    }
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
#[cfg(windows)]
fn reinstall_source(
    path: &Path,
    job: &Job,
    source: &Candidate,
    package: &Path,
    record: &FileRecord,
) -> Result<(PathBuf, Vec<File>)> {
    if !job.reinstall {
        return Ok((package.to_path_buf(), vec![]));
    }
    let machine = machine_scope(source);
    let name = gallery_windows_package::native::source_package_name(machine)?;
    let directory = path.with_extension("source");
    if !directory.exists() {
        gallery_windows_package::private::child_directory(&directory)?;
    }
    let pins = gallery_windows_package::private::validate_directory(&directory, machine)?;
    let alias = directory.join(&name);
    for entry in io(fs::read_dir(&directory))? {
        if io(entry)?.path() != alias {
            return Err("Foreign native source staging content".into());
        }
    }
    if alias.exists() {
        gallery_windows_package::private::validate_file(&alias, machine)?;
        verify_file(&alias, record)?;
    } else {
        copy_owned(package, &alias, record, true)?;
    }
    durable_json(
        &path.with_extension("source.json"),
        &serde_json::json!({"binding":job.binding,"side":job.side,"sourceName":name,"path":alias.strip_prefix(&job.transaction).map_err(|e|e.to_string())?.to_str().ok_or("Non-Unicode scratch source")?.replace('\\',"/"),"bytes":record.bytes,"sha256":record.sha256}),
    )?;
    Ok((alias, pins))
}

#[cfg(windows)]
fn legacy_patch_property(path: &Path) -> Result<String> {
    let path = path.to_str().ok_or("Invalid legacy patch path")?;
    if path.contains([';', '\"', '\r', '\n']) {
        return Err("Legacy PATCH requires one unambiguous verified input".into());
    }
    // MSI PATCH parsing does not normalize portable manifest separators.
    let path = path.replace('/', "\\");
    Ok(format!("PATCH=\"{path}\""))
}

#[cfg(windows)]
fn stage_legacy_patch(patch: &Path, record: &FileRecord) -> Result<(PathBuf, Vec<File>)> {
    // PATCH is an MSI semicolon-delimited list even inside quotes. Preserve the
    // selected transaction path by staging only this authenticated input.
    if !patch
        .to_str()
        .ok_or("Invalid legacy patch path")?
        .contains(';')
    {
        legacy_patch_property(patch)?;
        return Ok((patch.to_path_buf(), vec![]));
    }
    let (root, pins) = gallery_windows_package::private::legacy_storage_root(true)?;
    let staged = root.join(format!("legacy-patch-{}.msp", record.sha256));
    legacy_patch_property(&staged)?;
    if staged.exists() {
        gallery_windows_package::private::validate_file(&staged, true)?;
        verify_file(&staged, record)?;
    } else {
        copy_owned(patch, &staged, record, true)?;
    }
    Ok((staged, pins))
}

#[cfg(windows)]
fn select_legacy_patch(
    version: &str,
    candidates: &[(PathBuf, FileRecord)],
) -> Result<(PathBuf, FileRecord)> {
    if !matches!(version, "0.1.0" | "0.2.0") {
        return Err("Unsupported legacy patch version".into());
    }
    let expected = format!("maintenance/legacy-{version}-machine.msp");
    let mut selected: Option<(PathBuf, FileRecord)> = None;
    for (path, record) in candidates.iter().filter(|(_, r)| r.path == expected) {
        if let Some((_, prior)) = &selected {
            if prior.bytes != record.bytes || prior.sha256 != record.sha256 {
                return Err("Ambiguous retained legacy patch identities".into());
            }
        } else {
            selected = Some((path.clone(), record.clone()));
        }
    }
    selected
        .ok_or("Matching authenticated legacy patch is absent from retained Full payload".into())
}
#[cfg(windows)]
fn retained_legacy_patch(journal: &Journal, source: &Candidate) -> Result<(PathBuf, FileRecord)> {
    let mut candidates = vec![];
    for (side, current) in [("prior", &journal.prior), ("next", &journal.next)] {
        if current.edition != "full" || !matches!(current.native, Native::WindowsMsi { .. }) {
            continue;
        }
        let base = journal.transaction.join(side);
        if !native::dual_msi_identity(current, &base)? {
            continue;
        }
        for record in &current.files {
            if record.path.starts_with("maintenance/legacy-")
                && record.path.ends_with("-machine.msp")
            {
                candidates.push((base.join(&record.path), record.clone()));
            }
        }
    }
    select_legacy_patch(&source.version, &candidates)
}

pub fn entry(path: &Path) -> Result<i32> {
    let (job, journal) = read_job(path)?;
    let base = &job.transaction;
    let _lease = native_lease(
        &job.directory,
        machine_scope(&journal.prior),
        journal.state.storage_root(),
    )?;
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
        journal.state.operands(),
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
    #[cfg(windows)]
    let _source_pins;
    #[cfg(windows)]
    let _legacy_context_pins;
    #[cfg(windows)]
    let _patch_input;
    #[cfg(windows)]
    let mut _patch_pins = vec![];
    match &source.native {
        Native::WindowsMsi {
            scope,
            package_code,
            product_code,
            ..
        } => {
            #[cfg(windows)]
            {
                let dual_source = native::dual_msi_identity(source, &base.join(&job.side))?;
                let (package, pins) = reinstall_source(path, &job, source, &package, &record)?;
                _source_pins = pins;
                _input = gallery_windows_package::open_verified_input(
                    &package,
                    &gallery_windows_package::FileRecord {
                        path: "package.msi".into(),
                        bytes: artifact.bytes.clone(),
                        sha256: artifact.sha256.clone(),
                    },
                )?;
                if !matches!(job.action.as_str(), "install" | "remove" | "legacy-patch") {
                    return Err("Invalid MSI worker operation".into());
                }
                if matches!(job.action.as_str(), "remove" | "legacy-patch")
                    && (gallery_windows_package::native::registered_package(scope == "machine")?
                        .as_deref()
                        != Some(package_code)
                        || gallery_windows_package::native::registered_product(scope == "machine")?
                            .as_deref()
                            != Some(product_code))
                {
                    return Err("Installed MSI changed before native removal".into());
                }
                _patch_input = if job.action == "legacy-patch" {
                    if dual_source
                        || scope != "machine"
                        || !gallery_windows_package::native::is_legacy_product(product_code, true)
                    {
                        return Err("Legacy patch job requires its scoped predecessor".into());
                    }
                    let (patch, record) = retained_legacy_patch(&journal, source)?;
                    gallery_windows_package::private::validate_file(&patch, true)?;
                    verify_file(&patch, &record)?;
                    let (patch, pins) = stage_legacy_patch(&patch, &record)?;
                    _patch_pins = pins;
                    let input = gallery_windows_package::open_verified_input(
                        &patch,
                        &gallery_windows_package::FileRecord {
                            path: record.path.clone(),
                            bytes: record.bytes.clone(),
                            sha256: record.sha256.clone(),
                        },
                    )?;
                    let key = hash(path.to_str().ok_or("Non-Unicode legacy job")?.as_bytes());
                    let applied =
                        gallery_windows_package::native::legacy_patch_applied(&patch, true)?;
                    durable_json(
                        &base.join(format!("legacy-patch-input-{}.json", &key[..24])),
                        &serde_json::json!({"binding":job.binding,"job":path,"side":job.side,"version":source.version,"patch":patch,"record":record,"alreadyApplied":applied}),
                    )?;
                    if applied {
                        receipt(base, path, true, Some(0), None)?;
                        return Ok(0);
                    }
                    Some((patch.clone(), input))
                } else {
                    None
                };
                let system = windows_system_tool("msiexec.exe")?;
                command = Command::new(system);
                command
                    .args([if job.action == "remove" { "/x" } else { "/i" }])
                    .arg(&package)
                    .args(["/qn", "/norestart", "/L*v"])
                    .arg(&job.log);
                use std::os::windows::process::CommandExt;
                let directory = job.directory.to_str().ok_or("Invalid MSI destination")?;
                let integration_choices = match &journal.state {
                    StateContext::Selected(s) => s.windows_integrations.clone(),
                    StateContext::Legacy(_) => None,
                };
                let (journal, legacy_pins) = if job.action == "install" && !dual_source {
                    legacy_install_context(&journal, &job.side)?
                } else {
                    (base.join("journal.json"), vec![])
                };
                _legacy_context_pins = legacy_pins;
                let journal = journal.to_str().ok_or("Invalid MSI recovery path")?;
                if directory.contains(['\"', '\r', '\n']) || journal.contains(['\"', '\r', '\n']) {
                    return Err("Invalid MSI property".into());
                }
                command
                    .raw_arg(format!("INSTALLDIR=\"{directory}\""))
                    .raw_arg(format!("LMG_RECOVERY=\"{journal}\""));
                command.args(if scope == "machine" {
                    vec!["ALLUSERS=1"]
                } else {
                    vec!["ALLUSERS=2", "MSIINSTALLPERUSER=1"]
                });
                let mut elected = vec!["Application", "Payload", "Notices"];
                let mut absent = Vec::new();
                if job.action == "install" && dual_source {
                    let choices =
                        integration_choices.ok_or("Missing sealed Windows integration choices")?;
                    for (feature, enabled) in [
                        ("StartMenu", choices.start_menu),
                        ("CommandPath", choices.command_path),
                    ] {
                        if enabled {
                            elected.push(feature);
                        } else {
                            absent.push(feature);
                        }
                    }
                    command.arg(format!("ADDLOCAL={}", elected.join(",")));
                    if !absent.is_empty() {
                        command.arg(format!("REMOVE={}", absent.join(",")));
                    }
                }
                if let Some((patch, _)) = &_patch_input {
                    command
                        .raw_arg(legacy_patch_property(patch)?)
                        .args(["REINSTALL=ALL", "REINSTALLMODE=omus"]);
                } else if job.reinstall {
                    let mut features =
                        native::reinstall_features(source, &package, &job.directory)?;
                    if dual_source {
                        for f in elected
                            .iter()
                            .filter(|f| matches!(**f, "StartMenu" | "CommandPath"))
                        {
                            features.push_str(&format!(",{f}"));
                        }
                    }
                    command.args([
                        format!("REINSTALL={features}"),
                        "REINSTALLMODE=vamus".into(),
                    ]);
                }
                command.creation_flags(0x08000000);
            }
            #[cfg(not(windows))]
            {
                let _ = (scope, package_code, product_code);
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
    let stdout = create_scratch(&stdout_path)?;
    let stderr = create_scratch(&stderr_path)?;
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
fn create_scratch(path: &Path) -> Result<File> {
    #[cfg(windows)]
    {
        gallery_windows_package::private::create_file(path)
    }
    #[cfg(not(windows))]
    {
        io(OpenOptions::new().write(true).create_new(true).open(path))
    }
}
fn supervisor_log(path: &Path, extension: &str) -> Result<File> {
    let file = path.with_extension(extension);
    physical(&file)?;
    create_scratch(&file)
}
fn terminal_receipt(path: &Path, receipt: &Path, code: Option<i32>) -> Result<serde_json::Value> {
    let result = read_bounded(receipt, 16384).and_then(|bytes| {
        serde_json::from_slice::<serde_json::Value>(&bytes).map_err(|e| e.to_string())
    });
    if let Ok(value) = &result
        && value["job"] == serde_json::json!(path)
        && value["terminal"] == true
        && value["code"].as_i64() == code.map(i64::from)
    {
        return result;
    }
    let diagnostic_path = path.with_extension("supervisor.stderr");
    let diagnostic = physical(&diagnostic_path)
        .and_then(|()| read_bounded(&diagnostic_path, 65536))
        .map(|bytes| String::from_utf8_lossy(&bytes).trim().to_owned())
        .unwrap_or_else(|error| format!("Supervisor diagnostic unavailable: {error}"));
    Err(format!(
        "incomplete: Native worker exited without a matching terminal receipt (exit {code:?}): {diagnostic}; inspect retained logs before further mutation"
    ))
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
        .stdout(Stdio::from(supervisor_log(&path, "supervisor.stdout")?))
        .stderr(Stdio::from(supervisor_log(&path, "supervisor.stderr")?));
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
    let result = terminal_receipt(&path, &op.base.join("native-process.json"), status.code())?;
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

/// Cleanup requires the native lease and a matching terminal receipt. Recovery inputs stay sealed.
pub(super) fn cleanup(op: &Transaction) -> Result<()> {
    process::active(&op.base.join("native-process.json"))?;
    if !op.base.join("native-process.json").exists() {
        return Ok(());
    }
    let _lease = native_lease(
        &op.journal.directory,
        machine_scope(&op.journal.prior),
        op.journal.state.storage_root(),
    )?;
    let receipt: serde_json::Value =
        serde_json::from_slice(&read_bounded(&op.base.join("native-process.json"), 16384)?)
            .map_err(|e| e.to_string())?;
    if receipt["terminal"] != true {
        return Ok(());
    }
    let Some(current) = receipt["job"].as_str() else {
        return Ok(());
    };
    for entry in io(fs::read_dir(&op.base))? {
        let entry = io(entry)?;
        let path = entry.path();
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if !name.starts_with("native-job-")
            || path.extension().is_none_or(|e| e != "json")
            || name.ends_with(".source.json")
        {
            continue;
        }
        let (job, _) = read_job(&path)?;
        #[cfg(not(windows))]
        let _ = &job;
        #[cfg(windows)]
        {
            let source = path.with_extension("source");
            let marker = path.with_extension("source.json");
            if marker.exists() {
                gallery_windows_package::private::validate_file(
                    &marker,
                    machine_scope(&op.journal.prior),
                )?;
                let metadata: serde_json::Value =
                    serde_json::from_slice(&read_bounded(&marker, 16384)?)
                        .map_err(|e| e.to_string())?;
                let relative = metadata["path"]
                    .as_str()
                    .ok_or("Missing scratch source path")?;
                if !gallery_windows_package::portable(relative)
                    || metadata["binding"] != job.binding
                {
                    return Err("Foreign worker source retained".into());
                }
                let alias = op.base.join(relative);
                if alias.parent() != Some(source.as_path()) {
                    return Err("Worker source escaped its owned directory".into());
                }
                let pins = gallery_windows_package::private::validate_directory(
                    &source,
                    machine_scope(&op.journal.prior),
                )?;
                for child in io(fs::read_dir(&source))? {
                    if io(child)?.path() != alias {
                        return Err("Foreign worker source content retained".into());
                    }
                }
                gallery_windows_package::private::validate_file(
                    &alias,
                    machine_scope(&op.journal.prior),
                )?;
                let selected = if job.side == "prior" {
                    &op.journal.prior
                } else {
                    &op.journal.next
                };
                let artifact = selected
                    .artifact()
                    .ok_or("Missing sealed worker artifact")?;
                verify_file(
                    &alias,
                    &FileRecord {
                        path: "source".into(),
                        bytes: artifact.bytes.clone(),
                        sha256: artifact.sha256.clone(),
                        mode: 644,
                    },
                )?;
                io(fs::remove_file(&alias))?;
                drop(pins);
                io(fs::remove_dir(&source))?;
                io(fs::remove_file(marker))?;
            }
        }
        for extension in ["stdout", "stderr", "supervisor.stdout", "supervisor.stderr"] {
            let scratch = path.with_extension(extension);
            if scratch.try_exists().map_err(|e| e.to_string())? {
                physical(&scratch)?;
                #[cfg(windows)]
                gallery_windows_package::private::validate_file(
                    &scratch,
                    machine_scope(&op.journal.prior),
                )?;
                io(fs::remove_file(scratch))?;
            }
        }
        if path != Path::new(current) {
            io(fs::remove_file(path))?;
        }
    }
    Ok(())
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

#[cfg(windows)]
fn legacy_install_context(outer: &Journal, side: &str) -> Result<(PathBuf, Vec<File>)> {
    let selected = if side == "prior" {
        &outer.prior
    } else {
        &outer.next
    };
    let Native::WindowsMsi {
        product_code,
        scope,
        ..
    } = &selected.native
    else {
        return Err("Legacy adapter requires MSI".into());
    };
    if native::dual_msi_identity(selected, &outer.transaction.join(side))? {
        return Ok((outer.transaction.join("journal.json"), vec![]));
    }
    let machine = scope == "machine";
    if let Some(registered) = gallery_windows_package::native::registered_product(machine)? {
        let Native::WindowsMsi { package_code, .. } = &selected.native else {
            unreachable!()
        };
        if registered != *product_code
            || gallery_windows_package::native::registered_package(machine)?.as_deref()
                != Some(package_code.as_str())
        {
            return Err(
                "Legacy restore requires completed removal of the other native product first"
                    .into(),
            );
        }
    }
    // Each retry creates a fresh private context. A partially written adapter
    // remains diagnostic evidence and is never adopted as recovery authority.
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let (legacy_root, mut pins) = gallery_windows_package::private::legacy_storage_root(machine)?;
    let base = legacy_root.join(format!(
        "legacy-recovery-{side}-{}-{nonce:x}",
        std::process::id()
    ));
    let adapter = Journal {
        format_version: 1,
        binding: String::new(),
        directory: outer.directory.clone(),
        transaction: base.clone(),
        prior: selected.clone(),
        next: selected.clone(),
        phase: "restoring".into(),
        target_prior: true,
        state: outer.state.clone(),
    };
    let expected = identity_record(&adapter);
    gallery_windows_package::private::child_directory(&base)?;
    for name in ["prior", "next"] {
        let root = base.join(name);
        gallery_windows_package::private::child_directory(&root)?;
        copy_retained_inventory(selected, &outer.transaction.join(side), &root)?;
    }
    durable_json(&base.join("identity.json"), &expected)?;
    let mut adapter = adapter;
    adapter.binding = hash(&read_bounded(&base.join("identity.json"), 8 * 1024 * 1024)?);
    durable_json(&base.join("journal.json"), &adapter)?;
    pins.extend(gallery_windows_package::private::validate_directory(
        &base, machine,
    )?);
    durable_json(
        &outer.transaction.join(format!(
            "legacy-recovery-{side}-{}-{nonce:x}.json",
            std::process::id()
        )),
        &serde_json::json!({
            "formatVersion": 1,
            "outerBinding": outer.binding,
            "side": side,
            "journal": base.join("journal.json"),
            "binding": adapter.binding,
            "identity": expected,
            "context": adapter
        }),
    )?;
    Ok((base.join("journal.json"), pins))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(windows)]
    #[test]
    fn worker_output_has_private_authority_and_is_cleanup_eligible() {
        let fixture = crate::test_support::Fixture::new();
        let path = fixture.path().join("native-job-fixture.json");
        let output = supervisor_log(&path, "supervisor.stdout").unwrap();
        drop(output);
        gallery_windows_package::private::validate_file(
            &path.with_extension("supervisor.stdout"),
            false,
        )
        .unwrap();
    }
    #[test]
    fn supervisor_failure_keeps_preparation_receipt_unaccepted_and_retains_reason() {
        let work = tempfile::tempdir().unwrap();
        let job = work.path().join("native-job-test.json");
        let receipt = work.path().join("native-process.json");
        let previous = br#"{"pid":17,"terminal":true,"code":0}"#;
        fs::write(&receipt, previous).unwrap();
        fs::write(
            job.with_extension("supervisor.stderr"),
            b"Native worker identity changed\n",
        )
        .unwrap();
        let error = terminal_receipt(&job, &receipt, Some(2)).unwrap_err();
        assert!(error.starts_with("incomplete:"));
        assert!(error.contains("Native worker identity changed"));
        assert!(error.contains("Some(2)"));
        assert_eq!(fs::read(&receipt).unwrap(), previous);
    }
    #[test]
    fn supervisor_terminal_requires_matching_job_and_exit_code() {
        let work = tempfile::tempdir().unwrap();
        let job = work.path().join("native-job-test.json");
        let receipt = work.path().join("native-process.json");
        fs::write(
            &receipt,
            serde_json::to_vec(&serde_json::json!({"job":job,"terminal":true,"code":2})).unwrap(),
        )
        .unwrap();
        assert!(terminal_receipt(&job, &receipt, Some(0)).is_err());
        assert!(terminal_receipt(&job, &receipt, Some(2)).is_ok());
    }
}

#[cfg(all(test, windows))]
mod legacy_patch_tests {
    use super::*;
    fn record(name: &str, bytes: &[u8]) -> (PathBuf, FileRecord) {
        (
            PathBuf::from(r"C:\protected retained").join(name),
            FileRecord {
                path: name.into(),
                bytes: bytes.len().to_string(),
                sha256: hash(bytes),
                mode: 644,
            },
        )
    }
    #[test]
    fn legacy_patch_property_cannot_expand_into_multiple_inputs() {
        assert_eq!(
            legacy_patch_property(Path::new("C:\\retained/maintenance/one.msp")).unwrap(),
            "PATCH=\"C:\\retained\\maintenance\\one.msp\""
        );
        assert_eq!(
            legacy_patch_property(Path::new(r"C:\retained 雪\one.msp")).unwrap(),
            "PATCH=\"C:\\retained 雪\\one.msp\""
        );
        for path in [
            "C:\\one.msp;C:\\foreign.msp",
            "C:\\bad\".msp",
            "C:\\bad\n.msp",
            "C:\\bad\r.msp",
        ] {
            assert!(legacy_patch_property(Path::new(path)).is_err());
        }
    }
    #[test]
    fn legacy_patch_selection_requires_exact_version_and_unambiguous_retained_bytes() {
        let good = record(
            "maintenance/legacy-0.1.0-machine.msp",
            b"compiled scoped patch",
        );
        assert!(select_legacy_patch("0.1.0", std::slice::from_ref(&good)).is_ok());
        assert!(select_legacy_patch("0.2.0", std::slice::from_ref(&good)).is_err());
        assert!(select_legacy_patch("0.1.0", &[]).is_err());
        assert!(
            select_legacy_patch(
                "0.1.0",
                &[
                    good.clone(),
                    record("maintenance/legacy-0.1.0-machine.msp", b"changed patch")
                ]
            )
            .is_err()
        );
        assert!(select_legacy_patch("0.1.0", &[good.clone(), good]).is_ok());
    }
}
