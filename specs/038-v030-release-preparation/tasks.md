# Tasks: S038 resilient qualification and v0.3.0 preparation

**Input**: spec.md, plan.md, research.md, data-model.md and contracts/acquisition-and-release.md.

**Tests**: Test-driven coverage is explicitly required by the specification and autopilot protocol. Tests precede the matching implementation. All three P1 stories are required for this slice.

## Phase 1: Setup

- [x] T001 Complete specify/clarify/checklist and issue #116/Project S038 tracking in specs/038-v030-release-preparation/spec.md, checklists/ and .specify/feature.json. [FR-013, FR-014]
- [x] T002 Complete installed plan setup, two read-only research inventories and reviewer-approved requirements checklist in specs/038-v030-release-preparation/plan.md, research.md, data-model.md, contracts/acquisition-and-release.md and quickstart.md. [FR-001 through FR-014]

## Phase 2: Foundational blocking gate

- [x] T003 Generate tasks and run installed read-only cross-artifact analysis/implementation prerequisites; verify existing ignore boundaries and checklist approval in specs/038-v030-release-preparation/tasks.md and verification.md. [FR-013, FR-014]

## Phase 3: US1 bounded acquisition recovery

**Goal**: Recover elected temporary acquisition failures without accepting invalid content or replaying mutations.

**Independent test**: Controlled response/transport sequences, real loopback stalled/interrupted bodies and file sinks prove exact attempts, finite elapsed admission, redaction and permanent-error refusal.

- [x] T004 [US1] Add failing policy/body tests in tests/download-acquisition.test.mjs for explicit temporary statuses, nested transport versus TLS/configuration, size/integrity, Retry-After, cancellation/deadline, independent concurrent attempts and credential-free diagnostics. [FR-001 through FR-006, SC-001, SC-002]
- [x] T005 [US1] Implement scripts/download-acquisition.mjs with a finite default maximum of four attempts, one absolute elapsed budget, complete body consumption, bounded byte reading and safe terminal observations; cancellation/exhaustion cannot return to admitted. [FR-001 through FR-006, SC-001, SC-002]
- [x] T006 [US1] Add failing tests in tests/github-release.test.mjs and tests/feature-helper-source.test.mjs for GET retries, one-shot POST/PATCH/DELETE/upload, preserved observation failure, redirects/credentials, complete stream replay with independent count/hash and explicit output offset. [FR-002 through FR-007, SC-001, SC-002]
- [x] T007 [US1] Integrate complete read retries and owned file reset in scripts/github-release.mjs; preserve 300/600-second caller allowances, redirect authority and non-resettable sink behavior. [FR-001 through FR-007, SC-001, SC-002]
- [x] T008 [US1] Route existing preparation/read paths through shared acquisition in scripts/prepare.mjs, prepare-media-tool.mjs, prepare-screen-reader.mjs, prepare-feature-helper.mjs, sync-brand-kit.mjs, build-windows-packages.mjs, linux-offline-installer.mjs, diagnose-msi-registration.mjs, diagnose-msi-upgrade.mjs and ci-windows-package-cohort.mjs; retain existing pins/limits and exclude native driver, offline probes and mutations. [FR-001 through FR-007, SC-001, SC-002]

## Phase 4: US2 coherent v0.3.0 candidate

**Goal**: Prepare versioned navigation/recovery contracts and exact latest-published upgrade coverage without changing historical publication.

**Independent test**: The old inventory and canonical selection match, new declarations agree, and native candidate/ordinary predecessor/receiver identities remain distinct.

- [x] T009 [US2] Inventory v0.2.2 published source paths/manifest row before edits in tests/fixtures/releases/v022-inventory.json; add failing history/version/schema checks in tests/initial-release.test.mjs and tests/product-version.test.mjs. [FR-008, FR-010, SC-003]
- [x] T010 [US2] Align VERSION, owned package/Cargo/native metadata and lock rows; create docs/v0.3.0, schemas/v0.3.0, site/snapshots/v0.3.0 and new manifest row, append settings compatibility, and add only S038 progress exclusions in scripts/provenance.mjs. Preserve all historical bytes and canonical latest. [FR-008, FR-010, SC-003]
- [x] T011 [US2] Add failing modern v0.2.2 and triple ordinary-upgrade evidence/refusal tests in tests/msi-upgrade-evidence.test.mjs, plus current navigation fixture identity coverage in scripts/test-gallery-navigation.mjs. [FR-011, SC-004]
- [x] T012 [US2] Add pinned v0.2.2 canonical record/direct MSI audit and administrative payload extraction in scripts/build-windows-packages.mjs; extend current evidence expectations in scripts/windows-package-evidence.mjs and preserve historical readers, advanced legacy cases and actual recipient identities. [FR-010, FR-011, FR-012, SC-003, SC-004]
- [x] T013 [US2] Promote existing navigation/recovery contracts into new versioned chapters; update README.md, SECURITY.md, CHANGELOG.md and new release highlights while keeping published v0.2.2 descriptions truthful. Derive candidate navigation fixture version from productVersion. [FR-008, FR-009, FR-010, SC-003]

## Phase 5: US3 evidenced PR handoff

**Goal**: Deliver the exact qualified candidate and bounded review disposition for owner merge.

**Independent test**: Final head/CI/source/artifact bindings agree; all mandatory native/recipient outcomes are actual passes and review dispositions are complete within two rounds.

- [ ] T014 [US3] Run npm run check, npm test, npm run check:docs, npm run check:app and affected static/rendered site checks through the verified hidden launcher; record original failures and source integrity in specs/038-v030-release-preparation/verification.md. [FR-001 through FR-012, FR-014, SC-001 through SC-004]
- [ ] T015 [US3] Commit source A, perform ordinary vocabulary review and exact-source new snapshot capture in a fresh ignored destination, retain only site/retained/v0.3.0.json, complete affected checks and commit source B. [FR-008 through FR-010, FR-013, SC-003]
- [ ] T016 [US3] Push/open the official PR with Fixes #116 and elect complete exact-head hosted qualification, retaining all platform/package/native/recipient, ordinary/legacy and 660/900/15 checks. [FR-011 through FR-014, SC-004, SC-005]
- [ ] T017 [US3] Address every actionable hosted finding, resolve threads and retain a zero-to-two round ledger with exact heads/outcomes in the PR and ignored evidence. No third trigger is permitted. [FR-014, SC-005]

## Phase 6: Closeout

- [ ] T018 Independently inspect accepted source/native/artifact and recipient identities, record separate timings, terminal CI and review dispositions on the PR, refresh issue #116/Project status and stop for owner final review/merge. Keep tracked source clean and publication untouched. [FR-010 through FR-014, SC-003 through SC-005]

## Dependencies and execution order

T001–T002 precede blocking T003. T004 precedes T005; T006 precedes T007; T005/T007 precede integration T008. T009 is the immutable-history baseline before T010; T011 precedes T012; T013 reconciles the new contracts. T014 precedes exact committed-source capture T015, then T016. T017 can overlap hosted CI; T018 waits for actual terminal acceptance and review dispositions. Final external gates are recorded in the PR/ignored receipts rather than a completion-only source commit.

## Parallel opportunities

The two read-only research inventories were independent. After the gate, acquisition tests/helper and history inventory use different files, but shared release/build files are edited sequentially by the primary. Native scenarios sharing an installed product remain sequential; existing isolated platform scopes retain their scheduling. Independent local read-only checks may run concurrently. No implementation is delegated by this plan.

## Implementation strategy

US1 is the smallest independent acquisition improvement, but this slice also requires US2 and US3. Preserve existing machinery, correct the evidenced retry classifier, and integrate one bounded policy before release versioning. Keep candidate, canonical publication, actual receiver and native proof identities separate. New source requires fresh exact-head evidence. A passing unit suite or diagnostic is not full acceptance.
