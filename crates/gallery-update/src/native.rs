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
            || actual.3 != *scope
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
                let extract = base.join(format!("{name}-administrative"));
                gallery_windows_package::private::child_directory(&extract)?;
                let out = msi(
                    &artifact_path(base, name),
                    a,
                    "/a",
                    Some(&extract),
                    None,
                    false,
                    &base.join(format!("{name}-extract.log")),
                )?;
                if !out.status.success() {
                    return Err(
                        "Native MSI administrative extraction failed before replacement".into(),
                    );
                }
                let mut roots = vec![];
                find_binary(&extract, &c.binary, &mut roots)?;
                let src = roots
                    .into_iter()
                    .find(|p| c.verify(p).is_ok())
                    .ok_or("Extracted MSI does not match complete expected payload")?;
                exact_msi_image(c, &extract, &src)?;
                let mut namespace = gallery_windows_package::private::PhysicalNamespace::default();
                for f in &c.files {
                    copy_owned_in(
                        &src.join(&f.path),
                        &destination.join(&f.path),
                        f,
                        true,
                        &mut namespace,
                    )?;
                }
            }
            #[cfg(not(windows))]
            return Err("Windows MSI requires Windows".into());
        }
        Native::Direct => unreachable!(),
    };
    c.verify(destination)?;
    exact_files(c, destination)
}
#[cfg(windows)]
fn find_binary(base: &Path, binary: &str, found: &mut Vec<PathBuf>) -> Result<()> {
    physical(base)?;
    if base.join(binary).is_file() {
        found.push(base.to_path_buf())
    }
    for e in io(fs::read_dir(base))? {
        let e = io(e)?;
        if io(e.file_type())?.is_dir() {
            find_binary(&e.path(), binary, found)?
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
            package_code,
            ..
        } => {
            #[cfg(windows)]
            {
                let payload = io(fs::read_to_string(directory.join("payload.json")))?;
                gallery_windows_package::native::verify_install_payload(
                    directory,
                    scope == "machine",
                    &payload,
                    package_code,
                )?;
            }
            #[cfg(not(windows))]
            {
                let _ = (scope, package_code);
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
                    if !same {
                        verified(&which.1, &op.journal.directory)?;
                        let out = worker::execute(
                            op,
                            name,
                            "remove",
                            false,
                            &op.base.join("remove.log"),
                        )?;
                        if !matches!(out.status.code(), Some(0 | 3010)) {
                            return Err(format!(
                                "Native removal did not complete ({:?}); inspect retained log",
                                out.status.code()
                            ));
                        }
                        if gallery_windows_package::native::registered_package(machine)?.is_some() {
                            return Err("Native removal left registration".into());
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
                    return Err(format!(
                        "Native install did not complete ({:?}); retained inputs allow recovery",
                        out.status.code()
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
    fn walk(base: &Path, directory: &Path, names: &mut BTreeSet<String>) -> Result<()> {
        for entry in io(fs::read_dir(directory))? {
            let entry = io(entry)?;
            physical(&entry.path())?;
            let kind = io(entry.file_type())?;
            if kind.is_dir() {
                walk(base, &entry.path(), names)?
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
    walk(base, base, &mut actual)?;
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
    ) -> Result<()> {
        for e in io(fs::read_dir(dir))? {
            let e = io(e)?;
            physical(&e.path())?;
            let kind = io(e.file_type())?;
            if kind.is_dir() {
                walk(base, payload, &e.path(), files, packages)?
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
    walk(base, payload, base, &files, &mut packages)?;
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
