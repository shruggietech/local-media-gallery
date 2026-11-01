# Tasks: Release recovery and retained gate evidence

**Input**: `specs/023-release-recovery/` design artifacts. Tests are mandatory for #76.
**Organization**: Ordered by user story; implementation proceeds sequentially in shared publisher files.

## Phase 1: Setup

- [x] T001 Create S023 specification, clarify decisions and design artifacts in specs/023-release-recovery/.
- [x] T002 Verify hidden tooling, current docs, constitution and .specify/feature.json identity.

## Phase 2: Foundation

- [x] T003 Model temporary draft URLs and delayed committed writes in tests/fixtures/releases/github-service.mjs.

## Phase 3: US1 - Real draft assets

Independent test: stage temporary URLs, enforce final public URLs and refuse foreign identities/content.

- [x] T004 [US1] Add failing draft/final URL and authenticated identity cases in tests/release-publication.test.mjs (FR-001/002).
- [x] T005 [US1] Implement draft/API identity verification and final URL checks in scripts/release-publication.mjs (FR-001/002/010).

## Phase 4: US2 - Delayed observations

Independent test: one write per committed mutation, bounded pending reads, immediate conflicts and retained starter recovery.

- [x] T006 [US2] Add delayed/lost mutation, timeout, conflict and deadline regressions in tests/release-publication.test.mjs (FR-003/004/005/006).
- [x] T007 [US2] Add bounded observation and async request deadlines in scripts/github-release.mjs (FR-003/004/005).
- [x] T008 [US2] Integrate single-write reconciliation into scripts/release-publication.mjs (FR-003/004/006/010).

## Phase 5: US3 - Retained gates

Independent test: re-extract and recompute both exact projections; reject changed/missing files.

- [x] T009 [US3] Add retention/tampering regressions in tests/release-evidence.test.mjs (FR-007/008).
- [x] T010 [US3] Implement exact gate retention/readback in scripts/release-evidence.mjs (FR-007/008).
- [x] T011 [US3] Retain candidate immediately after its gate and publication evidence in scripts/release.mjs and .github/workflows/release.yml (FR-007/008/010).

## Phase 6: Integration and handoff

- [x] T012 Exercise realistic delayed mutations and both independent evidence projections in scripts/test-release-campaign.mjs (FR-009).
- [x] T013 Document maintainer recovery/readback usage in README.md and dated process decisions in CHANGELOG.md.
- [x] T014 Run npm run check, npm test and affected release/site campaign; record terminal clocks/results in specs/023-release-recovery/verification.md and measurements.md.
- [ ] T015 Commit, push and open official S023 PR referencing #76.
- [ ] T016 Verify final-head CI, address every review finding within at most two rounds, record evidence in specs/023-release-recovery/verification.md.
- [ ] T017 Verify clean local state and GitHub tracking, then ping owner for final review/merge.

## Dependencies and execution strategy

T001-T002 -> T003 -> US1 -> US2 -> US3 -> T012-T017. T009-T010 may be developed independently of publisher changes but are executed sequentially here. MVP is US1; delivery requires all three stories. Tests precede corresponding implementations. No new runtime dependencies, product release, tag or native GUI actions.
