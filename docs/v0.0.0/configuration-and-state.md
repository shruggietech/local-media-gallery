# Configuration and state

## State ownership

**CS-01:** Intentional preferences, machine-local history and disposable derived data have separate ownership. Losing history must not prevent discovery. An ordinary open reads portable settings without creating files in the gallery. Discovery and refresh remain manual.

| Layer | Purpose | Lifetime |
| --- | --- | --- |
| Built-in defaults | Unspecified presentation | Application version |
| Installed user settings | Deliberate user defaults | User profile |
| Remembered directory choices | Presentation for a canonical native location | Machine-local, 90 days of inactivity |
| Portable gallery settings | Presentation intended to travel | Gallery-local, no history expiry |
| Temporary session choices | Current explicit intent | Until cleared or the root changes |

## Current user preferences

The flat UTF-8 settings.json remains compatible with earlier builds. Its version is 0.0.0 and formatVersion is 1. The user file is in Tauri's app_config_dir for tech.shruggie.local-media-gallery: Windows uses Roaming AppData, Linux the user configuration location, and macOS Application Support. No user file is created until an explicit user-default change. Legacy omission of fontScale means 100 and omission of summaryFields means an empty selection and omission of loadingMode means automatic, without rewriting the file. Compatible unknown properties survive saves.

| Field | Values | Default |
| --- | --- | --- |
| fontScale | 100, 90, 80 (percent) | 100 |
| pageSize | 24, 48, 96 | 48 |
| cardSize | small, medium, large | medium |
| controlsExpanded | Boolean | false |
| scrollIndicator | auto, always | auto |
| metadataExpanded | Boolean | false |
| summaryFields | Up to 32 relative source-role/typed field-address choices | [] |
| loadingMode | automatic, conservative, standard | automatic |
| filter | all, image, video | all |
| sort | name, modified, size | name |
| direction | asc, desc | asc |

Font scale changes app text, including controls, filenames and focused information. Media sizes, card geometry and minimum hit areas retain their geometry; captions can reflow. Platform dialogs and built-in media controls retain platform styling. The private native test build may elect page size 4; ordinary builds and public schemas reject it.

Summary choices follow [metadata inspection](metadata-and-sidecars.md#inspection-and-field-inclusion). An empty array is deliberate intent, while omission inherits. The complete array is one ordinary field; source provenance, removal and every save destination use the same resolver. Invalid addresses/duplicate choices or unsupported limits reject the write without replacing prior bytes.

Loading strategy changes preparation admission and near-viewport interest without changing items per page, selection or focused playback. Automatic calibrates within the current native root session; page/filter/sort and viewer transitions retain its effective tier while retiring obsolete observations. Conservative and Standard use fixed limits. Only loadingMode is intentional portable state; timings, frame gaps, effective limits and failure samples never persist. A recipient or new root session starts fresh. See [loading policy](thumbnails-and-performance.md#adaptive-loading).

## Resolution and persistence

**CS-05:** One native resolver applies layers in this order (later wins): built-in defaults, user defaults, remembered directory choices, portable gallery settings, temporary session choices. Omission inherits; an explicit false or a value equal to the app default is still intentional. Every field has an effective source.

The visible Save changes to selector is available with collection controls collapsed and inside the focused viewer. Its options are User defaults, Temporary session, Remember this folder and Portable gallery. Folder targets require an open root. The selector resets to User defaults when the root changes. A change immediately applies as temporary intent and saves only the intentionally changed fields to the chosen persistent layer. A successful save is attributed alongside the temporary source. A failure leaves the current choice temporary, with a warning.

Settings sources and recent folders shows provenance and saved overrides for each field. Removing a remembered or portable field also clears its temporary choice and reveals inheritance. Clear temporary choices removes only the session layer. Saving a lower-priority layer never changes precedence: portable settings may cover remembered choices after temporary choices are cleared.

## Portable settings

**CS-02:** The fixed gallery-local settings.json contains sparse portable presentation, independent of the sender's profile or absolute paths:

```json
{
  "product": "local-media-gallery",
  "kind": "gallery-settings",
  "version": "0.0.0",
  "formatVersion": 1,
  "choices": { "fontScale": 90, "metadataExpanded": false }
}
```

All presentation fields above are permitted in choices; none is required. Compatible unknown root and choice properties are preserved. An unrelated settings.json, malformed JSON, invalid known value, unsupported release/format or document exceeding one MiB is preserved and disables portable saving until repaired and reopened. Other layers continue to work. Read-only galleries remain browsable; attempted portable saves explain their failure.

The host reads and writes fixed child names through the held directory capability. It rejects symlinks, Windows reparse destinations and multiply linked settings/coordination files. An explicit portable save may create .local-media-gallery-settings.lock and a temporary .local-media-gallery-*.tmp file. The coordination file remains to preserve lock identity. Temporary files use exclusive creation, synchronization and capability-relative replacement. Reads alone create neither file. A crash may leave an orphan temporary file; the app does not consume it as settings.

## Installed locations

**CS-03:** Machine history is independent of portable data and user settings. Its history.sqlite3 location is:

| Platform | Location |
| --- | --- |
| Windows | Tauri app_local_data_dir, under Local AppData, then state/history.sqlite3 |
| macOS | App-specific Application Support, then state/history.sqlite3 |
| Linux | Absolute XDG_STATE_HOME/tech.shruggie.local-media-gallery/history.sqlite3, otherwise HOME/.local/state/tech.shruggie.local-media-gallery/history.sqlite3 |

Relative XDG_STATE_HOME values are ignored. See the [XDG directory specification](https://specifications.freedesktop.org/basedir/latest/) and [Tauri path resolver](https://docs.rs/tauri/latest/tauri/path/struct.PathResolver.html). Linux/macOS native runtime behavior still requires platform qualification.

## Remembered directory state and decay

**CS-04:** Bundled SQLite stores convenience state, never an authoritative media catalog. No external database executable, server or runtime installation is required. The locations table stores an opaque ID, lossless native canonical path, encoding tag, display label, sparse choices, content revision and activity time. Windows paths use UTF-16LE code units; Unix paths use native bytes. Labels never authorize reopening. Before binding machine state, handle-derived device/file identity is compared with the current canonical location. A mismatch leaves history unused with a warning; portable access remains relative to the held root. This check does not claim universal filesystem identity across every platform or volume. Canonicalization follows platform path semantics without blind lowercasing. Moving a gallery may create a new local identity; its portable settings still travel.

Activity means a successful root open or an explicit remembered-folder save. Refresh, ordinary settings reads and failed recent opens do not refresh activity. Times are nonnegative epoch milliseconds, exposed as decimal strings; a clock rollback never decreases activity. At exactly 90 days of inactivity a row expires. Requested writes delete at most 256 expired rows per operation. There is no timer, watcher or background filesystem probing. Expired rows are excluded from reads even if cleanup has not reached them. Opening an expired target resets its old choices and revision inside the activity transaction independently of the cleanup batch. An old expired choices revision cannot save inherited intent back into history. Active remembered contributions are checked for expiry on requested state resolution; there is no timer-driven UI change.

At most 20 recent folders are shown, newest activity first, with opaque ID ascending as the tie-break. Reopening resolves the opaque ID natively and uses ordinary root opening. An unavailable location reports failure while preserving both its record and the usable current root.

Forget and Clear directory history are idempotent database-row operations. They immediately remove an active remembered contribution and re-resolve settings while retaining temporary choices. They never delete media, sidecars, portable settings or caches. A forgotten root is not re-added merely by reading settings; a later successful open or remembered save can add it again.

## Corruption, migration and concurrency

**CS-06:** Invalid stored data is reported and preserved. Missing stores are initialized only when owned by this application. Existing zero-byte, foreign, corrupt or future-version databases are not silently recreated, renamed or downgraded. The supported database has application_id 0x4c4d4701 and user_version 1. Reads validate identity, schema and accessed rows; this is not a whole-database integrity audit. No historical database migration is needed for the first schema; unsupported versions require an explicit future migration.

SQLite uses rollback journaling, parameterized statements, short immediate transactions and a 250 ms busy timeout. Schema checks run read-only before writing and again in the transaction. Conditional row revisions prevent one instance overwriting another's remembered choices; merely opening a folder preserves the choices revision. Store contention falls back to usable temporary choices with a warning.

Settings writes are bounded to one MiB. User and portable saves coordinate cooperating instances, compare the loaded bytes and replace a synchronized complete temporary document. Failures before replacement preserve the prior bytes. Interruption may leave the valid prior document or the fully committed replacement, never an intentionally partial document. An editor ignoring the lock can race the final comparison and rename; this is not a filesystem-wide compare-and-swap guarantee. Root retirement is serialized with bounded state operations; retired-session writes are rejected.

## Open decisions

U-07 retains disposable cache placement and future migration/backup policies. Portable representation, precedence, bundled SQLite adoption, machine-history locations and inactivity semantics are defined above.

See [interfaces and contracts](interfaces-and-contracts.md), [verification and compatibility](verification-and-compatibility.md), the [index](index.md) and the [glossary](glossary.md).
