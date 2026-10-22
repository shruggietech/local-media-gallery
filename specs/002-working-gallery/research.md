# S002 research

## Stack and integration

Decision: pin Rust 1.96.0, Tauri 2.12.5, dialog 2.8.3, Next.js 16.4.2, React 19.3.1 and TypeScript 5.9.3. Use the delivered Web/React brand adapter, exact radix-ui 1.6.7 and local fonts. Current Windows MSVC/WebView2 tools exist. Keep dependency resolution in lockfiles.

Rationale: follows the selected architecture, isolates native behavior and avoids a recipient Node server. Alternatives: Electron is excluded, a Next runtime server conflicts with static delivery, and copying the whole kit unnecessarily enlarges the package. Basic governed components avoid obsolete legacy prop selectors in the delivered linter.

## Media and access

Decision: Rust capability directory handles (cap-std/cap-fs-ext 4.0.3), no-follow file opens, opaque item/revision IDs and a loopback-only Axum 0.8.9 streaming endpoint. Require the current unpredictable session token, exact loopback Host and allowed Origin. Implement HEAD/single byte ranges, no-store/nosniff and cancellation. The transport has no filesystem-path routes, directory-listing endpoint, source writes or external bind address. The selected root is separately displayed in the session snapshot.

Rationale: video seeking and large originals need bounded streaming. Whole-file JSON/custom-protocol buffering is avoidable. Broad asset scope would obscure per-session revocation. This internal media transport does not publish a network gallery.

## Discovery and UI

Decision: one admitted background scan, periodic reconciliation every second and notification invalidation for replacements; retain native names and lossless decimal file facts. No compulsory catalog, thumbnail, sidecar read or durable settings. Viewport admission, single-player cleanup and stale-session rejection bound work. Use row-ordered aspect-aware cards and a focus-managed viewer; AppFrame is the sole web inset/scroll owner with a decorated native titlebar.

Alternatives: one thread per item multiplies work; notifications alone can be missed; generated manifests recreate relocation problems. Domain media geometry is input data, not a new brand spacing system. Stage only exact required fonts/logo/notices; validate the pinned kit in a temporary recovered copy without altering governed bytes.

Implementation findings: Windows capability directory handles deliberately omit delete sharing. Close folder retires access and releases those handles before moving a root, then reopening discovers it without a manifest. Discovery probes read access without decoding every original so a denied child produces a partial result and recovers after unlocking. A media surface owns intrinsic geometry separately from the caption's click area, preserving extreme aspect ratios.

## Native verification

Decision: optional native-tests feature enables tauri-plugin-wdio-webdriver 1.5.0; a Node HTTP harness drives the actual Windows WebView2 application through embedded WebDriver. The normal artifact excludes this test server. Use ordinary CLI roots/production IPC and process-scoped Windows UI Automation for the native picker. FFmpeg is fixture tooling only. Reuse twelve candidates and boundary cases; no bulk-media benchmark.

Rationale: source/browser mocks cannot prove native decoding, byte ranges or seeking. The owner elected Windows-first acceptance; Linux/macOS remain targets with runtime checks deferred. Test plugin availability is verified before qualification and does not justify a production automation backdoor.

Driver inspection showed its DOM clicks and key actions are synthetic. Use actual Windows SendKeys for playback and keyboard behavior, and process-scoped native UIAutomation/Win32 controls for picker selection. Read cross-process edit contents with WM_GETTEXT and confirm navigation before selecting; a fixed delay cannot establish the chosen root. For the unchanged kit's cross-host proof report, use its exact compatible Node 24.11.0/Pillow 12.3.0 tool identity and delivered approved proof matrix. Recover exact BrandBuilder bytes outside the copied kit so added tooling does not contaminate manifest verification.

## Sources and resolution

Research agents inspected native tools and brand bindings read-only as directed by the planning skill. [Verification](verification.md) distinguishes observed implementation behavior and remaining untested limits.

- [Tauri native commands](https://tauri.app/develop/calling-rust/) and [capabilities](https://tauri.app/security/capabilities/).
- [Embedded WebDriver guidance](https://v2.tauri.app/develop/tests/webdriver/) and [plugin source](https://github.com/webdriverio/desktop-mobile/tree/main/packages/tauri-plugin-webdriver).
- [Next static exports](https://nextjs.org/docs/app/guides/static-exports).
- [Capability directories](https://docs.rs/cap-std/4.0.3/cap_std/fs/struct.Dir.html).
