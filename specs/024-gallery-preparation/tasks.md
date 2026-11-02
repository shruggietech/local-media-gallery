# Tasks: S024 guided gallery preparation

## Phase1: Setup

- [x] T001 Specify, clarify and review requirements in specs/024-gallery-preparation/spec.md and checklists/.
- [x] T002 Research native integration and acquisition and generate plan/model/contracts/quickstart in specs/024-gallery-preparation/.

## Phase2: Foundation

- [x] T003 Add native acquisition crate and dependencies in crates/gallery-preparation/ and Cargo.toml, preserving existing runtime boundaries (FR-004, FR-005, FR-007).
- [x] T004 Align unreleased0.2 software/docs/schema and explicit0.1 portable compatibility in VERSION, package manifests, Cargo manifests, apps/gallery/src-tauri/src/portable.rs, docs/v0.2.0/, schemas/v0.2.0/, site/versions.json (FR-012).

## Phase3: Independent choices (US1)

- [x] T005 [US1] Implement read-only session/settings-bound selection and preview in apps/gallery/src-tauri/src/guided.rs with exact destinations/storage/collisions and stale-input rejection (FR-001, FR-002, FR-003).
- [x] T006 [US1] Add governed guided choices and preview controls in apps/gallery/src/lib/guided-preparation.tsx and apps/gallery/src/app/gallery.tsx, retaining browsing and standalone thumbnails (FR-001, FR-002, FR-003).

## Phase4: Recipient launchers (US2)

- [x] T007 [US2] Validate canonical release/publication/artifact and inventory identities with bounded native network/archive processing in crates/gallery-preparation/src/ (FR-004, FR-005).
- [x] T008 [US2] Preserve complete per-platform bundles and relocatable root entrypoints with inventory-validated reuse and no unrelated replacement in crates/gallery-preparation/src/ (FR-005, FR-006, FR-009).
- [x] T009 [US2] Add deterministic invalid-record/archive/digest/collision/reuse tests in crates/gallery-preparation/tests/ and actual published-recipient native campaigns in scripts/test-*-packages.mjs (FR-004, FR-005, FR-006, FR-009; SC-002, SC-003).

## Phase5: Partial/canceled jobs (US3)

- [x] T010 [US3] Integrate independent presentation/thumbnail/recipient actions, admission, progress, cancellation and lifecycle shutdown in apps/gallery/src-tauri/src/guided.rs, main.rs and crates/gallery-core/src/thumbnail.rs (FR-007, FR-008).
- [x] T011 [US3] Test no choices, combinations, stale previews, partial outcomes and observed helper-exit cancellation in apps/gallery/src-tauri/src/guided.rs and isolated native scripts (SC-001, SC-004).

## Phase6: Expected Windows presentation (US4)

- [x] T012 [US4] Add deterministic default-to-expected and persistent-wrong regressions in tests/native-driver-lifecycle.test.mjs (FR-011, SC-005).
- [x] T013 [US4] Require expected portable state within existing startup deadline and retain root/settings/UIA context in scripts/native-driver-lifecycle.mjs and scripts/test-windows-packages.mjs (FR-010, FR-011).

## Phase7: Qualification and handoff

- [x] T014 Update authoritative unreleased docs/contracts and CHANGELOG.md; retain new snapshot and check UTF8/LF/mojibake (FR-012).
- [x] T015 Run npm run check, npm test, npm run check:docs, npm run check:app and affected site checks; retain terminal timing in specs/024-gallery-preparation/verification.md and measurements.md.
- [x] T016 Push official PR closing #27/#79, verify exact-head CI and original candidate artifacts, resolve every finding within two review rounds, update Projects and hand off for owner final review/merge.

## Dependencies and execution

T001→T002→blocking analysis→T003/T004→US1→US2→US3→qualification. US4 is independently testable after analysis and is implemented first. Read-only acquisition and service research ran in parallel; tests across separate hosts run concurrently in CI. Every story has its acceptance criteria in spec.md and quickstart.md. Deliver all four stories before PR handoff; no partial MVP is completion.
