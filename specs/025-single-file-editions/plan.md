# Implementation Plan: Single-file editions

**Branch**: `codex/s025-single-file-editions` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

## Summary

Complete #80 with six directly delivered artifacts: native Lite executable and offline system Full installer on Windows x86_64, Ubuntu24.04 x86_64 and macOS15 arm64. Preserve native ownership/lifecycle logic internally, coordinate source/docs/schema0.2.0, release projections and gallery preparation, and qualify actual files.

## Technical Context

**Language/Version**: Pinned repository Rust toolchain, Node24.11, Python3.12; existing Tauri/Next frontend.

**Primary Dependencies**: Native OS webviews; Windows offline WebView2; Ubuntu GTK/WebKit/GStreamer package closure; OS WKWebView; deliberately built FFmpeg CLI.

**Storage**: Embedded executable metadata, managed system installation and private update state; existing gallery data boundaries.

**Testing**: Node contract/negative tests, Rust ownership/update/preparation tests, native isolated package campaigns and source-bound readback.

**Target Platform**: Three elected platform/architecture rows, six deliverables; no new architecture claims.

**Project Type**: Native desktop product with static documentation/download site.

**Performance Goals**: Existing functional acceptance and qualification accounting; package preparation separate from660s target/900s hard limit.

**Constraints**: One-file distribution; Full offline with prerequisite absence; no workstation GUI use, no signing; historical release bytes immutable.

## Constitution Check

Pre-research: PASS. Scope follows explicit owner correction; no product narrowing. Existing feature branch model and push/PR authorization apply; merge/publication stay owner-controlled. Checks include repository, tests, affected product/site and all elected native checks.

Post-design: PASS for design. Native feasibility and dependency inventory remain implementation acceptance tasks, not claimed proven outcomes. Any demonstrated requirement conflict returns to owner before a fallback.

## Project Structure

- specs/025-single-file-editions/: spec, plan, research, data model, contracts, quickstart, tasks and analysis/verification evidence.
- apps/gallery/src-tauri/: embedded notices/metadata, installed helper discovery and launch behavior.
- crates/windows-package/, crates/macos-package/, crates/gallery-update/: embedded installer and ordinary maintenance facades preserving ownership.
- crates/gallery-preparation/: version-aware direct Lite consumption.
- scripts/build-*-packages.mjs, scripts/*-packages.mjs, scripts/test-*-packages.mjs: six artifacts, dependency assembly and actual-file acceptance.
- scripts/release-*.mjs, schemas/v0.2.0/, site/: new product forms and two-choice projections while reading historical records.
- docs/v0.2.0/, CHANGELOG.md: current authoritative distribution behavior and decisions.

## Implementation sequence

1. Establish native Lite feasibility and single-file metadata/integrity contracts with negative tests.
2. Deliver Lite and all consumer compatibility, preserving historical0.1 paths.
3. Deliver each Full installer and its bundled dependency closure, then ordinary maintenance and automatic feature helper selection.
4. Run repository/product/site parity and isolated native copy-only/offline lifecycle checks, resolve findings, push/open PR and handle no more than two review rounds.

## Complexity Tracking

No governance exception. Native dependency packaging is necessary for the literal owner requirement; retain standard OS installers rather than replace platform lifecycle semantics.
