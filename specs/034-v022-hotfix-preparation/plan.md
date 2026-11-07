# Implementation Plan: v0.2.2 hotfix release preparation

**Branch**: codex/s034-v022-hotfix-preparation | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: S034 / #108; automatic PR push and at most two hosted reviews, ending at owner merge.

## Summary

Prepare the merged installer repair as 0.2.2 without modifying published 0.2.1. Add ordinary full-UI proof from both published 0.2.0 and 0.2.1, preserve their distinct authorization paths, and retain complete versioned documentation/schema history and all existing qualification checks.

## Technical Context

**Language/Version**: Existing Node 24.11.0, Python 3.12, Rust/Tauri and Next.js/Fumadocs/Shiki. Product becomes 0.2.2; no toolchain or dependency election changes.

**Primary Dependencies**: Existing product-version, release/snapshot tooling, Windows Installer/native observer, canonical release parser and source/artifact validation. API/service choices remain unchanged.

**Storage**: New docs/v0.2.2, schemas/v0.2.2, site/snapshots/v0.2.2 and site/retained/v0.2.2.json; existing source manifests/locks; internal specs/034-v022-hotfix-preparation; original isolated CI evidence.

**Testing**: Published-history inventory, current version/schema compatibility, legacy and modern ordinary-upgrade evidence refusal cases, cohort transfer and original-byte readback; npm check/tests/docs and affected app/site checks; complete hosted native/package/aggregate qualification.

**Target Platform**: Existing Windows x86_64, Ubuntu 24.04 x86_64 and macOS 15 arm64, Full/Lite. Windows installer/GUI execution remains isolated in hosted CI.

**Project Type**: Existing desktop product and release pipeline.

**Performance Goals**: Unchanged 660-second advisory target, 900-second hard limit and fifteen-second provisional finalization reserve. Both sequential ordinary upgrades share the existing experience-worker/cohort clock; readiness preparation and all terminal accounting remain separate.

**Constraints**: No owner installation/GUI/policy changes, publication/tag/merge, public latest promotion, historical byte changes or unrelated dependency/UI/legacy-path work. No extra hosted review beyond one optional follow-up to the automatic initial round.

**Scale/Scope**: Six public products, eight canonical upstream scopes plus aggregate validation, both supporting Windows worker packets, two ordinary published predecessor versions, complete retained documentation history.

## Constitution Check

Pre-research PASS: Explicit owner scope governs automatic push and official PR; the final merge/publication boundary remains. Existing product/runtime/brand contracts and all qualification checks are retained; published bytes remain immutable and no attended owner gate is invented.

Post-design PASS: New ordinary coverage generalizes the current routine rather than duplicating it. Legacy advanced recovery remains limited to its established 0.1.0/0.2.0 inputs. New versioned copies preserve every published source/snapshot, and final runtime evidence is recorded in the PR without a post-green source mutation.

## Research and design decisions

1. Align VERSION, product package/workspace/native metadata and owned lock entries to 0.2.2. Leave the independent website package version and all dependency versions unchanged.
2. Copy published 0.2.1 documentation/schema/reference trees to new 0.2.2 paths. Correct inherited schema-version wording only in the new chapter. Append 0.2.2 to the portable settings compatibility enum instead of replacing accepted historical versions.
3. Add a v0.2.1 preservation inventory before editing, covering documents, schemas, captured references, retained receipt and manifest entry. Keep authored manifest.latest and canonical public release selection unchanged.
4. Pin the exact published 0.2.1 canonical record and direct MSI during isolated readiness. Audit native identities, create an administrative extraction image in disposable storage, verify its payload inventory/source, and preserve the original MSI for actual installation. Administrative extraction is not upgrade acceptance.
5. Keep publishedPredecessors for existing advanced recovery unchanged. Add ordinaryPredecessors for exact 0.2.0 and 0.2.1. Generalize ordinaryUpgradeCampaign(prior) sequentially, explicitly install modern predecessor machine scope, query its own generation ProductCode and retain per-version cancellation/refusal/success and installed-launch observations.
6. Preserve legacy limited-to-full child/source/terminal assertions for 0.2.0. For 0.2.1 require the actual limited native wizard identity and standard MSI transaction outcome, without demanding an inapplicable legacy handoff or elevated UI child. Shared policy/private/log/frame/data/native identity assertions remain mandatory. Keep historical singular evidence readable; new 0.2.2 evidence must contain exactly both predecessors and both installed launches.
7. Commit source A before exact committed-source vocabulary review/snapshot capture in a fresh destination. Copy only the new retained 0.2.2 receipt, finalize pre-CI records, commit source B and push/open the official PR. Record final CI/review/readback measurements in the PR and ignored evidence, avoiding a documentation-only post-green CI loop.
8. The automatic hosted review is round one. Use at most one follow-up after any actual fixes settle; never include literal trigger strings in ordinary evidence. Reply to and resolve all findings. Publication subsequently requires a successful exact main run after owner merge, with accepted bytes unchanged.

## Project Structure

### Documentation (this feature)

specs/034-v022-hotfix-preparation contains spec, plan, research, data-model, contracts/publication-handoff.md, quickstart, tasks, author checklist and verification/measurements.

### Source Code (repository root)

- VERSION, package.json/package-lock.json, apps/gallery metadata, native tauri.conf.json, Cargo.toml/Cargo.lock: owned version alignment.
- docs/v0.2.2, schemas/v0.2.2, site/versions.json, new captured references and retained receipt: new complete snapshot, no published edits.
- README.md, SECURITY.md, CHANGELOG.md: current candidate/support/short hotfix descriptions.
- scripts/build-windows-packages.mjs: pinned direct-MSI ordinary predecessor readiness; existing legacy recovery inputs remain unchanged.
- scripts/test-windows-packages.mjs, windows-package-evidence.mjs, windows-package-cohort.mjs and .github/workflows/ci.yml: both ordinary campaigns, strict version/mode-specific proof and original nested evidence retention.
- tests/msi-upgrade-evidence.test.mjs, windows-package-cohort.test.mjs, initial-release.test.mjs and tests/fixtures/releases/v021-inventory.json: positive/negative coverage and immutable history.
- scripts/provenance.mjs: only the established three S034 progress-file exclusions.

**Structure Decision**: Reuse existing version/snapshot and native proof machinery; add no parallel publisher, stack or consumer workflow.

## Execution Order

Specify/clarify/author checklist -> research/design -> tasks -> blocking read-only analysis -> failing version/history/upgrade regressions -> versioned copies and shared campaign updates -> local parity -> source A/current snapshot/source B -> official PR -> complete final-head CI and at most two hosted reviews -> original evidence and owner merge handoff.
