# Implementation Plan: Fetch-compatible native-driver ports

**Branch**: `codex/s028-fetch-compatible-driver-ports` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: S028 / GitHub #87.

## Summary

Keep the shared OS loopback allocation path, reject the HTTP client's standardized restricted ports after releasing each temporary listener, and retry at most 32 times. Add deterministic allocator tests and retain actual owned HTTP readiness regressions. All existing no-argument consumers inherit the fix.

## Technical Context

**Language/Version**: JavaScript ESM, pinned Node 24.11.0.

**Primary Dependencies**: Built-in node:net and existing test/assert/HTTP modules. No added dependency or toolchain change.

**Storage**: No persistent product data; planning and local receipts only.

**Testing**: node:test, full npm check/test/docs and applicable hosted native/package/website/release-validation scopes.

**Target Platform**: Maintainer tooling on Windows, Linux and macOS. All local work remains headless.

**Project Type**: Internal native-acceptance helper in an existing Rust/Tauri/Next.js repository.

**Performance Goals**: Preserve readiness budgets; allocation makes at most 32 local bind/close attempts without HTTP probes.

**Constraints**: Each return is an integer 1..65535 from an actual successful bind. Every bound temporary server closes before retry, return or invalid-address refusal. Bind/close errors refuse immediately. Fixed upper bound 32; optional test attempt limit must be an integer 1..32. Existing bind-to-child race remains guarded by ownership proof.

**Scale/Scope**: One helper, its test file and internal planning/changelog. Consumers include test-native, test-preparation, measure-native and runtime-driver. No product, published artifact or version change.

## Constitution Check

Pre-design PASS: owner scope is explicit; use current feature branch and Spec Kit; proportional helper correction; UTF-8/LF and headless process discipline; full applicable verification. Existing signing/publication policy is unchanged.

Post-design PASS: no new external API, service, package, product policy, attended gate or release. Preserve nonce/PID attribution, child cleanup, no hidden deadline extension, separate 660/900/15 qualification accounting. Push/PR is explicitly authorized; final merge belongs to owner.

## Project Structure

### Documentation (this feature)

- spec.md, checklists/requirements.md and checklists/driver-allocation.md
- plan.md and research.md
- data-model.md and quickstart.md
- tasks.md and verification.md

This is an internal helper, so no external contracts directory is needed.

### Source Code

- scripts/native-driver-lifecycle.mjs: restricted-port policy, finite OS-bound allocator.
- tests/native-driver-lifecycle.test.mjs: deterministic candidates/errors/cleanup and real HTTP readiness.
- CHANGELOG.md: concise Unreleased tooling correction.

**Structure Decision**: Keep the policy next to its only allocation implementation. Inject a server factory and a reduced attempt bound only as optional internal test seams. Preserve all zero-argument callers and existing readiness implementation.

## Decisions and sequence

1. Specify and clarify: no unresolved owner decisions; built-in quality 16/16.
2. Generate the reviewer-owned allocation checklist (8 unchecked items); owner's autopilot instruction authorizes continuing without another checklist permission prompt.
3. Research official Fetch/Node sources using the planning command's research agent. Record table provenance and alternatives.
4. Write deterministic failing tests before helper implementation. Include the unrelated-listener fixture, which currently bypasses the helper by binding port zero directly.
5. Implement restricted-port filtering with 32-attempt maximum and guaranteed close after successful binding. Refuse invalid test controls and invalid address observations.
6. Run focused allocator/readiness tests, full repository tests/checks and docs checks locally through the hidden launcher. Hosted GUI/native checks remain mandatory and isolated.
7. Commit/push/open PR, count opening review as round one, use at most one additional authorized review invocation, resolve every finding, and verify final source CI before owner handoff.

## Complexity Tracking

No constitution exceptions. A static standardized restriction set avoids network probes and private runtime imports. Test seams are local function arguments; no global test state or product configuration is added.
