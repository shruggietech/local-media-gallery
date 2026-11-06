# Tasks: v0.2.1 publication and verification

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/publication.md and quickstart.md.

## Phase 1: Setup

- [x] T001 Create S032 branch/selector/specification, answer scope clarifications and create #100 tracking in .specify/feature.json and specs/032-v021-publication/spec.md.
- [x] T002 Run installed template/plan/task setup procedures, complete research/design and author quality review in specs/032-v021-publication/plan.md and checklists/requirements.md.

## Phase 2: Foundational

- [x] T003 Run blocking read-only cross-artifact analysis; after it passes, record coverage and gates in specs/032-v021-publication/verification.md (FR-010, FR-014).
- [x] T004 Verify clean f9bd main/renderer and historical preservation baseline, set #100/Project In progress and retain source/authorization data in .local/s032-source-baselines.json (FR-008, FR-011, FR-012, FR-013, FR-014).

## Phase 3: US1 - Qualified patch publication

**Goal**: Publish exactly the accepted main products, with attributable operational recovery.

**Independent test**: Original main envelope, all nine receipts and immutable supporting operands agree with the actual release operation and seven published product/source descriptors.

- [x] T017 [US1] Amend scope/design and rerun the blocking read-only analysis for the demonstrated stale-worker qualification defect (FR-012, FR-015).
- [x] T018 [US1] Add current-cohort artifact selection and exact-ID workflow downloads, with stale/current/boundary/provenance regression coverage in scripts/windows-package-cohort.mjs, scripts/ci-windows-package-cohort.mjs, .github/workflows/ci.yml and tests/windows-package-cohort.test.mjs (FR-015, SC-007).
- [ ] T019 [US1] Run repository and affected checks, preserve the legacy-selector counterexample and publish the repair PR with at most two hosted review rounds; obtain the normal owner merge before publication (FR-001, FR-010, FR-011, FR-012, FR-015).

- [ ] T005 [US1] After the prerequisite repair merges, elect its successful terminal push-main run, retain its original envelope and verify applicable jobs, nine canonical receipts, exact Windows worker references and timing through .local/s032-main-evidence/. Initial run 42174731987 is failed diagnostic history (FR-001, FR-002, FR-004, FR-009, FR-011).
- [ ] T006 [US1] Prepare and revalidate explicit dispatch inputs/highlights, current main and predecessor in .local/s032-release-dispatch.json against contracts/publication.md (FR-002, FR-003, FR-004, FR-012).
- [ ] T007 [US1] Execute the existing .github/workflows/release.yml main workflow, observe release and Pages terminal state and retain original journals/gates under .local/s032-release-execution/; use attributable existing recovery only if needed (FR-003, FR-004, FR-009, FR-011, FR-013).

## Phase 4: US2 - Public metadata, assets and documentation

**Goal**: Independently observe the actual release and public selection.

**Independent test**: All public product/source bytes, canonical metadata, both original gate exports and live latest/download/documentation behavior agree with the published candidate.

- [ ] T008 [P] [US2] Resolve actual canonical metadata and anonymously stream/hash all seven selected product/source assets in .local/s032-published-readback.json, preserving actual release/tag/asset IDs (FR-002, FR-003, FR-005, FR-011).
- [ ] T009 [P] [US2] Retain and replay both original documentation gate exports using the clean f9bd renderer/base, verify all historical inventories and store .local/s032-documentation-readback.json (FR-004, FR-008, FR-011, FR-012).
- [ ] T010 [US2] Verify actual completed Pages deployment, live inventory/latest/version switching/search/raw contracts and every product download target in .local/s032-live-readback.json (FR-006, FR-008, FR-011).

## Phase 5: US3 - Published prepared-recipient acquisition

**Goal**: Demonstrate actual acquisition from canonical v0.2.1 on covered hosts.

**Independent test**: Three hosted acquisition receipts and original retained archives/screenshots match the public canonical candidate, version and selected Lite bytes.

- [ ] T011 [US3] Dispatch a new .github/workflows/ci.yml run on unchanged main after promotion and retain its identity in .local/s032-post-publication-ci.json; do not rerun or mutate the original elected run (FR-007, FR-011, FR-012, FR-013).
- [ ] T012 [US3] Read the actual Windows/Linux/macOS package preparedRecipient observations, binding releaseVersion/candidateId/canonical hash/artifact name/bytes/hash to the published record in .local/s032-recipient-identities.json (FR-007, FR-011).
- [ ] T013 [US3] Retrieve original recipient gallery archives and screenshots by exact artifact identity, preserve operand paths and run scripts/prepared-recipients.mjs validatePreparedRecipient for all three platforms; retain .local/s032-recipient-readback.json (FR-007, FR-011, FR-013).

## Phase 6: Polish and Closeout

- [ ] T014 Run repository tests/documentation checks and corruption/preservation checks for authored planning/evidence; confirm remote main and historical bytes remain unchanged in .local/s032-closeout-checks.json (FR-008, FR-009, FR-010, FR-012).
- [ ] T015 Complete chronological verification/measurements and issue/Project status with exact run/release/asset/documentation/recipient evidence in specs/032-v021-publication/verification.md and measurements.md (FR-009, FR-011, FR-014).
- [ ] T016 Commit the completed operational slice artifacts after verification, retain durable execution references and report the concrete public result and any remaining deviations (FR-010, FR-014).

## Dependencies and Execution Order

T001-T003 precede operational implementation. T004 establishes the clean source boundary. T005 blocks all release mutation. T006 precedes T007. T008/T009 are independent after release evidence exists; T010 requires completed public deployment. T011 follows canonical promotion and can overlap public byte/live readback. T012/T013 require actual post-publication observations. T014-T016 close all three stories after their required evidence exists.

Execution amendment: T017-T019 precede T005 because both initial main attempts failed. T017 is a blocking analysis gate before source repair. The owner merge of the concrete repaired PR is required; publication authorization persists afterward and needs no new confirmation.

## Parallel Opportunities

- US1: read-only main-run observation and local baseline inspection can overlap; publication mutations remain sequential.
- US2: public asset hashing and original documentation gate replay use separate evidence files and can run independently.
- US3: retain each platform's original recipient operands as its hosted packet arrives; one platform's failure does not invalidate successful peers or erase failed evidence.

## Implementation Strategy

Reuse the existing publisher and validators. Publication is the first increment, public selection is the second and actual recipient observations are the third; metadata-only success does not close the recipient story. No product change is expected. Fix only demonstrated defects with their affected verification, preserve original failed observations and keep accepted release assets immutable.
