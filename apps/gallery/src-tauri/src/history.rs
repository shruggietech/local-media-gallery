// SPDX-License-Identifier: Apache-2.0
use gallery_core::GalleryError;
use rusqlite::{Connection, OpenFlags, OptionalExtension, params};
use serde::Serialize;
use serde_json::{Map, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

const TABLE: &str = "CREATE TABLE locations(id TEXT NOT NULL PRIMARY KEY, path_encoding TEXT NOT NULL, native_path BLOB NOT NULL UNIQUE, display_path TEXT NOT NULL, choices_json TEXT NOT NULL, last_activity_ms INTEGER NOT NULL CHECK(last_activity_ms>=0), revision TEXT NOT NULL)";
const INDEX: &str = "CREATE INDEX locations_activity ON locations(last_activity_ms DESC,id ASC)";
const APPLICATION: i32 = 0x4c4d4701;
const AGE: i64 = 90 * 24 * 60 * 60 * 1000;
pub struct History {
    pub path: Option<PathBuf>,
    test: bool,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Recent {
    pub id: String,
    pub display_path: String,
    pub last_activity_ms: String,
}
pub struct Remembered {
    pub id: String,
    pub choices: Map<String, Value>,
    pub revision: String,
    pub last_activity_ms: i64,
}
pub fn expired(last: i64, time: i64) -> bool {
    time >= last && time.saturating_sub(last) >= AGE
}
pub fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(i64::MAX as u128) as i64
}
fn error(e: impl ToString) -> GalleryError {
    GalleryError::new(
        "history_unavailable",
        format!(
            "Machine history is unavailable; existing data was preserved: {}",
            e.to_string()
        ),
    )
}
pub fn encode(path: &Path) -> (&'static str, Vec<u8>) {
    let native = gallery_core::NativePath::from_path(path);
    (native.encoding.as_str(), native.bytes)
}
fn decode(tag: &str, bytes: &[u8]) -> Result<PathBuf, GalleryError> {
    let encoding = match tag {
        "windows-utf16le" => gallery_core::PathEncoding::WindowsUtf16Le,
        "unix-bytes" => gallery_core::PathEncoding::UnixBytes,
        _ => return Err(error("The native path encoding is unsupported.")),
    };
    gallery_core::NativePath {
        encoding,
        bytes: bytes.to_vec(),
    }
    .to_path()
    .map_err(error)
}
pub fn location(local_data: Option<PathBuf>) -> Option<PathBuf> {
    #[cfg(target_os = "linux")]
    {
        let state = std::env::var_os("XDG_STATE_HOME")
            .map(PathBuf::from)
            .filter(|p| p.is_absolute())
            .or_else(|| {
                std::env::var_os("HOME")
                    .map(PathBuf::from)
                    .filter(|p| p.is_absolute())
                    .map(|p| p.join(".local/state"))
            })?;
        let _ = local_data;
        Some(state.join("tech.shruggie.local-media-gallery/history.sqlite3"))
    }
    #[cfg(not(target_os = "linux"))]
    {
        local_data.map(|p| p.join("state/history.sqlite3"))
    }
}
fn validate(db: &Connection) -> Result<(), GalleryError> {
    let app: i32 = db
        .pragma_query_value(None, "application_id", |r| r.get(0))
        .map_err(error)?;
    let version: i32 = db
        .pragma_query_value(None, "user_version", |r| r.get(0))
        .map_err(error)?;
    if app != APPLICATION || version != 1 {
        return Err(error(
            "The database identity or schema version is unsupported.",
        ));
    }
    let mut stmt = db.prepare("PRAGMA table_info(locations)").map_err(error)?;
    let columns = stmt
        .query_map([], |r| {
            Ok((
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, i32>(3)?,
                r.get::<_, i32>(5)?,
            ))
        })
        .map_err(error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(error)?;
    let expected = vec![
        ("id", "TEXT", 1, 1),
        ("path_encoding", "TEXT", 1, 0),
        ("native_path", "BLOB", 1, 0),
        ("display_path", "TEXT", 1, 0),
        ("choices_json", "TEXT", 1, 0),
        ("last_activity_ms", "INTEGER", 1, 0),
        ("revision", "TEXT", 1, 0),
    ];
    if columns
        .iter()
        .map(|v| (v.0.as_str(), v.1.as_str(), v.2, v.3))
        .collect::<Vec<_>>()
        != expected
    {
        return Err(error("The locations schema is unsupported."));
    }
    let objects: i64 = db.query_row("SELECT count(*) FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND type IN ('table','view','trigger')", [], |r|r.get(0)).map_err(error)?;
    if objects != 1 {
        return Err(error(
            "The database contains unsupported tables, views or triggers.",
        ));
    }
    let table: String = db
        .query_row(
            "SELECT sql FROM sqlite_schema WHERE type='table' AND name='locations'",
            [],
            |r| r.get(0),
        )
        .map_err(error)?;
    let index: String = db
        .query_row(
            "SELECT sql FROM sqlite_schema WHERE type='index' AND name='locations_activity'",
            [],
            |r| r.get(0),
        )
        .map_err(error)?;
    if table != TABLE || index != INDEX {
        return Err(error("The owned schema definition is unsupported."));
    }
    Ok(())
}
fn regular(path: &Path) -> Result<(), GalleryError> {
    let metadata = fs::symlink_metadata(path).map_err(error)?;
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err(error("The database must be a regular file."));
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return Err(error("Reparse database paths are unsupported."));
        }
    }
    Ok(())
}
impl History {
    pub fn new(path: Option<PathBuf>, test: bool) -> Self {
        Self { path, test }
    }
    fn read(&self) -> Result<Option<Connection>, GalleryError> {
        let path = self
            .path
            .as_ref()
            .ok_or_else(|| error("The platform state directory is unavailable."))?;
        match fs::symlink_metadata(path) {
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(e) => return Err(error(e)),
            Ok(_) => regular(path)?,
        }
        let db = Connection::open_with_flags(
            path,
            OpenFlags::SQLITE_OPEN_READ_ONLY
                | OpenFlags::SQLITE_OPEN_NO_MUTEX
                | OpenFlags::SQLITE_OPEN_NOFOLLOW,
        )
        .map_err(error)?;
        db.busy_timeout(Duration::from_millis(250)).map_err(error)?;
        validate(&db)?;
        Ok(Some(db))
    }
    fn write<T>(
        &self,
        time: i64,
        operation: impl FnOnce(&Connection) -> Result<T, GalleryError>,
    ) -> Result<T, GalleryError> {
        let path = self
            .path
            .as_ref()
            .ok_or_else(|| error("The platform state directory is unavailable."))?;
        let parent = path
            .parent()
            .ok_or_else(|| error("No state parent directory."))?;
        fs::create_dir_all(parent).map_err(error)?;
        let lock_path = parent.join("history.lock");
        if lock_path.exists() {
            regular(&lock_path)?;
        }
        let lock = fs::OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(lock_path)
            .map_err(error)?;
        lock.try_lock().map_err(error)?;
        // Validate existing bytes with a read-only connection before any write.
        let existed = self.read()?.is_some();
        if !existed {
            fs::OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(path)
                .map_err(error)?;
        }
        let mut db = Connection::open_with_flags(
            path,
            OpenFlags::SQLITE_OPEN_READ_WRITE
                | OpenFlags::SQLITE_OPEN_NO_MUTEX
                | OpenFlags::SQLITE_OPEN_NOFOLLOW,
        )
        .map_err(error)?;
        db.busy_timeout(Duration::from_millis(250)).map_err(error)?;
        let tx = db
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(error)?;
        if existed {
            validate(&tx)?;
        } else {
            tx.execute_batch(&format!(
                "PRAGMA application_id={APPLICATION}; PRAGMA user_version=1;
                {TABLE}; {INDEX};"
            ))
            .map_err(error)?;
        }
        if time >= AGE {
            tx.execute("DELETE FROM locations WHERE id IN (SELECT id FROM locations WHERE last_activity_ms<=?1 ORDER BY last_activity_ms,id LIMIT 256)", [time-AGE]).map_err(error)?;
        }
        let value = operation(&tx)?;
        tx.commit().map_err(error)?;
        Ok(value)
    }
    fn choices(&self, text: String) -> Result<Map<String, Value>, GalleryError> {
        if text.len() > 1024 * 1024 {
            return Err(error("A remembered choices row exceeds one MiB."));
        }
        let value = serde_json::from_str(&text).map_err(error)?;
        crate::settings::validate_choices(&value, self.test)
    }
    pub fn recall(&self, path: &Path, time: i64) -> Result<Option<Remembered>, GalleryError> {
        let Some(db) = self.read()? else {
            return Ok(None);
        };
        let (tag, bytes) = encode(path);
        let row: Option<(String,String,String,i64,String)> = db.query_row("SELECT id,CASE WHEN length(CAST(choices_json AS BLOB))<=1048576 THEN choices_json ELSE NULL END,revision,last_activity_ms,path_encoding FROM locations WHERE native_path=?1", params![bytes], |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?))).optional().map_err(error)?;
        row.map(|(id, text, revision, last, encoding)| {
            if encoding != tag {
                return Err(error(
                    "The stored path encoding is unsupported on this platform.",
                ));
            }
            if last < 0 {
                return Err(error("A stored activity timestamp is invalid."));
            }
            let choices = self.choices(text)?;
            if id.is_empty() || revision.is_empty() {
                return Err(error("A remembered row identity is invalid."));
            }
            if expired(last, time) {
                return Ok(None);
            }
            Ok(Some(Remembered {
                id,
                choices,
                revision,
                last_activity_ms: last,
            }))
        })
        .transpose()
        .map(Option::flatten)
    }
    pub fn touch(&self, path: &Path, time: i64) -> Result<(), GalleryError> {
        self.recall(path, 0)?;
        let (tag, bytes) = encode(path);
        self.write(time, |db| {
            let stored:Option<String> = db.query_row("SELECT CASE WHEN length(CAST(choices_json AS BLOB))<=1048576 THEN choices_json ELSE NULL END FROM locations WHERE native_path=?1",[&bytes],|r|r.get(0)).optional().map_err(error)?;
            if let Some(text)=stored { self.choices(text)?; }
            db.execute("INSERT INTO locations VALUES(?1,?2,?3,?4,'{}',?5,?6) ON CONFLICT(native_path) DO UPDATE SET choices_json=CASE WHEN last_activity_ms<=?7 THEN '{}' ELSE choices_json END,revision=CASE WHEN last_activity_ms<=?7 THEN excluded.revision ELSE revision END,last_activity_ms=MAX(last_activity_ms,excluded.last_activity_ms)",params![uuid::Uuid::new_v4().simple().to_string(),tag,bytes,path.to_string_lossy(),time,uuid::Uuid::new_v4().simple().to_string(),time.saturating_sub(AGE)]).map_err(error)?;
            Ok(())
        })
    }
    pub fn save(
        &self,
        path: &Path,
        expected: Option<&str>,
        choices: &Map<String, Value>,
        time: i64,
    ) -> Result<(), GalleryError> {
        let (tag, bytes) = encode(path);
        self.recall(path, 0)?;
        let text = serde_json::to_string(choices).map_err(error)?;
        if text.len() > 1024 * 1024 {
            return Err(error("Remembered choices exceed one MiB."));
        }
        self.write(time, |db| {
            let revision:Option<String>=db.query_row("SELECT revision FROM locations WHERE native_path=?1 AND path_encoding=?2 AND last_activity_ms>?3",params![bytes,tag,time.saturating_sub(AGE)],|r|r.get(0)).optional().map_err(error)?;
            if revision.as_deref()!=expected { return Err(GalleryError::new("history_conflict","Remembered choices changed in another instance. Reopen the gallery to reload them. Your choice remains temporary.")); }
            db.execute("INSERT INTO locations VALUES(?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(native_path) DO UPDATE SET choices_json=excluded.choices_json,last_activity_ms=MAX(last_activity_ms,excluded.last_activity_ms),revision=excluded.revision",params![uuid::Uuid::new_v4().simple().to_string(),tag,bytes,path.to_string_lossy(),text,time,uuid::Uuid::new_v4().simple().to_string()]).map_err(error)?;
            Ok(())
        })
    }
    pub fn list(&self, time: i64) -> Result<Vec<Recent>, GalleryError> {
        let Some(db) = self.read()? else {
            return Ok(vec![]);
        };
        let mut stmt=db.prepare("SELECT id,display_path,last_activity_ms FROM locations WHERE last_activity_ms>?1 ORDER BY last_activity_ms DESC,id ASC LIMIT 20").map_err(error)?;
        let rows = stmt
            .query_map([time.saturating_sub(AGE)], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, i64>(2)?,
                ))
            })
            .map_err(error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(error)?;
        rows.into_iter()
            .map(|(id, display_path, last)| {
                if last < 0 || id.is_empty() {
                    return Err(error("A recent row is invalid."));
                }
                Ok(Recent {
                    id,
                    display_path,
                    last_activity_ms: last.to_string(),
                })
            })
            .collect()
    }
    pub fn reopen(&self, id: &str, time: i64) -> Result<PathBuf, GalleryError> {
        let db = self
            .read()?
            .ok_or_else(|| error("No recent directories are available."))?;
        let row: Option<(String, Vec<u8>, i64)> = db
            .query_row(
                "SELECT path_encoding,native_path,last_activity_ms FROM locations WHERE id=?1",
                [id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .optional()
            .map_err(error)?;
        let (tag, bytes, last) =
            row.ok_or_else(|| error("This recent directory was forgotten."))?;
        if last < 0 || expired(last, time) {
            return Err(error("This recent directory expired."));
        }
        let path = decode(&tag, &bytes)?;
        if !path.is_absolute() {
            return Err(error("The stored native path is not absolute."));
        }
        Ok(path)
    }
    pub fn forget(&self, id: Option<&str>, time: i64) -> Result<(), GalleryError> {
        if self.read()?.is_none() {
            return Ok(());
        }
        self.write(time, |db| {
            match id {
                Some(id) => {
                    db.execute("DELETE FROM locations WHERE id=?1", [id])
                        .map_err(error)?;
                }
                None => {
                    db.execute("DELETE FROM locations", []).map_err(error)?;
                }
            }
            Ok(())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_expiry_rollback_revision_and_row_only_forget() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("history.sqlite3");
        let store = History::new(Some(path), false);
        let root = temp.path().join("Media");
        fs::create_dir(&root).unwrap();
        fs::write(root.join("keep"), b"original").unwrap();
        store.touch(&root, 100).unwrap();
        let first = store.recall(&root, 100).unwrap().unwrap();
        store
            .save(
                &root,
                Some(&first.revision),
                serde_json::json!({"fontScale":90}).as_object().unwrap(),
                101,
            )
            .unwrap();
        assert!(
            store
                .save(&root, Some(&first.revision), &Map::new(), 102)
                .is_err()
        );
        assert!(store.recall(&root, 101 + AGE - 1).unwrap().is_some());
        assert!(store.recall(&root, 101 + AGE).unwrap().is_none());
        assert!(store.recall(&root, 0).unwrap().is_some());
        store.touch(&root, 0).unwrap();
        let list = store.list(102).unwrap();
        assert_eq!(list[0].last_activity_ms, "101");
        assert_eq!(store.reopen(&list[0].id, 102).unwrap(), root);
        store.forget(Some(&list[0].id), 102).unwrap();
        store.forget(Some(&list[0].id), 102).unwrap();
        assert!(store.list(102).unwrap().is_empty());
        assert_eq!(fs::read(root.join("keep")).unwrap(), b"original");
    }
    #[test]
    fn invalid_stores_are_never_reinitialized_and_native_paths_round_trip() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("history.sqlite3");
        for bytes in [vec![], b"not sqlite".to_vec()] {
            fs::write(&path, &bytes).unwrap();
            let store = History::new(Some(path.clone()), false);
            assert!(store.touch(temp.path(), 100).is_err());
            assert_eq!(fs::read(&path).unwrap(), bytes);
        }
        fs::remove_file(&path).unwrap();
        let db = Connection::open(&path).unwrap();
        db.pragma_update(None, "application_id", APPLICATION)
            .unwrap();
        db.pragma_update(None, "user_version", 2).unwrap();
        drop(db);
        let original = fs::read(&path).unwrap();
        assert!(
            History::new(Some(path.clone()), false)
                .touch(temp.path(), 100)
                .is_err()
        );
        assert_eq!(fs::read(&path).unwrap(), original);
        let (tag, bytes) = encode(temp.path());
        assert_eq!(decode(tag, &bytes).unwrap(), temp.path());
        assert!(!rusqlite::version().is_empty());
        assert!(rusqlite::version_number() >= 3_053_002);
    }
    #[test]
    fn recent_limit_ordering_and_bounded_expiry() {
        let temp = tempfile::tempdir().unwrap();
        let store = History::new(Some(temp.path().join("history.sqlite3")), false);
        for n in 0..280 {
            store
                .touch(&temp.path().join(n.to_string()), 100 + n)
                .unwrap();
        }
        let list = store.list(400).unwrap();
        assert_eq!(list.len(), 20);
        assert_eq!(list[0].last_activity_ms, "379");
        store.touch(&temp.path().join("new"), AGE + 1000).unwrap();
        let db = store.read().unwrap().unwrap();
        let count: i64 = db
            .query_row("SELECT count(*) FROM locations", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 25);
        assert_eq!(store.list(AGE + 1000).unwrap().len(), 1);
    }
    #[test]
    fn corrupted_selected_rows_and_busy_writers_preserve_prior_bytes() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("history.sqlite3");
        let store = History::new(Some(path.clone()), false);
        store.touch(temp.path(), 100).unwrap();
        let db = Connection::open(&path).unwrap();
        db.execute("UPDATE locations SET choices_json='broken'", [])
            .unwrap();
        drop(db);
        let before = fs::read(&path).unwrap();
        assert!(store.touch(temp.path(), 101).is_err());
        assert!(store.recall(temp.path(), 101).is_err());
        assert_eq!(fs::read(&path).unwrap(), before);
        let db = Connection::open(&path).unwrap();
        db.execute("UPDATE locations SET choices_json='{}'", [])
            .unwrap();
        db.execute_batch("BEGIN IMMEDIATE").unwrap();
        let start = std::time::Instant::now();
        assert!(store.touch(temp.path(), 102).is_err());
        assert!(start.elapsed() < Duration::from_secs(2));
        db.execute_batch("ROLLBACK").unwrap();
        let source: String = db
            .query_row("SELECT sqlite_source_id()", [], |r| r.get(0))
            .unwrap();
        assert!(source.len() > 40);
    }
    #[test]
    fn canonical_aliases_follow_the_actual_filesystem() {
        let temp = tempfile::tempdir().unwrap();
        let mixed = temp.path().join("MiXeD");
        fs::create_dir(&mixed).unwrap();
        let canonical = fs::canonicalize(&mixed).unwrap();
        let dot = fs::canonicalize(mixed.join(".")).unwrap();
        assert_eq!(encode(&canonical), encode(&dot));
        if let Ok(alias) = fs::canonicalize(temp.path().join("mixed")) {
            assert_eq!(encode(&canonical), encode(&alias));
        } else {
            let distinct = temp.path().join("mixed");
            fs::create_dir(&distinct).unwrap();
            assert_ne!(
                encode(&canonical),
                encode(&fs::canonicalize(distinct).unwrap())
            );
        }
        #[cfg(windows)]
        {
            use std::{ffi::OsString, os::windows::ffi::OsStringExt};
            let path = PathBuf::from(OsString::from_wide(&[67, 58, 92, 0xd800]));
            let (tag, bytes) = encode(&path);
            assert_eq!(decode(tag, &bytes).unwrap(), path);
        }
        #[cfg(unix)]
        {
            use std::{ffi::OsString, os::unix::ffi::OsStringExt};
            let path = PathBuf::from(OsString::from_vec(vec![b'/', 0xff]));
            let (tag, bytes) = encode(&path);
            assert_eq!(decode(tag, &bytes).unwrap(), path);
        }
    }
    #[test]
    fn incompatible_native_encoding_is_preserved_before_activity_updates() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("history.sqlite3");
        let store = History::new(Some(path.clone()), false);
        store.touch(temp.path(), 100).unwrap();
        let db = Connection::open(&path).unwrap();
        db.execute("UPDATE locations SET path_encoding='future-native'", [])
            .unwrap();
        drop(db);
        let original = fs::read(&path).unwrap();
        assert!(store.touch(temp.path(), 101).is_err());
        assert_eq!(fs::read(&path).unwrap(), original);
    }
    #[test]
    fn reopening_an_expired_target_beyond_the_cleanup_batch_drops_its_choices() {
        let temp = tempfile::tempdir().unwrap();
        let store = History::new(Some(temp.path().join("history.sqlite3")), false);
        for n in 0..280 {
            store
                .touch(&temp.path().join(n.to_string()), 100 + n)
                .unwrap();
        }
        let target = temp.path().join("279");
        let before = store.recall(&target, 400).unwrap().unwrap();
        store
            .save(
                &target,
                Some(&before.revision),
                serde_json::json!({"fontScale":90}).as_object().unwrap(),
                400,
            )
            .unwrap();
        let prior = store.recall(&target, 400).unwrap().unwrap();
        store.touch(&target, AGE + 1000).unwrap();
        let recalled = store.recall(&target, AGE + 1000).unwrap().unwrap();
        assert!(
            recalled.choices.is_empty(),
            "Expired target choices were revived beyond the bounded cleanup batch"
        );
        assert_ne!(recalled.revision, prior.revision);
        let db = store.read().unwrap().unwrap();
        let count: i64 = db
            .query_row("SELECT count(*) FROM locations", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 24);
    }

    #[test]
    fn an_expired_target_cannot_be_saved_with_its_old_choices_revision() {
        let temp = tempfile::tempdir().unwrap();
        let store = History::new(Some(temp.path().join("history.sqlite3")), false);
        for n in 0..280 {
            store
                .touch(&temp.path().join(n.to_string()), 100 + n)
                .unwrap();
        }
        let target = temp.path().join("279");
        let row = store.recall(&target, 400).unwrap().unwrap();
        store
            .save(
                &target,
                Some(&row.revision),
                serde_json::json!({"fontScale":90}).as_object().unwrap(),
                400,
            )
            .unwrap();
        let row = store.recall(&target, 400).unwrap().unwrap();
        assert!(
            store
                .save(
                    &target,
                    Some(&row.revision),
                    serde_json::json!({"fontScale":90,"cardSize":"large"})
                        .as_object()
                        .unwrap(),
                    AGE + 1000
                )
                .is_err(),
            "A stale expired revision must not resurrect inherited choices"
        );
        assert!(store.recall(&target, AGE + 1000).unwrap().is_none());
    }
}
