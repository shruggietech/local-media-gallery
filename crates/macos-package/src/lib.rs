// SPDX-License-Identifier: Apache-2.0
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Component, Path, PathBuf},
};

pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;
pub fn hash(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct File {
    pub path: String,
    pub bytes: String,
    pub sha256: String,
    pub mode: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Payload {
    pub format_version: u8,
    pub product: String,
    pub kind: String,
    pub version: String,
    pub edition: String,
    pub os: String,
    pub arch: String,
    pub target_triple: String,
    pub build_profile: String,
    pub generation: String,
    pub source: serde_json::Value,
    pub revision: String,
    pub bundle: String,
    pub binary: String,
    pub files: Vec<File>,
}
impl Payload {
    pub fn validate(&self) -> Result<()> {
        if self.format_version != 1
            || self.product != "local-media-gallery"
            || self.kind != "macos-application-payload"
            || !gallery_update::valid_product_version(&self.version)
            || !["full", "lite"].contains(&self.edition.as_str())
            || self.os != "macos"
            || self.arch != "aarch64"
            || self.target_triple != "aarch64-apple-darwin"
            || self.build_profile != "release"
        {
            return Err("Invalid native package identity".into());
        }
        relative(&self.bundle)?;
        relative(&self.binary)?;
        if self.bundle.contains('/')
            || !self.bundle.ends_with(".app")
            || self.binary != "Contents/MacOS/local-media-gallery"
            || self.files.is_empty()
        {
            return Err("Invalid bundle structure".into());
        }
        let mut paths = std::collections::HashSet::new();
        for f in &self.files {
            relative(&f.path)?;
            if !paths.insert(&f.path)
                || f.sha256.len() != 64
                || !f
                    .sha256
                    .bytes()
                    .all(|v| v.is_ascii_digit() || (b'a'..=b'f').contains(&v))
                || f.bytes.parse::<u64>().is_err()
                || !["644", "755"].contains(&f.mode.as_str())
            {
                return Err("Invalid payload entry".into());
            }
        }
        if !self
            .files
            .iter()
            .any(|f| f.path == self.binary && f.mode == "755")
            || !self.files.iter().any(|f| f.path == "Contents/Info.plist")
        {
            return Err("Missing required bundle assets".into());
        }
        Ok(())
    }
}
/// Parse the OS account database's single requested home attribute, preserving spaces.
pub fn account_home(record: &str) -> Result<PathBuf> {
    let value = record
        .strip_prefix("NFSHomeDirectory:")
        .ok_or("OS account home attribute unavailable")?;
    let value = value.strip_prefix(' ').unwrap_or(value);
    let value = value.strip_suffix('\n').unwrap_or(value);
    if value.is_empty() || value.chars().any(char::is_control) {
        return Err("OS account home attribute is invalid".into());
    }
    let home = PathBuf::from(value);
    if !value.starts_with('/') || value.split('/').any(|part| part == ".." || part == ".") {
        return Err("OS account home must be absolute".into());
    }
    Ok(home)
}
/// Observe supported profile operands without creating missing directories or following redirects.
pub fn recipient_state(home: &Path) -> Result<Vec<gallery_update::StateOperand>> {
    let home = fs::canonicalize(home)?;
    if !fs::metadata(&home)?.is_dir() {
        return Err("OS account home is not a directory".into());
    }
    let mut result = Vec::new();
    for (kind, relative) in [
        (
            "settings",
            "Library/Application Support/tech.shruggie.local-media-gallery/settings.json",
        ),
        (
            "history",
            "Library/Application Support/tech.shruggie.local-media-gallery/state/history.sqlite3",
        ),
    ] {
        let path = home.join(relative);
        let mut current = home.clone();
        let components: Vec<_> = Path::new(relative).components().collect();
        for (index, component) in components.iter().enumerate() {
            current.push(component.as_os_str());
            match fs::symlink_metadata(&current) {
                Ok(metadata) => {
                    if metadata.file_type().is_symlink()
                        || (index + 1 < components.len() && !metadata.is_dir())
                        || (index + 1 == components.len() && !metadata.is_file())
                    {
                        return Err(
                            "Recipient state path is redirected or has an unsupported type".into(),
                        );
                    }
                    #[cfg(unix)]
                    if metadata.is_file() {
                        use std::os::unix::fs::MetadataExt;
                        if metadata.nlink() != 1 {
                            return Err("Recipient state must not be hard-linked".into());
                        }
                    }
                }
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => break,
                Err(error) => return Err(error.into()),
            }
        }
        result.push(gallery_update::StateOperand {
            kind: kind.into(),
            path,
        });
    }
    Ok(result)
}
pub fn relative(value: &str) -> Result<()> {
    if value.is_empty()
        || value.contains(['\\', ':'])
        || value.chars().any(char::is_control)
        || value
            .split('/')
            .any(|s| s.is_empty() || s == "." || s == "..")
        || !Path::new(value)
            .components()
            .all(|c| matches!(c, Component::Normal(_)))
    {
        return Err("Unsafe payload path".into());
    }
    Ok(())
}
pub fn no_links(base: &Path, relative: &Path) -> Result<PathBuf> {
    let mut p = base.to_path_buf();
    if fs::symlink_metadata(&p)?.file_type().is_symlink() {
        return Err("Redirected bundle".into());
    }
    for c in relative.components() {
        if !matches!(c, Component::Normal(_)) {
            return Err("Unsafe path".into());
        }
        p.push(c);
        if fs::symlink_metadata(&p)?.file_type().is_symlink() {
            return Err("Redirected payload".into());
        }
    }
    Ok(p)
}
pub fn matches_file(base: &Path, entry: &File) -> Result<bool> {
    let p = no_links(base, Path::new(&entry.path))?;
    let meta = fs::symlink_metadata(&p)?;
    if !meta.is_file() {
        return Ok(false);
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::{MetadataExt, PermissionsExt};
        if meta.nlink() != 1 {
            return Ok(false);
        }
        if format!("{:03o}", meta.permissions().mode() & 0o777) != entry.mode {
            return Ok(false);
        }
    }
    Ok(meta.len().to_string() == entry.bytes && hash(&fs::read(p)?) == entry.sha256)
}
pub fn verify(base: &Path, payload: &Payload, exact: bool) -> Result<()> {
    payload.validate()?;
    for f in &payload.files {
        if !matches_file(base, f)? {
            return Err(format!("Changed package file: {}", f.path).into());
        }
    }
    if exact {
        let mut paths = Vec::new();
        walk(base, base, &mut paths)?;
        paths.sort();
        let mut expected: Vec<_> = payload.files.iter().map(|f| f.path.clone()).collect();
        expected.sort();
        if paths != expected {
            return Err("Unexpected bundle content".into());
        }
    }
    Ok(())
}
fn walk(base: &Path, dir: &Path, files: &mut Vec<String>) -> Result<()> {
    for e in fs::read_dir(dir)? {
        let e = e?;
        let m = fs::symlink_metadata(e.path())?;
        if m.file_type().is_symlink() {
            return Err("Payload link".into());
        }
        if m.is_dir() {
            walk(base, &e.path(), files)?
        } else if m.is_file() {
            files.push(
                e.path()
                    .strip_prefix(base)?
                    .to_str()
                    .ok_or("Invalid UTF8 payload path")?
                    .replace('\\', "/"),
            )
        } else {
            return Err("Special payload entry".into());
        }
    }
    Ok(())
}

/// Resolve existing OS aliases, then retain absent normal suffix components.
/// No mutation occurs here. An existing final symlink is always a collision.
pub fn command_location(value: &Path) -> Result<PathBuf> {
    let parent = value.parent().ok_or("Missing command parent")?;
    Ok(fs::canonicalize(parent)?.join(value.file_name().ok_or("Missing command name")?))
}

pub fn destination(value: &Path) -> Result<PathBuf> {
    if !value.is_absolute()
        || value
            .components()
            .any(|c| matches!(c, Component::ParentDir | Component::CurDir))
        || value
            .as_os_str()
            .to_string_lossy()
            .chars()
            .any(char::is_control)
    {
        return Err("Supply a normal absolute destination".into());
    }
    if fs::symlink_metadata(value).is_ok_and(|m| m.file_type().is_symlink()) {
        return Err("Destination is a symlink".into());
    }
    let mut existing = value;
    let mut suffix = Vec::new();
    while !existing.exists() {
        suffix.push(
            existing
                .file_name()
                .ok_or("Invalid destination")?
                .to_owned(),
        );
        existing = existing.parent().ok_or("Invalid ancestor")?
    }
    let mut resolved = fs::canonicalize(existing)?;
    for c in suffix.into_iter().rev() {
        resolved.push(c)
    }
    Ok(resolved)
}

#[cfg(unix)]
mod lifecycle {
    use super::*;
    use std::os::unix::fs::{MetadataExt, OpenOptionsExt, PermissionsExt, symlink};
    #[derive(Debug, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct Receipt {
        scope: String,
        directory: PathBuf,
        command: PathBuf,
        payload: Payload,
    }
    pub fn receipt_path(app: &Path) -> Result<PathBuf> {
        Ok(app.parent().ok_or("Missing parent")?.join(format!(
            ".{}.lmg-install.json",
            app.file_name()
                .ok_or("Missing app name")?
                .to_str()
                .ok_or("Invalid app name")?
        )))
    }
    fn receipt(app: &Path, command: &Path, scope: &str, payload: &Payload) -> Result<Receipt> {
        let file = receipt_path(app)?;
        if fs::symlink_metadata(&file)?.file_type().is_symlink() {
            return Err("Redirected receipt".into());
        }
        let r: Receipt = serde_json::from_slice(
            &gallery_update::read_receipt(&file).map_err(std::io::Error::other)?,
        )?;
        if r.scope != scope || r.directory != app || r.command != command || r.payload != *payload {
            return Err("Installation identity differs; use matching candidate".into());
        }
        Ok(r)
    }
    fn link(command: &Path, app: &Path, payload: &Payload) -> Result<()> {
        if !fs::symlink_metadata(command)?.file_type().is_symlink()
            || fs::read_link(command)? != app.join(&payload.binary)
        {
            return Err("Command ownership differs".into());
        }
        Ok(())
    }

    fn update_candidate(
        p: &Payload,
        integration: Option<gallery_update::Integration>,
    ) -> Result<gallery_update::Candidate> {
        p.validate()?;
        Ok(gallery_update::Candidate {
            format_version: 1,
            product: p.product.clone(),
            version: p.version.clone(),
            edition: p.edition.clone(),
            os: p.os.clone(),
            arch: p.arch.clone(),
            generation: p.generation.clone(),
            source: gallery_update::Source {
                sha256: p.source["sha256"]
                    .as_str()
                    .ok_or("Missing source digest")?
                    .into(),
                files: p.source["files"].as_u64().ok_or("Missing source count")?,
            },
            binary: p.binary.clone(),
            files: p
                .files
                .iter()
                .map(|f| {
                    Ok(gallery_update::FileRecord {
                        path: f.path.clone(),
                        bytes: f.bytes.clone(),
                        sha256: f.sha256.clone(),
                        mode: f.mode.parse()?,
                    })
                })
                .collect::<Result<Vec<_>>>()?,
            native: gallery_update::Native::Direct,
            integration,
        })
    }
    /// Select only journals published at their original authenticated location. Historical
    /// renamed diagnostic directories are never recovery authority.
    pub fn managed_transaction(updates: &Path, generation: &str) -> Result<Option<PathBuf>> {
        let metadata = fs::symlink_metadata(updates)?;
        if !metadata.is_dir()
            || metadata.file_type().is_symlink()
            || metadata.uid() != effective_owner()
            || metadata.mode() & 0o077 != 0
        {
            return Err("Maintenance root owner, permissions or physical type differs".into());
        }
        let canonical = updates.join(generation);
        let mut choices = Vec::new();
        match fs::symlink_metadata(&canonical) {
            Ok(_) => choices.push((0_u128, canonical)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        }
        let prefix = format!("{generation}-attempt-");
        for entry in fs::read_dir(updates)? {
            let entry = entry?;
            if let Some(name) = entry.file_name().to_str()
                && let Some(suffix) = name.strip_prefix(&prefix)
                && let Ok(order) = suffix.parse::<u128>()
                && order > 0
                && suffix == order.to_string()
            {
                choices.push((order, entry.path()));
            }
        }
        choices.sort_by_key(|(order, _)| *order);
        Ok(choices.pop().map(|(_, path)| path))
    }
    fn full_candidate(
        payload: &Payload,
        app: &Path,
        command: &Path,
        bytes: String,
    ) -> Result<gallery_update::Candidate> {
        update_candidate(
            payload,
            Some(gallery_update::Integration {
                command: command.into(),
                receipt: receipt_path(app)?,
                receipt_bytes: bytes,
            }),
        )
    }
    fn expected_full_candidate(
        payload: &Payload,
        app: &Path,
        command: &Path,
    ) -> Result<gallery_update::Candidate> {
        full_candidate(
            payload,
            app,
            command,
            serde_json::to_string_pretty(&Receipt {
                scope: "system".into(),
                directory: app.into(),
                command: command.into(),
                payload: payload.clone(),
            })?,
        )
    }
    /// Repeating an installer or explicitly reinstalling after rollback uses the
    /// retained next bytes. A different completely owned predecessor gets a new
    /// transaction at a new initially bound path, leaving previous authority intact.
    pub fn reactivate_managed(
        transaction: &Path,
        app: &Path,
        command: &Path,
        payload: &Payload,
    ) -> Result<Option<serde_json::Value>> {
        let mut operation = gallery_update::Transaction::open(transaction)?;
        let _lease = destination_lease(app)?;
        let status = operation.status()?;
        if status.directory != app
            || operation.next_candidate() != &expected_full_candidate(payload, app, command)?
        {
            return Err(
                "Retained update destination or incoming candidate differs from this installer"
                    .into(),
            );
        }
        if ["committed", "restored"].contains(&status.phase.as_str()) {
            if fs::symlink_metadata(app)
                .is_err_and(|error| error.kind() == std::io::ErrorKind::NotFound)
            {
                return Ok(None);
            }
            let installed = match owned_payload(app, command, "system") {
                Ok(installed) => installed,
                Err(_) if receipt(app, command, "system", payload).is_ok() => return Ok(None),
                Err(error) => return Err(error),
            };
            let bytes =
                gallery_update::read_receipt(&receipt_path(app)?).map_err(std::io::Error::other)?;
            let current = full_candidate(&installed, app, command, String::from_utf8(bytes)?)?;
            if current != *operation.prior_candidate() && current != *operation.next_candidate() {
                return Ok(None);
            }
        }
        Ok(Some(serde_json::to_value(
            operation.apply_verified(false)?,
        )?))
    }
    pub fn rollback_managed(
        transaction: &Path,
        app: &Path,
        command: &Path,
        payload: &Payload,
    ) -> Result<serde_json::Value> {
        let mut operation = gallery_update::Transaction::open(transaction)?;
        let _lease = destination_lease(app)?;
        if operation.status()?.directory != app
            || operation.next_candidate() != &expected_full_candidate(payload, app, command)?
        {
            return Err(
                "Retained rollback destination or incoming candidate differs from this installer"
                    .into(),
            );
        }
        Ok(serde_json::to_value(operation.apply_verified(true)?)?)
    }
    pub struct UpdateOptions<'a> {
        pub prior_lite: Option<&'a Payload>,
        pub transaction: &'a Path,
        pub state: &'a [gallery_update::StateOperand],
        pub activate: bool,
    }
    pub fn update(
        source: &Path,
        app: &Path,
        command: &Path,
        scope: &str,
        payload: &Payload,
        options: UpdateOptions<'_>,
    ) -> Result<serde_json::Value> {
        let UpdateOptions {
            prior_lite,
            transaction,
            state,
            activate,
        } = options;
        verify(source, payload, true)?;
        let _lease = if payload.edition == "full" {
            Some(install_lock(app)?)
        } else {
            None
        };
        let (prior, old_integration, new_integration) = if payload.edition == "full" {
            let file = receipt_path(app)?;
            let bytes = gallery_update::read_receipt(&file).map_err(std::io::Error::other)?;
            let old: Receipt = serde_json::from_slice(&bytes)?;
            if old.scope != scope || old.directory != app || old.command != command {
                return Err("Installed receipt scope/destination differs".into());
            }
            old.payload.validate()?;
            verify(app, &old.payload, false)?;
            link(command, app, &old.payload)?;
            let next = Receipt {
                scope: scope.into(),
                directory: app.into(),
                command: command.into(),
                payload: payload.clone(),
            };
            (
                old.payload,
                Some(gallery_update::Integration {
                    command: command.into(),
                    receipt: file.clone(),
                    receipt_bytes: String::from_utf8(bytes)?,
                }),
                Some(gallery_update::Integration {
                    command: command.into(),
                    receipt: file,
                    receipt_bytes: serde_json::to_string_pretty(&next)?,
                }),
            )
        } else {
            let old = prior_lite.ok_or("Lite update requires the retained prior candidate.json")?;
            if old.edition != "lite" {
                return Err("Lite predecessor edition differs".into());
            }
            (old.clone(), None, None)
        };
        let old = update_candidate(&prior, old_integration)?;
        let next = update_candidate(payload, new_integration)?;
        let mut operation =
            gallery_update::Transaction::prepare(transaction, app, &old, &next, source, state)?;
        Ok(serde_json::to_value(if activate {
            operation.apply_verified(false)?
        } else {
            operation.status()?
        })?)
    }
    pub struct InstallLease(fs::File);
    impl Drop for InstallLease {
        fn drop(&mut self) {
            let _ = self.0.unlock();
        }
    }
    fn effective_owner() -> u32 {
        unsafe extern "C" {
            fn geteuid() -> u32;
        }
        unsafe { geteuid() }
    }
    pub fn destination_lease(app: &Path) -> Result<InstallLease> {
        install_lock(app)
    }
    fn install_lock(app: &Path) -> Result<InstallLease> {
        let file = receipt_path(app)?.with_extension("lock");
        let mut options = fs::OpenOptions::new();
        options
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .mode(0o600);
        #[cfg(target_os = "macos")]
        options.custom_flags(0x100);
        #[cfg(target_os = "linux")]
        options.custom_flags(0x20000);
        let handle = options.open(&file)?;
        let metadata = handle.metadata()?;
        let current = fs::symlink_metadata(&file)?;
        if !metadata.is_file()
            || current.file_type().is_symlink()
            || metadata.uid() != effective_owner()
            || metadata.mode() & 0o077 != 0
            || metadata.nlink() != 1
            || metadata.dev() != current.dev()
            || metadata.ino() != current.ino()
        {
            return Err("First-install lock owner, permissions or identity differs".into());
        }
        handle
            .try_lock()
            .map_err(|error| format!("Another installer owns the destination lock: {error}"))?;
        Ok(InstallLease(handle))
    }
    fn sync_directory(path: &Path) -> Result<()> {
        fs::File::open(path)?.sync_all()?;
        Ok(())
    }
    fn owned_directory(path: &Path) -> Result<()> {
        let metadata = fs::symlink_metadata(path)?;
        if !metadata.is_dir()
            || metadata.file_type().is_symlink()
            || metadata.uid() != effective_owner()
            || metadata.mode() & 0o022 != 0
        {
            return Err("Owned installation directory changed owner, mode or type".into());
        }
        Ok(())
    }
    fn inspect_partial(app: &Path, payload: &Payload) -> Result<usize> {
        let mut expected_dirs = std::collections::BTreeSet::new();
        for file in &payload.files {
            let mut parent = Path::new(&file.path).parent();
            while let Some(path) = parent {
                if path.as_os_str().is_empty() {
                    break;
                }
                expected_dirs.insert(path.to_path_buf());
                parent = path.parent();
            }
        }
        fn inspect(
            base: &Path,
            current: &Path,
            payload: &Payload,
            dirs: &std::collections::BTreeSet<PathBuf>,
            present: &mut usize,
        ) -> Result<()> {
            owned_directory(current)?;
            for entry in fs::read_dir(current)? {
                let entry = entry?;
                let metadata = fs::symlink_metadata(entry.path())?;
                let relative = entry.path().strip_prefix(base)?.to_path_buf();
                if metadata.file_type().is_symlink() {
                    return Err("Redirected owned installation entry".into());
                }
                if metadata.is_dir() {
                    if !dirs.contains(&relative) {
                        return Err("Foreign directory prevents installation repair".into());
                    }
                    inspect(base, &entry.path(), payload, dirs, present)?;
                } else if metadata.is_file() {
                    let name = relative.to_str().ok_or("Invalid owned entry name")?;
                    let file = payload
                        .files
                        .iter()
                        .find(|f| f.path == name)
                        .ok_or("Foreign file prevents installation repair")?;
                    if metadata.uid() != effective_owner()
                        || metadata.nlink() != 1
                        || !matches_file(base, file)?
                    {
                        return Err(
                            "Changed or aliased owned file prevents installation repair".into()
                        );
                    }
                    *present += 1;
                } else {
                    return Err("Special entry prevents installation repair".into());
                }
            }
            Ok(())
        }
        let mut present = 0;
        inspect(app, app, payload, &expected_dirs, &mut present)?;
        Ok(present)
    }
    fn publish_file(from: &Path, to: &Path) -> Result<()> {
        use std::{
            ffi::CString,
            os::{fd::AsRawFd, unix::ffi::OsStrExt},
        };
        let from_parent = from.parent().ok_or("Missing staged parent")?;
        let to_parent = to.parent().ok_or("Missing destination parent")?;
        // Standard /Applications may be admin-group writable. Authority files
        // themselves remain singly linked and owner-only; app payload dirs are stricter.
        for parent in [from_parent, to_parent] {
            let metadata = fs::symlink_metadata(parent)?;
            if !metadata.is_dir()
                || metadata.file_type().is_symlink()
                || metadata.uid() != effective_owner()
                || metadata.mode() & 0o002 != 0
            {
                return Err("Publication parent owner or type differs".into());
            }
        }
        let before = fs::symlink_metadata(from)?;
        if !before.is_file() || before.uid() != effective_owner() || before.nlink() != 1 {
            return Err("Staged publication file identity differs".into());
        }
        let a = fs::File::open(from_parent)?;
        let b = fs::File::open(to_parent)?;
        let from_name = CString::new(from.file_name().ok_or("Missing staged leaf")?.as_bytes())?;
        let to_name = CString::new(to.file_name().ok_or("Missing destination leaf")?.as_bytes())?;
        #[cfg(target_os = "macos")]
        let result = {
            unsafe extern "C" {
                fn renameatx_np(a: i32, from: *const i8, b: i32, to: *const i8, flags: u32) -> i32;
            }
            unsafe {
                renameatx_np(
                    a.as_raw_fd(),
                    from_name.as_ptr(),
                    b.as_raw_fd(),
                    to_name.as_ptr(),
                    4,
                )
            }
        };
        #[cfg(target_os = "linux")]
        let result = {
            unsafe extern "C" {
                fn renameat2(a: i32, from: *const i8, b: i32, to: *const i8, flags: u32) -> i32;
            }
            unsafe {
                renameat2(
                    a.as_raw_fd(),
                    from_name.as_ptr(),
                    b.as_raw_fd(),
                    to_name.as_ptr(),
                    1,
                )
            }
        };
        if result != 0 {
            return Err(std::io::Error::last_os_error().into());
        }
        let after = fs::symlink_metadata(to)?;
        if !after.is_file()
            || after.uid() != before.uid()
            || after.dev() != before.dev()
            || after.ino() != before.ino()
            || after.nlink() != 1
        {
            return Err("Published file identity changed".into());
        }
        Ok(())
    }
    fn publish_intent(app: &Path, command: &Path, scope: &str, payload: &Payload) -> Result<()> {
        let parent = app.parent().ok_or("Missing app parent")?;
        let record = Receipt {
            scope: scope.into(),
            directory: app.into(),
            command: command.into(),
            payload: payload.clone(),
        };
        let mut file = tempfile::NamedTempFile::new_in(parent)?;
        use std::io::Write;
        file.write_all(&serde_json::to_vec_pretty(&record)?)?;
        file.as_file().sync_all()?;
        publish_file(file.path(), &receipt_path(app)?)?;
        sync_directory(parent)
    }
    fn validate_command(command: &Path, app: &Path, payload: &Payload) -> Result<bool> {
        match fs::symlink_metadata(command) {
            Ok(metadata) => {
                if metadata.uid() != effective_owner() || metadata.nlink() != 1 {
                    return Err("Command owner or alias differs".into());
                }
                link(command, app, payload)?;
                Ok(true)
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(error) => Err(error.into()),
        }
    }
    pub fn install(
        source: &Path,
        app: &Path,
        command: &Path,
        scope: &str,
        payload: &Payload,
        path: &std::ffi::OsStr,
    ) -> Result<serde_json::Value> {
        verify(source, payload, true)?;
        if !["user", "system"].contains(&scope)
            || app.extension().is_none_or(|v| v != "app")
            || command
                .file_name()
                .is_none_or(|v| v != "local-media-gallery")
            || source == app
        {
            return Err("Invalid installation request".into());
        }
        for directory in std::env::split_paths(path) {
            let candidate = directory.join("local-media-gallery");
            if fs::symlink_metadata(&candidate).is_ok() && command_location(&candidate)? != command
            {
                return Err("Existing visible command collision".into());
            }
        }
        let authority = receipt_path(app)?;
        let has_authority = fs::symlink_metadata(&authority).is_ok();
        if has_authority {
            receipt(app, command, scope, payload)?;
        } else if fs::symlink_metadata(app).is_ok() || fs::symlink_metadata(command).is_ok() {
            return Err("Unowned application or command collision".into());
        }
        let parent = app.parent().ok_or("Missing app parent")?;
        let bin = command.parent().ok_or("Missing command parent")?;
        fs::create_dir_all(parent)?;
        fs::create_dir_all(bin)?;
        let _lease = install_lock(app)?;
        // Re-evaluate every authority/collision after admitting the exclusive operation.
        let recovering = fs::symlink_metadata(&authority).is_ok();
        if recovering {
            receipt(app, command, scope, payload)?;
        } else {
            if fs::symlink_metadata(app).is_ok() || fs::symlink_metadata(command).is_ok() {
                return Err("Unowned installation appeared during admission".into());
            }
            publish_intent(app, command, scope, payload)?;
        }
        let staging = tempfile::Builder::new()
            .prefix(".lmg-install-staging-")
            .tempdir_in(parent)?;
        fs::set_permissions(staging.path(), fs::Permissions::from_mode(0o700))?;
        let exists = fs::symlink_metadata(app).is_ok();
        if !exists {
            fs::create_dir(app)?;
            sync_directory(parent)?;
        }
        let present = inspect_partial(app, payload)?;
        let linked = validate_command(command, app, payload)?;
        let complete = exists && present == payload.files.len() && linked;
        for file in &payload.files {
            let target = app.join(&file.path);
            if fs::symlink_metadata(&target).is_ok() {
                continue;
            }
            let parent = target.parent().ok_or("Missing owned parent")?;
            let relative = parent.strip_prefix(app)?;
            let mut current = app.to_path_buf();
            for component in relative.components() {
                current.push(component.as_os_str());
                match fs::symlink_metadata(&current) {
                    Ok(_) => owned_directory(&current)?,
                    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                        fs::create_dir(&current)?;
                        sync_directory(current.parent().unwrap())?;
                        owned_directory(&current)?;
                    }
                    Err(error) => return Err(error.into()),
                }
            }
            // A canonical target is published only after its complete bytes are synced.
            let bytes = fs::read(no_links(source, Path::new(&file.path))?)?;
            if bytes.len().to_string() != file.bytes || hash(&bytes) != file.sha256 {
                return Err("Installer source changed before repair".into());
            }
            let mut temporary = tempfile::NamedTempFile::new_in(staging.path())?;
            use std::io::Write;
            temporary.write_all(&bytes)?;
            temporary
                .as_file()
                .set_permissions(fs::Permissions::from_mode(u32::from_str_radix(
                    &file.mode, 8,
                )?))?;
            temporary.as_file().sync_all()?;
            publish_file(temporary.path(), &target)?;
            sync_directory(parent)?;
        }
        if inspect_partial(app, payload)? != payload.files.len() {
            return Err("Installation remains incomplete; retain matching installer".into());
        }
        if !validate_command(command, app, payload)? {
            symlink(app.join(&payload.binary), command)?;
            sync_directory(bin)?;
        }
        verify(app, payload, true)?;
        receipt(app, command, scope, payload)?;
        Ok(
            serde_json::json!({"result":if complete{"already-installed"}else{"installed"},"recovered":recovering&&!complete,"scope":scope,"directory":app,"command":command,"payloadSha256":hash(&serde_json::to_vec(payload)?)}),
        )
    }
    fn remove_files(app: &Path, payload: &Payload) -> Result<Vec<String>> {
        let mut retained = Vec::new();
        let mut dirs = std::collections::BTreeSet::new();
        for f in &payload.files {
            let p = app.join(&f.path);
            if !p.exists() && fs::symlink_metadata(&p).is_err() {
                continue;
            }
            if matches_file(app, f).unwrap_or(false) {
                fs::remove_file(&p)?
            } else {
                retained.push(f.path.clone())
            }
            let mut parent = p.parent();
            while let Some(d) = parent {
                if !d.starts_with(app) {
                    break;
                }
                dirs.insert(d.to_path_buf());
                if d == app {
                    break;
                }
                parent = d.parent()
            }
        }
        let mut dirs: Vec<_> = dirs.into_iter().collect();
        dirs.sort_by_key(|d| std::cmp::Reverse(d.components().count()));
        for d in dirs {
            let _ = fs::remove_dir(d);
        }
        if app.exists() {
            let mut extras = Vec::new();
            walk(app, app, &mut extras).unwrap_or(());
            retained.extend(extras);
            retained.sort();
            retained.dedup()
        }
        Ok(retained)
    }
    /// Discover the installed identity from an ownership receipt, never a user-selected JSON operand.
    pub fn owned_payload(app: &Path, command: &Path, scope: &str) -> Result<Payload> {
        let file = receipt_path(app)?;
        let bytes = gallery_update::read_receipt(&file).map_err(std::io::Error::other)?;
        let installed: Receipt = serde_json::from_slice(&bytes)?;
        installed.payload.validate()?;
        if installed.payload.edition != "full" {
            return Err("Managed maintenance requires owned Full installation".into());
        }
        receipt(app, command, scope, &installed.payload)?;
        link(command, app, &installed.payload)?;
        if fs::symlink_metadata(app)?.file_type().is_symlink() {
            return Err("Redirected application".into());
        }
        Ok(installed.payload)
    }
    pub fn managed_install(
        source: &Path,
        app: &Path,
        command: &Path,
        payload: &Payload,
        transaction: &Path,
        state: &[gallery_update::StateOperand],
        path: &std::ffi::OsStr,
    ) -> Result<serde_json::Value> {
        payload.validate()?;
        if payload.edition != "full" {
            return Err("Managed installation requires Full payload".into());
        }
        if fs::symlink_metadata(app).is_err() || receipt(app, command, "system", payload).is_ok() {
            return install(source, app, command, "system", payload, path);
        }
        let prior = owned_payload(app, command, "system")?;
        if prior == *payload {
            return install(source, app, command, "system", payload, path);
        }
        update(
            source,
            app,
            command,
            "system",
            payload,
            UpdateOptions {
                prior_lite: None,
                transaction,
                state,
                activate: true,
            },
        )
    }
    pub fn managed_remove(app: &Path, command: &Path) -> Result<serde_json::Value> {
        let prior = owned_payload(app, command, "system")?;
        remove(app, command, "system", &prior)
    }
    pub fn remove(
        app: &Path,
        command: &Path,
        scope: &str,
        payload: &Payload,
    ) -> Result<serde_json::Value> {
        payload.validate()?;
        let _lease = install_lock(app)?;
        receipt(app, command, scope, payload)?;
        link(command, app, payload)?;
        if fs::symlink_metadata(app)?.file_type().is_symlink() {
            return Err("Redirected application".into());
        }
        fs::remove_file(command)?;
        let retained = remove_files(app, payload)?;
        fs::remove_file(receipt_path(app)?)?;
        Ok(
            serde_json::json!({"result":"removed","scope":scope,"directory":app,"command":command,"retained":retained}),
        )
    }

    #[cfg(test)]
    mod fresh_install_tests {
        use super::*;
        struct Fixture {
            _temp: tempfile::TempDir,
            source: PathBuf,
            app: PathBuf,
            command: PathBuf,
            payload: Payload,
        }
        fn fixture() -> Fixture {
            let temp = tempfile::tempdir().unwrap();
            let root = fs::canonicalize(temp.path()).unwrap();
            let source = root.join("source");
            let app = root.join("Full.app");
            let command = root.join("bin/local-media-gallery");
            fs::create_dir(command.parent().unwrap()).unwrap();
            let mut payload = crate::tests::payload();
            payload.version = "0.2.0".into();
            for file in &payload.files {
                let path = source.join(&file.path);
                fs::create_dir_all(path.parent().unwrap()).unwrap();
                fs::write(&path, b"app").unwrap();
                fs::set_permissions(
                    path,
                    fs::Permissions::from_mode(u32::from_str_radix(&file.mode, 8).unwrap()),
                )
                .unwrap();
            }
            Fixture {
                _temp: temp,
                source,
                app,
                command,
                payload,
            }
        }
        fn install(f: &Fixture) -> Result<serde_json::Value> {
            managed_install(
                &f.source,
                &f.app,
                &f.command,
                &f.payload,
                &f.source.with_extension("transaction"),
                &[],
                std::ffi::OsStr::new(""),
            )
        }
        #[cfg(target_os = "macos")]
        fn executable_payload(
            source: &Path,
            payload: &mut Payload,
            version: &str,
            generation: &str,
        ) {
            payload.version = version.into();
            payload.generation = generation.into();
            let value = serde_json::json!({"product":payload.product,"version":version,"edition":"full","os":"macos","arch":"aarch64","data":{"buildProfile":"release","targetTriple":"aarch64-apple-darwin"}});
            let script = format!("#!/bin/sh\nprintf '%s\\n' '{}'\n", value);
            let binary = source.join(&payload.binary);
            fs::write(&binary, script.as_bytes()).unwrap();
            fs::set_permissions(&binary, fs::Permissions::from_mode(0o755)).unwrap();
            let file = payload
                .files
                .iter_mut()
                .find(|file| file.path == payload.binary)
                .unwrap();
            file.bytes = script.len().to_string();
            file.sha256 = hash(script.as_bytes());
            payload.source =
                serde_json::json!({"sha256":hash(script.as_bytes()),"files":payload.files.len()});
        }
        // Positive activation binds a macOS target and must execute on that native host.
        #[cfg(target_os = "macos")]
        #[test]
        fn ordinary_repeat_rollback_reactivation_preserves_bound_journal_and_distinct_prior_gets_new_cycle()
         {
            fn current_only_resource(source: &Path, payload: &mut Payload) {
                let name = "Contents/Resources/current-only/nested/resource.txt";
                let file = source.join(name);
                fs::create_dir_all(file.parent().unwrap()).unwrap();
                fs::write(&file, b"current-only").unwrap();
                fs::set_permissions(&file, fs::Permissions::from_mode(0o644)).unwrap();
                if !payload.files.iter().any(|entry| entry.path == name) {
                    payload.files.push(File {
                        path: name.into(),
                        bytes: "12".into(),
                        sha256: hash(b"current-only"),
                        mode: "644".into(),
                    });
                }
                payload.source["files"] = serde_json::json!(payload.files.len());
            }
            let f = fixture();
            let root = f.source.parent().unwrap().join("updates");
            fs::create_dir(&root).unwrap();
            fs::set_permissions(&root, fs::Permissions::from_mode(0o700)).unwrap();
            let mut prior = f.payload.clone();
            executable_payload(&f.source, &mut prior, "0.1.0", &"a".repeat(64));
            super::install(
                &f.source,
                &f.app,
                &f.command,
                "system",
                &prior,
                std::ffi::OsStr::new(""),
            )
            .unwrap();
            let bytes = gallery_update::read_receipt(&receipt_path(&f.app).unwrap()).unwrap();
            let old = full_candidate(
                &prior,
                &f.app,
                &f.command,
                String::from_utf8(bytes).unwrap(),
            )
            .unwrap();
            let mut next = f.payload.clone();
            executable_payload(&f.source, &mut next, "0.2.0", &"b".repeat(64));
            current_only_resource(&f.source, &mut next);
            let transaction = root.join(&next.generation);
            let mut operation = gallery_update::Transaction::prepare(
                &transaction,
                &f.app,
                &old,
                &expected_full_candidate(&next, &f.app, &f.command).unwrap(),
                &f.source,
                &[],
            )
            .unwrap();
            operation.apply(false).unwrap();
            drop(operation);
            let identity = fs::read(transaction.join("identity.json")).unwrap();
            assert!(
                reactivate_managed(&transaction, &f.app, &f.command, &next)
                    .unwrap()
                    .is_some()
            );
            assert_eq!(
                rollback_managed(&transaction, &f.app, &f.command, &next).unwrap()["phase"],
                "restored"
            );
            assert_eq!(owned_payload(&f.app, &f.command, "system").unwrap(), prior);
            assert!(!f.app.join("Contents/Resources/current-only").exists());
            assert!(
                reactivate_managed(&transaction, &f.app, &f.command, &next)
                    .unwrap()
                    .is_some()
            );
            assert_eq!(owned_payload(&f.app, &f.command, "system").unwrap(), next);
            assert_eq!(
                fs::read(transaction.join("identity.json")).unwrap(),
                identity
            );
            let mut wrong = next.clone();
            wrong.generation = "d".repeat(64);
            assert!(rollback_managed(&transaction, &f.app, &f.command, &wrong).is_err());
            super::remove(&f.app, &f.command, "system", &next).unwrap();
            fs::remove_file(
                f.source
                    .join("Contents/Resources/current-only/nested/resource.txt"),
            )
            .unwrap();
            let mut other = prior.clone();
            executable_payload(&f.source, &mut other, "0.1.1", &"c".repeat(64));
            super::install(
                &f.source,
                &f.app,
                &f.command,
                "system",
                &other,
                std::ffi::OsStr::new(""),
            )
            .unwrap();
            assert!(
                reactivate_managed(&transaction, &f.app, &f.command, &next)
                    .unwrap()
                    .is_none()
            );
            assert_eq!(owned_payload(&f.app, &f.command, "system").unwrap(), other);
            executable_payload(&f.source, &mut next, "0.2.0", &"b".repeat(64));
            current_only_resource(&f.source, &mut next);
            let attempt = root.join(format!("{}-attempt-1", next.generation));
            super::update(
                &f.source,
                &f.app,
                &f.command,
                "system",
                &next,
                UpdateOptions {
                    prior_lite: None,
                    transaction: &attempt,
                    state: &[],
                    activate: true,
                },
            )
            .unwrap();
            assert_eq!(
                managed_transaction(&root, &next.generation).unwrap(),
                Some(attempt.clone())
            );
            rollback_managed(&attempt, &f.app, &f.command, &next).unwrap();
            assert_eq!(owned_payload(&f.app, &f.command, "system").unwrap(), other);
            fs::create_dir(root.join(format!("{}-retained-999", next.generation))).unwrap();
            assert_eq!(
                managed_transaction(&root, &next.generation).unwrap(),
                Some(attempt)
            );
            assert_eq!(
                fs::read(transaction.join("identity.json")).unwrap(),
                identity
            );
            assert_eq!(
                managed_remove(&f.app, &f.command).unwrap()["result"],
                "removed"
            );
            assert!(
                !f.app.exists(),
                "Restored prior removal leaves no next-only empty directories"
            );
        }
        #[test]
        fn durable_first_intent_recovers_absent_app_and_serializes_plain_and_managed_install() {
            let f = fixture();
            publish_intent(&f.app, &f.command, "system", &f.payload).unwrap();
            assert!(!f.app.exists());
            let lease = install_lock(&f.app).unwrap();
            assert!(install(&f).is_err());
            assert!(!f.app.exists());
            assert!(
                super::install(
                    &f.source,
                    &f.app,
                    &f.command,
                    "system",
                    &f.payload,
                    std::ffi::OsStr::new("")
                )
                .is_err()
            );
            drop(lease);
            let recovered = install(&f).unwrap();
            assert_eq!(recovered["result"], "installed");
            assert_eq!(recovered["recovered"], true);
            verify(&f.app, &f.payload, true).unwrap();
            assert_eq!(
                owned_payload(&f.app, &f.command, "system").unwrap(),
                f.payload
            );
        }
        #[test]
        fn missing_owned_files_repair_but_foreign_changed_and_aliased_bytes_refuse_before_writes() {
            let f = fixture();
            install(&f).unwrap();
            let binary = f.app.join(&f.payload.binary);
            let plist = f.app.join("Contents/Info.plist");
            fs::remove_file(&binary).unwrap();
            fs::remove_file(&f.command).unwrap();
            assert_eq!(install(&f).unwrap()["recovered"], true);
            verify(&f.app, &f.payload, true).unwrap();
            fs::remove_file(&binary).unwrap();
            fs::remove_file(&f.command).unwrap();
            fs::write(&plist, b"foreign content").unwrap();
            assert!(install(&f).is_err());
            assert!(!binary.exists());
            assert_eq!(fs::read(&plist).unwrap(), b"foreign content");
            fs::write(&plist, b"app").unwrap();
            let alias = f.source.with_extension("alias");
            fs::hard_link(&plist, &alias).unwrap();
            assert!(install(&f).is_err());
            assert!(!binary.exists());
            assert_eq!(fs::read(&alias).unwrap(), b"app");
            fs::remove_file(&alias).unwrap();
            fs::remove_file(&plist).unwrap();
            symlink(f.source.join("Contents/Info.plist"), &plist).unwrap();
            assert!(install(&f).is_err());
            assert!(!binary.exists());
            fs::remove_file(&plist).unwrap();
            fs::write(&plist, b"app").unwrap();
            fs::write(f.app.join("recipient-file"), b"keep").unwrap();
            assert!(install(&f).is_err());
            assert!(!binary.exists());
            assert_eq!(fs::read(f.app.join("recipient-file")).unwrap(), b"keep");
        }
        #[test]
        fn matching_foreign_application_without_authority_is_never_adopted() {
            let f = fixture();
            for file in &f.payload.files {
                let target = f.app.join(&file.path);
                fs::create_dir_all(target.parent().unwrap()).unwrap();
                fs::copy(f.source.join(&file.path), target).unwrap();
            }
            assert!(install(&f).is_err());
            assert!(!receipt_path(&f.app).unwrap().exists());
            for file in &f.payload.files {
                assert_eq!(fs::read(f.app.join(&file.path)).unwrap(), b"app");
            }
        }
        #[test]
        fn first_authority_hardlink_mode_and_symlink_changes_refuse_without_creating_app() {
            let f = fixture();
            publish_intent(&f.app, &f.command, "system", &f.payload).unwrap();
            let receipt = receipt_path(&f.app).unwrap();
            let alias = f.source.with_extension("authority");
            fs::hard_link(&receipt, &alias).unwrap();
            assert!(install(&f).is_err());
            assert!(!f.app.exists());
            fs::remove_file(&alias).unwrap();
            fs::set_permissions(&receipt, fs::Permissions::from_mode(0o666)).unwrap();
            assert!(install(&f).is_err());
            assert!(!f.app.exists());
            fs::set_permissions(&receipt, fs::Permissions::from_mode(0o600)).unwrap();
            fs::rename(&receipt, &alias).unwrap();
            symlink(&alias, &receipt).unwrap();
            assert!(install(&f).is_err());
            assert!(!f.app.exists());
        }
        #[test]
        fn full_update_and_removal_refuse_the_same_live_first_install_lease() {
            let f = fixture();
            install(&f).unwrap();
            let lease = install_lock(&f.app).unwrap();
            let failure = super::update(
                &f.source,
                &f.app,
                &f.command,
                "system",
                &f.payload,
                UpdateOptions {
                    prior_lite: None,
                    transaction: &f.source.with_extension("transaction"),
                    state: &[],
                    activate: true,
                },
            )
            .unwrap_err();
            assert!(failure.to_string().contains("lock"));
            assert!(
                super::remove(&f.app, &f.command, "system", &f.payload)
                    .unwrap_err()
                    .to_string()
                    .contains("lock")
            );
            assert!(super::managed_remove(&f.app, &f.command).is_err());
            verify(&f.app, &f.payload, true).unwrap();
            assert_eq!(
                fs::read_link(&f.command).unwrap(),
                f.app.join(&f.payload.binary)
            );
            drop(lease);
            assert_eq!(
                super::managed_remove(&f.app, &f.command).unwrap()["result"],
                "removed"
            );
        }
        #[test]
        fn atomic_publication_never_clobbers_existing_bytes_or_creates_extra_links() {
            let f = fixture();
            let staged = f.source.with_extension("staged");
            let target = f.source.with_extension("target");
            fs::write(&staged, b"complete payload").unwrap();
            fs::write(&target, b"foreign").unwrap();
            assert!(publish_file(&staged, &target).is_err());
            assert_eq!(fs::read(&target).unwrap(), b"foreign");
            assert_eq!(fs::read(&staged).unwrap(), b"complete payload");
            fs::remove_file(&target).unwrap();
            publish_file(&staged, &target).unwrap();
            assert!(!staged.exists());
            assert_eq!(fs::metadata(&target).unwrap().nlink(), 1);
            assert_eq!(fs::read(&target).unwrap(), b"complete payload");
        }
    }
}
#[cfg(unix)]
pub use lifecycle::{
    InstallLease, UpdateOptions, destination_lease, install, managed_install, managed_remove,
    managed_transaction, owned_payload, reactivate_managed, receipt_path, remove, rollback_managed,
    update,
};

#[cfg(test)]
mod tests {
    use super::*;
    pub(super) fn payload() -> Payload {
        serde_json::from_value(serde_json::json!({"formatVersion":1,"product":"local-media-gallery","kind":"macos-application-payload","version":"0.0.0","edition":"full","os":"macos","arch":"aarch64","targetTriple":"aarch64-apple-darwin","buildProfile":"release","generation":"test","source":{},"revision":"test","bundle":"Full.app","binary":"Contents/MacOS/local-media-gallery","files":[{"path":"Contents/MacOS/local-media-gallery","bytes":"3","sha256":hash(b"app"),"mode":"755"},{"path":"Contents/Info.plist","bytes":"3","sha256":hash(b"app"),"mode":"644"}]})).unwrap()
    }
    #[test]
    fn command_parent_alias_resolves_without_following_command_symlink() {
        let tmp = tempfile::tempdir().unwrap();
        let parent = tmp.path().join("bin");
        fs::create_dir(&parent).unwrap();
        let command = parent.join("local-media-gallery");
        fs::write(&command, b"command").unwrap();
        let alias = parent.join("..").join("bin").join("local-media-gallery");
        assert_eq!(
            command_location(&alias).unwrap(),
            fs::canonicalize(&parent)
                .unwrap()
                .join("local-media-gallery")
        );
        #[cfg(unix)]
        {
            let link = tmp.path().join("alias");
            std::os::unix::fs::symlink(&parent, &link).unwrap();
            assert_eq!(
                command_location(&link.join("local-media-gallery")).unwrap(),
                command_location(&command).unwrap()
            );
        }
    }
    #[test]
    fn account_database_home_and_absent_profile_observation_are_read_only() {
        assert_eq!(
            account_home("NFSHomeDirectory: /Volumes/Recipient homes/雪\n").unwrap(),
            PathBuf::from("/Volumes/Recipient homes/雪")
        );
        for invalid in [
            "NFSHomeDirectory: relative\n",
            "Other: /Users/guess\n",
            "NFSHomeDirectory: /Users/../other\n",
            "NFSHomeDirectory: /Users/user\nextra",
        ] {
            assert!(account_home(invalid).is_err());
        }
        let temp = tempfile::tempdir().unwrap();
        let expected = fs::canonicalize(temp.path()).unwrap();
        let state = recipient_state(temp.path()).unwrap();
        assert_eq!(state.len(), 2);
        assert!(state.iter().all(|s| s.path.starts_with(&expected)));
        assert_eq!(fs::read_dir(temp.path()).unwrap().count(), 0);
        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            symlink(temp.path(), temp.path().join("Library")).unwrap();
            assert!(recipient_state(temp.path()).is_err());
        }
    }
    #[test]
    fn rejects_traversal_duplicate_missing_bundle_assets_and_wrong_identity() {
        let good = payload();
        good.validate().unwrap();
        let mut future = payload();
        future.version = "1.2.3".into();
        future.validate().unwrap();
        future.version = "01.2.3".into();
        assert!(future.validate().is_err());
        for bad in ["../outside", "/absolute", "a//b", "a\\b", "a/./b", "a:b"] {
            assert!(relative(bad).is_err())
        }
        let mut p = good.clone();
        p.files.push(p.files[0].clone());
        assert!(p.validate().is_err());
        p = good.clone();
        p.files.pop();
        assert!(p.validate().is_err());
        p = good;
        p.arch = "x86_64".into();
        assert!(p.validate().is_err())
    }
    #[cfg(unix)]
    #[test]
    fn actual_install_repeat_collisions_and_selective_removal() {
        use std::os::unix::fs::PermissionsExt;
        let temp = tempfile::tempdir().unwrap();
        let physical = fs::canonicalize(temp.path()).unwrap();
        let source = physical.join("source.app");
        fs::create_dir(&source).unwrap();
        let p = payload();
        for f in &p.files {
            let v = source.join(&f.path);
            fs::create_dir_all(v.parent().unwrap()).unwrap();
            fs::write(&v, b"app").unwrap();
            fs::set_permissions(
                v,
                fs::Permissions::from_mode(u32::from_str_radix(&f.mode, 8).unwrap()),
            )
            .unwrap()
        }
        let app = physical.join("Application 雪.app");
        let command = physical.join("bin/local-media-gallery");
        install(
            &source,
            &app,
            &command,
            "user",
            &p,
            std::ffi::OsStr::new(""),
        )
        .unwrap();
        install(
            &source,
            &app,
            &command,
            "user",
            &p,
            std::ffi::OsStr::new(""),
        )
        .unwrap();
        fs::write(app.join("foreign-media.png"), b"retain").unwrap();
        assert!(
            install(
                &source,
                &app,
                &command,
                "user",
                &p,
                std::ffi::OsStr::new("")
            )
            .is_err()
        );
        fs::write(app.join("Contents/Info.plist"), b"changed").unwrap();
        let r = remove(&app, &command, "user", &p).unwrap();
        assert_eq!(fs::read(app.join("foreign-media.png")).unwrap(), b"retain");
        assert_eq!(
            fs::read(app.join("Contents/Info.plist")).unwrap(),
            b"changed"
        );
        assert!(!command.exists());
        assert!(r["retained"].as_array().unwrap().len() >= 2);
        assert!(
            install(
                &source,
                &app,
                &command,
                "user",
                &p,
                std::ffi::OsStr::new("")
            )
            .is_err()
        );
    }
    #[cfg(unix)]
    #[test]
    fn rejects_symlink_payload_and_command() {
        use std::os::unix::fs::symlink;
        let temp = tempfile::tempdir().unwrap();
        let outside = temp.path().join("outside");
        fs::write(&outside, b"retain").unwrap();
        let bundle = temp.path().join("app");
        fs::create_dir(&bundle).unwrap();
        symlink(&outside, bundle.join("file")).unwrap();
        assert!(no_links(&bundle, Path::new("file")).is_err());
        assert_eq!(fs::read(outside).unwrap(), b"retain");
        assert!(destination(&bundle.join("file")).is_err());
    }
    #[cfg(unix)]
    #[test]
    fn managed_maintenance_discovers_owned_payload_and_refuses_foreign_installations() {
        use std::os::unix::fs::PermissionsExt;
        let temp = tempfile::tempdir().unwrap();
        let physical = fs::canonicalize(temp.path()).unwrap();
        let source = physical.join("source");
        let app = physical.join("Managed.app");
        let command = physical.join("bin/local-media-gallery");
        let mut p = payload();
        p.version = "0.1.0".into();
        for entry in &p.files {
            let file = source.join(&entry.path);
            fs::create_dir_all(file.parent().unwrap()).unwrap();
            let bytes = if entry.path == p.binary {
                b"binary".as_slice()
            } else {
                b"plist".as_slice()
            };
            fs::write(&file, bytes).unwrap();
            fs::set_permissions(
                file,
                fs::Permissions::from_mode(u32::from_str_radix(&entry.mode, 8).unwrap()),
            )
            .unwrap();
        }
        // This case uses the same fixture bytes as the existing native lifecycle tests.
        for entry in &mut p.files {
            let bytes = fs::read(source.join(&entry.path)).unwrap();
            entry.bytes = bytes.len().to_string();
            entry.sha256 = hash(&bytes);
        }
        fs::create_dir(&app).unwrap();
        fs::write(app.join("foreign"), b"recipient bytes").unwrap();
        assert!(owned_payload(&app, &command, "system").is_err());
        assert!(
            managed_install(
                &source,
                &app,
                &command,
                &p,
                &physical.join("transaction"),
                &[],
                std::ffi::OsStr::new("")
            )
            .is_err()
        );
        assert_eq!(fs::read(app.join("foreign")).unwrap(), b"recipient bytes");
        fs::remove_file(app.join("foreign")).unwrap();
        fs::remove_dir(&app).unwrap();
        assert_eq!(
            managed_install(
                &source,
                &app,
                &command,
                &p,
                &physical.join("transaction"),
                &[],
                std::ffi::OsStr::new("")
            )
            .unwrap()["result"],
            "installed"
        );
        assert_eq!(owned_payload(&app, &command, "system").unwrap(), p);
        assert_eq!(
            managed_install(
                &source,
                &app,
                &command,
                &p,
                &physical.join("transaction"),
                &[],
                std::ffi::OsStr::new("")
            )
            .unwrap()["result"],
            "already-installed"
        );
        assert_eq!(managed_remove(&app, &command).unwrap()["result"], "removed");
        assert!(!command.exists());
    }
}

#[cfg(test)]
mod digest_compatibility {
    #[test]
    fn preserves_sha256_known_vectors() {
        assert_eq!(
            super::hash(b""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        assert_eq!(
            super::hash(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }
}
