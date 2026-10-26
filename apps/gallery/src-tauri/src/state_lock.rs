// SPDX-License-Identifier: Apache-2.0
use std::fs::{File, TryLockError};

/// An operation owns the lock lifetime, independently of inherited descriptors.
/// Unix fork/dup can retain an open-file-description lock after the owner's File
/// closes. Explicit unlock on every return prevents a child from extending it.
pub(crate) struct StateLock(File);
impl StateLock {
    pub(crate) fn try_acquire(file: File) -> Result<Self, TryLockError> {
        file.try_lock()?;
        Ok(Self(file))
    }
}
impl Drop for StateLock {
    fn drop(&mut self) {
        // File close remains the fallback if the OS rejects explicit unlock.
        let _ = self.0.unlock();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{File, OpenOptions, TryLockError};

    fn file(path: &std::path::Path) -> File {
        OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(path)
            .unwrap()
    }
    #[test]
    fn owner_release_does_not_wait_for_a_duplicated_descriptor() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("state.lock");
        let guard = StateLock::try_acquire(file(&path)).unwrap();
        let duplicate = guard.0.try_clone().unwrap();
        let contender = file(&path);
        assert!(matches!(
            contender.try_lock(),
            Err(TryLockError::WouldBlock)
        ));
        drop(guard);
        contender.try_lock().expect(
            "The operation ended, even while a fork/dup-equivalent descriptor remains open",
        );
        contender.unlock().unwrap();
        drop(duplicate);
    }
    #[test]
    fn error_return_releases_the_operation_lock_before_a_duplicate_closes() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("state.lock");
        let original = file(&path);
        let duplicate = original.try_clone().unwrap();
        fn fail_with_guard(original: File) -> Result<(), &'static str> {
            let _guard = StateLock::try_acquire(original).unwrap();
            Err("operation failed")
        }
        let failed = fail_with_guard(original);
        assert_eq!(failed, Err("operation failed"));
        let contender = file(&path);
        contender
            .try_lock()
            .expect("Early returns must unlock explicitly");
        contender.unlock().unwrap();
        drop(duplicate);
    }
}
