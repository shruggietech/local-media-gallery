# Installation and distribution

## Distribution contract

**DI-01:** Every product artifact identifies edition, application version, OS, CPU architecture, format and host prerequisites. A release has exactly one Lite executable and one Full installer for each covered platform. Source, documentation and schemas share the application version; brand-kit and feature-helper versions are separate identities.

This chapter describes unreleased v0.2.0 contracts. Only a verified canonical published release record establishes actual download availability. Published v0.1.0 archives and their identities remain unchanged; their versioned documentation describes their older installation workflow.

## Full installation and Lite operation

| Property | Lite | Full |
| --- | --- | --- |
| Download | One native executable | One self-contained native installer |
| Placement | Executable beside gallery media | System application installation |
| Privileges | No elevation or Full installation | Normal system installation authorization |
| Interface, application resources and notices | Embedded in executable | Included in installer/application payload |
| Webview | Declared host runtime | Redistributable runtime bundled; OS facilities retained |
| Video-thumbnail helper | Optional explicitly selected local FFmpeg | Bundled, verified and automatically selected FFmpeg |
| Gallery data | Independent media, settings and optional caches | Independent media, settings and optional caches |

**DI-02:** Lite runs without Full, a sender profile, maintainer tools or distributed application companions. It is downloaded directly, without an archive or unpacked application bundle. Its host OS/runtime prerequisites remain explicit. Required notices and maintenance identity travel within the executable. Generated gallery settings/caches are user data, not distributed application dependencies.

Full carries application payloads, redistributable runtimes, implemented feature helpers and internal installation/update metadata in one file. Ordinary installation and maintenance do not ask the user to select an MSI, descriptor, payload directory or helper download. Full installs at system scope. It never uses an online dependency bootstrapper to satisfy its bundled-runtime contract.

## Installation lifecycle and collisions

**DI-03:** Installation validates physical destinations, existing registration, exact owned files, hashes and integration before replacing or removing application content. Foreign destinations, redirects, altered owned files and active application use produce an actionable conflict. Native package ownership remains authoritative where applicable. A failed privilege request does not establish installation.

Same-candidate repeat verifies existing ownership and payload. Replacement installation verifies the prior and incoming identities before switching. Incomplete operations retain attributable receipts and inputs so recovery can inspect the actual installed state. Media directories are never installation destinations by implication.

## Updates, rollback and removal

**DI-04:** A replacement Full installer discovers the owned installation and supplies its embedded verified maintenance inputs internally. Recovery checks retained candidate, destination, registration and observed phase; it does not infer success from a timeout. Changed live or retained files, another active transaction, foreign registration or incompatible durable state block destructive changes.

**DI-05:** Removal deletes only unchanged application-owned files and integration. It retains galleries, media, sidecars, portable settings, user preferences/history, foreign extras and shared runtime dependencies. Removing Lite's executable leaves media independently usable. Do not delete unknown files, transaction locks or package registration to force a retry.

Lite replacement runs from the separately downloaded replacement executable with the old application closed. Use maintain replace ABSOLUTE_OLD_EXECUTABLE, or maintain status, maintain recover or maintain rollback with the same old executable path; an optional --json requests machine-readable output. The replacement reads embedded identities and privately retains verified transaction inputs, without user-supplied JSON or a companion updater. Gallery preparation validates exact bytes and executable modes, supports exact reuse and refuses foreign or changed outputs. Retain the replacement executable and private recovery storage until maintenance reaches a verified terminal state. Historical v0.1.0 files lack this embedded contract and retain their versioned archive-maintenance workflow; unknown prior identities are refused. No loose JSON descriptor is needed to launch or relocate new Lite files. Existing explicit maintainer transaction interfaces remain internal compatibility tools and are not the ordinary product download experience.

## Preparing binaries for sharing

Place only the matching Lite executable beside media and launch it there, or explicitly select a gallery. Close the folder/application before relocation so held media grants are released, move the gallery and executable together, then relaunch and Refresh. The original sender's working directory, history and preferences are not required.

Unix downloads and transfer tools may not preserve executable permission. Mark the native file executable using the platform's file-permissions interface where necessary; the byte-identical file remains the entire application delivery. Declared Linux libraries and Windows WebView2 are host prerequisites for Lite. No Node, Python, Rust, chosen browser or Full installation is required.

## Initial platform and dependency matrix

The [canonical matrix](../../schemas/v0.2.0/platform-matrix.json) separates covered native rows from retained targets. Windows x86_64, Ubuntu 24.04 Linux x86_64 and macOS 15 Apple Silicon have distinct artifacts. Windows ARM64, Linux ARM64 and macOS Intel remain unqualified until their own native builds and receipts exist.

### Package and installation policy

| Covered platform | Lite file | Full file | OS facilities and bundled dependencies |
| --- | --- | --- | --- |
| Windows x86_64 | PE executable | Elevated setup EXE | Windows facilities; Full includes complete offline Evergreen WebView2 and FFmpeg |
| Ubuntu 24.04 x86_64 | ELF executable | Native executable installer | GNU OS facilities; Full includes exact GTK/WebKitGTK/libsoup/GStreamer dependency packages and FFmpeg |
| macOS 15 aarch64 | Mach-O executable | System-domain flat PKG | OS AppKit/WKWebView and system codecs; Full includes FFmpeg |

The interface, native core and SQLite are embedded. Full includes the matching feature-helper source, build configuration and notices. Linux runtime packages retain package copyright material and exact source/version mapping; corresponding runtime source archives are separately identified source assets, not another product edition. Build/debug databases and qualification tooling are excluded from ordinary product files.

### Windows candidate operations

1. Close running gallery processes and run the one Full setup EXE. Normal Windows authorization selects system installation under Program Files.
2. Setup extracts verified embedded inputs into private machine-owned storage, provisions the complete bundled runtime if absent and validates native payload/registration/integration. No network payload acquisition is required.
3. Launch from the installed integration or select a gallery. Video-thumbnail preparation automatically verifies and uses the installed FFmpeg helper; explicit helper override remains available.
4. Run a replacement setup to update an owned system installation. Known published v0.1.0 system installations are adopted only after exact canonical predecessor, installed inventory and registration checks. A legacy per-user installation must be removed through its normal application-removal entry before installing the new system edition; cross-scope migration is not silently attempted. Retained internal inputs support recovery/rollback. Use the system application removal entry for uninstall. Media, settings and the shared runtime remain.

Windows installed dependency notices are indexed in licenses/dependencies.json with each original path, complete text, byte length and hash. Project notices and bundled feature-helper source/notices remain separate managed files.

Lite is the direct matching EXE beside gallery media. It requires the declared shared host WebView2 runtime and never installs Full. Native Windows Server qualification does not by itself establish Windows 10/11 client behavior; exact host receipts remain authoritative.

### macOS candidate operations

1. Open the single Full PKG and use Installer's system authorization. The install choice invokes embedded ownership-aware application setup before any foreign destination can be overwritten.
2. Launch the installed app from Applications and select a gallery. The bundled feature helper is inside the managed application.
3. Open the replacement PKG for an owned system update, including a verified published v0.1.0 system installation. Reopening an interrupted matching operation uses retained recovery identity. Installation and maintenance retain media and compatible settings/history.
4. To restore the prior owned application after an update, open the same PKG, choose Customize, select **Roll back to the prior owned application**, and continue. The installer discovers and verifies its retained predecessor without separate files or JSON operands. **Uninstall Local Media Gallery Full** is a mutually exclusive choice that removes only unchanged owned application/integration files; media and user settings/history remain.
5. For Lite, place its direct Mach-O executable beside the gallery and launch that file with executable permission. No distributed app directory or companion file is required.

WKWebView, AppKit and system codecs are OS facilities. Additional codec support is bounded by observed native runtime behavior; generating a thumbnail is not proof that a host webview plays that codec.

### Linux candidate operations

1. Launch the single Full executable installer. Normal platform authorization grants system installation; command-line use on a headless host requires explicit administrator invocation.
2. The installer verifies its embedded application and exact dependency packages, then installs from local verified inputs with downloads disabled. It does not depend on a prepared maintainer environment or fetch missing packages during installation.
3. Launch Full from its desktop entry or command and choose a gallery. Its installed FFmpeg is automatically verified and selected for video thumbnails.
4. Use the matching replacement installer for ordinary replacement and the supported managed recovery path after interruption. Native package ownership and collision checks remain active. The installer accepts --recover, --rollback and --remove without descriptor operands. Its root-owned /var/lib/local-media-gallery/updates history retains verified generations and recovery inputs. System package removal retains that history, media, user data and shared dependencies; it does not run autoremove.
5. For Lite, place the direct executable beside media with executable permission. GTK3, WebKitGTK4.1, libsoup3 and declared GStreamer host libraries are prerequisites. Missing dynamic libraries may fail at the loader before application code starts.

Ubuntu 24.04 output does not establish older GNU ABI or another distribution's support. X11/Xvfb evidence does not qualify Wayland. The [payload schema](../../schemas/v0.2.0/linux-packages.schema.json) binds internal managed application identity; internal deb and runtime packages are installer inputs rather than competing product downloads.

## Explicit candidate updates and recovery

Candidate provenance and publication are separate. Maintenance verifies retained exact inputs, installed ownership and state compatibility before activation. Ordinary Full installation supplies those internal operands; users do not retain an extracted toolkit or choose JSON descriptors. An update creates no background release-discovery service.

Recovery reconciles actual old/new/missing files after an interrupted mutation. Complete and restored results require payload/native-registration readback. A client timeout remains incomplete until an independent native worker's terminal outcome is observed. Filesystem flushes support process interruption recovery without claiming device power-loss guarantees. Settings/portable format 1 and owned history compatibility are checked by the appropriate ordinary writer; incompatible or unreadable state remains untouched.

### Prerequisites and footprint reporting

Report downloaded installer/executable bytes, installed application bytes, bundled dependencies, retained source/notices and shared runtime observations separately. Unknown runtime size is unavailable with a reason, never zero. A shared runtime's total logical size is not its marginal installation cost.

Lite requires only its declared supported OS/runtime facilities. Full's clean offline campaign first observes redistributable absence, blocks network access, copies only the installer and verifies native rendering/media, helper operation and lifecycle. Prepared build-runner success alone does not establish that outcome. See [Tauri prerequisites](https://tauri.app/start/prerequisites/) and [WebView2 distribution](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution).

## Open decisions

Additional architectures, OS/ABI combinations and unobserved native behavior require their own evidence. No universal package-size promise is made. A demonstrated technical or redistribution constraint must be resolved explicitly before a single-file or complete-Full requirement changes.

See [verification and compatibility](verification-and-compatibility.md), the [index](index.md) and the [glossary](glossary.md).

## Native behavior qualification

Receipts distinguish native executable identity, actual copy-only Lite launch/relocation/Refresh, offline Full dependency provision, rendering/media/thumbnail behavior, accessibility and maintenance. Tests run on isolated native hosts; they do not use the owner's active desktop or impose attended acceptance. Test frameworks, screen readers and maintainers' runtimes are not recipient dependencies.

## Verified release assembly and publication

The release pipeline selects six ordinary files from retained successful source-bound native qualification, rather than publishing internal diagnostic archives. It verifies exact product hashes/sizes, inventories, executable modes, dependency/source notices and applicable checks before staging. Real product filenames identify version, edition, OS and architecture without candidate. Separately listed source/debug/metadata assets do not become extra product choices.

The [canonical contract](../../schemas/v0.2.0/release-record.schema.json) binds those identities, prerequisites, documentation/schema review and eight qualification scopes. Candidate content identity remains immutable through service publication observations. Numeric version triplets apply; the Windows installer bounds major/minor to 255 and patch to 65535.

Release publication is a separately authorized manual workflow on main. It independently reassembles retained accepted bytes, verifies the elected predecessor and source, gates candidate documentation, stages an attributable draft, uploads exact assets and verifies public readback before canonical selection. Lost acknowledgements are reconciled through service observations before retrying mutations; changed remote bytes refuse replacement. Release notes contain short highlights ending with the master changelog link. Binaries remain in Releases, outside the documentation Pages tree.

## Prepared recipient packages

Guided preparation resolves the current canonical published Lite matrix, which remains v0.1.0 until a newer release is published. Sender v0.2.0 does not relabel those downloaded bytes. Historical archives retain their complete older payload and root-launch-copy behavior. New single-file releases instead stage only the matching executable as application delivery, plus preparation/release receipts as gallery metadata. Those receipts are not launch dependencies; copying the executable alone into a fresh gallery remains supported.

See [guided preparation](gallery-lifecycle.md#guided-preparation-and-recipient-outputs) for collision, cancellation, exact-reuse and relocation behavior.
