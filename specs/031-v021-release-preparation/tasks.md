# Tasks: v0.2.1 release preparation

**Input**: spec.md, plan.md, research.md, data-model.md and contracts/publication-handoff.md.

## Phase 1: Setup

- [x] T001 Create the S031 selector, specification, clarification, design and #98 tracking in .specify/feature.json and specs/031-v021-release-preparation/.
- [x] T002 Record committed historical snapshot/backport preservation baselines in .local/s031-preservation.json and inspect existing tests/fixtures/releases/ coverage.

## Phase 2: Foundational

- [x] T003 Complete blocking spec/plan/task consistency analysis and record its findings in specs/031-v021-release-preparation/verification.md after the read-only analysis phase.
- [x] T004 Register exactly the S031 tasks/verification/measurements progress files in scripts/provenance.mjs, preserving logical source identity for all implementation/design changes.

## Phase 3: US1 - Accurate patch-release information

**Goal**: Current 0.2.1 descriptions are accurate while historical products and actual availability remain unchanged.

**Independent test**: Compare current release/support descriptions and immutable historical inventories with the implemented behavior and canonical 0.2.0 record.

- [x] T005 [P] [US1] Finalize concise pending 0.2.1 release history/highlights in CHANGELOG.md and specs/031-v021-release-preparation/contracts/publication-handoff.md (FR-001, FR-002, FR-011).
- [x] T006 [P] [US1] Refresh actual published/candidate availability and support descriptions in README.md and SECURITY.md without adding unsupported compatibility promises (FR-002, FR-003).
- [x] T007 [P] [US1] Clarify supporting qualification operand provenance in docs/v0.2.1/verification-and-compatibility.md, preserving deferred issue and native coverage boundaries (FR-009, FR-012).

## Phase 4: US2 - Complete publication input retrieval

**Goal**: The actual publisher reassembles accepted canonical and supporting evidence using immutable authority, preserving historical compatibility.

**Independent test**: Exercise real streaming archive transport and fixture selection/reassembly; reject changed, missing, expired, foreign, duplicate, oversized and mixed-clock evidence.

- [x] T008 [US2] Add negative and legacy supporting-input regressions in tests/release-evidence.test.mjs and existing GitHub transport coverage in tests/github-release.test.mjs before implementation (FR-004, FR-005, FR-009).
- [x] T009 [US2] Implement accepted-gate hash binding and supporting evidence election in scripts/release-inputs.mjs: campaigns experience/lifecycle, unique positive IDs, lowercase sha256 digests, exact declared sizes at most 5 GiB and identical run/revision/source/attempt/common clock (FR-004, FR-005).
- [x] T010 [US2] Implement bounded streamed/hash-verified supporting archive retrieval and retained worker receipt/fragment checks in scripts/release-inputs.mjs; preserve canonical 4-GiB and existing expanded 5-GiB bounds (FR-004, FR-007, FR-009).
- [x] T011 [US2] Wire scripts/release.mjs to the verified input path without changing releaseScopes, public release schemas, historical selection or publication guards (FR-001, FR-005, FR-011).
- [x] T012 [US2] Run elected GitHub/release-evidence/CLI regressions and inspect immutable current artifact selection through .local/s031-release-input-validation.json (FR-004, FR-005, FR-009).

## Phase 5: US3 - Tooling remediation and owner handoff

**Goal**: The bounded advisory and actual installed callers pass, with complete final-head evidence and no more than two hosted Codex rounds.

**Independent test**: Resolve through installed affected parents, exercise recognized amplification under a memory/deadline bound, run actual lint/type/site checks, then inspect hosted qualification and review state.

- [x] T013 [US3] Add a memory/deadline-bounded upstream amplification and caller matching regression in tests/minimatch-security.test.mjs; timeout or abnormal exit is failure (FR-006).
- [x] T014 [US3] Pin the narrow minimatch 11.0.1 override in package.json and regenerate package-lock.json, preserving parent versions and the verified glib backport (FR-006).
- [ ] T015 [US3] Run advisory, affected app/site lint/type checks and full repository/documentation tests; compare historical/backport baselines in .local/s031-preservation.json (FR-003, FR-006, FR-007).

## Phase 6: Polish and qualification

- [ ] T016 Commit source A, perform ordinary vocabulary review, capture 0.2.1 into a fresh .local destination and replace only site/retained/v0.2.1.json; run historical preservation and current capture checks (FR-003, FR-009).
- [ ] T017 Run complete local parity and affected production site checks; commit final source B with UTF-8/LF/corruption checks in specs/031-v021-release-preparation/verification.md (FR-007, FR-008).
- [ ] T018 Push and open the official #98-closing S031 PR; record the automatic initial Codex round and at most one follow-up request in .local/s031-review-ledger.json; reply to and resolve every received finding (FR-010).
- [ ] T019 Verify all nine exact-final-head canonical scope receipts, all applicable terminal CI jobs and complete independent original artifact/documentation/recipient evidence in specs/031-v021-release-preparation/measurements.md or the PR (FR-007, FR-008, FR-009).
- [ ] T020 Update #98/Project tracking and the concrete later publication procedure in specs/031-v021-release-preparation/contracts/publication-handoff.md, then ping the owner for final review/merge with no tag, release, promotion or merge performed (FR-010, FR-011, FR-012).

## Dependencies

T001-T004 precede implementation. US1, US2 and US3 research may proceed independently, but security/negative regressions precede their corresponding fixes. T016 waits for all implementation and preservation checks; T017 follows committed-source capture. T018-T020 follow verified final source. Review fixes repeat only affected checks and required exact-head qualification, preserving the same cap and timing contract.

## Parallel opportunities

- US1: T005, T006 and T007 use different files and can be edited independently after setup.
- US2: pure identity/clock fixture design and streaming transport fixture research can proceed independently before integration.
- US3: advisory/caller research is independent of release prose and artifact identity research. Lockfile mutation and dependency installation remain sequential.

## Implementation strategy

Prepare accurate release information, complete immutable evidence retrieval, and remediate the advisory as three independently testable increments. Reuse all existing publication and native qualification controls. Do not turn reviewer-owned custom checklist markers into implementation completion or a new approval request under owner-authorized autopilot.
