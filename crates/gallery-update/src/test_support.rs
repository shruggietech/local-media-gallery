// SPDX-License-Identifier: Apache-2.0
//! Disposable fixture authority, shared by unit and integration tests.
use std::path::{Path, PathBuf};
pub struct Fixture {
    _temporary: tempfile::TempDir,
    root: PathBuf,
}
impl Fixture {
    pub fn new() -> Self {
        let temporary = tempfile::tempdir().unwrap();
        let root = temporary.path().join("fixture");
        #[cfg(windows)]
        gallery_windows_package::private::ensure_storage_at(&root, false).unwrap();
        #[cfg(not(windows))]
        {
            use std::os::unix::fs::DirBuilderExt;
            std::fs::DirBuilder::new()
                .mode(0o700)
                .create(&root)
                .unwrap();
        }
        Self {
            _temporary: temporary,
            root,
        }
    }
    pub fn path(&self) -> &Path {
        &self.root
    }
    pub fn storage(&self) -> PathBuf {
        self.root.join("coordination")
    }
    pub fn prepare(
        &self,
        base: &Path,
        directory: &Path,
        prior: &crate::Candidate,
        next: &crate::Candidate,
        source: &Path,
        state: &[crate::StateOperand],
    ) -> std::result::Result<crate::Transaction, String> {
        crate::Transaction::prepare_in(
            base,
            directory,
            prior,
            next,
            source,
            state,
            Some(&self.storage()),
        )
    }
}
