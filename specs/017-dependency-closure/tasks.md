# Tasks: S017 dependency closure

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md).

## Phase 1: Setup

- [x] T001 Establish S017 identity and resolve installed Spec Kit templates in `.specify/feature.json` and `specs/017-dependency-closure/spec.md`.
- [x] T002 Research exact failures, release contracts and upstream fix provenance in `specs/017-dependency-closure/research.md`.

## Phase 2: Foundational

- [x] T003 Review requirements checklists and perform blocking cross-artifact analysis of `specs/017-dependency-closure/{spec,plan,tasks}.md` before implementation (all FRs).

## Phase 3: US1 trustworthy native qualification

**Goal**: Owned readiness and actionable native observations. **Independent test**: Real child/listener regressions and ordinary isolated native campaigns.

- [x] T004 [US1] Add failing real-process early-exit, collision, unavailable-listener and bounded-output regressions in `tests/native-driver-lifecycle.test.mjs` (FR-001/002).
- [x] T005 [US1] Implement nonce/PID identity through `apps/gallery/src-tauri/src/qualification.rs` and owned readiness in `scripts/native-driver-lifecycle.mjs`; retain separate stdout/stderr each at most16384 characters, child lifetime and listener observations (FR-001/002).
- [x] T006 [US1] Integrate owned readiness and bounded trial/source/edition failure receipts in `scripts/measure-native.mjs`, `runtime-driver.mjs`, `test-native.mjs` and `test-preparation.mjs`, preserving original readiness deadlines and owned cleanup (FR-001/002/004).
- [x] T007 [US1] Add signal/capture/receipt rejection regressions in `tests/runtime-qualification.test.mjs` and a focused PCM capture test (FR-003/004).
- [x] T008 [US1] Implement finite source-bound Linux PulseAudio monitor capture and bounded native observations in `scripts/test-runtime.mjs`, `runtime-environment.mjs`, `runtime-evidence.mjs` and a focused capture module; preserve trusted input, clock/frame progression, tone/silent thresholds and existing Windows/macOS methods (FR-003/004).
- [x] T009 [US1] Qualify all elected Full/Lite native/lifecycle/accessibility and Windows measurement checks through `scripts/ci.mjs`, retaining exact receipts under `specs/017-dependency-closure/verification.md` (FR-009, SC-001/002).

## Phase 4: US2 patched governed renderer

**Goal**: Authentic proof with patched image dependency. **Independent test**: Exact recovered verifier, inventories and every pixel comparison.

- [x] T010 [US2] Establish the supported Pillow13 attestation path using exact upstream recovery; regress any necessary consumer encoding adapter in `tests/brand-proof-test.py` while preserving its exact-pixel rejection contract (FR-005/006).
- [x] T011 [US2] Import supported governed kit only through `scripts/sync-brand-kit.mjs`, update `requirements-dev.txt` and remove temporary Pillow exclusion in `.github/dependabot.yml`; record immutable provenance (FR-005/006).
- [x] T012 [US2] Pass recovered brand/manifest/pixel and native/package readback checks, updating `docs/v0.0.0/brand.md` and `specs/017-dependency-closure/verification.md`; distinguish pre-merge remediation from post-merge alert closure (FR-005/006/009/010, SC-003).

## Phase 5: US3 Linux iterator correction

**Goal**: Replace affected implementation while preserving GTK runtime. **Independent test**: Actual optimized iterator and native Linux acceptance.

- [x] T013 [US3] Add `crates/gallery-core/tests/glib_variant_iter.rs` with Linux-only exact0.18.5 dev dependency; demonstrate real empty/populated/Unicode/forward/reverse/mixed/nth/termination boundaries against the affected implementation (FR-007/008).
- [x] T014 [US3] Vendor exact crate plus only upstream mutable-output fix under `vendor/glib-0.18.5`, preserve licenses, add root patch and resolve `Cargo.lock`; retain truthful version and source identity (FR-007).
- [x] T015 [US3] Add exact inventory/patch provenance verification and tamper rejection in `scripts/check-vendor.mjs` and `tests/vendor.test.mjs`, then exempt only this verified third-party subtree from authored-text normalization in `scripts/check.mjs` (FR-007/010).
- [x] T016 [US3] Prepare optimized test before readiness and execute as mandatory Linux qualification in `scripts/ci.mjs`; retain graph, optimized result and native Full/Lite receipts in `specs/017-dependency-closure/verification.md` (FR-008/009/010, SC-004).

## Phase 6: Integration and publication

- [x] T017 Update authoritative verification/dependency contracts in `docs/v0.0.0/verification-and-compatibility.md`, `CONTRIBUTING.md` and dated decisions in `CHANGELOG.md` (FR-009/010).
- [x] T018 Run `npm run check`, `npm test`, affected app/docs/site checks and final source-bound CI; preserve 660s target,900s hard limit,15s finalization reserve and separate accounting in `specs/017-dependency-closure/verification.md` (FR-009, allSCs).
- [x] T019 Commit/push branch and publish official PR; handle every code/security review within at most two source review waves and record exact final SHA/threads/checks in `specs/017-dependency-closure/verification.md` (SC-005).
- [x] T020 Run convergence assessment, final encoding/provenance/source checks, and hand off for owner final review/merge with remaining post-merge advisory observation explicit (FR-010, SC-005).

## Dependencies and execution strategy

T001-T003 precede implementation. US1 proceeds tests->implementation->native validation; US2 and US3 are independently testable, then join T017-T020 for one final source-bound campaign. US1 is the smallest useful increment but S017 is accepted only when all three stories satisfy their gates.

## Parallel opportunities

Research may run independently for the three issue domains. Headless iterator/provenance work and brand proof work touch separate files after their tests exist. Actual edits to shared CI and final receipts remain sequential. Native campaigns run in the existing isolated platform CI matrix.

## Phase 7: Initial review corrections

- [x] T021 [US1] Preserve historical uninstrumented baseline measurement ownership through the persistent Windows TCP listener observer in `scripts/measure-processes.ps1` and `scripts/measure-native.mjs`; regress legacy protocol, unrelated owners and deadlines in `tests/native-driver-lifecycle.test.mjs` (FR-001/002, initial review).

## Phase 8: Artifact inventory convergence

- [x] T022 [US3] Include provenance-bound third-party path packages in the bundled license catalog in `scripts/proof.mjs` and `scripts/build-proof.mjs`, excluding only owned workspace members; regress the vendored GLib classification in `tests/proof.test.mjs` and verify actual recipient inventories (FR-007/FR-009).
