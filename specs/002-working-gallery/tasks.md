# Tasks: First working local gallery

**Input**: [Plan](plan.md), [specification](spec.md), research, data model and native contract.

**Execution**: Local autopilot, tests before implementation, no publication. Checkboxes record completed implementation work, separate from requirements-quality checklists.

## Phase 1: Setup

- [x] T001 Add pinned Rust/frontend manifests, generated-output ignores and hidden command tooling in Cargo.toml, rust-toolchain.toml, apps/gallery/package.json and scripts/run.mjs (FR-019/FR-020).
- [x] T002 [P] Add the version-aligned master runtime schema and validation tests in schemas/v0.0.0/local-media-gallery.schema.json and tests/contracts.test.mjs (FR-010/FR-022; public IF-05/IF-06).

## Phase 2: Foundational access contract

- [x] T003 Write failing root isolation, no-follow, stale-grant and byte-range tests in crates/gallery-core/tests/core.rs (FR-014/FR-018).
- [x] T004 Implement opaque sessions, readonly capability opens and streamed range transport in crates/gallery-core/src/lib.rs and transport.rs; preserve decimal-string native values and no path-authority messages (FR-010/FR-014/FR-015/FR-018).

## Phase 3: US1 Open a directory (P1)

Goal: picker and explicit launch roots discover the expected small direct-file inventory. Independent test: A-01/A-02 without viewer use.

- [x] T005 [US1] Write candidate/hidden/nested/link/empty/unavailable discovery and argument tests in crates/gallery-core/tests/core.rs and apps/gallery/src-tauri/src/main.rs before implementations (FR-001 through FR-005).
- [x] T006 [US1] Implement discovery and scan states in crates/gallery-core/src/lib.rs, including native-name identity and explicit direct-file scope (FR-003/FR-004/FR-005).
- [x] T007 [US1] Wire real native chooser, startup arguments, session commands and private capabilities in apps/gallery/src-tauri/src/main.rs and tauri.conf.json (FR-001/FR-002/FR-019/FR-020).
- [x] T008 [US1] Build the branded AppFrame, chooser/scan states and exact asset staging in apps/gallery/src/app/page.tsx and scripts/stage-brand.mjs (FR-001/FR-002/FR-005/FR-019).

## Phase 4: US2 Browse/view/inspect (P1)

Goal: stable sorting/filtering, proportionate cards, item information and real playback. Independent test: A-03 through A-06 with a fixed fixture.

- [x] T009 [US2] Write failing natural-sort, missing-value, type-filter and selection tests in tests/view.test.mjs (FR-006/FR-008).
- [x] T010 [US2] Implement typed lossless view helpers in apps/gallery/src/lib/view.ts and types.ts; missing values sort last in both directions (FR-006/FR-010).
- [x] T011 [US2] Implement aspect-aware cards, admitted originals, viewer/navigation/details and unsupported results in apps/gallery/src/app/gallery.tsx and gallery.css (FR-007 through FR-011/FR-015).
- [x] T012 [US2] Add actual Windows image/video play/pause/seek and single-player coverage in scripts/test-native.mjs, using only the small fixture from scripts/create-fixture.mjs (FR-007/FR-008/FR-009/FR-010/FR-011; SC-002/SC-003).

## Phase 5: US3 Freshness and relocation (P1)

Goal: settle mutations within five seconds and reject former-root work. Independent test: A-07/A-08 using one-at-a-time mutations.

- [x] T013 [US3] Add failing replacement/removal/old-session tests in crates/gallery-core/tests/core.rs and tests/view.test.mjs (FR-012/FR-013/FR-014).
- [x] T014 [US3] Implement background reconciliation, invalidation, explicit refresh and cancellation in crates/gallery-core/src/lib.rs and apps/gallery/src/app/gallery.tsx (FR-012/FR-013/FR-014/FR-015).
- [x] T015 [US3] Extend scripts/test-native.mjs with real mutation/relocation/root-switch evidence and a bounded five-second observation deadline (SC-004/SC-005).

## Phase 6: US4 Accessible recovery/integrity (P2)

Goal: keyboard completion and source preservation. Independent test: A-09 through A-11 with isolated temporary data.

- [x] T016 [US4] Add hostile-name, denied-access, cancelled-picker and source-byte preservation cases to crates/gallery-core/tests/core.rs and scripts/test-native.mjs (FR-016/FR-017/FR-018).
- [x] T017 [US4] Finish focus, accessible names, reduced motion, attributable errors and stopped retired playback in apps/gallery/src/app/gallery.tsx and gallery.css (FR-011/FR-014/FR-016).
- [x] T018 [US4] Implement process-scoped real Windows chooser/keyboard automation in scripts/native-input.ps1 and connect it to scripts/test-native.mjs (FR-001/FR-002/FR-020; SC-005/SC-006).

## Phase 7: Qualification and delivery

- [x] T019 Add consumer TS/brand/style checks, exact temporary brand recovery and unchanged-kit verification in apps/gallery/eslint.config.mjs and scripts/check-brand.mjs (FR-016/FR-019; constitution III).
- [x] T020 Add hidden build/native/qualification commands and test-only WebDriver feature, with normal-build exclusion verification, in scripts/run.mjs, scripts/qualify.mjs and apps/gallery/src-tauri/Cargo.toml (FR-019 through FR-023; SC-007).
- [x] T021 Run required repository/Rust/frontend/brand/schema/native checks, inspect rendered results and record terminal evidence in specs/002-working-gallery/verification.md (SC-001 through SC-007).
- [x] T022 Update public runtime/development guidance without exposing planning, retain open compatibility/platform limits and update CHANGELOG.md and CONTRIBUTING.md (FR-022/FR-023).
- [x] T023 Confirm source/asset/version/provenance integrity, clean local main and absent remotes; commit the completed slice locally (FR-017/FR-021/FR-022/FR-023).

## Dependencies and parallel work

Setup precedes access foundation, then US1 establishes the common session for UI integration. US2 view tests/helpers can be prepared independently of native chooser plumbing once contracts are fixed; US3 uses the same session and UI integration; US4 completes cross-cutting recovery. Qualification follows all four stories. T002 may run beside manifest setup because it touches independent files. Within US1 native/core test cases can be authored independently of asset staging; within US2 view tests can precede independently prepared fixture tooling; within US3 pure stale-view tests and backend mutation tests touch different files; within US4 source inventories and focus assertions are independent. Shared files are edited sequentially.

## Strategy and acceptance

Deliver discovery first as a usable increment, then browsing, freshness and accessible integrity. Run red tests before the corresponding behavior and retain observed red/green evidence. Do not stop after the MVP under this end-to-end authorization. The owner selected Windows-first native acceptance and excluded the 1,000-image test. No large-count substitute, remote creation, push or release is part of this slice.
