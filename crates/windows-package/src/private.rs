// SPDX-License-Identifier: Apache-2.0
//! Atomic private updater storage. Existing recovery authority is validated, never repaired.
use std::{
    collections::BTreeSet,
    ffi::{OsStr, c_void},
    fs::File,
    os::windows::{
        ffi::OsStrExt,
        io::{AsRawHandle, FromRawHandle},
    },
    path::{Component, Path, PathBuf},
    ptr,
};
type Result<T> = std::result::Result<T, String>;
#[repr(C)]
struct Attributes {
    length: u32,
    descriptor: *mut c_void,
    inherit: i32,
}
#[repr(C)]
struct Acl {
    revision: u8,
    reserved: u8,
    size: u16,
    count: u16,
    reserved2: u16,
}
#[repr(C)]
struct Ace {
    kind: u8,
    flags: u8,
    size: u16,
    mask: u32,
    sid: u32,
}
#[link(name = "advapi32")]
unsafe extern "system" {
    fn OpenProcessToken(process: *mut c_void, access: u32, token: *mut *mut c_void) -> i32;
    fn OpenThreadToken(
        thread: *mut c_void,
        access: u32,
        open_as_self: i32,
        token: *mut *mut c_void,
    ) -> i32;
    fn GetTokenInformation(
        token: *mut c_void,
        kind: u32,
        data: *mut c_void,
        length: u32,
        needed: *mut u32,
    ) -> i32;
    fn ConvertSidToStringSidW(sid: *const c_void, text: *mut *mut u16) -> i32;
    fn ConvertStringSidToSidW(text: *const u16, sid: *mut *mut c_void) -> i32;
    fn ConvertStringSecurityDescriptorToSecurityDescriptorW(
        text: *const u16,
        revision: u32,
        descriptor: *mut *mut c_void,
        size: *mut u32,
    ) -> i32;
    fn GetSecurityInfo(
        handle: *mut c_void,
        kind: u32,
        information: u32,
        owner: *mut *mut c_void,
        group: *mut *mut c_void,
        dacl: *mut *mut Acl,
        sacl: *mut *mut Acl,
        descriptor: *mut *mut c_void,
    ) -> u32;
    fn GetSecurityDescriptorControl(
        descriptor: *const c_void,
        control: *mut u16,
        revision: *mut u32,
    ) -> i32;
    fn GetAce(acl: *const Acl, index: u32, ace: *mut *mut c_void) -> i32;
    fn CheckTokenMembership(token: *mut c_void, sid: *const c_void, member: *mut i32) -> i32;
}
#[link(name = "kernel32")]
unsafe extern "system" {
    fn GetCurrentProcess() -> *mut c_void;
    fn GetCurrentThread() -> *mut c_void;
    fn CloseHandle(handle: *mut c_void) -> i32;
    fn LocalFree(memory: *mut c_void) -> *mut c_void;
    fn CreateDirectoryW(path: *const u16, attributes: *const Attributes) -> i32;
    fn CreateFileW(
        path: *const u16,
        access: u32,
        share: u32,
        attributes: *const Attributes,
        creation: u32,
        flags: u32,
        template: *mut c_void,
    ) -> *mut c_void;
}
struct Memory(*mut c_void);
impl Drop for Memory {
    fn drop(&mut self) {
        unsafe {
            LocalFree(self.0);
        }
    }
}
struct Handle(*mut c_void);
impl Drop for Handle {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.0);
        }
    }
}
fn wide(s: impl AsRef<OsStr>) -> Vec<u16> {
    s.as_ref().encode_wide().chain(Some(0)).collect()
}
fn error() -> String {
    std::io::Error::last_os_error().to_string()
}
fn token() -> Result<Handle> {
    let mut h = ptr::null_mut();
    if unsafe { OpenThreadToken(GetCurrentThread(), 8, 1, &mut h) } == 0 {
        let e = std::io::Error::last_os_error();
        if e.raw_os_error() != Some(1008) {
            return Err(e.to_string());
        }
        if unsafe { OpenProcessToken(GetCurrentProcess(), 8, &mut h) } == 0 {
            return Err(error());
        }
    }
    Ok(Handle(h))
}
fn sid_text(sid: *const c_void) -> Result<String> {
    let mut text = ptr::null_mut();
    if sid.is_null() || unsafe { ConvertSidToStringSidW(sid, &mut text) } == 0 {
        return Err(error());
    }
    let _memory = Memory(text.cast());
    let mut length = 0;
    unsafe {
        while *text.add(length) != 0 {
            length += 1;
            if length > 256 {
                return Err("Oversized SID".into());
            }
        }
        String::from_utf16(std::slice::from_raw_parts(text, length)).map_err(|e| e.to_string())
    }
}
fn user() -> Result<String> {
    let t = token()?;
    let mut needed = 0;
    unsafe {
        GetTokenInformation(t.0, 1, ptr::null_mut(), 0, &mut needed);
    };
    if needed == 0 || needed > 65536 {
        return Err("Cannot identify effective updater owner".into());
    }
    let mut data = vec![0u8; needed as usize];
    if unsafe { GetTokenInformation(t.0, 1, data.as_mut_ptr().cast(), needed, &mut needed) } == 0 {
        return Err(error());
    }
    let sid = unsafe { ptr::read_unaligned(data.as_ptr().cast::<*const c_void>()) };
    sid_text(sid)
}
pub fn elevated_administrator() -> Result<bool> {
    let mut sid = ptr::null_mut();
    if unsafe { ConvertStringSidToSidW(wide("S-1-5-32-544").as_ptr(), &mut sid) } == 0 {
        return Err(error());
    }
    let _memory = Memory(sid);
    let mut member = 0;
    if unsafe { CheckTokenMembership(ptr::null_mut(), sid, &mut member) } == 0 {
        return Err(error());
    }
    let t = token()?;
    let mut elevated = 0u32;
    let mut needed = 0;
    if unsafe { GetTokenInformation(t.0, 20, (&mut elevated as *mut u32).cast(), 4, &mut needed) }
        == 0
    {
        return Err(error());
    }
    Ok(member != 0 && elevated != 0)
}
fn principals(machine: bool) -> Result<(String, BTreeSet<String>)> {
    if machine && !elevated_administrator()? {
        return Err("Machine update storage requires prior administrator elevation".into());
    }
    let owner = if machine {
        "S-1-5-32-544".into()
    } else {
        user()?
    };
    let mut set = BTreeSet::from(["S-1-5-18".into(), "S-1-5-32-544".into()]);
    if !machine {
        set.insert(owner.clone());
    }
    Ok((owner, set))
}
fn descriptor(machine: bool, directory: bool) -> Result<Memory> {
    let (owner, sids) = principals(machine)?;
    let flags = if directory { "OICI" } else { "" };
    let aces = sids
        .iter()
        .map(|sid| format!("(A;{flags};FA;;;{sid})"))
        .collect::<String>();
    let text = format!("O:{owner}D:P{aces}");
    let mut sd = ptr::null_mut();
    if unsafe {
        ConvertStringSecurityDescriptorToSecurityDescriptorW(
            wide(text).as_ptr(),
            1,
            &mut sd,
            ptr::null_mut(),
        )
    } == 0
    {
        return Err(error());
    }
    Ok(Memory(sd))
}
fn open(path: &Path, directory: bool) -> Result<File> {
    let h = unsafe {
        CreateFileW(
            wide(path).as_ptr(),
            0x20000 | 0x80,
            3,
            ptr::null(),
            3,
            0x00200000 | if directory { 0x02000000 } else { 0 },
            ptr::null_mut(),
        )
    };
    if h as isize == -1 {
        return Err(error());
    }
    let file = unsafe { File::from_raw_handle(h) };
    use std::os::windows::fs::MetadataExt;
    let m = file.metadata().map_err(|e| e.to_string())?;
    if m.file_attributes() & 0x400 != 0 || m.is_dir() != directory {
        return Err("Redirected or wrong-type updater authority".into());
    }
    Ok(file)
}
fn security(file: &File, machine: bool, strict: bool, directory: bool) -> Result<()> {
    let (expected, allowed) = principals(machine)?;
    let mut owner = ptr::null_mut();
    let mut acl = ptr::null_mut();
    let mut sd = ptr::null_mut();
    let r = unsafe {
        GetSecurityInfo(
            file.as_raw_handle(),
            1,
            1 | 4,
            &mut owner,
            ptr::null_mut(),
            &mut acl,
            ptr::null_mut(),
            &mut sd,
        )
    };
    if r != 0 {
        return Err(format!("Cannot inspect updater ACL: {r}"));
    }
    let _memory = Memory(sd);
    let actual = sid_text(owner)?;
    if strict {
        if actual != expected {
            return Err("Updater authority owner changed".into());
        }
    } else if !allowed.contains(&actual)
        && actual != "S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464"
    {
        return Err("Untrusted owner in update-storage ancestry".into());
    }
    if acl.is_null() {
        return Err("Updater storage has a null DACL".into());
    }
    let mut control = 0;
    let mut revision = 0;
    if unsafe { GetSecurityDescriptorControl(sd, &mut control, &mut revision) } == 0 {
        return Err(error());
    }
    if control & 4 == 0 || (strict && control & 0x1000 == 0) {
        return Err("Updater authority DACL is not protected".into());
    }
    let count = unsafe { (*acl).count };
    let mut found = BTreeSet::new();
    for index in 0..u32::from(count) {
        let mut raw = ptr::null_mut();
        if unsafe { GetAce(acl, index, &mut raw) } == 0 {
            return Err(error());
        }
        let ace = unsafe { &*raw.cast::<Ace>() };
        if !strict && ace.flags & 8 != 0 {
            continue;
        } // Inherit-only rights do not apply to this existing parent.
        if ace.kind == 1 && !strict {
            continue;
        } // Deny ACEs cannot grant mutation rights.
        if ace.kind != 0 || ace.size < 12 {
            return Err("Unsupported updater-storage ACE".into());
        }
        let sid = sid_text(unsafe { raw.cast::<u8>().add(8).cast() })?;
        if strict {
            if !allowed.contains(&sid)
                || ace.mask != 0x1f01ff
                || ace.flags != if directory { 3 } else { 0 }
                || !found.insert(sid)
            {
                return Err("Updater authority ACL changed".into());
            }
        } else if !allowed.contains(&sid)
            && sid != "S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464"
            && ace.mask & (0x40 | 0x10000 | 0x40000 | 0x80000 | 0x10000000 | 0x40000000) != 0
        {
            return Err(format!(
                "Untrusted mutation rights in update-storage ancestry (SID {sid}, mask {:08x}, flags {:02x})",
                ace.mask, ace.flags
            ));
        }
    }
    if strict && found != allowed {
        return Err("Updater authority ACL principals changed".into());
    }
    Ok(())
}
fn parents(path: &Path, machine: bool) -> Result<Vec<File>> {
    if !path.is_absolute() {
        return Err("Updater storage must be absolute".into());
    }
    let mut current = PathBuf::new();
    let mut handles = vec![];
    for component in path.components() {
        if matches!(component, Component::ParentDir | Component::CurDir) {
            return Err("Dot paths are not updater authority".into());
        }
        current.push(component);
        if matches!(component, Component::Prefix(_)) {
            continue;
        }
        let file = open(&current, true)?;
        security(&file, machine, false, true)
            .map_err(|error| format!("{}: {error}", current.display()))?;
        handles.push(file);
    }
    Ok(handles)
}
fn create_one(path: &Path, machine: bool) -> Result<()> {
    let sd = descriptor(machine, true)?;
    let attributes = Attributes {
        length: std::mem::size_of::<Attributes>() as u32,
        descriptor: sd.0,
        inherit: 0,
    };
    if unsafe { CreateDirectoryW(wide(path).as_ptr(), &attributes) } == 0 {
        return Err(error());
    }
    Ok(())
}
pub fn create_directory(path: &Path, machine: bool) -> Result<Vec<File>> {
    let parent = path.parent().ok_or("Missing updater storage parent")?;
    let handles = parents(parent, machine)?;
    create_one(path, machine)?;
    let file = open(path, true)?;
    security(&file, machine, true, true)?;
    let mut handles = handles;
    handles.push(file);
    Ok(handles)
}
pub fn validate_directory(path: &Path, machine: bool) -> Result<Vec<File>> {
    let mut handles = parents(path.parent().ok_or("Missing storage parent")?, machine)?;
    let file = open(path, true)?;
    security(&file, machine, true, true)?;
    handles.push(file);
    Ok(handles)
}
pub fn context(path: &Path) -> Result<bool> {
    let file = open(path, true)?;
    if security(&file, false, true, true).is_ok() {
        return Ok(false);
    }
    security(&file, true, true, true)?;
    Ok(true)
}
pub fn child_directory(path: &Path) -> Result<()> {
    let parent = path.parent().ok_or("Missing private parent")?;
    let mode = context(parent)?;
    create_one(path, mode)?;
    let file = open(path, true)?;
    security(&file, mode, true, true)
}
pub fn child_directories(path: &Path) -> Result<()> {
    if path.exists() {
        context(path)?;
        return Ok(());
    }
    let parent = path.parent().ok_or("Missing private parent")?;
    child_directories(parent)?;
    child_directory(path)
}
pub fn create_file(path: &Path) -> Result<File> {
    let parent = path.parent().ok_or("Missing private file parent")?;
    let machine = context(parent)?;
    let sd = descriptor(machine, false)?;
    let attributes = Attributes {
        length: std::mem::size_of::<Attributes>() as u32,
        descriptor: sd.0,
        inherit: 0,
    };
    let h = unsafe {
        CreateFileW(
            wide(path).as_ptr(),
            0xc0000000,
            7,
            &attributes,
            1,
            0x80 | 0x00200000,
            ptr::null_mut(),
        )
    };
    if h as isize == -1 {
        return Err(error());
    }
    let file = unsafe { File::from_raw_handle(h) };
    security(&file, machine, true, false)?;
    Ok(file)
}
pub fn validate_file(path: &Path, machine: bool) -> Result<()> {
    let file = open(path, false)?;
    security(&file, machine, true, false)
}
pub fn storage_root(machine: bool) -> Result<PathBuf> {
    let base = crate::native::known_folder(if machine {
        &windows::Win32::UI::Shell::FOLDERID_ProgramData
    } else {
        &windows::Win32::UI::Shell::FOLDERID_Profile
    })?;
    let handles = parents(&base, machine)?;
    let root = base.join(if machine {
        "LocalMediaGalleryUpdates"
    } else {
        ".local-media-gallery-updates"
    });
    if !root.exists()
        && let Err(error) = create_one(&root, machine)
        && !root.exists()
    {
        return Err(error);
    }
    let file = open(&root, true)?;
    security(&file, machine, true, true)?;
    let _ = handles;
    Ok(root)
}
pub fn coordination_file(key: &str, machine: bool) -> Result<File> {
    let root = storage_root(machine)?;
    let path = root.join(key);
    let _pins = validate_directory(&root, machine)?;
    let sd = descriptor(machine, false)?;
    let attributes = Attributes {
        length: std::mem::size_of::<Attributes>() as u32,
        descriptor: sd.0,
        inherit: 0,
    };
    let h = unsafe {
        CreateFileW(
            wide(&path).as_ptr(),
            0xc0020000,
            3,
            &attributes,
            4,
            0x80 | 0x00200000,
            ptr::null_mut(),
        )
    };
    if h as isize == -1 {
        return Err(error());
    }
    let file = unsafe { File::from_raw_handle(h) };
    security(&file, machine, true, false)?;
    Ok(file)
}

pub fn lock_file(path: &Path, machine: bool) -> Result<File> {
    let parent = path.parent().ok_or("Missing lock parent")?;
    let _pins = validate_directory(parent, machine)?;
    let sd = descriptor(machine, false)?;
    let attributes = Attributes {
        length: std::mem::size_of::<Attributes>() as u32,
        descriptor: sd.0,
        inherit: 0,
    };
    let h = unsafe {
        CreateFileW(
            wide(path).as_ptr(),
            0xc0020000,
            3,
            &attributes,
            4,
            0x80 | 0x00200000,
            ptr::null_mut(),
        )
    };
    if h as isize == -1 {
        return Err(error());
    }
    let file = unsafe { File::from_raw_handle(h) };
    security(&file, machine, true, false)?;
    Ok(file)
}
/// Pin physical directory names without imposing an ACL policy on gallery content.
pub fn pin_physical(path: &Path) -> Result<Vec<File>> {
    if !path.is_absolute() {
        return Err("Use an absolute physical directory".into());
    }
    let mut at = PathBuf::new();
    let mut pins = vec![];
    for component in path.components() {
        if matches!(component, Component::ParentDir | Component::CurDir) {
            return Err("Dot paths are unsupported".into());
        }
        at.push(component);
        if matches!(component, Component::Prefix(_)) {
            continue;
        }
        let h = unsafe {
            CreateFileW(
                wide(&at).as_ptr(),
                0x80,
                3,
                ptr::null(),
                3,
                0x02200000,
                ptr::null_mut(),
            )
        };
        if h as isize == -1 {
            return Err(error());
        }
        let file = unsafe { File::from_raw_handle(h) };
        use std::os::windows::fs::MetadataExt;
        let info = file.metadata().map_err(|e| e.to_string())?;
        if !info.is_dir() || info.file_attributes() & 0x400 != 0 {
            return Err("Redirected physical directory".into());
        }
        pins.push(file);
    }
    Ok(pins)
}
pub fn ensure_storage_root(machine: bool) -> Result<PathBuf> {
    storage_root(machine)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn changed_recovery_acl_is_refused_without_repairing_or_changing_bytes() {
        #[link(name = "advapi32")]
        unsafe extern "system" {
            fn SetFileSecurityW(
                file: *const u16,
                information: u32,
                descriptor: *const c_void,
            ) -> i32;
        }
        let root = storage_root(false).unwrap();
        let temp = tempfile::Builder::new().tempdir_in(root).unwrap();
        let base = temp.path().join("private");
        let _pins = create_directory(&base, false).unwrap();
        let path = base.join("authority.json");
        {
            use std::io::Write;
            let mut file = create_file(&path).unwrap();
            file.write_all(b"retained authority bytes").unwrap();
            file.sync_all().unwrap();
        }
        validate_file(&path, false).unwrap();
        let mut raw = ptr::null_mut();
        assert_ne!(
            unsafe {
                ConvertStringSecurityDescriptorToSecurityDescriptorW(
                    wide(OsStr::new("D:P(A;;FA;;;WD)")).as_ptr(),
                    1,
                    &mut raw,
                    ptr::null_mut(),
                )
            },
            0
        );
        let changed = Memory(raw);
        assert_ne!(
            unsafe { SetFileSecurityW(wide(&path).as_ptr(), 0x80000004, changed.0) },
            0
        );
        assert!(validate_file(&path, false).is_err());
        assert_eq!(std::fs::read(&path).unwrap(), b"retained authority bytes");
        assert!(validate_file(&path, false).is_err());
    }
}
