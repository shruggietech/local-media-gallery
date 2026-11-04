// SPDX-License-Identifier: Apache-2.0
use cap_fs_ext::{FollowSymlinks, MetadataExt, OpenOptionsFollowExt};
use std::{fs::File, io, path::Path};
/// Open only an ordinary, unaliased private file. Ancestor aliases remain supported.
pub fn open(path: &Path, write: bool, create: bool) -> io::Result<File> {
    let parent = path
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "No private state parent"))?;
    let name = path
        .file_name()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "No private state filename"))?;
    let directory = cap_std::fs::Dir::open_ambient_dir(parent, cap_std::ambient_authority())?;
    // Reject known special leaves before opening. Recheck the opened handle below.
    match directory.symlink_metadata(name) {
        Ok(metadata) if !metadata.is_file() || metadata.nlink() != 1 => {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Private state must be an ordinary file with one link",
            ));
        }
        Err(error) if error.kind() != io::ErrorKind::NotFound || !create => return Err(error),
        _ => {}
    }
    let mut options = cap_std::fs::OpenOptions::new();
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        use cap_std::fs::OpenOptionsExt;
        // O_NONBLOCK prevents a substituted FIFO from waiting for another endpoint.
        options.custom_flags(if cfg!(target_os = "macos") {
            0x0004
        } else {
            0x0800
        });
    }
    options
        .read(true)
        .write(write)
        .create(create)
        .follow(FollowSymlinks::No);
    let file = directory.open_with(name, &options)?;
    let metadata = file.metadata()?;
    if !metadata.is_file() || metadata.nlink() != 1 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Private state must be an ordinary file with one link",
        ));
    }
    #[cfg(windows)]
    {
        use cap_std::fs::MetadataExt as _;
        if metadata.file_attributes() & 0x400 != 0 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Reparse private state is unsupported",
            ));
        }
    }
    Ok(file.into_std())
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::{
        process::{Command, Stdio},
        time::{Duration, Instant},
    };
    #[test]
    fn fifo_reader_child() {
        let Some(root) = std::env::var_os("GALLERY_FIFO_TEST_ROOT") else {
            return;
        };
        let root = std::path::PathBuf::from(root);
        let path = root.join("settings.json");
        let store = crate::settings::SettingsStore::load(path.clone(), false);
        assert!(
            store
                .envelope()
                .warning
                .unwrap()
                .contains(&path.display().to_string())
        );
        let path = root.join("history.sqlite3");
        let failure = crate::history::History::new(Some(path.clone()), false)
            .list(100)
            .err()
            .unwrap();
        assert!(failure.message.contains(&path.display().to_string()));
    }
    #[test]
    fn private_fifo_settings_and_history_return_without_a_writer() {
        use std::{ffi::CString, os::unix::ffi::OsStrExt};
        #[cfg(target_os = "macos")]
        type Mode = u16;
        #[cfg(not(target_os = "macos"))]
        type Mode = u32;
        unsafe extern "C" {
            fn mkfifo(path: *const std::ffi::c_char, mode: Mode) -> i32;
        }
        let root = tempfile::tempdir().unwrap();
        for name in ["settings.json", "history.sqlite3"] {
            let path = root.path().join(name);
            let native = CString::new(path.as_os_str().as_bytes()).unwrap();
            assert_eq!(unsafe { mkfifo(native.as_ptr(), 0o600) }, 0);
        }
        let mut child = Command::new(std::env::current_exe().unwrap())
            .args(["--exact", "private_file::tests::fifo_reader_child"])
            .env("GALLERY_FIFO_TEST_ROOT", root.path())
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .unwrap();
        let deadline = Instant::now() + Duration::from_secs(3);
        let status = loop {
            if let Some(status) = child.try_wait().unwrap() {
                break status;
            }
            if Instant::now() >= deadline {
                child.kill().unwrap();
                child.wait().unwrap();
                panic!("Private FIFO reads must not block waiting for a writer");
            }
            std::thread::sleep(Duration::from_millis(10));
        };
        assert!(status.success());
        assert!(
            root.path().join("settings.json").exists()
                && root.path().join("history.sqlite3").exists()
        );
    }
}
