# Tasks: v0.2.0 release preparation

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/publication-handoff.md and quickstart.md.

## Phase 1: Setup

- [x] T001 Initialize S026 branch/selector, issue #83/project tracking and Spec Kit artifacts in .specify/feature.json and specs/026-v020-release-publication/.
- [x] T002 Complete read-only research, requirements checklists and blocking analyze gate in specs/026-v020-release-publication/analysis.md before implementation.

## Phase 2: Foundation

- [x] T003 Capture committed historical0.1.0 inventory into tests/fixtures/releases/v010-inventory.json and extend tests/initial-release.test.mjs with fixed complete byte/manifest preservation coverage; run the new regression before and after supplying its fixed baseline.
- [x] T004 Register exactly S026 tasks.md/verification.md/measurements.md progress exclusions in scripts/provenance.mjs; retain all design, checklist, test and implementation inputs in source identity.

## Phase 3: US1 release understanding

**Goal**: Accurate implemented0.2.0 scope and recipient migration guidance.

**Independent test**: Current docs/history review and existing structural/link/schema checks, with unchanged historical inventory.

- [x] T005 [US1] Finalize release wording and highlights in README.md, CHANGELOG.md and docs/v0.2.0/{index,overview,installation-and-distribution,verification-and-compatibility}.md; retain elected version, supported rows and compatibility contracts, keeping availability canonical rather than claiming publication.

## Phase 4: US2 verifiable candidate

**Goal**: Source-bound current documentation and exact accepted native/site evidence.

**Independent test**: Current receipt freshness, all nine qualification scopes and original-archive/native/site independent readback.

- [x] T006 [US2] Commit complete source A, confirm no canonicalv0.2.0, and use existing scripts/release.mjs snapshot into a disposable destination to refresh only site/retained/v0.2.0.json with ordinary glossary review and separate capture provenance; retain source A and receipt B in specs/026-v020-release-publication/verification.md.
- [x] T007 [US2] Run npm run check, npm test, npm run check:docs and affected production build/check/test:site plus actual candidate/control-publication gates; compare historical inventories and UTF8/LF/mojibake integrity, recording results in specs/026-v020-release-publication/verification.md.
- [x] T008 [US2] Obtain all nine applicable final-head CI successes and complete independent source/revision, original archive, six products/source, native lifecycle/offline and site/docs readback; record receipts and separate clocks in specs/026-v020-release-publication/{verification,measurements}.md.

## Phase 5: US3 reviewed owner handoff

**Goal**: Official PR and exact future publication procedure, with owner final merge boundary.

**Independent test**: PR head/checks, every actual review thread, project state and explicit unpublished/publication handoff inspection.

- [x] T009 [US3] Complete specs/026-v020-release-publication/contracts/publication-handoff.md and quickstart.md with final-main run selection, version0.2.0, predecessor0.1.0, exact retained bytes and public/download/site verification requirements, without executing publication.
- [x] T010 [US3] Commit final prepared source, automatically push codex/s026-v020-release-publication and open official PR closing #83; keep project in PR review and bind final head/evidence in specs/026-v020-release-publication/verification.md.
- [x] T011 [US3] Handle all findings and replies/resolutions within at most two review rounds, repeat affected verification after necessary fixes, then ping owner for final review/merge and retain handoff in specs/026-v020-release-publication/verification.md.

## Dependencies and execution order

T001 -> T002 -> T003/T004 -> T005 -> T006 -> T007 -> T010 -> T008 -> T011. T009 follows plan research and completes before T010. Any review correction repeats affected qualification before T011. Actual publication/tag/promotion and M3 closure are outside the current run.

## Parallel opportunities

Read-only document and pipeline research are independent, as the installed plan command requires. Historical inventory and prose review can be checked independently after setup, but source edits, capture commits, receipt replacement, qualification, remote mutations and review fixes remain sequential integrator work. No concurrent source writers are elected.

## Implementation strategy

Prepare and validate current recipient-facing descriptions first, then refresh their provenance and qualify the exact full candidate. An independently testable story does not replace the complete owner handoff gate. Custom checklists remain reviewer-owned requirements-quality artifacts, not implementation progress.
