// SPDX-License-Identifier: Apache-2.0
//! Explicit offline candidate replacement. Native package owners retain their authority.
mod native;
mod process;
#[cfg(any(windows, target_os = "linux"))]
mod worker;
#[doc(hidden)]
pub fn run_native_worker(path: &Path) -> Result<i32> {
    #[cfg(any(windows, target_os = "linux"))]
    {
        worker::run(path)
    }
    #[cfg(not(any(windows, target_os = "linux")))]
    {
        let _ = path;
        Err("This platform uses direct replacement".into())
    }
}
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::{Component, Path, PathBuf},
    process::{Command, Stdio},
};
pub type Result<T> = std::result::Result<T, String>;
#[cfg(windows)]
fn windows_system_tool(name: &str) -> Result<PathBuf> {
    use std::os::windows::ffi::OsStringExt;
    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn GetSystemDirectoryW(buffer: *mut u16, length: u32) -> u32;
    }
    if !matches!(name, "msiexec.exe" | "tasklist.exe") {
        return Err("Unknown native system tool".into());
    }
    let mut buffer = vec![0u16; 32768];
    let length = unsafe { GetSystemDirectoryW(buffer.as_mut_ptr(), buffer.len() as u32) } as usize;
    if length == 0 || length >= buffer.len() {
        return Err("Native system directory unavailable".into());
    }
    Ok(PathBuf::from(std::ffi::OsString::from_wide(&buffer[..length])).join(name))
}
fn io<T>(r: std::io::Result<T>) -> Result<T> {
    r.map_err(|e| e.to_string())
}
// Displacement stays beside the live file, even when retained storage is on
// another volume. No destination overwrite fallback is permitted.
fn rename_exclusive(from: &Path, to: &Path) -> Result<()> {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        #[link(name = "kernel32")]
        unsafe extern "system" {
            fn MoveFileExW(from: *const u16, to: *const u16, flags: u32) -> i32;
        }
        let a: Vec<u16> = from.as_os_str().encode_wide().chain(Some(0)).collect();
        let b: Vec<u16> = to.as_os_str().encode_wide().chain(Some(0)).collect();
        if unsafe { MoveFileExW(a.as_ptr(), b.as_ptr(), 0) } == 0 {
            return Err(std::io::Error::last_os_error().to_string());
        }
        Ok(())
    }
    #[cfg(unix)]
    {
        use std::ffi::CString;
        use std::os::{fd::AsRawFd, unix::ffi::OsStrExt};
        if from.parent() != to.parent() {
            return Err("Exclusive displacement requires one physical parent".into());
        }
        physical(from.parent().ok_or("No displacement parent")?)?;
        let parent = io(File::open(from.parent().unwrap()))?;
        let a = CString::new(from.file_name().ok_or("No source leaf")?.as_bytes())
            .map_err(|e| e.to_string())?;
        let b = CString::new(to.file_name().ok_or("No destination leaf")?.as_bytes())
            .map_err(|e| e.to_string())?;
        #[cfg(target_os = "linux")]
        let result = {
            unsafe extern "C" {
                fn renameat2(a: i32, from: *const i8, b: i32, to: *const i8, flags: u32) -> i32;
            }
            unsafe {
                renameat2(
                    parent.as_raw_fd(),
                    a.as_ptr(),
                    parent.as_raw_fd(),
                    b.as_ptr(),
                    1,
                )
            }
        };
        #[cfg(target_os = "macos")]
        let result = {
            unsafe extern "C" {
                fn renameatx_np(a: i32, from: *const i8, b: i32, to: *const i8, flags: u32) -> i32;
            }
            unsafe {
                renameatx_np(
                    parent.as_raw_fd(),
                    a.as_ptr(),
                    parent.as_raw_fd(),
                    b.as_ptr(),
                    4,
                )
            }
        };
        if result != 0 {
            return Err(std::io::Error::last_os_error().to_string());
        }
        Ok(())
    }
}

/// Read installed integration authority through a physical, bounded handle.
pub fn read_receipt(path: &Path) -> Result<Vec<u8>> {
    physical(path)?;
    let mut options = OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        #[cfg(target_os = "macos")]
        options.custom_flags(0x100);
        #[cfg(target_os = "linux")]
        options.custom_flags(0x20000);
    }
    let mut file = io(options.open(path))?;
    let metadata = io(file.metadata())?;
    if !metadata.is_file() || metadata.len() > 4 * 1024 * 1024 {
        return Err("Invalid installation receipt".into());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        unsafe extern "C" {
            fn geteuid() -> u32;
        }
        if metadata.uid() != unsafe { geteuid() }
            || metadata.mode() & 0o022 != 0
            || metadata.nlink() != 1
        {
            return Err("Installation receipt owner, mode or alias differs".into());
        }
    }
    let mut bytes = Vec::new();
    io((&mut file)
        .take(4 * 1024 * 1024 + 1)
        .read_to_end(&mut bytes))?;
    if bytes.len() > 4 * 1024 * 1024 {
        return Err("Installation receipt exceeds bound".into());
    }
    Ok(bytes)
}
pub fn hash(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Source {
    pub sha256: String,
    pub files: u64,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FileRecord {
    pub path: String,
    pub bytes: String,
    pub sha256: String,
    pub mode: u32,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Artifact {
    pub path: String,
    pub bytes: String,
    pub sha256: String,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum Native {
    Direct,
    WindowsMsi {
        scope: String,
        product_code: String,
        package_code: String,
        installer: Artifact,
    },
    LinuxDeb {
        installer: Artifact,
    },
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Integration {
    pub command: PathBuf,
    pub receipt: PathBuf,
    pub receipt_bytes: String,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Candidate {
    pub format_version: u32,
    pub product: String,
    pub version: String,
    pub edition: String,
    pub os: String,
    pub arch: String,
    pub generation: String,
    pub source: Source,
    pub binary: String,
    pub files: Vec<FileRecord>,
    pub native: Native,
    pub integration: Option<Integration>,
}
fn hex64(v: &str) -> bool {
    v.len() == 64
        && v.bytes()
            .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
}
fn relative(s: &str) -> Result<()> {
    if s.is_empty()
        || s.len() > 1024
        || s.contains(['\\', ':', '\0', '<', '>', '"', '|', '?', '*'])
        || s.starts_with('/')
        || s.split('/').any(|p| {
            p.is_empty()
                || p == "."
                || p == ".."
                || p.ends_with(['.', ' '])
                || p.chars().any(char::is_control)
                || matches!(
                    p.to_ascii_lowercase().as_str(),
                    "settings.json" | "history.sqlite3" | ".gallery-settings.json" | ".lmg-update"
                )
        })
    {
        return Err(format!("Invalid or recipient-state owned path: {s}"));
    }
    for p in s.split('/') {
        let stem = p.split('.').next().unwrap().to_ascii_uppercase();
        if matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
            || ((stem.starts_with("COM") || stem.starts_with("LPT"))
                && stem.len() == 4
                && stem.as_bytes()[3].is_ascii_digit())
        {
            return Err("Reserved native path".into());
        }
    }
    Ok(())
}
fn size(s: &str) -> Result<u64> {
    let n = s.parse::<u64>().map_err(|_| "Invalid byte count")?;
    if n > 1024 * 1024 * 1024 || n.to_string() != s {
        return Err("Noncanonical or excessive byte count".into());
    }
    Ok(n)
}
impl Candidate {
    pub fn validate(&self) -> Result<()> {
        if self.format_version != 1
            || self.product != "local-media-gallery"
            || !matches!(self.edition.as_str(), "full" | "lite")
            || self.os != std::env::consts::OS
            || self.arch != std::env::consts::ARCH
            || self.version.split('.').count() != 3
            || self
                .version
                .split('.')
                .any(|s| s.is_empty() || !s.bytes().all(|b| b.is_ascii_digit()))
            || self.generation.is_empty()
            || self.generation.len() > 128
            || !self
                .generation
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'-')
            || !hex64(&self.source.sha256)
            || self.source.files == 0
            || self.files.is_empty()
            || self.files.len() > 8192
        {
            return Err("Invalid candidate product/version/target/source/inventory".into());
        }
        relative(&self.binary)?;
        let mut names = BTreeSet::new();
        let mut total = 0u64;
        for f in &self.files {
            relative(&f.path)?;
            if !names.insert(f.path.to_lowercase())
                || !hex64(&f.sha256)
                || !matches!(f.mode, 644 | 755)
            {
                return Err("Invalid/duplicate file record".into());
            }
            total = total
                .checked_add(size(&f.bytes)?)
                .ok_or("Inventory overflow")?;
            if total > 4 * 1024 * 1024 * 1024 {
                return Err("Excessive inventory".into());
            }
        }
        for name in &names {
            if names
                .iter()
                .any(|other| other != name && other.starts_with(&(name.clone() + "/")))
            {
                return Err("File/directory inventory alias".into());
            }
        }
        if !self.files.iter().any(|f| f.path == self.binary) {
            return Err("Executable absent from inventory".into());
        }
        match &self.native {
            Native::Direct => {}
            Native::WindowsMsi {
                scope,
                product_code,
                package_code,
                installer,
            } => {
                if self.os != "windows"
                    || self.edition != "full"
                    || !matches!(scope.as_str(), "user" | "machine")
                    || ![product_code, package_code]
                        .iter()
                        .all(|s| s.len() == 38 && s.starts_with('{') && s.ends_with('}'))
                {
                    return Err("Invalid MSI identity/scope".into());
                }
                validate_artifact(installer)?
            }
            Native::LinuxDeb { installer } => {
                if self.os != "linux" || self.edition != "full" {
                    return Err("Invalid Debian identity".into());
                }
                validate_artifact(installer)?
            }
        }
        if let Some(i) = &self.integration
            && (self.os != "macos"
                || self.edition != "full"
                || !i.command.is_absolute()
                || !i.receipt.is_absolute()
                || i.receipt_bytes.len() > 4 * 1024 * 1024)
        {
            return Err("Invalid integration".into());
        }
        Ok(())
    }
    pub fn read(p: &Path) -> Result<Self> {
        physical(p)?;
        let document = read_bounded(p, 4 * 1024 * 1024)?;
        let mut c: Self = serde_json::from_slice(&document).map_err(|e| e.to_string())?;
        if let Some(a) = c.artifact_mut()
            && !Path::new(&a.path).is_absolute()
        {
            a.path = p
                .parent()
                .ok_or("No descriptor parent")?
                .join(&a.path)
                .to_str()
                .ok_or("Non UTF8 artifact path")?
                .into();
        }
        if matches!(c.native, Native::Direct) && p.file_name().is_some_and(|n| n == "update.json") {
            if c.files.iter().any(|f| f.path == "update.json") {
                return Err("Descriptor must not hash itself".into());
            }
            c.files.push(FileRecord {
                path: "update.json".into(),
                bytes: document.len().to_string(),
                sha256: hash(&document),
                mode: 644,
            });
        }
        c.validate()?;
        if c.os != "macos" && !c.files.iter().any(|f| f.path == c.metadata_path()) {
            return Err("Missing owned native candidate metadata".into());
        }
        Ok(c)
    }
    pub fn verify(&self, base: &Path) -> Result<()> {
        self.validate()?;
        #[cfg(windows)]
        let mut namespace = gallery_windows_package::private::PhysicalNamespace::default();
        for f in &self.files {
            let file = base.join(&f.path);
            #[cfg(windows)]
            {
                namespace.pin(file.parent().ok_or("Missing inventory parent")?)?;
                verify_physical_leaf(&file, f)?;
            }
            #[cfg(not(windows))]
            verify_file(&file, f)?;
            #[cfg(target_os = "linux")]
            if matches!(self.native, Native::LinuxDeb { .. }) {
                use std::os::unix::fs::MetadataExt;
                let m = io(fs::metadata(base.join(&f.path)))?;
                if m.uid() != 0 || m.gid() != 0 {
                    return Err("Foreign native package file ownership".into());
                }
            }
        }
        let metadata = self.metadata_path();
        if self.files.iter().any(|f| f.path == metadata) {
            self.verify_metadata(&base.join(metadata))?;
        }
        Ok(())
    }
    fn metadata_path(&self) -> &str {
        if self.os == "windows" {
            "payload.json"
        } else if matches!(self.native, Native::LinuxDeb { .. }) {
            "usr/lib/local-media-gallery/candidate.json"
        } else {
            "candidate.json"
        }
    }
    fn verify_metadata(&self, path: &Path) -> Result<()> {
        let v: serde_json::Value = serde_json::from_slice(&read_bounded(path, 4 * 1024 * 1024)?)
            .map_err(|e| e.to_string())?;
        for (key, wanted) in [
            ("product", &self.product),
            ("version", &self.version),
            ("edition", &self.edition),
            ("os", &self.os),
            ("arch", &self.arch),
            ("generation", &self.generation),
            ("binary", &self.binary),
        ] {
            if v[key].as_str() != Some(wanted.as_str()) {
                return Err(format!("Native metadata {key} differs from descriptor"));
            }
        }
        let expected_kind = if self.os == "windows" {
            "windows-application-payload"
        } else {
            "linux-application-payload"
        };
        if v["kind"] != expected_kind {
            return Err("Foreign native metadata kind".into());
        }
        if v["formatVersion"] != 1
            || v["source"]["sha256"] != self.source.sha256
            || v["source"]["files"].as_u64() != Some(self.source.files)
        {
            return Err("Native source identity differs from descriptor".into());
        }
        let triple = if self.os == "windows" {
            "x86_64-pc-windows-msvc"
        } else {
            "x86_64-unknown-linux-gnu"
        };
        if v["targetTriple"] != triple || v["buildProfile"] != "release" {
            return Err("Native target/profile differs".into());
        }
        let files = v["files"].as_array().ok_or("Missing native inventory")?;
        if files.len() + 1 + usize::from(self.files.iter().any(|f| f.path == "update.json"))
            != self.files.len()
        {
            return Err("Native and update inventories differ".into());
        }
        for f in files {
            let name = f["path"].as_str().ok_or("Invalid native inventory path")?;
            let r = self
                .files
                .iter()
                .find(|r| r.path == name)
                .ok_or("Native inventory member differs")?;
            let mode = f["mode"].as_str().unwrap_or("644");
            if f["bytes"] != r.bytes || f["sha256"] != r.sha256 || mode != r.mode.to_string() {
                return Err("Native inventory bytes/mode differ".into());
            }
        }
        Ok(())
    }
    fn artifact_mut(&mut self) -> Option<&mut Artifact> {
        match &mut self.native {
            Native::Direct => None,
            Native::WindowsMsi { installer, .. } | Native::LinuxDeb { installer } => {
                Some(installer)
            }
        }
    }
    fn artifact(&self) -> Option<&Artifact> {
        match &self.native {
            Native::Direct => None,
            Native::WindowsMsi { installer, .. } | Native::LinuxDeb { installer } => {
                Some(installer)
            }
        }
    }
}
fn validate_artifact(a: &Artifact) -> Result<()> {
    if Path::new(&a.path).is_absolute() {
        physical(Path::new(&a.path))?
    } else {
        relative(&a.path)?
    }
    size(&a.bytes)?;
    if !hex64(&a.sha256) {
        return Err("Invalid artifact digest".into());
    }
    Ok(())
}
pub fn physical(path: &Path) -> Result<()> {
    if !path.is_absolute()
        || path
            .components()
            .any(|c| matches!(c, Component::ParentDir | Component::CurDir))
    {
        return Err("Use an absolute physical path without dot components".into());
    }
    let mut p = PathBuf::new();
    for c in path.components() {
        p.push(c);
        if matches!(c, Component::Prefix(_)) {
            continue;
        }
        match fs::symlink_metadata(&p) {
            Ok(m) => {
                if m.file_type().is_symlink() {
                    return Err(format!("Linked path: {}", p.display()));
                }
                #[cfg(windows)]
                {
                    use std::os::windows::fs::MetadataExt;
                    if m.file_attributes() & 0x400 != 0 {
                        return Err("Reparse path".into());
                    }
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(())
}
fn read_bounded(p: &Path, max: u64) -> Result<Vec<u8>> {
    let f = io(File::open(p))?;
    if io(f.metadata())?.len() > max {
        return Err("Oversized input".into());
    }
    let mut b = vec![];
    io(f.take(max + 1).read_to_end(&mut b))?;
    if b.len() as u64 > max {
        return Err("Input grew beyond limit".into());
    }
    Ok(b)
}
fn verify_file(p: &Path, r: &FileRecord) -> Result<()> {
    physical(p)?;
    verify_physical_leaf(p, r)
}
fn verify_physical_leaf(p: &Path, r: &FileRecord) -> Result<()> {
    let m = io(fs::symlink_metadata(p))?;
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if m.file_attributes() & 0x400 != 0 {
            return Err("Reparse path".into());
        }
    }
    if !m.is_file() || m.len() != size(&r.bytes)? {
        return Err(format!("Missing/changed owned file: {}", p.display()));
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::{MetadataExt, PermissionsExt};
        if m.nlink() != 1 {
            return Err("Hard-linked owned file".into());
        }
        if m.permissions().mode() & 0o777 != if r.mode == 755 { 0o755 } else { 0o644 } {
            return Err(format!("Changed file mode: {}", p.display()));
        }
    }
    if hash(&read_bounded(p, 1024 * 1024 * 1024)?) != r.sha256 {
        return Err(format!("Changed owned bytes: {}", p.display()));
    }
    Ok(())
}
fn machine_scope(c: &Candidate) -> bool {
    matches!(&c.native,Native::WindowsMsi{scope,..}if scope=="machine")
}
fn temporary(parent: &Path, private: bool) -> Result<tempfile::NamedTempFile> {
    #[cfg(windows)]
    if private {
        return tempfile::Builder::new()
            .make_in(parent, |path| {
                gallery_windows_package::private::create_file(path).map_err(std::io::Error::other)
            })
            .map_err(|e| e.to_string());
    }
    let _ = private;
    io(tempfile::NamedTempFile::new_in(parent))
}
fn make_directories(parent: &Path, private: bool) -> Result<()> {
    #[cfg(windows)]
    if private {
        return gallery_windows_package::private::child_directories(parent);
    }
    let _ = private;
    io(fs::create_dir_all(parent))
}
fn copy_owned(from: &Path, to: &Path, r: &FileRecord, private: bool) -> Result<()> {
    #[cfg(windows)]
    let mut namespace = gallery_windows_package::private::PhysicalNamespace::default();
    copy_owned_in(
        from,
        to,
        r,
        private,
        #[cfg(windows)]
        &mut namespace,
    )
}
fn copy_owned_in(
    from: &Path,
    to: &Path,
    r: &FileRecord,
    private: bool,
    #[cfg(windows)] namespace: &mut gallery_windows_package::private::PhysicalNamespace,
) -> Result<()> {
    #[cfg(windows)]
    {
        namespace.pin(from.parent().ok_or("No source parent")?)?;
        verify_physical_leaf(from, r)?;
    }
    #[cfg(not(windows))]
    verify_file(from, r)?;
    let parent = to.parent().ok_or("No parent")?;
    physical(to)?;
    make_directories(parent, private)?;
    #[cfg(windows)]
    namespace.pin(parent)?;
    let mut tmp = temporary(parent, private)?;
    io(std::io::copy(&mut io(File::open(from))?, &mut tmp))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        io(tmp
            .as_file()
            .set_permissions(fs::Permissions::from_mode(if r.mode == 755 {
                0o755
            } else {
                0o644
            })))?
    }
    io(tmp.as_file().sync_all())?;
    #[cfg(windows)]
    verify_physical_leaf(tmp.path(), r)?;
    #[cfg(not(windows))]
    verify_file(tmp.path(), r)?;
    tmp.persist_noclobber(to).map_err(|e| e.to_string())?;
    sync_directory(parent)?;
    Ok(())
}
fn sync_directory(p: &Path) -> Result<()> {
    #[cfg(unix)]
    {
        io(io(File::open(p))?.sync_all())?;
    }
    let _ = p;
    Ok(())
}
fn durable_json<T: Serialize>(p: &Path, v: &T) -> Result<()> {
    physical(p)?;
    let parent = p.parent().ok_or("No parent")?;
    let mut t = temporary(parent, true)?;
    io(t.write_all(&serde_json::to_vec_pretty(v).map_err(|e| e.to_string())?))?;
    io(t.write_all(b"\n"))?;
    io(t.as_file().sync_all())?;
    t.persist(p).map_err(|e| e.to_string())?;
    sync_directory(parent)
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Journal {
    format_version: u32,
    binding: String,
    directory: PathBuf,
    transaction: PathBuf,
    prior: Candidate,
    next: Candidate,
    phase: String,
    target_prior: bool,
    state: Vec<StateOperand>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StateOperand {
    pub kind: String,
    pub path: PathBuf,
}
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Outcome {
    pub status: String,
    pub phase: String,
    pub generation: String,
    pub version: String,
    pub directory: PathBuf,
    pub transaction: PathBuf,
    pub native_process: Option<serde_json::Value>,
}
pub struct Transaction {
    #[cfg(windows)]
    _namespace: Vec<File>,
    base: PathBuf,
    journal: Journal,
    _lock: File,
    _destination_lock: File,
    verify_native: bool,
}
fn lock(base: &Path) -> Result<File> {
    physical(base)?;
    #[cfg(windows)]
    gallery_windows_package::private::context(base)?;
    let m = io(fs::metadata(base))?;
    if !m.is_dir() {
        return Err("Transaction is not a directory".into());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::{MetadataExt, PermissionsExt};
        unsafe extern "C" {
            fn geteuid() -> u32;
        }
        if m.uid() != unsafe { geteuid() } || m.permissions().mode() & 0o077 != 0 {
            return Err("Transaction must have owner-only permissions".into());
        }
    }
    let p = base.join("operation.lock");
    physical(&p)?;
    #[cfg(windows)]
    let f = gallery_windows_package::private::lock_file(
        &p,
        gallery_windows_package::private::context(base)?,
    )?;
    #[cfg(not(windows))]
    let f = io(OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(p))?;
    f.try_lock()
        .map_err(|e| format!("Another update owns the transaction lock: {e}"))?;
    Ok(f)
}

fn canonical_identity(path: &Path) -> Result<PathBuf> {
    physical(path)?;
    let mut existing = path;
    let mut suffix = vec![];
    while !existing.exists() {
        suffix.push(
            existing
                .file_name()
                .ok_or("Invalid destination suffix")?
                .to_owned(),
        );
        existing = existing.parent().ok_or("Missing existing ancestor")?;
    }
    let mut result = io(fs::canonicalize(existing))?;
    for name in suffix.into_iter().rev() {
        result.push(name)
    }
    Ok(result)
}
#[cfg(any(windows, target_os = "linux"))]
fn native_lease(directory: &Path, machine: bool) -> Result<File> {
    let canonical = canonical_identity(directory)?;
    let key = hash(canonical.to_string_lossy().to_lowercase().as_bytes());
    #[cfg(windows)]
    let file = gallery_windows_package::private::coordination_file(
        &format!("native-{}.lock", &key[..24]),
        machine,
    )?;
    #[cfg(not(windows))]
    let file = {
        let _ = machine;
        let parent = if directory == Path::new("/") {
            Path::new("/run")
        } else {
            directory.parent().ok_or("Missing destination parent")?
        };
        let path = parent.join(format!(".lmg-native-{}.lock", &key[..24]));
        physical(&path)?;
        let file = io(OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(path))?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::{MetadataExt, PermissionsExt};
            unsafe extern "C" {
                fn geteuid() -> u32;
            }
            let m = io(file.metadata())?;
            if m.uid() != unsafe { geteuid() }
                || m.nlink() != 1
                || m.permissions().mode() & 0o022 != 0
            {
                return Err("Foreign native lease".into());
            }
        }
        file
    };
    file.try_lock()
        .map_err(|e| format!("incomplete: A native supervisor still owns this destination: {e}"))?;
    Ok(file)
}
fn destination_lock(directory: &Path, machine: bool) -> Result<File> {
    let canonical = canonical_identity(directory)?;
    let key = hash(canonical.to_string_lossy().to_lowercase().as_bytes());
    #[cfg(windows)]
    let f = gallery_windows_package::private::coordination_file(
        &format!("destination-{}.lock", &key[..24]),
        machine,
    )?;
    #[cfg(not(windows))]
    let f = {
        let _ = machine;
        let parent = if directory == Path::new("/") {
            Path::new("/run")
        } else {
            directory.parent().ok_or("Missing destination parent")?
        };
        let p = parent.join(format!(".lmg-update-{}.lock", &key[..24]));
        physical(&p)?;
        let f = io(OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(&p))?;
        if !io(f.metadata())?.is_file() {
            return Err("Nonregular destination lock".into());
        }
        #[cfg(unix)]
        {
            use std::os::unix::fs::{MetadataExt, PermissionsExt};
            let m = io(f.metadata())?;
            unsafe extern "C" {
                fn geteuid() -> u32;
            }
            if m.uid() != unsafe { geteuid() }
                || m.nlink() != 1
                || m.permissions().mode() & 0o022 != 0
            {
                return Err("Foreign destination lock".into());
            }
        }
        f
    };
    f.try_lock()
        .map_err(|e| format!("Another operation owns this destination: {e}"))?;
    Ok(f)
}

impl Transaction {
    pub fn prepare(
        base: &Path,
        directory: &Path,
        prior: &Candidate,
        next: &Candidate,
        source: &Path,
        state: &[StateOperand],
    ) -> Result<Self> {
        prior.validate()?;
        next.validate()?;
        if prior.os != next.os
            || prior.arch != next.arch
            || prior.edition != next.edition
            || std::mem::discriminant(&prior.native) != std::mem::discriminant(&next.native)
        {
            return Err("Candidate target/edition/native strategy mismatch".into());
        }
        if let (Native::WindowsMsi { scope: a, .. }, Native::WindowsMsi { scope: b, .. }) =
            (&prior.native, &next.native)
            && a != b
        {
            return Err("Candidate installation scopes differ".into());
        }
        physical(base)?;
        physical(directory)?;
        physical(source)?;
        if (matches!(prior.native, Native::Direct) && base.starts_with(directory))
            || source.starts_with(base)
            || directory.starts_with(base)
            || prior
                .files
                .iter()
                .any(|f| base.starts_with(directory.join(&f.path)))
        {
            return Err("Transaction, source and live content must be separate".into());
        }
        let destination_locked = destination_lock(directory, machine_scope(prior))?;
        #[cfg(any(windows, target_os = "linux"))]
        if !matches!(prior.native, Native::Direct) {
            let _ready = native_lease(directory, machine_scope(prior))?;
        }
        native::validate_predecessor(prior, directory)?;
        prior.verify(directory)?;
        if !matches!(prior.native, Native::Direct) {
            native::verified(prior, directory)?;
        }
        Self::verify_integration(prior, directory)?;
        Self::active(directory, prior)?;

        let old: BTreeSet<_> = prior.files.iter().map(|f| f.path.as_str()).collect();
        for f in &next.files {
            if !old.contains(f.path.as_str())
                && directory
                    .join(&f.path)
                    .try_exists()
                    .map_err(|e| e.to_string())?
            {
                return Err(format!("Foreign incoming destination: {}", f.path));
            }
        }
        if matches!(next.native, Native::Direct) {
            next.verify(source)?;
        }
        #[cfg(windows)]
        let mut namespace =
            gallery_windows_package::private::create_directory(base, machine_scope(prior))?;
        #[cfg(not(windows))]
        io(fs::create_dir(base))?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            io(fs::set_permissions(base, fs::Permissions::from_mode(0o700)))?
        }
        let locked = lock(base)?;
        #[cfg(windows)]
        if matches!(prior.native, Native::Direct) {
            namespace.extend(gallery_windows_package::private::pin_physical(directory)?);
        }
        let journal = Journal {
            format_version: 1,
            binding: String::new(),
            directory: directory.to_path_buf(),
            transaction: base.to_path_buf(),
            prior: prior.clone(),
            next: next.clone(),
            phase: "preparing".into(),
            target_prior: false,
            state: state.to_vec(),
        };
        let mut op = Self {
            base: base.to_path_buf(),
            journal,
            _lock: locked,
            _destination_lock: destination_locked,
            #[cfg(windows)]
            _namespace: namespace,
            verify_native: false,
        };
        // A journal is published only after both complete ordinary candidates are retained.
        for (name, c, src) in [("prior", prior, directory), ("next", next, source)] {
            let dst = base.join(name);
            #[cfg(windows)]
            gallery_windows_package::private::child_directory(&dst)?;
            #[cfg(not(windows))]
            io(fs::create_dir(&dst))?;
            if c.artifact().is_some() {
                native::retain(c, base, name, &dst)
                    .map_err(|e| format!("Retain {name} native candidate: {e}"))?;
            } else {
                #[cfg(windows)]
                let mut namespace = gallery_windows_package::private::PhysicalNamespace::default();
                for f in &c.files {
                    copy_owned_in(
                        &src.join(&f.path),
                        &dst.join(&f.path),
                        f,
                        true,
                        #[cfg(windows)]
                        &mut namespace,
                    )?;
                }
            }
            c.verify(&dst)?;
            #[cfg(windows)]
            for f in &c.files {
                gallery_windows_package::private::validate_file(
                    &dst.join(&f.path),
                    machine_scope(prior),
                )?;
            }
        }
        if !state.is_empty() {
            native::identity(next, &base.join("next"))?;
        }
        check_compatible_state(next, &base.join("next"), prior, &base.join("prior"), state)?;
        check_compatible_state(prior, &base.join("prior"), next, &base.join("next"), state)?;
        let identity = op.identity();
        durable_json(&base.join("identity.json"), &identity)?;
        op.journal.binding = hash(&read_bounded(&base.join("identity.json"), 8 * 1024 * 1024)?);
        op.journal.phase = "prepared".into();
        op.save()?;
        Ok(op)
    }
    pub fn open(base: &Path) -> Result<Self> {
        let locked = lock(base)?;
        physical(&base.join("journal.json"))?;
        physical(&base.join("identity.json"))?;
        let journal: Journal =
            serde_json::from_slice(&read_bounded(&base.join("journal.json"), 8 * 1024 * 1024)?)
                .map_err(|e| e.to_string())?;
        if journal.format_version != 1
            || journal.transaction != base
            || !matches!(
                journal.phase.as_str(),
                "prepared"
                    | "applying"
                    | "activated"
                    | "unpacked"
                    | "committed"
                    | "restoring"
                    | "restored"
                    | "incomplete"
            )
        {
            return Err("Foreign/invalid recovery journal".into());
        }
        journal.prior.validate()?;
        journal.next.validate()?;
        if let (Native::WindowsMsi { scope: a, .. }, Native::WindowsMsi { scope: b, .. }) =
            (&journal.prior.native, &journal.next.native)
            && a != b
        {
            return Err("Recovery installation scopes differ".into());
        }
        physical(&journal.directory)?;
        if (matches!(journal.prior.native, Native::Direct) && base.starts_with(&journal.directory))
            || journal.directory.starts_with(base)
        {
            return Err("Recovery directory overlaps transaction".into());
        }
        let identity = read_bounded(&base.join("identity.json"), 8 * 1024 * 1024)?;
        if hash(&identity) != journal.binding
            || serde_json::from_slice::<serde_json::Value>(&identity).map_err(|e| e.to_string())?
                != serde_json::json!({"formatVersion":1,"transaction":base,"directory":journal.directory,"prior":journal.prior,"next":journal.next,"state":journal.state})
        {
            return Err("Changed recovery identity record".into());
        }
        #[cfg(windows)]
        let mut namespace = gallery_windows_package::private::validate_directory(
            base,
            machine_scope(&journal.prior),
        )?;
        #[cfg(windows)]
        if matches!(journal.prior.native, Native::Direct) {
            namespace.extend(gallery_windows_package::private::pin_physical(
                &journal.directory,
            )?);
        }
        let destination_locked =
            destination_lock(&journal.directory, machine_scope(&journal.prior))?;
        if journal.prior.edition != journal.next.edition
            || std::mem::discriminant(&journal.prior.native)
                != std::mem::discriminant(&journal.next.native)
        {
            return Err("Recovery candidate strategy/edition changed".into());
        }
        let op = Self {
            base: base.into(),
            journal,
            _lock: locked,
            _destination_lock: destination_locked,
            #[cfg(windows)]
            _namespace: namespace,
            verify_native: false,
        };
        op.verify_retained()?;
        Ok(op)
    }
    fn identity(&self) -> serde_json::Value {
        serde_json::json!({"formatVersion":1,"transaction":self.base,"directory":self.journal.directory,"prior":self.journal.prior,"next":self.journal.next,"state":self.journal.state})
    }
    fn save(&self) -> Result<()> {
        durable_json(&self.base.join("journal.json"), &self.journal)?;
        if std::env::var("LMG_UPDATE_EVENTS").as_deref() == Ok("1") {
            println!(
                "{}",
                serde_json::json!({"event":"phase","phase":self.journal.phase,"coordinatorPid":std::process::id(),"transaction":self.base})
            );
            io(std::io::stdout().flush())?;
        }
        Ok(())
    }
    fn verify_retained(&self) -> Result<()> {
        #[cfg(windows)]
        {
            let mode = machine_scope(&self.journal.prior);
            let validator = gallery_windows_package::private::FileValidator::new(mode)?;
            let _pins = gallery_windows_package::private::validate_directory(&self.base, mode)?;
            for name in ["identity.json", "journal.json"] {
                validator.validate(&self.base.join(name))?;
            }
            for (side, c) in [("prior", &self.journal.prior), ("next", &self.journal.next)] {
                for f in &c.files {
                    validator.validate(&self.base.join(side).join(&f.path))?;
                }
                if c.artifact().is_some() {
                    validator.validate(&self.base.join(format!("{side}-package.msi")))?;
                }
            }
        }
        self.journal.prior.verify(&self.base.join("prior"))?;
        self.journal.next.verify(&self.base.join("next"))?;
        for (name, c) in [("prior", &self.journal.prior), ("next", &self.journal.next)] {
            native::verify_retained(c, &self.base, name)?;
        }
        Ok(())
    }
    pub fn status(&self) -> Result<Outcome> {
        self.verify_retained()?;
        let c = if self.journal.target_prior {
            &self.journal.prior
        } else {
            &self.journal.next
        };
        let observed = if c.verify(&self.journal.directory).is_ok() {
            "selected-present"
        } else {
            "incomplete"
        };
        Ok(self.outcome(observed, c))
    }
    fn outcome(&self, status: &str, c: &Candidate) -> Outcome {
        Outcome {
            status: status.into(),
            phase: self.journal.phase.clone(),
            generation: c.generation.clone(),
            version: c.version.clone(),
            directory: self.journal.directory.clone(),
            transaction: self.base.clone(),
            native_process: fs::read(self.base.join("native-process.json"))
                .ok()
                .and_then(|b| serde_json::from_slice(&b).ok()),
        }
    }
    pub fn apply_verified(&mut self, prior: bool) -> Result<Outcome> {
        self.verify_native = true;
        self.apply(prior).map_err(|error| {
            let lower = error.to_ascii_lowercase();
            if matches!(
                self.journal.phase.as_str(),
                "applying" | "unpacked" | "activated" | "restoring"
            ) && !lower.starts_with("incomplete:")
                && ![
                    "changed",
                    "foreign",
                    "external",
                    "incompatible",
                    "unsupported",
                    "invalid",
                    "active",
                    "another",
                    "busy",
                ]
                .iter()
                .any(|word| lower.contains(word))
            {
                format!(
                    "incomplete: {error}. Retain transaction {} for observed recovery",
                    self.base.display()
                )
            } else {
                error
            }
        })
    }
    pub fn recover_verified(&mut self) -> Result<Outcome> {
        self.apply_verified(self.journal.target_prior)
    }
    pub fn apply(&mut self, prior: bool) -> Result<Outcome> {
        self.verify_retained()?;
        let selected = if prior {
            self.journal.prior.clone()
        } else {
            self.journal.next.clone()
        };
        let retained = self.base.join(if prior { "prior" } else { "next" });
        check_compatible_state(
            &selected,
            &retained,
            if prior {
                &self.journal.next
            } else {
                &self.journal.prior
            },
            &self.base.join(if prior { "next" } else { "prior" }),
            &self.journal.state,
        )?;
        Self::active(&self.journal.directory, &self.journal.prior)?;
        Self::active(&self.journal.directory, &self.journal.next)?;
        if !matches!(selected.native, Native::Direct) {
            return native::apply(self, prior);
        }
        self.validate_union()?;
        self.validate_integration_union()?;
        let already = selected.verify(&self.journal.directory).is_ok()
            && self.exclusive_selected(&selected)?
            && Self::verify_integration(&selected, &self.journal.directory).is_ok();
        self.journal.target_prior = prior;
        self.journal.phase = if prior { "restoring" } else { "applying" }.into();
        self.save()?;
        if !already {
            let union = self.union();
            for (name, (a, b)) in union {
                let to = self.journal.directory.join(&name);
                let wanted = selected.files.iter().find(|f| f.path == name);
                let displaced = self.displaced(&to);
                if displaced.try_exists().map_err(|e| e.to_string())? {
                    // validate_union independently checked this owned sibling. Complete copies
                    // are durable in private storage, so it can now be reconciled.
                    if a.as_ref()
                        .is_none_or(|r| verify_file(&displaced, r).is_err())
                        && b.as_ref()
                            .is_none_or(|r| verify_file(&displaced, r).is_err())
                    {
                        return Err("Unknown displaced bytes prevent recovery; retain them".into());
                    }
                    io(fs::remove_file(&displaced))?;
                    sync_directory(to.parent().unwrap())?;
                }
                if wanted.is_some_and(|f| verify_file(&to, f).is_ok()) {
                    continue;
                }
                if to.try_exists().map_err(|e| e.to_string())? {
                    physical(&displaced)?;
                    rename_exclusive(&to, &displaced)?;
                    sync_directory(to.parent().unwrap())?;
                    if a.as_ref()
                        .is_none_or(|r| verify_file(&displaced, r).is_err())
                        && b.as_ref()
                            .is_none_or(|r| verify_file(&displaced, r).is_err())
                    {
                        if !to.exists() {
                            let _ = rename_exclusive(&displaced, &to);
                        }
                        return Err("File changed during switching; original bytes retained".into());
                    }
                    // Only independently verified owned displaced bytes are discarded; complete prior/new copies remain retained.
                    io(fs::remove_file(&displaced))?;
                }
                if let Some(f) = wanted {
                    copy_owned(&retained.join(&name), &to, f, false)?;
                }
            }
            self.journal.phase = "activated".into();
            self.save()?;
        }
        selected.verify(&self.journal.directory)?;
        if self.verify_native {
            native::verified(&selected, &self.journal.directory)?;
        }
        self.validate_integration_union()?;
        self.publish_integration(&selected, &self.journal.directory)?;
        Self::verify_integration(&selected, &self.journal.directory)?;
        self.journal.phase = if prior { "restored" } else { "committed" }.into();
        self.save()?;
        Ok(self.outcome(
            if prior {
                "restored"
            } else if already {
                "already-current"
            } else {
                "complete"
            },
            &selected,
        ))
    }
    fn union(&self) -> BTreeMap<String, (Option<FileRecord>, Option<FileRecord>)> {
        let mut m = BTreeMap::new();
        for f in &self.journal.prior.files {
            m.insert(f.path.clone(), (Some(f.clone()), None));
        }
        for f in &self.journal.next.files {
            m.entry(f.path.clone()).or_insert((None, None)).1 = Some(f.clone());
        }
        m
    }
    fn displaced(&self, live: &Path) -> PathBuf {
        let name = hex::encode(Sha256::digest(live.to_string_lossy().as_bytes()));
        live.parent().unwrap().join(format!(
            ".lmg-displaced-{}-{}",
            &self.journal.binding[..12],
            &name[..12]
        ))
    }
    fn validate_union(&self) -> Result<()> {
        for (name, (a, b)) in self.union() {
            let displaced = self.displaced(&self.journal.directory.join(&name));
            physical(&displaced)?;
            if displaced.exists()
                && a.as_ref()
                    .is_none_or(|r| verify_file(&displaced, r).is_err())
                && b.as_ref()
                    .is_none_or(|r| verify_file(&displaced, r).is_err())
            {
                return Err("Unknown displaced bytes prevent recovery; retain them".into());
            }
            let p = self.journal.directory.join(name);
            physical(&p)?;
            if p.try_exists().map_err(|e| e.to_string())?
                && a.as_ref().is_none_or(|r| verify_file(&p, r).is_err())
                && b.as_ref().is_none_or(|r| verify_file(&p, r).is_err())
            {
                return Err(format!(
                    "External modification prevents recovery: {}",
                    p.display()
                ));
            }
        }
        Ok(())
    }
    fn exclusive_selected(&self, c: &Candidate) -> Result<bool> {
        for (p, _) in self.union() {
            if self
                .displaced(&self.journal.directory.join(&p))
                .try_exists()
                .map_err(|e| e.to_string())?
            {
                return Ok(false);
            }
            if !c.files.iter().any(|f| f.path == p)
                && self
                    .journal
                    .directory
                    .join(p)
                    .try_exists()
                    .map_err(|e| e.to_string())?
            {
                return Ok(false);
            }
        }
        Ok(true)
    }

    fn validate_integration_union(&self) -> Result<()> {
        match (
            &self.journal.prior.integration,
            &self.journal.next.integration,
        ) {
            (None, None) => Ok(()),
            (Some(a), Some(b)) if a.command == b.command && a.receipt == b.receipt => {
                physical(a.command.parent().ok_or("Missing command parent")?)?;
                physical(&a.receipt)?;
                let sibling = self.displaced(&a.receipt);
                let mut observed = false;
                for file in [&a.receipt, &sibling] {
                    if !file.try_exists().map_err(|e| e.to_string())? {
                        continue;
                    }
                    let bytes = read_receipt(file)?;
                    if bytes != a.receipt_bytes.as_bytes() && bytes != b.receipt_bytes.as_bytes() {
                        return Err("External receipt modification".into());
                    }
                    observed = true;
                }
                if !observed {
                    return Err("Installation receipt and recovery sibling are missing".into());
                }
                let target = io(fs::read_link(&a.command))?;
                if target != self.journal.directory.join(&self.journal.prior.binary)
                    || target != self.journal.directory.join(&self.journal.next.binary)
                {
                    return Err("Changed command link".into());
                }
                Ok(())
            }
            _ => Err("Changed integration destinations".into()),
        }
    }

    fn verify_integration(c: &Candidate, directory: &Path) -> Result<()> {
        if let Some(i) = &c.integration {
            physical(i.command.parent().ok_or("Missing command parent")?)?;
            physical(&i.receipt)?;
            if read_receipt(&i.receipt)? != i.receipt_bytes.as_bytes() {
                return Err("Changed installation receipt".into());
            }
            let target = io(fs::read_link(&i.command))?;
            if target != directory.join(&c.binary) {
                return Err("Changed native command link".into());
            }
        }
        Ok(())
    }
    fn publish_integration(&self, c: &Candidate, directory: &Path) -> Result<()> {
        if let Some(i) = &c.integration {
            let target = io(fs::read_link(&i.command))?;
            if target != directory.join(&c.binary) {
                return Err("Foreign command link".into());
            }
            physical(&i.receipt)?;
            let parent = i.receipt.parent().ok_or("No receipt parent")?;
            let sibling = self.displaced(&i.receipt);
            if i.receipt.try_exists().map_err(|e| e.to_string())? {
                if sibling.try_exists().map_err(|e| e.to_string())? {
                    self.validate_integration_union()?;
                    io(fs::remove_file(&sibling))?;
                }
                rename_exclusive(&i.receipt, &sibling)?;
                self.validate_integration_union()?;
                sync_directory(parent)?;
            }
            let mut f = io(tempfile::NamedTempFile::new_in(parent))?;
            io(f.write_all(i.receipt_bytes.as_bytes()))?;
            io(f.as_file().sync_all())?;
            f.persist_noclobber(&i.receipt).map_err(|e| e.to_string())?;
            self.validate_integration_union()?;
            if sibling.try_exists().map_err(|e| e.to_string())? {
                io(fs::remove_file(&sibling))?;
            }
            sync_directory(parent)?
        }
        Ok(())
    }
    fn active(directory: &Path, c: &Candidate) -> Result<()> {
        let binary = directory.join(&c.binary);
        if !binary.exists() {
            return Ok(());
        }
        active_binary(&binary)
    }
}
fn command(file: &Path, args: &[String]) -> Result<std::process::Output> {
    let mut c = Command::new(file);
    c.args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        c.creation_flags(0x08000000);
    }
    process::capture(&mut c, None)
}
pub fn check_state(binary: &Path, state: &[StateOperand]) -> Result<()> {
    if state.is_empty() {
        return Ok(());
    }
    let mut args = vec!["state-compatibility".into(), "--json".into()];
    for s in state {
        if !matches!(s.kind.as_str(), "settings" | "portable" | "history") {
            return Err("Invalid state operand".into());
        }
        physical(&s.path)?;
        args.push(format!("--{}", s.kind));
        args.push(s.path.to_str().ok_or("State path is not UTF8")?.into())
    }
    let out = command(binary, &args)?;
    let v: serde_json::Value = serde_json::from_slice(&out.stdout)
        .map_err(|_| "Compatibility probe did not return JSON")?;
    if !out.status.success()
        && v["product"] == "local-media-gallery"
        && v["version"] == "0.0.0"
        && v["error"]["code"] == "invalid_arguments"
    {
        return Err("state_probe_unsupported".into());
    }
    if !out.status.success() || v["compatible"] != true {
        return Err("Selected recipient state is incompatible".into());
    }
    Ok(())
}
fn check_compatible_state(
    selected: &Candidate,
    root: &Path,
    other: &Candidate,
    other_root: &Path,
    state: &[StateOperand],
) -> Result<()> {
    match check_state(&root.join(&selected.binary), state) {
        Ok(()) => Ok(()),
        Err(error)
            if error == "state_probe_unsupported"
                && selected.version == "0.0.0"
                && other.version == "0.0.0" =>
        {
            eprintln!(
                "The retained baseline writer predates the finite probe. Checking the unchanged release0.0.0 format1/owned-history contract with the supplied compatible writer; no migration/reset."
            );
            check_state(&other_root.join(&other.binary), state)
        }
        Err(error) => Err(error),
    }
}
fn active_binary(binary: &Path) -> Result<()> {
    #[cfg(target_os = "linux")]
    {
        let expected = io(fs::canonicalize(binary))?;
        for entry in io(fs::read_dir("/proc"))? {
            let entry = io(entry)?;
            if entry.file_name().to_string_lossy().parse::<u32>().is_ok()
                && fs::read_link(entry.path().join("exe")).is_ok_and(|p| {
                    p == expected
                        || p.to_string_lossy()
                            .strip_suffix(" (deleted)")
                            .is_some_and(|s| Path::new(s) == expected)
                })
            {
                return Err("Close the running application before replacement".into());
            }
        }
    }
    #[cfg(target_os = "macos")]
    {
        let out = command(
            Path::new("/usr/sbin/lsof"),
            &[
                "-t".into(),
                "--".into(),
                binary.to_str().ok_or("Invalid executable path")?.into(),
            ],
        )?;
        if out.status.success() && !out.stdout.is_empty() {
            return Err("Close the running application before replacement".into());
        }
        if !matches!(out.status.code(), Some(0 | 1)) {
            return Err("Could not observe application use".into());
        }
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        let _held = OpenOptions::new()
            .read(true)
            .write(true)
            .share_mode(0)
            .open(binary)
            .map_err(|e| {
                format!("Application is active or executable is not exclusively accessible: {e}")
            })?;
    }
    Ok(())
}
