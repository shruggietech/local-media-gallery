# Tasks: Verified upgrades and recovery

**Input**: specs/020-upgrade-recovery/spec.md, plan.md, research.md, data-model.md, contracts/recipient-update.md, quickstart.md.

**Tests**: Required by FR-010/012. Write meaningful regression/campaign assertions before implementing each corresponding behavior.

## Phase 1: Setup

- [x] T001 Resolve S020 feature identity, platform research and requirements checklist in specs/020-upgrade-recovery/.
- [x] T002 Define shared native crate/dependency and source provenance registration in Cargo.toml, crates/gallery-update/Cargo.toml and scripts/provenance.mjs.

## Phase 2: Foundational

- [x] T003 Write rejection tests for strict candidate fields, path aliases, complete inventories, changed parents and owned transaction storage in crates/gallery-update/tests/transactions.rs; data-model constraint: Unknown fields, traversal, duplicates, aliases, reserved state/gallery paths and excessive sizes/counts fail validation.
- [x] T004 Implement shared identity/inventory/physical path, retained-input and exclusive-lock primitives in crates/gallery-update/src/lib.rs; data-model constraint: formatVersion1, product local-media-gallery, edition full|lite.

## Phase 3: US1 Replace an owned installation (P1, MVP)

**Goal**: Native owned A-to-B update and verified current-candidate repeat.

**Independent test**: Every elected scope updates actual ordinary candidates, verifies changed owned identity and native browsing/integration.

- [x] T005 [US1] Write direct and native-adapter update/repeat/conflict assertions in crates/gallery-update/tests/transactions.rs and tests/update-packages.test.mjs.
- [x] T006 [US1] Implement supplied-candidate update/status CLI and direct owned-file staging/activation in crates/gallery-update/src/main.rs and lib.rs.
- [x] T007 [US1] Integrate Windows native retained-MSI replacement, stable path IDs and independent installed observation in crates/windows-package/src/, scripts/windows-packages.mjs and packaging/windows/installer.wxs.
- [x] T008 [US1] Integrate macOS receipt-aware Full and portable Lite replacement and package helper in crates/macos-package/src/ and scripts/build-macos-packages.mjs.
- [x] T009 [US1] Correct Linux old/new transition guard semantics and native dpkg adapter in scripts/linux-package-guard.sh, scripts/linux-package-scripts.mjs and crates/gallery-update/src/.
- [x] T010 [US1] Prepare paired ordinary candidates and record distinct metadata/unchanged app binary identities in scripts/build-windows-packages.mjs, build-linux-packages.mjs and build-macos-packages.mjs.
- [ ] T011 [US1] Exercise A-to-B, repeat, wrong identity/architecture/edition and foreign collision outcomes in scripts/test-windows-packages.mjs, test-linux-packages.mjs and test-macos-packages.mjs.

## Phase 4: US2 Recover interruption (P1)

**Goal**: Durable observed recovery and compatible retained-input restoration.

**Independent test**: Real interruption at elected durable boundaries, second recovery idempotent, exact selected inventory/integration and ordinary launch.

- [x] T012 [US2] Write mutation-before-journal, staging/write failure, tampered journal/backup, active-use and concurrency regressions in crates/gallery-update/tests/transactions.rs.
- [x] T013 [US2] Implement journal reconciliation, recover/rollback and terminal classification in crates/gallery-update/src/; data-model constraint: Never trust a phase without physical reconciliation.
- [x] T014 [US2] Add native MSI/dpkg partial-state recovery authorization without raw native-owned file writes in crates/windows-package/src/ and scripts/linux-package-guard.sh.
- [ ] T015 [US2] Exercise Prepared, prior-retention/native-Unpacked, activation and finalization interruption plus repeated recovery across all native scopes in scripts/test-*-packages.mjs.

## Phase 5: US3 Preserve state and reject incompatible writers (P1)

**Goal**: Exact retained recipient data, finite read-only compatibility preflight and compatible downgrade.

**Independent test**: Existing real state survives both directions, future/foreign/corrupt fixtures refuse before replacement and removal retains foreign/media/runtime.

- [x] T016 [US3] Add state probe tests for absent/current/future/corrupt/foreign inputs using existing validators in apps/gallery/src-tauri/src/settings.rs, portable.rs and history.rs.
- [x] T017 [US3] Expose finite read-only compatibility probe in apps/gallery/src-tauri/src/launch.rs and main.rs and require explicit recipient operands in crates/gallery-update/src/.
- [ ] T018 [US3] Add A-to-B-to-A preserved media/sidecar/settings/history/foreign snapshots and incompatible downgrade/refused cleanup campaigns in scripts/test-*-packages.mjs.

## Phase 6: Qualification and delivery

- [x] T019 Extend independent update/native/source/evidence validation in scripts/*-package-evidence.mjs, tests/*-packages.test.mjs and scripts/ci-*-packages.mjs.
- [x] T020 Update authoritative update/state contracts and concise history in docs/v0.0.0/installation-and-distribution.md, configuration-and-state.md and CHANGELOG.md.
- [x] T021 Run npm run check, npm test and affected Rust/app/site checks; verify UTF8/LF/no mojibake and record results in specs/020-upgrade-recovery/verification.md.
- [x] T022 Push official PR linked to #25, attach it and advance GitHub Project8; record at most two review rounds in specs/020-upgrade-recovery/verification.md.
- [ ] T023 Complete all eight hosted timed scopes, exact-source/artifact/native independent readback and every review response/fix in specs/020-upgrade-recovery/verification.md and measurements.md.
- [ ] T024 Run Spec Kit convergence, verify clean pushed final head and terminal green checks, then request owner final review/merge in specs/020-upgrade-recovery/verification.md.

## Dependencies and execution order

Setup -> foundational -> US1 -> US2 -> US3 -> qualification/delivery. State probe tests may be developed after foundation independently of native adapters, but every activation depends on probe integration before acceptance. Tests precede corresponding behavior. Shared lib/native files are sequential. No task delegates implementation to agents.

## Parallel examples

US1: independent package-guard assertions and shared direct transaction test design can be inspected together. US2: native journal-boundary evidence and pure Rust state reconciliation tests use separate files. US3: settings/portable and history rejection cases can be reviewed independently. These are file-level opportunities, not authorization for implementation agents.

## Implementation strategy

MVP is US1 only after foundation, but delivery requires all three P1 stories and eight-scope qualification. Validate each increment, preserve failed evidence, and do not equate plan/checklist approval with implemented completion. Public release and owner merge remain outside this execution boundary.

## Phase 7: Convergence

- [x] T025 Add preserved staging-collision, active executable and wrong-target/edition regression tests in crates/gallery-update/tests/transactions.rs per FR-006/010 and US2/AC1/3 (partial).

## Phase 8: Convergence

- [x] T026 Add explicit replaced-parent and altered Windows recovery ACL byte-preservation regressions in crates/gallery-update/tests/transactions.rs and crates/windows-package/src/private.rs per FR-006/010, T003 and T012 (partial).
