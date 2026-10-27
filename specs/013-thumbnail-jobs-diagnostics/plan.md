# Implementation Plan: S013 Optional Thumbnail Jobs and Diagnostics

**Branch**: `codex/013-thumbnail-jobs-diagnostics` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Complete #12 and #15 under authorized autopilot.

## Summary

Extend the existing native core with bounded optional image/video preparation, immutable validated local/portable cache entries and typed diagnostics. Reuse S012 exact operation/root identities, existing state commit gate and finite source admission. Gallery and CLI share the same native providers; ordinary browsing and focused viewing remain originals-first.

## Technical Context

**Language/Version**: Rust 1.96/edition2024 and existing TypeScript/Next.js 16 static interface.
**Primary Dependencies**: Existing Tauri 2.12.5, cap-std/cap-fs-ext 4.0.3, tokio 1.54.1, serde; pin image 0.25.10 (six explicit still codecs), sha2, base64 0.22.1, ctrlc 3.5.2. Optional selected/hash-bound FFmpeg 6+ fd/PNG provider; no product PATH search or automatic download.
**Storage**: Product-owned machine cache or explicit .local-media-gallery-thumbnails-v1 child; immutable bounded single-entry envelopes;256 record/256 KiB memory diagnostic ring; explicit native export only. Existing settings/history formats remain intact.
**Testing**: npm check/test/docs/app/site/browser; cargo core/Full/Lite; Windows rendered preparation/diagnostic acceptance; normal extracted image/video/cache/diagnostic proof on Windows x64, Ubuntu24.04x64 and macOS15arm64.
**Target Platform**: Preserve elected S012 matrix and explicit remaining unqualified combinations.
**Project Type**: Native desktop and finite local CLI; no new service/framework.
**Performance Goals**: One active preview/generation worker and helper; two shared cache-validation permits, finite visible client queue; off-UI hashing/decoding/process I/O. Original browsing never waits for hashes.
**Constraints**: Full source SHA256 only for explicit preparation/optional cache validation; exact native capability access; no unrelated overwrite; output 4 MiB/entry 6 MiB; helper 30s deadline with observed exit; source checks remain non-atomic against arbitrary concurrent edits. Qualification target 660s/hard 900s with 15s reserve and separate prerequisite accounting.
**Scale/Scope**: Small representative native fixtures and adversarial boundaries; no universal throughput/color/runtime/install claim.

## Constitution Check

Pre-research and post-design PASS; no unjustified violations. Owner scope retained, alternatives recorded in research.md, existing architecture extended proportionally, UTF-8/LF and governed assets preserved, local/hosted evidence distinct, publication authorized and merge owner-controlled.

## Project Structure

Feature docs: spec.md, checklists/, research.md, data-model.md, contracts/preparation.md, quickstart.md, tasks.md and internal verification/measurements receipts.

Core: crates/gallery-core/src/diagnostics.rs, thumbnail.rs and cache.rs extend lib.rs/transport.rs native grants and bounds. Host: apps/gallery/src-tauri/src/preparation.rs bridges job services/CLI/cancellation and main.rs IPC/dialogs; launch.rs parses the shared finite commands, gallery_state/settings/history retain typed diagnostic categories. UI: apps/gallery/src/lib/preparation.tsx and diagnostics.tsx plus types.ts, gallery.tsx and scoped CSS use delivered components and distinct preview facts. Tooling: scripts/prepare-media-tool.mjs, test-preparation.mjs and existing prepare/qualify/ci/proof/normal scripts. Contracts/docs: schemas/v0.0.0 and authoritative docs/v0.0.0 with dated CHANGELOG.md decisions.

## Phase 0 research

Three read-only research tasks completed: encoder/tool provenance, native cache authority/publication and diagnostics/UI/qualification seams. All technical unknowns resolved in research.md. No implementation delegation.

## Phase 1 design

See data-model.md and contracts/preparation.md. Preview binds actual root/destination/provider/policy and exact planned no-clobber slots without writes. Start consumes/revalidates the preview, then a single worker stages/validates/commits per item under source/root/destination/job authority. Full content digests protect freshness; original rendering is available while optional cache validation runs. Cleanup only removes validated owned entries. Typed diagnostic events never clone sensitive native envelopes. CLI preserves one machine result and distinct exit categories.

## Validation and delivery

Write failing meaningful contract/integrity/lifecycle regressions first. Preserve existing fixtures/assertions. Add actual native rendered UI and normal extracted functional image/video proof, including selected/mutated helper and cancellation. Prepare all dependencies before timed qualification; record exact source/tool/binary/cache identities and timings. Exclude only S013 delivery receipt files from normative source digest. Publish official PR closing #12/#15, update Project 8, settle all applicable CI and every review within at most two rounds, then notify owner for final review and squash merge. No tags/releases/merge.

## Analysis gate

Read-only analysis covered 18 functional requirements, six success criteria and 30 tasks: zero uncovered requirements, zero unmapped tasks and zero constitution conflicts. One medium ambiguity concerned cancellation during preview hashing. The contract now specifies an immediately admitted asynchronous preview job, one host-owned PreparationService and independent cache validation admission. Re-analysis found no remaining blocking findings.
