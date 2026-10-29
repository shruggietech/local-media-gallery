# Implementation Plan: Dependency closure and native qualification

**Branch**: `codex/s017-dependency-closure` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: S017, issues #64, #57 and #58.

## Summary

Make driver readiness attributable to its owned process, retain bounded native-media evidence, observe Linux output without mutating WebKit's media graph, adopt the authentic patched renderer contract and apply the exact upstream GLib iterator fix to the compatible 0.18 family.

## Technical Context

**Language/Version**: Node 24, Python 3.12, Rust 1.96, TypeScript 6.

**Primary Dependencies**: Current Tauri/GTK3/WebKitGTK and Next.js stack; Pillow 13 with formally delivered BrandBuilder 3.1.1; GLib 0.18.5 plus the exact upstream two-line fix.

**Storage**: Existing ignored qualification receipts, source-bound artifacts and governed brand integration lock; no new user data format.

**Testing**: Node real-process regressions, existing Python exact-image tests/recovered verifier, optimized Linux iterator integration, complete native/package/site CI.

**Target Platform**: Windows Server 2025 x64/WebView2, Ubuntu 24.04 x64/WebKitGTK, macOS 15 arm64/WKWebView, isolated CI desktops only.

**Project Type**: Desktop application with maintainer qualification and documentation site.

**Performance Goals**: Existing readiness deadlines (measurement 15 seconds), 660-second qualification target, 900-second hard limit and 15-second finalization reserve; bounded observation memory/output.

**Constraints**: Preserve original media, source identity, exact assets and every functional PCM/frame/trusted-input assertion. Native test identity hooks remain excluded from ordinary builds.

**Scale/Scope**: Three issues, existing small synthetic fixtures and Full/Lite platform/package matrix; no Linux installer implementation or release publication.

## Constitution Check

| Principle | Before research | After design |
| --- | --- | --- |
| Owner-directed scope | Pass: approved three issues | Pass: no new product restriction or platform replacement |
| Proportional implementation | Pass: bounded qualification/dependencies | Pass: reuse owned driver channel; narrow upstream backport |
| Data/delivery integrity | Pass: importer owns governed bytes | Pass: exact vendor provenance and image checks retained |
| Truthful verification | Pass: native evidence remains separate | Pass: source-bound final CI, missing observations reject |
| Publication boundary | Pass: explicit push/PR authorization | Pass: owner final merge, no release requested |

## Project Structure

### Documentation (this feature)

`specs/017-dependency-closure/`: specification, checklist, research, plan, data model, quickstart, tasks and verification. Internal evidence stays here; public documentation describes system contracts.

### Source Code (repository root)

- `scripts/native-driver-lifecycle.mjs`, native launch callers and `apps/gallery/src-tauri/src/qualification.rs`: nonce/PID proof through the native-test channel, bounded readiness/failure context, owned cleanup.
- `scripts/test-runtime.mjs`, `runtime-evidence.mjs`, `runtime-environment.mjs` and a focused Linux PCM capture module: source-bound PulseAudio sink/stream observations without inserting a media-element source into WebKit playback. Keep Windows/macOS existing observation methods.
- `brand/kit/**`, `brand/integration-lock.json` and `requirements-dev.txt`: official checksum-verified kit refresh through `sync-brand-kit.mjs`, exact recovery verifier and patched Pillow. Import the separate official canonical Windows proof set from the same upstream source through the extended importer, outside immutable kit bytes. Retain its exact offline inventory and verify it before/after recovered verification.
- `vendor/glib-0.18.5/**`, `Cargo.toml`, `Cargo.lock`, dedicated provenance checker and `crates/gallery-core/tests/glib_variant_iter.rs`: exact upstream backport, Linux-only dev integration and optimized test.
- `scripts/ci.mjs`, repository integrity/tests, documentation and `CHANGELOG.md`: mandatory optimized Linux test, vendor inventory verification, truthful runtime evidence and dated decisions.

**Structure Decision**: Extend the existing maintainer/native channels and platform pipeline. No replacement product architecture.

## Decisions and implementation gates

1. **2026-10-29, driver ownership**: A free-port probe and HTTP status alone do not prove ownership. Pass a fresh nonce only in the child environment and verify nonce/PID through the existing test-only native command after session establishment, within the same readiness deadline. Reject a responsive unrelated listener. Retain separate bounded stdout/stderr, exit/signal and trial/source/edition identity.
2. **2026-10-29, Linux PCM**: Use the isolated null sink monitor for the actual application audio stream. Preserve trusted playback, advancing media clock, changing decoded frames, tone RMS/frequency and silent-control thresholds. Bind sink and capture to the owned app and reject unrelated/missing output; never decode fixture bytes as a Linux playback substitute. Keep finite capture windows and bounded failure records.
3. **2026-10-29, brand**: The formal v3.1.1 kit arrived after the prior audit. Verify its exact recovery, supported renderer settings, pixel matrix and inventories before adoption. The upstream contract must actually pass with Pillow 13; a version bump or report rewrite cannot satisfy this gate. All imported governed bytes pass through the importer.
4. **2026-10-29, GLib**: The official 0.18 branch remains at 0.18.5. Vendor its exact crate with only upstream fix b5a4071e439bef2b5eea76c3aa25e5ae84839e34. Keep the real 0.18.5 version, licenses, exact inventory and patched file digest; do not replace GTK or inflate a version to silence alerts. Exempt this verified third-party subtree from authored-text normalization only after its dedicated integrity check exists.
5. **2026-10-29, review/publication**: One initial external review wave and, if necessary, one final wave. Resolve every finding, verify final SHA and terminal CI, stop before owner merge. Default-branch alert closure is a post-merge observation, not a pre-merge claim.

## Phases

1. Establish failing headless regressions and retained prior native evidence.
2. Implement owned readiness and bounded diagnostics, then native PCM observation correction.
3. Import authentic supported brand release, adopt patched Pillow and verify complete proof.
4. Vendor exact GLib fix, enforce provenance, prepare/run optimized regression in Linux CI.
5. Run local CI-parity source/site checks, publish PR and run all native/package scopes; diagnose failures without weakening acceptance.
6. Complete capped review responses, update final evidence and hand off for owner merge.

## Complexity Tracking

No constitution exception. The vendored subtree is required because the maintained GTK3 dependency family has no compatible released iterator fix.
