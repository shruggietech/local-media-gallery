# Tasks: Windows MSI installation experience

**Input**: S030 spec.md, plan.md, research.md, data-model.md and contracts/installer.md.

## Phase 1: Setup

- [x] T001 Establish S030 branch, selector and approved issue mapping in specs/030-windows-msi-installer/spec.md (FR-013).
- [x] T002 Record architecture research and reviewer-owned quality checklist in specs/030-windows-msi-installer/research.md and checklists/installer.md (FR-001 through FR-013).

## Phase 2: Foundational ownership

- [x] T003 Add dual-capable package identity and concrete-context registration discovery in scripts/windows-packages.mjs and crates/windows-package/src/native.rs (FR-006, FR-007).
- [x] T004 Persist independent integration state and preserve the existing six-field private envelope in crates/windows-package/src/native.rs and crates/gallery-update/src/lib.rs (FR-006, FR-008).

## Phase 3: User Story 1, offline MSI (P1)

**Goal**: One copied MSI installs Full offline, with no manual prerequisite.

**Independent test**: Isolated absent-runtime installation and native product readback from only the MSI.

- [x] T005 [US1] Package the pinned complete runtime stream and compile its hash/size for context-correct hidden provisioning in packaging/windows/installer.wxs and crates/windows-package/src/runtime_install.rs (FR-001, FR-002).
- [x] T006 [US1] Build the single dual MSI and keep concrete internal descriptors in scripts/build-windows-packages.mjs and packaging/windows/installer.wxs (FR-001, FR-002).
- [x] T007 [US1] Adapt isolated offline acceptance and embedded-input inspection in scripts/test-windows-packages.mjs and scripts/windows-package-evidence.mjs (SC-001, FR-012).

## Phase 4: User Story 2, choices (P1)

**Goal**: License, both scopes, editable path and all four integration combinations.

**Independent test**: Native wizard and quiet matrix with independent feature/registration readback.

- [x] T008 [US2] Author native wizard and separate optional StartMenu/CommandPath features in packaging/windows/installer.wxs (FR-003, FR-004).
- [x] T009 [US2] Enforce elected integration conflicts only and retain actual feature choices in crates/windows-package/src/native.rs (FR-004, FR-006, FR-007).
- [x] T010 [US2] Add isolated-only MSI dialog automation and matrix acceptance in scripts/windows-msi-ui.ps1 and scripts/test-windows-packages.mjs (SC-002, FR-012).

## Phase 5: User Story 3, progress and cancellation (P1)

**Goal**: Real phases and authoritative success/cancel/failure/incomplete results.

**Independent test**: Hosted wizard progress/cancel and injected vendor failures, with terminal state readback.

- [x] T011 [US3] Report runtime phases, process cancellation and bounded outcomes in crates/windows-package/src/native.rs (FR-005, FR-009).
- [x] T012 [US3] Exercise native progress/cancel/failure and retain evidence in scripts/test-windows-packages.mjs (SC-003, FR-012).

## Phase 6: User Story 4, lifecycle (P2)

**Goal**: Retain context/location/choices and ownership through maintenance and recovery.

**Independent test**: Repeat/repair/replace/remove and exact published predecessor recovery with preserved data/extras.

- [x] T013 [US4] Carry actual native identities and explicit selected features through crates/gallery-update/src/native.rs and src/worker.rs (FR-006, FR-007, FR-008).
- [x] T014 [US4] Implement predecessor-compatible retained restore authority and focused regression tests in crates/gallery-update/src/native.rs (SC-004, FR-007).
- [x] T015 [US4] Adapt real ordinary MSI lifecycle campaign and integration preservation checks in scripts/test-windows-packages.mjs (FR-006, FR-007, FR-009, FR-012).

## Phase 7: Contracts, qualification and handoff

- [x] T016 Update version-aware MSI format, schemas and contract fixtures in scripts/release-record.mjs, schemas/v0.2.1/release-record.schema.json and affected tests (FR-010, FR-011).
- [x] T017 Update current installation/system docs, CHANGELOG.md and site/retained/v0.2.1.json without changing published snapshots (FR-010, FR-011).
- [x] T018 Run hidden repository/unit/affected site checks and exact-head hosted campaigns; retain evidence in specs/030-windows-msi-installer/verification.md (FR-012, SC-001 through SC-004).
- [x] T019 Push, open official PR closing #89, handle every received finding within at most two rounds and record terminal CI/review evidence in specs/030-windows-msi-installer/tasks.md (FR-013, SC-005).

T019 is closed with an explicit exception: the requested two-round review cap was exceeded (three actual rounds). SC-005 is not fully satisfied. All five findings are fixed, answered and resolved; no further reviews will be requested. Terminal implementation evidence is in measurements.md; final closing-head CI and artifact evidence are recorded in PR #96 before owner handoff.

## Dependencies and opportunities

T001-T002 precede T003-T004. US1 foundation precedes executable acceptance of US2/US3; US2 feature state precedes US4 maintenance. Contracts/documentation may be prepared alongside native work in separate files. US1 runtime code and US2 dialog authoring are separate concerns, but converge on one MSI before qualification. US3 cancellation assertions depend on runtime execution. US4 recovery tests follow concrete identity and selection changes. Finish all stories before final acceptance; US1 alone is an engineering increment, not the requested slice completion.

## Implementation strategy

Deliver one vertical installer path first, then independent choices, observable cancellation and retained lifecycle. Keep every story mapped to actual isolated acceptance. Run appropriate local checks before first push; use hosted CI for all MSI/UI operations. Public artifact claims follow verified current metadata. No local GUI, signing, merge or release publication.
