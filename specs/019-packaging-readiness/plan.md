# Implementation Plan: Packaging readiness and no-signing policy

**Branch**: `codex/s019-packaging-readiness` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

## Summary

Complete #69/#70 and consolidate PR #68. Establish the full locked Cargo source graph before expensive builds, retain target-filtered offline notices, remove project signing actions and signature-resource gates, preserve native outputs and all existing integrity/native checks, and qualify one exact source through eight hosted scopes.

## Technical Context

**Language/Version**: Existing Node24.11, Rust1.96, Python3.12 maintainer tools; unchanged product architecture.

**Primary Dependencies**: Cargo locked graph and existing notice collector; platform package managers/native WebViews; parser8.72.1 and lucide-react1.62.0 compatible refresh.

**Storage**: Existing ignored .local evidence; one owned temporary fresh Cargo home/target for the cold witness. No new product state.

**Testing**: Negative graph/notice/manifest/payload/policy regressions, actual hosted fresh/partial-registry witness, existing Full/Lite lifecycle/native/package/site matrix and independent readback.

**Target Platform**: Existing Windows2025 x86_64, Ubuntu24.04 x86_64/X11 and macOS15 arm64.

**Project Type**: Native application packaging and maintainer workflow.

**Performance Goals**:660s qualification target,900s hard limit,15s reserve; dependency acquisition and cold witness are preparation with separate elapsed accounting.

**Constraints**: No local GUI/input, no project signing/notarization action or credential gate, no platform reduction, no notice omission, no paid cache increase or product release.

**Scale/Scope**: Two issues, one compatible dependency PR, shared small readiness helper, one genuine Linux cold witness and the unchanged eight-scope matrix.

## Constitution Check

| Principle | Before research | After design |
| --- | --- | --- |
| I Owner scope | Pass: approved #69/#70/#68 | Pass: no signing gate or platform drop |
| II Proportion | Pass: existing core/contracts | Pass: one shared fetch/offline helper, extracted existing collector, no new updater/framework |
| III Integrity | Pass: pinned source/brand | Pass: complete graph/notices/file authority; governed kit unchanged |
| IV Verification | Pass: isolated native evidence | Pass: real cold/partial graph and all existing native checks; local hidden tooling |
| V Publication | Pass: explicit push/PR authorization | Pass: at most two reviews, owner merge, no product release |

## Project Structure

- scripts/cargo-readiness.mjs: shared bounded hidden/noninteractive locked fetch and native-target offline metadata, unchanged-lock validation and actual graph identity. No persisted receipt gate.
- scripts/dependency-notices.mjs: extract existing Rust notice collection and source-completeness checks; shared by build-proof and real cold witness. Keep target notice scope unchanged.
- scripts/test-cargo-readiness.mjs: real workspace fresh Cargo home/empty target witness, exact missing-tempfile repair and production notice readback.
- scripts/prepare.mjs, platform builders and ci-{windows,macos}-packages.mjs: call readiness before test/export/release compilation. ci-linux-packages.mjs runs the cold witness during preparation and retains its receipt. build-proof.mjs keeps offline metadata and uses the extracted collector.
- scripts/build-macos-packages.mjs, macos-packages.mjs, test-macos-packages.mjs, crates/macos-package/src/{lib,main}.rs: remove explicit codesign calls and mandatory CodeResources; preserve complete inventories, physical ownership, lifecycle and actual identity probes. Keep quarantine assessment as an actual observation, independent of project credentials.
- scripts/package-lock-consistency.mjs and scripts/check.mjs: enforce declared dependency specifications against lock workspace entries; normalize PR #68's exact Lucide pin.
- .github/workflows/ci.yml: same actions, paths, scopes, fallbacks and compiler validation; export sourceIdentity with image identity and use source digest instead of per-commit cache suffix. Retain cold/failed evidence; never skip qualification on cache hits.
- tests/cargo-readiness.test.mjs, macos-packages.test.mjs, packaging-policy.test.mjs and dependency-lock.test.mjs: contract/readiness/integrity regressions.
- docs/v0.0.0/{installation-and-distribution,verification-and-compatibility}.md, platform-matrix.json, CONTRIBUTING.md, release-note template and CHANGELOG.md: current owner policy and plain test-status wording. Preserve historical records.
- scripts/provenance.mjs: register only the established three S019 progress records (tasks,verification,measurements) before qualification; all implementation/design inputs stay included.

**Structure Decision**: Reuse existing native/package/integrity tooling. Cargo acquisition is a preparation step, while offline metadata/notices remain verification of available exact inputs.

## Decisions and implementation strategy

1. Run cargo fetch --locked without a target filter, then unchanged native-target offline metadata. Cargo1.96 actual metadata behavior is authoritative; the broader fetch does not expand notice selection. Verify lock bytes and all referenced source manifests.
2. Place shared readiness before expensive builds in common preparation, package CI and direct builders. Missing source directories fail notice assembly instead of silently disappearing.
3. The Linux preparation witness uses a genuinely empty owned Cargo home and target directory, proves initial offline failure, prepares/copies actual notices, removes only the fresh-home tempfile3.27.0 archive/source under verified confinement, proves the exact partial-store failure, repairs and compares graph/notices. No Rust compilation is needed by this graph witness; the normal actual package/native campaign still follows.
4. Remove every explicit project codesign action/inspection from current Mac tooling. Ordinary arm64 linker loader metadata is retained and may be observed through existing load-command output; it is neither publisher identity nor payload authority. No strip/no_adhoc_codesign workaround and no credentials.
5. Require binary,Info.plist and actual inventoried files, not CodeResources. If a resource exists and is inventoried it is still hashed; do not introduce ignore rules. Keep negative mode/link/unlisted/foreign/missing checks and actual native launch.
6. Normalize PR #68 lock workspace declarations to exact manifest pins; retain unchanged unrelated dependencies.
7. Key immutable caches by existing qualified source digest while preserving path/version/fallback controls, so record-only commits do not duplicate caches. Cold correctness and all builds remain unconditional.
8. Run the blocking analysis before application edits, implement regressions before fixes, qualify locally headlessly and on isolated hosted desktops, publish official PR, complete capped reviews and stop for owner merge.

## Complexity Tracking

No constitution exception. The native linker metadata distinction is a demonstrated platform build detail, not project signing work or a release prerequisite.
