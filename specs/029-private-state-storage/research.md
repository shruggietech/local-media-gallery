# S029 research

## Explicit app directories before WebView construction

Decision: use pinned Tauri AppDirectoriesOverride on Context before build, keeping bundle identifiers and automatic window creation. Windows config is Roaming/local-media-gallery; local data and default WebView2 profile are Local/local-media-gallery; cache and logs use child directories. History uses local/state/history.sqlite3.

Rationale: pinned Tauri constructs configured WebViews before setup and creates app_local_data_dir at that point. Setup-only overrides are too late. WindowConfig.data_directory has relative-path behavior that bypasses the desired app override. See [Tauri appDirectoriesOverride](https://v2.tauri.app/reference/config/#appdirectoriesoverride).

Alternatives: changing bundle IDs disrupts OS/package identity; manual window construction adds unnecessary shell changes; environment APPDATA values do not override Windows Known Folder APIs.

Add a nondefault tooling-state compile feature, included by native-tests and elected by the developer app command. It redirects all pre-build Tauri directories, cache and history to workspace-owned roots. Ordinary exact-byte GUI/package campaigns remain on their already-required disposable hosted CI account/profile; no local ordinary GUI run is introduced. Do not add a public profile-switching feature.

## Private content recovery

Decision: keep product labels informational for private preferences, retain actual format/known-value checks and unknown compatible values. Reset malformed/obsolete private settings under the existing settings.lock after re-reading, using synchronized atomic replacement and usable default bytes. Add opened-handle no-follow/type/link checks before any destructive recovery.

History uses the existing history.lock and SQLite's in-place destructive RESET_DATABASE plus VACUUM, then the owned schema. This discards old history without migration/backup and avoids independent database identities for concurrent open clients. Always clear RESET_DATABASE after VACUUM, including errors. Busy/locked/permission/read-only/I/O failures remain failures rather than reset triggers. See [SQLite reset API](https://www.sqlite.org/c3ref/c_dbconfig_defensive.html#sqlitedbconfigresetdatabase) and [locking](https://www.sqlite.org/lockingv3.html).

Alternatives: unconditional unlink can split live SQLite connections; a migration/backup subsystem is explicitly excluded; preserving-and-blocking obsolete private content contradicts #91. Portable state retains its independent preserve/refuse contract.

Read-only update preflight reports operational compatibility and an explicit reset disposition for resettable private content without changing files. It refuses actual I/O/path failures and incompatible portable input.

## Updater context and coordination

Decision: split pure production-path resolution from validated explicit storage creation. Production constructors use Known Folder LocalAppData/ProgramData plus local-media-gallery/updates. Fixtures and the internal maintainer updater CLI receive an explicit disposable storage context. Carry the same context to native workers; never derive coordination only from arbitrary transaction parents.

Use validated Windows coordination handles with DELETE access and READ|WRITE sharing. Validate type, reparse/link count, empty content and ACLs, acquire the lock, then mark deletion through SetFileInformationByHandle(FileDispositionInfo). Close/process exit reclaims the file without unlinking a live lock identity. Sharing/delete-pending refusal represents contention. Keep Unix locking semantics unchanged. See [SetFileInformationByHandle](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfileinformationbyhandle) and [CreateFile sharing](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew).

Alternatives: delete-on-close at initial CreateFile can delete a foreign file before validation; unlink after unlock splits lock identities; separate global named mutexes add another namespace/security design.

Preserve sealed transaction inputs/records for active recovery and supported rollback. Guard temporary preparing/retaining stages and completed worker scratch with explicit ownership/lifetime cleanup. Crash-orphan reclamation requires a recognizable owned marker, nonblocking stage ownership and refusal of unexpected/link content; never sweep directories solely by prefix.

## Version and source contracts

Decision: use unreleased 0.2.1 across product/docs/master schema. Retain every shipped tree, add the new snapshot/reference/retained inventory through existing release-docs helpers and keep canonical publication selection unchanged. Private reader version relaxation must not narrow portable input support: retain shipped 0.2.0 in addition to 0.1.0 and current. Fixed 0.2.0 synthetic release fixtures remain unchanged.

Three read-only research agents inspected the app, state, updater and pinned APIs. No Rust tests or GUI runs occurred before fixture isolation. No unresolved architecture decision remains.
