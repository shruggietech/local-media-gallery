# Tasks: S011 Measured Adaptive Loading

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/loading.md and quickstart.md. Tests are elected by FR-012 and autopilot TDD. Complete both #16/#17.

## Phase 1: Setup

- [x] T001 Verify S011 identity, current issues and primary Project tracking in specs/011-measured-adaptive-loading/verification.md (FR-012).
- [x] T002 Preserve qualified unchanged native binary and provenance before rebuild in .local/s011-baseline/identity.json; record its identity in specs/011-measured-adaptive-loading/research.md (FR-001/012).

## Phase 2: Foundational

- [x] T003 Write failing measurement report/summary/qualification tests in tests/measurement.test.mjs before scripts/measurement.mjs (FR-001/002/003/004).

## Phase 3: US1 Understand measured behavior (P1 MVP)

**Independent test**: One report from the unchanged native binary includes every elected operation, exact context and honest unavailable fields.

- [x] T004 [US1] Implement shared bounded report/statistics helpers and native operation harness in scripts/measurement.mjs and scripts/measure-native.mjs (FR-001/002/003/004).
- [x] T005 [US1] Add one hidden persistent process/environment/footprint observer in scripts/measure-processes.ps1 with process creation identity and explicit memory coverage (FR-001/003/004).
- [x] T006 [US1] Run unchanged native baseline against the small fixture, preserve raw evidence in .local/s011-baseline-measurement.json and record attributable results in specs/011-measured-adaptive-loading/measurements.md (FR-001/002/003/004, SC-001).
- [x] T007 [US1] Settle initial proposed policy thresholds and manual bounds from baseline evidence in specs/011-measured-adaptive-loading/contracts/loading.md and research.md before adaptive implementation (FR-004/005).

## Phase 4: US2 Adapt while retaining control (P1)

**Independent test**: Deterministic pressure, held work and recovery produce finite limits; manual choices persist without presentation changes.

- [x] T008 [US2] Add failing queue cleanup/start/priority/dynamic-limit and bounded policy pressure/recovery regressions in tests/view.test.mjs and tests/loading-policy.test.mjs (FR-005/006/010, SC-002).
- [x] T009 [US2] Fix queue accounting and add dynamic finite limits, outcome/age observations and visible/prefetch priority updates in apps/gallery/src/lib/admission.ts (FR-005/006/010).
- [x] T010 [US2] Implement bounded pure automatic controller and fixed manual policies in apps/gallery/src/lib/loading-policy.ts using measured contract thresholds (FR-005/006).
- [x] T011 [US2] Add failing loadingMode legacy/invalid/precedence/schema tests in apps/gallery/src-tauri/src/settings.rs, gallery_state.rs and tests/contracts.test.mjs (FR-007).
- [x] T012 [US2] Integrate loadingMode enum automatic/conservative/standard, default automatic, in native settings and TS types/defaults/labels in apps/gallery/src/lib/ (FR-007).
- [x] T013 [US2] Extend known setting/choices/patch/provenance schema in schemas/v0.0.0/local-media-gallery.schema.json without changing legacy required fields (FR-007/011).
- [x] T014 [US2] Wire session-scoped policy and governed Loading strategy selector without page/viewer key changes in apps/gallery/src/app/gallery.tsx (FR-005/007/008).

## Phase 5: US3 Retire obsolete work (P2)

**Independent test**: Slow/cancelled/failing work across visibility/root/page/viewer changes cannot tune or populate retired sessions; playback/navigation remain valid.

- [x] T015 [US3] Add deterministic obsolete/hidden/idle/manual transition regressions in tests/loading-policy.test.mjs and queue tests in tests/view.test.mjs (FR-008/009/010).
- [x] T016 [US3] Integrate demand-only frame/age sampling, hidden-source retirement, fresh resume baselines and stale queue rejection in apps/gallery/src/app/gallery.tsx (FR-005/008/009/010).
- [x] T017 [US3] Add actual native all-four-destination, relocation and explicit-default preference coverage in scripts/test-native.mjs (FR-007/010, SC-003).
- [x] T018 [US3] Add native-test-only s011_resource_snapshot action to existing test_discovery_control, reading actual native permit occupancy at core/transport ownership boundaries in crates/gallery-core/ and apps/gallery/src-tauri/src/main.rs without filesystem work; extend normal-artifact exclusion (FR-003/006/010).
- [x] T019 [US3] Prove native mode/pressure/hidden/focus/page transitions and unchanged healthy video identity/source bytes in scripts/test-native.mjs, with test-only controls excluded by scripts/test-normal.mjs (FR-008/009/010/012, SC-004).

## Phase 6: Polish and delivery

- [x] T020 Update authoritative docs/v0.0.0/, schema examples and chronological CHANGELOG.md; settle U-10 and distinguish every resource/evidence class (FR-011).
- [x] T021 Elect final measurement in scripts/qualify.mjs and run full repository/site/product/native/normal-artifact/integrity qualification; bind source/binary and separate timings in specs/011-measured-adaptive-loading/verification.md (FR-012, SC-001..005).
- [x] T022 Compare final and baseline native evidence and record actual metrics, limits and footprint statuses in specs/011-measured-adaptive-loading/measurements.md (FR-001/002/003/004, SC-001).
- [x] T023 Commit/push official PR closing #16/#17 and update Project state, recording evidence in specs/011-measured-adaptive-loading/verification.md (FR-012).
- [x] T024 Resolve individual CI/review findings within at most two requested rounds, verify final head and notify owner for final review/merge in specs/011-measured-adaptive-loading/verification.md (FR-012, SC-005).

## Dependencies and execution order

Setup -> foundational -> US1 baseline/thresholds -> US2 controller/preference -> US3 retirement/native integration -> final qualification/comparison/delivery. All three stories are required. Baseline measurement is independently valuable and must precede adaptive code. Final comparison depends on the final qualified binary.

## Parallel opportunities

After shared report contracts, report-helper and process-observer inspections are independent. After policy contract, pure tests and native field/schema tests can run independently. Chosen implementation edits shared contracts sequentially; no parallel implementation agents are required. Research agents were required only by plan Phase0.

## Implementation strategy

Test-first boundaries, actual unchanged baseline, measured tuning, then pure queue/controller, existing settings integration and native lifetime proof. Final native measurement is an elected qualification step. Every record names its evidence class; custom checklist approval markers remain reviewer-owned. Explicit autopilot authorization permits continuing without another approval pause.
