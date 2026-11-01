# Implementation Plan: Release recovery and retained gate evidence

**Branch**: `codex/s023-release-recovery` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

## Summary

Complete #76 through authenticated draft asset verification, bounded read-after-write observation and exact candidate/publication export retention. Preserve accepted bytes, provenance and published version history.

## Technical Context

**Language/Version**: Node.js 24.11.0 ESM; Python 3.12 archive readers; GitHub Actions YAML.
**Primary Dependencies**: Existing fetch client, Node test runner, Next.js/Playwright documentation campaign.
**Storage**: Existing immutable JSON records, upload journals and Actions artifacts.
**Testing**: Node regression tests, controlled HTTP campaign, headless site/gate verification, all hosted qualification scopes.
**Target Platform**: Ubuntu publication runner; Windows hidden maintainer tooling.
**Project Type**: Maintainer release pipeline.
**Performance Goals**: At most eight observation reads and 30 seconds per reconciliation, capped by current qualification deadline.
**Constraints**: Single write then bounded reads; conflicts terminate; 660/900/15-second qualification rules unchanged.
**Scale/Scope**: Existing six native packages, support metadata and canonical record; no binary or released-document changes.

## Constitution Check

Pre-design and post-design: PASS. Owner scope is #76. Immutable v0.1.0 remains shipped; no new release is claimed. Hidden/headless tests preserve workstation focus. All functional/integrity/provenance gates remain required. Explicit push/PR authorization supersedes the skill's default pre-push pause; owner controls merge.

## Project Structure

- `scripts/github-release.mjs`: bounded observation with async-scoped request deadlines.
- `scripts/release-publication.mjs`: stage verification, one-write mutation reconciliation, strict final public URLs.
- `scripts/release-evidence.mjs`: retain and independently verify exact gated exports.
- `scripts/release.mjs`, `.github/workflows/release.yml`: retention at the gate boundary and always-upload paths.
- `tests/fixtures/releases/github-service.mjs`, release tests and `scripts/test-release-campaign.mjs`: realistic temporary URLs/delayed observations and evidence readback.
- `README.md`, `CHANGELOG.md`: maintainer usage and dated process decision.
- `specs/023-release-recovery/`: specification, design, tasks and execution evidence.

## Decisions (chronological)

1. 2026-11-01: Use exact authenticated asset API routes for draft content checks, retain final public URL checks after publication. Alternatives (rewriting expected URLs or publishing before staging) weaken identity or ordering.
2. 2026-11-01: Retry pending reads only, eight attempts/30 seconds with one-second intervals. Async-scoped deadlines bound fetch and binary reads without changing global qualification authority. Arbitrary exceptions and detected conflicts propagate.
3. 2026-11-01: Retain the exact candidate export and gated record immediately after candidate qualification, with an inventory and reusable independent verifier; retain publication likewise. Do not substitute a separately rebuilt projection.
4. 2026-11-01: Keep software/schema/docs version 0.1.0 and released snapshots untouched; this is unreleased maintainer tooling, not a new product release.

## Complexity Tracking

No constitutional exceptions. One shared observation primitive and one evidence module keep concerns reusable and bounded.
