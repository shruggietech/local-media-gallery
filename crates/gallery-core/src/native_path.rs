// SPDX-License-Identifier: Apache-2.0
use crate::GalleryError;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum PathEncoding {
    #[serde(rename = "windows-utf16le")]
    WindowsUtf16Le,
    #[serde(rename = "unix-bytes")]
    UnixBytes,
}
impl PathEncoding {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::WindowsUtf16Le => "windows-utf16le",
            Self::UnixBytes => "unix-bytes",
        }
    }
}
/// Exact native bytes. Display labels remain separate and never authorize access.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NativePath {
    pub encoding: PathEncoding,
    pub bytes: Vec<u8>,
}
impl NativePath {
    pub fn from_path(path: &Path) -> Self {
        #[cfg(windows)]
        {
            use std::os::windows::ffi::OsStrExt;
            Self {
                encoding: PathEncoding::WindowsUtf16Le,
                bytes: path
                    .as_os_str()
                    .encode_wide()
                    .flat_map(u16::to_le_bytes)
                    .collect(),
            }
        }
        #[cfg(unix)]
        {
            use std::os::unix::ffi::OsStrExt;
            Self {
                encoding: PathEncoding::UnixBytes,
                bytes: path.as_os_str().as_bytes().to_vec(),
            }
        }
    }
    pub fn to_path(&self) -> Result<PathBuf, GalleryError> {
        #[cfg(windows)]
        {
            use std::{ffi::OsString, os::windows::ffi::OsStringExt};
            if self.encoding == PathEncoding::WindowsUtf16Le && self.bytes.len().is_multiple_of(2) {
                let words: Vec<_> = self
                    .bytes
                    .chunks_exact(2)
                    .map(|b| u16::from_le_bytes([b[0], b[1]]))
                    .collect();
                return Ok(OsString::from_wide(&words).into());
            }
        }
        #[cfg(unix)]
        {
            use std::{ffi::OsString, os::unix::ffi::OsStringExt};
            if self.encoding == PathEncoding::UnixBytes {
                return Ok(OsString::from_vec(self.bytes.clone()).into());
            }
        }
        Err(GalleryError::new(
            "native_path_encoding",
            "The native path encoding is invalid or belongs to another platform.",
        ))
    }
}
