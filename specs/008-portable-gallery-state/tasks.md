# Tasks: S008 Portable Gallery State

Branch: codex/008-portable-gallery-state. Feature: specs/008-portable-gallery-state. Issues #8 and #9; all three P1 stories and delivery gates are required. Tests precede implementation.

## Phase 1: Setup

- [x] T001 Complete research/contracts and blocking analysis in specs/008-portable-gallery-state, confirming actual branch/selector/issue identity (FR-001..022, SC-001..008).
- [x] T002 Pin bundled rusqlite0.40.1 and direct cap dependencies in apps/gallery/src-tauri/Cargo.toml/Cargo.lock; preserve hidden build/readiness behavior (FR-010/016, SC-007).

## Phase 2: Shared foundation

- [x] T003 Add failing portable schema and native scope-UI regressions in tests/contracts.test.mjs and scripts/test-native.mjs, retaining exact baseline failure evidence (FR-003/004/006, SC-002/003/006).
- [x] T004 Add held current-root mutation gate and stale-session/confinement tests in crates/gallery-core/src/lib.rs and tests/core.rs (FR-009/011/019, SC-004).
- [x] T005 Share known-field sparse validation/patch helpers while preserving legacy user bytes/unknown fields in apps/gallery/src-tauri/src/settings.rs (FR-001/004/005/008, SC-001/004).
- [x] T006 Implement common resolver/session/source state plus precedence/omission/default tests in apps/gallery/src-tauri/src/gallery_state.rs (FR-001/002/007/018, SC-001).

## Phase 3: US1 Portable presentation

- [x] T007 [US1] Write native portable red regressions for sparse/unknown/future/corrupt/one-MiB/concurrent/linked destinations and source-byte preservation in apps/gallery/src-tauri/src/portable.rs (FR-003/004/008/009/021, SC-002/003/004).
- [x] T008 [US1] Implement sparse product/kind/version envelope and capability-relative coordinated atomic portable writes in apps/gallery/src-tauri/src/portable.rs (FR-003/004/006/008/009, SC-002/003/004).
- [x] T009 [US1] Wire portable loading/saving and override removal through current-session state in apps/gallery/src-tauri/src/gallery_state.rs (FR-001/006/007/009, SC-001/002/004).

## Phase 4: US2 Remembered directories

- [x] T010 [US2] Add deterministic native history red cases for exact90-day boundaries, rollback,20-result ordering, migrations/foreign/future/corrupt files and concurrent revisions in apps/gallery/src-tauri/src/history.rs (FR-010..017/021, SC-003/004/005).
- [x] T011 [US2] Implement lossless native path encoding/platform locations and alias/case round-trip tests in apps/gallery/src-tauri/src/history.rs (FR-010/011/017, SC-002/005).
- [x] T012 [US2] Implement identity/version/schema validation, new-store transactional initialization,250ms contention, conditional choices and bounded256-row expiry in apps/gallery/src-tauri/src/history.rs (FR-010/012/013/016, SC-004/005).
- [x] T013 [US2] Implement activity/recents/opaque reopening/idempotent forget/clear and active-layer recomputation in apps/gallery/src-tauri/src/gallery_state.rs and main.rs (FR-012..017, SC-002/003/005).

## Phase 5: US3 Destination-aware interaction

- [x] T014 [US3] Wire session/revision-bound patch/remove/clear/state IPC and all root-opening paths in apps/gallery/src-tauri/src/main.rs; preserve main-window-only admission and asynchronous blocking work (FR-002/006/007/009/018/019, SC-004/006).
- [x] T015 [US3] Implement typed state hook with serialized sparse changes and stale response/warning rejection in apps/gallery/src/lib/types.ts and use-gallery-state.ts (FR-001/002/006/007/018, SC-001/004/006).
- [x] T016 [US3] Add visible destination, per-field provenance/inheritance, temporary reset and recents/forget/clear controls in apps/gallery/src/lib/state-controls.tsx and app/gallery.tsx/gallery.css, using existing brand tokens and compact controls (FR-002/006/007/014/015/018/019, SC-003/006).
- [x] T017 [US3] Extend native rendered acceptance for A/B independence, fresh-profile relocation, root retirement, visible save outcomes, malformed/read-only conflicts, keyboard/text scale and unavailable recents in scripts/test-native.mjs; isolate history and preserve all existing groups (FR-018/019/021, SC-001..006).

## Phase 6: Contracts and delivery

- [x] T018 Update master schema, examples and meaningful positive/negative Node cases in schemas/v0.0.0/local-media-gallery.schema.json, examples and tests/contracts.test.mjs (FR-020/021, SC-001/004/005).
- [x] T019 Update authoritative docs/v0.0.0 state/interface/lifecycle/architecture/verification/glossary and CHANGELOG.md with policy/migration/provenance decisions, preserving baseline version and public-doc separation (FR-020, SC-002/003/004/005).
- [x] T020 Add only S008 delivery-record exclusions in scripts/provenance.mjs and record the dated decision in CHANGELOG.md; run full qualification and retain exact timing/source evidence in specs/008-portable-gallery-state/verification.md (FR-021/022, SC-007).
- [ ] T021 Commit, automatically push/open/attach official PR closing #8/#9 and set Project8 Slice S008/status in the existing milestone (FR-022, SC-008).
- [ ] T022 Wait applicable exact-head hosted CI, respond/fix/resolve every review finding with at most two review rounds, complete final receipts and hand off for owner final review/merge in specs/008-portable-gallery-state/verification.md (FR-022, SC-007/008).

## Dependencies and execution order

T001 blocks implementation. T003 establishes real baseline failures before scope implementation. T004–T006 are shared; T007–T009 deliver portable state; T010–T013 deliver remembered state using the resolver; T014–T017 expose both journeys together. T018–T020 finish coherent contracts/qualification before publication. T021–T022 require passing local evidence, then exact-head CI and bounded actual reviews. No partial story or extra issue count substitutes for complete #8/#9 acceptance.

No implementation tasks are marked parallel: native modules/IPC and integration tests share contracts and are implemented sequentially. Research agents ran independent read-only tasks as required by speckit-plan. Within US1, schema and native tests can be authored independently after the shared contract; within US2, path-encoding and deterministic time cases can be authored independently; within US3, compact CSS and typed state protocol can be checked separately after IPC stabilizes. These are dependency-safe opportunities, not a requirement to spawn implementation agents.

## Incremental validation strategy

US1 independently proves relocation with sparse choices; US2 independently proves two-root recall and row-only forget/expiry; US3 independently proves visible destinations/provenance and failure/retirement behavior. Preserve the existing global preference and native media fixture throughout. Full slice completion requires every task, both issue outcomes and owner handoff; no merge, package publication or DNS mutation is included.
