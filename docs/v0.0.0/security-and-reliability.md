# Security and reliability

## Scope and trust boundaries

The native application can access files and OS integration that a renderer should not control directly. Gallery media, filenames and external sidecars are input data. Settings, installed state, derived caches and release packages each have a separate owner and integrity contract. These boundaries concern access and data integrity; they do not create content-eligibility rules for the gallery's general-purpose browsing capability.

**SR-01:** Native operations MUST validate their actual resource and session context. A string from the renderer, sidecar or filename must not grant unrestricted filesystem or process access. Root access must follow the selected traversal policy and the OS permissions available to the user. Tauri capabilities and handlers must be configured for the needed product operations, rather than enabling unrelated capabilities by convenience.

## Filesystem and rendering boundaries

Relative paths must be resolved against the intended root using native path handling. **SR-02:** Access MUST account for path traversal, aliases and symlinks according to the declared policy. A metadata path or cached resource reference must not silently expand access to another collection. Validation must cover the actual opened resource as well as its display spelling where race conditions matter.

The renderer must treat external strings as text/data. Metadata resembling HTML or script must not become active markup. Media handling must not expose a general executable document viewer simply because an unknown extension was encountered. Format-specific display follows the [playback contract](browsing-and-playback.md#playback-and-capability-reporting).

Ordinary browsing uses bundled application assets and selected media resources. Any introduced network listener, external navigation, update request or download needs a documented purpose and access boundary. This specification does not require publishing a gallery to a network or adding an account service.

## Write ownership and originals

**SR-03:** Discovery, rendering and metadata inspection MUST NOT rewrite originals or external sidecars. Preparation and settings operations may write their explicitly selected application-owned outputs. An installation or cache cleanup must not classify a whole user media directory as disposable application data.

Any future editing operation must define its target, conflict handling and recovery/undo behavior before it is enabled. This preserves the current limited-editing scope while allowing later approved features. Permission errors must be reported as access failures, not used to infer that a user's media is ineligible.

Staged output and atomic/recoverable replacement should keep valid prior state available until a replacement is complete. Concurrent writers require coordination. Exact locking and migration techniques are open, but silently truncating a settings file during an interrupted save is incompatible with the state contract.

## Dependencies and executable artifacts

**SR-04:** Downloaded executable artifacts and governed brand imports MUST have an identified source, version and integrity verification before activation. Installation must preserve the artifact/architecture identity from verification through use. A checksum establishes agreement with an identified source record; it is not, by itself, a general security assessment of the software.

Optional platform launchers and media tools are executable dependencies. Their versions and associated files must be recorded and preserved through packaging. The Full/Lite size and prerequisite descriptions must account for them. Brand provenance and immutable delivered bytes are governed by [brand integration](brand.md).

**SR-05:** Project-owned Windows console child processes MUST use CREATE_NO_WINDOW or an equivalent hidden-process guarantee, redirected noninteractive I/O and disabled prompts. Terminal commands deliberately invoked by a user must retain their documented terminal behavior. Hiding a helper window must not hide failure results from the invoking operation.

## Failure containment and recovery

**SR-06:** A failed media read, sidecar parse or thumbnail task SHOULD leave unaffected items usable. Failures must preserve their scope: root unavailable, item missing, unsupported media, invalid settings, incomplete preparation and internal error are different outcomes. Timeouts must not falsely certify that a subprocess or write stopped.

Recoverable operations need a defined result after process termination. Examples include leaving a valid previous settings file, identifying abandoned staging files, rediscovering a collection after cache loss and preserving completed thumbnails after cancellation. Recovery should not automatically repeat a write with unknown prior outcome as though it were idempotent.

A disconnected external location must remain distinguishable from deletion. Incomplete discovery retains unconfirmed observations as stale; it cannot infer deletion. Root identity checks compare held and currently named native directory identities, while actual media reads remain capability-relative and verify the opened file signature. Descendant hidden/system/reparse filtering uses capability-relative metadata. Cancellation and newer requests are rechecked before committing observations or revoking item grants. Persistent-store corruption must not trigger an unannounced reset that destroys deliberate preferences. Where in-memory/default behavior is possible, the application should offer continued browsing while clearly identifying what cannot be saved.

## Diagnostics

**SR-07:** Diagnostics MUST identify the failing operation and useful context while avoiding unnecessary disclosure of private paths, sidecar payloads or credentials in ordinary output. A user-requested diagnostic export must describe what it includes. Logs must distinguish application version, edition and relevant runtime facts from speculation about a cause.

Exact log fields, redaction defaults, export interaction and retention are U-11. No telemetry service or external submission workflow is established here. Reporting a vulnerability follows the project's [security policy](../../SECURITY.md), independently of automatic local diagnostics.

## Open decisions

U-11 owns diagnostic/export/retention details and exceptional recovery actions. The initial traversal/storage policy is defined in [gallery lifecycle](gallery-lifecycle.md#open-decisions); U-07 owns persistent-store migration and concurrency; U-08 owns handler/transport specifics. These choices must preserve bounded access, attributable failures and source preservation without adding unrelated product-use restrictions.

Return to the [index](index.md) or consult the [glossary](glossary.md).

## Sidecar read boundary

The native inspector reads only directly observed JSON through held directory authority. Single-child references can associate with current observations but never grant access to another path. File/link/root replacement and retired epochs reject the read; pre/post file identity checks do not claim a filesystem-wide atomic snapshot against arbitrary concurrent editors. Parser and source/result budgets constrain work, invalid data stays attributable, and raw source is inert text. Summary choices contain relative roles and field addresses rather than paths or grants. See [metadata policy](metadata-and-sidecars.md).
