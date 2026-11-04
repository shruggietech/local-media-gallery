# S029 state and lifetime model

## Storage layout

- Windows config: Roaming AppData/local-media-gallery.
- Windows local data/default WebView2 profile: Local AppData/local-media-gallery; history in state/history.sqlite3, cache in cache/thumbnails-v1, logs in logs.
- User updates: Local AppData/local-media-gallery/updates.
- Machine updates: ProgramData/local-media-gallery/updates.
- Tooling context: explicit disposable workspace root, no fallback to production on failure. Same context reaches coordinator and native worker.

## Private state disposition

Absent -> usable defaults. Compatible format/values -> preserve values and unknown members, normalize current writer identity on explicit save. Obsolete/incompatible private content -> locked discard/default recreation. Actual I/O/path/link/ownership refusal -> named-file diagnostic and no unrelated mutation. Portable/media data is outside this transition.

Settings recovery re-reads under settings.lock. History recovery shares history.lock and resets database contents in place with SQLite exclusion, avoiding separate live file identities. No migration or backup artifacts are created.

## Updater lifetime

- Preparing/retaining stage: temporary, exclusively owned; failed same-process work cleans up, crash remnants are reclaimable only with a recognized marker, no active lease and validated owned contents.
- Sealed transaction inputs/journal/identity: retain while active, recoverable or needed for supported rollback, including committed/restored rollback-capable records.
- Native worker scratch: retain while the worker/recovery needs it; reclaim declared obsolete job/output/reinstall scratch after terminal ownership is established.
- Coordination handle: validated empty single-link file -> exclusive owner -> deletion disposition -> close/process exit removes it. A contender never substitutes a fresh independent inode while ownership remains.
