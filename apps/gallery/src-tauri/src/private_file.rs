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
    let mut options = cap_std::fs::OpenOptions::new();
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
