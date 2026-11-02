// SPDX-License-Identifier: Apache-2.0
//! Ordinary single-file Lite maintenance. Downloaded replacements are the updater.
use crate::{
    Candidate, FileRecord, Native, Outcome, RecoveryCommand, Result, Source, StateOperand,
    Transaction, hash, physical,
};
use serde::Deserialize;
use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
};
const MAGIC: &[u8] = b"LMG-SINGLE-FILE1\0";
const METADATA_BOUND: usize = 16 * 1024 * 1024;
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Notice {
    path: String,
    text: String,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Metadata {
    kind: String,
    format_version: u32,
    product: String,
    version: String,
    edition: String,
    os: String,
    arch: String,
    generation: String,
    source: Source,
    revision: String,
    notices: Vec<Notice>,
    prerequisites: Vec<String>,
    executable_bytes: usize,
    executable_sha256: String,
}
#[derive(Debug)]
pub struct SingleFile {
    metadata: Metadata,
    pub bytes: Vec<u8>,
    pub sha256: String,
}
impl SingleFile {
    pub fn decode(bytes: Vec<u8>) -> Result<Self> {
        let footer = 40 + MAGIC.len();
        if bytes.len() <= footer || !bytes.ends_with(MAGIC) {
            return Err("Executable has no single-file metadata; use the documented historical archive maintenance path".into());
        }
        let at = bytes.len() - footer;
        let length = u64::from_le_bytes(bytes[at..at + 8].try_into().unwrap());
        if length == 0 || length > METADATA_BOUND as u64 || length >= at as u64 {
            return Err("Invalid embedded metadata length".into());
        }
        let start = at - length as usize;
        let json = &bytes[start..at];
        if hash(json) != hex::encode(&bytes[at + 8..at + 40]) {
            return Err("Embedded metadata digest differs".into());
        }
        let metadata: Metadata = serde_json::from_slice(json)
            .map_err(|e| format!("Invalid single-file metadata: {e}"))?;
        if metadata.kind != "local-media-gallery-single-file"
            || metadata.format_version != 1
            || metadata.product != "local-media-gallery"
            || metadata.edition != "lite"
            || metadata.os != std::env::consts::OS
            || metadata.arch != std::env::consts::ARCH
            || metadata.executable_bytes != start
            || hash(&bytes[..start]) != metadata.executable_sha256
            || metadata.revision.len() != 40
            || !metadata
                .revision
                .bytes()
                .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
            || metadata.notices.is_empty()
            || metadata.notices.len() > 8192
            || metadata.prerequisites.iter().any(|s| s.contains('\0'))
        {
            return Err(
                "Single-file platform, edition, provenance or executable identity differs".into(),
            );
        }
        let mut notices = BTreeSet::new();
        for notice in &metadata.notices {
            if notice.path.is_empty()
                || notice.path.len() > 1024
                || notice.path.contains(['\\', ':', '\0'])
                || notice
                    .path
                    .split('/')
                    .any(|p| p.is_empty() || p == "." || p == "..")
                || !notices.insert(notice.path.to_lowercase())
                || notice.text.contains('\0')
                || notice.text.starts_with('\u{feff}')
            {
                return Err("Invalid embedded notice".into());
            }
        }
        native_header(&bytes[..start])?;
        let result = Self {
            sha256: hash(&bytes),
            metadata,
            bytes,
        };
        result.candidate("local-media-gallery")?;
        Ok(result)
    }
    pub fn read(path: &Path) -> Result<Self> {
        physical(path)?;
        let m = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
        if !m.is_file() || m.len() > 1024 * 1024 * 1024 {
            return Err("Expected a bounded regular executable".into());
        }
        Self::decode(crate::read_bounded(path, 1024 * 1024 * 1024)?)
    }
    pub fn candidate(&self, binary: &str) -> Result<Candidate> {
        let m = &self.metadata;
        let candidate = Candidate {
            format_version: 1,
            product: m.product.clone(),
            version: m.version.clone(),
            edition: m.edition.clone(),
            os: m.os.clone(),
            arch: m.arch.clone(),
            generation: m.generation.clone(),
            source: m.source.clone(),
            binary: binary.into(),
            files: vec![FileRecord {
                path: binary.into(),
                bytes: self.bytes.len().to_string(),
                sha256: self.sha256.clone(),
                mode: 755,
            }],
            native: Native::Direct,
            integration: None,
        };
        candidate.validate()?;
        Ok(candidate)
    }
}
fn native_header(bytes: &[u8]) -> Result<()> {
    #[cfg(windows)]
    {
        if bytes.len() < 64 || !bytes.starts_with(b"MZ") {
            return Err("Expected a PE executable".into());
        }
        let at = u32::from_le_bytes(bytes[60..64].try_into().unwrap()) as usize;
        let h = bytes.get(at..at + 6).ok_or("Invalid PE header")?;
        let expected = if cfg!(target_arch = "x86_64") {
            0x8664u16
        } else {
            0xaa64
        };
        if &h[..4] != b"PE\0\0" || u16::from_le_bytes(h[4..6].try_into().unwrap()) != expected {
            return Err("PE architecture differs".into());
        }
    }
    #[cfg(target_os = "linux")]
    {
        let expected = if cfg!(target_arch = "x86_64") {
            62u16
        } else {
            183
        };
        if bytes.len() < 64
            || !bytes.starts_with(b"\x7fELF")
            || bytes[4] != 2
            || bytes[5] != 1
            || u16::from_le_bytes(bytes[18..20].try_into().unwrap()) != expected
        {
            return Err("ELF architecture differs".into());
        }
    }
    #[cfg(target_os = "macos")]
    {
        let expected = if cfg!(target_arch = "aarch64") {
            0x0100000cu32
        } else {
            0x01000007
        };
        if bytes.len() < 32
            || u32::from_le_bytes(bytes[..4].try_into().unwrap()) != 0xfeedfacf
            || u32::from_le_bytes(bytes[4..8].try_into().unwrap()) != expected
        {
            return Err("Mach-O architecture differs".into());
        }
    }
    Ok(())
}

/// Private per-user storage is independent from the gallery and downloaded file.
pub fn storage_root() -> Result<PathBuf> {
    #[cfg(windows)]
    {
        gallery_windows_package::private::storage_root(false)
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::{DirBuilderExt, MetadataExt};
        let home = std::env::var_os("HOME").ok_or("User home is unavailable")?;
        let root = PathBuf::from(home).join(if cfg!(target_os = "macos") {
            "Library/Application Support/LocalMediaGalleryMaintenance"
        } else {
            ".local/state/local-media-gallery/maintenance"
        });
        physical(&root)?;
        let mut builder = fs::DirBuilder::new();
        builder.recursive(true).mode(0o700);
        builder.create(&root).map_err(|e| e.to_string())?;
        let metadata = fs::metadata(&root).map_err(|e| e.to_string())?;
        unsafe extern "C" {
            fn geteuid() -> u32;
        }
        if !metadata.is_dir()
            || metadata.uid() != unsafe { geteuid() }
            || metadata.mode() & 0o077 != 0
        {
            return Err("Maintenance storage is not private and owned by this user".into());
        }
        Ok(root)
    }
}
fn transaction_path(storage: &Path, target: &Path, next: &SingleFile) -> Result<PathBuf> {
    physical(storage)?;
    physical(target)?;
    let identity = crate::canonical_identity(target)?;
    let identity = identity
        .to_str()
        .ok_or("Maintenance requires Unicode native paths")?;
    let identity = if cfg!(windows) {
        identity.to_lowercase()
    } else {
        identity.to_owned()
    };
    Ok(storage.join(format!(
        "lite-{}-{}",
        &hash(identity.as_bytes())[..24],
        &next.sha256[..24]
    )))
}
/// Validate both final files and retain a transaction without exposing descriptors.
pub fn prepare(
    storage: &Path,
    target: &Path,
    replacement: &Path,
    state: &[StateOperand],
) -> Result<Transaction> {
    let prior = SingleFile::read(target)?;
    let next = SingleFile::read(replacement)?;
    let base = transaction_path(storage, target, &next)?;
    if crate::canonical_identity(target)? == crate::canonical_identity(replacement)? {
        return Err("Run maintenance from the separate downloaded replacement executable, with the old application closed".into());
    }
    let binary = target
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or("Executable filename must be Unicode")?;
    let a = prior.candidate(binary)?;
    let b = next.candidate(binary)?;
    let staging = tempfile::Builder::new()
        .prefix("lite-source-")
        .tempdir_in(storage)
        .map_err(|e| e.to_string())?;
    let source = staging.path().join(binary);
    fs::write(&source, &next.bytes).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&source, fs::Permissions::from_mode(0o755))
            .map_err(|e| e.to_string())?;
    }
    Transaction::prepare(
        &base,
        target.parent().ok_or("Missing executable parent")?,
        &a,
        &b,
        staging.path(),
        state,
    )
}
/// Execute from a separate replacement Lite file; no helper or JSON is distributed.
pub fn execute(
    operation: &str,
    target: &Path,
    replacement: &Path,
    state: &[StateOperand],
) -> Result<Outcome> {
    let next = SingleFile::read(replacement)?;
    physical(target)?;
    if crate::canonical_identity(target)? == crate::canonical_identity(replacement)? {
        return Err("Run maintenance from the separate downloaded replacement executable, with the old application closed".into());
    }
    if !matches!(operation, "replace" | "recover" | "rollback" | "status") {
        return Err("Use maintain replace, recover, rollback or status OLD_EXECUTABLE".into());
    }
    let storage = storage_root()?;
    let base = transaction_path(&storage, target, &next)?;
    match operation {
        "replace" => {
            let mut transaction = if base.exists() {
                Transaction::open(&base)?
            } else {
                prepare(&storage, target, replacement, state)?
            };
            transaction.apply_verified(false)
        }
        "recover" => Transaction::resume(&base, RecoveryCommand::Recover),
        "rollback" => Transaction::resume(&base, RecoveryCommand::Rollback),
        _ => Transaction::resume(&base, RecoveryCommand::Status),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn actual_javascript_writer_metadata_is_readable_by_native_maintenance() {
        use std::process::{Command, Stdio};
        let writer = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../scripts/single-file.mjs");
        let script = r#"
import {pathToFileURL} from 'node:url';
const {encodeSingleFile}=await import(pathToFileURL(process.argv[1]).href);
const b=Buffer.alloc(256),os={win32:'windows',linux:'linux',darwin:'macos'}[process.platform],arch=process.arch==='arm64'?'aarch64':'x86_64';
if(os==='windows'){b.write('MZ');b.writeUInt32LE(64,60);b.write('PE\0\0',64);b.writeUInt16LE(arch==='x86_64'?0x8664:0xaa64,68);b.writeUInt16LE(0x20b,88);}
if(os==='linux'){b.set([0x7f,0x45,0x4c,0x46,2,1]);b.writeUInt16LE(arch==='x86_64'?62:183,18);}
if(os==='macos'){b.writeUInt32LE(0xfeedfacf);b.writeUInt32LE(arch==='aarch64'?0x100000c:0x1000007,4);}
process.stdout.write(encodeSingleFile(b,{version:'0.2.0',edition:'lite',os,arch,generation:'cross-language-fixture',source:{sha256:'a'.repeat(64),files:1,exclusions:['specs/internal-record.md']},revision:'b'.repeat(40),notices:[{path:'NOTICE',text:'Embedded fixture notice\n'}]}));
"#;
        let mut command = Command::new("node");
        command
            .args(["--input-type=module", "-e", script])
            .arg(writer);
        command
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000);
        }
        let output = command.output().expect("Repository Node prerequisite");
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        let decoded = SingleFile::decode(output.stdout).unwrap();
        let candidate = decoded.candidate("fixture").unwrap();
        assert_eq!(candidate.source.sha256, "a".repeat(64));
        assert_eq!(candidate.files.len(), 1);
    }
    fn executable(generation: &str) -> Vec<u8> {
        let mut body = vec![0u8; 256];
        #[cfg(windows)]
        {
            body[..2].copy_from_slice(b"MZ");
            body[60..64].copy_from_slice(&64u32.to_le_bytes());
            body[64..68].copy_from_slice(b"PE\0\0");
            body[68..70].copy_from_slice(
                &(if cfg!(target_arch = "x86_64") {
                    0x8664u16
                } else {
                    0xaa64
                })
                .to_le_bytes(),
            );
        }
        #[cfg(target_os = "linux")]
        {
            body[..4].copy_from_slice(b"\x7fELF");
            body[4] = 2;
            body[5] = 1;
            body[18..20].copy_from_slice(
                &(if cfg!(target_arch = "x86_64") {
                    62u16
                } else {
                    183
                })
                .to_le_bytes(),
            );
        }
        #[cfg(target_os = "macos")]
        {
            body[..4].copy_from_slice(&0xfeedfacfu32.to_le_bytes());
            body[4..8].copy_from_slice(
                &(if cfg!(target_arch = "aarch64") {
                    0x0100000cu32
                } else {
                    0x01000007
                })
                .to_le_bytes(),
            );
        }
        body[200..200 + generation.len()].copy_from_slice(generation.as_bytes());
        let metadata = serde_json::json!({"kind":"local-media-gallery-single-file","formatVersion":1,"product":"local-media-gallery","version":"0.2.0","edition":"lite","os":std::env::consts::OS,"arch":std::env::consts::ARCH,"generation":generation,"source":{"sha256":"a".repeat(64),"files":1},"revision":"b".repeat(40),"notices":[{"path":"LICENSE","text":"fixture notice"}],"prerequisites":[],"executableBytes":body.len(),"executableSha256":hash(&body)});
        append(body, metadata)
    }
    fn append(mut body: Vec<u8>, metadata: serde_json::Value) -> Vec<u8> {
        let mut json = serde_json::to_vec(&metadata).unwrap();
        json.push(b'\n');
        let n = json.len() as u64;
        let sha = hex::decode(hash(&json)).unwrap();
        body.extend(json);
        body.extend(n.to_le_bytes());
        body.extend(sha);
        body.extend(MAGIC);
        body
    }
    fn altered(bytes: &[u8], change: impl FnOnce(&mut serde_json::Value)) -> Vec<u8> {
        let at = bytes.len() - 40 - MAGIC.len();
        let length = u64::from_le_bytes(bytes[at..at + 8].try_into().unwrap()) as usize;
        let start = at - length;
        let mut value: serde_json::Value = serde_json::from_slice(&bytes[start..at]).unwrap();
        change(&mut value);
        append(bytes[..start].to_vec(), value)
    }
    fn fixture() -> tempfile::TempDir {
        #[cfg(windows)]
        let parent = gallery_windows_package::private::storage_root(false).unwrap();
        #[cfg(not(windows))]
        let parent = fs::canonicalize(std::env::temp_dir()).unwrap();
        tempfile::tempdir_in(parent).unwrap()
    }
    fn write(path: &Path, bytes: &[u8]) {
        fs::write(path, bytes).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(path, fs::Permissions::from_mode(0o755)).unwrap();
        }
    }
    #[test]
    fn single_file_footer_binds_body_metadata_notices_and_platform() {
        let bytes = executable("old");
        assert!(SingleFile::decode(bytes.clone()).is_ok());
        for n in [0, bytes.len() - 1, bytes.len() - 20] {
            assert!(SingleFile::decode(bytes[..n].to_vec()).is_err())
        }
        let mut changed = bytes.clone();
        changed[200] ^= 1;
        assert!(SingleFile::decode(changed).is_err());
        for change in [
            |v: &mut serde_json::Value| v["edition"] = "full".into(),
            |v: &mut serde_json::Value| v["arch"] = "unknown".into(),
            |v: &mut serde_json::Value| v["notices"][0]["path"] = "../LICENSE".into(),
            |v: &mut serde_json::Value| v["source"]["files"] = 0.into(),
        ] {
            assert!(SingleFile::decode(altered(&bytes, change)).is_err())
        }
        assert!(SingleFile::decode(b"historical unqualified binary".to_vec()).is_err());
    }
    #[test]
    fn ordinary_single_file_prepare_replacement_repeat_and_rollback_preserve_media() {
        let temp = fixture();
        let live = temp.path().join("gallery");
        fs::create_dir(&live).unwrap();
        let target = live.join("gallery.exe");
        let replacement = temp.path().join("download.exe");
        let a = executable("old");
        let b = executable("new");
        write(&target, &a);
        write(&replacement, &b);
        fs::write(live.join("photo.jpg"), b"retain media").unwrap();
        fs::write(live.join("settings.json"), b"retain settings").unwrap();
        let mut op = prepare(temp.path(), &target, &replacement, &[]).unwrap();
        assert_eq!(op.apply(false).unwrap().status, "complete");
        assert_eq!(fs::read(&target).unwrap(), b);
        assert_eq!(op.apply(false).unwrap().status, "already-current");
        assert_eq!(op.apply(true).unwrap().status, "restored");
        assert_eq!(fs::read(&target).unwrap(), a);
        assert_eq!(fs::read(live.join("photo.jpg")).unwrap(), b"retain media");
        assert_eq!(
            fs::read(live.join("settings.json")).unwrap(),
            b"retain settings"
        );
        assert!(!live.join("payload.json").exists());
        assert!(!live.join("update.json").exists());
        assert!(!live.join("candidate.json").exists());
    }
    #[test]
    fn ordinary_single_file_refuses_corrupt_replacement_and_foreign_live_bytes() {
        let temp = fixture();
        let live = temp.path().join("gallery");
        fs::create_dir(&live).unwrap();
        let target = live.join("gallery.exe");
        let replacement = temp.path().join("download.exe");
        let a = executable("old");
        let b = executable("new");
        write(&target, &a);
        write(&replacement, b"corrupt");
        assert!(prepare(temp.path(), &target, &replacement, &[]).is_err());
        assert_eq!(fs::read(&target).unwrap(), a);
        write(&replacement, &b);
        let mut op = prepare(temp.path(), &target, &replacement, &[]).unwrap();
        write(&target, b"foreign");
        assert!(op.apply(false).is_err());
        assert_eq!(fs::read(&target).unwrap(), b"foreign");
    }
    #[test]
    fn prepared_single_file_interruption_recovers_missing_target_and_refuses_tampered_retention() {
        let temp = fixture();
        let live = temp.path().join("gallery");
        fs::create_dir(&live).unwrap();
        let target = live.join("gallery.exe");
        let replacement = temp.path().join("download.exe");
        let a = executable("old");
        let b = executable("new");
        write(&target, &a);
        write(&replacement, &b);
        let next = SingleFile::read(&replacement).unwrap();
        let base = transaction_path(temp.path(), &target, &next).unwrap();
        drop(prepare(temp.path(), &target, &replacement, &[]).unwrap());
        fs::remove_file(&target).unwrap();
        {
            let mut op = Transaction::open(&base).unwrap();
            assert_eq!(op.apply(false).unwrap().status, "complete");
        }
        assert_eq!(fs::read(&target).unwrap(), b);
        write(&base.join("prior/gallery.exe"), b"changed backup");
        assert!(Transaction::open(&base).is_err());
        assert_eq!(fs::read(&target).unwrap(), b);
    }
}
