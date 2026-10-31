# Tasks: S018 Linux Full/Lite packaging

**Input**: [spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [contract](contracts/linux-packages.md).

## Phase 1: Setup

- [x] T001 Initialize S018/018 identity, specification and requirements checklists through installed Spec Kit in .specify/feature.json and specs/018-linux-packaging/spec.md.
- [x] T002 Research Debian lifecycle, native runtime/brand and isolated CI with read-only research agents; complete specs/018-linux-packaging/{plan,research,data-model,quickstart}.md and contracts/linux-packages.md.

## Phase 2: Foundational

- [x] T003 Complete blocking cross-artifact analysis and requirements review before source implementation; retain assessment in specs/018-linux-packaging/analysis.md (all FRs/SCs).

## Phase 3: US1 Full lifecycle

**Goal**: Real owned package-manager installation, repeat and removal. **Independent test**: Actual .deb/APT/dpkg operations plus retained gallery/user/shared-runtime sentinels.

- [x] T004 [US1] Add failing strict Full identity/modes/path/duplicate/source/schema regressions in tests/linux-packages.test.mjs and injection/protocol/preflight regressions in tests/linux-package-scripts.test.mjs (FR-002/003/009).
- [x] T005 [US1] Implement scripts/linux-packages.mjs, scripts/linux-package-scripts.mjs and schemas/v0.0.0/linux-packages.schema.json with formatVersion1/version0.0.0/full|lite/linux/x86_64/release,32hex generation,64hex source,40hex revision, decimal byte strings and only644|755 modes; embed trusted fixed file/metadata authority and reject links/redirected parents (FR-002/003/009).
- [x] T006 [US1] Implement ordinary Full release assembly in scripts/build-linux-packages.mjs and pre-extraction audit in scripts/linux-deb-audit.py using existing notices, exact governed icons, derived dpkg-shlibdeps and declared media plugins; build actual .deb with preinst/prerm/postinst/postrm guards including failed-upgrade and non-mutating abort-remove (FR-002 through FR-005/009).
- [x] T007 [US1] Implement actual APT/dpkg install/repeat/foreign/changed/mode/link/candidate/removal/purge/config-files and retention cases in scripts/test-linux-packages.mjs; verify actual registered/installed results and retained shared dependencies without autoremove (FR-002 through FR-005, SC-001/003).

## Phase 4: US2 portable Lite

**Goal**: Extracted ordinary Lite works without Full or sender state. **Independent test**: External-root/explicit/relocated/native Refresh with portable settings.

- [x] T008 [US2] Add failing Lite entrypoint/binary/mode/unsafe-archive/footprint rejection coverage in tests/linux-packages.test.mjs and tests/linux-lite-archive.test.py; add real launcher arguments/path/missing-ELF cases in tests/linux-package-scripts.test.mjs (FR-006/009/010).
- [x] T009 [US2] Assemble mode-preserving Lite tar.gz in scripts/build-linux-packages.mjs with adjacent external launcher/ELF, complete notices/metadata and exact inventory; enforce raw TAR modes in scripts/proof-archive.py before extraction and verify complete bytes/modes (FR-006/009/010).
- [x] T010 [US2] Exercise actual extracted Lite after Full removal with fresh host-local profile, minimal PATH, unrelated CWD, space/non-ASCII in-place/explicit roots, relocation/Refresh/portable settings and retained data in scripts/test-linux-packages.mjs (FR-006/007, SC-002).

## Phase 5: US3 prerequisite and evidence

**Goal**: Actionable host diagnostics and source-bound actual native evidence. **Independent test**: Copied-ELF missing-library and empty-display negatives, actual ordinary native video/PCM and exact archive/footprint readback.

- [x] T011 [US3] Implement supported-host/architecture/ELF loader preflight in scripts/linux-package-scripts.mjs; preserve unchanged args/finite headless CLI, correct empty-display native precondition in apps/gallery/src-tauri/src/launch.rs, and qualify real copied-ELF missing-library/empty-display cases in scripts/test-linux-packages.mjs (FR-001/008, SC-003).
- [x] T012 [US3] Implement bounded external native observer/pixel checks in scripts/linux-package-ui.py and linux-package-pixels.py, actual trusted Play and changing decoded frames plus existing PID-owned PulseAudio PCM in scripts/test-linux-packages.mjs; reject missing/foreign/unavailable observations in scripts/linux-packages.mjs and tests/linux-packages.test.mjs (FR-007/009/011, SC-004).
- [x] T013 [US3] Integrate isolated linux-packages scope and artifact/failure retention in scripts/ci-linux-packages.mjs, ci.mjs and .github/workflows/ci.yml; preserve all existing platform/media gates,660/900/15s and separate accounting; enforce fail-fast and actual generated-script ShellCheck in scripts/check-linux-package-scripts.mjs and exact source before/after (FR-001/009 through FR-011).

## Phase 6: Integration and publication

- [x] T014 Update docs/v0.0.0/{installation-and-distribution,verification-and-compatibility,interfaces-and-contracts}.md, schemas/v0.0.0/platform-matrix.json, site/versions.json, CONTRIBUTING.md, CHANGELOG.md, scripts/check.mjs and provenance.mjs for authoritative package contracts, shell encoding, dated decisions and established S018 evidence exclusions (FR-012/011).
- [x] T015 Run npm run check, npm test, check:docs, check:app and affected site/contract checks through hidden local headless tooling; retain actual logs in specs/018-linux-packaging/verification.md (FR-009/011, all SCs).
- [x] T016 Commit/push official PR, complete all applicable hosted scopes and at most two code/security review waves; respond to and resolve every comment, update issue/project state and actual required-check policy after new scope passes (FR-013, SC-005).
- [x] T017 Run Spec Kit convergence and final source/binary/archive/native/footprint readback, record separate accounting in specs/018-linux-packaging/{verification,measurements}.md and live PR handoff, and stop for owner final review/squash merge (FR-009 through FR-013, SC-004/005).

## Dependencies and execution strategy

T001-T003 block source edits. T004 fails before T005/T006, then T007 qualifies Full. T008 precedes T009/T010 for independently usable Lite. US3 joins both ordinary candidates; native observations never transfer from private-hook core binaries. T014-T017 join all stories for one final source-bound delivery. Full alone is the first useful increment; issue #24 closes only after every story and final gate passes.

## Parallel opportunities

The three read-only research domains ran independently. Identity tests and observer design touch separate files after shared contracts settle, but shared builder/CI/evidence edits remain sequential. Existing hosted scopes and the new Linux package scope run in the platform matrix. No implementation delegation is required.
