# Tasks: v0.2.2 hotfix release preparation

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/publication-handoff.md and quickstart.md.

## Phase 1: Setup

- [x] T001 Create the S034 specification, author checklist and issue #108 in specs/034-v022-hotfix-preparation/spec.md and .specify/feature.json (FR-010, SC-006).
- [x] T002 Inventory exact published inputs and immutable versioned paths before edits; retain identities in specs/034-v022-hotfix-preparation/research.md and ignored evidence (FR-005, FR-008, SC-001).
- [x] T003 Complete clarification, installed plan/task setup and read-only Phase 0 research/design in specs/034-v022-hotfix-preparation/plan.md, research.md, data-model.md, contracts/publication-handoff.md and quickstart.md (FR-001 through FR-010).

## Phase 2: Foundational

- [x] T004 Run the blocking read-only analysis and implementation prerequisite/author checklist gate; record its result in specs/034-v022-hotfix-preparation/verification.md (FR-001 through FR-010, SC-001 through SC-006).

## Phase 3: US1 - Coherent immutable hotfix candidate

**Goal**: Align the new candidate while retaining all published history.

**Independent test**: Active declarations agree, all historical inventory bytes and manifest entries agree, and candidate docs remain distinct from public latest.

- [x] T005 [US1] Add the v0.2.1 published-history inventory and preservation regression in tests/fixtures/releases/v021-inventory.json and tests/initial-release.test.mjs; check accepted portable-version compatibility (FR-001, FR-005, SC-001).
- [x] T006 [US1] Align owned product/lock metadata, create complete docs/v0.2.2 and schemas/v0.2.2, append new site snapshot/reference inputs, update README.md/SECURITY.md/CHANGELOG.md and register only S034 progress exclusions in scripts/provenance.mjs (FR-001, FR-005, FR-006, SC-001).

## Phase 4: US2 - Both ordinary predecessor upgrades

**Goal**: Verify the expected wizard experience from both exact released starting states.

**Independent test**: Both rows complete ordinary limited-client upgrade and installed launch; cancellation/refusal preserve attributable native/user/foreign state.

- [x] T007 [US2] Add paired-predecessor evidence and mutation regressions in tests/msi-upgrade-evidence.test.mjs and tests/windows-package-cohort.test.mjs, including missing/duplicate/wrong identities, authorization modes, native outcomes, preservation and missing installed launch (FR-002, FR-003, FR-004, FR-008, SC-002, SC-003).
- [x] T008 [US2] Add pinned canonical v0.2.1 direct-MSI preparation/audit/admin-image payload verification and ordinary-only predecessor selection in scripts/build-windows-packages.mjs, leaving advanced recovery inputs unchanged (FR-002, FR-005, FR-009, SC-002).
- [x] T009 [US2] Generalize the shared ordinaryUpgradeCampaign routine for both predecessor versions, actual ProductCodes, explicit modern machine installation, versioned work/log/launch labels and complete preservation/native observations in scripts/test-windows-packages.mjs (FR-002, FR-003, FR-004, FR-009, SC-002, SC-003).
- [x] T010 [US2] Validate exact paired coverage and distinct native authorization paths, retain historical receipt compatibility, transfer both observations and retain all original nested evidence through scripts/windows-package-evidence.mjs, windows-package-cohort.mjs and .github/workflows/ci.yml (FR-002, FR-003, FR-004, FR-007, FR-008, SC-002, SC-003, SC-004).

## Phase 5: US3 - Source-bound reviewable candidate

**Goal**: Deliver complete current-source evidence and a reviewable PR within the review cap.

**Independent test**: Final PR head matches terminal applicable checks, original receipts/operands and resolved hosted findings.

- [ ] T011 [US3] Run repository/tests/docs and affected app/site checks, historical inventory and UTF-8/LF/mojibake checks; retain actual outcomes and unchanged owner/public state in specs/034-v022-hotfix-preparation/verification.md (FR-005, FR-006, FR-007, FR-009, SC-001, SC-003, SC-004).
- [ ] T012 [US1] Commit source A, perform ordinary vocabulary review and exact-source new 0.2.2 snapshot capture into a fresh destination, copy only site/retained/v0.2.2.json, complete candidate checks/short publication handoff and commit source B (FR-001, FR-005, FR-006, SC-001, SC-006).
- [ ] T013 [US3] Automatically push/open the official PR and elect complete final-head hosted qualification with unchanged checks/660/900/15 timing contract (FR-007, FR-008, FR-010, SC-004, SC-006).
- [ ] T014 [US3] Address and resolve every finding from no more than two hosted review rounds; preserve exact count/head/outcomes in PR and ignored evidence (FR-010, SC-005).
- [ ] T015 [US3] Independently read original current-source canonical/worker/election/runtime artifacts, both predecessor operations and installed launches; record exact identities, actual host limits and preparation/qualification/combined timing in PR, ignored evidence and specs/034-v022-hotfix-preparation/measurements.md where available before the final source commit (FR-002, FR-003, FR-004, FR-007, FR-008, FR-009, SC-002, SC-003, SC-004).

## Phase 6: Closeout

- [ ] T016 Complete issue #108/Project/PR handoff, record the future accepted-main publication boundary, preserve all public/historical state and stop for owner review/merge (FR-005, FR-006, FR-010, SC-005, SC-006).

## Dependencies and Execution Order

T001-T003 precede blocking T004. T005-T006 establish current versions/history. T007 tests precede T008-T010 ordinary coverage changes. T011 precedes exact committed-source capture T012; final snapshot/candidate checks precede T013. T014 and T015 may overlap hosted CI observation, but T016 waits for actual terminal green CI, independent evidence and resolved reviews. Final post-commit results are recorded in the PR/ignored evidence without changing the accepted source afterward.

## Parallel Opportunities

The two read-only Phase 0 research inventories are independent. Published-history inventory and pure evidence fixtures are independent after analysis. Installer campaigns sharing an installed product remain sequential; separate hosted scopes retain their existing scheduling.

## Implementation Strategy

Reuse existing version/snapshot tooling and ordinary upgrade routine. Preserve legacy evidence requirements and model the modern path separately within the same validator. Keep all existing recovery cases and deadlines. Prepare source and records before CI; later source changes require fresh exact-head qualification.
