# Tasks: CI observer reliability and published Linux recipients

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md).

## Phase 1: Setup

- [x] T001 Archive unmerged commits and PR metadata in .local/s035-housekeeping/, delete the explicitly requested stale remote/local branches, and create codex/s035-ci-observer-reliability from clean origin/main. [FR-012]
- [x] T002 Execute specify, clarify, checklist and plan; retain source/evidence boundaries in specs/035-ci-observer-reliability/spec.md and plan.md. Run blocking analyze before implementation. [FR-008, FR-009, FR-010, FR-011, FR-012]

## Phase 2: Foundation

- [x] T003 Record immutable published v0.2.2 identity and failed observer evidence references in .local/s035-baseline.json and specs/035-ci-observer-reliability/verification.md; preserve independent observer/product roles and prior release bytes. [FR-009, FR-010, FR-011]

## Phase 3: US1 - Linux finite observation and published recipient (P1)

**Independent test**: Complete native tone/silence and actual public Lite in-place/relocation/Refresh, with original archive/PNG readback. Hosted evidence is elected after T021.

- [x] T004 [US1] Add failing tests for final 20/16-byte chunks, partial capture timeout, split frames, exit/spawn/duplicate terminals, cleanup failure, recorder latency and no-input/owned-stream continuity in tests/native-pcm.test.mjs. [FR-001, FR-002, SC-001]
- [x] T005 [US1] Repair scripts/native-pcm.mjs with explicit 50-ms recording latency, idempotent complete-window settlement, bounded progress/partial digest and primary-plus-cleanup diagnostics. Preserve 16384 frames, 48-kHz float32 mono, four seconds and before/after assertions. [FR-001, FR-002, FR-008, FR-009, SC-001]
- [x] T006 [US1] Elect the meaningful PCM regressions in scripts/ci-linux-packages.mjs and retain the existing later exercisePreparedRecipient path in scripts/test-linux-packages.mjs; document observer versus actual published source in verification.md. [FR-001, FR-002, FR-010, SC-004]
- [x] T007 [US1] Independently replay the actual published Linux canonical/asset bytes, prepared archive modes/retained data and in-place/relocated Refresh PNGs from the exact hosted artifacts into specs/035-ci-observer-reliability/verification.md after T021. [FR-010, FR-011, SC-004]

## Phase 4: US2 - macOS operation-bound interruption (P2)

**Independent test**: Actual compiled observer lifetime selftests, real first-install/update interruption, live-authority refusal and recovery on isolated macOS.

- [x] T008 [US2] Add failing receipt regressions in tests/macos-packages.test.mjs and compiled observer selftests covering stale/exited/reused/duplicate actors, wrong generation, delayed STOP, missed boundary/resume and signal/cleanup failure. [FR-003, FR-004, SC-002]
- [x] T009 [US2] Use SDK-owned process layout/constants through a small scripts/macos-process-info.h bridge and update scripts/build-macos-packages.mjs compilation without hand-coded ABI offsets. [FR-003, SC-002]
- [x] T010 [US2] Repair scripts/macos-package-ui.swift with prelaunch identity snapshot, unique new coordinator/intent-generation binding, per-signal revalidation, actual stopped-state confirmation and bounded stop-inspect-resume admission. Record signal errno/identity/intent/terminal outcome; throw through cleanup. [FR-003, FR-004, FR-008, FR-009, SC-002]
- [x] T011 [US2] Pass expected generation from scripts/test-macos-packages.mjs, elect compiled selftests and validate stronger interruption receipts in scripts/macos-packages.mjs and scripts/ci-macos-packages.mjs. Preserve operand-free managed-install replay. [FR-003, FR-004, FR-009, SC-002]
- [ ] T012 [US2] Read back exact hosted original macOS interruption/refusal/recovery evidence and record it in specs/035-ci-observer-reliability/verification.md after T021. [FR-004, FR-009, SC-002]

## Phase 5: US3 - Windows checkpoints and bounded lifetime (P2)

**Independent test**: Stalled RPC/child/inherited-I/O regressions settle truthfully with a pre-call checkpoint; actual ordinary MSI journeys retain all existing assertions on isolated Windows.

- [x] T013 [US3] Add failing pending/queued request, close/deadline, child-no-exit, inherited-output and journal context/ordering regressions in tests/windows-package-observer.test.mjs, tests/windows-child-termination.test.mjs and focused checkpoint tests. [FR-005, FR-006, FR-007, SC-003]
- [x] T014 [US3] Implement narrowly scoped durable source/run/attempt/campaign/build/clock checkpoints and finite owned command settlement in scripts/observer-checkpoint.mjs and scripts/observer-command.mjs. Bound records/output and allowlist facts; never serialize environments or credentials. [FR-005, FR-006, FR-007, SC-003]
- [x] T015 [US3] Repair scripts/windows-package-observer.mjs request admission/closing and scripts/run.mjs deadline settlement: clip requests, reject queued work on close and finalize failed termination without indefinite exit/pipe waits. [FR-006, FR-008, FR-009, SC-003]
- [x] T016 [US3] Integrate pre-call source-bound phase/request/actor/MSI checkpoints, finite capture and preserved primary/cleanup errors into scripts/test-windows-packages.mjs and scripts/ci-windows-package-cohort.mjs. [FR-005, FR-006, FR-007, FR-009, SC-003]
- [x] T017 [US3] Retain diagnostics through existing always-run restoration/upload in .github/workflows/ci.yml and ensure outer native campaign output cannot strand the worker through inherited pipe handles. Preserve original 660/900/15 acceptance. [FR-007, FR-008, FR-009, SC-003]
- [ ] T018 [US3] Read back exact hosted Windows checkpoint/teardown and ordinary MSI outcomes into specs/035-ci-observer-reliability/verification.md after T021. [FR-005, FR-007, FR-009, SC-003]

## Phase 6: Cross-cutting verification and delivery

- [x] T019 Run npm run check, npm test and affected site build/check/browser verification; retain failing and passing source-bound results in specs/035-ci-observer-reliability/verification.md and measurements.md. [FR-008, FR-009, SC-005]
- [x] T020 Update CHANGELOG.md with concise Unreleased tooling fixes and dated process decisions; sanity-check UTF-8/LF, no mojibake and no public numbered-planning links. [FR-009, FR-011, FR-012]
- [x] T021 Commit, push and open the official S035 PR with Fixes #110, #111 and #112, the actual final scope, validation and review-round accounting. Preserve owner merge boundary. [FR-012, SC-006]
- [ ] T022 Monitor exact-head applicable CI, elect latest artifacts by creation time and exact IDs, independently bind source/clock/bytes and complete T007/T012/T018 with original records; retain preparation/qualification/combined timings in measurements.md. [FR-008, FR-009, FR-010, SC-005]
- [ ] T023 Answer and resolve every hosted review finding with necessary fixes, allow at most one explicitly requested second round after automatic first review, and finish exact-head green CI. Record counts in verification.md. [FR-012, SC-006]
- [ ] T024 Verify unchanged public v0.2.2 identities, clean local slice state and prepare final owner review/merge handoff with exact SHA/checks/review/native evidence and literal unverified limits in verification.md. [FR-010, FR-011, FR-012, SC-004, SC-005, SC-006]

## Dependencies and parallel opportunities

T001–T003 precede story implementation. Each story's failing regressions precede its repair. US1, US2 and US3 have independent platform files and may be researched in parallel. Shared process lifetime helpers are integrated before platform qualification. Hosted T007/T012/T018 explicitly depend on T021 and execute as part of T022 after all platform repairs; their placement groups acceptance by story rather than claiming earlier execution. T019/T020 precede commit/PR. T022 and T023 converge on T024.

## Implementation strategy

Implement and locally verify the complete finite Linux observer first, then macOS and Windows observer repairs. Full slice acceptance requires all three stories, actual published Linux recipient readback, exact-head hosted success and resolved bounded reviews. No partial implementation or synthetic-only proof closes an issue.
