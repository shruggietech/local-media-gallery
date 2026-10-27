# Interfaces and contracts

## Contract boundaries

The application exposes behavior through a command entry point, its native interface and native/frontend communication. Application-owned configuration and release artifacts also form contracts. **IF-01:** Equivalent actions MUST share the same gallery semantics regardless of entry point. Opening a directory through the command must not require a different media manifest from opening it through a native chooser.

The native executable is local-media-gallery (with the platform executable suffix); a Lite artifact may use a distinct filename but identifies its compiled edition. Both use the syntax and result contract below. No command installs or prepares anything until its provider is implemented.

## Command behavior

| Operation | Input and observable outcome |
| --- | --- |
| Open a gallery | Accept a directory or an agreed selection mechanism; resolve it, start discovery and open the gallery |
| Prepare a gallery | Accept a root and chosen optional preparation steps; show intended outputs and return attributable results |
| Install Full | Start or invoke the selected platform installation workflow and report its actual result |
| Inspect version/help | Describe the invoked artifact, edition, version, usage and declared prerequisites without claiming unavailable capabilities |
| Refresh or cancel work | Operate on a defined session/job rather than an unrelated process or collection |

**IF-02:** Command parsing MUST support native paths without requiring users to rewrite separators or strip drive names. Invalid input and launch failure must be reported through meaningful diagnostics and process results. A successful launch of a long-lived UI must be distinguishable from the successful completion of preparation or installation. The process lifetime choices are specified below.

Machine-readable output, if offered, must have a versioned documented representation and must not be mixed with human progress text on the same channel. Command integration must preserve stdout/stderr and exit behavior when invoked from a terminal or automation. Double-click launches and console child processes must not create flashing terminal windows.

### Native command syntax and process lifetime

```text
local-media-gallery [open] [DIRECTORY] [--wait | --detach] [--json]
local-media-gallery resolve [DIRECTORY] [--json]
local-media-gallery capabilities [--json]
local-media-gallery prepare [DIRECTORY] [--thumbnails | --clean-cache] [--cache local|portable] [--ffmpeg ABSOLUTE --ffmpeg-sha256 HEX] [--diagnostics] [--json]
local-media-gallery diagnostics [--json]
local-media-gallery install [--json]
local-media-gallery --help [--json]
local-media-gallery --version [--json]
```

Use -- to terminate options, including for a dash-leading or command-named literal directory; ./open is also a literal path. One root and one lifetime flag are accepted. Conflicting/duplicate options, unknown options and roots on operations that do not accept one fail before profile access. Native args_os preserves paths that are not Unicode. [Root precedence](gallery-lifecycle.md#root-selection-and-identity) applies identically to open and resolve. Resolve previews intended selection only; it does not check existence, discover media or certify access.

Open waits by default. Its process stays alive for the UI lifetime, then reports the UI-lifetime outcome. It does not claim discovery completed successfully merely because the window closed normally. --detach creates an independent child and returns after a matching startup acknowledgement, bounded by 30 seconds. The acknowledgement means the main-window bridge is ready and the initial root request was submitted, or the chooser is ready. Discovery completion is a separate operation. The child uses null inherited streams; Windows children suppress console windows and Unix children form a new process group.

The private startup receipt is bounded to 16 KiB and matches a fresh nonce, operation identity, edition and actual child PID. Malformed, oversized, mismatched and slow receipts cannot extend the deadline. Timeout reports startup_timeout and an unknown child lifetime; it does not kill the child or prove work stopped. A known child exit reports startup_child_exited. Starting a second invocation creates a separate process/window/session; it does not forward roots to or reuse the first. Shared persistent state retains its existing conflict/revision rules.

Prepare/install currently return capability_unavailable (exit 5), make no gallery/profile changes and never report successful work. Help/version/capabilities/resolve are finite operations. Missing prerequisites return actionable runtime/display guidance when application code can run; loader failures before main are covered by archive prerequisite guidance.

### Machine results and exit codes

--json emits exactly one UTF-8 JSON OperationResult on stdout when that channel is available. Human diagnostics go to stderr; progress text never shares machine stdout. Closing/breaking a pipe is an output failure, not successful delivery. Ordinary native GUI launches keep their UI behavior and inherited standard handles; double-click error dialogs do not allocate flashing consoles.

The master schema's operationResult definition requires product, formatVersion (1), version, edition, os, arch, operationId, operation, boundary, status, error, processId, sessionId, discoveryOperationId, root, progress and data. Fields with unavailable facts are explicit null. PIDs and progress counts are decimal strings. Version data identifies targetTriple, buildProfile and bundleIdentifier; capabilities data includes the canonical platform policy and observed runtime. Status is accepted, success, running, partial, cancelled, unavailable or failed. An accepted ui-startup result is distinct from a discovery or ui-lifetime result.

Root uses nativePath: encoding is windows-utf16le or unix-bytes and bytes is the exact integer byte array. Windows byte length must be even; a native decoder rejects the other platform's encoding. Display labels remain separate and are never reopening authority. JSON bytes preserve unpaired native code units and non-UTF-8 Unix names without lossy string conversion. A result's session identity belongs to that operation. A failed pending Open must not borrow the previous still-usable session identity.

| Exit | Meaning |
| --- | --- |
| 0 | Successful finite/UI-lifetime result, accepted startup, or running observation at its stated boundary |
| 1 | Failure, including invalid placement or known child exit before acknowledgement |
| 2 | invalid_arguments |
| 3 | Partial operation |
| 4 | Cancelled operation |
| 5 | Unavailable capability, discovery root or prerequisite |
| 6 | startup_timeout, child lifetime unknown |

Error objects retain stable code/message fields. Categories include invalid_arguments, placement_unavailable, capability_unavailable, runtime_unavailable, display_unavailable, startup_child_exited and startup_timeout; discovery results map to root_unavailable, discovery_partial or discovery_failed and retain the observed message. Callers must read boundary/status/code together rather than interpret exit 0 as every possible operation having completed.

## Native and frontend operations

**IF-03:** Requests MUST identify the relevant session/root and, where needed, the current scan or item generation. Responses must allow the caller to distinguish success, partial results, cancellation, unavailable capability and failure. Late responses from a previous session must not change the active gallery.

The native boundary needs operations for root selection/opening, discovery/query results, item information, media access, settings resolution/saving and optional preparation jobs. Progress/events need an operation identity and ordering semantics sufficient to prevent stale UI state. A request timeout must not be interpreted as proof that native work has stopped.

Opening and Refresh acknowledge a reserved request promptly; acknowledgement does not mean enumeration has completed. The initial command-line root is requested after the webview subscribes, so filesystem discovery does not precede the window. One native worker admits directory work, with one replaceable newest pending request. Cancel and Close cancel discovery immediately at cooperative boundaries without waiting behind a blocked discovery or profile-read call. Close retires the root after any already admitted state write; the host waits asynchronously for that commit boundary. A newer Refresh supersedes older requested work; actual enumerations do not overlap.

The main window can request application_info for compiled identity/capability observations and operation_result with operationId for the current discovery result. The latter rejects retired/stale IDs rather than relabeling current state. Discovery cancellation and partial/unavailable outcomes map to the same OperationResult schema. Snapshot nativeRoot and discovery requestedNativeRoot preserve exact access identities; their legacy display strings remain presentation only. These additive fields may be absent in older schema fixtures; new native results return explicit nullable values.

The snapshot includes a globally increasing decimal-string sequence across root changes and Close. Clients reject older sequences before changing the active root or loading its settings. The independent discovery record contains id, generation, kind (open/refresh), phase, entriesSeen, mediaSeen, requestedRoot, requestedNativeRoot, operation-owned sessionId and message. Phases are opening, scanning, complete, partial, cancelled, failed and unavailable. Entry/media counts are observed exact decimal strings, not a total or percentage. A failed pending selection can retain the prior usable session. The item stale flag identifies a prior observation not yet confirmed by the latest incomplete scan; it does not itself revoke a valid media grant.

The first useful observation publishes immediately, with subsequent batches after 32 entries or 100 milliseconds elapsed at an entry boundary, plus terminal publication. This is a scheduling rule, not a throughput guarantee. gallery-changed events report current state. cancel_discovery identifies the current operationId; a stale id is rejected, while a terminal result already committed is retained. Reading a snapshot returns cached observations and does not scan. The interface does not poll snapshots or schedule discovery.

Presentation state uses load_settings with sessionId (null for no root). It returns settings, revision, sessionId, warning, per-field sources, savedTo attribution, sparse layers, recents and available destinations. save_settings accepts one request object containing sessionId, expectedRevision, destination, patch, remove and clear. A patch contains only intentionally changed known fields. Removal names one remembered/portable field with an empty patch; clear resets temporary choices with an empty patch and no removal. Invalid combinations are rejected. Root identity and revision bind mutations to the state that prepared them. The host owns every destination; the renderer supplies no arbitrary settings path.

forget_history takes sessionId, expectedRevision and an opaque recent id (null clears history). reopen_recent takes only an opaque id, decodes its native path internally and uses ordinary root opening. Failed recent opens preserve the current root. All persistence operations run off the UI thread. Public schema definitions settingsChoices, settingsPatch, portableSettings and recentDirectory describe the storage and result boundaries. See [configuration and state](configuration-and-state.md) for precedence, fields and failure behavior.

Long-running jobs require finite admission, observable progress and cancellation. Totals may initially be unknown; the UI must not invent a completed percentage from an unmeasured total. A terminal outcome should identify what completed, failed or remains resumable. Future preparation/installation providers must adopt the same attributable result boundary before reporting available.

loadingMode is automatic, conservative or standard; old user settings may omit it and resolve automatic. It is one ordinary field in settings, sparse choices/patches and per-field sources/savedTo. Effective queue tiers and timings are session observations and are never portable settings.

## Metadata inspection interface

inspect_metadata accepts request {sessionId,itemId,itemRevision,metadataRevision} from the main window. The native snapshot adds metadataRevision (0 without a root, otherwise an opaque token). The host obtains one metadata admission permit and captures observations before spawning blocking work. Busy/stale requests fail explicitly; they do not queue more blocking reads. All file/parsing work runs outside discovery and state-write authority.

The result carries the four request identities, documents and limitations. Each document contains source, label, basis, rank, ambiguous, stale, status, message, node, sourceText and recordPath. Status is ready, invalid, limited, encoding, unreadable or changed. A node is tagged null, boolean, string, number, array or object; numeric value is lexical text, array items are ordered, and object members are ordered {key,value} entries that preserve duplicate keys. Raw source is a quoted UTF-8 string, never embedded untyped JSON numeric values. A missing selector result is absence, separately displayed from a null node.

The metadataNode, metadataDocument, metadataResult, fieldStep and summaryField owned schema definitions describe these boundaries. They do not validate external sidecars. summaryFields is optional in old format-1 user documents and defaults empty, then follows ordinary sparse settings behavior. [Metadata policy](metadata-and-sidecars.md) owns association, budgets, exact values, encoding and request freshness. The launch/result contract above governs the current CLI boundary.

## Media delivery and item references

**IF-04:** Media access MUST be scoped to the selected root and the declared link/traversal policy. An item reference from another session, stale generation or unrelated root must not be accepted merely because it resembles a filename. Presentation labels are not file-access authority.

The media path should support bounded streaming and video byte-range seeking where required by the support contract. A generated URL or native resource reference is an implementation mechanism, not a portable media identifier that must be saved into `settings.json`. Closing a session must retire access that belongs only to that session.

The local application serves originals through a private IPv4-loopback endpoint on an ephemeral port, with bounded streaming and exact single byte ranges. URLs contain opaque session, item and observation identifiers, with Host/Origin checks and no filename-as-authority route. The interface is bundled static content; recipients need neither Node nor a browser application. Closing/replacing a session retires its grants and active streams. These URLs are transient and MUST NOT be saved as portable references. Native seeking and filename handling require evidence on each declared runtime.

## Data contracts and versioning

**IF-05:** Application-owned durable structures MUST have a declared format/version policy before release. The software, versioned documentation and master application JSON Schema must identify the same release when released together. A separate internal format revision may additionally identify migrations; it must not be confused with product or brand versions.

The [master application JSON Schema](../../schemas/v0.0.0/local-media-gallery.schema.json) uses Draft 2020-12, the identifier `urn:local-media-gallery:0.0.0`, and release version 0.0.0. Its root defines the current readonly session snapshot and media observations, including lossless decimal strings for byte sizes and timestamps, nullable unavailable facts and opaque identifiers. Its `settings` definition describes the format-1 user preference document. The master schema does not constrain external sidecar content.

External sidecars remain arbitrary JSON under [metadata and sidecars](metadata-and-sidecars.md). The master schema must not require external documents to become gallery-owned records. [JSON Schema's specifications](https://json-schema.org/draft/2020-12) define the dialect. Runtime snapshots and examples must validate against their exact owned schema snapshot.

**IF-06:** Boundary conversions MUST preserve exact values or explicitly encode them losslessly. Paths, timestamps, large integers, absent fields and null must not be flattened into convenient but inaccurate frontend values. Friendly formatting should remain separable from the underlying source value.

## Failure semantics

| Category | Required distinction |
| --- | --- |
| Invalid request | Unsupported syntax, malformed settings or inconsistent operation parameters |
| Unavailable resource | Missing root/item, permissions or disconnected storage |
| Unsupported capability | Missing runtime/codec or an operation absent from the invoked artifact |
| Partial completion | Some discovery/preparation work succeeded and some did not |
| Conflict | Installation ownership, concurrent settings changes or incompatible persistent formats |
| Cancellation | Requested work stopped at a defined boundary, with completed outputs identified |
| Internal failure | Unexpected failure with enough diagnostic context for recovery |

**IF-07:** Error presentation MUST retain the affected operation and useful recovery context without executing sidecar content or exposing unnecessary private values. The launch result contract above defines process codes and typed error categories. Unknown failures must not be coerced into success or an empty collection.

The optional `fontScale` preference accepts `100`, `90` or `80` percent, defaulting to `100` when absent. This is an additive format-1 field; legacy user settings remain readable without a rewrite on load.

## Open decisions

U-08 is resolved for current command, root, lifetime, snapshot and process-result contracts. Prepare/install remain explicitly unavailable providers; future provider-specific progress, outputs and persistence require their own implementation and compatible contracts. U-07 retains future cache and migration policies.

Return to the [index](index.md) or consult the [glossary](glossary.md).

## Optional preparation and diagnostics

A bare prepare previews only, without writes. --thumbnails explicitly generates; --clean-cache explicitly removes validated owned cache output. Full finite preparation requires an explicit resolved directory; Lite retains its native placement default. Helper path/hash options are paired and the path must be absolute. Generation and cleanup flags conflict. Ctrl-C/termination requests cancellation and preserves completed entries; terminal stopped results require observed helper exit. One OperationResult contains the job state and, when requested, its redacted diagnostic report. diagnostics describes only that invocation. Installation remains a separate unavailable provider. See [thumbnail policy](thumbnails-and-performance.md) and [diagnostic retention/export](security-and-reliability.md).
