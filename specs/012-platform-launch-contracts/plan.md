# Implementation Plan: Full/Lite Platform and Launch Contracts

**Branch**: `codex/012-platform-launch-contracts` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: S012, GitHub#5/#7. All14 functional requirements and6 success criteria are mandatory.

## Summary

Settle initial Full/Lite platform/package/prerequisite decisions through normal native proof archives and implement shared launch/result contracts. Keep current browsing/state behavior. Compile edition identity, resolve exact external roots, provide finite capability/results and bounded explicit detach, and elect Windows/Linux/macOS proof CI. Final installers/jobs/releases remain their existing issues.

## Technical Context

**Language/Version**: Rust1.96.0, edition2024; Node24.11 proof runtime (maintainer only), TypeScript5.9.3, Python3.12 maintainer.
**Primary Dependencies**: pinned Tauri2.12.5/Wry0.57/Tao0.37; existing native core, serde, UUID, SQLite and frontend; no CLI framework or single-instance plugin.
**Storage**: existing owned user/portable settings/history unchanged; proof outputs only application-owned .local/CI artifacts. No new gallery writes or startup receipt files.
**Testing**: Rust unit/property-boundary tests, Node schema/proof tests, extracted normal artifact acceptance, complete Windows WebView suite plus thin Full/Lite native tests, hosted native proof matrix.
**Target Platform**: Windows/Linux/macOS retained; elected proof hosts Windows x64, Ubuntu24.04 x64, macOS15 arm64. Other combinations explicitly unqualified.
**Project Type**: desktop application and native CLI contract, with independent documentation site.
**Performance Goals**: detach absolute30s acknowledgement budget, bounded receipt bytes/read/admission; no throughput or new memory promise.
**Constraints**: Windows hidden/noninteractive console children; source integrity; exact paths/values; no sender profile/toolchain/browser requirement;660s qualification target/900s hard/15s reserve after preparation, timings separate.
**Scale/Scope**: two issues, three stories, two editions, three elected proof OS/architecture pairs, one shared parser/result layer. No installer/job provider or release publication.

## Constitution Check

Pre-research PASS: owner scope preserved, no arbitrary Lite limits; implementation proportional to shared contracts; governed brand bytes unchanged; truthful proof/browsing/install evidence; explicit push/PR authorization and owner merge boundary.

Post-design PASS: research resolves all unknowns; native proof and prerequisites separate from broad support; exact native path codec reused; existing root/session authority retained; no unrelated framework, telemetry or feature restriction. All14FR/6SC must map to tasks and analyze gate before implementation.

## Project Structure

- apps/gallery/src-tauri/src/launch.rs: parser, edition, placement, result mapping and bounded process receipt.
- apps/gallery/src-tauri/src/main.rs: early finite dispatch, shared startup, main-window operation_result and attributable GUI failure.
- crates/gallery-core/src/: shared exact native-path representation and additive snapshot/discovery attribution.
- schemas/v0.0.0/: owned result/path/platform contracts and canonical platform-matrix.json; examples.
- scripts/: proof inventory/assembly/extracted acceptance, CI and qualification integration.
- .github/workflows/ci.yml: native Ubuntu/macOS proof matrix and deployment dependencies; existing pinned action references retained.
- tests/: result/platform/footprint contract and adversarial proof inventory tests; native Rust and Windows rendered regressions.
- docs/v0.0.0/: self-contained platform/launch/state/verification contracts; CHANGELOG.md dated architecture decisions.
- specs/012-platform-launch-contracts/: normative spec/research/plan/contracts/data-model/quickstart and internal tasks/verification/measurements receipts.

**Structure Decision**: extend existing native app and core; no parallel application, global broker, new service or command framework. Public platform JSON is shared by native capabilities and documentation, with schema/tests preventing drift.

## Verification Election

Prepare/export frontend/site and fixtures, build default Full/native-test Full and Lite/normal Lite separately, assemble proof archives, prepare Rust checks, then mandatory repository tests/docs/app/site/browser/native/normal/extracted proof/integrity steps. Hosted existing scopes remain; add native Linux/macOS proof checks and Windows proof acceptance, all required before deployment. Receipts bind source/artifact/revision, retain failure attribution and separate prep/qualification/combined time. Receipt-only tasks/verification/measurements may be excluded; normative artifacts remain hashed.

## Complexity Tracking

No constitution violations. A bounded one-shot startup channel is necessary to distinguish actual native/UI startup from process spawn and avoid unbounded pipe-reader lifetime. It adds no gallery access or remote control authority.
