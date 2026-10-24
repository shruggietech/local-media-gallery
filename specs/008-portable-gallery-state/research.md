# S008 research

Research completed 2026-10-24 by s008_persistence_research, s008_native_research and s008_requirements_research under speckit-plan. No research agent implemented source changes.

## Persistence

Decision: pin rusqlite0.40.1, default-features=false, bundled only; retain exact transitive resolution in Cargo.lock and query SQLite runtime version/source ID in tests. [Tagged manifest](https://raw.githubusercontent.com/rusqlite/rusqlite/v0.40.1/Cargo.toml), [bundled header](https://raw.githubusercontent.com/rusqlite/rusqlite/v0.40.1/libsqlite3-sys/sqlite3/sqlite3.h).

Rationale: matches the requested embedded history, no recipient runtime installation or process. The tagged header identifies SQLite3.53.2, but actual lock/runtime identity is authoritative. Alternatives: a JSON history file would duplicate transaction/expiry coordination; system SQLite adds a recipient prerequisite; today's fresh0.41.0 is unnecessary. Use ordinary rollback journaling,250ms busy timeout and short immediate transactions with bound parameters, per [transactions](https://www.sqlite.org/lang_transaction.html) and [rusqlite transactions](https://raw.githubusercontent.com/rusqlite/rusqlite/v0.40.1/src/transaction.rs). [WAL](https://www.sqlite.org/wal.html) adds unneeded files/checkpoints.

Decision: app identity plus user_version1, initial owned-store creation only, read-only inspection of existing identity/version/schema and selected data before write, revalidation inside transactions. Corrupt/future/unrelated bytes remain intact; no automatic reset. Avoid repeated whole-database scans; validate actual accessed rows and schema with bounded queries. [SQLite pragmas](https://www.sqlite.org/pragma.html).

## Native identity and portable access

Decision: Engine current-root closure keeps the hub lock through bounded IO, with lock order hub -> state -> document/transaction. Relative Dir operations, follow(No), regular/reparse/link checks, product-specific permanent coordination lock, byte/revision conflict checks, synchronized create_new temporary and relative rename preserve the held root boundary.

Rationale: cloned grants plus a preflight cancellation check permit a retirement race; snapshot.root is intentionally lossy display data. Advisory locks detect coordinated writers and edits visible before commit, not arbitrary external-editor changes after the final comparison. Existing cap-std/cap-fs-ext4.0.3 supply required APIs. Use canonical native paths and held identity where available, without asserting universal inode uniqueness.

Decision: Unix native bytes and Windows little-endian UTF16 code units are persisted with encoding tags, never lowercase or lossy strings. Recents use opaque IDs for reopening. [Rust canonicalize](https://doc.rust-lang.org/std/fs/fn.canonicalize.html), [Windows naming](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file). Retain existing user app_config_dir, use Windows app_local_data_dir for history, macOS Application Support/state, and Linux absolute XDG_STATE_HOME or HOME/.local/state. [Tauri locations](https://docs.rs/tauri/latest/tauri/path/struct.PathResolver.html), [XDG](https://specifications.freedesktop.org/basedir/latest/).

## UX and requirements review

Decision: explicit visible destination selector, user default/reset on root change, patch-only sparse writes and field provenance. Current session remains highest even after lower-layer save; remove-field clears its temporary field; forget/clear removes active remembered contribution while preserving explicit temporary choices. Destination is visible even when controls are collapsed or viewer is open. Startup, every opening path and asynchronous saves use session-bound envelopes so late results/warnings cannot affect a new root.

Independent reviewer found CHK003 and CHK007 ambiguous. Spec FR-006/015 and Clarifications now settle those cases. All10 custom requirements-quality criteria were reviewed and satisfied. Native acceptance must isolate history as well as user state and exercise real controls/relocation/recents/failures. Reject copying the fully materialized effective settings into portable sparse data.

## Explicit policy choices

Ninety-day inactivity,20 visible recents and requested-operation cleanup were chosen here after considering permanent history, very short expiry and background timers. These reversible convenience defaults retain useful infrequently opened locations and avoid idle scanning. Activity is successful opening or explicit remembered write, timestamps never move backward, expiry is exact, forget is explicit and affects only DB rows. Additional non-expired rows can remain beyond the displayed list. No prior suggested constant is treated as owner-approved.
