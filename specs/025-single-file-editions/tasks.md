# Tasks: Single-file editions

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/delivery.md and quickstart.md.

## Phase 1: Setup

- [x] T001 Initialize S025 identity in .specify/feature.json and specs/025-single-file-editions/ using installed Spec Kit workflow.
- [x] T002 Research platform delivery and dependency closure in specs/025-single-file-editions/research.md.

## Phase 2: Foundation

- [x] T003 Define and test direct artifact identity/embedded metadata contracts in scripts/single-file.mjs and tests/single-file.test.mjs, including tamper/truncation/platform refusals.
- [x] T004 Build deliberate pinned redistributable FFmpeg and retain source/configuration/notices in scripts/prepare-feature-helper.mjs.

## Phase 3: US1 single-file Lite

**Goal**: Direct executable delivery on all three platforms.

**Independent test**: Copy only executable into fresh gallery; native launch, relocation and Refresh on isolated host.

- [x] T005 [US1] Embed notices and maintenance metadata in apps/gallery/src-tauri/build.rs and native product resources; retain CRT/system-only dependency audit.
- [x] T006 [P] [US1] Produce direct Windows Lite file and copy-only launch checks in scripts/build-windows-packages.mjs and scripts/test-windows-packages.mjs.
- [x] T007 [P] [US1] Produce direct Linux ELF and copy-only relocation checks in scripts/build-linux-packages.mjs and scripts/test-linux-packages.mjs.
- [ ] T008 [P] [US1] Prove bare Mach-O native launch, produce direct macOS Lite and relocation checks in scripts/build-macos-packages.mjs and scripts/test-macos-packages.mjs.

## Phase 4: US2 offline system Full

**Goal**: One native installer with full dependency coverage and ordinary maintenance.

**Independent test**: Copy installer alone to clean isolated supported host, record prerequisite absence, disable networking, install and use included features, then lifecycle checks.

- [x] T009 [P] [US2] Add Windows embedded offline runtime/machine MSI installer and managed maintenance discovery in crates/windows-package/, preserving native ownership/refusal/rollback; add negative/unit tests first.
- [x] T010 [P] [US2] Add Linux native offline installer and clean Ubuntu dependency closure in scripts/build-linux-packages.mjs and native installer source; preserve existing deb/update guards and reject package downloads/removals/downgrades.
- [x] T011 [P] [US2] Add macOS flat system pkg and internal ownership-aware maintenance in crates/macos-package/ and scripts/build-macos-packages.mjs; prevent foreign overwrite.
- [x] T012 [US2] Automatically verify/select owned Full FFmpeg in apps/gallery/src-tauri/src/main.rs and preparation.rs, retaining explicit helper override and tests.
- [x] T013 [US2] Add clean offline prerequisite-absence/feature/lifecycle acceptance in scripts/test-*-packages.mjs and isolated .github/workflows/ci.yml paths; preserve all existing functional, integrity and provenance gates.

## Phase 5: US3 product selection and consumers

**Goal**: Consistent six-artifact release/update/preparation/download contract.

**Independent test**: Contract negatives and source-bound actual-artifact readback, historical0.1 still readable.

- [x] T014 [US3] Add version-aware direct artifact formats and product inventories in schemas/v0.2.0/, scripts/release-record.mjs and scripts/release-assembly.mjs; update tests before implementation.
- [x] T015 [US3] Add atomic direct executable consumption/reuse/refusal in crates/gallery-preparation/src/lib.rs and scripts/prepared-recipients.mjs while retaining historical archive decoding.
- [x] T016 [US3] Adapt update acquisition/ordinary installer maintenance integration in crates/gallery-update/ and scripts/update-packages.mjs with integrity/refusal/recovery coverage.
- [x] T017 [US3] Present exactly two product choices per platform in apps/site/ and site/ projections; distinguish metadata/debug assets, final names omit candidate.

## Phase 6: Cross-cutting verification and handoff

- [x] T018 Update docs/v0.2.0/ and CHANGELOG.md with actual dependency coverage, single-file usage, lifecycle behavior and dated architecture decisions; preserve historical snapshots.
- [x] T019 Run npm run check, npm test, affected app/site checks and UTF8/LF/mojibake validation; fix failures.
- [ ] T020 Qualify actual six files on isolated native hosts and verify exact-head applicable CI under existing timing rules; retain independent inventory/hash/source/native evidence in .local/ and specs/025-single-file-editions/verification.md.
- [x] T021 Commit, automatically push and open official PR closing #80; move project tracking to review. Exact-head qualification remains in T020.
- [ ] T022 Handle every review comment/thread with necessary changes and replies, at most two review rounds; final evidence goes in PR handoff without record-only matrix restarts. Ping owner for final review and merge, do not merge or publish release.

## Dependencies and execution order

T001 -> T002 -> analyze gate -> T003/T004 -> T005 -> US1/US2 native platform work. T012 follows helper contract. US3 contracts can proceed once direct identity is fixed; consumer acceptance follows platform outputs. T018-T020 integrate all stories; T021-T022 finish the slice.

Parallel team examples: Windows T006/T009 owns Windows-specific files; Linux T007/T010 owns Linux-specific files; macOS T008/T011 owns macOS-specific files. Shared metadata, helper preparation, release/preparation consumers and workflow remain sequential integrator work. Tests precede implementation for contracts and ownership/security boundaries. No concurrent edits to shared files.

## Implementation strategy

Prove Lite first as an independently testable increment, then Full per platform, then shared consumers and complete native acceptance. MVP validation does not authorize declaring #80 complete early. Every requirement remains in scope.

## Current verification status

2026-11-02: All implementation tasks are complete except proof of bare Mach-O runtime feasibility. Hosted run 41401021930 on e7e4831 passed repository, website and all three core native product campaigns. Direct Linux Lite passed launch, ordinary maintenance, relocation and Refresh. Package campaigns retained actionable failures: Windows firewall filter configuration, Linux staging mode, and macOS PKG interruption observation. The final permitted Codex review reported Windows retained-input publication and Linux first-install authority gaps. Corrections and equivalent macOS/shared transaction recovery fixes are being integrated with explicit interruption regressions. No complete six-file qualification or final handoff is claimed. GitHub PR/check/review receipts remain the authoritative live record.
