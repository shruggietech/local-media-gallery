# Tasks: S037 legacy Windows MSI removal and recovery

**Input**: spec.md, plan.md, research.md, data-model.md and contracts/recovery.md.

## Phase 1: Setup and gates

- [x] T001 Complete installed specify/clarify/checklist/plan workflows and planning artifacts in specs/037-legacy-msi-recovery; assign #97 to S037/In progress. [FR-001 through FR-014]
- [x] T002 Complete reviewer requirements-quality assessment and read-only cross-artifact analysis before implementation; verify existing ignore/build-cache boundaries. [FR-012, FR-014]

## Phase 2: Reproduction and mechanism evidence

- [x] T003 Add failing pure diagnostic matrix/identity/outcome contract tests in tests/msi-registration.test.mjs before scripts/diagnose-msi-registration.mjs. [FR-001, FR-002, FR-003, FR-010, SC-001]
- [ ] T004 Implement the finite isolated registration probe using authenticated published inputs and read-only native observations; extend only the registered native-desktop MSI diagnostic case/route and artifact paths. Dispatch with nonblank artifact_run, retain original native 1603/cleanup failures and compare independent path controls and versions. [FR-001, FR-002, FR-003, FR-005, FR-010, FR-012, SC-001]
- [ ] T005 Record actual trigger/version observations and finalize the recovery adapter design in research.md/plan.md before production mutation. Prove existing-journal/physical-short-alias repair feasibility where applicable; surface a materially new transform/patch authority before adoption. [FR-002, FR-003, FR-004, FR-006, SC-001]

## Phase 3: US1 verified recovery

- [ ] T006 Add failing native/pure ownership tests for selected context, product/package/component, logical/physical alias identity, changed payload, links and immutable inputs in crates/gallery-update/src/native.rs, crates/windows-package/src/native.rs and their existing test modules. [FR-005, FR-006, FR-007, SC-003]
- [ ] T007 Implement the evidenced recovery adapter within existing scoped gallery-update/windows-package authority and native worker invocation; preserve authenticated journal/input and physical handle pins. [FR-004, FR-005, FR-006, FR-007, FR-010, SC-002, SC-003]
- [ ] T008 Expose supported recovery through the existing maintenance entry point in crates/gallery-update/src/ordinary.rs and main.rs as required by the actual adapter; retain explicit failure/incomplete results. [FR-004, FR-010, SC-002]

## Phase 4: US2 replacement, restoration and interruption

- [ ] T009 Add failing replacement/rollback/recovery and subsequent removal cases with retained-data inventories in existing Windows package/native tests before integration. [FR-008, FR-009, FR-011, SC-004]
- [ ] T010 Integrate the adapter with transaction/native worker lifecycle and actual terminal readback in crates/gallery-update/src/native.rs, process.rs and worker.rs where needed. [FR-008, FR-009, FR-010, SC-004]

## Phase 5: US3 refusal and acceptance election

- [ ] T011 Complete negative ownership, stale/foreign input, linked path, wrong scope, interruption and incomplete-worker coverage; preserve all existing tests. [FR-006, FR-007, FR-010, FR-011, SC-003, SC-004]
- [ ] T012 Elect exact affected-path/version and recovery assertions in scripts/test-windows-packages.mjs and windows-package-evidence.mjs, retaining ordinary package scenarios, data-integrity checks, 660/900/15-second clocks and all final Qualification scopes. [FR-001, FR-003, FR-008, FR-009, FR-011, FR-012, SC-002 through SC-005]

## Phase 6: Documentation and delivery

- [ ] T013 Write source-only docs/unreleased/legacy-msi-recovery.md and update CHANGELOG.md with observed affected versions, owner workflow and dated workflow/adapter decisions; preserve published snapshots, versions and governed bytes. [FR-013]
- [ ] T014 Run npm run check, npm test, npm run check:app and affected docs/site checks through the verified hidden launcher; native installation remains hosted only. Record meaningful local failures/fixes and evidence boundaries in verification.md. [FR-011, FR-012, SC-005]
- [ ] T015 Review all changed paths, UTF-8/no-BOM/LF/mojibake, docs and final ownership claims; prepare ignored PR packet and zero-to-two hosted review ledger. [FR-005, FR-007, FR-013, FR-014]
- [ ] T016 Commit/push the implementation and open the official PR with Fixes #97. Track complete final-head hosted CI and findings on the PR; use no more than two hosted review rounds and leave final merge to the owner. [FR-014, SC-005, SC-006]

## Dependencies and parallel opportunities

T001–T002 gate T003–T004. T005 gates production T006–T008. T009 precedes T010. T011–T012 compose all three required stories. T013 may be drafted while local checks run, but shared maintenance files are edited sequentially. Two independent read-only research audits informed the plan; one explicitly approved all twelve reviewer checklist items. Hosted diagnostic runs are evidence, not product acceptance. Full final CI and reviews belong to the PR receipt, without a completion-only source commit.

## Implementation strategy

Complete the exact reproduction and controlled boundary first. Prefer a proven adapter using existing repair/ownership authority, with tests preceding mutation code. All three stories are required; a diagnostic-only result does not close #97. Preserve original failures and distinguish immutable old behavior, supported current recovery, local unit checks and hosted exact-candidate acceptance.
