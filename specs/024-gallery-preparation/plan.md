# Implementation Plan: Guided gallery preparation

**Branch**: `codex/s024-gallery-preparation` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

## Summary

Complete #27 with a session-bound native guided coordinator and canonical published Lite acquisition. Fix #79 with expected-state Windows readiness, without extending its deadline. Keep standalone thumbnails, ordinary browsing and explicit Refresh available.

## Technical Context

**Language/Version**: Rust 2024 / 1.96, TypeScript/React, Node24 maintainer tooling.

**Primary Dependencies**: Existing Tauri, gallery-core thumbnail service, cap-std and portable settings; native HTTPS plus ZIP/tar.gz readers for recipient artifacts.

**Storage**: Gallery-local settings, portable thumbnail cache and separately inventoried recipient bundles plus root entrypoints. Original media remain untouched.

**Testing**: Node regression suite, Rust acquisition/coordinator tests, frontend checks, isolated native package campaigns on all three elected hosts.

**Target Platform**: Windows x86_64, Ubuntu24.04 x86_64/X11, macOS15 arm64.

**Project Type**: Desktop application with finite CLI.

**Performance Goals**: Existing660-second qualification target,900-second hard limit and15-second finalization reserve. Downloads/extraction report bounded progress and honor cancellation.

**Constraints**: No local focus-taking GUI. No sender compiler/runtime installation. No modifications to shipped0.1 documentation or release assets. No release/tag publication or merge in this slice.

**Scale/Scope**: Three published recipient platforms, independent optional presentation/cache/launcher choices, one active guided job per application.

## Constitution Check

Pre-research and post-design gates pass: owner scope preserved; proportionate native implementation; governed controls/tokens retained; UTF8/LF checks required; exact-head native evidence required; push/PR authorized, merge/publication withheld. New software/docs/schema0.2.0 remain unreleased; published0.1 recipient settings retain compatible format identity.

## Project Structure

- `crates/gallery-preparation/`: canonical record reader, download/integrity, bounded extraction, inventory/collision/reuse and complete bundle staging.
- `apps/gallery/src-tauri/src/guided.rs`: session/revision-bound orchestration, presentation and thumbnail integration, per-action results and lifecycle cancellation.
- `apps/gallery/src/lib/guided-preparation.tsx`: governed choice/preview/progress interface.
- `scripts/native-driver-lifecycle.mjs`, `scripts/test-windows-packages.mjs`: expected presentation readiness and retained failure context.
- `docs/v0.2.0/`, `schemas/v0.2.0/`, `site/versions.json`: unreleased contracts and retained snapshots.
- `specs/024-gallery-preparation/`: specification, research, models, contracts, tasks, verification and timing.

## Implementation sequence

1. Complete planning and blocking consistency analysis.
2. Correct expected-state readiness and its deterministic regression.
3. Implement canonical recipient staging/inventory and meaningful negative tests.
4. Integrate guided coordinator/UI and optional portable presentation/thumbnails.
5. Align unreleased version/docs/schema and preserve0.1 compatibility.
6. Run local required checks, push/open PR, qualify every native host and resolve at most two review rounds.
7. Independently read back retained candidate bytes and terminal checks, then request owner final review/merge.

## Complexity Tracking

Complete published bundles stay in separate platform folders because generic support names overlap. Windows uses a byte-identical root executable copy, macOS a complete root app copy, and Linux a relative shell entrypoint passing the gallery root explicitly. This preserves original bundle structure/auxiliary payloads and relocation while avoiding recipient source compilation; preview includes duplicated entrypoint storage.
