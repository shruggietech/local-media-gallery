# Implementation Plan: v0.2.1 publication and verification

**Branch**: `codex/s032-v021-publication` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Owner-authorized publication and verification, tracked in #100.

## Summary

Publish accepted v0.2.1 assets from successful merged-main qualification with predecessor v0.2.0, then independently verify public bytes, live documentation and actual prepared-recipient acquisition. Initial run 42174731987 on f9bd121 failed; a demonstrated stale-worker selection defect now requires a proportional CI repair, regression coverage, reviewed PR and owner merge before fresh main qualification can authorize publication. Accepted release products are not rebuilt by the publisher.

## Technical Context

**Language/Version**: Existing Node 24.11.0 maintainer scripts, Python 3.12 archive validation and Rust/Tauri products.

**Primary Dependencies**: Existing GitHub release client/publisher, documentation gates, qualification/receipt validators, Next.js documentation export and Playwright acceptance.

**Storage**: Immutable Actions artifacts, GitHub release assets/canonical record, deployed Pages output, ignored local evidence and committed internal slice planning.

**Testing**: `npm run check`, `npm test`, `npm run check:docs`; existing main native/package/site qualification; release workflow gates; public hash readback; fresh post-publication recipient campaigns and original retained-operand replay.

**Target Platform**: Covered Windows x86_64, Ubuntu 24.04 x86_64 and macOS Apple Silicon rows. All actual installation/desktop acceptance stays hosted.

**Project Type**: Operational publication slice over the existing desktop product and static documentation site.

**Performance Goals**: Existing 660-second advisory qualification target, 900-second hard limit and fifteen-second finalization reserve, using terminal timestamps and separate preparation/qualification/combined accounting.

**Constraints**: Exact accepted bytes; freeze the successfully elected source through publication/live/recipient verification. The initial failed f9bd source cannot authorize publication. The prerequisite CI repair follows the normal owner merge boundary. No local GUI/installers, signing or attended runtime gate. Canonical archives retain 4-GiB/300-second bounds; supporting archives retain 5-GiB/600-second bounds inside the existing global deadline. Expanded extraction remains bounded at 5 GiB.

**Scale/Scope**: One release, six product assets, one corresponding-source asset, canonical metadata, four documentation versions and three actual recipient platform observations.

## Constitution Check

Pre-research and post-design gates pass: explicit scope/authorization; existing architecture and publication controls reused; no new product restrictions; source/build, qualification, publication, public bytes and actual recipients remain distinct. UTF-8/LF and repository checks are mandatory. Main qualification and runtime acceptance remain hosted. No ambiguity requires an owner decision.

## Phase 0: Research

Two read-only research agents audited publication controls and public/recipient acceptance. Findings are consolidated in [research.md](research.md). The installed release workflow is sufficient. Adapt old acceptance helpers only for current versions, run IDs, exact artifact selection and clean renderer-root binding. Do not substitute their historical receipts.

## Phase 1: Design and Execution

1. Specify/clarify requirements and maintain the author quality checklist. Reuse the established release contract instead of introducing an additional reviewer approval checklist.
2. Complete tasks and blocking read-only analysis before any publication mutation.
3. Repair demonstrated Windows stale-packet selection with a current-cohort selector and exact artifact-ID downloads; test it against retained-old and fresh-current packets. Complete applicable CI and at most two hosted review rounds, then hand the concrete repair PR to the owner for merge. Observe fresh terminal-successful push-main qualification afterward, retain its original accepted envelope, verify all canonical receipts and exact supporting Windows operands, and confirm current main/predecessor state.
4. Dispatch `release.yml` on unchanged remote main with the elected run, version 0.2.1, predecessor 0.2.0, empty initial recovery run and concise MSI/storage/maintenance highlights. The established publisher performs both gates and exact reassembly without rebuilding accepted assets.
5. Observe release and Pages completion. Preserve original execution journals and both documentation gate exports. On failure, inspect actual remote state before using same-candidate recovery.
6. Independently resolve public canonical metadata, stream/hash every product/source asset and replay original documentation exports against the clean elected source. Use a clean primary checkout as renderer/base, not a changed local planning branch.
7. Dispatch a new `ci.yml` run on unchanged main after promotion. It may build diagnostic test products; those never replace published assets. Extract each actual `preparedRecipient`, bind its downloaded canonical candidate/version/name/hash to the published release and replay original archive/screenshot evidence. Do not compare this new run's top-level diagnostic candidate ID with the published candidate ID.
8. Verify live deployment/latest/navigation/downloads, preserve historical inventories, complete local planning checks, retain chronological evidence, commit operational closeout and update #100/Project. Any bookkeeping publication follows completed release verification and does not amend shipped assets.

## Project Structure

### Documentation (this feature)

```text
specs/032-v021-publication/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/publication.md
  checklists/requirements.md
  tasks.md
  verification.md
  measurements.md
```

### Existing Source and Operational Evidence

```text
.github/workflows/release.yml
.github/workflows/ci.yml
scripts/release.mjs
scripts/release-inputs.mjs
scripts/github-release.mjs
scripts/release-publication.mjs
scripts/release-docs.mjs
scripts/prepared-recipients.mjs
.local/s032-*
```

**Structure Decision**: Reuse release/qualification code and keep execution/planning separate from the elected main source. Public documentation receives no numbered planning links.

## Complexity Tracking

No constitutional violations or new architecture are required. Existing publication safeguards, byte bounds and timing policy remain intact. A demonstrated defect must be diagnosed and fixed proportionally with its affected checks; it is never hidden as operational success.

## 2026-11-06: prerequisite repair design

The gate's wait loop previously chose any digest-bearing same-name worker archive. On a rerun, an earlier failed lifecycle packet satisfied that lookup and caused missing-fragment failure before current workers completed. Extract a pure selector into scripts/windows-package-cohort.mjs that binds the current clock, requires an artifact created after shared readiness and before its active deadline, and preserves provider identity/provenance. The wait step exports the selected ID through GITHUB_OUTPUT; ci.yml downloads that ID rather than resolving the name a second time. Retain all prior artifacts. Existing final source/build/clock/receipt/byte validation and deadlines remain mandatory.

Rejected alternatives: another blind rerun repeats the defect; gate-only rerun changes the provider attempt and lacks matching readiness markers; deleting old diagnostics erases history; manual CI dispatch is not push-main publication authority. No documented same-SHA ref update guarantees a new push event. The repair is required before publication, so the original elected-run assumption is retired rather than weakening its guard.
