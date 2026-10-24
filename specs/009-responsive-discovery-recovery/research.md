# S009 research and decisions

Research conducted 2026-10-24 through the installed Spec Kit plan workflow, using worker, storage and UI research agents. All research agents were read-only.

## Worker ownership

Decision: one dedicated host worker with a Condvar and newest-request slot, core prepare/run/cancel operations and global snapshot sequence.
Rationale: current CLI open precedes window creation; current reconcile publishes only at completion. Independent blocked tasks can accumulate. A persistent enqueue watermark prevents reserve-A/enqueue-B/enqueue-A inversion. Immediate cancellation must not wait on the scan mutex.
Alternatives: per-command blocking tasks are simpler but unbounded under stalled storage; async filesystem wrappers still use blocking OS work; watchers violate manual discovery.

## Incomplete observations and identity

Decision: merge partial observations, mark unconfirmed old entries stale, delete only on complete enumeration, and validate held root identity.
Rationale: the old partial iterator-error branch replaces the entire collection, incorrectly implying deletion. root.is_dir alone accepts a replaced pathname. S008 already compares cap-fs-ext handle-derived device/inode identity for state operations; share it rather than copy logic. Windows visibility should use capability metadata, not ambient joined paths.
Alternatives: restore the entire old snapshot on cancellation loses useful work; reopen by path silently retargets a grant; full-file hashing before display is unnecessary and unrequested.

Primary references: [Rust read_dir](https://doc.rust-lang.org/std/fs/fn.read_dir.html), [canonicalize](https://doc.rust-lang.org/std/fs/fn.canonicalize.html), [cap-std Dir](https://docs.rs/cap-std/latest/cap_std/fs/struct.Dir.html), [cap-fs-ext MetadataExt](https://docs.rs/cap-fs-ext/latest/cap_fs_ext/trait.MetadataExt.html), [Windows attributes](https://learn.microsoft.com/en-us/windows/win32/fileio/file-attribute-constants), [Windows file identity](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfileinformationbyhandle), [Windows naming](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file). Enumeration order is unspecified and iterator errors may occur after construction. Device/inode identity is provider-dependent, including the documented ReFS limitation; do not claim universal storage identity guarantees.

## UI ordering and continuity

Decision: reject old global sequence values before root/state activation; place progress outside collapsed controls and Cancel inside focused viewer as well; preserve a stable item/page anchor.
Rationale: old session-local revision checks allow retired-session events to switch back. Current busy disables Close/Choose during Refresh. A dialog focus trap makes main-header Cancel unreachable. Numeric page clamping alone shifts content when preceding items arrive.
Alternatives: polling snapshots violates idle-command expectations and does not solve stale event identity; resetting to page1 on each batch loses context; percentage progress invents an unknown directory total.

## Qualification election

Decision: native Windows local paths, deterministic barriers/failure injection, existing full app/site qualification. Report other native runtimes and physical mounted-storage outages as unqualified.
Rationale: small fixtures can prove operation and integrity contracts without inventing physical-device evidence or a bulk acceptance gate. Generic OS-mounted storage follows the same implementation with explicit best-effort status.

## Review convergence: profile reads and write retirement

2026-10-24: Round1 exposed synchronous settings loading in the discovery observer, compounded by Hub ownership across portable/history I/O. Remove observer initialization. Use state -> commit gate -> short Hub ordering for state operations, and commit gate -> short Hub for root retirement/replacement. Read preparation holds only the state mutex and owned root capability; revalidate before any history touch and final cache installation. Preserve touch-before-recall expiry semantics. Build envelopes outside the commit gate. Actual state writes remain serialized before retirement, while snapshot/cancel/new-request control remains available. A deterministic stalled-read regression failed on the reviewed head and passed after this split; rendered acceptance also elects this boundary.
