# Tasks: S036 application navigation

**Input**: spec.md, plan.md, research.md, data-model.md and contracts/navigation.md.
**Tests**: Required TDD and regression preservation under autopilot. All three stories are required for delivery; partial navigation does not close #94.

## Phase 1: Setup

- [x] T001 Complete Spec Kit specification, clarification, reviewer requirements checklists and plan artifacts in specs/036-application-navigation. [FR-001 through FR-018]
- [x] T002 Run the read-only cross-artifact analysis gate and record its outcome in the implementation verification record specs/036-application-navigation/verification.md. Confirm existing .gitignore/build-cache exclusions without adding unrelated scaffolding. [FR-015, FR-017]

## Phase 2: Foundation

- [x] T003 Add failing hierarchy, route-parent, folder identity regressions in tests/navigation.test.mjs; clipboard-boundary assertions in scripts/test-gallery-navigation.mjs; add the headless external-host harness scripts/test-gallery-navigation.mjs with failing rendered app-bar/drawer assertions before UI changes. [FR-001, FR-003, FR-004, FR-011, FR-014, SC-001, SC-002, SC-004]
- [x] T004 Implement finite typed route taxonomy in apps/gallery/src/lib/navigation.ts and the stable native modal in apps/gallery/src/lib/application-navigation.tsx, with initial/transition/return focus, Back, Escape and background containment. [FR-003, FR-011, FR-013, FR-014]

## Phase 3: US1 - Gallery navigation

**Independent test**: Empty/open gallery, all five categories and eighteen destinations at 320px/desktop; full path copy and scoped sort/filter.

- [x] T005 [US1] Replace the crowded header and empty selection surface in apps/gallery/src/app/gallery.tsx and gallery.css with Menu, folder basename/details, Refresh, Open folder and recent folders. [FR-001, FR-002, FR-004, FR-012, SC-001, SC-002]
- [x] T006 [US1] Place Sort and filter beside count; preserve controlsExpanded as optional real inline Show/Hide controls with visible destination in apps/gallery/src/app/gallery.tsx. Preserve pagination and deterministic sort/filter through existing handlers. [FR-005, FR-010, FR-013, SC-003]
- [x] T007 [US1] Split recent-folder/history and settings-source presentation in apps/gallery/src/lib/state-controls.tsx, retaining reopen/forget/clear/inherit effects and unique contextual scope IDs. Add meaningful source-level behavior coverage in scripts/test-gallery-navigation.mjs. [FR-002, FR-006, FR-007, FR-010]

## Phase 4: US2 - Settings and work

**Independent test**: Destination visible before each edit, all four existing scopes; active guided/thumbnail state survives drawer dismissal and cancellation remains reachable.

- [x] T008 [US2] Add failing contextual-scope and operation-lifetime browser cases in scripts/test-gallery-navigation.mjs before relocation. Preserve real persistence assertions in scripts/test-native.mjs. [FR-006, FR-008, FR-013, SC-003, SC-005]
- [x] T009 [US2] Build contextual appearance/layout/loading/information/provenance/history panels in apps/gallery/src/app/gallery.tsx and state-controls.tsx, using one existing settings authority and preserving controlsExpanded/metadataExpanded effects. [FR-006, FR-007, FR-010, FR-013]
- [x] T010 [US2] Lift useGuidedPreparation to Gallery lifetime and expose inline body/progress in apps/gallery/src/lib/guided-preparation.tsx; keep thumbnail destination draft stable in preparation.tsx and provide inline controls. Show compact active progress/cancel plus details route outside drawer. [FR-008, FR-010, FR-013, SC-005]
- [x] T011 [US2] Provide inline diagnostics and Help panels in apps/gallery/src/lib/diagnostics.tsx and application-help.tsx; embed existing local application, brand and font LICENSE/NOTICE text through help.rs without changing governed bytes; wire fixed official documentation browser request in apps/gallery/src-tauri/src/help.rs and main.rs with hidden noninteractive platform launch and explicit failure feedback. No arbitrary command/URL interface. [FR-010, FR-014, FR-015]

## Phase 5: US3 - Viewer and accessible interaction

**Independent test**: Drawer above a playing viewer, same media node/time and selection, meaningful keyboard/touch focus, no background shortcuts, narrow/zoomed/mixed-pointer routes.

- [x] T012 [US3] Add failing playback-node lifetime, nested modal Escape/focus, clipboard-denial, keyboard containment and responsive/axe cases in scripts/test-gallery-navigation.mjs. [FR-004, FR-009, FR-011, FR-012, FR-014, SC-002, SC-004, SC-005]
- [x] T013 [US3] Integrate stable drawer with Viewer in apps/gallery/src/app/gallery.tsx: focused primary controls, common Menu, visible selected-scope cue before Information toggle, contextual summary scope and compact operation progress. Preserve media key/component position and explicit viewer close/navigation. [FR-009, FR-010, FR-011, FR-013, SC-005]
- [x] T014 [US3] Complete governed responsive/focus/motion styling in apps/gallery/src/app/gallery.css with existing AppFrame scroll/overlay ownership, 32px fine-pointer exception and 44px coarse/mixed minimum. [FR-012, FR-015, SC-001, SC-004]

## Phase 6: Integration and local verification

- [x] T015 Migrate scripts/runtime-driver.mjs, test-runtime.mjs and runtime-evidence.mjs plus tests/runtime-qualification.test.mjs to explicit topmost modal routes and source-bound drawer-v1 traversal/focus/AX proof; preserve trusted keyboard, screen-reader and media assertions and explicit legacy receipt support. [FR-009, FR-010, FR-011, FR-017, SC-004, SC-005]
- [x] T016 Migrate current-candidate actions in scripts/test-native.mjs, test-preparation.mjs, measure-native.mjs and diagnose-runtime.mjs to explicit drawer routes/contextual-before-edit scopes. Add candidate ordinary native drawer smoke in scripts/test-linux-packages.mjs, test-macos-packages.mjs and test-windows-packages.mjs where applicable; retain existing visible Show/Hide readiness and portable intent proof and all actual public legacy recipient paths. [FR-006, FR-008, FR-010, FR-017, SC-003, SC-005]
- [x] T017 Run npm run check, npm test, npm run check:app, export and the new headless gallery harness plus affected site build/check/browser checks. Keep isolated native scopes elected in existing CI; preserve failures and meaningful fixes in specs/036-application-navigation/verification.md and measurements.md before commit. [FR-014, FR-015, FR-017, SC-001 through SC-005]
- [x] T018 Document source-only navigation in docs/unreleased/application-navigation.md, update README.md availability/source guidance and CHANGELOG.md Unreleased, preserving all released/version/schema/governed bytes and no public numbered planning links. [FR-016]
- [x] T019 Reconcile implementation against all actions/contracts in specs/036-application-navigation/verification.md, inspect rendered wide/narrow screenshots, verify UTF-8/no-BOM/LF/no-mojibake and review git diff without weakening existing assertions. [FR-010, FR-015, FR-016, FR-017]
- [x] T020 Prepare the commit/PR/handoff payload and exact hosted scope/review-cap ledger in ignored .local/s036-* records. Keep official CI/review receipts on the PR, with owner merge boundary and no publication. [FR-018, SC-006]

## Dependencies and parallel opportunities

T001–T002 gate implementation. T003 precedes T004. US1 (T005–T007) composes the foundation; T008 precedes US2 relocation; T012 precedes US3 integration. T015–T016 follow the new interaction contracts and preserve current native source/role boundaries. T017–T019 complete local validation before T020/commit.

Research for navigation/brand/verification was independent and delegated in the plan phase. Optional parallel examples: source-only docs T018 can be drafted while tests execute; focused hierarchy tests and screenshot analysis have separate files. Shared gallery and controller files must be edited sequentially.

## Implementation strategy

Build the complete three-story slice incrementally under meaningful failing regressions. No subset closes #94. Existing settings and operation authority remain in place; new route state is transient.

## Hosted delivery gate (tracked live on the PR after implementation)

After verified local implementation, commit, push and open the official PR with Fixes #94. Run existing exact-head repository, site, Windows/Linux/macOS product/package and aggregate qualification. Preserve source, bytes, clocks and 660/900/15 requirements. Handle automatic hosted review, use at most one additional round, answer/resolve all findings, and post final exact-head terminal receipts. Do not create an evidence-only code commit solely to acknowledge CI; the PR is the primary delivery tracker. Only then ping the owner for final review/merge. No merge or publication is authorized.
