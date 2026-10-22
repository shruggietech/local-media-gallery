# Tasks: Responsive, content-first gallery browsing

**Input**: S003 spec, plan, research, data-model and contracts.
**Tests**: Required by autopilot; test changed contracts first and retain access-security regressions.

## Phase 1: Setup

- [x] T001 Verify S003 identity, ignore patterns and installed commands in `.specify/feature.json`, `.gitignore` and `specs/003-responsive-gallery/`.

## Phase 2: Foundation

- [x] T002 Complete requirements-quality review and blocking analysis in `specs/003-responsive-gallery/checklists/` and `analysis.md` before product edits.
- [x] T003 Record shared native/UI preference and explicit snapshot contracts in `specs/003-responsive-gallery/contracts/interface.md` and `data-model.md`.

## Phase 3: US1 - Bounded manual browsing

**Goal**: Explicit scans and bounded page media. **Independent test**: Small fixture changes remain invisible until Refresh; full collection sorted before small page selection.

- [x] T004 [P] [US1] Add manual discovery/session regressions before implementation in `crates/gallery-core/tests/core.rs`, retaining traversal, root and streaming tests (FR-001, FR-003, FR-015).
- [x] T005 [P] [US1] Add paging/order/bounds and masonry helper tests before implementation in `tests/view.test.mjs` (FR-002, FR-010).
- [x] T006 [US1] Remove watchers/timer, serialize explicit scan and ensure ready transport plus explicit completion in `crates/gallery-core/src/lib.rs`, `apps/gallery/src-tauri/src/main.rs` and Cargo manifests/lock (FR-001, FR-003).
- [x] T007 [US1] Implement page clamping/full-order slicing in `apps/gallery/src/lib/view.ts` and mount only selected page in `apps/gallery/src/app/gallery.tsx`; public size24|48|96 default48 (FR-002, FR-003).
- [x] T008 [US1] Implement combined four-slot image decode/video metadata queue, revision facts cache and cancellation in `apps/gallery/src/app/gallery.tsx` or domain helper (FR-004).

## Phase 4: US2 - Focused media

**Goal**: Media-dominant stable playback. **Independent test**: Viewer contains only active media; information toggles keep node/time, navigation crosses pages.

- [x] T009 [US2] Add native viewer isolation/disclosure/navigation regressions before implementation in `scripts/test-native.mjs` (FR-005..FR-008).
- [x] T010 [US2] Unmount gallery media, preserve scroll/focus, full-order navigation and responsive stable viewer in `apps/gallery/src/app/gallery.tsx` and `gallery.css` (FR-005, FR-006, FR-008).
- [x] T011 [US2] Connect info disclosure to immediate global persistence in `apps/gallery/src/app/gallery.tsx` (FR-007; depends on T014).

## Phase 5: US3 - Quiet adjustable interface

**Goal**: Compact content layout and retained choices. **Independent test**: Geometry, keyboard settings and restart persistence with valid/error states.

- [x] T012 [P] [US3] Add settings defaults/validation/unknown preservation/conflict/malformed/future/write-failure tests in `apps/gallery/src-tauri/src/settings.rs` before store implementation (FR-012, FR-013).
- [x] T013 [P] [US3] Add settings schema valid/invalid tests in `tests/contracts.test.mjs` (FR-012, FR-013).
- [x] T014 [US3] Implement native ordered/atomic per-user settings and commands, types/schema, feature-gated test isolation in `apps/gallery/src-tauri/src/settings.rs`, `main.rs`, `apps/gallery/src/lib/types.ts` and `schemas/` (FR-012, FR-013).
- [x] T015 [US3] Implement compact48px bar, collapse/settings, persisted controls, 12px masonry, informational idle-hidden scroll overlay in `apps/gallery/src/app/gallery.tsx`, `gallery.css` (FR-009..FR-012).

## Phase 6: Integration and qualification

- [x] T016 Update `scripts/test-native.mjs` for manual refresh, private page4, work bounds, geometry, preferences/restart, errors, keyboard and security; keep fixture12 (FR-001..FR-013, FR-015).
- [x] T017 [P] Reconcile official `docs/v0.0.0/`, `README.md`, `CHANGELOG.md` with current contracts, future boundaries and dated process decisions (FR-014).
- [x] T018 Update current evidence exclusions in `scripts/provenance.mjs`, ensure test state isolation in `scripts/test-normal.mjs`, and run `npm run qualify` with all repository/docs/product/brand/access checks (FR-015, SC-006).
- [x] T019 Record source identity, terminal results/timings and limits in `specs/003-responsive-gallery/verification.md`; mark tasks only when complete, commit locally on main and verify clean/source identity (FR-015).

## Dependencies and execution order

T001 -> T002 -> T003. Test tasks precede matching implementation. Core T004/T006 can run beside view T005/T007/T008 and settings T012/T014 because files are separate except main.rs (same core/settings owner). T009 precedes T010/T011; T011 needs native T014. T013 schemas integrate after final typed contract. T015 depends on view helpers and preferences. T016 validates integrated US1/2/3. T017 may run after contracts settle. T018 precedes T019. All stories must pass before final local commit; no publication.

## Parallel examples

- US1 core regressions and pure paging/layout regressions use separate files.
- US2 native regression authoring and UI implementation coordinate selectors before runtime.
- US3 native settings tests and master schema tests use separate files; docs can update after contract agreement.

## Implementation strategy

Manual browsing is first independently useful increment; viewer and preference work follows shared typed contracts. Integration retains twelve candidates with a private four-item page rather than large synthetic galleries. Native acceptance proves work/geometry/lifetime, not universal frame rate or Linux/macOS runtime. No unchecked requirements gate may be silently bypassed.
