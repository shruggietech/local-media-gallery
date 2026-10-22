# Interfaces and contracts

## Contract boundaries

The application exposes behavior through a command entry point, its native interface and native/frontend communication. Application-owned configuration and release artifacts also form contracts. **IF-01:** Equivalent actions MUST share the same gallery semantics regardless of entry point. Opening a directory through the command must not require a different media manifest from opening it through a native chooser.

The local development executable is `local-media-gallery`, with an optional single directory argument, `--` for a dash-leading path, `--help` and `--version`. Invalid arguments exit with code 2. No directory opens an explicit selection screen. Full/Lite installation and preparation subcommands remain U-08; the operations below also describe those future capabilities.

## Command behavior

| Operation | Input and observable outcome |
| --- | --- |
| Open a gallery | Accept a directory or an agreed selection mechanism; resolve it, start discovery and open the gallery |
| Prepare a gallery | Accept a root and chosen optional preparation steps; show intended outputs and return attributable results |
| Install Full | Start or invoke the selected platform installation workflow and report its actual result |
| Inspect version/help | Describe the invoked artifact, edition, version, usage and declared prerequisites without claiming unavailable capabilities |
| Refresh or cancel work | Operate on a defined session/job rather than an unrelated process or collection |

**IF-02:** Command parsing MUST support native paths without requiring users to rewrite separators or strip drive names. Invalid input and launch failure must be reported through meaningful diagnostics and process results. A successful launch of a long-lived UI must be distinguishable from the successful completion of preparation or installation. Whether an opener detaches or waits is part of U-08.

Machine-readable output, if offered, must have a versioned documented representation and must not be mixed with human progress text on the same channel. Command integration must preserve stdout/stderr and exit behavior when invoked from a terminal or automation. Double-click launches and console child processes must not create flashing terminal windows.

## Native and frontend operations

**IF-03:** Requests MUST identify the relevant session/root and, where needed, the current scan or item generation. Responses must allow the caller to distinguish success, partial results, cancellation, unavailable capability and failure. Late responses from a previous session must not change the active gallery.

The native boundary needs operations for root selection/opening, discovery/query results, item information, media access, settings resolution/saving and optional preparation jobs. Progress/events need an operation identity and ordering semantics sufficient to prevent stale UI state. A request timeout must not be interpreted as proof that native work has stopped.

Opening and Refresh return their completed discovery snapshots, and native completion notifications synchronize explicitly initiated changes. Reading a snapshot returns cached observations and does not scan. The interface does not poll snapshots or schedule discovery. Session ordering must prevent an older completion from replacing a newer user selection.

User preferences use `load_settings` and `save_settings`. Loading returns the validated `settings`, an opaque content `revision` and an optional `warning`. Saving supplies `settings` and `expectedRevision`, then returns the updated envelope. The native host owns the destination; the renderer does not provide an arbitrary file path. Stale revisions, unsupported documents and write failures are reported without truncating the prior file. See [configuration and state](configuration-and-state.md#current-user-preferences) for fields and persistence.

Long-running jobs require finite admission, observable progress and cancellation. Totals may initially be unknown; the UI must not invent a completed percentage from an unmeasured total. A terminal outcome should identify what completed, failed or remains resumable. Exact IPC transport, batching, job persistence and identifiers are U-08.

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

**IF-07:** Error presentation MUST retain the affected operation and useful recovery context without executing sidecar content or exposing unnecessary private values. Exact stable error identifiers and numeric process codes are U-08. Unknown failures must not be coerced into success or an empty collection.

The optional `fontScale` preference accepts `100`, `90` or `80` percent, defaulting to `100` when absent. This is an additive format-1 field; legacy user settings remain readable without a rewrite on load.

## Open decisions

U-08 retains Full/Lite command syntax, preparation/installation operations and broader error/exit-code compatibility. The current readonly snapshot, preference boundary and local opening syntax are defined above. U-07 retains future portable settings and broader state formats. Semantic requirements above constrain future contracts.

Return to the [index](index.md) or consult the [glossary](glossary.md).
