# Tasks: Packaging readiness and no-signing policy

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/readiness-and-policy.md and quickstart.md in specs/019-packaging-readiness.

**Branch**: codex/s019-packaging-readiness | **Slice**: S019 | **Issues**: #69, #70; consolidate #68.

Tests are required by SC-001 through SC-004. Execute sequentially; no implementation delegation. Checked planning tasks indicate completed planning, not product acceptance.

## Phase 1: Setup and blocking foundation

- [X] T001 Specify and clarify S019 in specs/019-packaging-readiness/spec.md; complete requirements-quality checklists and verify branch/feature/selector identity (FR-012).
- [X] T002 Research and design the shared readiness, inventory authority and dependency/cache changes in specs/019-packaging-readiness/{plan,research,data-model,quickstart}.md and contracts/readiness-and-policy.md (FR-001 through FR-012).
- [X] T003 Run blocking speckit-analyze across spec.md, plan.md and tasks.md against .specify/memory/constitution.md, resolving critical/high findings before application edits; retain analysis.md (FR-012).

## Phase 2: User Story 1 - Build packages without a warm cache (P1)

**Independent test**: Real fresh and partial Cargo stores complete production offline metadata/notices with no compiler output; all actual native packages subsequently pass.

- [X] T004 [US1] Add failing graph/lock/source-directory regressions in tests/cargo-readiness.test.mjs before implementing scripts/cargo-readiness.mjs and dependency-notices.mjs (FR-001, FR-002, FR-003; SC-001, SC-003).
- [X] T005 [US1] Implement bounded hidden locked acquisition/native offline metadata with unchanged-lock validation in scripts/cargo-readiness.mjs; extract production Rust notices from scripts/build-proof.mjs to scripts/dependency-notices.mjs without expanding target scope (FR-001, FR-003).
- [X] T006 [US1] Establish readiness before expensive test/export/release compilation in scripts/prepare.mjs, build-{windows,linux,macos}-packages.mjs and ci-{windows,macos}-packages.mjs; preserve retained preparation failures (FR-001, FR-003, FR-006).
- [X] T007 [US1] Add actual fresh/partial tempfile3.27.0 witness in scripts/test-cargo-readiness.mjs and scripts/ci-linux-packages.mjs; retain success/failure receipt through .github/workflows/ci.yml with confinement and no-output checks (FR-002, FR-003, FR-010; SC-001, SC-003).

## Phase 3: User Story 2 - Deliver without project signing work (P1)

**Independent test**: Signature-resource-free payloads pass JS/Rust authority checks, integrity negatives fail, and actual native apps/helpers run on isolated CI.

- [X] T008 [US2] Add failing missing-signature-resource acceptance and binary/plist/tamper/link/mode/unlisted negatives in tests/macos-packages.test.mjs and crates/macos-package/src/lib.rs tests (FR-005, FR-009; SC-002, SC-003).
- [X] T009 [US2] Remove explicit signing/inspection actions and mandatory CodeResources from scripts/{build-macos-packages,macos-packages}.mjs and crates/macos-package/src/{lib,main}.rs, retaining complete inventory/native identity/ownership authority (FR-004, FR-005, FR-006, FR-009).
- [X] T010 [US2] Preserve ordinary native compiler output and observe load commands/actual quarantine assessments in scripts/{build-proof,test-macos-packages}.mjs; require actual native Full/Lite lifecycle outcomes without credential gates (FR-006, FR-007; SC-002).
- [X] T011 [US2] Add a narrow no-project-signing regression in tests/packaging-policy.test.mjs and verify current platform launchers remain hidden/noninteractive (FR-004, FR-007; SC-002, SC-003).

## Phase 4: User Story 3 - Review one coherent qualified change (P1)

**Independent test**: Exact declarations agree, all eight scopes and artifact readback pass, every review is handled within two rounds and the official PR is ready for owner merge.

- [X] T012 [US3] Add failing exact-versus-range declaration regression in tests/dependency-lock.test.mjs; implement scripts/package-lock-consistency.mjs and wire scripts/check.mjs; consolidate parser8.72.1/Lucide1.62.0 from #68 with normalized package.json, apps/gallery/package.json and package-lock.json (FR-008; SC-004).
- [X] T013 [US3] Replace only per-commit cache suffix with existing sourceIdentity in .github/workflows/ci.yml; preserve paths/prefixes/fallbacks and unconditional builds/qualification; register only S019 tasks/verification/measurements progress exclusions in scripts/provenance.mjs before qualification (FR-010, FR-011).

## Phase 5: Integration, verification and delivery

- [X] T014 Align docs/v0.0.0/{installation-and-distribution,verification-and-compatibility}.md, schemas/v0.0.0/platform-matrix.json, .github/RELEASE_NOTES_TEMPLATE.md, CONTRIBUTING.md and CHANGELOG.md with permanent no-signing policy and plain test-status wording; preserve historical receipts (FR-007, FR-009).
- [X] T015 Run npm run check, npm test and affected app/docs/site checks locally headlessly, then all eight isolated hosted scopes and independent exact-source artifact/native readback; retain separate preparation/qualification/combined timing and 660/900/15s rules in specs/019-packaging-readiness/{verification,measurements}.md (FR-006, FR-009, FR-010; SC-001 through SC-004).
- [X] T016 Automatically push codex/s019-packaging-readiness and create/attach an official PR; handle every code/security finding within at most two rounds, resolving threads and keeping final exact-head checks green (FR-012; SC-005).
- [X] T017 Update #69/#70 and Project tracking; close #68 as consolidated only after its compatible changes are included in the official PR; leave issue completion/owner merge accurate (FR-008, FR-012).
- [X] T018 Run speckit-converge, finalize specs/019-packaging-readiness records, independently verify final head/checks/reviews/artifacts and clean pushed tree, and ping owner for final review/squash merge without product publication (FR-010, FR-012; SC-005).

## Dependencies and delivery strategy

T001 -> T002 -> T003 blocks source edits. US1 executes T004 -> T005 -> T006 -> T007; US2 executes T008 -> T009 -> T010 -> T011; US3 executes T012 -> T013. Shared scripts/build-proof.mjs changes remain sequential. T014 precedes qualification; T015/T016 interleave only to obtain hosted checks after publication, with all terminal work awaited. T017 and T018 follow qualified source and reviews. No task is independently marked complete using unrelated tests. The end-to-end delivery is one coherent PR; no partial release or expanded platform is elected.
