# Implementation Plan: Sidecar metadata and inspection

**Branch**: `codex/010-sidecar-metadata-inspection` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: S010, GitHub #13 and #14. Explicit automatic push/PR and two-round review maximum; owner merges.

## Summary

Record direct JSON resources during existing requested discovery, inspect only on focused information demand, and return a bounded lossless attributed tree. Add lazy nested inspection and summary choices through the existing state resolver. Metadata freshness is independent of media observation identity so sidecar changes preserve playback.

## Technical Context

**Language/Version**: Existing Rust workspace and TypeScript/React/Next.js/Tauri versions, no framework replacement.

**Primary Dependencies**: cap-std/cap-fs-ext held directory authority, serde transport, serde_json quoted-string decoding, existing Tokio admission and Tauri blocking executor. No new parser framework.

**Storage**: Read-only external UTF-8 JSON. Existing user/remembered/portable/session presentation state gains optional summaryFields, default empty for old documents.

**Testing**: Cargo core/shell, Node contract/view tests, actual Windows WebView2/native fixture groups, site build/render/browser checks, exact source/media/brand receipts.

**Target Platform**: Windows local native qualification; shared code retains Linux/macOS targets without inheriting Windows qualification.

**Project Type**: Native desktop gallery with bundled webview interface and separate website.

**Performance Goals**: Finite demand-only work; one admitted native metadata inspection, immediate busy result for another; no directory scan from inspection, no Hub/state-gate held over I/O.

**Constraints**: 1 MiB source/document; 8 MiB source/inspection; 32 inspected documents/inspection; 256 observed JSON documents/session; depth64 and 20,000 values/document. Report exhausted budgets explicitly. Lazy display50 siblings per step, full-value/raw-source disclosure only on demand. Summary choices at most32, path depth64, strings bounded by settings size and explicit field limits.

**Scale/Scope**: Small source-neutral fixtures, arbitrary schema-free accepted JSON, direct-file traversal, no thumbnail/packaging/editor/automatic-watch work.

## Constitution Check

Pre-research: PASS. Owner scope #13/#14 is explicit; existing architecture/state/root grants are reused. Read-only inspection and proportional modules preserve integrity; qualification and publication boundaries remain distinct. Spec Kit skills-mode Python initialized1.0.8; no extension hooks installed.

Post-design: PASS. No new eligibility rules, source schema or dependency framework. Existing discovery controls remain responsive, media revision remains separate, exact values and invalid/future state bytes are preserved. Explicit engineering resource limits are attributable per document. Public docs retain authoritative contracts and internal evidence stays here.

## Project Structure

### Documentation (this feature)

`specs/010-sidecar-metadata-inspection/`: spec, plan, research, data-model, contracts/metadata.md, quickstart, tasks, checklists and verification.

### Source Code (repository root)

- `crates/gallery-core/src/metadata.rs`: bounded parser/AST, observation/result/association and demand read authority.
- `crates/gallery-core/src/lib.rs`, `discovery.rs`: JSON catalog, independent metadata revision and admission.
- `crates/gallery-core/tests/metadata.rs`: exactness, association, budgets, capability and races.
- `apps/gallery/src-tauri/src/main.rs`: main-window IPC, admission before spawn, owned prepared read outside locks.
- `apps/gallery/src-tauri/src/settings.rs`, `gallery_state.rs`: backward-compatible summary choices validation/precedence.
- `apps/gallery/src/lib/metadata.ts`, `metadata-inspector.tsx`, `types.ts`: exact projection/selector helpers, demand inspector and lazy tree.
- `apps/gallery/src/app/gallery.tsx`, `gallery.css`, `lib/state-controls.tsx`: existing viewer integration and governed styling.
- `schemas/v0.0.0/`, `tests/contracts.test.mjs`, `tests/metadata.test.mjs`, `scripts/test-native.mjs`: owned contracts and real transport/rendered acceptance.

**Structure Decision**: One cohesive core metadata module and one viewer-local inspector. Reuse settings resolver rather than build a second preference store. Separate bounded parse helpers if module size warrants it.

## Decisions (chronological)

1. Preserve all exact/stem sources with rank and basis; do not merge or hide conflicts. Native identity resolves case aliases without lowercasing the directory. Stem collisions remain ambiguous.
2. Recognize optional StorageName (preferred), Name fallback only when StorageName is absent, plus documented simple reference fields. Only direct current media observations can match. Top-level record/array and direct Items/files records are supported; nested directory records are retained as data and never flattened onto root siblings.
3. Use an ordered tagged JSON tree with number lexical strings. A small bounded lexical parser uses serde_json for string decoding. UTF-8 BOM is accepted with annotation. Invalid Unicode/encoding is explicit; raw accepted UTF-8 source remains inspectable on parse/limit failure. Duplicate keys are preserved and annotated.
4. Maintain separate metadataRevision. Begin Refresh invalidates old reads immediately; JSON batch/terminal observations update it. Media revision/URL stays unchanged for sidecar-only edits. Complete-only pruning applies to JSON too; incomplete retains unconfirmed attribution.
5. Prepare read authority and obtain a single owned admission permit before spawn. Read bounded observed files capability-relative with no-follow and pre/post opened/named/root signature checks, then revalidate session/item/metadata epoch. No settings/discovery authority lock covers filesystem I/O.
6. Bind renderer acceptance to session/item/media revision/metadata revision plus effect lifetime. Load only expanded focused information after discovery settles, with explicit retry for busy/error. Never inspect cards or introduce polling.
7. Summary choice is source role plus typed key-occurrence/array-index path. Exact-name sidecar slots travel across item names; index source names are direct relative document names. Multiple matching index records remain separate attributed results. Missing is absence, never null.
8. Reuse all four existing persistence destinations, default empty choices for legacy files, validate bounded choices and preserve unknown fields. Native/runtime facts stay separately labelled.
9. Keep video key/effect unchanged. Lazy details and sibling paging bound render work; long values and raw source have explicit full-value disclosure with text-only output.
10. Run full elected qualification under existing target660/hard900/reserve15 accounting. Preserve native Windows evidence separately from hosted compile/unit. Publish official PR automatically, respond to individual comments, request at most one additional round if needed, then owner handoff.

## Complexity Tracking

No constitution violations or additional services. A custom bounded lexical parser is justified by duplicate-member and lexical-number fidelity that map-based parsers cannot supply across the native/JavaScript boundary.
