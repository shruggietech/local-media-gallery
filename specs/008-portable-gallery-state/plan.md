# Implementation Plan: S008 Portable Gallery State

**Branch**: `codex/008-portable-gallery-state` | **Date**: 2026-10-24 | **Spec**: [spec](spec.md)

## Summary

Complete #8 and #9 together using one native resolver, sparse portable/folder choices, session-bound effective-source envelopes and a small machine-local SQLite history. Preserve the current user document and media access/discovery behavior. All three stories and both issues are required, with automatic PR publication and no more than two review rounds.

## Technical Context

- Language/version: Rust1.96/edition2024, TypeScript5.9.3/React19.3.1 and the existing Tauri2.12.5/Next16.4.2 native application.
- Dependencies: existing cap-std/cap-fs-ext4.0.3 and serde_json; pin rusqlite0.40.1 with only bundled SQLite, lock actual libsqlite3-sys resolution and record runtime identity. No recipient SQLite CLI/runtime install or subprocess.
- Storage: retain existing flat user settings; sparse gallery settings.json with product/kind/release/format envelope; history.sqlite3 in Windows app_local_data_dir, macOS app-specific Application Support/state, Linux absolute XDG_STATE_HOME or HOME/.local/state beneath the app identifier.
- Tests: actual resolver/document/history native tests, capability/session regressions, master-schema Node cases, frontend types/lint and extended native WebView2 interactions; complete qualify and hosted repository/product-windows/website lanes.
- Target: Windows native qualification; all three OS path/location branches and lossless encoding receive logic tests. Do not claim macOS/Linux native application qualification.
- Bounds: existing one-MiB document limit, SQLite250ms busy wait, immediate short transactions, at most256 expired-row deletions per requested cleanup,20 displayed recents, no background scan/timer, small representative fixtures. Preserve660/900-second qualification and15-second reserve after readiness.

## Constitution Check

Pass before and after design: scope is #8/#9; no unrequested product restriction, media editing, packaging or release; governed kit bytes unchanged; explicit file destinations and failure preservation; all five scopes share a native resolver; no display-string authorization; no publication halt because the owner explicitly authorized push/PR. Runtime evidence remains distinct from source/schema tests. No constitution amendment or complexity waiver is needed.

## Project Structure

- specs/008-portable-gallery-state: spec, reviewed checklists, this plan, research, data-model, contracts, quickstart, tasks, analysis and verification records.
- crates/gallery-core/src/lib.rs and tests/core.rs: bounded current-root capability closure with session gate, plus retirement and path-grant tests.
- apps/gallery/src-tauri/src/settings.rs: retain user parsing/persistence and share known-field validation/patch helpers.
- apps/gallery/src-tauri/src/portable.rs: sparse envelope and capability-relative validated read/lock/temp/commit.
- apps/gallery/src-tauri/src/history.rs: native path encoding/location policy, SQLite identity/version/row validation, activity/recents/forget/clear, conditional writes and exact expiry.
- apps/gallery/src-tauri/src/gallery_state.rs: common resolver and session/current-source envelope, native mutation orchestration and tests.
- apps/gallery/src-tauri/src/main.rs: shared opening attachment for CLI, explicit path, chooser and opaque recent-ID; async state IPC on spawn_blocking; main-window-only admission.
- apps/gallery/src/lib/types.ts and state-controls.tsx/use-gallery-state.ts: typed state protocol, visible destination/provenance/inheritance and recents controls, session/revision-bound asynchronous handling.
- apps/gallery/src/app/gallery.tsx/gallery.css: integrate the state hook/panel and compact status with current media/viewer behavior.
- schemas/v0.0.0/local-media-gallery.schema.json, examples and tests/contracts.test.mjs: exact envelope/patch/history contracts and negative cases.
- scripts/test-native.mjs: isolated user AND history stores; UI scope/relocation/recents/failure cases; preserve all existing groups.
- docs/v0.0.0 state/interface/lifecycle/architecture/verification/glossary and CHANGELOG.md: authoritative contracts and dated decisions; no public slice/tracking references.

## Architecture and decisions

1. One Engine::with_current_root gate holds the existing hub mutex while a bounded operation uses the held Dir and canonical native Path. Matching optional session identity admits rootless user-only state; a retired or replaced root cannot commit portable/folder choices. Lock order is engine hub, state mutex, document OS lock/SQLite transaction. All blocking work runs on spawn_blocking.
2. Portable access uses fixed relative names and follow(No), regular-file/reparse/link checks, a product-specific persistent lock created only on explicit writes, expected in-memory revision and durable-byte comparison, random create_new temporary, sync_all and capability-relative rename. Reject unrelated/future/corrupt files rather than replacing them. Coordinated writers and edits observed before commit are detected; no filesystem-wide compare-and-swap claim against arbitrary external editors is made.
3. A sparse known-field validator merges only for validation; it does not materialize inherited fields into stored patches. Existing flat user settings stay compatible. Portable root/choices unknown data survives known-field writes, including arbitrary-precision JSON numbers using the existing serde_json feature rather than rounding unknown future values. Field removal removes its current temporary override too. Sending whole resolved settings to sparse storage is forbidden.
4. Native effective envelopes carry optional sessionId, native state revision, values, per-field sources, sparse layer presence, destination paths/status and recents. Frontend captures current session/intent and serializes field patches; stale results and warnings cannot apply to a replacement root. Changes remain session overrides; selecting a write target defaults to user and resets on root change. Destination stays visible in header/viewer, including collapsed controls.
5. SQLite uses application_id plus user_version1, default rollback journal,250ms busy timeout, bound parameters and immediate transactions. Missing storage is created for successful opening/remembered saves. Existing files are inspected read-only and must match app identity/version/schema/data before write; v0-to-v1 initialization applies only to a newly owned creation, not unrelated or damaged bytes. Revalidate identity/version in each write transaction. Future/corrupt/locked/read-only outcomes warn and preserve browsing.
6. Native path BLOBs use Unix bytes or Windows little-endian UTF16 units plus encoding tag, with canonical paths and held-root identity checks where available. Never lowercase, reconstruct from lossy display labels, or treat finite inode identity as a universal collision-free guarantee. Recents expose opaque IDs and labels; opening decodes natively then uses Engine::open.
7. Last activity is monotonic MAX(stored, now) for successful root opens and explicit remembered writes. Expire at now>=last and now-last>=90days; list/query does not refresh activity. Cleanup is bounded at256 indexed rows per requested operation; unexpired recents order is last_activity_ms DESC, id ASC LIMIT20. No probes of unavailable recent paths during listing. Activity-only updates retain sparse choices and their content revision; actual choice mutations compare and advance that revision inside the transaction.
8. Forget/clear deletes only database rows, re-resolves current remembered contribution and retains explicit temporary fields. No re-creation until another successful root open/remembered save. Failed opens preserve the existing usable root and the unavailable history record.

## Execution and qualification

Chronological sequence: specify -> clarify -> custom requirements checklist -> plan/research -> tasks -> blocking analysis -> failing contract/native regressions -> implementation/story checks -> authoritative docs/schema/changelog -> full qualification -> commit/push/official PR -> hosted CI -> at most two reviews/fixes -> final exact-head checks -> owner review/merge handoff. Research agents were explicitly dispatched by speckit-plan; they do not implement this slice.

The installed checklist prerequisite command unexpectedly requires a plan before the protocol's pre-plan checklist. Paths-only plus the installed template resolver provided the same canonical template without changing tools or reordering the lifecycle. Spec Kit reports a selector-derived feature alias as BRANCH; actual Git branch remains codex/008-portable-gallery-state and is independently checked.

Qualification includes existing source/kit provenance and all elected checks. Add only S008 tasks.md/verification.md to the existing explicit delivery-record exclusions, with a dated changelog entry; source, spec, plan and tests remain hashed. No website bootstrap or live product release is needed for this native-state slice; website CI still validates changed public contracts.

## Complexity Tracking

No principle violations. A single small SQLite table is justified by atomic concurrent recent/location updates and transactional expiry; JSON-file history would require rebuilding that coordination. WAL and a general storage framework are unnecessary.
