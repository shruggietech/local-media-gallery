// SPDX-License-Identifier: Apache-2.0
use super::{Manifest, Package};
use gallery_update::{Candidate, RecoveryCommand, StateOperand, Transaction};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom, Write};
use std::os::unix::fs::{MetadataExt, PermissionsExt};
use std::os::unix::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;

const STORE: &str = "/var/lib/local-media-gallery/updates";
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Profile {
    uid: u32,
    settings: PathBuf,
    history: PathBuf,
}
static PROFILE: std::sync::OnceLock<Profile> = std::sync::OnceLock::new();
pub(super) fn receive_profile(text: &str) -> Result<(), String> {
    if text.len() > 16384 {
        return Err("Profile context exceeds limit".into());
    }
    let p: Profile = serde_json::from_str(text).map_err(|e| e.to_string())?;
    let uid = std::env::var("PKEXEC_UID")
        .or_else(|_| std::env::var("SUDO_UID"))
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or_else(|| unsafe { libc::getuid() });
    if p.uid != uid {
        return Err("Profile context does not belong to invoking user".into());
    }
    for path in [&p.settings, &p.history] {
        gallery_update::physical(path)?;
        if let Ok(info) = fs::symlink_metadata(path) {
            if !info.is_file() || info.uid() != uid {
                return Err("Selected profile file does not belong to invoking user".into());
            }
        }
    }
    PROFILE
        .set(p)
        .map_err(|_| "Profile context repeated".into())
}
pub(super) fn profile_context() -> Result<String, String> {
    if let Some(p) = PROFILE.get() {
        return serde_json::to_string(p).map_err(|e| e.to_string());
    }
    let uid = unsafe { libc::getuid() };
    let home = std::env::var_os("HOME")
        .map(PathBuf::from)
        .ok_or("Invoking home unavailable")?;
    let config = std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| home.join(".config"));
    let state = std::env::var_os("XDG_STATE_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| home.join(".local/state"));
    serde_json::to_string(&Profile {
        uid,
        settings: config.join("tech.shruggie.local-media-gallery/settings.json"),
        history: state.join("tech.shruggie.local-media-gallery/history.sqlite3"),
    })
    .map_err(|e| e.to_string())
}

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct State {
    current: Option<String>,
    last_transaction: Option<RetainedTransaction>,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RetainedTransaction {
    name: String,
    prior: String,
    next: String,
}
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Receipt {
    format_version: u32,
    generation: String,
    installer_sha256: Option<String>,
    descriptor_sha256: String,
    package_sha256: String,
    provenance: serde_json::Value,
}

fn owned(path: &Path, directory: bool) -> Result<(), String> {
    gallery_update::physical(path)?;
    for parent in path.ancestors().skip(1) {
        let m = fs::metadata(parent).map_err(|e| e.to_string())?;
        if !m.is_dir() || m.uid() != 0 || m.gid() != 0 || m.permissions().mode() & 0o022 != 0 {
            return Err(format!("Foreign maintenance parent: {}", parent.display()));
        }
    }
    let m = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    if m.uid() != 0
        || m.gid() != 0
        || m.is_dir() != directory
        || m.file_type().is_symlink()
        || m.permissions().mode() & 0o077 != 0
    {
        return Err(format!("Foreign maintenance authority: {}", path.display()));
    }
    Ok(())
}
fn create_directory(path: &Path) -> Result<(), String> {
    gallery_update::physical(path)?;
    match fs::create_dir(path) {
        Ok(()) => fs::set_permissions(path, fs::Permissions::from_mode(0o700))
            .map_err(|e| e.to_string())?,
        Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {}
        Err(e) => return Err(e.to_string()),
    };
    owned(path, true)
}
fn write(path: &Path, value: &impl Serialize) -> Result<(), String> {
    let parent = path.parent().ok_or("Missing authority parent")?;
    owned(parent, true)?;
    let mut file = tempfile::NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    file.as_file_mut()
        .write_all(&serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    file.as_file().sync_all().map_err(|e| e.to_string())?;
    file.persist(path).map_err(|e| e.to_string())?;
    File::open(parent)
        .and_then(|f| f.sync_all())
        .map_err(|e| e.to_string())
}
fn read<T: for<'a> Deserialize<'a>>(path: &Path) -> Result<T, String> {
    owned(path, false)?;
    let m = fs::metadata(path).map_err(|e| e.to_string())?;
    if m.len() > 8 * 1024 * 1024 {
        return Err("Maintenance authority is oversized".into());
    }
    serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}
fn hash(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut h = Sha256::new();
    let mut bytes = [0u8; 65536];
    loop {
        let n = file.read(&mut bytes).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        h.update(&bytes[..n]);
    }
    Ok(hex::encode(h.finalize()))
}
fn generation(name: &str) -> Result<PathBuf, String> {
    if name.len() != 32
        || !name
            .bytes()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase())
    {
        return Err("Invalid maintenance generation".into());
    }
    Ok(Path::new(STORE).join("generations").join(name))
}
fn copy_embedded(file: &mut File, package: &Package, destination: &Path) -> Result<(), String> {
    let mut output = File::options()
        .write(true)
        .create_new(true)
        .open(destination)
        .map_err(|e| e.to_string())?;
    fs::set_permissions(destination, fs::Permissions::from_mode(0o600))
        .map_err(|e| e.to_string())?;
    file.seek(SeekFrom::Start(package.offset))
        .map_err(|e| e.to_string())?;
    let copied =
        std::io::copy(&mut file.take(package.bytes), &mut output).map_err(|e| e.to_string())?;
    output.sync_all().map_err(|e| e.to_string())?;
    if copied != package.bytes || hash(destination)? != package.sha256 {
        return Err("Retained package integrity differs".into());
    }
    Ok(())
}

fn candidate(name: &str) -> Result<Candidate, String> {
    let base = generation(name)?;
    owned(&base, true)?;
    let receipt: Receipt = read(&base.join("receipt.json"))?;
    if receipt.format_version != 1 || receipt.generation != name {
        return Err("Retained receipt identity differs".into());
    }
    for (file, expected) in [
        ("update.json", receipt.descriptor_sha256),
        ("application.deb", receipt.package_sha256),
    ] {
        let path = base.join(file);
        owned(&path, false)?;
        if hash(&path)? != expected {
            return Err(format!("Retained {file} changed"));
        }
    }
    if let Some(expected) = receipt.installer_sha256 {
        let path = base.join("installer.run");
        owned(&path, false)?;
        if hash(&path)? != expected {
            return Err("Retained installer changed".into());
        }
    }
    let c = Candidate::read(&base.join("update.json"))?;
    if c.generation != name || c.edition != "full" || c.os != "linux" {
        return Err("Retained candidate identity differs".into());
    }
    Ok(c)
}
fn retain(
    file: &mut File,
    m: &Manifest,
    role: &str,
    descriptor: &serde_json::Value,
    installer: Option<&Path>,
    provenance: serde_json::Value,
) -> Result<String, String> {
    let name = descriptor["generation"]
        .as_str()
        .ok_or("Embedded descriptor generation absent")?
        .to_string();
    let base = generation(&name)?;
    if base.exists() {
        let c = candidate(&name)?;
        let mut expected = descriptor.clone();
        expected["native"]["installer"]["path"] = serde_json::json!(base.join("application.deb"));
        if serde_json::to_value(c).map_err(|e| e.to_string())? != expected {
            return Err("Retained generation collides with a different embedded descriptor".into());
        }
        return Ok(name);
    }
    create_directory(&base)?;
    let package = m
        .packages
        .iter()
        .find(|p| p.role == role)
        .ok_or("Embedded application package absent")?;
    copy_embedded(file, package, &base.join("application.deb"))?;
    let mut descriptor = descriptor.clone();
    descriptor["native"]["installer"]["path"] = serde_json::json!("application.deb");
    if descriptor["native"]["installer"]["sha256"] != package.sha256
        || descriptor["native"]["installer"]["bytes"] != package.bytes.to_string()
    {
        return Err("Embedded descriptor package integrity differs".into());
    }
    write(&base.join("update.json"), &descriptor)?;
    let installer_sha256 = if let Some(source) = installer {
        let target = base.join("installer.run");
        let mut from = File::open(source).map_err(|e| e.to_string())?;
        let mut to = File::options()
            .write(true)
            .create_new(true)
            .open(&target)
            .map_err(|e| e.to_string())?;
        std::io::copy(&mut from, &mut to).map_err(|e| e.to_string())?;
        to.sync_all().map_err(|e| e.to_string())?;
        fs::set_permissions(&target, fs::Permissions::from_mode(0o700))
            .map_err(|e| e.to_string())?;
        Some(hash(&target)?)
    } else {
        None
    };
    write(
        &base.join("receipt.json"),
        &Receipt {
            format_version: 1,
            generation: name.clone(),
            installer_sha256,
            descriptor_sha256: hash(&base.join("update.json"))?,
            package_sha256: package.sha256.clone(),
            provenance,
        },
    )?;
    candidate(&name)?;
    Ok(name)
}
fn state_operands() -> Result<Vec<StateOperand>, String> {
    if let Some(profile) = PROFILE.get() {
        return Ok(vec![
            StateOperand {
                kind: "settings".into(),
                path: profile.settings.clone(),
            },
            StateOperand {
                kind: "history".into(),
                path: profile.history.clone(),
            },
        ]);
    }
    let uid = std::env::var("PKEXEC_UID")
        .or_else(|_| std::env::var("SUDO_UID"))
        .unwrap_or_else(|_| unsafe { libc::getuid() }.to_string());
    let uid: u32 = uid
        .parse()
        .map_err(|_| "Invoking user identity unavailable")?;
    let passwd = fs::read_to_string("/etc/passwd").map_err(|e| e.to_string())?;
    let home = passwd
        .lines()
        .find_map(|line| {
            let fields: Vec<_> = line.split(':').collect();
            if fields.len() >= 7 && fields[2].parse::<u32>().ok() == Some(uid) {
                Some(PathBuf::from(fields[5]))
            } else {
                None
            }
        })
        .ok_or("Invoking user home unavailable")?;
    gallery_update::physical(&home)?;
    Ok(vec![
        StateOperand {
            kind: "settings".into(),
            path: home.join(".config/tech.shruggie.local-media-gallery/settings.json"),
        },
        StateOperand {
            kind: "history".into(),
            path: home.join(".local/state/tech.shruggie.local-media-gallery/history.sqlite3"),
        },
    ])
}
fn registered() -> Result<Option<String>, String> {
    let result = Command::new("/usr/bin/dpkg-query")
        .args([
            "-W",
            "--showformat=${db:Status-Status}|${Version}|${Architecture}",
            "--",
            "local-media-gallery",
        ])
        .output()
        .map_err(|e| e.to_string())?;
    if result.status.code() == Some(1) {
        return Ok(None);
    }
    if !result.status.success() {
        return Err("Package registration query failed".into());
    }
    let text = String::from_utf8_lossy(&result.stdout);
    let fields: Vec<_> = text.trim().split('|').collect();
    if fields.first() == Some(&"config-files") || fields.first() == Some(&"not-installed") {
        return Ok(None);
    }
    if fields.len() != 3 || fields[2] != "amd64" {
        return Err("Foreign package registration".into());
    }
    Ok(Some(fields[1].into()))
}
fn exec_owned(executable: &Path, target: &Path, action: &str) -> Result<(), String> {
    if executable != target {
        let mut command = Command::new(target);
        command.arg(action);
        if PROFILE.get().is_some() {
            command.arg("--__profile").arg(profile_context()?);
        }
        return Err(command.exec().to_string());
    }
    Ok(())
}

pub(super) fn operate(
    executable: &Path,
    file: &mut File,
    m: &Manifest,
    action: &str,
) -> Result<(), String> {
    let parent = Path::new("/var/lib/local-media-gallery");
    let existed = parent.exists();
    create_directory(parent)?;
    let marker = parent.join("authority.json");
    if existed {
        let value: serde_json::Value = read(&marker)?;
        if value
            != serde_json::json!({"formatVersion":1,"product":"local-media-gallery","kind":"owned-maintenance"})
        {
            return Err("Unknown maintenance authority".into());
        }
    } else {
        write(
            &marker,
            &serde_json::json!({"formatVersion":1,"product":"local-media-gallery","kind":"owned-maintenance"}),
        )?;
    }
    for path in [
        Path::new(STORE),
        &Path::new(STORE).join("generations"),
        &Path::new(STORE).join("transactions"),
    ] {
        create_directory(path)?;
    }
    let lock_path = Path::new(STORE).join("operation.lock");
    let lock = match File::options()
        .read(true)
        .write(true)
        .create_new(true)
        .open(&lock_path)
    {
        Ok(file) => {
            fs::set_permissions(&lock_path, fs::Permissions::from_mode(0o600))
                .map_err(|e| e.to_string())?;
            file
        }
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
            owned(&lock_path, false)?;
            File::options()
                .read(true)
                .write(true)
                .open(&lock_path)
                .map_err(|e| e.to_string())?
        }
        Err(error) => return Err(error.to_string()),
    };
    owned(&lock_path, false)?;
    lock.try_lock()
        .map_err(|_| "Another installer owns maintenance")?;
    let state_path = Path::new(STORE).join("state.json");
    let mut state: State = if state_path.exists() {
        read(&state_path)?
    } else {
        State::default()
    };
    if matches!(action, "--recover" | "--rollback") {
        if action == "--recover" && state.last_transaction.is_none() {
            let name = m.application_descriptor["generation"]
                .as_str()
                .ok_or("Missing embedded generation")?
                .to_string();
            let retained = candidate(&name)?;
            if registered()?.as_deref() != Some(retained.version.as_str()) {
                return Err("No registered trusted installation is available for repair".into());
            }
            retained.verify(Path::new("/"))?;
            let target = generation(&name)?.join("installer.run");
            if executable != target {
                drop(lock);
                return exec_owned(executable, &target, action);
            }
            super::install_packages(file, m, true)?;
            super::verify_identity(m)?;
            state.current = Some(name);
            write(&state_path, &state)?;
            println!("Recovered verified fresh installation using its retained package.");
            return Ok(());
        }
        let previous = state
            .last_transaction
            .as_ref()
            .ok_or("No retained update transaction is available")?
            .clone();
        let target = generation(&previous.next)?.join("installer.run");
        candidate(&previous.next)?;
        drop(lock);
        exec_owned(executable, &target, action)?;
        let lock = File::options()
            .read(true)
            .write(true)
            .open(&lock_path)
            .map_err(|e| e.to_string())?;
        lock.try_lock()
            .map_err(|_| "Another installer owns maintenance")?;
        let command = if action == "--rollback" {
            RecoveryCommand::Rollback
        } else {
            RecoveryCommand::Recover
        };
        let outcome = Transaction::resume(
            &Path::new(STORE).join("transactions").join(&previous.name),
            command,
        )?;
        state.current = Some(outcome.generation.clone());
        write(&state_path, &state)?;
        println!(
            "{}",
            serde_json::to_string(&outcome).map_err(|e| e.to_string())?
        );
        return Ok(());
    }
    if action == "--remove" {
        let current = state
            .current
            .as_ref()
            .ok_or("No owned installation is recorded")?;
        candidate(current)?.verify(Path::new("/"))?;
        let status = Command::new("/usr/bin/apt-get")
            .env_clear()
            .env("PATH", "/usr/sbin:/usr/bin:/sbin:/bin")
            .env("DEBIAN_FRONTEND", "noninteractive")
            .args([
                "--no-download",
                "--yes",
                "-o",
                "APT::Get::AutomaticRemove=false",
                "remove",
                "local-media-gallery",
            ])
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("Owned application removal failed".into());
        }
        state.current = None;
        write(&state_path, &state)?;
        println!(
            "Removed application; galleries, settings, shared runtimes and root-owned recovery history retained."
        );
        return Ok(());
    }
    let next = retain(
        file,
        m,
        "application",
        &m.application_descriptor,
        Some(executable),
        serde_json::json!({"source":m.source,"revision":m.revision}),
    )?;
    let predecessor = if let Some(p) = &m.predecessor {
        Some(retain(
            file,
            m,
            "predecessor",
            &p["descriptor"],
            None,
            p["provenance"].clone(),
        )?)
    } else {
        None
    };
    let target = generation(&next)?.join("installer.run");
    drop(lock);
    exec_owned(executable, &target, "--__maintain")?;
    let lock = File::options()
        .read(true)
        .write(true)
        .open(&lock_path)
        .map_err(|e| e.to_string())?;
    lock.try_lock()
        .map_err(|_| "Another installer owns maintenance")?;
    if let Some(version) = registered()? {
        if state.current.is_none() {
            let prior = if version == m.version {
                next.clone()
            } else {
                predecessor.ok_or("Installed application has no trusted retained predecessor")?
            };
            let c = candidate(&prior)?;
            if c.version != version {
                return Err("Installed version differs from the canonical predecessor".into());
            }
            c.verify(Path::new("/"))?;
            state.current = Some(prior);
            write(&state_path, &state)?;
        }
        let prior = state
            .current
            .as_ref()
            .ok_or("Missing prior generation")?
            .clone();
        let old = candidate(&prior)?;
        old.verify(Path::new("/"))?;
        if prior == next {
            super::install_packages(file, m, true)?;
            super::verify_identity(m)?;
            return Ok(());
        }
        super::install_packages(file, m, false)?;
        let new = candidate(&next)?;
        let tx_name = format!(
            "{}-{}",
            next,
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|e| e.to_string())?
                .as_nanos()
        );
        let tx = Path::new(STORE).join("transactions").join(&tx_name);
        let saved = state.last_transaction.clone();
        state.last_transaction = Some(RetainedTransaction {
            name: tx_name,
            prior,
            next: next.clone(),
        });
        write(&state_path, &state)?;
        let mut transaction = match Transaction::prepare(
            &tx,
            Path::new("/"),
            &old,
            &new,
            &generation(&next)?,
            &state_operands()?,
        ) {
            Ok(tx) => tx,
            Err(error) => {
                state.last_transaction = saved;
                write(&state_path, &state)?;
                return Err(error);
            }
        };
        let outcome = transaction.apply_verified(false)?;
        state.current = Some(next);
        write(&state_path, &state)?;
        println!(
            "{}",
            serde_json::to_string(&outcome).map_err(|e| e.to_string())?
        );
    } else {
        super::install_packages(file, m, true)?;
        super::verify_identity(m)?;
        state.current = Some(next);
        state.last_transaction = None;
        write(&state_path, &state)?;
    }
    drop(lock);
    Ok(())
}
