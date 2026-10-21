# S002 proposed defaults and owner decisions

**Date**: 2026-10-21

**Status**: D-01 selected by the owner; D-02 through D-14 are proposals for review

**Specification**: [First working local gallery](spec.md)

## Authority and scope

S002 delivers a local working gallery slice before installer, persistence, sidecar and sharing work. The selected Rust/Tauri host and static Next.js interface are existing owner decisions. This record proposes the smallest behavior choices needed to plan that slice. It does not modify the public [open-decision register](../../docs/v0.0.0/index.md#open-decisions).

The owner explicitly rejected testing on 1,000 images. This specification proposes a small representative collection and focused failure cases instead. Its proposed acceptance scope contains no bulk-media test, generated stress corpus or replacement numerical load gate; this is a slice recommendation, not a broader owner prohibition on future scale testing. The broader product intention to browse collections containing thousands remains; performance at that scale will be unverified by S002.

## Proposed defaults

| ID | Affected decision | Proposed S002 default | Rationale and limits |
| --- | --- | --- | --- |
| D-01 | U-01, validation scope | Validate the local native application on the current Windows development host first; preserve Linux/macOS targets and list their runtime checks as deferred | Makes local progress without claiming unobserved native behavior. Owner selected this in Q-01. It changes this slice's acceptance scope, not the product's platform target |
| D-02 | U-03, traversal | Direct regular files only; do not recurse into subdirectories or follow linked descendants. Explicit root selection resolves the chosen root. Show the current scan scope in the UI | Predictable first open, finite traversal and no accidental scan of an adjacent tree. Optional recursion and broader storage guarantees remain later work |
| D-03 | U-03, inclusion | Skip hidden/system entries and application-owned generated artifacts; ignore unrelated documents. Recognized unsupported image/video candidates remain inspectable | Prevents generated output and ordinary documents from polluting the collection. Exact native hidden-attribute handling and candidate list are documented during planning, with dotfiles consistently hidden on all targets |
| D-04 | U-04, required media | JPEG, PNG and WebP still-image viewing; MP4 with H.264 video and AAC audio as the initial required native playback fixture, plus a silent MP4. Other recognized media may display if the runtime can handle it, but receive no untested decode claim | Gives representative image/video functionality without adding a transcoder or bundled codec stack. Codec support is tested per elected environment, not inferred from extension or framework choice |
| D-05 | U-05, card/viewer behavior | Responsive aspect-aware rows, stable row-by-row ordering, uncropped previews and fit-to-window image viewing; preserve space while dimensions are unknown. Native/runtime orientation is checked with a rotated-image fixture | Keeps scanning and keyboard order understandable. No new crop engine, color-calibration promise or heavyweight image editor |
| D-06 | U-05, sorting/filtering | All/Images/Videos; filename ascending initially; case-insensitive natural filename comparison, with exact relative-name ordering as the deterministic tie-breaker. Offer ascending/descending modified time and byte size; unavailable facts sort last | Covers useful initial browsing without a large query builder. Case handling is for display ordering, never filesystem authority or destructive path normalization |
| D-07 | U-05, playback | No automatic playback; cards use a media-type/ratio placeholder when an inexpensive preview is unavailable. Only the selected viewer plays video; opening another or closing/switching stops it | Avoids starting many decoders and avoids turning optional thumbnails into a prerequisite. Preview generation/hover autoplay remain deferred |
| D-08 | U-05, navigation | Keyboard-usable native picker, toolbar and item controls; Escape closes the viewer/details and returns focus; previous/next follows the filtered order. Show chosen root and scan state visibly; theme follows the OS using the delivered brand | Provides a complete simple interaction path. Exact component bindings remain governed by the pinned brand and are verified in implementation |
| D-09 | U-08, opening | The local executable accepts zero or one directory argument. Zero opens the selection state; an explicit relative argument resolves against the invoking terminal's directory. Propose `local-media-gallery [DIRECTORY]`, `--help`, `--version` and `--` for a dash-leading path | Preserves convenient terminal use without installing a global command yet. Artifact basename, argument parser and concrete exit codes are finalized in planning before implementation |
| D-10 | U-03/U-08, freshness | Observe changes, reconcile from the directory and offer Refresh. Coalesce rapid changes, retry after subsequent source changes and use reconciliation as recovery if notifications are lost. Small-fixture add/remove/replace visibility is targeted within five seconds after files settle | Defines an observable correctness window without pretending notification events are a perfect journal. Specific watcher/poll intervals are implementation choices |
| D-11 | U-05/U-10, resource use | Admit media around the viewport, bound pending native work and release old/offscreen resources. One active video. Do not tune device-specific budgets or publish speed/memory limits yet | Establishes bounded behavior without pretending a dozen files prove scale. Automatic device calibration and numerical performance budgets remain deferred |
| D-12 | U-06/U-07/U-13, state and editing | Session-only sort/filter/view choices. Item details show current file/media facts. No settings writes, SQLite history, sidecar parsing, metadata editing or media editing in this slice | Isolates the first browsing loop; the already specified persistence and flexible metadata work follows in later slices. This does not remove those product requirements |
| D-13 | U-10, verification | Reuse a small fixture of twelve media candidates across scenarios, plus a few boundary entries. Keep playback clips short and assets generated or redistribution-permitted. Record functional observations; do not generate a large collection | Respects the owner's testing boundary while covering actual playback, paths, layout and failures. No owner personal collection or attended pre-release gate is required |
| D-14 | U-01/U-02, packaging | Produce a local runnable development/release-mode application for the elected native environment, with bundled static interface assets. Report artifact/prerequisite observations if collected; do not build installers or market it as Full/Lite yet | Proves the host/interface boundary without adding install/uninstall/update/sharing workflows to the first implementation slice |

D-01 records the owner's choice. The remaining proposals remain reversible during review. Later engineering choices must preserve the specified behavior and cannot silently turn an unresolved detail into an advertised product guarantee.

## Q-01: Native validation scope

**Question**: Should S002 be accepted after native Windows validation, with Linux/macOS native checks explicitly deferred, or must native checks on all three platforms pass before accepting the slice?

Why it matters: Platform webviews and build/runtime prerequisites differ; a Windows result cannot establish Linux or macOS media behavior. The owner has selected all three product platforms, so changing this slice's acceptance coverage requires an explicit decision.

**Recommended**: A, Windows-first native validation for this local slice, while maintaining the three-platform architecture and clearly recording the two unverified native targets.

| Option | Outcome | Implication |
| --- | --- | --- |
| A | Windows-first native acceptance | Implement and verify on the current Windows host; Linux/macOS native results remain required before later support/distribution claims |
| B | Native acceptance on all three | Keep S002 unaccepted until Windows, Linux and macOS native build/launch/media checks finish on available environments, entirely within the owner's local-only boundary |

**Owner answer (2026-10-21)**: "Windows first (recommended)." D-01 and FR-023 adopt Windows-first native acceptance. Linux/macOS native checks are deferred; no support claim is inferred. No other question currently lacks a reasonable proposed default.

## Deferred product decisions

| Public register | S002 treatment | Follow-up boundary |
| --- | --- | --- |
| U-01 | D-01 owner-selected; D-14 proposed | Minimum OS/CPU matrix, native Linux baseline, installers, signing and runtime dependency provisioning |
| U-02 | Common browsing loop only | Detailed Full/Lite capability and package measurements |
| U-03 | Propose D-02/D-03/D-10 | Recursion UI, nested galleries, external-link traversal, network/removable-drive support |
| U-04/U-05 | Propose D-04 through D-08 | Expanded tested formats, color management, richer previews/layout preferences |
| U-06/U-07 | Defer durable/sidecar behavior via D-12 | Flexible JSON association/inspection, portable settings, AppData layout, SQLite adoption/decay and precedence |
| U-08 | Propose launch semantics; retain native identity and stale-result requirements | Concrete IPC shapes, exact identifiers/exit codes and owned schema design during technical planning |
| U-09/U-10 | No generation or load benchmark; bounded work only | Optional thumbnails/tools/caches, device adaptation and separately agreed quantitative budgets |
| U-11 | Basic attributable local errors, without a new export service | Diagnostic schema, export/redaction/retention and exceptional recovery policies |
| U-12 | No website work | Independent landing and versioned docs implementation |
| U-13 | No editing | Exact approved editing actions, write semantics and undo/recovery |

## Technical references for planning

[Tauri's Next.js integration](https://tauri.app/start/frontend/nextjs/) confirms the static-export integration direction. Its example names an older Next.js version, so use it for the integration boundary rather than copying stale dependency versions or scripts. Package pins belong to technical planning and must agree with the delivered brand adapter.

[Tauri prerequisites](https://tauri.app/start/prerequisites/) and [webview versions](https://tauri.app/reference/webview-versions/) distinguish native development/runtime environments: Windows uses WebView2 and macOS/Linux use WebKit-based facilities. These documents justify checking native environments separately; they do not prove particular codecs or our packages work. Sources were inspected during specification authoring on 2026-10-21.
