// SPDX-License-Identifier: Apache-2.0
//! Bind retained input to the database Windows Installer is actually executing.
use crate::{FileRecord, hash};
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, os::windows::ffi::OsStrExt, path::Path, ptr};
#[link(name = "msi")]
unsafe extern "system" {
    fn MsiGetActiveDatabase(session: u32) -> u32;
    fn MsiDatabaseGetPrimaryKeysW(db: u32, table: *const u16, record: *mut u32) -> u32;
    fn MsiOpenDatabaseW(path: *const u16, persist: *const u16, out: *mut u32) -> u32;
    fn MsiCloseHandle(h: u32) -> u32;
    fn MsiCreateRecord(fields: u32) -> u32;
    fn MsiRecordSetStringW(record: u32, field: u32, value: *const u16) -> u32;
    fn MsiRecordSetStreamW(record: u32, field: u32, file: *const u16) -> u32;
    fn MsiDatabaseCommit(db: u32) -> u32;
    fn MsiDatabaseOpenViewW(db: u32, query: *const u16, out: *mut u32) -> u32;
    fn MsiViewExecute(view: u32, record: u32) -> u32;
    fn MsiViewFetch(view: u32, out: *mut u32) -> u32;
    fn MsiViewGetColumnInfo(view: u32, kind: i32, out: *mut u32) -> u32;
    fn MsiRecordGetFieldCount(record: u32) -> u32;
    fn MsiRecordIsNull(record: u32, field: u32) -> i32;
    fn MsiRecordGetStringW(record: u32, field: u32, value: *mut u16, size: *mut u32) -> u32;
    fn MsiRecordReadStream(record: u32, field: u32, data: *mut u8, size: *mut u32) -> u32;
    fn MsiDatabaseIsTablePersistentW(db: u32, table: *const u16) -> i32;
    fn MsiGetSummaryInformationW(db: u32, path: *const u16, count: u32, out: *mut u32) -> u32;
    fn MsiSummaryInfoGetPropertyW(
        summary: u32,
        property: u32,
        kind: *mut u32,
        integer: *mut i32,
        time: *mut std::ffi::c_void,
        value: *mut u16,
        size: *mut u32,
    ) -> u32;
}
const MANIFEST_STREAM: &str = "LMG.AuthorizedSource.v1";
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct Manifest {
    format_version: u32,
    content: BTreeMap<String, String>,
}
struct Handle(u32);
impl Drop for Handle {
    fn drop(&mut self) {
        unsafe {
            MsiCloseHandle(self.0);
        }
    }
}
fn wide(s: impl AsRef<std::ffi::OsStr>) -> Vec<u16> {
    s.as_ref().encode_wide().chain(Some(0)).collect()
}
fn checked(code: u32, operation: &str) -> Result<(), String> {
    if code == 0 {
        Ok(())
    } else {
        Err(format!("MSI source authentication {operation}: {code}"))
    }
}
fn text(record: u32, field: u32) -> Result<String, String> {
    let mut buffer = vec![0u16; 32768];
    let mut size = buffer.len() as u32;
    checked(
        unsafe { MsiRecordGetStringW(record, field, buffer.as_mut_ptr(), &mut size) },
        "field",
    )?;
    if size as usize >= buffer.len() {
        return Err("Oversized MSI source field".into());
    }
    String::from_utf16(&buffer[..size as usize]).map_err(|e| e.to_string())
}
fn view(db: u32, query: &str) -> Result<Handle, String> {
    let mut h = 0;
    checked(
        unsafe { MsiDatabaseOpenViewW(db, wide(query).as_ptr(), &mut h) },
        "view",
    )?;
    let h = Handle(h);
    checked(unsafe { MsiViewExecute(h.0, 0) }, "query")?;
    Ok(h)
}
fn next(view: u32) -> Result<Option<Handle>, String> {
    let mut h = 0;
    let code = unsafe { MsiViewFetch(view, &mut h) };
    if code == 259 {
        return Ok(None);
    }
    checked(code, "row")?;
    Ok(Some(Handle(h)))
}
fn identifier(value: &str) -> Result<(), String> {
    if value.is_empty()
        || value.len() > 72
        || !value
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'_')
    {
        return Err("Unsupported MSI source identifier".into());
    }
    Ok(())
}
fn table_digest(db: u32, table: &str) -> Result<String, String> {
    identifier(table)?;
    let q = char::from(96);
    // In-memory costing adds temporary columns to tables such as Feature.
    // _Columns describes the persisted package schema, so project only those.
    let columns = if matches!(table, "_Streams" | "_Storages") {
        vec!["Name".to_owned(), "Data".to_owned()]
    } else {
        let metadata = view(
            db,
            &format!(
                "SELECT {q}Name{q} FROM {q}_Columns{q} WHERE {q}Table{q}='{table}' ORDER BY {q}Number{q}"
            ),
        )?;
        let mut columns = Vec::new();
        while let Some(record) = next(metadata.0)? {
            let name = text(record.0, 1)?;
            identifier(&name)?;
            columns.push(name);
        }
        columns
    };
    if columns.is_empty() || columns.len() > 256 {
        return Err("Unsupported persistent MSI schema".into());
    }
    let projection = columns
        .iter()
        .map(|name| format!("{q}{name}{q}"))
        .collect::<Vec<_>>()
        .join(",");
    let view = view(db, &format!("SELECT {projection} FROM {q}{table}{q}"))?;
    let mut columns = 0;
    checked(
        unsafe { MsiViewGetColumnInfo(view.0, 1, &mut columns) },
        "columns",
    )?;
    let columns = Handle(columns);
    let count = unsafe { MsiRecordGetFieldCount(columns.0) };
    if count == 0 || count > 256 {
        return Err("Unsupported MSI source column count".into());
    }
    let types = (1..=count)
        .map(|i| text(columns.0, i))
        .collect::<Result<Vec<_>, _>>()?;
    let mut names = 0;
    checked(
        unsafe { MsiViewGetColumnInfo(view.0, 0, &mut names) },
        "column names",
    )?;
    let names = Handle(names);
    let names = (1..=count)
        .map(|i| text(names.0, i))
        .collect::<Result<Vec<_>, _>>()?;
    let keys = if matches!(table, "_Streams" | "_Storages") {
        vec!["Name".to_owned()]
    } else {
        let mut record = 0;
        checked(
            unsafe { MsiDatabaseGetPrimaryKeysW(db, wide(table).as_ptr(), &mut record) },
            "primary keys",
        )?;
        let record = Handle(record);
        (1..=unsafe { MsiRecordGetFieldCount(record.0) })
            .map(|field| text(record.0, field))
            .collect::<Result<Vec<_>, _>>()?
    };
    let mut rows = Vec::<[u8; 32]>::new();
    while let Some(record) = next(view.0)? {
        if table == "_Streams" && text(record.0, 1)? == MANIFEST_STREAM {
            continue;
        }
        if rows.len() >= 200000 {
            return Err("Oversized MSI source table".into());
        }
        let mut row = Sha256::new();
        for (index, kind) in types.iter().enumerate() {
            let field = index as u32 + 1;
            if unsafe { MsiRecordIsNull(record.0, field) } != 0 {
                row.update([0]);
                continue;
            }
            row.update([1]);
            if kind.to_ascii_lowercase().starts_with('v') {
                let mut stream = Sha256::new();
                let mut total = 0u64;
                let mut buffer = vec![0u8; 65536];
                loop {
                    let mut size = buffer.len() as u32;
                    checked(
                        unsafe {
                            MsiRecordReadStream(record.0, field, buffer.as_mut_ptr(), &mut size)
                        },
                        "stream",
                    )?;
                    if size == 0 {
                        break;
                    }
                    total += u64::from(size);
                    if total > 1073741824 {
                        return Err("Oversized MSI source stream".into());
                    }
                    stream.update(&buffer[..size as usize]);
                }
                row.update(total.to_le_bytes());
                row.update(stream.finalize());
            } else {
                let value = text(record.0, field)?;
                row.update((value.len() as u64).to_le_bytes());
                row.update(value.as_bytes());
            }
        }
        rows.push(row.finalize().into());
    }
    rows.sort();
    let mut digest = Sha256::new();
    digest.update(serde_json::to_vec(&(names, types, keys)).map_err(|e| e.to_string())?);
    digest.update((rows.len() as u64).to_le_bytes());
    for row in rows {
        digest.update(row);
    }
    Ok(hex::encode(digest.finalize()))
}
fn identity(db: u32) -> Result<BTreeMap<String, String>, String> {
    let tables = view(db, "SELECT \x60Name\x60 FROM \x60_Tables\x60")?;
    let mut identity = BTreeMap::new();
    while let Some(record) = next(tables.0)? {
        let name = text(record.0, 1)?;
        if unsafe { MsiDatabaseIsTablePersistentW(db, wide(&name).as_ptr()) } == 1 {
            if identity.len() >= 256 {
                return Err("Oversized MSI source database".into());
            }
            identity.insert(name.clone(), table_digest(db, &name)?);
        }
    }
    // Streams include cabinets and custom-action binaries; storages carry transforms.
    for name in ["_Streams", "_Storages"] {
        identity.insert(name.into(), table_digest(db, name)?);
    }
    let mut summary = 0;
    checked(
        unsafe { MsiGetSummaryInformationW(db, ptr::null(), 0, &mut summary) },
        "summary",
    )?;
    let summary = Handle(summary);
    for property in [7, 9, 14, 15] {
        let mut kind = 0;
        let mut integer = 0;
        let mut time = 0u64;
        let mut buffer = vec![0u16; 32768];
        let mut size = buffer.len() as u32;
        checked(
            unsafe {
                MsiSummaryInfoGetPropertyW(
                    summary.0,
                    property,
                    &mut kind,
                    &mut integer,
                    (&mut time as *mut u64).cast(),
                    buffer.as_mut_ptr(),
                    &mut size,
                )
            },
            "summary field",
        )?;
        let value = String::from_utf16(&buffer[..size as usize]).map_err(|e| e.to_string())?;
        identity.insert(
            format!("summary:{property}"),
            format!("{kind}:{integer}:{time}:{value}"),
        );
    }
    Ok(identity)
}
fn database(file: &Path, write: bool) -> Result<Handle, String> {
    let mut raw = 0;
    checked(
        unsafe {
            MsiOpenDatabaseW(
                wide(file).as_ptr(),
                if write {
                    ptr::without_provenance(1)
                } else {
                    ptr::null()
                },
                &mut raw,
            )
        },
        "database",
    )?;
    Ok(Handle(raw))
}
fn manifest(db: u32) -> Result<Vec<u8>, String> {
    let q = char::from(96);
    let rows = view(
        db,
        &format!("SELECT {q}Data{q} FROM {q}_Streams{q} WHERE {q}Name{q}='{MANIFEST_STREAM}'"),
    )?;
    let record = next(rows.0)?.ok_or("The active MSI has no authenticated source manifest")?;
    let mut bytes = Vec::new();
    let mut buffer = [0u8; 65536];
    loop {
        let mut size = buffer.len() as u32;
        checked(
            unsafe { MsiRecordReadStream(record.0, 1, buffer.as_mut_ptr(), &mut size) },
            "manifest",
        )?;
        if size == 0 {
            break;
        }
        if bytes.len() + size as usize > 1048576 {
            return Err("Oversized MSI source manifest".into());
        }
        bytes.extend_from_slice(&buffer[..size as usize]);
    }
    if next(rows.0)?.is_some() {
        return Err("Duplicate MSI source manifest".into());
    }
    Ok(bytes)
}
fn verify(db: u32, expected: &[u8]) -> Result<(), String> {
    if manifest(db)? != expected {
        return Err("MSI source manifest differs from the active authorized installation".into());
    }
    let authorized: Manifest = serde_json::from_slice(expected).map_err(|e| e.to_string())?;
    if authorized.format_version != 1 || authorized.content != identity(db)? {
        return Err("Installation source content differs from the active authorized MSI manifest; retry the intact original MSI".into());
    }
    Ok(())
}
/// Final build step: bind every persisted table/schema, cabinet, code stream,
/// embedded storage and execution-critical summary field. Only this exact
/// manifest stream is excluded from its own digest, then verified separately.
pub fn seal(source: &Path) -> Result<(), String> {
    let db = database(source, true)?;
    let q = char::from(96);
    drop(view(
        db.0,
        &format!("DELETE FROM {q}_Streams{q} WHERE {q}Name{q}='{MANIFEST_STREAM}'"),
    )?);
    let expected = serde_json::to_vec(&Manifest {
        format_version: 1,
        content: identity(db.0)?,
    })
    .map_err(|e| e.to_string())?;
    let temp = std::env::temp_dir().join(format!(
        "lmg-msi-manifest-{}-{}",
        std::process::id(),
        hash(source.as_os_str().as_encoded_bytes())
    ));
    let mut input = fs::OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temp)
        .map_err(|e| e.to_string())?;
    use std::io::Write;
    input
        .write_all(&expected)
        .and_then(|_| input.sync_all())
        .map_err(|e| e.to_string())?;
    drop(input);
    let result: Result<(), String> = (|| {
        let record = Handle(unsafe { MsiCreateRecord(2) });
        checked(
            unsafe { MsiRecordSetStringW(record.0, 1, wide(MANIFEST_STREAM).as_ptr()) },
            "manifest name",
        )?;
        checked(
            unsafe { MsiRecordSetStreamW(record.0, 2, wide(&temp).as_ptr()) },
            "manifest bytes",
        )?;
        let mut raw = 0;
        checked(
            unsafe {
                MsiDatabaseOpenViewW(
                    db.0,
                    wide(format!(
                        "INSERT INTO {q}_Streams{q} ({q}Name{q},{q}Data{q}) VALUES (?,?)"
                    ))
                    .as_ptr(),
                    &mut raw,
                )
            },
            "manifest insert view",
        )?;
        let insert = Handle(raw);
        checked(
            unsafe { MsiViewExecute(insert.0, record.0) },
            "manifest insert",
        )?;
        checked(unsafe { MsiDatabaseCommit(db.0) }, "manifest commit")?;
        Ok(())
    })();
    let cleanup = fs::remove_file(&temp).map_err(|e| e.to_string());
    result?;
    cleanup?;
    drop(db);
    verify(database(source, false)?.0, &expected)
}
pub fn manifest_identity(source: &Path) -> Result<String, String> {
    let db = database(source, false)?;
    let expected = manifest(db.0)?;
    verify(db.0, &expected)?;
    Ok(hash(&expected))
}
/// Read expected authority from the database already executing, never from its
/// potentially writable OriginalDatabase path. Seal exact source bytes only
/// after canonical authored content and identical manifest have been verified.
pub(crate) fn authenticate(session: u32, source: &Path) -> Result<FileRecord, String> {
    let active = Handle(unsafe { MsiGetActiveDatabase(session) });
    if active.0 == 0 {
        return Err("Active installation database is unavailable".into());
    }
    let expected = manifest(active.0)?;
    let _parents =
        crate::private::pin_physical(source.parent().ok_or("Missing MSI source parent")?)?;
    crate::check_path(source)?;
    use std::io::Read;
    use std::os::windows::fs::{MetadataExt, OpenOptionsExt};
    let mut input = fs::OpenOptions::new()
        .read(true)
        .share_mode(1)
        .custom_flags(0x00200000)
        .open(source)
        .map_err(|e| e.to_string())?;
    let metadata = input.metadata().map_err(|e| e.to_string())?;
    if !metadata.is_file() || metadata.file_attributes() & 0x400 != 0 || metadata.len() > 1073741824
    {
        return Err("Invalid MSI source size/type".into());
    }
    let expected_size = metadata.len();
    let mut digest = Sha256::new();
    let mut total = 0u64;
    let mut buffer = [0u8; 65536];
    loop {
        let size = input.read(&mut buffer).map_err(|e| e.to_string())?;
        if size == 0 {
            break;
        }
        total += size as u64;
        if total > expected_size {
            return Err("MSI source grew during authentication".into());
        }
        digest.update(&buffer[..size]);
    }
    if total != expected_size {
        return Err("MSI source extent changed during authentication".into());
    }
    let record = FileRecord {
        path: "application.msi".into(),
        bytes: total.to_string(),
        sha256: hex::encode(digest.finalize()),
    };
    // The original opened handle stays live, denying writes/deletes throughout
    // database verification. No untrusted whole-file allocation is required.
    verify(database(source, false)?.0, &expected)?;
    Ok(record)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn mutate(db: u32, sql: &str) {
        drop(view(db, sql).unwrap());
        checked(unsafe { MsiDatabaseCommit(db) }, "test commit").unwrap();
    }
    #[test]
    #[ignore = "Requires an actual authored MSI; elected in native package CI"]
    fn actual_native_authorized_source_rejects_same_guid_database_substitution() {
        let pairs: Vec<[std::path::PathBuf; 2]> = serde_json::from_str(
            &std::env::var("GALLERY_MSI_LAYOUT_PAIRS").expect("Explicit MSI input required"),
        )
        .unwrap();
        let original = &pairs.first().unwrap()[0];
        let temp = tempfile::tempdir().unwrap();
        let changed = temp.path().join("same-identity.msi");
        fs::copy(original, &changed).unwrap();
        seal(&changed).unwrap();
        let expected = manifest(database(&changed, false).unwrap().0).unwrap();
        verify(database(&changed, false).unwrap().0, &expected).unwrap();
        let before = crate::native::inspect_package(&changed).unwrap();
        {
            let db = database(&changed, true).unwrap();
            mutate(
                db.0,
                "UPDATE \x60CustomAction\x60 SET \x60Target\x60='SubstitutedCode' WHERE \x60Action\x60='Configure'",
            );
        }
        assert_eq!(crate::native::inspect_package(&changed).unwrap(), before);
        assert!(verify(database(&changed, false).unwrap().0, &expected).is_err());
        let stream = temp.path().join("substituted.bin");
        fs::write(&stream, b"substituted stream bytes").unwrap();
        for name in ["Binary.Ownership".to_owned(), {
            let db = database(&changed, false).unwrap();
            let media = view(db.0, "SELECT \x60Cabinet\x60 FROM \x60Media\x60").unwrap();
            text(next(media.0).unwrap().unwrap().0, 1)
                .unwrap()
                .trim_start_matches('#')
                .to_owned()
        }] {
            seal(&changed).unwrap();
            let expected = manifest(database(&changed, false).unwrap().0).unwrap();
            {
                let db = database(&changed, true).unwrap();
                let record = Handle(unsafe { MsiCreateRecord(1) });
                checked(
                    unsafe { MsiRecordSetStreamW(record.0, 1, wide(&stream).as_ptr()) },
                    "substitution fixture",
                )
                .unwrap();
                let query = format!(
                    "UPDATE \x60_Streams\x60 SET \x60Data\x60=? WHERE \x60Name\x60='{}'",
                    name.replace(char::from(39), "''")
                );
                let mut raw = 0;
                checked(
                    unsafe { MsiDatabaseOpenViewW(db.0, wide(query).as_ptr(), &mut raw) },
                    "substitution view",
                )
                .unwrap();
                let update = Handle(raw);
                checked(
                    unsafe { MsiViewExecute(update.0, record.0) },
                    "substitution update",
                )
                .unwrap();
                checked(unsafe { MsiDatabaseCommit(db.0) }, "substitution commit").unwrap();
            }
            assert!(
                verify(database(&changed, false).unwrap().0, &expected).is_err(),
                "{name}"
            );
            assert_eq!(crate::native::inspect_package(&changed).unwrap(), before);
        }
        // A later source replacement after authentication also fails the sealed
        // complete-file hash, before deferred retention opens or publishes bytes.
        let bytes = fs::read(original).unwrap();
        let record = FileRecord {
            path: "application.msi".into(),
            bytes: bytes.len().to_string(),
            sha256: hash(&bytes),
        };
        assert!(crate::open_verified_input(&changed, &record).is_err());
        let original_expected = manifest(database(original, false).unwrap().0).unwrap();
        verify(database(original, false).unwrap().0, &original_expected).unwrap();
    }
}
