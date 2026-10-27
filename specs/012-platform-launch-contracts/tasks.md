# Tasks: Full/Lite Platform and Launch Contracts

**Input**: [spec.md](spec.md), [plan.md](plan.md), research/data-model/contracts/quickstart. S012,#5/#7.

Tests are mandatory under the invoked autopilot protocol. Each story has independent acceptance; final delivery requires all three.

## Phase 1: Setup

- [x] T001 Confirm S012 branch/selector/#5/#7 identity and installed workflow in specs/012-platform-launch-contracts/verification.md (FR-014).
- [x] T002 Complete research, constitution gates and reviewer-owned checklist in specs/012-platform-launch-contracts/plan.md and research.md (FR-001..014).

## Phase 2: Foundation

- [x] T003 Write failing exact native-path codec/snapshot tests in crates/gallery-core/tests/native_path.rs (FR-010/011).
- [x] T004 Implement shared NativePath encoding (windows-utf16le/unix-bytes, bytes0..255, even Windows length) and exact snapshot/discovery roots in crates/gallery-core/src/ and reuse in apps/gallery/src-tauri/src/history.rs (FR-010/011).

## Phase 3: US1 Attributable artifacts (P1)

- [x] T005 [P] [US1] Write failing platform/operation schema and proof-inventory regressions in tests/launch-contract.test.mjs and tests/proof.test.mjs (FR-001/002/003, SC-001).
- [x] T006 [US1] Add canonical platform-matrix.json and owned definitions/examples under schemas/v0.0.0/ with distinct baseline/qualification/prerequisite/package/signing fields (FR-001/003/004).
- [x] T007 [US1] Add compiled edition identity and lite Cargo feature, version/runtime/capability reports and actionable unavailable-runtime handling in apps/gallery/src-tauri/src/launch.rs and main.rs (FR-001/004/005).
- [x] T008 [US1] Implement normal Full/Lite proof archive assembly, exact inventory/permissions and separated footprints in scripts/proof.mjs and scripts/build-proof.mjs (FR-002/003, SC-001).
- [x] T009 [US1] Exercise extracted/relocated normal binaries under minimal PATH with unchanged gallery inventory in scripts/test-proof.mjs (FR-002/004/013, SC-001/002/005).

## Phase 4: US2 Intended gallery (P1)

- [x] T010 [US2] Write failing parser/conflict/native absolute/default/bundle/AppImage-root tests in apps/gallery/src-tauri/src/launch.rs (FR-005/006/007, SC-002).
- [x] T011 [US2] Implement one args_os parser and native placement resolver reusing compiled edition identity in apps/gallery/src-tauri/src/launch.rs and Cargo.toml (FR-005/006/007).
- [x] T012 [US2] Integrate shared early dispatch and initial-root selection without changing current settings/history semantics in apps/gallery/src-tauri/src/main.rs (FR-004/006/007/011).
- [x] T013 [US2] Add failing Windows Full/Lite chooser/adjacent-root/explicit-override/relocation/independent-process regressions in scripts/test-launch.mjs (FR-006/007/008, SC-002/004).
- [x] T014 [US2] Complete actual native Full/Lite acceptance on distinct qualified binaries using scripts/test-launch.mjs and scripts/qualify.mjs preparation (FR-006/007/013, SC-002/004/005).

## Phase 5: US3 Attributable operations (P1)

- [x] T015 [US3] Add failing result/status/exit-code/native-path/null/large-value/stale-ID tests in apps/gallery/src-tauri/src/launch.rs and tests/launch-contract.test.mjs (FR-009/010/011/012, SC-003/004).
- [x] T016 [US3] Implement shared OperationResult, finite info/resolve/unavailable prepare/install, fallible machine/diagnostic channels in apps/gallery/src-tauri/src/launch.rs (FR-009/010/012).
- [x] T017 [US3] Add adversarial bounded receipt tests for mismatched nonce/PID, stalled/oversized payload, child exit, timeout/late receipt in apps/gallery/src-tauri/src/launch.rs (FR-008/013, SC-004/005).
- [x] T018 [US3] Implement30s/16KiB bounded loopback detach receipt and hidden null-stdio child creation in apps/gallery/src-tauri/src/launch.rs and main.rs (FR-008/013).
- [x] T019 [US3] Expose main-window-only operation_result(operationId) mapping existing discovery identities and reject stale results in apps/gallery/src-tauri/src/main.rs (FR-009/010/011).
- [x] T020 [US3] Validate actual machine and native operation results against owned schemas, including cancellation and acknowledged detach, in scripts/test-launch.mjs and scripts/test-proof.mjs (FR-008/009/010/011, SC-003/004).
- [x] T021 [US3] Retain ordinary Full/Lite test-hook/listener exclusion in scripts/test-normal.mjs and scripts/test-proof.mjs (FR-013, SC-005).

## Phase 6: Cross-cutting qualification and delivery

- [x] T022 Update authoritative docs/v0.0.0/, schema boundaries/rendered canonical JSON and dated chronological CHANGELOG.md; resolve U-01/U-02 elected rows and U-08 without claiming final packages (FR-014).
- [x] T023 Elect native proof CI for Windows/Ubuntu/macOS and deployment dependencies in scripts/ci.mjs, scripts/prepare.mjs and .github/workflows/ci.yml (FR-002/003/014, SC-001/006).
- [x] T024 Elect mandatory normal/extracted/native Full/Lite checks and separate timings in scripts/qualify.mjs (FR-014, SC-001..006).
- [x] T025 Keep normative sources hashed and exclude only delivery receipts in scripts/provenance.mjs (FR-002/014, SC-006).
- [x] T026 Run complete local qualification and record red/green, source/binary/proof identities and prep/qualification/combined timings in specs/012-platform-launch-contracts/verification.md and measurements.md (FR-014, SC-001..006).
- [x] T027 Commit/push official PR closing #5/#7, attach PR and update Project8 to PR review/S012, with evidence in specs/012-platform-launch-contracts/verification.md (FR-014).
- [x] T028 Verify all elected native hosted proof artifacts/receipts and explicit unqualified combinations in specs/012-platform-launch-contracts/measurements.md (FR-002/003/014, SC-001/006).
- [x] T029 Handle CI and every review thread within at most two rounds, verify final head/source/receipt/project state and notify owner for final review/merge in specs/012-platform-launch-contracts/verification.md (FR-014, SC-006).

## Dependencies and execution order

Setup → exact-path foundation → US1 artifact identity → US2 launch placement → US3 process/results → cross-cutting full qualification → authorized PR/CI/reviews → owner handoff. Test-first pairs must demonstrate failure before implementation. US1 checks artifact identity independently; US2 checks root semantics independently; US3 checks finite/lifetime outcomes independently. Shared launch.rs tasks serialize. Hosted OS proof jobs may run independently after shared source is ready; no implementation delegation is authorized.

## Parallel examples

US1 independent schema/proof test design and documentation reference review can proceed separately. US2 parser fixtures and native fixture preparation touch separate files after shared contracts are settled. US3 schema boundary cases and receipt adversarial cases are independent test design; launch.rs edits remain sequential. These are scheduling opportunities, not authorization to spawn implementation agents.

## Implementation strategy

Deliver attributable identity first, then intended-root behavior, then exact result/lifetime integration. Preserve existing gallery suite throughout. All elected checks and source integrity pass before publication; owner explicitly authorizes push/official PR and at most two review rounds. No merge/tag/release.
