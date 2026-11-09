# Implementation Plan: S038 resilient qualification and v0.3.0 preparation

**Branch**: `codex/s038-v030-release-preparation` | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Input**: Owner-authorized S038 / issue #116. Automatic push and official PR, at most two hosted review rounds, owner final merge. No publication.

## Summary

Use one maintainer acquisition policy covering the complete request/body operation, integrate it into existing prerequisite and release read paths, and preserve all caller integrity and timing contracts. Prepare v0.3.0 with new versioned documentation/schema/reference history, the merged navigation and legacy recovery contracts, and ordinary upgrade qualification from the latest published v0.2.2 in addition to existing predecessors. Retain public canonical v0.2.2 selection until publication.

## Technical Context

**Language/Version**: Existing Node 24.11.0 maintainer modules, Python 3.12 helpers, Rust 1.96.0/Tauri and Next.js/Fumadocs/Shiki. Product version becomes 0.3.0; dependency/toolchain versions remain unchanged.

**Primary Dependencies**: Built-in fetch/AbortController/streams, existing digest/archive readers, GitHubReleaseClient, native package observers and source/snapshot tooling. No new runtime service or dependency.

**Storage**: Existing ignored maintainer caches/partial artifacts; docs/v0.3.0, schemas/v0.3.0, site/snapshots/v0.3.0 and site/retained/v0.3.0.json; internal specs/038-v030-release-preparation. Historical released namespaces remain immutable.

**Testing**: Node unit/real loopback transport tests; existing source/history, release, GitHub observation and upgrade evidence suites; npm check/test/check:docs/check:app and affected static/rendered site checks; all hosted native/package and release-validation scopes.

**Target Platform**: Existing Windows x86_64, Ubuntu 24.04 x86_64 and macOS 15 Apple Silicon, Full/Lite. All installer/native GUI execution remains hosted; local console tools run through the verified hidden launcher.

**Project Type**: Existing desktop product, maintainer pipeline and release candidate.

**Performance Goals**: Acquisition has one absolute elapsed budget covering attempts, body and delay. Existing caller bounds, including 300-second canonical and 600-second supporting transfers, remain. Qualification retains 660 advisory / 900 hard / 15 reserve and separate preparation/qualification/combined accounting.

**Constraints**: No release mutation retries, functional-test retries, relaxed integrity checks, owner desktop mutation, version-history rewrites, public latest promotion, merge, tag or release publication.

**Scale/Scope**: Six public product rows plus existing corresponding-source metadata; fourteen requirements; observed prerequisite paths and equivalent idempotent acquisition paths; ordinary Windows 0.2.0/0.2.1/0.2.2 plus separate advanced legacy 0.1.0/0.2.0 recovery.

## Constitution Check

Pre-research PASS: Explicit scope authorizes automatic push/PR. The owner retains final merge/publication. Existing architecture, unsigned distribution, data ownership, canonical publication and all functional/integrity/provenance elections remain. No attended gate is introduced.

Post-design PASS: Share policy within existing maintainers instead of creating a downloader service or new cache architecture. Complete body/sink reset is required before replay; permanent errors remain terminal. Historical snapshots are inventoried before editing. Candidate and canonical receiver identities stay distinct. Required clocks/elections and exact-head qualification remain unchanged.

## Research and design decisions

1. Add scripts/download-acquisition.mjs with a reusable whole-operation retry boundary, bounded byte reader and buffered acquisition helper. Default at most four attempts, a 120-second total preparation allowance and bounded exponential delays. Callers retain their shorter/longer elected total limits; absolute parent deadlines and cancellation take precedence. Tests inject time/pause/transport, and real loopback cases exercise native fetch/body cancellation.
2. Retry only elected HTTP 408/429/500/502/503/504 and known transient nested transport codes. Bare TypeError, TLS/certificate, configuration, authorization, absence, content-size, parsing and digest failures are terminal. Correct the existing feature-source helper's overly broad TypeError/all-5xx retry logic by using the shared policy.
3. Parse integer-seconds and HTTP-date Retry-After. Honor a valid delay only within the remaining elapsed budget and elected maximum wait; stop instead of retrying early when a valid delay cannot fit. Malformed values use bounded backoff. No response/transport retries can restart a parent clock.
4. Keep digests and archive/compatibility checks authoritative outside acquisition where already established. Body readers enforce their byte limit before buffering. Partial file output is never final; accepted-file publication follows existing byte/digest checks. Do not attach arbitrary raw errors, response bodies, headers or signed URL tokens to diagnostics.
5. Integrate Node/tool/media/NVDA/feature-source, pinned Windows inputs and predecessors, Linux canonical predecessor, brand updater acquisition and isolated diagnostic inputs. Exclude local native driver/test requests, offline-negative probes, domain operations and publication mutations. CI Actions GET readiness may share the read-only policy while retaining its existing parent readiness bound.
6. GitHubReleaseClient JSON GET and binary acquisition use the shared complete-operation boundary. Preserve manual destination allowlists, five redirects and cross-origin authorization stripping. POST/PATCH/DELETE/uploads remain one-shot. Preserve AbortError/TimeoutError observation behavior so an expired observation still returns its original mutation failure.
7. Allocate binary hash/count/collection anew per attempt. A custom onChunk sink must not be replayed after output unless explicitly resettable. downloadFile owns a resettable file: truncate between settled failed attempts and use explicit per-attempt offsets (truncate alone does not reset descriptor position). Retain existing .partial promotion and 300/600-second transfer limits.
8. Inventory v0.2.2 docs/schema/captured references/retained receipt/manifest row before any version edits. Update only owned VERSION, root/app package and lock rows, workspace/owned Cargo lock rows and Tauri metadata. Copy new v0.3.0 trees, update new schema identities/examples and append portable settings compatibility. Preserve all dependency versions and historical bytes.
9. Promote navigation and MSI recovery source contracts into new v0.3.0 chapters, update current candidate/support/changelog prose and concise highlights, and keep authored site manifest.latest/canonical selection unchanged. The new snapshot follows the existing manifest shape; it cannot assert publication. The candidate sender's prepared-gallery recipient remains the actual canonical published Lite (currently v0.2.2); native candidate Full/Lite proof is separately v0.3.0.
10. Pin canonical v0.2.2 record and exact direct MSI, audit/extract it during isolated readiness, and add it to ordinaryPredecessors/evidence expectations without changing advanced publishedPredecessors 0.1.0/0.2.0. Preserve cancellation/refusal, actual limited-client wizard, installed launch and independent data/native readback for every row.
11. Existing S037 experience execution was 665.677 seconds and final gate 867.646 seconds; transport/readback was critical. Elect all three ordinary rows and measure the actual cohort. Preserve all cases/clocks; optimize only demonstrated redundant preparation/transfer work if required rather than assuming linear growth or weakening acceptance.
12. Commit source A, perform current vocabulary review and exact committed-source new snapshot capture in a fresh destination, retain only the new v0.3.0 receipt, commit source B and push/open PR. Final CI and review evidence lives in the PR/ignored receipt; avoid a completion-only source change after green CI. Add only established S038 progress-file exclusions to provenance.

## Project Structure

### Documentation (this feature)

specs/038-v030-release-preparation contains spec.md, plan.md, research.md, data-model.md, contracts/acquisition-and-release.md, quickstart.md, tasks.md, requirements/release-readiness checklists and verification/measurements.

### Source Code (repository root)

- scripts/download-acquisition.mjs and tests/download-acquisition.test.mjs: shared complete acquisition policy, bounds, diagnostics and deterministic/real transport tests.
- scripts/prepare.mjs, prepare-media-tool.mjs, prepare-screen-reader.mjs, prepare-feature-helper.mjs, sync-brand-kit.mjs, build-windows-packages.mjs, linux-offline-installer.mjs, diagnose-msi-*.mjs, ci-windows-package-cohort.mjs: existing acquisition integrations.
- scripts/github-release.mjs and tests/github-release.test.mjs: GET-only retries, observation semantics, redirects, transactional file replay and single-shot mutations.
- VERSION, owned package/Cargo/native metadata, docs/v0.3.0, schemas/v0.3.0, site versions/snapshots/retained and source documentation: coherent candidate and unchanged historical publication.
- Windows package build/evidence/campaign and initial-release/version tests: pinned v0.2.2 ordinary upgrade, existing legacy patch recovery and immutable v0.2.2 inventory.
- scripts/provenance.mjs: established progress-artifact exclusions only; .github/workflows/ci.yml only if existing artifact/election paths require an integration update.

**Structure Decision**: Extend existing maintainer and release machinery. No new product network feature, application architecture, publisher or public artifact role.

## Execution Order

Specify -> clarify -> requirements checklist -> installed plan/research -> tasks -> blocking read-only analyze -> failing acquisition/stream/history/version/upgrade regressions -> shared retry policy/integrations -> versioned candidate/docs and latest upgrade election -> local parity -> committed-source snapshot capture -> official PR -> complete exact-head CI and at most two hosted rounds -> independent receipts and owner merge handoff.

## Risks and limits

- Server outages can outlast the finite preparation allowance; terminal failure remains valid and visible.
- A stream replay without settled/reset state can duplicate or corrupt output; explicit owned reset or no replay is required.
- Historical/publication state is not inferred from a version bump or snapshot status label.
- Hosted service failure is not a clean review; report it and honor the cap.
- Added native coverage and evidence transfer must fit the unchanged shared qualification clock. No accepted result exists until all mandatory readback passes.
