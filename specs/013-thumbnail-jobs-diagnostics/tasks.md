# Tasks: S013 Optional Thumbnail Jobs and Diagnostics

**Input**: spec.md, plan.md, research.md, data-model.md and contracts/preparation.md.
**Tests**: TDD required by autopilot; integrity, authority and failure/lifetime tests are mandatory and never skipped or weakened.
**Organization**: Foundational contracts, then independently testable user journeys, then complete qualification/delivery.

## Phase 1: Setup

- [X] T001 Verify S013 branch/selector/#12/#15 identity, current constitution and governed UI constraints in specs/013-thumbnail-jobs-diagnostics/plan.md (FR-017/018).
- [X] T002 Record exact dependency/provider pins and prerequisite preparation policy in specs/013-thumbnail-jobs-diagnostics/research.md and Cargo.toml/Cargo.lock (FR-002/010).

## Phase 2: Foundational contracts and authority

- [X] T003 Write failing native source-key/root-authority, immutable entry/collision/future-record and diagnostic bound regressions in crates/gallery-core/tests/preparation.rs and tests/preparation-contract.test.mjs (FR-005/006/009/012).
- [X] T004 Implement exact observed source capture, canonical relative keys, full source SHA256 and no-follow owned cache primitives in crates/gallery-core/src/lib.rs and cache.rs, including "at most 6 MiB", "16 no-clobber slots", no unrelated overwrite, staged complete-envelope fallback and current-root commit fences (FR-005/006/009).
- [X] T005 Implement typed allowlisted DiagnosticStore in crates/gallery-core/src/diagnostics.rs with "at most 256 records and 262144 serialized-record bytes", exact dropped counts, null context and no ordinary disk logs (FR-012).

## Phase 3: US1 Deliberate optional preparation (P1)

- [X] T006 [US1] Write failing image/video, write-free preview, helper identity/timeout, partial outcome and bounded worker regressions in crates/gallery-core/tests/preparation.rs and apps/gallery/src-tauri/src/preparation.rs tests (FR-001..004/008/010/011).
- [X] T007 [US1] Implement image 0.25.10 and hash-bound fd-input FFmpeg PNG providers in crates/gallery-core/src/thumbnail.rs with "dimensions<=16384", "area<=33554432", "decoded bytes<=134217728", "output<=4MiB", helper 30s deadline, drained 16 KiB stderr and observed termination (FR-002/010/011).
- [X] T008 [US1] Implement immediately admitted, asynchronously cancellable write-free preview/root/provider/source/destination/exact-slot binding and storage upper bounds in crates/gallery-core/src/thumbnail.rs (FR-003/006/009).
- [X] T009 [US1] Implement one admitted native job, ordered targeted progress, source/root/destination/job revalidation, cancellation and bounded recent outcomes in crates/gallery-core/src/thumbnail.rs and apps/gallery/src-tauri/src/preparation.rs (FR-004/005/008/011).
- [X] T010 [US1] Extend args_os parsing and shared finite preview/generation dispatch, Ctrl-C cancellation and one OperationResult output in apps/gallery/src-tauri/src/launch.rs/main.rs/preparation.rs (FR-004/009/011).
- [X] T011 [US1] Add main-window preview/start/status/cancel/helper selection IPC and branded keyboard-operable task controls in apps/gallery/src-tauri/src/main.rs and apps/gallery/src/lib/preparation.tsx (FR-003/004/016).

## Phase 4: US2 Valid caches through interruption and relocation (P1)

- [X] T012 [US2] Write failing relocation/non-Unicode/same-size-preserved-time replacement, corrupt/oversized/future output, concurrent collision, source/destination replacement and retirement regressions in crates/gallery-core/tests/preparation.rs (FR-005..009/015).
- [X] T013 [US2] Implement current full-content cache validation on two shared permits and opaque derived-resource grants in crates/gallery-core/src/cache.rs/lib.rs/transport.rs; no metadata record path becomes authority (FR-006/007/009).
- [X] T014 [US2] Integrate bounded visible-demand cache lookup and one-time original fallback with separate preview facts in apps/gallery/src/lib/thumbnail.ts and apps/gallery/src/app/gallery.tsx; viewer/metadata retain originals and pending lookup retires with interest/session (FR-001/007/008/016).
- [X] T015 [US2] Implement explicit bounded owned cleanup and abandoned/incomplete-record recovery without recursive deletion in crates/gallery-core/src/cache.rs, native preparation handlers and task UI (FR-005/006/015).
- [X] T016 [US2] Exercise source/root/destination races, admitted commit retirement, cancellation before/after commit and unknown helper lifetime reservation using test-only barriers in crates/gallery-core/tests/preparation.rs and apps/gallery/src-tauri/src/preparation.rs (FR-005/008/011/015).

## Phase 5: US3 Scoped diagnostics and export (P2)

- [X] T017 [US3] Write failing category/allowlist/coalescing, exact counter/null, private sentinel, damaged/future state preservation and explicit export tests in crates/gallery-core/tests/diagnostics.rs and native host tests (FR-012..015).
- [X] T018 [US3] Preserve typed state read/parse/version/conflict categories before warning flattening and record them through host wrappers in apps/gallery/src-tauri/src/settings.rs/history.rs/gallery_state.rs/main.rs (FR-012/013/015).
- [X] T019 [US3] Record discovery terminal transitions once, core media failures before HTTP mapping and validated coalesced renderer observations in crates/gallery-core/src/diagnostics.rs/transport.rs and apps/gallery/src-tauri/src/main.rs (FR-012/013).
- [X] T020 [US3] Implement described current-process diagnostics CLI output/--diagnostics attachment and native user-selected UTF-8/LF export in apps/gallery/src-tauri/src/launch.rs/main.rs/preparation.rs (FR-009/012/014).
- [X] T021 [US3] Add typed report/recovery inspection and explicit export control using delivered Dialog/Button/StatusBadge in apps/gallery/src/lib/diagnostics.tsx and gallery.tsx (FR-013..016).

## Phase 6: Qualification and publication

- [X] T022 Add actual Windows rendered preview/no-write/start/cancel/cache-card/original-viewer/diagnostic-export/focus regressions in scripts/test-preparation.mjs and preserve scripts/test-native.mjs existing acceptance (FR-001..016/018).
- [X] T023 Prepare verified explicit or pinned three-OS maintainer FFmpeg provider, license/payload/version/hash/protocol and separate footprints in scripts/prepare-media-tool.mjs/prepare.mjs/create-fixture.mjs (FR-002/010/011/018).
- [X] T024 Extend actual normal extracted Full/Lite image/video/relocation/helper-mutation/diagnostic proof and ordinary artifact hook exclusion in scripts/test-proof.mjs/build-proof.mjs/test-normal.mjs/ci.mjs (FR-001..015/018).
- [X] T025 Update schemas/v0.0.0/local-media-gallery.schema.json, docs/v0.0.0/ and chronological CHANGELOG.md with delivered U-09/U-11 policy and explicit native/color/tool boundaries (FR-017).
- [X] T026 Elect new mandatory checks, exact source/binary/tool/cache provenance and receipt-only exclusions in scripts/qualify.mjs/provenance.mjs and specs/013-thumbnail-jobs-diagnostics/verification.md/measurements.md (FR-018).
- [X] T027 Run all mandatory local qualification checks after readiness and record terminal source/tool/artifact identity, failures/corrections and preparation/qualification/combined timing in specs/013-thumbnail-jobs-diagnostics/verification.md/measurements.md (FR-018, SC-001..006).
- [X] T028 Commit/push official PR closing #12/#15, attach PR and update Project 8 PR review/S013; record receipts in specs/013-thumbnail-jobs-diagnostics/verification.md (FR-018).
- [ ] T029 Handle all elected hosted CI and every review thread within at most two rounds, verifying exact normal native proof artifacts against source/tool identities in specs/013-thumbnail-jobs-diagnostics/verification.md/measurements.md (FR-018).
- [ ] T030 Publish final receipts, verify exact-final-head CI/source/reviews/project state and clean checkout, then notify owner for final review/merge in specs/013-thumbnail-jobs-diagnostics/verification.md (FR-018, SC-006).

## Dependencies and execution order

Setup → test-first authority/cache/diagnostic foundation → US1 explicit preparation → US2 cache use/relocation/recovery → US3 integrated diagnostics/export → rendered/normal/native proof → docs/full qualification → authorized PR/CI/reviews → owner handoff. US2 can validate seeded entries independently; US3 diagnoses existing failures independently of successful thumbnail generation. Shared Rust/core/UI source edits serialize. Test-first pairs precede their implementation; source authority and no-clobber ownership are correct from first implementation, not deferred hardening.

## Parallel examples

Contract test design, primary-source encoder research and UI requirements review may be independent; only the three plan-required read-only research tasks were delegated. Implementation remains local and sequential. Native hosted proof jobs may run concurrently on their own runners after shared source is settled.

## Implementation strategy

First deliver exact authority and durable/diagnostic contracts, then actual optional image/video generation and visible progress, then cache-backed cards and recovery, then complete redacted diagnostics. Preserve originals/no-cache behavior and all existing regression suites throughout. Every task is part of this slice; an intermediate independently testable story is not final delivery. No merge/tag/release.
