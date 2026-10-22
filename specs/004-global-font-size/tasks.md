# Tasks: Global font size

**Input**: Specification, plan, data model, research and interface contract.

## Phase 1: Setup and foundation

- [x] T001 Verify current S004 selector, constitutional fit and blocking analysis in `specs/004-global-font-size/analysis.md` before code changes.

## Phase 2: US1 - Retain a smaller font

**Independent test**: Select a smaller font, inspect text and unchanged geometry, restart, restore default.

- [x] T002 [P] [US1] Add legacy/default/valid/invalid persistence regressions before implementation in `apps/gallery/src-tauri/src/settings.rs` and `tests/contracts.test.mjs` (FR-003, FR-004).
- [x] T003 [US1] Implement optional fontScale80|90|100 default100 in `settings.rs`, `apps/gallery/src/lib/types.ts` and master `schemas/v0.0.0/local-media-gallery.schema.json` (FR-003, FR-004).
- [x] T004 [US1] Add font factor/default/geometry/restart assertions in `scripts/test-native.mjs` before UI implementation (FR-001..FR-005, SC-001..SC-003).
- [x] T005 [US1] Add labelled selector, immediate inherited body scaling and default100 in `apps/gallery/src/app/gallery.tsx` and `gallery.css` (FR-001, FR-002, FR-005).

## Phase 3: Integration

- [x] T006 Update preference docs under `docs/v0.0.0/`, README, CHANGELOG and current exclusions in `scripts/provenance.mjs` (FR-006).
- [x] T007 Run `npm run qualify`, record separate timings/source/elected limits in `specs/004-global-font-size/verification.md`, verify completed tasks and commit locally (FR-006, SC-004).

## Dependencies and execution

T001 gates implementation. T002 precedes T003; T004 precedes T005. Backend and native/UI test authoring use separate files and can proceed together. T005 integrates T003; T006 follows settled contract; T007 follows all implementation. All changes remain local. No new framework or custom checklist is needed for this bounded preference.
