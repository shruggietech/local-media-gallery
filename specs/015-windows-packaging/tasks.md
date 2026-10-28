# Tasks: Windows Full installation and Lite packages

Input: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/` and `quickstart.md`. Scope is #22, S015, branch `codex/015-windows-packaging`.

## Phase 1: Setup

- [x] T001 Preserve merged S014 evidence and prune verified merged branches in `specs/014-native-media-accessibility/verification.md`.
- [x] T002 Complete specification, clarification, research and plan in `specs/015-windows-packaging/` with the exact S015 selector.
- [x] T003 Analyze requirement/task/constitution coverage and record the result in `specs/015-windows-packaging/verification.md` before implementation.

## Phase 2: Foundation

- [x] T004 Write failing payload/path/input integrity tests in `tests/windows-packages.test.mjs` and native ownership unit tests in `crates/windows-package/src/lib.rs` (FR-002/004/011).
- [x] T005 Implement shared payload validation in `scripts/windows-packages.mjs` and `crates/windows-package/src/lib.rs`: 1..4096 unique portable paths, lowercase 64-hex hashes, no traversal/root/drive/Windows aliases/case collisions, total at most 1GiB; release Windows x86_64, shared version0.0.0, 40-hex revision and exact source (FR-001/002).
- [x] T006 Add exact producer input pins in `packaging/windows/inputs.json` and reusable normal payload/notices staging in `scripts/build-proof.mjs`, correcting optional-provider prose (FR-001/002/006/012/013).

## Phase 3: US1 Install Full (P1, initial increment)

Independent test: isolated actual user/machine installation, repeat, native browsing and conflicting destinations/integration with byte preservation.

- [x] T007 [US1] Author explicit scope-specific MSI file/component/registry/shortcut/PATH tables without broad deletion or MajorUpgrade in `packaging/windows/installer.wxs` (FR-003/005/007).
- [x] T008 [US1] Implement registered package/component, actual destination/integration and native architecture/ownership preflight plus deferred read-back in `crates/windows-package/src/native.rs` (FR-004/005/011).
- [x] T009 [US1] Implement hash-bound user and machine prerequisite entrypoints, hidden noninteractive children, native runtime verification and actionable failures in `crates/windows-package/src/bin/setup.rs` and `build.rs` (FR-003/006/007/011).
- [x] T010 [US1] Build release Full/MSI/setup candidates and verify input signature/version/imports in `scripts/build-windows-packages.mjs` and `scripts/inspect-windows-package.ps1` (FR-001/002/006/013).
- [x] T011 [US1] Exercise install/repeat/collision/fresh registry PATH and ordinary native Full use in `scripts/test-windows-packages.mjs` and `scripts/windows-package-ui.ps1` (FR-003/004/005/007/014).

## Phase 4: US2 Extract Lite (P1)

Independent test: normal release Lite at a Unicode gallery root, explicit-root and in-place launch, move, modify media and real Refresh; controlled native loader failure remains a separate observation from physically absent runtime.

- [x] T012 [US2] Build self-contained release Lite archive with executable at root and complete auxiliary/notices inventory in `scripts/build-windows-packages.mjs` (FR-001/008/009).
- [x] T013 [US2] Exercise ordinary Lite native UI/pixels, relocation, actual Refresh and actionable process-local native runtime lookup failure in `scripts/test-windows-packages.mjs` and `scripts/windows-package-ui.ps1` (FR-008/009/014).

## Phase 5: US3 Owned removal (P1)

Independent test: uninstall each real MSI, compare media/sidecars/settings and foreign extras immediately before/after; remove Lite package files only.

- [x] T014 [US3] Add removal ownership checks and selective standard MSI removal in `crates/windows-package/src/native.rs` and `packaging/windows/installer.wxs`; shared runtime and default user state are outside ownership (FR-010/011).
- [x] T015 [US3] Exercise uninstall with foreign data/integration sentinels and retained real profile/state in `scripts/test-windows-packages.mjs` (FR-010/014).

## Phase 6: US4 Candidate identity/evidence (P2)

Independent test: independently read archive/payload/MSI/install identities, reject mutations, inspect truthful signing/host/prerequisite/application/runtime footprint records.

- [x] T016 [US4] Define candidate contract in `schemas/v0.0.0/windows-packages.schema.json` and exact-source archive/installed evidence validation in `scripts/windows-package-evidence.mjs` with unknown values null plus reason (FR-002/012/013/014).
- [x] T017 [US4] Add separate required isolated Windows package campaign to `.github/workflows/ci.yml` and `scripts/ci.mjs`, preserving all existing gates and one readiness/660-target/900-hard/15-reserve clock (FR-014/015).
- [x] T018 [US4] Independently inspect hosted package inventories and bind installed/extracted/native fixture receipts in `specs/015-windows-packaging/verification.md` (FR-002/012/013/014).

## Phase 7: Integration and delivery

- [x] T019 Correct bounded native-driver lifecycle/profile/port diagnostics in `scripts/native-driver-lifecycle.mjs`, `scripts/test-native.mjs`, `scripts/test-preparation.mjs` with a meaningful owned-process regression in `tests/native-driver-lifecycle.test.mjs`; preserve assertions and readiness deadlines (FR-015).
- [x] T020 Update authoritative candidate installation/platform/schema documentation and `CHANGELOG.md`, with no public planning links or release-pointer promotion (FR-016).
- [x] T021 Run repository/app/site/headless qualification and record separate preparation/qualification/combined terminal evidence in `specs/015-windows-packaging/{verification,measurements}.md`; check UTF-8/LF/mojibake and governed bytes (FR-015).
- [x] T022 Push official #22 PR automatically, attach it, monitor required CI, handle every finding under at most two review rounds and record final SHA/checks/threads in `specs/015-windows-packaging/verification.md` (FR-017).
- [x] T023 Ping owner for final review/merge with candidate evidence and concrete unqualified limits in `specs/015-windows-packaging/verification.md`; do not merge/tag/release (FR-013/016/017).

## Dependencies and execution

Setup precedes foundation. US1 depends on foundation; US2 shares its payload builder; US3 depends on real US1 installation; US4 binds all journeys. Complete all four stories before delivery. US1 alone is the first independently verifiable increment, not the approved completion scope. Sequential single-agent implementation avoids shared-file conflicts. Independent read-only validation can batch; no implementation delegation is planned. Examples: US1 pure ownership tests alongside MSI static validation, US2 archive validation alongside existing launch tests, US3 retained-data comparison alongside registration read-back, US4 schema validation alongside independent archive hashing. These are opportunities for independent checks, not permission to skip dependencies.

Coverage: FR-001 T005/006/010/012; FR-002 T004/005/006/010/016/018; FR-003 T007/009/011; FR-004 T004/008/011; FR-005 T007/008/011; FR-006 T006/009/010; FR-007 T007/009/011; FR-008 T012/013; FR-009 T012/013; FR-010 T014/015; FR-011 T004/008/009/014; FR-012 T006/016/018; FR-013 T006/010/016/018/023; FR-014 T011/013/015/016/017/018; FR-015 T017/019/021; FR-016 T020/023; FR-017 T022/023. SC-001..006 are demonstrated jointly by T011/013/015/018/021/022/023, not by build success.
