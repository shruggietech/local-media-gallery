# Tasks: ordinary Windows MSI upgrade repair

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/upgrade.md and quickstart.md.

## Phase 1: Setup

- [x] T001 Create specification/selector and issue #102 in specs/033-windows-msi-upgrade/spec.md and .specify/feature.json (FR-010, FR-011).
- [x] T002 Complete installed clarify/plan/task setup, research and author checklist in specs/033-windows-msi-upgrade/plan.md, research.md and checklists/requirements.md (FR-001, FR-007, FR-010).

## Phase 2: Foundational

- [x] T003 Run blocking read-only analysis and implementation prerequisite/checklist gate; retain its result in specs/033-windows-msi-upgrade/verification.md (FR-001 through FR-011).
- [x] T004 Add bounded published-pair isolated diagnostic mode in scripts/diagnose-msi-upgrade.mjs and .github/workflows/native-desktop.yml, preserving existing modes and attributed observations (FR-001, FR-007, FR-008).

## Phase 3: US1 - Ordinary predecessor replacement

**Goal**: Reproduce the exact reported baseline and repair the ordinary wizard path.

**Independent test**: Original baseline failure and candidate success under the same starting state, exact artifact identities, original logs/dialogs and resulting native product.

- [x] T005 [US1] Dispatch the isolated published-pair baseline, retain directory/token/full-UI versus quiet controls and exact original operands under .local/s033-reproduction/; record causal evidence and any amended analysis in specs/033-windows-msi-upgrade/research.md (FR-001, FR-007, SC-001).
- [x] T006 [US1] Write failing ordinary upgrade regressions in tests/msi-upgrade.test.mjs and the elected native package journey in scripts/test-windows-packages.mjs before the source repair (FR-002, FR-006, SC-004).
- [x] T007 [US1] Implement the demonstrated minimal native directory/sequence compatibility correction in packaging/windows/installer.wxs, crates/windows-package/src/native.rs and crates/windows-package/src/msi_elevation.rs, preserving published inputs and existing guards (FR-002, FR-005, FR-008).
- [x] T008 [US1] Repeat the exact ordinary wizard journey with the source-bound candidate, verify inherited scope/location/choices, native product/package and installed launch in scripts/test-windows-packages.mjs and retained original runtime evidence (FR-002, FR-003, FR-006, SC-002).

## Phase 4: US2 - Data integrity and recovery

**Goal**: Preserve user/foreign data and retain truthful refusal/cancellation behavior.

**Independent test**: Original inventories and native state agree after success, cancellation and refusal.

- [ ] T009 [US2] Add and run preservation and tampered payload/package/shortcut/source refusal cases around the ordinary transition in scripts/test-windows-packages.mjs and affected Rust/native tests (FR-004, FR-005, SC-003).
- [ ] T010 [US2] Verify native cancellation/rollback and no orphaned predecessor registration while preserving original failure diagnostics, through scripts/windows-package-evidence.mjs and affected cohort validation (FR-003, FR-004, FR-005, FR-006, SC-003).

## Phase 5: US3 - Reviewable candidate

**Goal**: Provide a final source-bound green PR within the authorized review cap.

**Independent test**: Exact final head, all applicable terminal CI and addressed review comments.

- [ ] T011 [US3] Update CHANGELOG.md with repair and dated workflow decision; run npm check/tests/docs plus affected native/site checks and UTF-8/LF/mojibake/published-history preservation checks (FR-007, FR-008, FR-009, FR-010, SC-004).
- [ ] T012 [US3] Commit/push/open official PR, elect exact final-head hosted qualification and independently verify original receipts, upgrade evidence and preparation/qualification/combined timing (FR-009, FR-010, FR-011, SC-005).
- [ ] T013 [US3] Address every hosted review finding with replies/resolution and at most two total Codex rounds; retain count/head/checks in specs/033-windows-msi-upgrade/verification.md (FR-011, SC-005).

## Phase 6: Closeout

- [ ] T014 Complete chronological verification/measurements and issue/Project/PR handoff, report actual host/reproduction/preservation limits and stop for owner merge in specs/033-windows-msi-upgrade/verification.md and measurements.md (FR-007, FR-008, FR-010, FR-011, SC-006).

## Dependencies and Execution Order

T001-T003 precede source changes. T004-T005 establish the baseline and causal gate before T006-T008 repair acceptance. Amend design and rerun analysis before a materially different mechanism. T009-T010 preserve the adjacent integrity boundary; they finish before T011-T013 qualification/reviews. T014 closes the PR handoff after actual evidence, without merge/publication.

## Parallel Opportunities

Read-only Phase 0 research and source/contract inventory are independent. Isolated runtime collection can overlap local text/unit checks after analysis. Tests sharing the same installed product and authoring source run sequentially; independent CI scopes retain their existing scheduling.

## Implementation Strategy

Reuse immutable published inputs and the existing observer/native framework. Reproduce before fixing, elect the ordinary wizard independently of advanced recovery, then verify data/refusal/cancellation boundaries and final-head CI. No blanket skip of legacy custom actions, published installer replacement or manual owner workaround is an acceptable increment.
