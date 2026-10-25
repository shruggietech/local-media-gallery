# Implementation Plan: S011 Measured Adaptive Loading

**Branch**: `codex/011-measured-adaptive-loading` | **Date**: 2026-10-25 | **Spec**: [spec](spec.md)

**Input**: specs/011-measured-adaptive-loading/spec.md; issues #16/#17.

## Summary

Measure the unchanged native baseline, then implement finite automatic media policy with persisted manual override and unchanged navigation/playback contracts.

## Technical Context

**Language/Version**: Rust pinned toolchain, TypeScript5.9.3, Node24 maintainer tooling.
**Primary Dependencies**: Existing Tauri2/Next static gallery and native private test driver, no new dependency planned.
**Storage**: Existing sparse native settings; session observations remain memory-only.
**Testing**: Node deterministic tests, Rust settings/resolver tests, Windows native WebView, repository/site/normal-artifact qualification.
**Target Platform**: Windows initial native evidence; all three product OS targets retained.
**Project Type**: Local native desktop gallery with independent docs website.
**Performance Goals**: Evidence-based proposed responsiveness thresholds, not a scale guarantee.
**Constraints**: No bulk gate, no background scans, one discovery and one metadata native admission, gallery admission never exceeds existing four, zero background gallery probes focused, source/brand bytes unchanged.
**Scale/Scope**: Small representative native fixtures, 24/48/96 display choices unchanged, #16/#17 only.
**Resolved research**: Three read-only agents completed; see research.md. Native baseline measurement is the ordered prerequisite to numerical tuning.

## Constitution Check

Pre-research: PASS. Owner scope and explicit push/PR authorization identified; no merge/release authorization. Existing stack retained. Source/brand integrity, finite resource contracts, truthful native/hosted/cache/footprint distinctions elected. No source implementation before analyzed design. No new runtime dependencies or product eligibility rules. Research delegation required by installed plan Phase0 only; no implementation agents.

## Project Structure

### Documentation (this feature)

spec.md, plan.md, research.md, data-model.md, contracts/loading.md, quickstart.md, tasks.md, verification.md and requirements/performance checklists remain under specs/011-measured-adaptive-loading/.

### Source Code (repository root)

- apps/gallery/src/lib/admission.ts and new loading-policy.ts: pure bounded policy/queue; tests/view.test.mjs and loading tests.
- apps/gallery/src/app/gallery.tsx: session policy, demand/visibility/frame wiring, source cleanup and governed selector.
- apps/gallery/src/lib/types.ts, use-gallery-state.ts, state-controls.tsx: existing preference boundaries.
- apps/gallery/src-tauri/src/settings.rs and gallery_state.rs: enum/default and full precedence coverage.
- crates/gallery-core and native host: resource count observations only where necessary, keeping existing permits/authority.
- scripts/measure-native.mjs and measure-processes.ps1: shared native baseline/final evidence; scripts/test-native.mjs and qualify.mjs: elected final acceptance.
- schemas/v0.0.0 and tests/contracts.test.mjs: compatible known field and measurement/resource contracts where exposed.
- docs/v0.0.0, CHANGELOG.md: settled authoritative contracts and dated decisions. Internal reports under this feature with local raw artifacts ignored.

**Structure Decision**: Extend existing core/host/UI/maintainer boundaries; no new project, framework or runtime dependency.

## Implementation sequencing

1. Write meaningful failing measurement-report contract tests, add shared harness, run unchanged baseline and record actual thresholds/rationale before adaptive code.
2. Write failing policy/queue lifecycle regressions, implement bounded controller and robust queue.
3. Write failing persisted-field/schema tests, integrate preference and native resources as required.
4. Wire session-scoped UI without changing media identity; prove rendered behavior, all destinations and relocation.
5. Update docs/contracts, run elected qualification with final measurement, preserve separate timing/source evidence, commit/push/PR and handle at most two review requests.

## Constitution Check after design

PASS. Exact #16/#17 scope, no bulk gate or new publication beyond explicit PR authority. Baseline versus final, native versus hosted, actual versus proxy resources and unavailable distributions remain explicit. Existing brand components/tokens suffice. Test-first security/lifetime/integrity regressions retained. No complexity exception required.
