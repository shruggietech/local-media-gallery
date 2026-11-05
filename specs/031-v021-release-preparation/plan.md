# Implementation Plan: v0.2.1 release preparation

**Branch**: codex/s031-v021-release-preparation | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Owner-directed S031 / #98, ending at an official reviewed PR and green CI for owner merge.

## Summary

Prepare the existing patch release, remediate the development-only minimatch advisory, and repair production publisher retrieval of S030 supporting Windows evidence. Preserve all product features, published bytes, current canonical selection and full qualification. Reuse the established committed-source snapshot capture and publication workflow.

## Technical Context

**Language/Version**: Existing Node 24.11.0, Python 3.12, Rust/Tauri and Next.js/Fumadocs/Shiki; product remains 0.2.1.

**Primary Dependencies**: Pinned minimatch 11.0.1 override for the existing ESLint/config-array/typescript-estree consumers; existing GitHub client, release record, snapshot and archive tools. Existing compatible vendored glib remains unchanged.

**Storage**: Current release/support prose, unpublished docs/v0.2.1 and site/retained/v0.2.1.json, exact retained CI archives and internal specs/031-v021-release-preparation evidence.

**Testing**: Bounded actual advisory preprocessing and ordinary caller matching; malicious/missing/expired/foreign/mixed supporting artifact fixtures; streaming download/hash/size guards; historical compatibility; npm run check, npm test, docs and affected app/site checks; all nine hosted canonical scopes and all applicable jobs; independent original artifact readback.

**Target Platform**: Existing Windows x86_64, Ubuntu 24.04 x86_64 and macOS 15 Apple Silicon, Full/Lite. Windows installer/desktop cases stay on isolated Windows. Independent readback remains cross-platform.

**Project Type**: Existing native desktop product and maintainer release pipeline.

**Performance Goals**: Existing 660-second advisory target, 900-second hard limit and fifteen-second reserve; exact terminal preparation/qualification/combined accounting. Security regression child has bounded memory and a short deadline; timeout is failure.

**Constraints**: No local installer/desktop/machine-policy actions; no tag/publication/promotion/merge; no historical byte or brand changes; no extra review request beyond a single optional follow-up to the automatic initial review.

**Scale/Scope**: One patch-release handoff, six literal products, eight canonical input scopes plus aggregate validation and two supporting Windows worker packets.

## Constitution Check

Pre-research PASS: Owner scope and merge boundary govern; existing contracts/tooling are reused; all historical and governed bytes remain immutable; required security/native/evidence checks remain mandatory; explicit PR authorization supersedes the generic pre-push pause.

Post-design PASS: No new runtime, feature, platform or service is introduced. Supporting worker packets remain private qualification operands, not public release scopes or artifacts. The archive extraction bound and legacy behavior remain intact. Custom requirements-quality review markers remain reviewer-owned under explicit autopilot and do not create an additional attended gate.

## Research decisions

1. Pin minimatch 11.0.1 through a narrow root override. Parent upgrades alone still select affected 10.x versions. Installed parents use retained construction/match/function APIs; removed makeRe/AST/internal APIs are not used by those callers. Elect real lint/config selection and bounded upstream amplification coverage before accepting compatibility.
2. Download canonical qualification inputs first, bind the Windows gate's complete receipt hash to the accepted candidate's recorded scope, then elect supporting artifacts by exact recorded ID/digest/size and run/revision/common-clock identity. Do not select a newer same-name packet or enlarge public releaseScopes.
3. Preserve the existing 4-GiB canonical archive limit and use an explicit at-most-5-GiB bound only for elected supporting Windows evidence. The existing 5-GiB expanded archive/extraction bound remains unchanged. Verify actual downloaded size/hash before extraction.
4. Keep legacy gates without cohorts on their established path. For cohorts, reject missing/duplicate/expired/foreign/changed/oversized/mixed-attempt support and independently compare downloaded worker receipts/fragments with the gate's accepted records before full reassembly.
5. Finalize concise 0.2.1 release notes and actual publication/support descriptions. Preserve source-candidate availability language until verified publication. Describe the known legacy limitation without claiming it is fixed; do not implement #94/#97.
6. Commit source A before ordinary vocabulary review and current snapshot capture into a fresh disposable destination, then replace only site/retained/v0.2.1.json. Qualify final source B and record its evidence in the PR/internal progress files without a post-green source change.
7. Count the automatic hosted Codex review as round one. At most one additional manual code-review request is permitted; do not send separate review-trigger commands. Reply to and resolve every received finding. Publication handoff uses a later successful trusted-main run, version 0.2.1 and predecessor 0.2.0, without rebuilding accepted assets.

## Project Structure

### Documentation (this feature)

specs/031-v021-release-preparation contains spec, plan, research, data-model, contracts/publication-handoff.md, quickstart, tasks, checklists and verification/measurements.

### Source Code (repository root)

- package.json and package-lock.json: narrow fixed development dependency election.
- tests/minimatch-security.test.mjs: bounded recognized adversarial branch and installed caller compatibility.
- scripts/release.mjs and a focused evidence-input module if needed: actual publisher input retrieval with immutable supporting references.
- tests/github-release.test.mjs and tests/release-evidence.test.mjs: elected negative/legacy/transport regressions.
- CHANGELOG.md, README.md, SECURITY.md and docs/v0.2.1/verification-and-compatibility.md: accurate patch release, availability, support and evidence contract.
- site/retained/v0.2.1.json: unpublished current snapshot recapture only.
- scripts/provenance.mjs: exactly three S031 progress exclusions, following existing slice convention.

**Structure Decision**: Extend existing publisher and artifact verification; keep source-support election out of public release schemas and avoid a parallel publication service.

## Execution Order

Specify/clarify/checklist -> research/design -> tasks -> blocking analysis -> targeted negative/security regression -> dependency and evidence retrieval fixes -> prose/source A -> current snapshot B -> local parity checks -> push/official PR -> hosted qualification and no more than two reviews -> final independent evidence and owner merge handoff.

Supporting archive transport has a 600-second per-request allowance inside the existing global deadline. Canonical input transport retains 300 seconds. This separates input preparation from qualification and addresses the observed full-size stream cutoff without changing any byte or qualification bound.
