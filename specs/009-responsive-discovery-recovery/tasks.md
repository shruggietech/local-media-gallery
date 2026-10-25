# Tasks: Responsive discovery and root recovery

**Input**: S009 spec/plan/research/data-model/contracts. Issues #10 and #11.
**Tests**: Required by FR-014 and autopilot; write meaningful regressions first.

## Phase 1: Setup

- [x] T001 Specify/clarify S009 and generate design artifacts in specs/009-responsive-discovery-recovery/.
- [x] T002 Record native/brand/tool readiness and source baseline in specs/009-responsive-discovery-recovery/verification.md.

## Phase 2: Foundation

- [x] T003 Add deterministic regression coverage for request reservation, ordered snapshots and partial retention in crates/gallery-core/tests/discovery.rs.
- [x] T004 Define generation-scoped DiscoveryRequest/state and global decimal-string snapshot sequence in crates/gallery-core/src/lib.rs and apps/gallery/src/lib/types.ts (FR-002/FR-004).
- [x] T005 Add one worker and one newest pending slot with enqueue watermark and shutdown tests in apps/gallery/src-tauri/src/discovery.rs (FR-005).

## Phase 3: US1 Browse during discovery (P1)

**Independent test**: Hold after a useful observation; media/progress remain visible before completion.

- [x] T006 [US1] Implement incremental validated merge with first observation then32-entry/100ms cooperative batches in crates/gallery-core/src/lib.rs (FR-001/FR-002/FR-007).
- [x] T007 [US1] Defer CLI root to startup-after-listen and wire immediate command acknowledgments/ordered current-state events in apps/gallery/src-tauri/src/main.rs (FR-001/FR-003).
- [x] T008 [US1] Add global sequence guard and stable sorted/filtered page-anchor regressions in tests/ and apps/gallery/src/lib/view.ts (FR-006).
- [x] T009 [US1] Show progress outside collapsed controls, exact observed counts and stale attribution in apps/gallery/src/app/gallery.tsx (FR-002/FR-006/FR-012).
- [x] T010 [US1] Add rendered intermediate, empty/filter-empty, partial and viewer-continuity acceptance in scripts/test-native.mjs (SC-001/SC-003).

## Phase 4: US2 Cancel or replace (P1)

**Independent test**: Cancel/replace/close at a barrier, release old work, reject all late admissions/updates.

- [x] T011 [US2] Reproduce cancelled/queued/replaced/closed worker and grant-retirement races in crates/gallery-core/tests/discovery.rs and apps/gallery/src-tauri/src/discovery.rs.
- [x] T012 [US2] Implement immediate operation cancellation, current-commit checks and terminal-race semantics in crates/gallery-core/src/lib.rs (FR-004/FR-005/FR-007).
- [x] T013 [US2] Keep Choose/Close/Cancel available during scan and expose viewer Cancel in apps/gallery/src/app/gallery.tsx and apps/gallery/src-tauri/src/main.rs (FR-012).
- [x] T014 [US2] Add native-test-only barriers/failure controls and normal-artifact exclusion coverage in apps/gallery/src-tauri/Cargo.toml, crates/gallery-core/Cargo.toml, scripts/test-native.mjs and scripts/test-normal.mjs (FR-014).

## Phase 5: US3 Recover unavailable root (P2)

**Independent test**: Fail requested discovery, retain observations/preferences, restore access and explicitly retry.

- [x] T015 [US3] Reproduce root failure/replacement, traversal and native-path cases in crates/gallery-core/tests/discovery.rs (FR-008/FR-009/FR-011).
- [x] T016 [US3] Share held-root identity validation and capability-relative visibility/file signatures in crates/gallery-core/src/lib.rs and apps/gallery/src-tauri/src/gallery_state.rs (FR-009/FR-011).
- [x] T017 [US3] Implement retained stale results, failed-selection preservation and explicit retry/reopen explanations in crates/gallery-core/src/lib.rs and apps/gallery/src/app/gallery.tsx (FR-007/FR-008).
- [x] T018 [US3] Verify local native recovery, paths, relocation and media/portable-state integrity in scripts/test-native.mjs and core/native tests (SC-004).

## Phase 6: Contracts and delivery

- [x] T019 Update lifecycle/architecture/interface/security/support/glossary docs, aligned JSON contracts and CHANGELOG.md (FR-010/FR-013).
- [x] T020 Complete Spec Kit convergence and full qualification, preserving prep/qualification/combined/source evidence in specs/009-responsive-discovery-recovery/verification.md (FR-014/SC-005).
- [x] T021 Commit/push S009 and publish official PR closing #10/#11; attach PR and advance Project tracking (SC-005).
- [ ] T022 Resolve every review finding/thread within at most two review rounds, verify final-head CI and request owner final review/merge in specs/009-responsive-discovery-recovery/verification.md (SC-005).

## Phase 7: Round1 convergence

- [x] T023 Reproduce P1 stalled profile-read lock contention; separate observer publication, profile read preparation and root write admission in core/native state code.
- [x] T024 Prove stalled-read controls and retired-state rejection in unit/rendered Windows tests, retain admitted-write retirement serialization, update contracts and rerun full qualification.
- [ ] T025 Push the reviewed correction, reply and resolve its individual thread, request the single second review, and verify final-head terminal CI/reviews.

## Dependencies and execution

Setup -> Foundation -> US1 -> US2 -> US3 -> Contracts/delivery. US2/US3 tests can be authored independently after shared types, but their core implementation shares lib.rs and runs serially. UI pure-function tests and storage fixtures are parallel opportunities only when separate files have no outstanding dependency. Research agents are used by the plan command; implementation remains coordinated in this checkout.

MVP is US1 after foundation, but the authorized slice requires all three stories. Validate each independently before full qualification. Never mark delivery/review tasks complete from a proposed plan or unrelated passing tests.
