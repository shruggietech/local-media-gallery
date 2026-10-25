# Tasks: S010 Sidecar metadata and inspection

**Input**: [spec](spec.md), [plan](plan.md), research/data-model/contracts. Tests are elected by FR-012 and autopilot TDD. Entire #13/#14 scope is required for delivery.

## Phase 1: Setup

- [x] T001 Verify S010 branch/selector/issue mapping, installed skills and unchanged base in specs/010-sidecar-metadata-inspection/verification.md.
- [x] T002 Record research decisions and owned metadata contract in specs/010-sidecar-metadata-inspection/contracts/metadata.md.

## Phase 2: Foundational

- [x] T003 Write failing exact-tree/native association regressions in crates/gallery-core/tests/metadata.rs (FR-001/002/003/004).
- [x] T004 Add bounded ordered JSON parser in crates/gallery-core/src/metadata_json.rs: 1MiB source,depth64,20,000values; preserve repeated members and numeric tokens (FR-003/004).
- [x] T005 Add separate JSON observations and metadataRevision in crates/gallery-core/src/lib.rs and discovery.rs: max256, existing requested scan, complete-only prune (FR-001/005/010).

## Phase 3: US1 Inspect attributed sidecars (P1 MVP)

**Independent test**: Exact/stem/index corpus plus malformed/limit failures exposes attributed exact values without modifying sources.

- [x] T006 [US1] Implement associations and bounded prepared reads in crates/gallery-core/src/metadata.rs: single admitted inspection,1MiB/document,8MiB total,32documents, no directory reads from inspection (FR-001/002/004/010).
- [x] T007 [US1] Bind main-window inspect_metadata IPC to prepared authority before spawn in apps/gallery/src-tauri/src/main.rs (FR-003/004/010).
- [x] T008 [US1] Add typed tree/result contracts and exact selector helpers in apps/gallery/src/lib/types.ts and metadata.ts plus tests/metadata.test.mjs (FR-003/006/008).
- [x] T009 [US1] Add lazy attributed inspector to apps/gallery/src/lib/metadata-inspector.tsx and existing viewer information in apps/gallery/src/app/gallery.tsx,50siblings/step (FR-006/009/010).
- [x] T010 [US1] Prove real IPC exactness, source confinement and exceptional results in scripts/test-native.mjs and crates/gallery-core/tests/metadata.rs (FR-001/002/003/004/006).

## Phase 4: US2 Choose summary fields (P1)

**Independent test**: Nested choices resolve/persist through all existing destinations and relocation, including explicit empty/missing/conflicts.

- [x] T011 [US2] Add failing legacy/default/invalid/precedence summary-field tests in apps/gallery/src-tauri/src/settings.rs, gallery_state.rs and tests/contracts.test.mjs (FR-007/008).
- [x] T012 [US2] Add bounded summaryFields to existing native settings and resolver: max32 unique selectors,64path steps, default empty for old files, unknown fields retained (FR-007).
- [x] T013 [US2] Wire summary selection, missing/conflict attribution and existing destination/source controls in apps/gallery/src/lib/metadata-inspector.tsx, use-gallery-state.ts and state-controls.tsx (FR-007/008/009).
- [x] T014 [US2] Prove native rendered keyboard/text-scale/playback continuity and saved/portable summary choices in scripts/test-native.mjs (FR-007/008/009).

## Phase 5: US3 Refresh and recover (P2)

**Independent test**: Old reads held across Refresh/root/item change never replace current data; repaired explicit retry recovers.

- [x] T015 [US3] Add prepared/inflight stale-read, changed-resource and control responsiveness regressions in crates/gallery-core/tests/metadata.rs and scripts/test-native.mjs (FR-005/010).
- [x] T016 [US3] Revalidate root/opened/named identity and current session/item/metadata epoch after reads in crates/gallery-core/src/metadata.rs; native-test barrier excluded from normal artifact (FR-004/005).
- [x] T017 [US3] Gate frontend demand results by effect lifetime and current metadata revision in apps/gallery/src/lib/metadata-inspector.tsx; sidecar-only Refresh preserves video key/time (FR-005/009/010).

## Phase 6: Polish and delivery

- [x] T018 Update authoritative metadata/state/interface/glossary/index and compatibility docs in docs/v0.0.0/ plus CHANGELOG.md (FR-011).
- [x] T019 Update owned schema/examples and meaningful contract regressions in schemas/v0.0.0/ and tests/contracts.test.mjs (FR-003/007/011).
- [x] T020 Run full elected repository/site/native/normal-artifact qualification with unchanged input/brand hashes; record exact source and separate timings in specs/010-sidecar-metadata-inspection/verification.md (FR-012, SC-001..005).
- [x] T021 Commit/push official PR with #13/#14 closing refs and Project state in specs/010-sidecar-metadata-inspection/verification.md (FR-012).
- [x] T022 Resolve individual CI/review findings within at most two rounds, verify final head, and notify owner for final review/merge in specs/010-sidecar-metadata-inspection/verification.md (FR-012).

## Dependencies and execution order

Setup -> foundational -> US1 -> US2 -> US3 -> polish/delivery. US1 is independently testable; US2 adds persisted views and US3 adds fault qualification. Security/exactness tests precede implementation and remain mandatory. No implementation agents are required or spawned; research agents were required only by plan Phase0.

## Parallel opportunities

US1 pure selector tests can run alongside native tests after shared contracts; US2 schema tests and settings tests can run independently before integration; US3 core and rendered delayed-read tests target separate files. Shared source files are edited sequentially. No tasks receive a parallel marker because the chosen implementation sequence shares contracts/files.

## Implementation strategy

Deliver core exactness/association first, validate it, integrate demand inspection, then persisted summaries and stale-read/runtime regressions. Finish both issues and mandatory qualification before publication/handoff. Custom checklist markers remain reviewer-owned; existing owner autopilot authorization permits proceeding after requirements analysis without another permission pause.
