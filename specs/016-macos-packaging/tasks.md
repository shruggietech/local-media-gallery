# Tasks: macOS packages

**Input**: [plan.md](plan.md), [spec.md](spec.md), research/data-model/contracts/quickstart.

## Phase 1: Setup

- [x] T001 Preserve S015 receipts and align branch/directory/selector in specs/016-macos-packaging/spec.md.
- [x] T002 Execute Spec Kit specification, clarification, checklist, research, plan and task workflows in specs/016-macos-packaging/.

## Phase 2: Foundation

- [ ] T003 Add exact payload/ownership negative tests in crates/macos-package/src/lib.rs and tests/macos-packages.test.mjs (FR-001 through FR-004, FR-009).
- [ ] T004 Implement validated manifest and source-bound evidence APIs in scripts/macos-packages.mjs and crates/macos-package/src/lib.rs (FR-001, FR-009).

## Phase 3: US1 Full installation

Independent test: actual mounted candidate installs/repeats/removes at each elected scope and rejects conflicts while retaining unrelated content.

- [ ] T005 [US1] Implement native host validation, staged exact install, command integration, repeat and selective removal in crates/macos-package/src/main.rs and lib.rs (FR-002 through FR-004).
- [ ] T006 [US1] Build release bundles, ad-hoc signatures, embedded helper and Full DMG in scripts/build-macos-packages.mjs (FR-001, FR-002, FR-008).
- [ ] T007 [US1] Test actual user/system defaults, custom Unicode destinations, command/path/directory collisions, changed files, reinstall and retention in scripts/test-macos-packages.mjs (FR-003, FR-004, FR-006).

## Phase 4: US2 Portable Lite

Independent test: actual extracted ordinary Lite launches in place with no Full, moves with the gallery and Refresh renders added media.

- [ ] T008 [US2] Add root-placement regressions then fix recognized translocation in apps/gallery/src-tauri/src/launch.rs (FR-007).
- [ ] T009 [US2] Produce native Lite ZIP and verify complete inventory/modes in scripts/build-macos-packages.mjs (FR-001, FR-005).
- [ ] T010 [US2] Implement external native AX/launch/actions/screenshots in scripts/macos-package-ui.swift and actual in-place/explicit/Unicode/relocate/Refresh campaign in scripts/test-macos-packages.mjs (FR-005, FR-006).

## Phase 5: US3 Identity and trust

Independent test: independently extract actual containers, inspect native metadata/trust, reconcile identities/footprints and reject damaged evidence.

- [ ] T011 [US3] Record actual signature/quarantine/trust/deployment observations and exact footprints in scripts/test-macos-packages.mjs and macos-packages.mjs (FR-008, FR-009).
- [ ] T012 [US3] Add isolated macos-packages workflow and bounded preparation/qualification/readback in .github/workflows/ci.yml and scripts/ci-macos-packages.mjs (FR-010).

## Phase 6: Qualification and delivery

- [ ] T013 Update authoritative docs/v0.0.0/installation-and-distribution.md, platform matrix, CHANGELOG.md and applicable schemas/checks (FR-001 through FR-010).
- [ ] T014 Run required local repository/product/site checks and hosted native acceptance; independently audit final artifacts in specs/016-macos-packaging/verification.md and measurements.md (FR-009, FR-010, SC-001 through SC-004).
- [ ] T015 Push, publish official PR, respond to and resolve every review finding within two requested rounds, verify terminal applicable CI and ping owner for final review/merge in specs/016-macos-packaging/verification.md (FR-011, SC-005).

## Dependencies and strategy

T001/T002 → foundation → US1 → US2 → US3 → cross-cutting qualification/delivery. Tests precede corresponding implementation. Full is first viable increment; delivery requires all stories. Independent research was parallel; implementation is sequential for shared files. Separate Rust unit and Node inventory tests can run independently after their dependencies are ready.
