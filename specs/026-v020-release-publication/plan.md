# Implementation Plan: v0.2.0 release preparation

**Branch**: `codex/s026-v020-release-publication` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Owner-directed S026 and #83.

## Summary

Finalize release-ready current0.2.0 descriptions, changelog and handoff using existing publication controls. Preserve every historical0.0.0/0.1.0 byte and public v0.1.0 asset. Refresh the unpublished current snapshot through a source-A/capture-B sequence, run existing applicable qualification, independently read back final artifacts/site/native evidence, then finish the reviewed PR for owner merge.

## Technical Context

**Language/Version**: Existing pinned Node24.11.0, Python3.12, Rust/Tauri and Next.js/Fumadocs/Shiki. No upgrades.

**Primary Dependencies**: Existing snapshot, release, provenance and GitHub Actions tooling; locked npm/Cargo/Python dependencies unchanged.

**Storage**: Current docs/v0.2.0, CHANGELOG.md, README.md, site/retained/v0.2.0.json; fixed historical test fixture and S026 planning/evidence. Native originals remain in ignored .local and hosted artifacts.

**Testing**: Historical preservation regression, existing actual-current receipt freshness regression, npm run check, npm test, check:docs, production build/check/test:site, actual candidate-doc/control-publication gates, all nine hosted scopes and complete independent readback.

**Target Platform**: Existing Windows x86_64, Ubuntu24.04 x86_64 and macOS15 aarch64, Full/Lite. No expanded runtime/host claims.

**Project Type**: Native desktop product, maintainer release tooling and static website.

**Performance Goals**: 660-second qualification target, 900-second hard limit, fifteen-second reserve; separate preparation/qualification/combined terminal accounting.

**Constraints**: No owner-desktop GUI/input/installers; no release/tag/promotion; no historical source/asset alteration; no signing or dependency/brand changes; at most two reviews; final owner merge boundary.

**Scale/Scope**: One prepared minor release, six literal products and corresponding source/metadata, existing three documentation snapshots, one issue and PR.

## Constitution Check

Pre-research PASS: I follows explicit preparation scope and owner merge, II uses proportional existing tooling, III preserves UTF8/LF and governed/history bytes, IV keeps evidence claims separate and requires native/site checks, V honors explicit push/PR authorization and stops before publication.

Post-design PASS: No unknown architecture choice remains. Only registered progress records are excluded from source identity. Historical fixture expectations are fixed from committed source, not derived anew during tests. Normal retainer and all source/native/gate checks remain strict. Reviewer-owned custom checklist status is retained without inventing a new approval request under authorized autopilot.

## Design decisions

1. Use neutral current-version product wording with canonical publication as availability authority. Move accumulated changes into an undated0.2.0 entry whose text explicitly does not announce publication; leave historical0.1.0 history intact. Release highlights name guided preparation, single-file editions and system-scope migration.
2. Correct demonstrated stale Full scope and future-feature wording only. Keep existing portable0.1.0 compatibility requirements and the eight canonical qualification scopes (release validation is a separate ninth job).
3. Extend existing preservation coverage using a fixed committed v0.1.0 inventory including its retained receipt and manifest entry. Reuse existing stale-current-receipt and gate regressions rather than mirror prose with string tests.
4. Commit source A before ordinary vocabulary review/current recapture into a new disposable destination. Replace only site/retained/v0.2.0.json, preserve capture provenance, then qualify final source B.
5. Use the normal official PR workflow and bounded reviews. Final progress/evidence may be recorded in registered evidence files/PR without altering accepted logical source. Actual future publication requires successful final merged-main qualification and retained exact assets without rebuild.

## Project Structure

### Documentation (this feature)

specs/026-v020-release-publication/ contains spec, plan, research, data-model, contracts/publication-handoff.md, quickstart, tasks, requirements/release checklists and verification/measurements.

### Source Code (repository root)

- README.md and CHANGELOG.md: accurate entry points, implemented release highlights and publication/migration context.
- docs/v0.2.0/{index,overview,installation-and-distribution,verification-and-compatibility}.md: corrected current contracts; any additional demonstrated stale statement is audited before modification.
- site/retained/v0.2.0.json: refreshed actual current snapshot and ordinary vocabulary receipt.
- tests/initial-release.test.mjs and tests/fixtures/releases/v010-inventory.json: fixed complete shipped-version preservation.
- scripts/provenance.mjs: exactly three S026 progress exclusions.

**Structure Decision**: Reuse existing modules and established snapshot/release workflows. No new production release service, runtime feature or package format.

## Execution order

Spec/clarification/checklist -> read-only research/design -> tasks/analyze -> baseline preservation and targeted regression -> current prose/changelog -> source A commit -> unpublished current snapshot capture/receipt B -> local verification -> final commit/push/PR -> exact-head native/site/integrated qualification and independent readback -> at most two review rounds -> final owner review/merge handoff. Future publication remains separately controlled.
