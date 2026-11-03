# Implementation Plan: S027 v0.2.0 publication and verification

**Branch**: `codex/s027-v020-publication-verification` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/027-v020-publication-verification/spec.md`; issue [#85](https://github.com/shruggietech/local-media-gallery/issues/85).

## Summary

Execute publication from already owner-approved S026 main, independently verify public distribution, and submit the operational audit PR. Keep the baseline checkout pristine and S027 planning in a managed worktree. Final-main qualification run 41595557848 must finish successfully before readback and dispatch. This slice publishes the accepted products; the later audit PR does not elect a new product candidate.

## Technical Context

**Language/Version**: Existing Node 24.11.0 automation, Python 3.12 hosted tooling and PowerShell hidden local launcher.

**Primary Dependencies**: Existing GitHub Actions/API, controlled release publisher, Next.js/Fumadocs static export and Playwright Chromium. No dependency changes.

**Storage**: Immutable GitHub release assets, original Actions ZIPs, retained canonical records/gate exports and ignored local readback receipts.

**Testing**: Existing npm check/test, full main qualification, independent raw artifact/native receipt validation, production candidate/publication gates, public byte inventory, live headless browser and post-publication audit-PR native acquisition checks.

**Target Platform**: Windows x86_64, macOS arm64 and Linux x86_64 Full/Lite; public HTTPS site.

**Project Type**: Operational release and internal audit documentation.

**Performance Goals**: Existing 660-second target, 900-second hard qualification limit and 15-second finalization reserve; preparation remains separately measured. No new timing thresholds.

**Constraints**: Preserve approved source and accepted asset bytes. No local GUI/native/input actions, no signing, no public numbered planning links, no automatic audit-PR merge. Maximum two review rounds.

**Scale/Scope**: One 0.2.0 release, six packages, corresponding sources and metadata, predecessor 0.1.0, three documentation snapshots, M3 and issue #85.

## Constitution Check

Before research: PASS. Approved main is the release producer, package/docs/schema version is0.2.0, historical records remain immutable, release notes end with changelog link, qualification and provenance remain mandatory, native evidence is isolated, owner retains final PR merge.

After design: PASS. No source-identity exclusions or qualification weakening are introduced. S027 audit files change only the audit branch's source identity; they are never mixed into the approved baseline. Recovery follows existing candidate-owned journals. New CI candidates from the audit PR will not replace published assets.

## Project Structure

### Documentation (this feature)

`specs/027-v020-publication-verification/`: spec.md, plan.md, research.md, data-model.md, contracts/publication.md, quickstart.md, tasks.md, verification.md and requirements checklists.

### Source Code (repository root)

Existing `scripts/release.mjs`, `scripts/release-publication.mjs`, `scripts/release-evidence.mjs`, `scripts/test-release-site.mjs` and `.github/workflows/release.yml` provide production behavior. Private independent readback helpers live in ignored `.local/s027-*` under the pristine baseline. Only demonstrated defects justify product changes. CHANGELOG.md records the actual publication date and operational release history after publication.

**Structure Decision**: Reuse the reviewed publication pipeline and separate release production from the internal audit worktree.

## Chronological Execution

1. Specify, clarify, generate reviewer checklist, research, design, task and analyze S027 before execution.
2. Await exact-main success, retain original ZIPs and independently replay all mandatory receipts/products/docs.
3. Capture predecessor canonical/assets/historical source identities; dispatch release.yml on unchanged main with explicit version, predecessor and short highlights.
4. Independently verify release execution originals, both retained production gate exports, every anonymous asset, tag/source, canonical/latest and deployed Pages.
5. Publish audit PR; verify its post-publication native prepared-recipient receipts select0.2.0, resolve review comments, and retain exact-head CI evidence.
6. Close operational issue/M3 only after successful publication and acquisition readback; report owner-review-ready PR without merging it.

## Complexity Tracking

No constitutional violations or new architecture. Separate worktree is required to avoid contaminating baseline source identity with audit files.

## 2026-11-03: Demonstrated test correction

Post-publication website CI exposed a version-specific prose assertion in scripts/test-site.mjs. Replace only that brittle sentence match with the shared canonical publication authority term, preserving version/title and package identity checks. This is an acceptance-only correction; accepted published source/assets remain immutable. Record the CI failure and passing rerun in verification.md/PR closeout.
