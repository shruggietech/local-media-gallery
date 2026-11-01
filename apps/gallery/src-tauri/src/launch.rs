// SPDX-License-Identifier: Apache-2.0
use gallery_core::{GalleryError, NativePath, Snapshot};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    ffi::OsString,
    io::{Read, Write},
    net::{IpAddr, Ipv4Addr, SocketAddr, TcpListener, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    time::{Duration, Instant},
};
use uuid::Uuid;

pub const MAX_RECEIPT: usize = 16 * 1024;
const RECEIPT_ENV: &str = "LMG_STARTUP_RECEIPT";
pub const STARTUP_BUDGET: Duration = Duration::from_secs(30);

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Edition {
    Full,
    Lite,
}
pub fn identifier(selected: Edition) -> &'static str {
    match selected {
        Edition::Full => "tech.shruggie.local-media-gallery",
        Edition::Lite => "tech.shruggie.local-media-gallery.lite",
    }
}
pub fn shared_state_directory(directory: PathBuf) -> PathBuf {
    if directory
        .file_name()
        .is_some_and(|n| n == identifier(Edition::Lite))
    {
        directory.with_file_name(identifier(Edition::Full))
    } else {
        directory
    }
}
pub fn edition() -> Edition {
    if cfg!(feature = "lite") {
        Edition::Lite
    } else {
        Edition::Full
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Operation {
    Open,
    Resolve,
    Capabilities,
    Prepare,
    Diagnostics,
    Install,
    Help,
    Version,
    Refresh,
    Arguments,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Mode {
    Wait,
    Detach,
}
#[derive(Clone, Debug, Default)]
pub struct PreparationOptions {
    pub thumbnails: bool,
    pub clean_cache: bool,
    pub portable: bool,
    pub helper: Option<PathBuf>,
    pub helper_hash: Option<String>,
    pub diagnostics: bool,
}
#[derive(Clone, Debug)]
pub struct Request {
    pub preparation: PreparationOptions,
    pub operation: Operation,
    pub root: Option<PathBuf>,
    pub mode: Mode,
    pub json: bool,
}
pub fn requested_json(args: &[OsString]) -> bool {
    args.iter()
        .take_while(|a| *a != "--")
        .any(|a| a == "--json")
}
fn invalid(message: &str) -> GalleryError {
    GalleryError::new("invalid_arguments", message)
}
pub fn parse(args: Vec<OsString>) -> Result<Request, GalleryError> {
    let mut request = Request {
        preparation: PreparationOptions::default(),
        operation: Operation::Open,
        root: None,
        mode: Mode::Wait,
        json: false,
    };
    let mut ended = false;
    let mut named = false;
    let mut lifecycle = false;
    let mut args = args.into_iter();
    let mut preparation_flags = std::collections::HashSet::new();
    while let Some(arg) = args.next() {
        if !ended
            && [
                "--thumbnails",
                "--clean-cache",
                "--cache",
                "--ffmpeg",
                "--ffmpeg-sha256",
                "--diagnostics",
            ]
            .iter()
            .any(|s| arg == *s)
        {
            let flag = arg.to_str().unwrap().to_owned();
            if !preparation_flags.insert(flag.clone()) {
                return Err(invalid("Supply each preparation option once."));
            }
            match flag.as_str() {
                "--thumbnails" => request.preparation.thumbnails = true,
                "--clean-cache" => request.preparation.clean_cache = true,
                "--diagnostics" => request.preparation.diagnostics = true,
                "--cache" => {
                    let value = args
                        .next()
                        .ok_or_else(|| invalid("Supply local or portable after --cache."))?;
                    request.preparation.portable = match value.to_str() {
                        Some("portable") => true,
                        Some("local") => false,
                        _ => return Err(invalid("Cache must be local or portable.")),
                    };
                }
                "--ffmpeg" => {
                    request.preparation.helper = Some(PathBuf::from(
                        args.next()
                            .ok_or_else(|| invalid("Supply an absolute helper path."))?,
                    ))
                }
                "--ffmpeg-sha256" => {
                    request.preparation.helper_hash = Some(
                        args.next()
                            .and_then(|v| v.into_string().ok())
                            .filter(|v| v.len() == 64 && v.bytes().all(|b| b.is_ascii_hexdigit()))
                            .ok_or_else(|| invalid("Supply a 64-digit SHA256."))?
                            .to_ascii_lowercase(),
                    )
                }
                _ => unreachable!(),
            }
            continue;
        }
        if !ended && arg == "--" {
            ended = true;
            continue;
        }
        if !ended && arg == "--json" {
            if request.json {
                return Err(invalid("Supply --json once."));
            }
            request.json = true;
            continue;
        }
        if !ended && (arg == "--wait" || arg == "--detach") {
            if lifecycle {
                return Err(invalid("Choose one of --wait or --detach, once."));
            }
            lifecycle = true;
            request.mode = if arg == "--detach" {
                Mode::Detach
            } else {
                Mode::Wait
            };
            continue;
        }
        if !ended && (arg == "--help" || arg == "--version") {
            if named || request.root.is_some() {
                return Err(invalid(
                    "Help/version cannot be combined with another operation or directory.",
                ));
            }
            named = true;
            request.operation = if arg == "--help" {
                Operation::Help
            } else {
                Operation::Version
            };
            continue;
        }
        if !ended && arg.to_string_lossy().starts_with('-') {
            return Err(invalid(
                "Unknown option. Use --help or -- before a literal path.",
            ));
        }
        if !ended && !named && request.root.is_none() {
            let op = match arg.to_str() {
                Some("open") => Some(Operation::Open),
                Some("resolve") => Some(Operation::Resolve),
                Some("capabilities") => Some(Operation::Capabilities),
                Some("prepare") => Some(Operation::Prepare),
                Some("diagnostics") => Some(Operation::Diagnostics),
                Some("install") => Some(Operation::Install),
                _ => None,
            };
            if let Some(op) = op {
                request.operation = op;
                named = true;
                continue;
            }
        }
        if request.root.is_some() {
            return Err(invalid("Supply at most one directory."));
        }
        request.root = Some(PathBuf::from(arg));
    }
    if lifecycle && request.operation != Operation::Open {
        return Err(invalid("--wait/--detach apply only to open."));
    }
    if request.root.is_some()
        && !matches!(
            request.operation,
            Operation::Open | Operation::Resolve | Operation::Prepare
        )
    {
        return Err(invalid("This operation does not accept a directory."));
    }
    if !preparation_flags.is_empty() && request.operation != Operation::Prepare {
        return Err(invalid("Preparation flags apply only to prepare."));
    }
    if request.preparation.thumbnails && request.preparation.clean_cache {
        return Err(invalid("Choose generation or cleanup."));
    }
    if request.preparation.helper.is_some() != request.preparation.helper_hash.is_some()
        || request
            .preparation
            .helper
            .as_ref()
            .is_some_and(|p| !p.is_absolute())
    {
        return Err(invalid(
            "Supply an absolute --ffmpeg path and its --ffmpeg-sha256 together.",
        ));
    }
    Ok(request)
}

pub struct Placement {
    pub executable: PathBuf,
    pub appimage: Option<PathBuf>,
    pub appdir: Option<PathBuf>,
}
impl Placement {
    pub fn current() -> Result<Self, GalleryError> {
        Ok(Self { executable: std::env::current_exe().map_err(|e|GalleryError::new("placement_unavailable",format!("The invoked artifact location is unavailable: {e}. Supply an explicit directory.")))?, appimage: std::env::var_os("APPIMAGE").map(PathBuf::from),appdir:std::env::var_os("APPDIR").map(PathBuf::from) })
    }
}
fn placement_error() -> GalleryError {
    GalleryError::new(
        "placement_unavailable",
        "The external gallery location is unavailable or inconsistent. Supply an explicit directory outside the application bundle or package mount.",
    )
}
pub fn default_root(
    selected: Edition,
    os: &str,
    context: &Placement,
) -> Result<Option<PathBuf>, GalleryError> {
    if selected == Edition::Full {
        return Ok(None);
    }
    if os == "linux" && (context.appimage.is_some() || context.appdir.is_some()) {
        let origin = context.appimage.as_ref().ok_or_else(placement_error)?;
        let mount = context.appdir.as_ref().ok_or_else(placement_error)?;
        if !origin.is_absolute()
            || !mount.is_absolute()
            || !context.executable.starts_with(mount)
            || origin.starts_with(mount)
            || !origin.is_file()
        {
            return Err(placement_error());
        }
        return origin
            .parent()
            .map(|p| Some(p.to_path_buf()))
            .ok_or_else(placement_error);
    }
    // Apple provides no supported original-path recovery for translocated apps.
    // Known temporary placement must not become an implicit gallery. Real
    // external volumes remain valid; explicit roots are resolved before here.
    if os == "macos"
        && context
            .executable
            .components()
            .any(|c| c.as_os_str() == "AppTranslocation")
    {
        return Err(placement_error());
    }
    let parent = context.executable.parent().ok_or_else(placement_error)?;
    if os == "macos"
        && parent
            .file_name()
            .is_some_and(|n| n.eq_ignore_ascii_case("MacOS"))
    {
        let contents = parent.parent().ok_or_else(placement_error)?;
        let bundle = contents.parent().ok_or_else(placement_error)?;
        if contents
            .file_name()
            .is_none_or(|n| !n.eq_ignore_ascii_case("Contents"))
            || bundle
                .extension()
                .is_none_or(|n| !n.eq_ignore_ascii_case("app"))
        {
            return Err(placement_error());
        }
        return bundle
            .parent()
            .map(|p| Some(p.to_path_buf()))
            .ok_or_else(placement_error);
    }
    Ok(Some(parent.to_path_buf()))
}
pub fn resolve_root(
    selected: Edition,
    explicit: Option<PathBuf>,
    context: &Placement,
) -> Result<Option<PathBuf>, GalleryError> {
    if let Some(path) = explicit {
        return std::path::absolute(path).map(Some).map_err(|e| {
            GalleryError::new(
                "invalid_root",
                format!("The native directory could not be resolved: {e}"),
            )
        });
    }
    default_root(selected, std::env::consts::OS, context)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Accepted,
    Success,
    Running,
    Partial,
    Cancelled,
    Unavailable,
    Failed,
}
impl Status {
    pub fn exit_code(self) -> i32 {
        match self {
            Self::Accepted | Self::Success | Self::Running => 0,
            Self::Failed => 1,
            Self::Partial => 3,
            Self::Cancelled => 4,
            Self::Unavailable => 5,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Progress {
    pub entries_seen: String,
    pub media_seen: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OperationError {
    pub code: String,
    pub message: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OperationResult {
    pub product: String,
    pub format_version: u8,
    pub version: String,
    pub edition: Edition,
    pub os: String,
    pub arch: String,
    pub operation_id: String,
    pub operation: Operation,
    pub boundary: String,
    pub status: Status,
    pub error: Option<OperationError>,
    pub process_id: Option<String>,
    pub session_id: Option<String>,
    pub discovery_operation_id: Option<String>,
    pub root: Option<NativePath>,
    pub progress: Option<Progress>,
    pub data: Option<Value>,
}
impl OperationResult {
    pub fn new(operation: Operation, id: String, boundary: &str, status: Status) -> Self {
        Self {
            product: "local-media-gallery".into(),
            format_version: 1,
            version: env!("CARGO_PKG_VERSION").into(),
            edition: edition(),
            os: std::env::consts::OS.into(),
            arch: std::env::consts::ARCH.into(),
            operation_id: id,
            operation,
            boundary: boundary.into(),
            status,
            error: None,
            process_id: Some(std::process::id().to_string()),
            session_id: None,
            discovery_operation_id: None,
            root: None,
            progress: None,
            data: None,
        }
    }
    pub fn failure(operation: Operation, id: String, error: GalleryError) -> Self {
        let mut r = Self::new(
            operation,
            id,
            "request",
            if matches!(
                error.code.as_str(),
                "capability_unavailable" | "runtime_unavailable" | "display_unavailable"
            ) {
                Status::Unavailable
            } else {
                Status::Failed
            },
        );
        r.error = Some(OperationError {
            code: error.code,
            message: error.message,
        });
        r
    }
    pub fn exit_code(&self) -> i32 {
        match self.error.as_ref().map(|e| e.code.as_str()) {
            Some("invalid_arguments") => 2,
            Some("startup_timeout") => 6,
            _ => self.status.exit_code(),
        }
    }
}
pub fn discovery_result(snapshot: &Snapshot, id: &str) -> Result<OperationResult, GalleryError> {
    let d = snapshot
        .discovery
        .as_ref()
        .filter(|d| d.id == id)
        .ok_or_else(|| {
            GalleryError::new(
                "stale_operation",
                "This discovery operation is no longer current.",
            )
        })?;
    let status = match d.phase.as_str() {
        "opening" | "scanning" => Status::Running,
        "complete" => Status::Success,
        "partial" => Status::Partial,
        "cancelled" => Status::Cancelled,
        "unavailable" => Status::Unavailable,
        _ => Status::Failed,
    };
    let mut r = OperationResult::new(
        if d.kind == "refresh" {
            Operation::Refresh
        } else {
            Operation::Open
        },
        d.id.clone(),
        "discovery",
        status,
    );
    r.session_id = d.session_id.clone();
    r.discovery_operation_id = Some(d.id.clone());
    r.root = d.requested_native_root.clone();
    r.progress = Some(Progress {
        entries_seen: d.entries_seen.clone(),
        media_seen: d.media_seen.clone(),
    });
    if matches!(
        status,
        Status::Partial | Status::Unavailable | Status::Failed
    ) {
        r.error = Some(OperationError {
            code: if status == Status::Unavailable {
                "root_unavailable"
            } else if status == Status::Partial {
                "discovery_partial"
            } else {
                "discovery_failed"
            }
            .into(),
            message: d
                .message
                .clone()
                .unwrap_or_else(|| "Discovery did not complete.".into()),
        });
    }
    Ok(r)
}
pub fn target_triple() -> String {
    env!("LMG_BUILD_TARGET").into()
}

pub fn runtime_observation() -> Value {
    match tauri::webview_version() {
        Ok(version) => {
            json!({"status":"available","provider":match std::env::consts::OS{"windows"=>"WebView2","linux"=>"WebKitGTK","macos"=>"WKWebView",_=>"unknown"},"version":version,"basis":"native version probe; GUI initialization not certified","bytes":null})
        }
        Err(e) => {
            json!({"status":"unavailable","version":null,"bytes":null,"message":e.to_string(),"guidance":runtime_guidance()})
        }
    }
}
pub fn runtime_guidance() -> &'static str {
    match std::env::consts::OS {
        "windows" => {
            "Install or repair the Microsoft Evergreen WebView2 Runtime for this architecture, then retry. A browser application does not replace this runtime."
        }
        "linux" => {
            "Use the elected distribution and install GTK3/WebKitGTK 4.1/libsoup3 runtime dependencies and an accessible graphical display. Missing shared libraries may prevent the executable reaching main."
        }
        "macos" => {
            "Use the elected macOS baseline with its OS WebKit framework and an interactive desktop; repair/update the OS framework if unavailable."
        }
        _ => "This platform requires separate native qualification.",
    }
}
pub fn gui_prerequisite() -> Result<(), GalleryError> {
    tauri::webview_version().map_err(|e| {
        GalleryError::new(
            "runtime_unavailable",
            format!("{} ({e})", runtime_guidance()),
        )
    })?;
    #[cfg(target_os = "linux")]
    if std::env::var_os("DISPLAY").is_none_or(|v| v.is_empty())
        && std::env::var_os("WAYLAND_DISPLAY").is_none_or(|v| v.is_empty())
    {
        return Err(GalleryError::new("display_unavailable", runtime_guidance()));
    }
    Ok(())
}
pub fn help() -> String {
    format!("Local Media Gallery {} ({:?}; {})
Usage: local-media-gallery [DIRECTORY]
       local-media-gallery open [DIRECTORY] [--wait | --detach] [--json]
       local-media-gallery resolve [DIRECTORY] [--json]
       local-media-gallery capabilities [--json]
       local-media-gallery prepare [DIRECTORY] [--thumbnails | --clean-cache] [--cache local|portable] [--ffmpeg ABSOLUTE --ffmpeg-sha256 HEX] [--diagnostics] [--json]
       local-media-gallery diagnostics [--json]
       local-media-gallery install [--json]
       local-media-gallery --help | --version [--json]
Use -- before a dash-leading or reserved literal directory. Relative directories use the invoking working directory. Full without a directory opens selection; Lite opens its external containing gallery. Wait is default; detach acknowledges startup, not completed discovery. Bare prepare previews without writes; --thumbnails generates and --clean-cache cleans validated owned output. Video uses an explicitly selected helper. Installation is currently unavailable. Both editions share browsing and host-local/portable settings.
",env!("CARGO_PKG_VERSION"),edition(),target_triple())
}
pub fn finite(request: &Request, id: String, root: Option<&Path>) -> OperationResult {
    if matches!(
        request.operation,
        Operation::Prepare | Operation::Diagnostics
    ) {
        return crate::preparation::finite(request, id, root);
    }
    let mut r = OperationResult::new(
        request.operation,
        id,
        if request.operation == Operation::Resolve {
            "root-resolution"
        } else if matches!(request.operation, Operation::Prepare | Operation::Install) {
            "finite-job"
        } else {
            "information"
        },
        Status::Success,
    );
    r.root = root.map(NativePath::from_path);
    match request.operation {
        Operation::Help => r.data = Some(json!({"text":help()})),
        Operation::Version => {
            r.data = Some(
                json!({"targetTriple":target_triple(),"bundleIdentifier":identifier(edition()),"buildProfile":if cfg!(debug_assertions){"debug"}else{"release"}}),
            )
        }
        Operation::Capabilities => {
            r.data = Some(
                json!({"targetTriple":target_triple(),"bundleIdentifier":identifier(edition()),"platforms":serde_json::from_str::<Value>(include_str!(concat!(env!("OUT_DIR"), "/platform-matrix.json"))).expect("validated compiled platform policy"),"runtime":runtime_observation()}),
            )
        }
        Operation::Resolve => {
            r.data = Some(
                json!({"selection":root.is_none(),"basis":"native absolute root intent; existence/access/discovery not certified"}),
            )
        }
        Operation::Install => {
            r.status = Status::Unavailable;
            r.error = Some(OperationError {
                code: "capability_unavailable".into(),
                message:
                    "This artifact does not implement installation. No installation was performed."
                        .into(),
            });
        }
        _ => {}
    }
    r
}

pub fn attach_terminal() {
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::System::Console::{
            AttachConsole, GetStdHandle, STD_ERROR_HANDLE, STD_INPUT_HANDLE, STD_OUTPUT_HANDLE,
            SetStdHandle,
        };
        let handles = [STD_INPUT_HANDLE, STD_OUTPUT_HANDLE, STD_ERROR_HANDLE]
            .map(|kind| (kind, GetStdHandle(kind)));
        // Join only an existing parent console. Preserve redirected channels and never allocate a window.
        AttachConsole(u32::MAX);
        for (kind, handle) in handles {
            if !handle.is_null() && handle as isize != -1 {
                SetStdHandle(kind, handle);
            }
        }
    }
}
pub fn emit(result: &OperationResult, machine: bool) -> std::io::Result<()> {
    attach_terminal();
    if machine {
        let mut out = std::io::stdout().lock();
        serde_json::to_writer(&mut out, result)?;
        out.write_all(
            b"
",
        )?;
        out.flush()?;
    } else if result.operation == Operation::Help {
        write!(std::io::stdout().lock(), "{}", help())?;
    } else if result.operation == Operation::Version {
        writeln!(
            std::io::stdout().lock(),
            "Local Media Gallery {}
Edition: {:?}
Target: {}",
            result.version,
            result.edition,
            target_triple()
        )?;
    } else if let Some(error) = &result.error {
        writeln!(
            std::io::stderr().lock(),
            "{}: {} (operation {})",
            error.code,
            error.message,
            result.operation_id
        )?;
    } else if result.operation == Operation::Resolve {
        writeln!(
            std::io::stdout().lock(),
            "{}",
            result
                .root
                .as_ref()
                .and_then(|p| p.to_path().ok())
                .map_or_else(
                    || "Selection screen".into(),
                    |p| p.to_string_lossy().into_owned()
                )
        )?;
    } else if matches!(
        result.operation,
        Operation::Capabilities | Operation::Diagnostics | Operation::Prepare
    ) {
        writeln!(
            std::io::stdout().lock(),
            "{}",
            serde_json::to_string_pretty(&result.data)?
        )?;
    } else if result.status == Status::Accepted {
        writeln!(
            std::io::stdout().lock(),
            "Startup acknowledged for process {} (operation {}). Discovery has its own outcome.",
            result.process_id.as_deref().unwrap_or("unknown"),
            result.operation_id
        )?;
    }
    Ok(())
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceiptTarget {
    pub address: SocketAddr,
    pub nonce: String,
    pub operation_id: String,
}
impl ReceiptTarget {
    pub fn from_environment() -> Result<Option<Self>, GalleryError> {
        let Some(raw) = std::env::var_os(RECEIPT_ENV) else {
            return Ok(None);
        };
        let value: Self = serde_json::from_str(
            raw.to_str()
                .ok_or_else(|| invalid("Invalid startup receipt context."))?,
        )
        .map_err(|_| invalid("Invalid startup receipt context."))?;
        if value.address.ip() != IpAddr::V4(Ipv4Addr::LOCALHOST)
            || value.address.port() == 0
            || Uuid::parse_str(&value.nonce).is_err()
            || Uuid::parse_str(&value.operation_id).is_err()
        {
            return Err(invalid("Invalid startup receipt identity or endpoint."));
        }
        Ok(Some(value))
    }
    pub fn send(&self, mut result: OperationResult) {
        result.operation_id = self.operation_id.clone();
        result.root = None;
        result.progress = None;
        result.data = None;
        let receipt = StartupReceipt {
            nonce: self.nonce.clone(),
            result,
        };
        let Ok(mut bytes) = serde_json::to_vec(&receipt) else {
            return;
        };
        if bytes.len() >= MAX_RECEIPT {
            return;
        }
        bytes.push(b'\n');
        let Ok(mut stream) = TcpStream::connect_timeout(&self.address, Duration::from_secs(1))
        else {
            return;
        };
        if stream
            .set_write_timeout(Some(Duration::from_secs(1)))
            .is_err()
        {
            return;
        }
        let _ = stream.write_all(&bytes);
    }
}
#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StartupReceipt {
    pub nonce: String,
    pub result: OperationResult,
}
impl StartupReceipt {
    pub fn matches(&self, nonce: &str, id: &str, pid: u32) -> bool {
        let r = &self.result;
        self.nonce == nonce
            && r.operation_id == id
            && r.process_id.as_deref() == Some(pid.to_string().as_str())
            && r.product == "local-media-gallery"
            && r.format_version == 1
            && r.version == env!("CARGO_PKG_VERSION")
            && r.edition == edition()
            && r.os == std::env::consts::OS
            && r.arch == std::env::consts::ARCH
            && r.operation == Operation::Open
            && r.boundary == "ui-startup"
            && matches!(
                r.status,
                Status::Accepted | Status::Failed | Status::Unavailable
            )
    }
}
pub fn decode_receipt(bytes: &[u8]) -> Result<StartupReceipt, GalleryError> {
    if bytes.len() > MAX_RECEIPT {
        return Err(GalleryError::new(
            "startup_protocol",
            "Startup acknowledgement exceeds its bounded payload.",
        ));
    }
    serde_json::from_slice(bytes)
        .map_err(|_| GalleryError::new("startup_protocol", "Startup acknowledgement is malformed."))
}
fn read_receipt(stream: &mut TcpStream, deadline: Instant) -> Result<StartupReceipt, GalleryError> {
    // Accepted sockets do not have portable nonblocking inheritance semantics.
    // Use explicit bounded blocking reads under the existing absolute deadline.
    stream.set_nonblocking(false).map_err(|error| {
        GalleryError::new(
            "startup_protocol",
            format!("Startup acknowledgement socket mode failed: {error}"),
        )
    })?;
    let mut bytes = Vec::new();
    let mut chunk = [0u8; 1024];
    loop {
        let remaining = deadline
            .checked_duration_since(Instant::now())
            .ok_or_else(|| {
                GalleryError::new(
                    "startup_timeout",
                    "Startup acknowledgement deadline reached.",
                )
            })?;
        stream
            .set_read_timeout(Some(remaining.min(Duration::from_millis(250))))
            .map_err(|e| GalleryError::new("startup_protocol", e.to_string()))?;
        match stream.read(&mut chunk) {
            Ok(0) => return decode_receipt(&bytes),
            Ok(n) => {
                bytes.extend_from_slice(&chunk[..n]);
                if bytes.len() > MAX_RECEIPT {
                    return Err(GalleryError::new(
                        "startup_protocol",
                        "Startup acknowledgement exceeds its bounded payload.",
                    ));
                }
                if bytes.contains(&b'\n') {
                    return decode_receipt(&bytes);
                }
            }
            Err(e) => {
                return Err(GalleryError::new(
                    "startup_protocol",
                    format!("Startup acknowledgement read failed: {e}"),
                ));
            }
        }
    }
}
fn await_receipt(
    listener: &TcpListener,
    target: &ReceiptTarget,
    child: &mut Child,
    deadline: Instant,
) -> Result<OperationResult, GalleryError> {
    let mut rejected = 0;
    loop {
        if Instant::now() >= deadline {
            return Err(GalleryError::new(
                "startup_timeout",
                "Startup was not acknowledged before the deadline. The child lifetime is unknown; inspect its window/process before retrying.",
            ));
        }
        match listener.accept() {
            Ok((mut stream, _)) => match read_receipt(&mut stream, deadline) {
                Ok(receipt) if receipt.matches(&target.nonce, &target.operation_id, child.id()) => {
                    return Ok(receipt.result);
                }
                _ => {
                    rejected += 1;
                    if rejected >= 32 {
                        return Err(GalleryError::new(
                            "startup_protocol",
                            "Too many invalid startup acknowledgements; child lifetime is unknown.",
                        ));
                    }
                }
            },
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                if let Some(status) = child
                    .try_wait()
                    .map_err(|e| GalleryError::new("launch_failed", e.to_string()))?
                {
                    return Err(GalleryError::new(
                        "startup_child_exited",
                        format!(
                            "The child exited without a matching startup acknowledgement ({status}). {}",
                            runtime_guidance()
                        ),
                    ));
                }
                std::thread::sleep(Duration::from_millis(10));
            }
            Err(e) => {
                return Err(GalleryError::new(
                    "launch_failed",
                    format!("Startup acknowledgement could not be read: {e}"),
                ));
            }
        }
    }
}
pub fn detach(root: Option<&Path>, id: String) -> OperationResult {
    let deadline = Instant::now() + STARTUP_BUDGET;
    let failed = |error: GalleryError, pid: Option<u32>| {
        let exited = error.code == "startup_child_exited";
        let mut r = OperationResult::failure(Operation::Open, id.clone(), error);
        r.boundary = "ui-startup".into();
        r.process_id = pid.map(|p| p.to_string());
        r.root = root.map(NativePath::from_path);
        r.data = Some(
            json!({"childLifetime":if exited{"exited"}else if pid.is_some(){"unknown"}else{"not-started"}}),
        );
        r
    };
    let listener = match TcpListener::bind((Ipv4Addr::LOCALHOST, 0)) {
        Ok(v) => v,
        Err(e) => {
            return failed(
                GalleryError::new(
                    "launch_failed",
                    format!("Startup acknowledgement endpoint is unavailable: {e}"),
                ),
                None,
            );
        }
    };
    if let Err(e) = listener.set_nonblocking(true) {
        return failed(GalleryError::new("launch_failed", e.to_string()), None);
    }
    let target = ReceiptTarget {
        address: listener.local_addr().expect("bound endpoint"),
        nonce: Uuid::new_v4().to_string(),
        operation_id: id.clone(),
    };
    let executable = match std::env::current_exe() {
        Ok(v) => v,
        Err(e) => return failed(GalleryError::new("launch_failed", e.to_string()), None),
    };
    let mut command = Command::new(executable);
    command.args(["open", "--wait", "--"]);
    if let Some(root) = root {
        command.arg(root);
    }
    command
        .env(
            RECEIPT_ENV,
            serde_json::to_string(&target).expect("serializable target"),
        )
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        command.process_group(0);
    }
    let mut child = match command.spawn() {
        Ok(c) => c,
        Err(e) => {
            return failed(
                GalleryError::new(
                    "launch_failed",
                    format!("The native child could not start: {e}"),
                ),
                None,
            );
        }
    };
    match await_receipt(&listener, &target, &mut child, deadline) {
        Ok(mut r) => {
            r.root = root.map(NativePath::from_path);
            r
        }
        Err(e) => failed(e, Some(child.id())),
    }
}

pub fn notify_gui_error(message: &str) {
    attach_terminal();
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::{
            System::Console::{GetStdHandle, STD_ERROR_HANDLE, STD_OUTPUT_HANDLE},
            UI::WindowsAndMessaging::{MB_ICONERROR, MB_OK, MessageBoxW},
        };
        let valid = |h: windows_sys::Win32::Foundation::HANDLE| !h.is_null() && h as isize != -1;
        if !valid(GetStdHandle(STD_OUTPUT_HANDLE)) && !valid(GetStdHandle(STD_ERROR_HANDLE)) {
            let text: Vec<_> = message.encode_utf16().chain(Some(0)).collect();
            let title: Vec<_> = "Local Media Gallery"
                .encode_utf16()
                .chain(Some(0))
                .collect();
            MessageBoxW(
                std::ptr::null_mut(),
                text.as_ptr(),
                title.as_ptr(),
                MB_OK | MB_ICONERROR,
            );
        }
    }
    #[cfg(not(windows))]
    let _ = message;
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{ffi::OsString, path::PathBuf};
    fn args(v: &[&str]) -> Vec<OsString> {
        v.iter().map(OsString::from).collect()
    }
    #[test]
    fn capabilities_matrix_identifies_the_compiled_product_version() {
        let request = parse(args(&["capabilities"])).unwrap();
        let result = finite(&request, "matrix-version".into(), None);
        let data = result.data.unwrap();
        assert_eq!(data["platforms"]["version"], env!("CARGO_PKG_VERSION"));
        assert_eq!(data["platforms"]["product"], "local-media-gallery");
    }
    #[test]
    fn edition_bundle_identity_is_distinct_but_state_remains_product_local() {
        assert_ne!(identifier(Edition::Full), identifier(Edition::Lite));
        let path = std::env::temp_dir().join(identifier(Edition::Lite));
        assert_eq!(
            shared_state_directory(path),
            std::env::temp_dir().join(identifier(Edition::Full))
        );
        assert_eq!(
            shared_state_directory(std::env::temp_dir().join("explicit-override")),
            std::env::temp_dir().join("explicit-override")
        );
    }
    #[test]
    fn parser_preserves_terminator_and_rejects_conflicts() {
        let p = parse(args(&["open", "--detach", "--json", "--", "-雪"])).unwrap();
        assert_eq!(p.operation, Operation::Open);
        assert_eq!(p.mode, Mode::Detach);
        assert!(p.json);
        assert_eq!(p.root, Some(PathBuf::from("-雪")));
        for v in [
            vec!["open", "--wait", "--detach"],
            vec!["resolve", "--detach"],
            vec!["--json", "--json"],
            vec!["--help", "one"],
            vec!["one", "two"],
            vec!["install", "one"],
            vec!["--unknown"],
        ] {
            assert!(parse(args(&v)).is_err(), "{v:?}");
        }
        assert_eq!(
            parse(args(&["--", "open"])).unwrap().root,
            Some(PathBuf::from("open"))
        );
        assert_eq!(parse(args(&[])).unwrap().mode, Mode::Wait);
    }
    #[test]
    fn placement_is_external_and_explicit_path_wins() {
        let context = Placement {
            executable: PathBuf::from("/gallery/Name.app/Contents/MacOS/local-media-gallery"),
            appimage: None,
            appdir: None,
        };
        assert_eq!(
            default_root(Edition::Full, "macos", &context).unwrap(),
            None
        );
        assert_eq!(
            default_root(Edition::Lite, "macos", &context).unwrap(),
            Some(PathBuf::from("/gallery"))
        );
        let native = Placement {
            executable: std::env::current_exe().unwrap(),
            appimage: None,
            appdir: None,
        };
        assert_eq!(
            resolve_root(Edition::Lite, Some(PathBuf::from("chosen 雪")), &native).unwrap(),
            Some(std::path::absolute("chosen 雪").unwrap())
        );
        let invalid = Placement {
            executable: PathBuf::from("/tmp/.mount_Test/usr/bin/local-media-gallery"),
            appimage: None,
            appdir: Some(PathBuf::from("/tmp/.mount_Test")),
        };
        assert_eq!(
            default_root(Edition::Lite, "linux", &invalid)
                .unwrap_err()
                .code,
            "placement_unavailable"
        );
    }
    #[test]
    fn macos_translocation_requires_explicit_root_but_external_volumes_work() {
        let temporary = Placement {
            executable: PathBuf::from(
                "/private/var/folders/session/AppTranslocation/id/d/Lite.app/Contents/MacOS/local-media-gallery",
            ),
            appimage: None,
            appdir: None,
        };
        assert_eq!(
            default_root(Edition::Lite, "macos", &temporary)
                .unwrap_err()
                .code,
            "placement_unavailable"
        );
        assert!(
            resolve_root(Edition::Lite, Some(std::env::temp_dir()), &temporary)
                .unwrap()
                .is_some()
        );
        let external = Placement {
            executable: PathBuf::from(
                "/Volumes/Shared gallery/Lite.app/Contents/MacOS/local-media-gallery",
            ),
            appimage: None,
            appdir: None,
        };
        assert_eq!(
            default_root(Edition::Lite, "macos", &external).unwrap(),
            Some(PathBuf::from("/Volumes/Shared gallery"))
        );
    }
    #[test]
    fn exact_native_argument_survives_parsing() {
        #[cfg(windows)]
        let value = {
            use std::os::windows::ffi::OsStringExt;
            OsString::from_wide(&[65, 0xd800, 66])
        };
        #[cfg(unix)]
        let value = {
            use std::os::unix::ffi::OsStringExt;
            OsString::from_vec(vec![65, 255, 66])
        };
        assert_eq!(
            parse(vec!["--".into(), value.clone()]).unwrap().root,
            Some(PathBuf::from(value))
        );
    }
    #[test]
    fn discovery_results_preserve_identity_counts_and_actual_terminal_status() {
        let e = gallery_core::Engine::new();
        let req = e.begin_open(std::path::Path::new("somewhere"));
        let r = discovery_result(&e.snapshot(), &req.id).unwrap();
        assert_eq!(r.status, Status::Running);
        assert_eq!(r.operation_id, req.id);
        assert_eq!(r.progress.unwrap().entries_seen, "0");
        e.cancel_discovery(&req.id).unwrap();
        assert_eq!(
            discovery_result(&e.snapshot(), &req.id).unwrap().status,
            Status::Cancelled
        );
        let later = e.begin_open(std::path::Path::new("replacement"));
        assert!(discovery_result(&e.snapshot(), &req.id).is_err());
        assert_eq!(
            discovery_result(&e.snapshot(), &later.id).unwrap().status,
            Status::Running
        );
        for (phase, status) in [
            ("complete", Status::Success),
            ("partial", Status::Partial),
            ("failed", Status::Failed),
            ("unavailable", Status::Unavailable),
        ] {
            let mut snap = e.snapshot();
            snap.discovery.as_mut().unwrap().phase = phase.into();
            assert_eq!(discovery_result(&snap, &later.id).unwrap().status, status);
        }
        for (status, code) in [
            (Status::Success, 0),
            (Status::Accepted, 0),
            (Status::Failed, 1),
            (Status::Partial, 3),
            (Status::Cancelled, 4),
            (Status::Unavailable, 5),
        ] {
            assert_eq!(status.exit_code(), code);
        }
    }
    fn hidden_test_child() -> Child {
        let mut command = Command::new(std::env::current_exe().unwrap());
        command
            .arg("--list")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000);
        }
        command.spawn().unwrap()
    }
    #[test]
    fn queued_acknowledgement_survives_child_exit() {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        listener.set_nonblocking(true).unwrap();
        let target = ReceiptTarget {
            address: listener.local_addr().unwrap(),
            nonce: Uuid::new_v4().to_string(),
            operation_id: Uuid::new_v4().simple().to_string(),
        };
        let mut child = hidden_test_child();
        child.wait().unwrap();
        let mut r = OperationResult::new(
            Operation::Open,
            target.operation_id.clone(),
            "ui-startup",
            Status::Unavailable,
        );
        r.process_id = Some(child.id().to_string());
        let receipt = StartupReceipt {
            nonce: target.nonce.clone(),
            result: r,
        };
        let mut sender = TcpStream::connect(target.address).unwrap();
        sender
            .write_all(&serde_json::to_vec(&receipt).unwrap())
            .unwrap();
        sender.write_all(&[10]).unwrap();
        drop(sender);
        let result = await_receipt(
            &listener,
            &target,
            &mut child,
            Instant::now() + Duration::from_secs(1),
        )
        .unwrap();
        assert_eq!(result.status, Status::Unavailable);
    }
    #[test]
    fn nonblocking_accepted_stream_uses_bounded_blocking_receipt_reads() {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let mut sender = TcpStream::connect(listener.local_addr().unwrap()).unwrap();
        let (mut accepted, _) = listener.accept().unwrap();
        accepted.set_nonblocking(true).unwrap();
        let receipt = StartupReceipt {
            nonce: Uuid::new_v4().to_string(),
            result: OperationResult::new(
                Operation::Open,
                "bounded-receipt".into(),
                "ui-startup",
                Status::Accepted,
            ),
        };
        let mut bytes = serde_json::to_vec(&receipt).unwrap();
        bytes.push(b'\n');
        let writer = std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(50));
            sender.write_all(&bytes).unwrap();
        });
        let result = read_receipt(&mut accepted, Instant::now() + Duration::from_secs(1));
        writer.join().unwrap();
        assert_eq!(result.unwrap().result.operation_id, "bounded-receipt");
    }
    #[test]
    fn unacknowledged_child_exit_is_distinct_from_a_deadline() {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        listener.set_nonblocking(true).unwrap();
        let target = ReceiptTarget {
            address: listener.local_addr().unwrap(),
            nonce: Uuid::new_v4().to_string(),
            operation_id: Uuid::new_v4().simple().to_string(),
        };
        let mut child = hidden_test_child();
        child.wait().unwrap();
        assert_eq!(
            await_receipt(
                &listener,
                &target,
                &mut child,
                Instant::now() + Duration::from_secs(1)
            )
            .unwrap_err()
            .code,
            "startup_child_exited"
        );
    }
    #[test]
    fn deadline_closes_receipt_ownership_without_killing_the_child() {
        #[cfg(windows)]
        let mut command = {
            let mut c = Command::new(
                PathBuf::from(std::env::var_os("SystemRoot").unwrap()).join("System32/ping.exe"),
            );
            c.args(["-n", "2", "-w", "100", "127.0.0.1"]);
            use std::os::windows::process::CommandExt;
            c.creation_flags(0x08000000);
            c
        };
        #[cfg(unix)]
        let mut command = {
            let mut c = Command::new("/bin/sleep");
            c.arg("1");
            c
        };
        let mut child = command
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .unwrap();
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        listener.set_nonblocking(true).unwrap();
        let target = ReceiptTarget {
            address: listener.local_addr().unwrap(),
            nonce: Uuid::new_v4().to_string(),
            operation_id: Uuid::new_v4().simple().to_string(),
        };
        let result = await_receipt(
            &listener,
            &target,
            &mut child,
            Instant::now() + Duration::from_millis(30),
        );
        assert_eq!(result.unwrap_err().code, "startup_timeout");
        assert!(child.try_wait().unwrap().is_none());
        drop(listener);
        assert!(TcpStream::connect_timeout(&target.address, Duration::from_millis(100)).is_err());
        assert!(child.try_wait().unwrap().is_none());
        assert!(child.wait().unwrap().success());
    }
    #[test]
    fn partial_and_oversized_receipt_reads_are_bounded() {
        for oversized in [false, true] {
            let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
            let mut sender = TcpStream::connect(listener.local_addr().unwrap()).unwrap();
            let (mut receiver, _) = listener.accept().unwrap();
            if oversized {
                sender.write_all(&vec![b'x'; MAX_RECEIPT + 1]).unwrap();
            } else {
                sender.write_all(b"{").unwrap();
            }
            let before = Instant::now();
            assert!(read_receipt(&mut receiver, before + Duration::from_millis(40)).is_err());
            assert!(before.elapsed() < Duration::from_millis(500));
        }
    }
    #[test]
    fn slow_drip_cannot_extend_the_absolute_deadline() {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let mut sender = TcpStream::connect(listener.local_addr().unwrap()).unwrap();
        let (mut receiver, _) = listener.accept().unwrap();
        let worker = std::thread::spawn(move || {
            for _ in 0..100 {
                if sender.write_all(b" ").is_err() {
                    break;
                }
                std::thread::sleep(Duration::from_millis(2));
            }
        });
        let before = Instant::now();
        let result = read_receipt(&mut receiver, before + Duration::from_millis(30));
        assert!(result.is_err());
        assert!(before.elapsed() < Duration::from_millis(300));
        drop(receiver);
        worker.join().unwrap();
    }
    #[test]
    fn receipt_requires_nonce_operation_pid_and_bounded_payload() {
        let mut receipt = StartupReceipt {
            nonce: "n".into(),
            result: OperationResult::new(
                Operation::Open,
                "operation".into(),
                "ui-startup",
                Status::Accepted,
            ),
        };
        receipt.result.process_id = Some("42".into());
        assert!(receipt.matches("n", "operation", 42));
        assert!(!receipt.matches("wrong", "operation", 42));
        assert!(!receipt.matches("n", "other", 42));
        assert!(!receipt.matches("n", "operation", 43));
        assert!(decode_receipt(&vec![b'x'; MAX_RECEIPT + 1]).is_err());
        assert!(decode_receipt(b"{}").is_err());
    }
}

#[cfg(test)]
mod s013_tests {
    use super::*;
    #[test]
    fn explicit_preparation_flags_preserve_native_values() {
        let r = parse(
            [
                "prepare",
                "--thumbnails",
                "--cache",
                "portable",
                "--diagnostics",
                "--json",
                "--",
                "--native-root",
            ]
            .map(OsString::from)
            .to_vec(),
        )
        .unwrap();
        assert!(r.preparation.thumbnails);
        assert!(r.preparation.diagnostics);
        assert_eq!(r.root, Some(PathBuf::from("--native-root")));
        for args in [
            vec!["open", "--thumbnails"],
            vec!["prepare", "--thumbnails", "--clean-cache"],
            vec!["prepare", "--ffmpeg", "relative", "--ffmpeg-sha256", "abcd"],
            vec!["diagnostics", "directory"],
        ] {
            assert!(parse(args.into_iter().map(OsString::from).collect()).is_err());
        }
    }
}
