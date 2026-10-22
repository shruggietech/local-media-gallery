# Configuration and state

## State ownership

**CS-01:** The application MUST distinguish intentional user preferences, machine-local convenience state and disposable derived data. Losing a cache or remembered-location record must not make a gallery impossible to discover. Portable presentation must not depend on the sender's installed user profile.

| State | Purpose | Portability and lifetime |
| --- | --- | --- |
| Built-in defaults | Starting behavior for unspecified preferences | Defined by the application version |
| Installed user settings | Deliberate preferences for that user | Stored in the user's platform application-data locations |
| Remembered directory state | Recall choices for a normalized absolute location | Machine-local; proposed inactivity expiry |
| Gallery `settings.json` | Deliberate presentation choices intended to travel | Travels with the gallery; does not expire with local history |
| Derived cache | Thumbnails and reusable inspection results | Rebuildable; portable or machine-local placement remains to be selected |
| Session overrides | Choices made for a particular invocation/session | Lifetime and persistence must be visible |

An initial open does not require creating a configuration file. The current local interface saves explicit view choices immediately to the user configuration directory and identifies that scope. It does not write settings into the selected media directory. Future portable save operations must identify their destination before writing, particularly when sharing a gallery or using a read-only directory.

## Current user preferences

The application uses a UTF-8 `settings.json` in Tauri's application configuration directory for `tech.shruggie.local-media-gallery`. On Windows this is `%APPDATA%\tech.shruggie.local-media-gallery\settings.json`. Linux uses the user configuration directory (`$XDG_CONFIG_HOME`, otherwise `~/.config`) and macOS uses the user Library Application Support directory, each beneath the same application identifier. These are user-level paths, independent of the selected gallery. Native Linux/macOS behavior still requires platform verification.

The current flat document identifies product `version` as `0.0.0` and `formatVersion` as `1`. It contains the following preferences. All are global to this user; they are not remembered per directory.

| Field | Values | First-use default |
| --- | --- | --- |
| `pageSize` | `24`, `48`, `96` | `48` |
| `cardSize` | `small`, `medium`, `large` | `medium` |
| `controlsExpanded` | Boolean | `false` |
| `scrollIndicator` | `auto`, `always` | `auto` |
| `metadataExpanded` | Boolean | `false` |
| `filter` | `all`, `image`, `video` | `all` |
| `sort` | `name`, `modified`, `size` | `name` |
| `direction` | `asc`, `desc` | `asc` |

A missing file supplies these defaults without creating a file. A changed preference takes effect in memory immediately and queues a native save. Metadata disclosure is saved on every explicit toggle. Defaults include manual refresh only; there is no automatic-refresh preference in this document.

## Portable settings

**CS-02:** A gallery MUST support persistent custom presentation in a gallery-local `settings.json`. Media references and field selections stored for sharing must use relocatable relationships or stable semantics rather than required sender-specific absolute paths. Defaults need not be expanded into an exhaustive file when the user has changed only a few choices.

Portable settings remain a future preparation capability, separate from the current per-user file. They can hold intentional choices such as sort/filter configuration, card presentation, metadata inclusions and performance mode. Their exact key names, nesting and version envelope remain U-07; the current user-settings representation does not establish the portable contract.

Unknown keys must be treated according to the documented compatibility policy. A reader must not discard unrecognized future values and then save a reduced document over the original. Saving requires conflict detection if another session changed the file after it was read. A failed save must leave the previous valid settings available.

## Installed locations

**CS-03:** Windows installed settings MUST reside under AppData. The current preference file uses the application configuration location described above. Machine-local directory histories and performance observations must not be treated as portable collection metadata. macOS and Linux use their equivalent user-specific application locations. Future history/cache locations and their Windows Roaming/Local allocation remain U-07.

The location design should separate durable configuration, persistent session/history state and disposable caches. Linux's [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/) distinguishes these categories. macOS [Library directory guidance](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html) supplies the corresponding platform reference. These references guide future history/cache locations; the current user preference path is defined above.

## Remembered directory state and decay

The owner-proposed design uses SQLite for absolute-path lookup, saved per-directory choices and recent-location suggestions. [SQLite](https://sqlite.org/about.html) is an embedded database, so this option does not imply a separately installed database server. Adoption, driver selection and data layout remain U-07.

**CS-04:** If remembered-location state is implemented, it MUST remain a convenience rather than an authoritative media catalog. A directory moved to a new absolute path may receive a new local history entry while its portable gallery continues to work. Path lookup must respect the platform's actual case and alias behavior; blind lowercasing is not a universal identity rule.

An inactivity-based decay policy must define which event refreshes activity, when cleanup runs and how unavailable locations are treated. Expiry may remove remembered overrides/history but MUST NOT remove media, sidecars or gallery-local settings. No retention duration is selected by this specification. Recent-location ordering, access frequency and manual forgetting are also unresolved details.

## Resolution and persistence

Every effective setting needs an identifiable source. **CS-05:** A conflict between session options, gallery settings, remembered directory choices and user defaults MUST be resolved through one documented precedence policy, shared by both host and interface. The current interface resolves built-in defaults, then a valid user preference file, then the active explicit choice. Changes to the active choice are persisted immediately. Gallery-local settings and remembered-directory overrides are not yet resolved by this implementation; their future precedence remains U-07.

Automatic performance observations should be re-evaluated on the recipient's machine. A portable preference for automatic mode can travel; a sender's measured decoder budget must not be assumed suitable everywhere. A setting that has never been explicitly saved must not be represented as a user-approved portable choice.

## Corruption, migration and concurrency

**CS-06:** Invalid settings MUST be reported without silently overwriting them. Where browsing can continue with defaults or in-memory state, the application must explain that fallback and any unsaved changes. Read-only directories must remain browsable when their media are readable.

Current settings documents are limited to one MiB to bound preference parsing and writes; oversized originals remain untouched with a warning. Current settings reads validate all known fields and the supported product/format versions. Malformed documents, invalid known values and unsupported versions remain untouched, with a warning and usable defaults in memory. Saving is blocked while that stored document needs repair or removal; browsing and in-memory choices remain available. There is no automatic reset or migration that overwrites such a file. Compatible unknown properties are retained through subsequent saves.

Native writes are serialized and use a temporary file, synchronization and recoverable replacement. A content revision check under cross-process file coordination rejects a stale writer instead of discarding a newer saved document. A conflict or write failure leaves the prior file intact and shows that the current choices could not be saved. Future stores still require declared migration behavior; an unsupported older writer must not silently downgrade a newer store. Backup and migration policies beyond the current format remain U-07.

## Open decisions

U-07 retains portable-settings representation, precedence across future state scopes, SQLite adoption, history/cache locations, retention duration, activity semantics and broader migrations. The current global user file and failure behavior are defined above. The portable `settings.json` name, AppData requirement and separation from machine-local remembered paths are agreed.

See [interfaces and contracts](interfaces-and-contracts.md), [verification and compatibility](verification-and-compatibility.md), the [index](index.md) and the [glossary](glossary.md).
