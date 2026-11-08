# Implementation Plan: CI observer reliability and published Linux recipients

**Branch**: `codex/s035-ci-observer-reliability` | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

## Summary

Repair the three observed qualification failure boundaries while preserving every existing acceptance assertion. Configure bounded native PCM delivery, bind actual stopped macOS coordinators to current operation identity, and make Windows requests/owned cleanup settle with durable source-bound diagnostics. Then exercise and independently read back the actual published v0.2.2 Linux prepared recipient on hosted Linux. Open the PR automatically and stop before owner merge.

## Technical Context

**Language/Version**: Existing Node.js 24.11.0 ESM maintainer scripts, Swift on macOS 15, PowerShell 7/native Windows observers, existing Python image/archive readback.

**Primary Dependencies**: Existing Node child_process, PulseAudio parec/pactl, Darwin process APIs and package observer, existing Windows process-tree termination and UI Automation observer. No new package dependency.

**Storage**: Ignored .local source-bound JSON/JSONL diagnostics and original hosted evidence archives; committed internal Spec Kit artifacts and changelog only.

**Testing**: Node test runner focused regressions, npm run check, npm test, affected site checks and exact-head full hosted native/package qualification. Actual desktop work remains on isolated hosts.

**Target Platform**: Existing Windows Server 2025 x64, Ubuntu 24.04 x64, macOS 15 arm64 qualification baselines.

**Project Type**: Maintainer qualification tooling for an existing native desktop application.

**Performance Goals**: Complete 16384 float32 mono frames at 48 kHz within the existing four-second PCM bound; request/teardown work clipped to its admitted/shared deadline. Existing overall 660/900/15-second contract remains unchanged.

**Constraints**: No partial-window acceptance, no older-pass fallback, no weakened signal/ownership/source/native checks, no credentials in checkpoints, no local native GUI/focus, no changed public release assets.

**Scale/Scope**: Three issue-specific observer repairs, finite targeted regressions and complete current hosted campaigns; one PR, at most two hosted review rounds.

## Constitution Check

Pre-design: pass. Owner scope is explicit; no product capability or eligibility changes. Existing code is repaired proportionally. UTF-8/LF, retained failures, exact source/artifact/native roles and hidden noninteractive Windows launches are mandatory. Remote push/PR are explicitly authorized; owner retains merge. No publication is requested.

Post-design: pass. No constitution exception or additional dependency is needed. Observer changes do not imply that rebuilt diagnostic binaries replace published v0.2.2. Actual product acceptance and test-harness identity remain distinct.

## Phase 0: Research and decisions

- PulseAudio server defaults use a two-second recording fragment/render block; request 50 ms recording latency so the null-sink monitor delivers the full existing window predictably. Keep the four-second limit and every before/after input/stream check.
- Make PCM terminal settlement idempotent, distinguish process exit from drained output, and retain bounded progress and primary/cleanup errors. No partial measurement may pass.
- Discover/revalidate macOS coordinator birth/parent/path/digest and operation/intent generation. A PackageKit daemon may parent the process. Observe an actual stopped state before reading admitted partial intent; resume unadmitted stops and never count a miss as interruption success.
- Save Windows phase/request/actor checkpoints before admission. Clip request clocks to the shared active deadline; closing must reject queued work immediately. Separate process exit and pipe-drain settlement, with bounded owned tree termination and truthful unknown/still-live outcomes.
- Keep existing always-run Windows restoration/upload paths, adding diagnostics and ensuring the prior controller can settle. A lost host cannot be guaranteed to upload.
- Verify actual published Linux Lite metadata/bytes using the canonical v0.2.2 record, while binding harness receipts to the new S035 source. Do not compare the harness source digest to the old published product source digest as if they represented the same role.

See [research.md](research.md) for primary sources and alternatives.

## Project Structure

### Documentation

`specs/035-ci-observer-reliability/` contains spec.md, checklists/, plan.md, research.md, data-model.md, quickstart.md, tasks.md, analysis.md, verification.md and measurements.md. This is internal maintainer tooling, so no new public interface contracts directory is required.

### Source Code

- scripts/native-pcm.mjs and tests/native-pcm.test.mjs: complete-window capture and deterministic native recorder configuration.
- scripts/macos-package-ui.swift and its existing package caller/tests: operation-bound stopped coordinator observation and retained fault diagnostics.
- scripts/observer-checkpoint.mjs, scripts/observer-command.mjs, scripts/windows-package-observer.mjs, scripts/test-windows-packages.mjs, scripts/ci-windows-package-cohort.mjs and existing child termination helpers: finite RPC/owned command lifetime and durable campaign checkpoints.
- scripts/ci-linux-packages.mjs and relevant Windows/macOS CI paths: elect focused regressions and retain original diagnostics.
- Existing prepared-recipient validators and original hosted archives: independently read actual public product bytes, archive modes/state and native screenshots.

**Structure Decision**: Extend existing maintainer boundaries; extract only narrowly shared lifetime/checkpoint helpers when needed for meaningful injected regressions. Product frontend, native application capabilities, brand kit, dependencies and release version remain unchanged.

## Verification and delivery

Write failing regressions before each repair, then run focused tests. Run repository and affected site checks before commit. Record required native scenarios and exact artifacts before interpreting CI. Push a conventional commit on the slice branch, open the official PR, monitor exact-head checks and all hosted comments/reactions. Address findings and trigger at most one additional hosted review round after the automatic first round. End with green applicable CI, no unresolved review threads, independent actual Linux recipient readback and owner final merge handoff.

## Complexity Tracking

No constitution violations. No product architecture expansion or new dependencies.

## 2026-11-08: observed Windows listener-provider correction

The current-head Windows product run exposed a ten-second unanswered listener ownership query after HTTP readiness. The persistent measurement observer used Get-NetTCPConnection/CIM. Replace only this listener path with the documented GetExtendedTcpTable owner-PID listener tables, retaining SDK layouts, IPv4/IPv6 coverage, address filtering, actual ownership checks and all existing deadlines. Compile the helper once per persistent observer, bound table allocation/retries, and fail on incomplete/error results. Memory measurement remains unchanged. Elect a real listener regression with CIM unavailable and a foreign answering process.

## 2026-11-08: hosted review correction

A rejected termination promise is insufficient if Node still references the live child, stdin or IPC channel. After bounded failure, release those controller references while retaining the literal unobserved-exit failure. Keep the termination helper/watchdog unreferenced so an outer hard deadline can remain shorter than its fallback grace. Test natural controller exit with healthy independently controlled children and no-op termination, including IPC and the helper path.
