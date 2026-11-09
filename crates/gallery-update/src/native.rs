// SPDX-License-Identifier: Apache-2.0
use super::*;
fn artifact_path(base: &Path, name: &str) -> PathBuf {
    base.join(format!(
        "{name}-package.{}",
        if cfg!(windows) { "msi" } else { "deb" }
    ))
}
fn artifact_record(a: &Artifact) -> FileRecord {
    FileRecord {
        path: "package".into(),
        bytes: a.bytes.clone(),
        sha256: a.sha256.clone(),
        mode: 644,
    }
}
pub(super) fn verify_retained(c: &Candidate, base: &Path, name: &str) -> Result<()> {
    if let Some(a) = c.artifact() {
        verify_file(&artifact_path(base, name), &artifact_record(a))?
    }
    Ok(())
}
pub(super) fn retain(c: &Candidate, base: &Path, name: &str, destination: &Path) -> Result<()> {
    let a = c.artifact().ok_or("Missing package artifact")?;
    let source = Path::new(&a.path);
    if !source.is_absolute() {
        return Err("Read native descriptors from their package location before preparing".into());
    }
    let r = artifact_record(a);
    physical(source)?;
    let bytes = read_bounded(source, 1024 * 1024 * 1024)?;
    if bytes.len().to_string() != a.bytes || hash(&bytes) != a.sha256 {
        return Err("Supplied native artifact changed".into());
    }
    #[cfg(windows)]
    {
        let mut output = gallery_windows_package::private::create_file(&artifact_path(base, name))?;
        io(output.write_all(&bytes))?;
        io(output.sync_all())?;
    }
    #[cfg(not(windows))]
    io(fs::write(artifact_path(base, name), &bytes))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        io(fs::set_permissions(
            artifact_path(base, name),
            fs::Permissions::from_mode(0o644),
        ))?;
    }
    // FlushFileBuffers requires a writable handle on Windows. These are our
    // newly retained private bytes, not the supplied installer handle.
    io(io(OpenOptions::new()
        .read(true)
        .write(true)
        .open(artifact_path(base, name)))?
    .sync_all())?;
    verify_file(&artifact_path(base, name), &r)?;

    #[cfg(windows)]
    if let Native::WindowsMsi {
        product_code,
        package_code,
        scope,
        ..
    } = &c.native
    {
        let actual = gallery_windows_package::native::inspect_package(&artifact_path(base, name))?;
        if !actual.0.eq_ignore_ascii_case(product_code)
            || !actual.1.eq_ignore_ascii_case(package_code)
            || (actual.3 != "dual" && actual.3 != *scope)
        {
            return Err("Native MSI ProductCode/PackageCode differs from descriptor".into());
        }
    }
    match &c.native {
        Native::LinuxDeb { .. } => {
            let package = artifact_path(base, name);
            let out = command(
                Path::new("/usr/bin/dpkg-deb"),
                &[
                    "--field".into(),
                    package.to_string_lossy().into(),
                    "Package".into(),
                    "Version".into(),
                    "Architecture".into(),
                ],
            )?;
            let text = String::from_utf8_lossy(&out.stdout);
            if !out.status.success()
                || !text.contains("Package: local-media-gallery\n")
                || !text.contains(&format!("Version: {}\n", c.version))
                || !text.contains("Architecture: amd64\n")
            {
                return Err("Debian archive identity differs".into());
            }
            let out = command(
                Path::new("/usr/bin/dpkg-deb"),
                &[
                    "--extract".into(),
                    package.to_string_lossy().into(),
                    destination.to_string_lossy().into(),
                ],
            )?;
            if !out.status.success() {
                return Err("Native Debian extraction failed before replacement".into());
            }
        }
        Native::WindowsMsi { .. } => {
            #[cfg(windows)]
            {
                let image = AdministrativeImage::create(base, c)?;
                let extract = &image.path;
                gallery_windows_package::private::child_directory(extract)?;
                let out = msi(
                    &artifact_path(base, name),
                    a,
                    "/a",
                    Some(extract),
                    None,
                    false,
                    &base.join(format!("{name}-extract.log")),
                )?;
                if !out.status.success() {
                    return Err(format!(
                        "{}; incomplete administrative image retained at {}",
                        msi_failure(
                            "administrative extraction before replacement",
                            &out,
                            &base.join(format!("{name}-extract.log")),
                        ),
                        extract.display()
                    ));
                }
                let mut roots = vec![];
                let mut namespace = gallery_windows_package::private::PhysicalNamespace::default();
                find_binary(extract, &c.binary, &mut roots, &mut namespace)?;
                let src = roots
                    .into_iter()
                    .find(|p| c.verify(p).is_ok())
                    .ok_or("Extracted MSI does not match complete expected payload")?;
                exact_msi_image(c, extract, &src)?;
                copy_retained_inventory(c, &src, destination)?;
                drop(namespace);
                cleanup_administrative(extract)?;
            }
            #[cfg(not(windows))]
            return Err("Windows MSI requires Windows".into());
        }
        Native::Direct => unreachable!(),
    };
    c.verify(destination)?;
    #[cfg(windows)]
    if matches!(&c.native, Native::WindowsMsi { .. }) {
        dual_msi_identity(c, destination)?;
    }
    exact_files(c, destination)
}
#[cfg(windows)]
pub(super) fn dual_msi_identity(candidate: &Candidate, payload_directory: &Path) -> Result<bool> {
    let Native::WindowsMsi {
        product_code,
        package_code,
        scope,
        ..
    } = &candidate.native
    else {
        return Err("MSI identity requires a Windows installer candidate".into());
    };
    let payload = read_bounded(&payload_directory.join("payload.json"), 8 * 1024 * 1024)?;
    let machine = scope == "machine";
    let expected_package =
        gallery_windows_package::native::package_code(product_code, machine, &payload)?;
    if !expected_package.eq_ignore_ascii_case(package_code) {
        return Err("MSI package identity differs from its verified payload".into());
    }
    Ok(
        product_code.eq_ignore_ascii_case(&gallery_windows_package::native::dual_product_code(
            &payload,
        )),
    )
}

// MSI administrative extraction still enforces MAX_PATH. Durable recovery roots
// can be deeper, so only this disposable, untrusted image uses a short path.
#[cfg(windows)]
struct AdministrativeImage {
    root: PathBuf,
    path: PathBuf,
    stage: Option<gallery_windows_package::scratch::Stage>,
    pins: Vec<fs::File>,
}
#[cfg(windows)]
impl AdministrativeImage {
    fn create(storage: &Path, candidate: &Candidate) -> Result<Self> {
        use std::os::windows::ffi::OsStrExt;
        let machine = gallery_windows_package::private::context(storage)?;
        let nonce = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|error| error.to_string())?
            .as_nanos();
        let root = std::env::temp_dir().join(format!(".lmg-a-{:x}-{nonce:x}", std::process::id()));
        let path = root.join("s").join("a");
        let longest = candidate
            .files
            .iter()
            .map(|file| file.path.encode_utf16().count())
            .max()
            .unwrap_or(0);
        // Leave room for the MSI's product-directory prefix and terminating NUL.
        // This guards our temporary path, not the owner's installation choice.
        if !root.is_absolute() || path.as_os_str().encode_wide().count() + longest + 64 >= 260 {
            return Err(
                "MSI administrative extraction needs a shorter temporary directory (TEMP)".into(),
            );
        }
        gallery_windows_package::private::ensure_storage_at(&root, machine)?;
        let pins = gallery_windows_package::private::validate_directory(&root, machine)?;
        let mut image = Self {
            root,
            path,
            stage: None,
            pins,
        };
        image.stage = Some(gallery_windows_package::scratch::Stage::create(
            storage,
            &image.root.join("s"),
            "transaction",
            Default::default(),
            Default::default(),
            machine,
        )?);
        // No image subtree is declared reclaimable. A failed/partial native
        // extraction must be retained; only exact_msi_image authorizes cleanup.
        Ok(image)
    }
}
#[cfg(windows)]
impl Drop for AdministrativeImage {
    fn drop(&mut self) {
        drop(self.stage.take());
        self.pins.clear();
        // Never recurse through unknown or partially extracted content.
        let _ = fs::remove_dir(&self.root);
    }
}

#[cfg(windows)]
fn cleanup_administrative(root: &Path) -> Result<()> {
    // Called only after exact_msi_image and retained inventory verification.
    // Pin every parent, inspect every leaf before deleting any byte, then remove empty directories.
    fn visit(
        at: &Path,
        files: &mut Vec<PathBuf>,
        dirs: &mut Vec<PathBuf>,
        pins: &mut gallery_windows_package::private::PhysicalNamespace,
    ) -> Result<()> {
        pins.pin(at)?;
        for entry in io(fs::read_dir(at))? {
            let entry = io(entry)?;
            let path = entry.path();
            physical_in(&path, pins)?;
            if io(entry.file_type())?.is_dir() {
                visit(&path, files, dirs, pins)?;
            } else {
                drop(gallery_windows_package::private::pin_file(&path)?);
                files.push(path);
            }
        }
        dirs.push(at.into());
        Ok(())
    }
    let mut files = vec![];
    let mut dirs = vec![];
    let mut pins = gallery_windows_package::private::PhysicalNamespace::default();
    visit(root, &mut files, &mut dirs, &mut pins)?;
    for file in files {
        io(fs::remove_file(file))?;
    }
    drop(pins);
    for dir in dirs {
        io(fs::remove_dir(dir))?;
    }
    Ok(())
}
#[cfg(windows)]
fn find_binary(
    base: &Path,
    binary: &str,
    found: &mut Vec<PathBuf>,
    namespace: &mut gallery_windows_package::private::PhysicalNamespace,
) -> Result<()> {
    namespace.pin(base)?;
    if base.join(binary).is_file() {
        found.push(base.to_path_buf())
    }
    for e in io(fs::read_dir(base))? {
        let e = io(e)?;
        if io(e.file_type())?.is_dir() {
            find_binary(&e.path(), binary, found, namespace)?
        }
    }
    Ok(())
}
#[cfg(windows)]
fn system_msi() -> Result<PathBuf> {
    windows_system_tool("msiexec.exe")
}
#[cfg(windows)]
fn msi(
    package: &Path,
    expected: &Artifact,
    action: &str,
    directory: Option<&Path>,
    journal: Option<&Path>,
    reinstall: bool,
    log: &Path,
) -> Result<std::process::Output> {
    let _input = gallery_windows_package::open_verified_input(
        package,
        &gallery_windows_package::FileRecord {
            path: package
                .file_name()
                .ok_or("Missing MSI name")?
                .to_str()
                .ok_or("Invalid MSI name")?
                .into(),
            bytes: expected.bytes.clone(),
            sha256: expected.sha256.clone(),
        },
    )?;
    // MSI writes into an existing protected log so abandoned-stage reclamation can validate it.
    drop(gallery_windows_package::private::create_file(log)?);
    let mut c = Command::new(system_msi()?);
    use std::os::windows::process::CommandExt;
    c.args([
        std::ffi::OsStr::new(action),
        package.as_os_str(),
        std::ffi::OsStr::new("/qn"),
        std::ffi::OsStr::new("/norestart"),
        std::ffi::OsStr::new("/L*v"),
        log.as_os_str(),
    ]);
    if let Some(p) = directory {
        let property = if action == "/a" {
            "TARGETDIR"
        } else {
            "INSTALLDIR"
        };
        let value = p.to_str().ok_or("Non UTF8 MSI destination")?;
        if value.contains(['\"', '\n', '\r']) {
            return Err("Invalid MSI destination".into());
        }
        c.raw_arg(format!("{property}=\"{value}\""));
    }
    if let Some(p) = journal {
        let value = p.to_str().ok_or("Invalid journal path")?;
        if value.contains('\"') {
            return Err("Invalid journal path".into());
        }
        c.raw_arg(format!("LMG_RECOVERY=\"{value}\""));
    }
    if reinstall {
        c.args(["REINSTALL=ALL", "REINSTALLMODE=vamus"]);
    }
    c.creation_flags(0x08000000)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    process::capture(
        &mut c,
        Some(
            &log.parent()
                .ok_or("No log parent")?
                .join("native-process.json"),
        ),
    )
}

#[cfg(windows)]
fn msi_failure(operation: &str, output: &std::process::Output, log: &Path) -> String {
    use std::io::{Read, Seek, SeekFrom};
    let excerpt = (|| -> std::io::Result<String> {
        let mut file = fs::File::open(log)?;
        let length = file.metadata()?.len();
        let mut prefix = [0u8; 2];
        let count = file.read(&mut prefix)?;
        let utf16 = count == 2 && prefix == [0xff, 0xfe];
        file.seek(SeekFrom::Start(0))?;
        let mut initial = Vec::new();
        std::io::Read::by_ref(&mut file)
            .take(8 * 1024 * 1024)
            .read_to_end(&mut initial)?;
        let initial = if utf16 {
            String::from_utf16_lossy(
                &initial
                    .chunks_exact(2)
                    .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
                    .collect::<Vec<_>>(),
            )
        } else {
            String::from_utf8_lossy(&initial).into_owned()
        };
        let messages = initial
            .lines()
            .filter(|line| {
                line.contains("Local Media Gallery:")
                    || line.contains("Error ")
                    || line.contains("Return value 3")
            })
            .take(32)
            .map(|line| line.chars().take(1024).collect::<String>())
            .collect::<Vec<_>>()
            .join("\n");
        let mut start = length.saturating_sub(32768);
        if utf16 {
            start -= start % 2;
        }
        file.seek(SeekFrom::Start(start))?;
        let mut bytes = Vec::new();
        file.take(32768).read_to_end(&mut bytes)?;
        let tail = if utf16 {
            String::from_utf16_lossy(
                &bytes
                    .chunks_exact(2)
                    .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
                    .collect::<Vec<_>>(),
            )
        } else {
            String::from_utf8_lossy(&bytes).into_owned()
        };
        Ok(format!(
            "Native failure messages (first 8 MiB scanned):\n{messages}\nFinal log excerpt:\n{tail}"
        ))
    })()
    .unwrap_or_else(|error| format!("Native log could not be read: {error}"));
    format!(
        "Native MSI {operation} failed ({}). Native log {} (bounded final excerpt):\n{}\nstdout: {}\nstderr: {}",
        output.status,
        log.display(),
        excerpt,
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

#[cfg(target_os = "linux")]
fn linux_status() -> Result<String> {
    let out = command(
        Path::new("/usr/bin/dpkg-query"),
        &[
            "-W".into(),
            "--showformat=\x24{db:Status-Status}|\x24{Version}|\x24{Architecture}".into(),
            "local-media-gallery".into(),
        ],
    )?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).into())
    } else if out.status.code() == Some(1) {
        Ok("not-installed".into())
    } else {
        Err("Native package registration query failed".into())
    }
}
pub(super) fn verified(c: &Candidate, directory: &Path) -> Result<()> {
    c.verify(directory)?;
    match &c.native {
        Native::Direct => {}
        Native::WindowsMsi {
            scope,
            product_code,
            package_code,
            ..
        } => {
            #[cfg(windows)]
            {
                dual_msi_identity(c, directory)?;
                if gallery_windows_package::native::registered_product(scope == "machine")?
                    .as_deref()
                    != Some(product_code)
                {
                    return Err("Installed MSI ProductCode differs from selected candidate".into());
                }
                let payload = io(fs::read_to_string(directory.join("payload.json")))?;
                gallery_windows_package::native::verify_registered_payload(
                    directory,
                    scope == "machine",
                    &payload,
                    package_code,
                )?;
            }
            #[cfg(not(windows))]
            {
                let _ = (scope, product_code, package_code);
                return Err("MSI requires Windows".into());
            }
        }
        Native::LinuxDeb { .. } => {
            #[cfg(target_os = "linux")]
            {
                if linux_status()? != format!("installed|{}|amd64", c.version) {
                    return Err("Debian package is not configured at selected identity".into());
                }
                let paths = c
                    .files
                    .iter()
                    .map(|f| format!("/{}", f.path))
                    .collect::<Vec<_>>();
                let mut args = vec!["-S".into(), "--".into()];
                args.extend(paths);
                let out = command(Path::new("/usr/bin/dpkg-query"), &args)?;
                if !out.status.success()
                    || String::from_utf8_lossy(&out.stdout).lines().any(|s| {
                        !s.starts_with("local-media-gallery: /")
                            && !s.starts_with("local-media-gallery:amd64: /")
                    })
                {
                    return Err("Foreign package ownership/diversion".into());
                }
            }
            #[cfg(not(target_os = "linux"))]
            return Err("Debian packages require Linux".into());
        }
    }
    identity(c, directory)
}
pub(super) fn identity(c: &Candidate, directory: &Path) -> Result<()> {
    let out = command(
        &directory.join(&c.binary),
        &["--version".into(), "--json".into()],
    )?;
    let v: serde_json::Value = serde_json::from_slice(&out.stdout)
        .map_err(|_| "Installed native identity did not return JSON")?;
    if !out.status.success()
        || v["product"] != c.product
        || v["version"] != c.version
        || v["edition"] != c.edition
        || v["os"] != c.os
        || v["arch"] != c.arch
        || v["data"]["buildProfile"] != "release"
    {
        return Err("Installed ordinary executable identity differs".into());
    }
    Ok(())
}
#[cfg(windows)]
fn compatible_reinstall(
    base: &Path,
    current_name: &str,
    selected_name: &str,
    current: &Candidate,
    selected: &Candidate,
    directory: &Path,
) -> Result<bool> {
    let (
        Native::WindowsMsi {
            product_code: old_product,
            scope: old_scope,
            ..
        },
        Native::WindowsMsi {
            product_code: new_product,
            scope: new_scope,
            ..
        },
    ) = (&current.native, &selected.native)
    else {
        return Ok(false);
    };
    if current.version != selected.version
        || !old_product.eq_ignore_ascii_case(new_product)
        || old_scope != new_scope
    {
        return Ok(false);
    }
    let old_path = artifact_path(base, current_name);
    let new_path = artifact_path(base, selected_name);
    let lock = |file: &Path, c: &Candidate| {
        let a = c.artifact().ok_or("Missing native reinstall artifact")?;
        gallery_windows_package::open_verified_input(
            file,
            &gallery_windows_package::FileRecord {
                path: "reinstall.msi".into(),
                bytes: a.bytes.clone(),
                sha256: a.sha256.clone(),
            },
        )
    };
    let _old = lock(&old_path, current)?;
    let _new = lock(&new_path, selected)?;
    if !gallery_windows_package::native::inspect_package(&old_path)?.2
        || !gallery_windows_package::native::inspect_package(&new_path)?.2
    {
        return Ok(false);
    }
    match (
        gallery_windows_package::native::reinstall_layout(&old_path),
        gallery_windows_package::native::reinstall_layout(&new_path),
    ) {
        (Ok(old), Ok(new)) => {
            Ok(old == new && grouped_reinstall_value(selected, &new, directory).is_ok())
        }
        _ => {
            eprintln!(
                "MSI layout cannot be proven unchanged; retaining native remove/install replacement"
            );
            Ok(false)
        }
    }
}

#[cfg(windows)]
fn repair_legacy_if_needed(op: &Transaction, side: &str) -> Result<()> {
    let source = if side == "prior" {
        &op.journal.prior
    } else {
        &op.journal.next
    };
    let Native::WindowsMsi {
        scope,
        product_code,
        ..
    } = &source.native
    else {
        return Ok(());
    };
    if scope != "machine" || !gallery_windows_package::native::is_legacy_product(product_code, true)
    {
        return Ok(());
    }
    if !gallery_windows_package::native::legacy_lookup_needs_patch(&op.journal.directory, true)? {
        return Ok(());
    }
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let log = op.base.join(format!("legacy-patch-{side}-{nonce:x}.log"));
    let output = worker::execute(op, side, "legacy-patch", true, &log)?;
    if !matches!(output.status.code(), Some(0 | 3010)) {
        return Err(msi_failure("legacy maintenance patch", &output, &log));
    }
    verified(source, &op.journal.directory)?;
    let terminal: serde_json::Value =
        serde_json::from_slice(&read_bounded(&op.base.join("native-process.json"), 16384)?)
            .map_err(|e| e.to_string())?;
    let job = terminal["job"]
        .as_str()
        .ok_or("Missing completed patch job")?;
    let key = hash(job.as_bytes());
    let input: serde_json::Value = serde_json::from_slice(&read_bounded(
        &op.base
            .join(format!("legacy-patch-input-{}.json", &key[..24])),
        16384,
    )?)
    .map_err(|e| e.to_string())?;
    if input["binding"] != op.journal.binding || input["job"] != job || terminal["terminal"] != true
    {
        return Err("Legacy patch terminal evidence differs".into());
    }
    durable_json(
        &op.base
            .join(format!("legacy-patch-completed-{side}-{nonce:x}.json")),
        &serde_json::json!({"kind":"verified-legacy-msi-repair","binding":op.journal.binding,"side":side,"version":source.version,"input":input,"native":terminal,"exitCode":output.status.code(),"log":log}),
    )?;
    Ok(())
}

#[cfg(any(windows, target_os = "linux"))]
pub(super) fn apply(op: &mut Transaction, prior: bool) -> Result<Outcome> {
    let selected = if prior {
        op.journal.prior.clone()
    } else {
        op.journal.next.clone()
    };
    process::active(&op.base.join("native-process.json"))?;
    op.validate_union()?;
    let already =
        verified(&selected, &op.journal.directory).is_ok() && op.exclusive_selected(&selected)?;
    if already {
        op.journal.target_prior = prior;
        #[cfg(windows)]
        if let Native::WindowsMsi {
            scope,
            product_code,
            ..
        } = &selected.native
            && scope == "machine"
            && gallery_windows_package::native::is_legacy_product(product_code, true)
            && gallery_windows_package::native::legacy_lookup_needs_patch(
                &op.journal.directory,
                true,
            )?
        {
            op.journal.phase = if prior { "restoring" } else { "applying" }.into();
            op.save()?;
            repair_legacy_if_needed(op, if prior { "prior" } else { "next" })?;
        }
        op.journal.phase = if prior { "restored" } else { "committed" }.into();
        op.save()?;
        cleanup(op)?;
        return Ok(op.outcome(
            if prior { "restored" } else { "already-current" },
            &selected,
        ));
    }
    #[cfg(windows)]
    if let Native::WindowsMsi { scope, .. } = &selected.native {
        let legacy = !gallery_windows_package::native::inspect_package(&artifact_path(
            &op.base,
            if prior { "prior" } else { "next" },
        ))?
        .2;
        if legacy
            && let Some(current) =
                gallery_windows_package::native::registered_package(scope == "machine")?
        {
            let active=[&op.journal.prior,&op.journal.next].into_iter().find(|c|matches!(&c.native,Native::WindowsMsi{package_code,..}if package_code.eq_ignore_ascii_case(&current))).ok_or("Foreign active MSI registration")?;
            if private_foreign(active, &op.journal.directory)? {
                return Err("Unsupported legacy MSI rollback over retained foreign content; current installation unchanged".into());
            }
        }
    }
    op.journal.target_prior = prior;
    op.journal.phase = if prior { "restoring" } else { "applying" }.into();
    op.save()?;
    match &selected.native {
        Native::WindowsMsi { scope, .. } => {
            #[cfg(windows)]
            {
                let machine = scope == "machine";
                let current = gallery_windows_package::native::registered_package(machine)?;
                if let Some(current) = current {
                    let which=match [&op.journal.prior,&op.journal.next].into_iter().enumerate().find(|(_,c)|matches!(&c.native,Native::WindowsMsi{package_code,..}if package_code==&current)){Some((i,c))=>(i,c.clone()),None=>return Err("Foreign scoped MSI registration".into())};
                    let name = if which.0 == 0 { "prior" } else { "next" };
                    let same = which.1 == selected;
                    let selected_name = if prior { "prior" } else { "next" };
                    let reinstall = compatible_reinstall(
                        &op.base,
                        name,
                        selected_name,
                        &which.1,
                        &selected,
                        &op.journal.directory,
                    )?;
                    if !same {
                        verified(&which.1, &op.journal.directory)?;
                    }
                    if !reinstall {
                        repair_legacy_if_needed(op, name)?;
                        let out = worker::execute(
                            op,
                            name,
                            "remove",
                            false,
                            &op.base.join("remove.log"),
                        )?;
                        if !matches!(out.status.code(), Some(0 | 3010)) {
                            return Err(msi_failure("removal", &out, &op.base.join("remove.log")));
                        }
                        if gallery_windows_package::native::registered_package(machine)?.is_some() {
                            return Err("Native removal left registration".into());
                        }
                        for file in &which.1.files {
                            if op.journal.directory.join(&file.path).exists() {
                                return Err(format!(
                                    "Native removal left owned file {}; retain recovery inputs",
                                    file.path
                                ));
                            }
                        }
                    }
                }
                let same = gallery_windows_package::native::registered_package(machine)?.is_some();
                let out = worker::execute(
                    op,
                    if prior { "prior" } else { "next" },
                    "install",
                    same,
                    &op.base.join("install.log"),
                )?;
                if !matches!(out.status.code(), Some(0 | 3010)) {
                    return Err(msi_failure(
                        "installation",
                        &out,
                        &op.base.join("install.log"),
                    ));
                }
            }
            #[cfg(not(windows))]
            {
                let _ = scope;
                return Err("MSI requires Windows".into());
            }
        }
        Native::LinuxDeb { .. } => {
            #[cfg(target_os = "linux")]
            {
                unsafe extern "C" {
                    fn geteuid() -> u32;
                }
                if unsafe { geteuid() } != 0 {
                    return Err("Full Debian replacement requires prior root elevation".into());
                }
                let legacy = !deb_protocol(&artifact_path(&op.base, "prior"))?
                    || !deb_protocol(&artifact_path(&op.base, "next"))?;
                if legacy {
                    let current = [("prior", &op.journal.prior), ("next", &op.journal.next)]
                        .into_iter()
                        .find(|(_, c)| c.verify(&op.journal.directory).is_ok());
                    if let Some((side, c)) = current {
                        if private_foreign(c, &op.journal.directory)? {
                            return Err("Unsupported legacy Debian rollback with foreign application-directory content; current installation retained before removal".into());
                        }
                        let out = worker::execute(
                            op,
                            side,
                            "remove",
                            false,
                            &op.base.join("legacy-remove.log"),
                        )?;
                        io(fs::write(
                            op.base.join("legacy-remove.log"),
                            [out.stdout.as_slice(), out.stderr.as_slice()].concat(),
                        ))?;
                        if !out.status.success() {
                            return Err("Legacy native removal failed; retain the transaction and inspect before recovery".into());
                        }
                    } else if !matches!(
                        linux_status()?.split('|').next(),
                        Some("not-installed" | "config-files")
                    ) {
                        return Err("incomplete: Legacy package has partial owned bytes; retain both archives and inspect its native state before recovery".into());
                    }
                }
                linux_authority(&op.journal)?;
                let package = artifact_path(&op.base, if prior { "prior" } else { "next" });
                for args in [
                    vec![
                        String::from("--unpack"),
                        package.to_string_lossy().into_owned(),
                    ],
                    vec![
                        String::from("--configure"),
                        String::from("local-media-gallery"),
                    ],
                ] {
                    let out = worker::execute(
                        op,
                        if prior { "prior" } else { "next" },
                        if args[0] == "--unpack" {
                            "unpack"
                        } else {
                            "configure"
                        },
                        false,
                        &op.base.join("dpkg.log"),
                    )?;
                    io(fs::write(
                        op.base.join(if args[0] == "--unpack" {
                            "unpack.log"
                        } else {
                            "configure.log"
                        }),
                        [out.stdout.as_slice(), out.stderr.as_slice()].concat(),
                    ))?;
                    if !out.status.success() {
                        return Err("Native dpkg operation failed; inspect retained transaction log and recover/rollback".into());
                    }
                    op.journal.phase = if args[0] == "--unpack" {
                        "unpacked"
                    } else {
                        "activated"
                    }
                    .into();
                    op.save()?;
                }
            }
            #[cfg(not(target_os = "linux"))]
            return Err("Debian requires Linux".into());
        }
        Native::Direct => unreachable!(),
    }
    #[cfg(windows)]
    repair_legacy_if_needed(op, if prior { "prior" } else { "next" })?;
    op.journal.phase = "activated".into();
    op.save()?;
    verified(&selected, &op.journal.directory)?;
    if !op.exclusive_selected(&selected)? {
        return Err("Obsolete owned files remain after native replacement".into());
    }
    op.journal.phase = if prior { "restored" } else { "committed" }.into();
    op.save()?;
    cleanup(op)?;
    Ok(op.outcome(if prior { "restored" } else { "complete" }, &selected))
}
#[cfg(target_os = "linux")]
pub(super) fn linux_authority(journal: &Journal) -> Result<()> {
    use std::os::unix::fs::{MetadataExt, PermissionsExt};
    let base = Path::new("/run/local-media-gallery-update");
    physical(base)?;
    if !base.exists() {
        io(fs::create_dir(base))?;
        io(fs::set_permissions(base, fs::Permissions::from_mode(0o700)))?
    }
    let m = io(fs::metadata(base))?;
    if m.uid() != 0 || m.gid() != 0 || m.permissions().mode() & 0o777 != 0o700 {
        return Err("Foreign native recovery authority directory".into());
    }
    let entries = |c: &Candidate| {
        c.files
            .iter()
            .map(|f| format!("{}|{}|{}|/{}\n", f.sha256, f.mode, f.bytes, f.path))
            .collect::<String>()
    };
    let old = entries(&journal.prior);
    let next = entries(&journal.next);
    let text = format!(
        "LMG1|{}|{}|{}|{}|{}\n{}{}",
        hash(old.as_bytes()),
        hash(next.as_bytes()),
        std::process::id(),
        journal.prior.files.len(),
        journal.next.files.len(),
        old,
        next
    );
    let p = base.join("authority");
    physical(&p)?;
    let mut f = io(tempfile::NamedTempFile::new_in(base))?;
    io(f.write_all(text.as_bytes()))?;
    io(f.as_file()
        .set_permissions(fs::Permissions::from_mode(0o600)))?;
    io(f.as_file().sync_all())?;
    f.persist(p).map_err(|e| e.to_string())?;
    sync_directory(base)
}

#[cfg(any(windows, target_os = "linux"))]
fn cleanup(op: &Transaction) -> Result<()> {
    if !matches!(op.journal.prior.native, Native::Direct) {
        worker::cleanup(op)?;
    }
    #[cfg(target_os = "linux")]
    if matches!(op.journal.prior.native, Native::LinuxDeb { .. }) {
        let file = Path::new("/run/local-media-gallery-update/authority");
        physical(file)?;
        if file.exists() {
            let entries = |c: &Candidate| {
                c.files
                    .iter()
                    .map(|f| format!("{}|{}|{}|/{}\n", f.sha256, f.mode, f.bytes, f.path))
                    .collect::<String>()
            };
            let expected = format!(
                "LMG1|{}|{}|",
                hash(entries(&op.journal.prior).as_bytes()),
                hash(entries(&op.journal.next).as_bytes())
            );
            if !read_bounded(file, 8 * 1024 * 1024)?.starts_with(expected.as_bytes()) {
                return Err("Foreign native recovery authority retained".into());
            }
            io(fs::remove_file(file))?;
        }
    }
    let _ = op;
    Ok(())
}

#[cfg(not(any(windows, target_os = "linux")))]
pub(super) fn apply(_op: &mut Transaction, _prior: bool) -> Result<Outcome> {
    Err("This platform uses direct receipt-aware replacement".into())
}

fn exact_files(c: &Candidate, base: &Path) -> Result<()> {
    fn walk(
        base: &Path,
        directory: &Path,
        names: &mut BTreeSet<String>,
        #[cfg(windows)] namespace: &mut gallery_windows_package::private::PhysicalNamespace,
    ) -> Result<()> {
        for entry in io(fs::read_dir(directory))? {
            let entry = io(entry)?;
            #[cfg(windows)]
            physical_in(&entry.path(), namespace)?;
            #[cfg(not(windows))]
            physical(&entry.path())?;
            let kind = io(entry.file_type())?;
            if kind.is_dir() {
                walk(
                    base,
                    &entry.path(),
                    names,
                    #[cfg(windows)]
                    namespace,
                )?
            } else if kind.is_file() {
                names.insert(
                    entry
                        .path()
                        .strip_prefix(base)
                        .map_err(|e| e.to_string())?
                        .to_str()
                        .ok_or("Non Unicode native archive path")?
                        .replace('\\', "/"),
                );
            } else {
                return Err("Special native archive entry".into());
            }
        }
        Ok(())
    }
    let mut actual = BTreeSet::new();
    #[cfg(windows)]
    let mut namespace = gallery_windows_package::private::PhysicalNamespace::default();
    walk(
        base,
        base,
        &mut actual,
        #[cfg(windows)]
        &mut namespace,
    )?;
    let expected = c
        .files
        .iter()
        .map(|f| f.path.clone())
        .collect::<BTreeSet<_>>();
    if actual != expected {
        return Err("Native archive has missing/additional owned files".into());
    }
    Ok(())
}

#[cfg(windows)]
fn exact_msi_image(c: &Candidate, base: &Path, payload: &Path) -> Result<()> {
    fn walk(
        base: &Path,
        payload: &Path,
        dir: &Path,
        files: &BTreeSet<String>,
        packages: &mut usize,
        namespace: &mut gallery_windows_package::private::PhysicalNamespace,
    ) -> Result<()> {
        for e in io(fs::read_dir(dir))? {
            let e = io(e)?;
            physical_in(&e.path(), namespace)?;
            let kind = io(e.file_type())?;
            if kind.is_dir() {
                walk(base, payload, &e.path(), files, packages, namespace)?
            } else if kind.is_file() {
                if let Ok(relative) = e.path().strip_prefix(payload) {
                    let name = relative
                        .to_str()
                        .ok_or("Invalid native path")?
                        .replace('\\', "/");
                    if !files.contains(&name) {
                        return Err("MSI administrative image contains extra payload files".into());
                    }
                } else if e.path().parent() == Some(base)
                    && e.path()
                        .extension()
                        .is_some_and(|s| s.eq_ignore_ascii_case("msi"))
                {
                    *packages += 1;
                } else {
                    return Err(
                        "MSI administrative image writes outside the declared payload".into(),
                    );
                }
            } else {
                return Err("Special administrative-image entry".into());
            }
        }
        Ok(())
    }
    let files = c.files.iter().map(|f| f.path.clone()).collect();
    let mut packages = 0;
    let mut namespace = gallery_windows_package::private::PhysicalNamespace::default();
    walk(base, payload, base, &files, &mut packages, &mut namespace)?;
    if packages != 1 {
        return Err("Expected one native administrative MSI record".into());
    }
    Ok(())
}

#[cfg(target_os = "linux")]
fn deb_protocol(package: &Path) -> Result<bool> {
    let out = command(
        Path::new("/usr/bin/dpkg-deb"),
        &[
            "--field".into(),
            package.to_string_lossy().into(),
            "X-Local-Media-Gallery-Recovery".into(),
        ],
    )?;
    if !out.status.success() {
        return Err("Cannot read retained Debian recovery protocol".into());
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim() == "1")
}
#[cfg(any(windows, target_os = "linux"))]
fn private_foreign(c: &Candidate, directory: &Path) -> Result<bool> {
    let base = if c.os == "linux" {
        directory.join(
            Path::new(&c.binary)
                .parent()
                .ok_or("Missing private application directory")?,
        )
    } else {
        directory.to_path_buf()
    };
    fn walk(root: &Path, dir: &Path, files: &[FileRecord]) -> Result<bool> {
        for entry in io(fs::read_dir(dir))? {
            let entry = io(entry)?;
            let relative = entry
                .path()
                .strip_prefix(root)
                .map_err(|e| e.to_string())?
                .to_str()
                .ok_or("Invalid installed path")?
                .replace('\\', "/");
            let kind = io(entry.file_type())?;
            if kind.is_dir() {
                if !files
                    .iter()
                    .any(|f| f.path.starts_with(&(relative.clone() + "/")))
                    || walk(root, &entry.path(), files)?
                {
                    return Ok(true);
                }
            } else if !files.iter().any(|f| f.path == relative) {
                return Ok(true);
            }
        }
        Ok(false)
    }
    if !base.exists() {
        return Ok(false);
    }
    walk(directory, &base, &c.files)
}
pub(super) fn validate_predecessor(c: &Candidate, directory: &Path) -> Result<()> {
    #[cfg(target_os = "linux")]
    if let Native::LinuxDeb { installer } = &c.native {
        unsafe extern "C" {
            fn geteuid() -> u32;
        }
        if unsafe { geteuid() } != 0 {
            return Err("Full Debian update requires prior root elevation".into());
        }
        let file = Path::new(&installer.path);
        physical(file)?;
        let bytes = read_bounded(file, 1024 * 1024 * 1024)?;
        if hash(&bytes) != installer.sha256 || bytes.len().to_string() != installer.bytes {
            return Err("Prior Debian artifact changed".into());
        }
        if !deb_protocol(file)? && private_foreign(c, directory)? {
            return Err("Unsupported legacy Debian rollback with retained foreign application content; no replacement staged".into());
        }
    }
    #[cfg(windows)]
    if let Native::WindowsMsi { installer, .. } = &c.native {
        let source = Path::new(&installer.path);
        let _input = gallery_windows_package::open_verified_input(
            source,
            &gallery_windows_package::FileRecord {
                path: "predecessor.msi".into(),
                bytes: installer.bytes.clone(),
                sha256: installer.sha256.clone(),
            },
        )?;
        let (_, _, protocol, _) = gallery_windows_package::native::inspect_package(source)?;
        if !protocol && private_foreign(c, directory)? {
            return Err("Unsupported legacy MSI rollback with retained foreign installation content. Prior helper requires an empty destination; no replacement was staged. Preserve the current installation and matching original package.".into());
        }
    }
    let _ = (c, directory);
    Ok(())
}

#[cfg(all(test, windows))]
mod traversal_tests {
    use super::*;
    #[test]
    fn administrative_scratch_reclaims_only_verified_empty_stage() {
        let temp = tempfile::tempdir().unwrap();
        let storage = temp.path().join("owned");
        gallery_windows_package::private::ensure_storage_at(&storage, false).unwrap();
        let candidate = Candidate {
            format_version: 1,
            product: "local-media-gallery".into(),
            version: "0.0.0".into(),
            edition: "full".into(),
            os: "windows".into(),
            arch: "x86_64".into(),
            generation: "fixture".into(),
            source: Source {
                sha256: "a".repeat(64),
                files: 1,
            },
            binary: "a".into(),
            files: vec![FileRecord {
                path: "a".into(),
                bytes: "1".into(),
                sha256: hash(b"a"),
                mode: 644,
            }],
            native: Native::Direct,
            integration: None,
        };
        let image = AdministrativeImage::create(&storage, &candidate).unwrap();
        let empty = image.root.clone();
        assert!(!empty.starts_with(&storage));
        drop(image);
        assert!(!empty.exists());
        let image = AdministrativeImage::create(&storage, &candidate).unwrap();
        let retained = image.root.clone();
        gallery_windows_package::private::child_directory(&image.path).unwrap();
        let foreign = image.path.join("unexpected");
        fs::write(&foreign, b"retain").unwrap();
        drop(image);
        assert_eq!(fs::read(&foreign).unwrap(), b"retain");
        // The test knows this sole fixture leaf. Production never recursively
        // deletes a failed or unverified administrative image.
        fs::remove_file(foreign).unwrap();
        fs::remove_dir(retained.join("s/a")).unwrap();
        fs::remove_file(retained.join("s/.stage-owner.json")).unwrap();
        fs::remove_dir(retained.join("s")).unwrap();
        fs::remove_dir(retained).unwrap();
    }
    #[test]
    fn wide_administrative_image_rejects_extra_paths() {
        let temp = tempfile::tempdir().unwrap();
        let image = temp.path().join("image");
        let payload = image.join("Programs/Local Media Gallery");
        fs::create_dir_all(&payload).unwrap();
        fs::write(
            image.join("retained.msi"),
            b"administrative-name fixture, not an installer",
        )
        .unwrap();
        let mut files = vec![];
        for n in 0..1200 {
            let name = format!("licenses/dependencies/group-{n}/NOTICE");
            let file = payload.join(&name);
            fs::create_dir_all(file.parent().unwrap()).unwrap();
            fs::write(file, b"notice").unwrap();
            files.push(FileRecord {
                path: name,
                bytes: "6".into(),
                sha256: hash(b"notice"),
                mode: 644,
            });
        }
        let c = Candidate {
            format_version: 1,
            product: "local-media-gallery".into(),
            version: "0.0.0".into(),
            edition: "lite".into(),
            os: "windows".into(),
            arch: "x86_64".into(),
            generation: "fixture".into(),
            source: Source {
                sha256: "a".repeat(64),
                files: 1,
            },
            binary: files[0].path.clone(),
            files,
            native: Native::Direct,
            integration: None,
        };
        let started = std::time::Instant::now();
        exact_files(&c, &payload).unwrap();
        exact_msi_image(&c, &image, &payload).unwrap();
        println!("wide native image walks: {:?}", started.elapsed());
        fs::write(image.join("outside.txt"), b"retain outside").unwrap();
        assert!(exact_msi_image(&c, &image, &payload).is_err());
        assert_eq!(
            fs::read(image.join("outside.txt")).unwrap(),
            b"retain outside"
        );
        fs::remove_file(image.join("outside.txt")).unwrap();
        fs::write(payload.join("extra.txt"), b"retain extra").unwrap();
        assert!(exact_files(&c, &payload).is_err());
        assert!(exact_msi_image(&c, &image, &payload).is_err());
        assert_eq!(
            fs::read(payload.join("extra.txt")).unwrap(),
            b"retain extra"
        );
    }
}

#[cfg(windows)]
fn grouped_reinstall_value(
    candidate: &Candidate,
    rows: &[Vec<String>],
    directory: &Path,
) -> Result<String> {
    let group = |name: &str| {
        if name.starts_with("licenses/") {
            "Notices"
        } else {
            "Payload"
        }
    };
    let mut expected_features = BTreeSet::from(["Application".to_owned()]);
    let mut expected_members = BTreeSet::from([vec![
        "FeatureComponents".to_owned(),
        "Application".to_owned(),
        "Integration".to_owned(),
    ]]);
    if rows.iter().any(|r| {
        r.first().is_some_and(|t| t == "Feature") && r.get(1).is_some_and(|f| f == "StartMenu")
    }) {
        expected_features.extend(["StartMenu".into(), "CommandPath".into()]);
        for (f, c) in [
            ("StartMenu", "StartIntegration"),
            ("CommandPath", "UserPathIntegration"),
            ("CommandPath", "MachinePathIntegration"),
        ] {
            expected_members.insert(vec!["FeatureComponents".into(), f.into(), c.into()]);
        }
    }
    let mut expected_files = BTreeSet::new();
    for file in &candidate.files {
        let feature = group(&file.path).to_owned();
        let component = format!(
            "C{}",
            &hash(format!("component:{}", file.path).as_bytes())[..32]
        );
        let id = format!("F{}", &hash(format!("file:{}", file.path).as_bytes())[..32]);
        expected_features.insert(feature.clone());
        expected_members.insert(vec![
            "FeatureComponents".to_owned(),
            feature,
            component.clone(),
        ]);
        expected_files.insert((id, component));
    }
    let features = rows
        .iter()
        .filter(|r| r.first().is_some_and(|t| t == "Feature"))
        .collect::<Vec<_>>();
    let members = rows
        .iter()
        .filter(|r| r.first().is_some_and(|t| t == "FeatureComponents"))
        .collect::<Vec<_>>();
    let files = rows
        .iter()
        .filter(|r| r.first().is_some_and(|t| t == "File"))
        .collect::<Vec<_>>();
    if features.iter().any(|r| {
        r.len() != 9 || !r[2].is_empty() || (r[6] != "1" && !(r[1] == "CommandPath" && r[6] == "2"))
    }) || features.len() != expected_features.len()
        || features
            .iter()
            .map(|r| r[1].clone())
            .collect::<BTreeSet<_>>()
            != expected_features
        || members.iter().any(|r| r.len() != 3)
        || members.len() != expected_members.len()
        || members
            .iter()
            .map(|r| (*r).clone())
            .collect::<BTreeSet<_>>()
            != expected_members
        || files.iter().any(|r| r.len() != 6)
        || files.len() != expected_files.len()
        || files
            .iter()
            .map(|r| (r[1].clone(), r[2].clone()))
            .collect::<BTreeSet<_>>()
            != expected_files
    {
        return Err("Unrecognized MSI feature membership; retain the package before choosing a replacement strategy".into());
    }
    let mut selected = BTreeSet::from(["Application"]);
    let mut namespace = gallery_windows_package::private::PhysicalNamespace::default();
    for file in &candidate.files {
        let path = directory.join(&file.path);
        physical_in(&path, &mut namespace)?;
        if verify_physical_leaf(&path, file).is_err() {
            selected.insert(group(&file.path));
        }
    }
    Ok(selected.into_iter().collect::<Vec<_>>().join(","))
}

#[cfg(windows)]
pub(super) fn reinstall_features(
    candidate: &Candidate,
    package: &Path,
    directory: &Path,
) -> Result<String> {
    let rows = gallery_windows_package::native::reinstall_layout(package)?;
    grouped_reinstall_value(candidate, &rows, directory)
}

#[cfg(all(test, windows))]
mod feature_tests {
    use super::*;
    #[test]
    fn selective_reinstall_repairs_missing_files_and_refuses_unproven_membership() {
        let root = tempfile::tempdir().unwrap();
        let mut files = vec![];
        for name in ["app.exe", "payload.json", "licenses/dependencies/NOTICE"] {
            let path = root.path().join(name);
            fs::create_dir_all(path.parent().unwrap()).unwrap();
            fs::write(path, b"new").unwrap();
            files.push(FileRecord {
                path: name.into(),
                bytes: "3".into(),
                sha256: hash(b"new"),
                mode: 644,
            });
        }
        let c = Candidate {
            format_version: 1,
            product: "local-media-gallery".into(),
            version: "0.0.0".into(),
            edition: "full".into(),
            os: "windows".into(),
            arch: "x86_64".into(),
            generation: "test".into(),
            source: Source {
                sha256: "a".repeat(64),
                files: 1,
            },
            binary: "app.exe".into(),
            files,
            native: Native::Direct,
            integration: None,
        };
        let mut rows = vec![];
        for feature in ["Application", "Payload", "Notices"] {
            rows.push(vec![
                "Feature".into(),
                feature.into(),
                "".into(),
                "title".into(),
                "".into(),
                "2".into(),
                "1".into(),
                "".into(),
                "0".into(),
            ]);
        }
        rows.push(vec![
            "FeatureComponents".into(),
            "Application".into(),
            "Integration".into(),
        ]);
        for f in &c.files {
            let component = format!(
                "C{}",
                &hash(format!("component:{}", f.path).as_bytes())[..32]
            );
            let file = format!("F{}", &hash(format!("file:{}", f.path).as_bytes())[..32]);
            rows.push(vec![
                "FeatureComponents".into(),
                if f.path.starts_with("licenses/") {
                    "Notices"
                } else {
                    "Payload"
                }
                .into(),
                component.clone(),
            ]);
            rows.push(vec![
                "File".into(),
                file,
                component,
                f.path.clone(),
                "512".into(),
                "1".into(),
            ]);
        }
        assert_eq!(
            grouped_reinstall_value(&c, &rows, root.path()).unwrap(),
            "Application"
        );
        fs::write(root.path().join("payload.json"), b"old").unwrap();
        assert_eq!(
            grouped_reinstall_value(&c, &rows, root.path()).unwrap(),
            "Application,Payload"
        );
        fs::remove_file(root.path().join("licenses/dependencies/NOTICE")).unwrap();
        assert_eq!(
            grouped_reinstall_value(&c, &rows, root.path()).unwrap(),
            "Application,Notices,Payload"
        );
        let mut wrong = rows.clone();
        wrong
            .iter_mut()
            .find(|r| r[0] == "FeatureComponents" && r[1] == "Notices")
            .unwrap()[1] = "Payload".into();
        assert!(grouped_reinstall_value(&c, &wrong, root.path()).is_err());
        let mut nested = rows.clone();
        nested
            .iter_mut()
            .find(|r| r[0] == "Feature" && r[1] == "Notices")
            .unwrap()[2] = "Payload".into();
        assert!(grouped_reinstall_value(&c, &nested, root.path()).is_err());
        assert!(grouped_reinstall_value(&c, &[], root.path()).is_err());
    }
}

#[cfg(all(test, windows))]
mod administrative_retention_tests {
    use super::*;
    use std::os::windows::process::ExitStatusExt;

    #[test]
    fn native_msi_failure_retains_exit_and_bounded_utf16_diagnostic() {
        let temp = tempfile::tempdir().unwrap();
        let log = temp.path().join("native.log");
        let text = format!(
            "Local Media Gallery: original custom-action cause 雪\n{}\nError 2203: source 雪 could not be opened\n",
            "earlier native output ".repeat(5000)
        );
        let mut bytes = vec![0xff, 0xfe];
        bytes.extend(text.encode_utf16().flat_map(u16::to_le_bytes));
        fs::write(&log, bytes).unwrap();
        let output = std::process::Output {
            status: std::process::ExitStatus::from_raw(1603),
            stdout: Vec::new(),
            stderr: b"native stderr".to_vec(),
        };
        let message = msi_failure("administrative extraction", &output, &log);
        assert!(
            message.contains("1603")
                && message.contains("Error 2203")
                && message.contains("source 雪")
                && message.contains("native stderr")
                && message.contains("original custom-action cause 雪")
        );
        assert!(message.len() < 40000);
        assert!(!message.contains('\u{fffd}'));
        fs::remove_file(&log).unwrap();
        assert!(
            msi_failure("administrative extraction", &output, &log)
                .contains("Native log could not be read")
        );
    }

    #[test]
    #[ignore = "Runs actual quiet administrative extraction only on an isolated Windows CI runner"]
    fn actual_native_admin_retention_preserves_registration_and_exact_published_payload() {
        assert_eq!(std::env::var("GITHUB_ACTIONS").as_deref(), Ok("true"));
        assert_eq!(
            std::env::var("GALLERY_ISOLATED_DESKTOP").as_deref(),
            Ok("1")
        );
        let candidate = Candidate::read(Path::new(
            &std::env::var("GALLERY_MSI_ADMIN_DESCRIPTOR")
                .expect("Explicit prepared descriptor required"),
        ))
        .unwrap();
        let machine =
            matches!(&candidate.native, Native::WindowsMsi { scope, .. } if scope == "machine");
        let before = gallery_windows_package::native::registered_product(machine).unwrap();
        let temp = tempfile::tempdir().unwrap();
        use std::os::windows::ffi::OsStrExt;
        let storage = temp.path().join("owned legacy image 雪");
        gallery_windows_package::private::ensure_storage_at(&storage, machine).unwrap();
        let padding = 160usize
            .saturating_sub(storage.as_os_str().encode_wide().count() + 1)
            .max(8);
        for leaf in ["short".to_owned(), "d".repeat(padding)] {
            let base = storage.join(leaf);
            gallery_windows_package::private::child_directory(&base).unwrap();
            let destination = base.join("prior");
            gallery_windows_package::private::child_directory(&destination).unwrap();
            if let Err(error) = retain(&candidate, &base, "prior", &destination) {
                if let Ok(file) = std::env::var("GALLERY_MSI_ADMIN_FAILURE") {
                    let _ = fs::write(file, error.replace("\r\n", "\n"));
                }
                if let Ok(file) = std::env::var("GALLERY_MSI_ADMIN_LOG") {
                    let _ = fs::copy(base.join("prior-extract.log"), file);
                }
                panic!("{error}");
            }
            verify_retained(&candidate, &base, "prior").unwrap();
            candidate.verify(&destination).unwrap();
            assert_eq!(
                gallery_windows_package::native::registered_product(machine).unwrap(),
                before,
                "Administrative extraction must not change installed registration"
            );
        }
    }
}
