# Tasks: S014 Native Media and Accessibility Qualification

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contract](contracts/qualification.md)
**Tests**: Meaningful test-first regressions and all elected native acceptance are required.

## Phase 1: Setup

- [X] T001 Establish exact S014 branch/selector/issue mapping and installed Spec Kit artifacts in specs/014-native-media-accessibility/ (FR-017).
- [X] T002 Complete three read-only research tasks and native/media/assistive decisions in specs/014-native-media-accessibility/research.md/plan.md (FR-001..014).
- [X] T003 Update Project8 #18/#19 Slice S014/In progress and preserve final owner merge boundary in specs/014-native-media-accessibility/verification.md (FR-017).

## Phase 2: Shared foundations

- [X] T004 Add failing contract regressions for source/fixture/artifact mismatch, missing observations and bounded evidence in tests/runtime-qualification.test.mjs (FR-001/012/013/015).
- [X] T005 Implement validated runtime receipt/observation helpers in scripts/runtime-evidence.mjs with exact decimal byte counts, at most2048 native nodes/depth32 and at most256 speech records/262144 serialized bytes (FR-001/012/013).
- [X] T006 Implement bounded existing-driver/native process lifecycle helpers in scripts/runtime-driver.mjs, preserving request/session/exit deadlines and Windows hidden console launches (FR-013/016).

## Phase 3: US1 Media behavior

Independent test: actual system-WebView source viewing and format-specific results with byte-identical source inventory.

- [X] T007 [US1] Add deterministic small image/orientation/profile/tone fixture expectations and a regression rejecting silent audio-as-tone in scripts/create-runtime-fixture.py/.mjs and tests/runtime-qualification.test.mjs (FR-003/004/015).
- [X] T008 [US1] Implement separate seven-format/all-eight-orientation/SDR-profile/moving-video/440Hz/silent corpus and exact inventory in scripts/create-runtime-fixture.py/.mjs (FR-001/003/004/007).
- [X] T009 [US1] Implement actual native original image dimension/pixel/orientation/profile and damaged/unsupported retained-item checks in scripts/test-runtime.mjs (FR-002/003/005/006).
- [X] T010 [US1] Implement actual decoded frame/play/pause/seek, same-source206/read bytes and WebAudio tone/silent observations in scripts/test-runtime.mjs (FR-002/004/007).
- [ ] T011 [US1] Reproduce and fix proportional media/error/recovery findings in apps/gallery/src/app/gallery.tsx and related media helpers with scripts/test-runtime.mjs regressions (FR-003..007/015).

## Phase 4: US2 Native keyboard and assistive behavior

Independent test: native trusted key/default behavior, actual native tree exposure and isolated real NVDA-generated focus/item output.

- [X] T012 [US2] Implement bounded native-tests-only AppKit input, zoom/window and provider observation commands in apps/gallery/src-tauri/src/qualification.rs/main.rs/Cargo.toml; preserve normal exclusion (FR-002/008/009/013).
- [X] T013 [US2] Implement real external UIA/AT-SPI traversal rooted at the campaign app window in scripts/native-accessibility.ps1/.py, enforcing2048 nodes/depth32 and finite time with explicit overflow (FR-009/012/013).
- [X] T014 [US2] Verify pinned NVDA2026.3 download/license/hash and isolated portable creation in scripts/prepare-screen-reader.mjs, preserving pre-existing owner instances (FR-009/012/013).
- [X] T015 [US2] Implement actual NVDA gallery-only pre_speech/focus capture with silence synth in scripts/nvda-qualification.py and scripts/runtime-driver.mjs, enforcing256 records/262144 bytes and observed owned shutdown (FR-009/012/013).
- [X] T016 [US2] Exercise actual trusted Tab/Space/Return/Escape, visible focus, viewer/cross-page return and preparation/diagnostic dialog journeys in scripts/test-runtime.mjs (FR-002/008).
- [X] T017 [US2] Reproduce and fix demonstrated native naming/state/focus/announcement findings in apps/gallery/src/app/gallery.tsx and related UI helpers using scripts/test-runtime.mjs and native assistive receipts (FR-008/009/015).

## Phase 5: US3 Presentation needs

Independent test: native-rendered themes/zoom/window/motion and explicitly labelled coarse/mixed condition cases with reachable controls.

- [X] T018 [US3] Add failing rendered geometry/axe/contrast/reduced-motion/panorama coarse-target cases in scripts/test-runtime.mjs (FR-010/011/015).
- [X] T019 [US3] Implement identified native zoom/window/reduced-motion preparation and restored actual-media-rule coarse/mixed condition emulation in scripts/runtime-driver.mjs/test-runtime.mjs (FR-010..013).
- [ ] T020 [US3] Fix demonstrated presentation/target/clipping findings using existing governed tokens in apps/gallery/src/app/gallery.css/gallery.tsx and preserve compact defaults (FR-008/010/011/015).

## Phase 6: US4 Truthful qualification and support

Independent test: exact source-bound native receipts reject missing/mismatched/unavailable elected observations and public claims match actual rows.

- [X] T021 [US4] Prepare all three native display/AT/audio dependencies and native-test editions, then elect runtime checks in .github/workflows/ci.yml and scripts/ci.mjs/prepare.mjs/qualify.mjs/run.mjs (FR-001/002/013/016).
- [X] T022 [US4] Bind runtime/native-tool/fixture/normal-proof identities and exclude only delivery receipts in scripts/provenance.mjs/runtime-evidence.mjs/ci.mjs/qualify.mjs (FR-001/012/013/016).
- [X] T023 [US4] Extend normal Full/Lite hook/listener exclusion in scripts/test-normal.mjs and affected contract tests (FR-013/015).
- [ ] T024 [US4] Publish observed media/color/audio/assistive/presentation matrix and explicit limits in docs/v0.0.0/browsing-and-playback.md/verification-and-compatibility.md/installation-and-distribution.md/thumbnails-and-performance.md and schemas/v0.0.0/ (FR-014).

## Phase 7: Qualification and delivery

- [X] T025 Record dated behavior/process decisions and unreleased changes in CHANGELOG.md, preserving version0.0.0 and governed kit bytes (FR-014/015).
- [ ] T026 Run complete local qualification after verified readiness, retaining every campaign and preparation/qualification/combined accounting in specs/014-native-media-accessibility/verification.md/measurements.md (FR-015/016, SC-001..005).
- [X] T027 Commit/push official PR closing #18/#19, attach it and update Project8 PR review/S014 in specs/014-native-media-accessibility/verification.md (FR-017).
- [ ] T028 Verify exact-source native hosted/runtime and six normal archive receipts with independent artifact read-back in specs/014-native-media-accessibility/verification.md/measurements.md (FR-001/013/016, SC-001/005).
- [ ] T029 Address every review finding and resolve every thread using at most two rounds, recording concrete corrections in specs/014-native-media-accessibility/verification.md (FR-017, SC-006).
- [ ] T030 Publish final receipts, verify exact-final-head CI/source/reviews/issue state and clean checkout, then notify owner for final review/merge in specs/014-native-media-accessibility/verification.md (FR-017, SC-006).

## Dependencies and order

Setup -> shared receipt/driver foundations -> media and native assistive stories -> presentation regressions/fixes -> hosted/runtime/normal-artifact integration -> authoritative docs -> complete qualification -> authorized publication/CI/reviews -> owner handoff. Source/UI files serialize. The three plan-required research tasks were read-only; implementation stays local. Independent hosted native targets run concurrently after shared source freeze.

## Parallel examples and implementation strategy

US1 fixture observations and US2 platform API research were independent; both feed one coherent harness. US3 reuses US2 native input/presentation facilities. US4 consumes all actual results. Each story can be inspected separately, but intermediate story completion is not delivery of this slice. Security/integrity/provenance checks are mandatory. No third review request, merge, tag or product release.
