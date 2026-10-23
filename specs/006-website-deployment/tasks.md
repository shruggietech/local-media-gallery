# Tasks: Public website deployment

**Slice**: S006 | **Issue**: #32 | **Branch**: codex/006-website-deployment

## Phase 1: Setup

- [x] T001 Apply specify, clarify, checklist and plan workflows in specs/006-website-deployment; verify credentials, existing registration/zone and current authoritative contracts (FR-001/002/010).
- [x] T002 Remove superseded S005 delivery notes in specs/005-website-foundation and PR #33 description (FR-011).
- [x] T003 Run blocking cross-artifact analysis for specs/006-website-deployment/spec.md, plan.md and tasks.md (FR-001..011).

## Phase 2: Foundational contracts

- [x] T004 Write failing DNS/artifact/live contract tests in tests/deployment.test.mjs before scripts/deployment.mjs implementation (FR-001/002/004..008).
- [x] T005 Define exact deployment policy in site/deployment.json and implement confined inventory/hash/qualification validation in scripts/deployment.mjs and scripts/verify-deployment.mjs (FR-004/007).

## Phase 3: User Story 1, official live reading

**Goal**: Serve the checked retained website over verified HTTPS.
**Independent test**: Exact deployed inventory and browser navigation pass.

- [x] T006 [US1] Emit identity before hashing in scripts/build-site.mjs and keep provenance exclusions current in scripts/provenance.mjs (FR-004/007/009).
- [x] T007 [US1] Add pinned Pages packaging and all-check-gated OIDC deployment to .github/workflows/ci.yml, with exact bootstrap ref and github-pages environment (FR-004/010).
- [x] T008 [US1] Implement bounded complete live inventory/redirect/TLS checks in scripts/verify-live-site.mjs and scripts/deployment.mjs; reuse rendered acceptance in scripts/test-site.mjs (FR-006/007).

## Phase 4: User Story 2, provider reconciliation

**Goal**: Bind the owned domain and preserve unrelated services.
**Independent test**: Provider and authoritative/public DNS readback agree.

- [x] T009 [US2] Implement environment-only provider access and redacted preflight/plan/apply/readback in scripts/configure-domain.mjs and scripts/deployment.mjs (FR-001/002/005/006).
- [x] T010 [US2] Complete organization verification, Pages domain binding and exact web DNS reconciliation; retain private evidence under .local/site-deployment (FR-003/005/006).

## Phase 5: User Story 3, repeat and recover

**Goal**: Repeat with no writes and recover owned changes without overwriting concurrent state.
**Independent test**: Small rollback/conflict fixtures plus live reversible drill and no-op reconciliation.

- [x] T011 [US3] Implement persisted per-mutation journal and compare-before-restore rollback in scripts/configure-domain.mjs and scripts/deployment.mjs; test interrupted/partial/conflicting state in tests/deployment.test.mjs (FR-008).
- [x] T012 [US3] Run live no-op and scoped rollback drill; retain previous checked content and provider before/after evidence under .local/site-deployment (FR-008).

## Phase 6: Qualification and publication

- [x] T013 Update docs/v0.0.0/website-and-documentation.md, README.md, CONTRIBUTING.md and CHANGELOG.md with authoritative contracts, runnable commands and dated deployment decision (FR-009/010).
- [x] T014 Run repository/product/site qualification with readiness, terminal times, exact source/artifact evidence and integrity checks; record in specs/006-website-deployment/verification.md (FR-001..009).
- [ ] T015 Commit/push S006, open and attach official PR, set Project Slice S006/status and exact environment bootstrap permission, then wait for terminal CI/deployment (FR-004/010).
- [ ] T016 Verify live DNS/provider/HTTPS/all-file/browser behavior, respond to every actual review and resolve threads within at most two rounds; record evidence in specs/006-website-deployment/verification.md and hand off before merge (FR-001..010).

## Dependencies and execution

T001/T002 precede T003. T003 gates T004; tests run red before T005/T009/T011. T005 precedes T006..T008. T009 precedes T010. T011 precedes T012. T013 precedes T014; T014 precedes T015; actual deployment precedes final T016. Provider preparation may run while independent read-only qualification is active. No parallel source edits are planned.

## Parallel opportunities

Read-only Pages and DNS research ran independently during plan. Fixture groups can run independently after their modules exist. Provider observation and CI waits are independent; source mutations remain sequential.

## Implementation strategy

Build actual artifact/provider contracts first, preserve existing qualified behavior, establish ownership before traffic routing, then publish the exact artifact and verify the real public site. All three stories are required for #32 closure; the initial landing-only increment is not completion.
