# Implementation Plan: First working local gallery

**Branch**: main | **Slice**: S002 | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

## Summary

Build the owner-authorized local browsing loop with a Rust gallery core, Tauri shell and static Next.js interface. Deliver readonly session-scoped native streaming, current directory discovery, sorting/filtering, aspect-aware media, item information and accessible recovery. Use the pinned brand. Verify on Windows with a small fixture; keep all work local.

## Technical context

**Language/version**: Rust 1.96.0, TypeScript 5.9.3, Node 24+ (current 26.5.0).

**Primary dependencies**: Tauri 2.12.5, dialog 2.8.3, Axum 0.8.9, Tokio 1.54.1, cap-std/cap-fs-ext 4.0.3, UUID 1.28.0, Next.js 16.4.2, React 19.3.1, exact radix-ui 1.6.7, optional native WebDriver plugin 1.5.0. Pin manifests/locks.

**Storage**: Readonly roots; in-memory sessions. No settings/database/source writes.

**Testing**: Rust core/transport tests, Node view/contract tests, TS/build/brand checks, actual native WebView2 automation and provenance/schema/integrity checks.

**Target/platform/type**: Windows x64 native acceptance on the current host; Linux/macOS retained but native runtime checks deferred. Local desktop application.

**Performance/scope**: Settled small-fixture mutations within five seconds, finite admitted scans/streams and viewport media. Twelve candidates plus boundaries; no 1,000-image test or scale/package performance claim.

**Constraints**: Bundled static UI, no recipient Node/browser choice, no Electron, hidden noninteractive console helpers, unchanged governed brand bytes and no remote/push/tag/release.

## Constitution check

Pre-design PASS: named S002 directory and main branch agree; owner explicitly authorizes local autopilot and routine decisions. Windows-first validation is owner-selected. No deferred product contract is removed.

Post-design PASS: source access is handle-relative/readonly, sessions/streams retire, brand stays immutable, exact native evidence is separate from source/browser results and publication remains absent. Version 0.0.0 is shared by runtime/docs/schema. No exception is needed.

## Project structure

- Cargo.toml and rust-toolchain.toml define the native workspace/toolchain.
- crates/gallery-core/ owns discovery, sessions, resource grants, streaming and core/transport tests.
- apps/gallery/ contains private Next.js UI, view logic and src-tauri/ native shell.
- schemas/v0.0.0/ contains the version-aligned master runtime schema.
- scripts/ contains hidden process tooling, exact asset staging/brand validation, small fixtures, native acceptance and qualification.
- tests/ contains maintainer, pure view and contract checks.
- This feature directory contains research, data model, contracts, quickstart, tasks, analysis and evidence.

## Phases and dependencies

1. After the analysis gate, set up manifests, generated-output ignores and hidden maintainer commands.
2. Write red root/access/range tests, then implement core discovery and streaming.
3. Write red view tests, then implement the branded UI and native shell.
4. Finish observation freshness, cancellation, errors and keyboard/focus/media lifecycle.
5. Stage exact assets, recover/validate the brand in an ignored temporary copy, generate only the small fixture and prewarm verified prerequisites.
6. Qualify final source with functional/integrity/provenance/elected checks, actual playback/seek/mutation/relocation and normal-build automation exclusion. Apply the 660/900-second policy after readiness and preserve the fifteen-second reserve.
7. Update docs/tasks/evidence, validate final text/staging and commit on local main.

## Decision log and risks

[Research](research.md) records alternatives. Adopt D-02 through D-14 under autopilot. A loopback-only native media endpoint streams originals without JSON buffering or network gallery hosting. Capability handles enforce the selected root at open time. AppFrame owns web insets/scrolling, with a normal native titlebar; ratio geometry is product input, not invented brand spacing.

[Data model](data-model.md) and [native contract](contracts/native.md) define identities, lossless values, stale-result rejection and versioning. [Quickstart](quickstart.md) describes local validation.

Actual codecs, chooser and media transport need native evidence; missing checks must be explicit. Linux/macOS runtime, installers/dependency closure, persistent settings, sidecars, thumbnails, editing and website work remain outside this slice. A plan/build pass cannot substitute for those claims.
