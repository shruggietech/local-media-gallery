// SPDX-License-Identifier: Apache-2.0
//! Native, optional recipient acquisition. Never invokes a compiler or archive tool.
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeSet,
    fs,
    io::{Read, Write},
    path::Path,
    time::Duration,
};
use tokio_util::sync::CancellationToken;

pub type Result<T> = std::result::Result<T, String>;
pub const REPOSITORY: &str = "shruggietech/local-media-gallery";
const MAX_ARCHIVE: u64 = 256 * 1024 * 1024;
const MAX_EXTRACTED: u64 = 1024 * 1024 * 1024;
const MAX_FILES: usize = 8192;
pub fn hash(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}
fn canonical(value: &Value) -> Result<Vec<u8>> {
    let mut value = value.clone();
    value.sort_all_objects();
    serde_json::to_vec(&value).map_err(|e| e.to_string())
}
fn require(yes: bool, message: &str) -> Result<()> {
    if yes { Ok(()) } else { Err(message.into()) }
}
fn checked(cancel: &CancellationToken) -> Result<()> {
    require(!cancel.is_cancelled(), "cancelled")
}
fn decimal(value: &Value) -> Result<u64> {
    let s = value.as_str().ok_or("Missing decimal byte count")?;
    require(
        !s.is_empty() && (s == "0" || !s.starts_with('0')) && s.bytes().all(|c| c.is_ascii_digit()),
        "Invalid decimal byte count",
    )?;
    s.parse().map_err(|_| "Byte count overflow".into())
}
fn digest(value: &Value) -> Result<String> {
    let s = value.as_str().ok_or("Missing digest")?;
    require(
        s.len() == 64
            && s.bytes()
                .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c)),
        "Invalid SHA256",
    )?;
    Ok(s.into())
}
fn version(s: &str) -> bool {
    let p = s.split('.').collect::<Vec<_>>();
    p.len() == 3
        && p.iter().all(|n| {
            !n.is_empty()
                && (*n == "0" || !n.starts_with('0'))
                && n.bytes().all(|c| c.is_ascii_digit())
        })
}
pub fn portable_path(s: &str) -> Result<()> {
    require(
        !s.is_empty() && s.len() <= 240,
        "Invalid archive path length",
    )?;
    for part in s.split('/') {
        let stem = part.split('.').next().unwrap_or("").to_ascii_lowercase();
        require(
            !part.is_empty()
                && part != "."
                && part != ".."
                && !part.ends_with(['.', ' '])
                && !part.chars().any(|c| c < ' ' || "<>:\\|?*\"".contains(c))
                && !matches!(stem.as_str(), "con" | "prn" | "aux" | "nul")
                && !(stem.len() == 4
                    && (stem.starts_with("com") || stem.starts_with("lpt"))
                    && matches!(stem.as_bytes()[3], b'1'..=b'9')),
            "Nonportable archive path",
        )?;
    }
    Ok(())
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Artifact {
    pub platform: String,
    pub architecture: String,
    pub name: String,
    pub format: String,
    pub bytes: String,
    pub sha256: String,
    pub url: String,
    pub inventory: InventoryIdentity,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InventoryIdentity {
    pub bytes: String,
    pub files: usize,
    pub sha256: String,
}
#[derive(Clone)]
pub struct Release {
    pub version: String,
    pub candidate_id: String,
    pub artifacts: Vec<Artifact>,
    pub bytes: Vec<u8>,
}
impl Release {
    pub fn parse(bytes: &[u8]) -> Result<Self> {
        require(bytes.len() <= 32 * 1024 * 1024, "Oversized release record")?;
        let record: Value = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
        let mut normalized = canonical(&record)?;
        normalized.push(b'\n');
        require(normalized == bytes, "Canonical release JSON required")?;
        require(
            record["formatVersion"] == 1
                && record["product"] == "local-media-gallery"
                && record["repository"] == REPOSITORY
                && record["state"] == "published"
                && record["qualification"]["mode"] == "native",
            "Verified published native release required",
        )?;
        let v = record["version"]
            .as_str()
            .ok_or("Missing release version")?;
        require(version(v) && v != "0.0.0", "Invalid published version")?;
        let candidate_id = digest(&record["candidateId"])?;
        let mut immutable = record.clone();
        for key in ["state", "candidateId", "gates", "publication"] {
            immutable
                .as_object_mut()
                .ok_or("Invalid record")?
                .remove(key);
        }
        require(
            hash(&canonical(&immutable)?) == candidate_id,
            "Release immutable identity mismatch",
        )?;
        let revision = record["source"]["revision"]
            .as_str()
            .ok_or("Missing source revision")?;
        require(
            revision.len() == 40
                && revision
                    .bytes()
                    .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
                && record["source"]["files"].as_u64().is_some_and(|n| n > 0),
            "Invalid native source identity",
        )?;
        digest(&record["source"]["sha256"])?;
        let scopes = record["qualification"]["scopes"]
            .as_array()
            .ok_or("Missing native qualification")?;
        let expected = BTreeSet::from([
            "repository",
            "website",
            "product-windows",
            "product-linux",
            "product-macos",
            "windows-packages",
            "linux-packages",
            "macos-packages",
        ]);
        require(
            scopes.len() == expected.len()
                && scopes
                    .iter()
                    .map(|s| s["scope"].as_str().unwrap_or(""))
                    .collect::<BTreeSet<_>>()
                    == expected,
            "Incomplete native qualification",
        )?;
        for scope in scopes {
            digest(&scope["sha256"])?;
            let p = scope["preparationSeconds"]
                .as_f64()
                .ok_or("Missing preparation timing")?;
            let q = scope["qualificationSeconds"]
                .as_f64()
                .ok_or("Missing qualification timing")?;
            let c = scope["combinedSeconds"]
                .as_f64()
                .ok_or("Missing combined timing")?;
            require(
                scope["result"] == "pass"
                    && p >= 0.0
                    && (0.0..885.0).contains(&q)
                    && c >= 0.0
                    && (p + q - c).abs() < 0.002,
                "Invalid native qualification receipt",
            )?;
        }
        let publication = &record["publication"];
        require(
            publication["id"].as_u64().is_some_and(|n| n > 0),
            "Invalid published release identity",
        )?;
        require(
            publication["repository"] == REPOSITORY
                && publication["tag"] == format!("v{v}")
                && publication["sourceRevision"] == record["source"]["revision"]
                && publication["htmlUrl"]
                    == format!("https://github.com/{REPOSITORY}/releases/tag/v{v}")
                && record["documentation"]["version"] == format!("v{v}"),
            "Publication identity mismatch",
        )?;
        for (key, phase) in [("before", "candidate"), ("after", "publication")] {
            let gate = &record["gates"][key];
            require(
                gate["result"] == "pass"
                    && gate["phase"] == phase
                    && gate["candidateId"] == candidate_id
                    && gate["sourceRevision"] == record["source"]["revision"]
                    && gate["sourceSha256"] == record["source"]["sha256"]
                    && gate["snapshotsSha256"] == record["documentation"]["retainedSha256"],
                "Documentation gate binding mismatch",
            )?;
            let checks = gate["checks"].as_array().ok_or("Missing gate checks")?;
            let names = checks
                .iter()
                .map(|c| c["name"].as_str().unwrap_or(""))
                .collect::<BTreeSet<_>>();
            require(
                names
                    == BTreeSet::from([
                        "rendering",
                        "navigation",
                        "links-assets",
                        "version-selection",
                        "search",
                        "schemas-examples",
                        "review",
                    ])
                    && checks.len() == names.len()
                    && checks.iter().all(|c| c["result"] == "pass"),
                "Incomplete documentation gate",
            )?;
        }
        require(
            record["gates"]["before"]["publicationSha256"].is_null()
                && record["gates"]["after"]["publicationSha256"] == hash(&canonical(publication)?),
            "Publication gate digest mismatch",
        )?;
        let rows = record["artifacts"].as_array().ok_or("Missing artifacts")?;
        let published = publication["assets"]
            .as_array()
            .ok_or("Missing published assets")?;
        require(rows.len() == published.len(), "Incomplete published assets")?;
        let mut names = BTreeSet::new();
        let mut ids = BTreeSet::new();
        let mut packages = BTreeSet::new();
        let mut artifacts = Vec::new();
        for row in rows {
            let name = row["name"].as_str().ok_or("Missing artifact name")?;
            portable_path(name)?;
            require(
                !name.contains('/') && names.insert(name),
                "Duplicate artifact",
            )?;
            let bytes = decimal(&row["bytes"])?;
            digest(&row["sha256"])?;
            decimal(&row["inventory"]["bytes"])?;
            digest(&row["inventory"]["sha256"])?;
            let url = format!("https://github.com/{REPOSITORY}/releases/download/v{v}/{name}");
            require(row["url"] == url, "Artifact URL identity mismatch")?;
            let found = published
                .iter()
                .filter(|p| p["name"] == name)
                .collect::<Vec<_>>();
            require(found.len() == 1, "Published asset missing or duplicated")?;
            let found = found[0];
            require(
                ids.insert(found["id"].to_string()) && found["id"].as_u64().is_some_and(|n| n > 0),
                "Invalid published asset identity",
            )?;
            for k in ["bytes", "sha256", "url"] {
                require(found[k] == row[k], "Published asset identity mismatch")?;
            }
            if row["role"] != "package" {
                continue;
            }
            let platform = row["platform"].as_str().ok_or("Missing platform")?;
            let edition = row["edition"].as_str().ok_or("Missing edition")?;
            require(
                matches!(platform, "windows" | "linux" | "macos")
                    && matches!(edition, "full" | "lite")
                    && packages.insert(format!("{platform}/{edition}")),
                "Invalid package rows",
            )?;
            require(
                row["architecture"]
                    == if platform == "macos" {
                        "aarch64"
                    } else {
                        "x86_64"
                    }
                    && row["evidence"]["scope"] == format!("{platform}-packages"),
                "Recipient identity mismatch",
            )?;
            if edition == "lite" {
                require(
                    bytes <= MAX_ARCHIVE
                        && row["format"] == if platform == "linux" { "tar.gz" } else { "zip" },
                    "Unsupported Lite container",
                )?;
                let a: Artifact = serde_json::from_value(row.clone()).map_err(|e| e.to_string())?;
                require(
                    a.inventory.files > 0
                        && a.inventory.files <= MAX_FILES
                        && decimal(&json!(a.inventory.bytes))? <= MAX_EXTRACTED,
                    "Inventory limits exceeded",
                )?;
                artifacts.push(a);
            }
        }
        require(
            packages.len() == 6 && artifacts.len() == 3,
            "Complete elected release matrix required",
        )?;
        Ok(Self {
            version: v.into(),
            candidate_id,
            artifacts,
            bytes: bytes.into(),
        })
    }
    pub fn resolve(cancel: &CancellationToken, progress: impl Fn(u64)) -> Result<Self> {
        let bytes = download(
            &format!("https://github.com/{REPOSITORY}/releases/latest/download/release.json"),
            32 * 1024 * 1024,
            cancel,
            progress,
        )?;
        Self::parse(&bytes)
    }
}

pub fn download(
    url: &str,
    limit: u64,
    cancel: &CancellationToken,
    progress: impl Fn(u64),
) -> Result<Vec<u8>> {
    checked(cancel)?;
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|e| e.to_string())?;
    runtime.block_on(async {
        let client = reqwest::Client::builder().user_agent("Local-Media-Gallery recipient preparation")
            .https_only(true).connect_timeout(Duration::from_secs(15)).timeout(Duration::from_secs(180))
            .redirect(reqwest::redirect::Policy::custom(|attempt| {
                let u = attempt.url();
                if attempt.previous().len() >= 8 || u.scheme() != "https" || !matches!(u.host_str(), Some("github.com" | "release-assets.githubusercontent.com" | "objects.githubusercontent.com")) { attempt.stop() } else { attempt.follow() }
            })).build().map_err(|e| e.to_string())?;
        let mut response = tokio::select! { _ = cancel.cancelled() => return Err("cancelled".into()), response = client.get(url).send() => response.map_err(|e|e.to_string())?.error_for_status().map_err(|e|e.to_string())? };
        require(response.content_length().is_none_or(|n| n <= limit), "Download byte limit exceeded")?;
        let mut bytes = Vec::new();
        loop {
            let next = tokio::select! { _ = cancel.cancelled() => return Err("cancelled".into()), next = response.chunk() => next.map_err(|e|e.to_string())? };
            let Some(chunk) = next else { break };
            require(bytes.len() as u64 + chunk.len() as u64 <= limit, "Download byte limit exceeded")?;
            bytes.extend_from_slice(&chunk); progress(bytes.len() as u64);
        }
        checked(cancel)?; Ok(bytes)
    })
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct FileRecord {
    pub path: String,
    pub bytes: String,
    pub sha256: String,
    pub mode: Option<String>,
}
fn mode(mode: u32, windows: bool) -> Result<Option<String>> {
    require(
        mode & !0o177777 == 0
            && matches!(mode & 0o170000, 0 | 0o100000 | 0o040000)
            && mode & 0o7000 == 0,
        "Archive special file or permission bits refused",
    )?;
    Ok(if windows {
        None
    } else {
        Some(format!("{:o}", mode & 0o777))
    })
}
fn write_entry(
    base: &Path,
    name: &str,
    mut input: impl Read,
    length: u64,
    permissions: Option<String>,
    cancel: &CancellationToken,
) -> Result<FileRecord> {
    portable_path(name)?;
    require(length <= MAX_EXTRACTED, "Archive entry too large")?;
    let path = base.join(name);
    fs::create_dir_all(path.parent().ok_or("Missing parent")?).map_err(|e| e.to_string())?;
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    let mut count = 0u64;
    let mut digest = Sha256::new();
    let mut buf = [0; 65536];
    loop {
        checked(cancel)?;
        let n = input.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        };
        count += n as u64;
        require(count <= length, "Expanded entry exceeds declared size")?;
        file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
        digest.update(&buf[..n]);
    }
    require(count == length, "Truncated archive entry")?;
    file.sync_all().map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Some(mode) = &permissions {
            file.set_permissions(fs::Permissions::from_mode(
                u32::from_str_radix(mode, 8).map_err(|e| e.to_string())?,
            ))
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(FileRecord {
        path: name.into(),
        bytes: count.to_string(),
        sha256: hex::encode(digest.finalize()),
        mode: permissions,
    })
}
pub fn extract(
    bytes: &[u8],
    artifact: &Artifact,
    base: &Path,
    cancel: &CancellationToken,
) -> Result<Vec<FileRecord>> {
    require(
        bytes.len().to_string() == artifact.bytes && hash(bytes) == artifact.sha256,
        "Artifact byte count or SHA256 mismatch",
    )?;
    let mut files = Vec::new();
    let mut names = BTreeSet::new();
    let mut prefixes = std::collections::BTreeMap::<String, String>::new();
    let mut total = 0u64;
    let mut accept = |name: String,
                      input: &mut dyn Read,
                      length: u64,
                      permissions: Option<String>|
     -> Result<()> {
        portable_path(&name)?;
        let mut prefix = String::new();
        for part in name.split('/') {
            if !prefix.is_empty() {
                prefix.push('/');
            }
            prefix.push_str(part);
            let key = prefix.to_lowercase();
            if let Some(old) = prefixes.get(&key) {
                require(old == &prefix, "Case-colliding archive parent")?;
            } else {
                prefixes.insert(key, prefix.clone());
            }
        }
        total = total.checked_add(length).ok_or("Expanded size overflow")?;
        require(
            files.len() < MAX_FILES && total <= MAX_EXTRACTED,
            "Expanded archive exceeds limits",
        )?;
        files.push(write_entry(
            base,
            &name,
            input,
            length,
            permissions,
            cancel,
        )?);
        Ok(())
    };
    if artifact.format == "zip" {
        // Bound central-directory allocation before the ZIP reader builds its index.
        // Our byte/file limits cannot require ZIP64 entry counts.
        let eocd = bytes
            .windows(4)
            .enumerate()
            .rev()
            .find(|(i, s)| {
                *s == b"PK\x05\x06"
                    && *i + 22 <= bytes.len()
                    && *i + 22 + u16::from_le_bytes([bytes[*i + 20], bytes[*i + 21]]) as usize
                        == bytes.len()
            })
            .map(|(i, _)| i)
            .ok_or("Missing ZIP end record")?;
        require(
            u16::from_le_bytes([bytes[eocd + 10], bytes[eocd + 11]]) as usize <= MAX_FILES * 2,
            "Too many ZIP entries",
        )?;
        let mut archive =
            zip::ZipArchive::new(std::io::Cursor::new(bytes)).map_err(|e| e.to_string())?;
        require(archive.len() <= MAX_FILES * 2, "Too many ZIP entries")?;
        for i in 0..archive.len() {
            checked(cancel)?;
            let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
            let name = entry.name().map_err(|e| e.to_string())?.to_string();
            let permissions = mode(
                entry
                    .unix_mode()
                    .unwrap_or(if entry.is_dir() { 0o40755 } else { 0o100644 }),
                artifact.platform == "windows",
            )?;
            portable_path(name.trim_end_matches('/'))?;
            require(
                names.insert(name.trim_end_matches('/').to_lowercase()),
                "Duplicate or case-colliding archive entry",
            )?;
            if entry.is_dir() {
                continue;
            }
            let length = entry.size();
            accept(name, &mut entry, length, permissions)?;
        }
    } else {
        require(artifact.format == "tar.gz", "Unsupported archive format")?;
        // Preflight the decompressed stream and raw extension sizes before tar's
        // convenience iterator allocates GNU/PAX metadata. All staging is private.
        use std::io::Seek;
        let mut expanded = tempfile::tempfile().map_err(|e| e.to_string())?;
        let mut decoder = flate2::read::GzDecoder::new(bytes);
        let mut total_expanded = 0u64;
        let mut buffer = [0; 65536];
        let expansion_limit = decimal(&json!(artifact.inventory.bytes))?
            .checked_add((MAX_FILES * 2048 + 1024 * 1024) as u64)
            .ok_or("Archive size overflow")?;
        loop {
            checked(cancel)?;
            let n = decoder.read(&mut buffer).map_err(|e| e.to_string())?;
            if n == 0 {
                break;
            }
            total_expanded += n as u64;
            require(
                total_expanded <= expansion_limit,
                "Tar stream exceeds inventory and metadata budget",
            )?;
            expanded
                .write_all(&buffer[..n])
                .map_err(|e| e.to_string())?;
        }
        expanded.rewind().map_err(|e| e.to_string())?;
        {
            let mut raw = tar::Archive::new(&mut expanded);
            let mut count = 0;
            for entry in raw.entries().map_err(|e| e.to_string())?.raw(true) {
                checked(cancel)?;
                count += 1;
                require(count <= MAX_FILES * 3, "Too many raw tar entries")?;
                let entry = entry.map_err(|e| e.to_string())?;
                let kind = entry.header().entry_type();
                if kind.is_gnu_longname()
                    || kind.is_gnu_longlink()
                    || kind.is_pax_local_extensions()
                    || kind.is_pax_global_extensions()
                {
                    require(entry.size() <= 65536, "Tar metadata budget exceeded")?;
                }
            }
        }
        expanded.rewind().map_err(|e| e.to_string())?;
        let mut archive = tar::Archive::new(expanded);
        let mut entries = 0usize;
        for entry in archive.entries().map_err(|e| e.to_string())? {
            checked(cancel)?;
            entries += 1;
            require(entries <= MAX_FILES * 2, "Too many tar entries")?;
            let mut entry = entry.map_err(|e| e.to_string())?;
            let kind = entry.header().entry_type();
            let name = entry
                .path()
                .map_err(|e| e.to_string())?
                .to_str()
                .ok_or("Non-UTF8 archive path")?
                .to_string();
            portable_path(name.trim_end_matches('/'))?;
            require(
                names.insert(name.trim_end_matches('/').to_lowercase()),
                "Duplicate or case-colliding archive entry",
            )?;
            if kind.is_dir() {
                mode(entry.header().mode().map_err(|e| e.to_string())?, false)?;
                continue;
            }
            require(kind.is_file(), "Archive links or special files refused")?;
            let permissions = mode(entry.header().mode().map_err(|e| e.to_string())?, false)?;
            let length = entry.size();
            accept(name, &mut entry, length, permissions)?;
        }
    }
    files.sort_by(|a, b| a.path.cmp(&b.path));
    require(
        files.len() == artifact.inventory.files
            && total.to_string() == artifact.inventory.bytes
            && hash(&canonical(
                &serde_json::to_value(&files).map_err(|e| e.to_string())?,
            )?) == artifact.inventory.sha256,
        "Extracted inventory identity mismatch",
    )?;
    Ok(files)
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Preview {
    pub platform: String,
    pub architecture: String,
    pub release_version: String,
    pub candidate_id: String,
    pub artifact_name: String,
    pub artifact_sha256: String,
    pub download_bytes: String,
    pub extracted_bytes: String,
    pub entrypoint_bytes: String,
    pub storage_bytes: String,
    pub destinations: Vec<String>,
    pub disposition: String,
}
pub struct Prepared {
    stage: tempfile::TempDir,
    pub files: Vec<FileRecord>,
    pub preview: Preview,
    tops: Vec<String>,
}
impl Prepared {
    pub fn acquire(
        release: &Release,
        platform: &str,
        cancel: &CancellationToken,
        progress: impl Fn(u64),
    ) -> Result<Self> {
        let artifact = release
            .artifacts
            .iter()
            .find(|a| a.platform == platform)
            .ok_or("Recipient artifact unavailable")?;
        let bytes = download(
            &artifact.url,
            artifact
                .bytes
                .parse()
                .map_err(|_| "Invalid artifact size")?,
            cancel,
            progress,
        )?;
        Self::from_archive(release, artifact, &bytes, cancel)
    }
    pub fn from_archive(
        release: &Release,
        artifact: &Artifact,
        bytes: &[u8],
        cancel: &CancellationToken,
    ) -> Result<Self> {
        let stage = tempfile::tempdir().map_err(|e| e.to_string())?;
        let name = format!("LMG-{}-{}", artifact.platform, artifact.architecture);
        let base = stage.path().join(&name);
        fs::create_dir(&base).map_err(|e| e.to_string())?;
        let bundle = base.join("bundle");
        fs::create_dir(&bundle).map_err(|e| e.to_string())?;
        let inventory = extract(bytes, artifact, &bundle, cancel)?;
        // Both retained original archives and complete extracted bundles survive sharing.
        let mut files = inventory
            .iter()
            .map(|f| FileRecord {
                path: format!("{name}/bundle/{}", f.path),
                ..f.clone()
            })
            .collect::<Vec<_>>();
        let mut add = |path: String, bytes: &[u8], permissions: Option<String>| -> Result<()> {
            files.push(write_entry(
                stage.path(),
                &path,
                bytes,
                bytes.len() as u64,
                permissions,
                cancel,
            )?);
            Ok(())
        };
        add(
            format!("{name}/{}", artifact.name),
            bytes,
            Some("644".into()),
        )?;
        add(
            format!("{name}/release.json"),
            &release.bytes,
            Some("644".into()),
        )?;
        let roots: Vec<&str> = match artifact.platform.as_str() {
            "windows" => vec!["local-media-gallery.exe"],
            "linux" => vec!["local-media-gallery", "local-media-gallery.bin"],
            "macos" => vec!["Local Media Gallery Lite.app"],
            _ => return Err("Unsupported recipient platform".into()),
        };
        let mut entrypoint_bytes = 0u64;
        for f in &inventory {
            if roots
                .iter()
                .any(|r| f.path == *r || f.path.starts_with(&format!("{r}/")))
            {
                let bytes = fs::read(bundle.join(&f.path)).map_err(|e| e.to_string())?;
                entrypoint_bytes += bytes.len() as u64;
                add(f.path.clone(), &bytes, f.mode.clone())?;
            }
        }
        require(entrypoint_bytes > 0, "Recipient launch entrypoint missing")?;
        let receipt = json!({"formatVersion":1,"product":"local-media-gallery","kind":"prepared-recipient","version":release.version,"candidateId":release.candidate_id,"artifact":artifact,"entrypoints":roots,"bundleInventory":inventory});
        let mut receipt = canonical(&receipt)?;
        receipt.push(b'\n');
        add(
            format!("{name}/preparation.json"),
            &receipt,
            Some("644".into()),
        )?;
        files.sort_by(|a, b| a.path.cmp(&b.path));
        let mut tops = vec![name];
        tops.extend(roots.iter().map(|s| s.to_string()));
        let storage = files.iter().try_fold(0u64, |n, f| {
            f.bytes
                .parse::<u64>()
                .ok()
                .and_then(|v| n.checked_add(v))
                .ok_or("Storage overflow")
        })?;
        let preview = Preview {
            platform: artifact.platform.clone(),
            architecture: artifact.architecture.clone(),
            release_version: release.version.clone(),
            candidate_id: release.candidate_id.clone(),
            artifact_name: artifact.name.clone(),
            artifact_sha256: artifact.sha256.clone(),
            download_bytes: artifact.bytes.clone(),
            extracted_bytes: artifact.inventory.bytes.clone(),
            entrypoint_bytes: entrypoint_bytes.to_string(),
            storage_bytes: storage.to_string(),
            destinations: tops.clone(),
            disposition: "new".into(),
        };
        Ok(Self {
            stage,
            files,
            preview,
            tops,
        })
    }
    /// Only exact matching bytes are reused. Unknown content is never adopted or removed.
    pub fn inspect(&mut self, root: &cap_std::fs::Dir, cancel: &CancellationToken) -> Result<()> {
        let existing = self.inspect_existing(root, cancel)?;
        self.preview.disposition = if existing == self.files.len() {
            "reuse"
        } else if existing == 0 {
            "new"
        } else {
            "resume"
        }
        .into();
        Ok(())
    }
    fn inspect_existing(
        &self,
        root: &cap_std::fs::Dir,
        cancel: &CancellationToken,
    ) -> Result<usize> {
        let mut found = BTreeSet::new();
        for top in &self.tops {
            inspect_tree(root, top, &self.files, &mut found, cancel)?;
        }
        Ok(found.len())
    }
    /// Caller holds the current session's short commit authority. Capability-relative,
    /// no-follow, create-new writes preserve concurrent or unrelated destinations.
    pub fn commit(
        &self,
        root: &cap_std::fs::Dir,
        cancel: &CancellationToken,
        progress: impl Fn(usize),
    ) -> Result<()> {
        self.inspect_existing(root, cancel)?;
        for i in 0..self.files.len() {
            self.commit_file(root, i, cancel)?;
            progress(i + 1);
        }
        self.verify_complete(root, cancel)
    }
    pub fn verify_complete(
        &self,
        root: &cap_std::fs::Dir,
        cancel: &CancellationToken,
    ) -> Result<()> {
        require(
            self.inspect_existing(root, cancel)? == self.files.len(),
            "Incomplete recipient commit",
        )
    }
    pub fn commit_file(
        &self,
        root: &cap_std::fs::Dir,
        index: usize,
        cancel: &CancellationToken,
    ) -> Result<()> {
        checked(cancel)?;
        let record = self.files.get(index).ok_or("Invalid prepared file")?;
        let (parent, name) = parent_directory(root, &record.path, true)?;
        let local = FileRecord {
            path: name.clone(),
            ..record.clone()
        };
        match parent.symlink_metadata(&name) {
            Ok(_) => return verify_existing(&parent, &local, cancel),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.to_string()),
        }
        // Validate private staging before creating any recipient file. A missing or
        // damaged staged source must not leave an empty collision on the next run.
        let bytes = fs::read(self.stage.path().join(&record.path)).map_err(|e| e.to_string())?;
        require(
            bytes.len().to_string() == record.bytes && hash(&bytes) == record.sha256,
            "Prepared source changed",
        )?;
        checked(cancel)?;
        use cap_fs_ext::OpenOptionsFollowExt;
        let mut options = cap_std::fs::OpenOptions::new();
        options
            .write(true)
            .create_new(true)
            .follow(cap_fs_ext::FollowSymlinks::No);
        let mut out = parent
            .open_with(&name, &options)
            .map_err(|e| e.to_string())?;
        if let Err(e) = out.write_all(&bytes).and_then(|()| out.sync_all()) {
            drop(out);
            let _ = parent.remove_file(&name);
            return Err(e.to_string());
        }
        #[cfg(unix)]
        {
            use cap_std::fs::PermissionsExt;
            if let Some(mode) = &record.mode {
                out.set_permissions(cap_std::fs::Permissions::from_mode(
                    u32::from_str_radix(mode, 8).map_err(|e| e.to_string())?,
                ))
                .map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }
}
fn parent_directory(
    root: &cap_std::fs::Dir,
    path: &str,
    create: bool,
) -> Result<(cap_std::fs::Dir, String)> {
    use cap_fs_ext::DirExt;
    portable_path(path)?;
    let mut parts = path.split('/').collect::<Vec<_>>();
    let name = parts.pop().ok_or("Missing file name")?.to_owned();
    let mut parent = root.try_clone().map_err(|e| e.to_string())?;
    for part in parts {
        if create {
            match parent.create_dir(part) {
                Ok(()) => {}
                Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {}
                Err(e) => return Err(e.to_string()),
            }
        }
        let m = parent.symlink_metadata(part).map_err(|e| e.to_string())?;
        require(m.is_dir() && !redirected(&m), "Recipient parent collision")?;
        parent = parent.open_dir_nofollow(part).map_err(|e| e.to_string())?;
    }
    Ok((parent, name))
}
fn redirected(metadata: &cap_std::fs::Metadata) -> bool {
    if metadata.is_symlink() {
        return true;
    }
    #[cfg(windows)]
    {
        use cap_std::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return true;
        }
    }
    false
}
fn verify_existing(
    root: &cap_std::fs::Dir,
    expected: &FileRecord,
    cancel: &CancellationToken,
) -> Result<()> {
    let m = root
        .symlink_metadata(&expected.path)
        .map_err(|e| e.to_string())?;
    use cap_fs_ext::{MetadataExt, OpenOptionsFollowExt};
    require(
        m.is_file() && !redirected(&m) && m.nlink() == 1 && m.len().to_string() == expected.bytes,
        "Recipient output collision",
    )?;
    let mut options = cap_std::fs::OpenOptions::new();
    options.read(true).follow(cap_fs_ext::FollowSymlinks::No);
    let mut file = root
        .open_with(&expected.path, &options)
        .map_err(|e| e.to_string())?;
    let opened = file.metadata().map_err(|e| e.to_string())?;
    require(
        m.dev() == opened.dev() && m.ino() == opened.ino(),
        "Recipient output changed",
    )?;
    let mut h = Sha256::new();
    let mut buf = [0; 65536];
    loop {
        checked(cancel)?;
        let n = file.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        };
        h.update(&buf[..n]);
    }
    require(
        hex::encode(h.finalize()) == expected.sha256,
        "Recipient output collision",
    )?;
    #[cfg(unix)]
    {
        use cap_std::fs::PermissionsExt;
        if let Some(mode) = &expected.mode {
            require(
                format!("{:o}", opened.permissions().mode() & 0o777) == *mode,
                "Recipient executable mode changed",
            )?;
        }
    }
    Ok(())
}
fn inspect_tree(
    root: &cap_std::fs::Dir,
    path: &str,
    files: &[FileRecord],
    found: &mut BTreeSet<String>,
    cancel: &CancellationToken,
) -> Result<()> {
    checked(cancel)?;
    let metadata = match root.symlink_metadata(path) {
        Ok(m) => m,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(e) => return Err(e.to_string()),
    };
    require(!redirected(&metadata), "Recipient path redirects")?;
    if metadata.is_file() {
        let expected = files
            .iter()
            .find(|r| r.path == path)
            .ok_or("Unrelated recipient content")?;
        let (parent, name) = parent_directory(root, path, false)?;
        let local = FileRecord {
            path: name,
            ..expected.clone()
        };
        verify_existing(&parent, &local, cancel).map_err(|e| format!("{path}: {e}"))?;
        found.insert(path.into());
    } else {
        require(
            metadata.is_dir()
                && files
                    .iter()
                    .any(|r| r.path.starts_with(&format!("{path}/"))),
            "Unrelated recipient directory",
        )?;
        for entry in root.read_dir(path).map_err(|e| e.to_string())? {
            let name = entry
                .map_err(|e| e.to_string())?
                .file_name()
                .into_string()
                .map_err(|_| "Nonportable recipient content")?;
            inspect_tree(root, &format!("{path}/{name}"), files, found, cancel)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn damaged_staging_never_creates_a_collision_and_can_be_retried() {
        let stage = tempfile::tempdir().unwrap();
        let target = tempfile::tempdir().unwrap();
        let root = cap_std::fs::Dir::open_ambient_dir(target.path(), cap_std::ambient_authority())
            .unwrap();
        fs::write(target.path().join("media.jpg"), b"original").unwrap();
        let prepared = Prepared {
            stage,
            files: vec![FileRecord {
                path: "recipient.exe".into(),
                bytes: "6".into(),
                sha256: hash(b"native"),
                mode: None,
            }],
            tops: vec!["recipient.exe".into()],
            preview: Preview {
                platform: "windows".into(),
                architecture: "x86_64".into(),
                release_version: "0.1.0".into(),
                candidate_id: String::new(),
                artifact_name: String::new(),
                artifact_sha256: String::new(),
                download_bytes: "0".into(),
                extracted_bytes: "6".into(),
                entrypoint_bytes: "6".into(),
                storage_bytes: "6".into(),
                destinations: vec!["recipient.exe".into()],
                disposition: "new".into(),
            },
        };
        let cancel = CancellationToken::new();
        let source = prepared.stage.path().join("recipient.exe");
        // Missing bytes and same-length corruption both fail before creation.
        assert!(prepared.commit_file(&root, 0, &cancel).is_err());
        assert!(!target.path().join("recipient.exe").exists());
        fs::write(&source, b"broken").unwrap();
        assert!(prepared.commit_file(&root, 0, &cancel).is_err());
        assert!(!target.path().join("recipient.exe").exists());
        fs::write(source, b"native").unwrap();
        prepared.commit(&root, &cancel, |_| {}).unwrap();
        assert_eq!(
            fs::read(target.path().join("recipient.exe")).unwrap(),
            b"native"
        );
        assert_eq!(
            fs::read(target.path().join("media.jpg")).unwrap(),
            b"original"
        );
    }
}
