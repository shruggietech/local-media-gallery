// SPDX-License-Identifier: Apache-2.0
//! A generation becomes visible only after every retained input is durable and verified.
use std::fs;
#[cfg(unix)]
use std::fs::File;
use std::path::Path;

#[cfg(target_os = "linux")]
fn rename_exclusive(from: &Path, to: &Path) -> std::io::Result<()> {
    use std::ffi::CString;
    use std::os::unix::ffi::OsStrExt;
    let from = CString::new(from.as_os_str().as_bytes())?;
    let to = CString::new(to.as_os_str().as_bytes())?;
    let result = unsafe {
        libc::renameat2(
            libc::AT_FDCWD,
            from.as_ptr(),
            libc::AT_FDCWD,
            to.as_ptr(),
            libc::RENAME_NOREPLACE,
        )
    };
    if result == 0 {
        Ok(())
    } else {
        Err(std::io::Error::last_os_error())
    }
}

// Windows exercises the same publish/retry logic in host unit tests. The product
// installer uses the Linux implementation above; neither path replaces a target.
#[cfg(windows)]
fn rename_exclusive(from: &Path, to: &Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn MoveFileExW(from: *const u16, to: *const u16, flags: u32) -> i32;
    }
    let from: Vec<_> = from.as_os_str().encode_wide().chain(Some(0)).collect();
    let to: Vec<_> = to.as_os_str().encode_wide().chain(Some(0)).collect();
    if unsafe { MoveFileExW(from.as_ptr(), to.as_ptr(), 0) } != 0 {
        Ok(())
    } else {
        Err(std::io::Error::last_os_error())
    }
}

fn sync_directory(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    File::open(path)
        .and_then(|f| f.sync_all())
        .map_err(|e| e.to_string())?;
    #[cfg(windows)]
    let _ = path;
    Ok(())
}

pub(super) fn publish_generation(
    base: &Path,
    prepare: impl FnOnce(&Path) -> Result<(), String>,
    verify: impl Fn(&Path) -> Result<(), String>,
) -> Result<(), String> {
    match fs::symlink_metadata(base) {
        Ok(_) => {
            verify(base)?;
            return sync_directory(base.parent().ok_or("Missing retained-generation parent")?);
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(error.to_string()),
    }
    let parent = base.parent().ok_or("Missing retained-generation parent")?;
    let mut builder = tempfile::Builder::new();
    builder.prefix(".local-media-gallery-staged-generation-");
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        builder.permissions(fs::Permissions::from_mode(0o700));
    }
    let staging = builder.tempdir_in(parent).map_err(|e| e.to_string())?;
    prepare(staging.path())?;
    verify(staging.path())?;
    sync_directory(staging.path())?;
    match rename_exclusive(staging.path(), base) {
        Ok(()) => {
            sync_directory(parent)?;
            verify(base)
        }
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
            verify(base)?;
            sync_directory(parent)
        }
        Err(error) => Err(error.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::{Command, Stdio};

    fn complete(base: &Path) -> Result<(), String> {
        fs::write(base.join("application.deb"), b"verified package").map_err(|e| e.to_string())?;
        fs::write(base.join("receipt.json"), b"sealed receipt").map_err(|e| e.to_string())
    }
    fn verify(base: &Path) -> Result<(), String> {
        if fs::read(base.join("application.deb")).map_err(|e| e.to_string())? != b"verified package"
            || fs::read(base.join("receipt.json")).map_err(|e| e.to_string())? != b"sealed receipt"
        {
            return Err("Unknown or incomplete retained generation".into());
        }
        Ok(())
    }

    #[test]
    fn interrupted_writer_child() {
        let Some(parent) = std::env::var_os("LMG_RETENTION_TEST_DIRECTORY") else {
            return;
        };
        let base = Path::new(&parent).join("generation");
        let _ = publish_generation(
            &base,
            |staging| {
                fs::write(staging.join("application.deb"), b"partial package").unwrap();
                // Exit bypasses TempDir cleanup, matching a terminated writer before
                // receipt creation. This hook exists only in the Rust test binary.
                std::process::exit(73);
            },
            verify,
        );
        panic!("Injected interruption must exit before publication");
    }

    #[test]
    fn interrupted_before_receipt_leaves_no_final_generation_and_retry_succeeds() {
        let directory = tempfile::tempdir().unwrap();
        let base = directory.path().join("generation");
        let mut command = Command::new(std::env::current_exe().unwrap());
        command
            .args([
                "--exact",
                "retention::tests::interrupted_writer_child",
                "--nocapture",
            ])
            .env("LMG_RETENTION_TEST_DIRECTORY", directory.path())
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000);
        }
        let result = command.output().unwrap();
        assert_eq!(result.status.code(), Some(73));
        assert!(!base.exists());
        let orphan = fs::read_dir(directory.path())
            .unwrap()
            .next()
            .unwrap()
            .unwrap()
            .path();
        assert_eq!(
            fs::read(orphan.join("application.deb")).unwrap(),
            b"partial package"
        );
        publish_generation(&base, complete, verify).unwrap();
        verify(&base).unwrap();
        assert_eq!(
            fs::read(orphan.join("application.deb")).unwrap(),
            b"partial package"
        );
    }

    #[test]
    fn failed_write_and_foreign_existing_generation_are_not_adopted() {
        let directory = tempfile::tempdir().unwrap();
        let base = directory.path().join("generation");
        assert!(
            publish_generation(
                &base,
                |stage| {
                    fs::write(stage.join("application.deb"), b"partial").unwrap();
                    Err("injected disk-full before receipt".into())
                },
                verify
            )
            .is_err()
        );
        assert!(!base.exists());
        fs::create_dir(&base).unwrap();
        fs::write(base.join("foreign"), b"retain unknown bytes").unwrap();
        assert!(publish_generation(&base, complete, verify).is_err());
        assert_eq!(
            fs::read(base.join("foreign")).unwrap(),
            b"retain unknown bytes"
        );
    }

    #[test]
    fn concurrent_publication_requires_an_authentic_complete_generation() {
        for authentic in [Some(true), Some(false), None] {
            let directory = tempfile::tempdir().unwrap();
            let base = directory.path().join("generation");
            let result = publish_generation(
                &base,
                |stage| {
                    complete(stage)?;
                    fs::create_dir(&base).map_err(|e| e.to_string())?;
                    if authentic == Some(true) {
                        complete(&base)?;
                    } else if authentic == Some(false) {
                        fs::write(base.join("foreign"), b"retain raced generation")
                            .map_err(|e| e.to_string())?;
                    }
                    Ok(())
                },
                verify,
            );
            assert_eq!(result.is_ok(), authentic == Some(true));
            if authentic == Some(false) {
                assert_eq!(
                    fs::read(base.join("foreign")).unwrap(),
                    b"retain raced generation"
                );
                assert!(!base.join("application.deb").exists());
            } else if authentic.is_none() {
                assert_eq!(fs::read_dir(&base).unwrap().count(), 0);
            }
        }
    }
    #[cfg(unix)]
    #[test]
    fn staging_is_private_before_any_input_is_written() {
        use std::os::unix::fs::{MetadataExt, PermissionsExt};
        let directory = tempfile::tempdir().unwrap();
        let base = directory.path().join("generation");
        publish_generation(
            &base,
            |stage| {
                let metadata = fs::symlink_metadata(stage).unwrap();
                let parent = fs::metadata(directory.path()).unwrap();
                assert!(metadata.is_dir());
                assert_eq!(metadata.permissions().mode() & 0o777, 0o700);
                assert_eq!(
                    (metadata.uid(), metadata.gid()),
                    (parent.uid(), parent.gid())
                );
                complete(stage)
            },
            verify,
        )
        .unwrap();
        assert_eq!(
            fs::metadata(base).unwrap().permissions().mode() & 0o777,
            0o700
        );
    }
}
