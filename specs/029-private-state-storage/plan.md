# Implementation Plan: Application storage and private-state recovery

**Branch**: `codex/s029-private-state-storage` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

## Summary

Implement #92 isolation first, then explicit Windows state paths (#90), private-only automatic recovery (#91) and updater location/cleanup/coordination (#93). Prepare aligned 0.2.1 source contracts and retain published snapshots. See [research.md](research.md) for decisions and alternatives.

## Technical Context

**Language/Version**: Existing Rust 2024/pinned toolchain, JavaScript ESM/Node 24.11.0, Tauri 2.12.5.

**Primary Dependencies**: Existing Tauri config overrides, dirs7, cap-std/cap-fs-ext4, rusqlite0.41 bundled SQLite, current Windows bindings. No new framework or dependency.

**Storage**: Private preferences, SQLite history, cache/WebView profile, protected user/machine updater roots and disposable tooling contexts.

**Testing**: Rust unit/integration and Windows ownership/concurrency regressions; Node repository/docs/release tests; existing hosted native/package/website/release-validation scopes. Keep all local execution headless.

**Target Platform**: Windows path contract; private recovery and tooling isolation across existing supported platforms. Non-Windows ordinary path names remain unchanged.

**Performance Goals**: Bounded existing operations and 250ms SQLite busy handling; no new watcher or background filesystem scans. Retain 660/900/15 qualification accounting.

**Constraints**: No migration/backup, no legacy-directory cleanup, no private reset of portable/media files, no active-owner desktop focus or attended gate, two review rounds maximum. Publication/merge remain outside current authorization.

**Scale/Scope**: Existing app storage and updater libraries/scripts; no MSI redesign or navigation overhaul.

## Constitution Check

Pre-design PASS: owner requested these behavior changes, including replacing preserve-and-block private semantics. Existing automated checks remain engineering verification; owner product testing follows publication. Proportional changes, headless launchers, explicit source/publication claims and UTF-8/LF integrity apply.

Post-design PASS: use installed Spec Kit helpers and feature selection, explicit storage capability/ownership and actual concurrency checks. Product/docs/schema align at0.2.1; published0.2.0 trees remain immutable. No added product-eligibility or signing system.

## Project Structure

### This feature

spec.md, checklists/, plan.md, research.md, data-model.md, contracts/storage.md, quickstart.md, tasks.md and verification.md.

### Existing source areas

- apps/gallery/src-tauri/src/: storage path selection, settings/history recovery, read-only compatibility, private features.
- crates/windows-package/src/private.rs and embedded.rs: explicit protected update roots, validated coordination lifecycle and profile operands.
- crates/gallery-update/src/: retained contexts, raw helper CLI, transactions, native workers and scratch cleanup.
- scripts/: dev/native fixture roots, update campaign isolation, normal-byte exclusion checks.
- docs/v0.2.1, schemas/v0.2.1, site snapshots/retained records: new contracts.
- Existing tests and CHANGELOG.md: regressions and dated decisions.

## Implementation decisions and order

1. Finish Spec Kit quality/checklist/research/tasks and blocking analyze gate.
2. Introduce explicit updater storage contexts for fixtures/maintainer helper and workers; replace every production-root fixture before local Rust execution.
3. Validate temporary Windows roots and post-validation lock deletion. Refuse foreign/link/nonempty coordination entries without changing them.
4. Apply Tauri overrides before WebView construction. Add tooling-state build feature/default workspace roots and dev command wiring. Cache/history bypasses use the same tooling policy. Ordinary actual-byte campaigns use existing disposable isolated CI profiles.
5. Add red private recovery cases, then implement Settings format-based compatibility, locked re-read/atomic defaults, typed content-vs-I/O distinction, no-follow/link validation and named-file failure messages.
6. Reset incompatible private history content in place under history.lock, including normal reads. Keep SQLite live-reader/writer contention an actual failure. Mark and recover accessed invalid rows without weakening valid revision comparisons.
7. Align read-only preflight with reset dispositions; portable input remains independently strict and byte-preserving.
8. Define and implement active/recovery/rollback retention plus scoped cleanup of owned stages/obsolete worker scratch. Preserve shared worker context and validated ownership during reclamation.
9. Align0.2.1 product/docs/schema and immutable inventories, retain shipped portable version acceptance, update diagnostics and release-neutral documentation.
10. Run local required checks and applicable hosted CI, push/open PR automatically, resolve all findings within two rounds, then owner handoff.

## Complexity Tracking

No constitution exception. The extra tooling compile feature is excluded from ordinary builds and avoids adding a public profile override. SQLite in-place reset and post-validation Windows deletion preserve existing physical coordination. Storage contexts are explicit inputs rather than process-global test mutation.
