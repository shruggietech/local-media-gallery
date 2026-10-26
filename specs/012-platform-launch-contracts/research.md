# S012 Research

## Phase0 research (2026-10-25)

Installed speckit-plan requires research agents. Three read-only agents investigated platform prerequisites, launch/result semantics and proof artifacts. No implementation was delegated. No extension hooks exist. All technical unknowns below are resolved for this slice.

### Shared application and edition identity

Decision: compile one lite Cargo feature; Full otherwise. Keep one core, frontend, resolver and host-local settings/history behavior. Both editions retain all browsing and four save destinations. Reject a mutable adjacent edition flag, runtime rebranding and a separate Lite persistence subsystem: none is required by the current architecture or owner scope.

### Elected platform proofs

Decision: native normal Full/Lite proof archives on Windows x64 (windows-2025), Ubuntu24.04 x64 and macOS15 arm64. Local Windows11 rendered acceptance remains independent. Explicit runner labels and native target/host checks avoid accidental architecture substitution; actual image/toolchain versions remain evidence. Use Ubuntu24.04 as the initial Linux proof ABI baseline; never infer Ubuntu22.04/Debian12 support from those binaries. Retain other architectures/older intended combinations as unqualified matrix rows. Windows10 22H2/11 and macOS native framework floors are dependency inputs, not inherited minimum-version browsing evidence.

Alternatives: only a paper matrix leaves #5 unfinished; final installers/release publication belong to #22/#23/#24/#26; building every architecture would expand this bounded proof slice. Normal debug proof archives give actual measured artifacts without claiming production-size or installer acceptance. macOS preserves real .app/Contents/MacOS layout and Info.plist. Unix executable permissions are part of inventory.

### Runtime and package policy

Decision: shared Evergreen WebView2 on Windows; GTK3/WebKitGTK4.1/libsoup3 and a graphical display on Ubuntu; OS WKWebView on macOS. Full final policy: per-user Windows installer plus explicitly selected machine scope, WebView provisioning, MSI permitted; Debian package on elected Ubuntu baseline; macOS app destination. Lite: extracted Windows archive, Linux executable archive initially (AppImage future disposition retained), macOS app archive. Proof builds are unsigned/unnotarized and not final installers. No optional thumbnail/FFmpeg product dependency is introduced.

Use pinned tauri::webview_version() for an attributable runtime version probe before constructing a GUI. It does not prove initialization under a profile/policy/display. Linux dynamic-loader failure can precede main, so archive prerequisite guidance is mandatory; do not promise in-process error handling there. Do not infer WebView runtime availability from a browser application. OS component sizes remain unavailable if no meaningful attributable measurement exists.

### Launch and placement

Decision: preserve directory shorthand and -- terminator, add open, resolve, prepare, install, capabilities and --json/--wait/--detach. resolve is a finite read-only preview of launch root intent (not discovery/access certification). Reserved literal directory names require -- or an explicit relative path. Explicit root uses std::path::absolute, preserving native platform semantics and avoiding Windows drive-relative cwd.join errors. Full no-argument opens selection; Lite uses external executable/app/original AppImage placement. Reject inconsistent AppImage mount/origin context instead of selecting an internal or unrelated directory.

Wait remains default; repeated launches use independent processes/windows/sessions. No single-instance broker is added. Prepare/install providers return finite unavailable results with no writes until their own implementation slices.

### Bundle and profile identity

Decision: distinct compiled Full/Lite bundle IDs prevent OS launch association from conflating editions. The existing product-owned settings/history location remains shared explicitly through the verified Tauri directory resolver; no sender profile or new persistence subsystem is introduced. Native CLI identity and assembled Info.plist must match.

### Bounded startup receipt

Decision: parent binds private IPv4 loopback, creates nonce/operation identity and spawns the same absolute artifact. Child stdin/stdout/stderr null; Windows CREATE_NO_WINDOW, no shell or interactive prompt. Child sends a bounded matching nonce/operation/PID receipt after the renderer invokes native startup and its initial root request is submitted. Parent has one absolute30-second deadline across accept/read, bounded bytes, identity validation and child-exit observation. Timeout reports startup_timeout with child PID and unknown lifetime, never cancellation or terminated work. Reject unbounded stdout threads and temporary receipt files: stalled inherited pipes and late files complicate lifetime and ownership.

### Shared results and exact values

Decision: shared Rust versioned OperationResult for CLI and a main-window operation_result query over existing discovery identities. Status accepted/success/running/partial/cancelled/unavailable/failed; boundary distinguishes information, root resolution, UI startup/lifetime, discovery and finite job. Exit0 success/accepted,1 failure,2 invalid input,3 partial,4 cancelled,5 unavailable,6 startup timeout. Unknown failures remain failure. Machine stdout contains one UTF-8 JSON record per invocation; diagnostics use stderr and fallible writes. Preserve existing redirected Windows handles when attaching an actual terminal.

Native root authority is encoded as windows-utf16le/unix-bytes with exact byte arrays; display text stays separate. Reuse the existing history codec through a shared core type; add exact native root alongside existing display fields where needed. Counters/process IDs remain decimal strings; absent values remain explicit null. Stale discovery IDs reject observation rather than claiming another root's result.

## Primary references

- https://docs.github.com/en/actions/reference/runners/github-hosted-runners (explicit native runner labels/architectures; images remain mutable)
- https://github.com/actions/runner-images (actual image inventories)
- https://v2.tauri.app/start/prerequisites/ (platform development requirements; old Windows7 wording is not current runtime authority)
- https://doc.rust-lang.org/stable/rustc/platform-support/windows-msvc.html
- https://learn.microsoft.com/en-us/deployedge/microsoft-edge-supported-operating-systems
- https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution
- https://v2.tauri.app/distribute/windows-installer/#webview2-installation-options
- https://v2.tauri.app/distribute/debian/
- https://v2.tauri.app/distribute/appimage/ (oldest build ABI and optional media payload)
- https://doc.rust-lang.org/rustc/platform-support/apple-darwin.html
- https://v2.tauri.app/distribute/macos-application-bundle/
- https://v2.tauri.app/distribute/sign/macos/
- https://v2.tauri.app/distribute/sign/windows/
- https://raw.githubusercontent.com/tauri-apps/tauri/tauri-v2.12.5/crates/tauri/src/lib.rs (pinned runtime version API)
- https://docs.rs/wry/0.57.0/wry/fn.webview_version.html
- https://doc.rust-lang.org/std/path/fn.absolute.html
- https://docs.appimage.org/packaging-guide/environment-variables.html
- https://learn.microsoft.com/en-us/windows/win32/procthread/process-creation-flags
- https://doc.rust-lang.org/std/os/windows/process/trait.CommandExt.html
- https://doc.rust-lang.org/std/process/struct.Child.html
- https://learn.microsoft.com/en-us/windows/console/getstdhandle
- https://learn.microsoft.com/en-us/windows/console/attachconsole
- https://v2.tauri.app/develop/tests/webdriver/ (embedded service supports all desktop OSes; this repository's full harness remains Windows-specific)

## Hosted PNG comparison encoding correction

Initial Ubuntu native qualification passed core tests but failed exact pinned brand continuity/report and manifest checks after the recovered verifier rewrote four comparison PNGs. The verifier writes comparison PNGs through Pillow during validation; native compressor encodings can differ. A narrowly scoped consumer adapter retains the checksum-verified encoding only after requiring exact mode, dimensions and every regenerated pixel across all128comparison images. All recovered verifier checks and governed kit bytes remain unchanged. Four test-first regressions cover compression-only equivalence, one changed pixel, dimension/mode changes and ordinary encoder behavior outside the allowlist. This strengthens image equivalence without waiving manifest checks or modifying the recovered distribution.
