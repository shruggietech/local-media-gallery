# Tasks: Application storage and private-state recovery

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [contracts](contracts/storage.md).

## Phase 1: Setup

- [x] T001 Align S029 branch/selector and specification in specs/029-private-state-storage/spec.md.
- [x] T002 Complete research, storage contract and lifecycle plan in specs/029-private-state-storage/plan.md.
- [x] T003 Run blocking read-only analyze coverage across specs/029-private-state-storage/spec.md, plan.md and tasks.md.

## Phase 2: Foundation, tooling isolation (US1)

**Independent criterion**: every local Rust fixture and updater campaign uses an explicit disposable context; normal profile roots are not opened/created by fixture setup.

- [x] T004 [US1] Add disposable storage/context regressions in crates/windows-package/src/private.rs and crates/gallery-update/tests/transactions.rs (FR-001/FR-002).
- [x] T005 [US1] Implement explicit validated storage construction/context APIs and internal helper CLI input in crates/windows-package/src/private.rs and crates/gallery-update/src/{lib,main,worker}.rs (FR-001/FR-002/FR-011).
- [x] T006 [US1] Replace production-root fixtures in crates/gallery-update/src/{lib,native,ordinary}.rs, tests/transactions.rs and crates/windows-package/src/{private,embedded}.rs (FR-001/FR-002).
- [x] T007 [US1] Give scripts/test-update-campaign.mjs transaction and worker coordination disposable workspace storage (FR-001/FR-002).

## Phase 3: Explicit application paths (US2)

**Independent criterion**: Full/Lite Windows path resolution matches the contract; tooling builds redirect config/cache/history/WebView before window creation.

- [x] T008 [US2] Add path and tooling-isolation cases in apps/gallery/src-tauri/src/storage.rs (FR-003/FR-004/FR-005).
- [x] T009 [US2] Implement pre-build Tauri overrides, tooling-state feature and cache/history wiring in apps/gallery/src-tauri/src/{storage,main,launch,preparation,history}.rs and Cargo.toml (FR-003/FR-004/FR-005).
- [x] T010 [US2] Update scripts/run.mjs developer app wiring and normal-build exclusion/package profile checks in scripts/test-{normal,windows-packages}.mjs (FR-001/FR-002/FR-004).

## Phase 4: Private-state recovery (US3)

**Independent criterion**: compatible cross-release values survive, obsolete private data silently becomes usable defaults, real I/O errors name files and portable/media bytes remain unchanged.

- [x] T011 [US3] Add failing private format/reset/next-save/link/concurrency cases in apps/gallery/src-tauri/src/settings.rs and history.rs (FR-006/FR-007/FR-008).
- [x] T012 [US3] Implement opened-handle private-file validation, locked settings re-read/default replacement and named-file failures in apps/gallery/src-tauri/src/settings.rs (FR-006/FR-007/FR-008).
- [x] T013 [US3] Implement typed content/I/O classification and locked in-place SQLite reset on reads/writes in apps/gallery/src-tauri/src/history.rs (FR-007/FR-008).
- [x] T014 [US3] Align readonly reset dispositions and portable refusal/retention tests in apps/gallery/src-tauri/src/{compatibility,portable}.rs (FR-008/FR-012).

## Phase 5: Updater roots and lifecycle (US4)

**Independent criterion**: user/machine roots are correct, one owner spans coordinator/worker and different transaction directories, coordination disappears only after ownership ends, recovery/rollback inputs remain.

- [x] T015 [US4] Add user/machine root and validated coordination deletion/contention/link refusal regressions in crates/windows-package/src/private.rs (FR-009/FR-011).
- [x] T016 [US4] Implement nested production roots and post-validation exclusive handle deletion in crates/windows-package/src/private.rs; wire leases through gallery-update lib/worker (FR-009/FR-011).
- [x] T017 [US4] Add stage/worker-scratch ownership, crash/active retention and rollback preservation cases in crates/gallery-update tests (FR-010/FR-011).
- [x] T018 [US4] Implement owned-stage guards/reclamation and obsolete worker-scratch cleanup while retaining sealed recovery/rollback inputs in crates/gallery-update/src/{lib,native,worker}.rs and crates/windows-package/src/embedded.rs (FR-010/FR-011).
- [x] T019 [US4] Align ordinary/embedded updater preflight paths and relevant diagnostics in crates/gallery-update/src/ordinary.rs and crates/windows-package/src/embedded.rs (FR-009/FR-012).

## Phase 6: Versioned contracts and delivery

- [x] T020 Align VERSION, owned Cargo/npm package versions/locks, Tauri config and new docs/schema/site v0.2.1 trees without changing shipped inventories (FR-013).
- [x] T021 Document explicit storage, automatic private reset, preflight dispositions and update lifetimes in docs/v0.2.1 and CHANGELOG.md (FR-012/FR-013).
- [x] T022 Preserve shipped0.2.0 portable compatibility and add immutable v0.2.0 snapshot regression in apps/gallery/src-tauri/src/portable.rs, schemas/v0.2.1 and tests/initial-release.test.mjs (FR-008/FR-013).
- [x] T023 Run required local repository/unit/docs/app/site checks and record source-bound results in specs/029-private-state-storage/verification.md (FR-014).
- [x] T024 Commit finalized snapshot and retain new docs review/inventory using scripts/release-docs.mjs, then verify final text/version/integrity checks (FR-013/FR-014).
- [ ] T025 Push/open official PR closing all four issues and update GitHub Project 8 (FR-015).
- [ ] T026 Verify all applicable final-revision CI, respond to every finding with at most two review rounds and hand off unmerged in the PR (FR-014/FR-015).

## Dependencies and strategy

T001 -> T002 -> T003 -> isolation T004-T007 before any local Rust execution. US2 T008-T010 and US3 T011-T014 build on that isolated foundation. US4 T015-T019 shares the context API, completes retention/concurrency and must finish before contracts/verification T020-T026.

US1 is the first useful increment, but all four stories are required for this PR. Tests precede corresponding implementation. Shared-file edits stay sequential. Read-only research ran in parallel; no concurrent source mutations are planned.

Custom checklist markers remain reviewer-owned. Post-push CI/review task completion is recorded in the PR to avoid a record-only native rebuild.
