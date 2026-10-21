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

An initial open does not require creating a configuration file. Selecting a preference is distinct from choosing where to save it. The interface must communicate the relevant destination before a persistent operation, particularly when a gallery is shared or its directory is read-only.

## Portable settings

**CS-02:** A gallery MUST support persistent custom presentation in a gallery-local `settings.json`. Media references and field selections stored for sharing must use relocatable relationships or stable semantics rather than required sender-specific absolute paths. Defaults need not be expanded into an exhaustive file when the user has changed only a few choices.

The file can hold intentional choices such as sort/filter configuration, card presentation, metadata inclusions and performance mode. Exact key names, nesting and version envelope remain U-07. These conceptual categories are not a published JSON schema.

Unknown keys must be treated according to the documented compatibility policy. A reader must not discard unrecognized future values and then save a reduced document over the original. Saving requires conflict detection if another session changed the file after it was read. A failed save must leave the previous valid settings available.

## Installed locations

**CS-03:** Windows installed settings MUST reside under AppData. Machine-local directory histories and performance observations must not be treated as portable collection metadata. macOS and Linux use their equivalent user-specific application locations; exact project subdirectories and Windows Roaming/Local allocation are U-07.

The location design should separate durable configuration, persistent session/history state and disposable caches. Linux's [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/) distinguishes these categories. macOS [Library directory guidance](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html) supplies the corresponding platform reference. These references guide location selection without finalizing paths here.

## Remembered directory state and decay

The owner-proposed design uses SQLite for absolute-path lookup, saved per-directory choices and recent-location suggestions. [SQLite](https://sqlite.org/about.html) is an embedded database, so this option does not imply a separately installed database server. Adoption, driver selection and data layout remain U-07.

**CS-04:** If remembered-location state is implemented, it MUST remain a convenience rather than an authoritative media catalog. A directory moved to a new absolute path may receive a new local history entry while its portable gallery continues to work. Path lookup must respect the platform's actual case and alias behavior; blind lowercasing is not a universal identity rule.

An inactivity-based decay policy must define which event refreshes activity, when cleanup runs and how unavailable locations are treated. Expiry may remove remembered overrides/history but MUST NOT remove media, sidecars or gallery-local settings. No retention duration is selected by this specification. Recent-location ordering, access frequency and manual forgetting are also unresolved details.

## Resolution and persistence

Every effective setting needs an identifiable source. **CS-05:** A conflict between session options, gallery settings, remembered directory choices and user defaults MUST be resolved through one documented precedence policy, shared by both host and interface. The exact order is not yet approved. No chapter or example establishes it implicitly.

Automatic performance observations should be re-evaluated on the recipient's machine. A portable preference for automatic mode can travel; a sender's measured decoder budget must not be assumed suitable everywhere. A setting that has never been explicitly saved must not be represented as a user-approved portable choice.

## Corruption, migration and concurrency

**CS-06:** Invalid settings MUST be reported without silently overwriting them. Where browsing can continue with defaults or in-memory state, the application must explain that fallback and any unsaved changes. Read-only directories must remain browsable when their media are readable.

Persistent stores require coordinated writes, transactional or recoverable replacement, and a declared migration policy. Readers must detect unsupported format versions. A failed migration must preserve a recoverable prior representation; an unsupported older writer must not silently downgrade a newer store. Exact backups, lock strategy and migration identifiers are U-07.

## Open decisions

U-07 owns key names/schema, precedence, storage locations, SQLite adoption, retention duration, activity semantics, migrations, concurrency and persistence controls. The table defines state responsibilities, not an irreversible storage implementation. The portable `settings.json` name, AppData requirement and separation from machine-local remembered paths are agreed.

See [interfaces and contracts](interfaces-and-contracts.md), [verification and compatibility](verification-and-compatibility.md), the [index](index.md) and the [glossary](glossary.md).
