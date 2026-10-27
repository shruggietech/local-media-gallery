# Implementation Plan: S014 Native Media and Accessibility Qualification

**Branch**: `codex/014-native-media-accessibility` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

## Summary

Complete #18/#19 using the existing system-WebView application and feature-gated embedded WebDriver. Add a separate small qualification corpus, actual native media/presentation observations, external native accessibility clients and isolated NVDA speech-generation evidence. Correct demonstrated product findings, publish exact support limits, elect the campaign in local and all three hosted product scopes, and deliver through the authorized two-round review boundary.

## Technical Context

**Language/Version**: Existing Rust 2024/MSRV 1.96, TypeScript/React and Node >=24; Python 3.12/Pillow maintainer environment.

**Primary Dependencies**: Existing Tauri 2.12.5, embedded tauri-plugin-wdio-webdriver 1.5.0 and governed brand kit. Reuse installed axe-core for native DOM checks. Elected test-only bindings use locked objc2 0.6.5/AppKit/Foundation 0.3.2. NVDA 2026.3 is an explicitly pinned maintainer tool, never product payload.

**Storage**: Synthetic fixture, isolated settings/history/NVDA profiles and source-bound JSON/screenshots under ignored .local; authoritative public contracts remain version 0.0.0.

**Testing**: Installed Spec Kit sequence, Node meaningful receipt/fixture regressions, native system-WebView media/keyboard/presentation/AX/AT checks, unchanged existing unit/Windows/normal-proof/site/brand gates.

**Target Platform**: Windows x86_64/WebView2; Ubuntu24.04 x86_64/WebKitGTK under isolated X11/Xvfb+DBus; macOS15 arm64/WKWebView. Older/native alternate architectures remain unqualified.

**Project Type**: Existing native desktop gallery and maintainer qualification tools.

**Performance Goals**: Small finite corpus; bounded driver requests/readiness/AX traversals/speech logs. Qualification target660s/hard900s/reserve15s after verified readiness; no repeated full campaigns without a changed source/failure reason.

**Constraints**: No new product framework, media rewrite, autoplay, public test hooks, wildcard origin, owner-attended gate or inferred physical/speech/color support. Console children hide windows and disable prompts. Never terminate a pre-existing owner NVDA instance.

**Scale/Scope**: Approximately twenty small media fixtures, both compiled editions, three runtime rows and representative finite presentation/assistive journeys. No broad codec, HDR, animation, physical-touch or installer claim.

## Constitution Check

Pre-research: PASS. Owner scope is #18/#19; native evidence is mandatory; verified existing framework and byte integrity remain authority. Post-design: PASS. Test-only hooks stay feature-gated; governed bytes unchanged; source/artifact binding and all timing/CI/review gates retained. Three required read-only research tasks covered native automation, media observations and accessibility. No implementation delegation.

## Project Structure

- scripts/create-runtime-fixture.py/.mjs: independent deterministic media/orientation/profile/tone corpus and exact hashes.
- scripts/runtime-driver.mjs: bounded existing W3C driver session, native input and lifecycle helpers.
- scripts/test-runtime.mjs: actual native image/video/range/audio, keyboard/dialog/presentation checks and source-bound receipts.
- scripts/native-accessibility.ps1, scripts/native-accessibility.py: bounded actual Windows UIA and Linux AT-SPI clients.
- scripts/prepare-screen-reader.mjs plus scripts/nvda-qualification.py: pinned isolated portable NVDA and bounded gallery-only speech-generation capture.
- apps/gallery/src-tauri/src/qualification.rs: native-tests-only native input/presentation/macOS provider-tree facilities; register only under existing feature.
- apps/gallery/src/app/gallery.tsx/gallery.css: proportional demonstrated interaction/recovery fixes using existing brand tokens.
- scripts/ci.mjs/qualify.mjs/prepare.mjs/provenance.mjs/test-normal.mjs and .github/workflows/ci.yml: readiness, elected checks, normal-hook exclusion and exact receipts.
- docs/v0.0.0/ and schemas/v0.0.0/: public observed support/interaction and media policies; CHANGELOG.md dated changes.
- specs/014-native-media-accessibility/: spec, requirements review, research, model, contract, quickstart, tasks and delivery receipts.

## Execution decisions and order

1. Preserve the original twelve-candidate corpus and all existing acceptance; generate a separate small runtime corpus. Use real 440Hz audio plus a silent control; metadata/muted flags cannot pass the audio check.
2. Reuse the embedded native WebDriver for scripts/geometry/screenshots. Its JS click/keyboard/label helpers are not trusted input/native AX evidence. Use existing hidden Windows native-input, X11 native input on Linux and app-local queued NSEvent on macOS; assert isTrusted and actual default behavior.
3. Inspect native UIA/AT-SPI and AppKit/WKWebView provider exposure separately from DOM/axe. Run actual isolated NVDA on Windows with built-in silence synth and bounded pre_speech capture, verifying focus/item speech generation without physical audibility claims. macOS provider-tree observations do not claim external VoiceOver speech or TCC permission.
4. Observe native default runtime display preferences and scale. Test native zoom/window conditions and both themes. Reduced-motion is elected per-process on WebView2 and private/ephemeral runner settings elsewhere. Forced coarse/mixed CSS media branches are explicitly labelled condition emulation, not physical touch evidence; use the real stylesheet branches and restore them.
5. Image samples use known dimensions/corner colors and all EXIF orientations. ICC-tagged/untagged SDR observations remain separate from unmanaged thumbnails; canvas default animated-image frame does not qualify animation. Video frame/time/seek/audio/range checks are independent. Unsupported formats are valid observed outcomes only after actual decode attempts and retained-item recovery.
6. Add meaningful receipt/source mismatch and bounded-evidence regressions before accepting helper implementation. Reproduce product findings before fixes. Fail missing infrastructures, unexpected pixel/audio errors, absent AT evidence or invalid receipts; never convert those to unsupported formats.
7. Freeze source for full qualification. Add hosted display/audio/AT readiness and both native-test editions, preserving normal Full/Lite extracted proof. Record exact source/artifacts/tool hashes, host/runtime and preparation/qualification/combined timings.
8. Automatically push and open official PR; update Project8 S014/PR review. Address all findings, at most one additional review request after the initial round. Final receipt-head CI and source-equivalent review evidence must be explicit. Owner performs final review/squash merge.

## Complexity Tracking

No constitution violation. Platform-native test clients are required to observe system behavior; adding an alternative product browser or a new test protocol was rejected because the installed embedded provider already supports all three runtimes. Source scripts and UI fixes serialize. Hosted native jobs run independently only after the shared source is frozen.

## Owner-directed focus isolation

The owner reported workstation focus interference and requested that it stop. Local interactive acceptance has stopped. All GUI/input/screen-reader launchers now require explicit isolated CI context before admitting any window or key injection. Run local headless qualification, then execute the full existing Windows native suites and new three-OS runtime campaign on isolated hosted runners. Do not set the isolation opt-in on the owner workstation or silently omit elected native checks.

### Isolated diagnostic feedback

Cold three-platform builds delay investigation of runtime-specific failures. Extend the existing dispatchable native-desktop workflow with an optional hosted diagnostic route that downloads identified prior native-test artifacts from this repository. Record prior compiled source/binary hashes separately from the current harness source; these mixed-source observations never produce acceptance. Reuse the same isolated desktop preparation and native driver. The ordinary Qualification workflow must still rebuild and accept the final source on all elected targets. This avoids using the owner workstation for rapid interactive debugging.
