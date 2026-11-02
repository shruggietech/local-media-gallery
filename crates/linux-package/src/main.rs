// SPDX-License-Identifier: Apache-2.0
use serde::{Deserialize, Serialize};
#[cfg(any(target_os = "linux", test))]
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::fs::File;
#[cfg(any(target_os = "linux", test))]
use std::io::Write;
use std::io::{Read, Seek, SeekFrom};
#[cfg(any(target_os = "linux", test))]
use std::path::Path;

#[cfg(any(target_os = "linux", all(test, windows)))]
mod fresh;
#[cfg(target_os = "linux")]
mod maintenance;
#[cfg(any(target_os = "linux", test))]
mod profile;
#[cfg(any(target_os = "linux", all(test, windows)))]
mod retention;

const MAGIC: &[u8; 16] = b"LMG-LINUX-FULL1\0";
const MAX_METADATA: u64 = 8 * 1024 * 1024;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Package {
    name: String,
    package: String,
    version: String,
    architecture: String,
    role: String,
    source: serde_json::Value,
    offset: u64,
    bytes: u64,
    sha256: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Manifest {
    format_version: u32,
    product: String,
    version: String,
    os: String,
    arch: String,
    generation: String,
    source: serde_json::Value,
    revision: String,
    native_bytes: u64,
    application_descriptor: serde_json::Value,
    #[serde(default)]
    predecessor: Option<serde_json::Value>,
    packages: Vec<Package>,
}

fn validate_manifest(m: &Manifest, metadata_start: u64) -> Result<(), String> {
    if m.format_version != 1
        || m.product != "local-media-gallery"
        || m.os != "linux"
        || m.arch != "x86_64"
        || m.native_bytes < 4
        || m.generation.len() != 32
        || !m
            .generation
            .bytes()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase())
        || m.packages.is_empty()
        || m.packages.len() > 2048
        || m.application_descriptor["version"] != m.version
        || m.application_descriptor["generation"] != m.generation
        || m.application_descriptor["source"]["sha256"] != m.source["sha256"]
    {
        return Err("Unsupported embedded installer identity or package inventory".into());
    }
    let mut end = m.native_bytes;
    let mut names = HashSet::new();
    let mut identities = HashSet::new();
    let mut applications = 0;
    for p in &m.packages {
        if p.name.is_empty()
            || !p.name.ends_with(".deb")
            || !p
                .name
                .bytes()
                .all(|c| c.is_ascii_alphanumeric() || b"._+-~%".contains(&c))
            || p.package.is_empty()
            || !p
                .package
                .bytes()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || b"+.-".contains(&c))
            || !matches!(p.architecture.as_str(), "amd64" | "all")
            || !matches!(p.role.as_str(), "application" | "runtime" | "predecessor")
            || p.offset != end
            || p.bytes == 0
            || p.sha256.len() != 64
            || !p
                .sha256
                .bytes()
                .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase())
            || !names.insert(&p.name)
            || !identities.insert(format!("{}:{}", p.role, p.package))
        {
            return Err("Invalid or overlapping embedded package inventory".into());
        }
        end = end.checked_add(p.bytes).ok_or("Embedded size overflow")?;
        if end > metadata_start {
            return Err("Embedded package extends outside payload".into());
        }
        if p.role == "application" {
            applications += 1;
            if p.package != "local-media-gallery"
                || p.version != m.version
                || p.architecture != "amd64"
            {
                return Err("Application package identity differs".into());
            }
        }
    }
    if applications != 1 || end != metadata_start {
        return Err("Installer must contain one application and an exact payload extent".into());
    }
    Ok(())
}

fn manifest(file: &mut File) -> Result<Manifest, String> {
    let length = file.metadata().map_err(|e| e.to_string())?.len();
    if length < 28 {
        return Err("Installer payload is absent or truncated".into());
    }
    file.seek(SeekFrom::End(-24)).map_err(|e| e.to_string())?;
    let mut footer = [0u8; 24];
    file.read_exact(&mut footer).map_err(|e| e.to_string())?;
    if &footer[8..] != MAGIC {
        return Err("Installer footer differs".into());
    }
    let size = u64::from_le_bytes(footer[..8].try_into().unwrap());
    if size == 0 || size > MAX_METADATA || size > length - 28 {
        return Err("Invalid installer metadata extent".into());
    }
    let start = length - 24 - size;
    file.seek(SeekFrom::Start(start))
        .map_err(|e| e.to_string())?;
    let mut bytes = vec![0u8; size as usize];
    file.read_exact(&mut bytes).map_err(|e| e.to_string())?;
    let m: Manifest = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    validate_manifest(&m, start)?;
    Ok(m)
}

#[cfg(any(target_os = "linux", test))]
fn extract(
    file: &mut File,
    m: &Manifest,
    destination: &Path,
) -> Result<Vec<std::path::PathBuf>, String> {
    let mut paths = Vec::new();
    for p in &m.packages {
        let target = destination.join(&p.name);
        let mut output = File::options()
            .write(true)
            .create_new(true)
            .open(&target)
            .map_err(|e| e.to_string())?;
        file.seek(SeekFrom::Start(p.offset))
            .map_err(|e| e.to_string())?;
        let mut left = p.bytes;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 65536];
        while left > 0 {
            let n = buffer.len().min(left as usize);
            file.read_exact(&mut buffer[..n])
                .map_err(|e| e.to_string())?;
            output.write_all(&buffer[..n]).map_err(|e| e.to_string())?;
            hasher.update(&buffer[..n]);
            left -= n as u64;
        }
        output.sync_all().map_err(|e| e.to_string())?;
        if hex::encode(hasher.finalize()) != p.sha256 {
            return Err(format!("Embedded package checksum differs: {}", p.name));
        }
        paths.push(target);
    }
    Ok(paths)
}

#[cfg(target_os = "linux")]
fn install(executable: &Path, file: &mut File, m: &Manifest, action: &str) -> Result<(), String> {
    use std::process::Command;
    // Authentication remains in the ordinary user's existing graphical session.
    // No GUI environment, user-controlled PATH or library search path crosses it.
    if unsafe { libc::geteuid() } != 0 {
        let status = Command::new("/usr/bin/pkexec")
            .arg("--disable-internal-agent")
            .arg(executable)
            .arg(action)
            .arg("--__profile")
            .arg(maintenance::profile_context()?)
            .status()
            .map_err(|e| format!("System authorization unavailable: {e}"))?;
        return if status.success() {
            Ok(())
        } else {
            Err(format!("System installation did not complete ({status})"))
        };
    }
    let os = std::fs::read_to_string("/etc/os-release").map_err(|e| e.to_string())?;
    let values: std::collections::HashMap<_, _> = os
        .lines()
        .filter_map(|line| line.split_once('='))
        .map(|(k, v)| (k, v.trim_matches('"')))
        .collect();
    if values.get("ID") != Some(&"ubuntu")
        || values.get("VERSION_ID") != Some(&"24.04")
        || std::env::consts::ARCH != "x86_64"
    {
        return Err("This installer requires Ubuntu 24.04 x86_64".into());
    }
    maintenance::operate(executable, file, m, action)
}

#[cfg(target_os = "linux")]
fn install_packages(
    file: &mut File,
    m: &Manifest,
    include_application: bool,
    repair_dependencies: bool,
) -> Result<(), String> {
    use std::process::Command;
    let work = tempfile::Builder::new()
        .prefix("local-media-gallery-install-")
        .permissions({
            use std::os::unix::fs::PermissionsExt;
            std::fs::Permissions::from_mode(0o700)
        })
        .tempdir_in("/var/tmp")
        .map_err(|e| e.to_string())?;
    let packages = extract(file, m, work.path())?;
    let mut selected = Vec::new();
    for (package, pathname) in m.packages.iter().zip(packages) {
        if package.role == "predecessor" {
            continue;
        }
        if package.role == "application" {
            if include_application {
                selected.push(pathname);
            }
            continue;
        }
        let registered = Command::new("/usr/bin/dpkg-query")
            .env_clear()
            .env("PATH", "/usr/bin:/bin")
            .args([
                "-W",
                "--showformat=${db:Status-Status}|${Version}",
                "--",
                &package.package,
            ])
            .output()
            .map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&registered.stdout);
        let keep = if let Some(("installed", version)) = text.split_once('|') {
            let status = Command::new("/usr/bin/dpkg")
                .env_clear()
                .env("PATH", "/usr/bin:/bin")
                .args(["--compare-versions", version, "ge", &package.version])
                .status()
                .map_err(|e| e.to_string())?;
            match status.code() {
                Some(0) => true,
                Some(1) => false,
                _ => return Err("Installed runtime version comparison failed".into()),
            }
        } else {
            false
        };
        if !keep {
            selected.push(pathname);
        }
    }
    if selected.is_empty() {
        return Ok(());
    }
    // The package manager, rather than this bootstrap, owns dependencies and their
    // lifecycle. Every installation operand is retained inside this executable.
    let sources = work.path().join("sources.list");
    File::options()
        .write(true)
        .create_new(true)
        .open(&sources)
        .map_err(|e| e.to_string())?
        .sync_all()
        .map_err(|e| e.to_string())?;
    let source_parts = work.path().join("sources.list.d");
    std::fs::create_dir(&source_parts).map_err(|e| e.to_string())?;
    let mut command = Command::new("/usr/bin/apt-get");
    command
        .env_clear()
        .env("PATH", "/usr/sbin:/usr/bin:/sbin:/bin")
        .env("DEBIAN_FRONTEND", "noninteractive")
        .env("LC_ALL", "C")
        .args([
            "--no-download",
            "--no-remove",
            "--no-install-recommends",
            "--reinstall",
            "--yes",
        ]);
    if repair_dependencies {
        command.arg("--fix-broken");
    }
    command
        .arg("-o")
        .arg(format!("Dir::Etc::sourcelist={}", sources.display()))
        .arg("-o")
        .arg(format!("Dir::Etc::sourceparts={}", source_parts.display()))
        .args(["-o", "APT::Get::AllowUnauthenticated=false", "install"])
        .args(&selected);
    let status = command.status().map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!(
            "Offline package installation failed ({status}); no network fallback was attempted"
        ));
    }
    Ok(())
}

#[cfg(target_os = "linux")]
fn verify_identity(m: &Manifest) -> Result<(), String> {
    use std::process::Command;
    let result = Command::new("/usr/bin/local-media-gallery")
        .env_clear()
        .env("PATH", "/usr/bin:/bin")
        .args(["--version", "--json"])
        .output()
        .map_err(|e| e.to_string())?;
    let identity: serde_json::Value =
        serde_json::from_slice(&result.stdout).map_err(|e| e.to_string())?;
    if !result.status.success() || identity["version"] != m.version || identity["edition"] != "full"
    {
        return Err("Installed application identity differs".into());
    }
    println!(
        "Local Media Gallery Full {} installed at system scope using bundled offline payloads.",
        m.version
    );
    Ok(())
}

fn run() -> Result<(), String> {
    #[allow(unused_mut)]
    let mut arguments: Vec<_> = std::env::args_os().skip(1).collect();
    #[cfg(target_os = "linux")]
    if arguments.len() == 3 && arguments[1] == "--__profile" {
        maintenance::receive_profile(arguments[2].to_str().ok_or("Profile context is not UTF8")?)?;
        arguments.truncate(1);
    }
    if arguments.as_slice() == ["--help"] {
        println!(
            "Local Media Gallery Full installer. Launch this file to install or repair at system scope. Administrator authorization is requested when needed. All application/runtime payloads are bundled; installation never downloads packages. --inspect prints the embedded package inventory. --recover resumes the retained update; --rollback restores its predecessor; --remove removes the managed application while retaining galleries, settings, shared runtimes and recovery history. No JSON or directory operands are needed."
        );
        return Ok(());
    }
    if !arguments.is_empty()
        && arguments.as_slice() != ["--install"]
        && arguments.as_slice() != ["--inspect"]
        && arguments.as_slice() != ["--recover"]
        && arguments.as_slice() != ["--rollback"]
        && arguments.as_slice() != ["--remove"]
        && arguments.as_slice() != ["--__maintain"]
    {
        return Err("Launch without operands to install; use --help for usage".into());
    }
    let executable = std::env::current_exe().map_err(|e| e.to_string())?;
    let mut file = File::open(&executable).map_err(|e| e.to_string())?;
    let m = manifest(&mut file)?;
    if arguments.as_slice() == ["--inspect"] {
        println!("{}", serde_json::to_string(&m).map_err(|e| e.to_string())?);
        return Ok(());
    }
    #[cfg(target_os = "linux")]
    return install(
        &executable,
        &mut file,
        &m,
        arguments
            .first()
            .and_then(|v| v.to_str())
            .unwrap_or("--install"),
    );
    #[cfg(not(target_os = "linux"))]
    Err("System installation is available only on Ubuntu 24.04 x86_64".into())
}

fn main() {
    if std::env::args_os()
        .nth(1)
        .is_some_and(|s| s == "--__native-worker")
    {
        let result = std::env::args_os()
            .nth(2)
            .ok_or_else(|| "Missing native worker operand".to_string())
            .and_then(|p| gallery_update::run_native_worker(std::path::Path::new(&p)));
        match result {
            Ok(code) => std::process::exit(code),
            Err(error) => {
                eprintln!("{error}");
                std::process::exit(2);
            }
        }
    }
    if let Err(error) = run() {
        eprintln!("installation_unavailable: {error}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn sample() -> Manifest {
        Manifest {
            format_version: 1,
            product: "local-media-gallery".into(),
            version: "0.2.0".into(),
            os: "linux".into(),
            arch: "x86_64".into(),
            generation: "a".repeat(32),
            source: serde_json::json!({"sha256":"b".repeat(64),"files":1}),
            revision: "c".repeat(40),
            native_bytes: 4,
            application_descriptor: serde_json::json!({"version":"0.2.0","generation":"a".repeat(32),"source":{"sha256":"b".repeat(64)}}),
            predecessor: None,
            packages: vec![Package {
                name: "application.deb".into(),
                package: "local-media-gallery".into(),
                version: "0.2.0".into(),
                architecture: "amd64".into(),
                role: "application".into(),
                source: serde_json::json!({"package":"local-media-gallery","version":"0.2.0"}),
                offset: 4,
                bytes: 3,
                sha256: hex::encode(Sha256::digest(b"deb")),
            }],
        }
    }
    #[test]
    fn refuses_paths_duplicate_identity_overlap_and_extent_changes() {
        validate_manifest(&sample(), 7).unwrap();
        for change in 0..6 {
            let mut m = sample();
            match change {
                0 => m.packages[0].name = "../outside.deb".into(),
                1 => m.packages[0].offset = 3,
                2 => m.packages[0].bytes = u64::MAX,
                3 => m.packages[0].architecture = "arm64".into(),
                4 => m.packages[0].sha256 = "z".repeat(64),
                _ => m.packages[0].role = "runtime".into(),
            };
            assert!(validate_manifest(&m, 7).is_err());
        }
    }
    #[test]
    fn verifies_actual_embedded_bytes_before_any_package_execution() {
        let mut input = tempfile::tempfile().unwrap();
        input.write_all(b"ELF!bad").unwrap();
        let m = sample();
        let destination = tempfile::tempdir().unwrap();
        assert!(extract(&mut input, &m, destination.path()).is_err());
        let mut input = tempfile::tempfile().unwrap();
        input.write_all(b"ELF!deb").unwrap();
        let destination = tempfile::tempdir().unwrap();
        assert_eq!(
            std::fs::read(&extract(&mut input, &m, destination.path()).unwrap()[0]).unwrap(),
            b"deb"
        );
    }
    #[test]
    fn refuses_missing_or_truncated_footer() {
        let mut file = tempfile::tempfile().unwrap();
        file.write_all(b"ELF!truncated payload").unwrap();
        assert!(manifest(&mut file).is_err());
    }
}
