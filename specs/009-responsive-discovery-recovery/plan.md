# Implementation Plan: Responsive discovery and root recovery

**Branch**: `codex/009-responsive-discovery-recovery` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

**Input**: S009, GitHub #10 and #11. Owner authorizes automatic commit/push/PR, CI and at most two review rounds, then owner final review/merge.

## Summary

Retain the existing Rust/Tauri capability core and Next interface. Reserve discovery requests without filesystem work, run them through one hidden native worker with one replaceable pending slot, publish bounded incremental batches, and reject retired operations at every commit. Complete scans alone remove unseen entries. Add visible progress/cancel/retry, globally ordered snapshots, stable page anchors, root-resource validation and precise storage support documentation.

## Technical Context

**Language/Version**: Existing pinned Rust toolchain, TypeScript 5.9.3, Node >=24, Python Spec Kit helpers.
**Primary Dependencies**: Existing cap-std/cap-fs-ext, tokio-util cancellation, Tauri, React/Next and delivered brand components. No new runtime dependency.
**Storage**: Held native directory grants and cached observations; existing S008 user/portable/SQLite persistence remains authoritative.
**Testing**: Rust core/shell regressions, Node contract/view tests, Windows WebView2 functional acceptance, rendered website checks.
**Target Platform**: Windows local native qualification; all three OS targets retained. Physical removable/network outages and native Linux/macOS remain explicitly unqualified.
**Project Type**: Native desktop gallery with static web interface.
**Performance Goals**: First useful observation published immediately; subsequent publication at 32 observed entries or 100 ms elapsed between entry boundaries, plus terminal publication. These are scheduling bounds, not throughput guarantees.
**Constraints**: One worker, one replaceable queued request, no directory work from timers, no hub lock across OS I/O/callbacks/waits, four existing media admissions, source integrity, hidden console children, qualification target660/hard900/reserve15 seconds.
**Scale/Scope**: Small deterministic fixtures; no bulk-media acceptance gate or numerical scale claim.

## Constitution Check

Pre-research and post-design: PASS for owner scope (both issues, preserved traversal/defaults), proportional design (existing core/host/UI, no new framework), integrity/brand (unchanged kit, semantic controls), truthful verification (native versus synthetic versus hosted evidence), publication authority (explicit push/PR approval, owner merge boundary). No justified violations required.

## Project Structure

- `specs/009-responsive-discovery-recovery/`: spec, research, data model, discovery contract, quickstart, tasks, analysis and verification.
- `crates/gallery-core/src/lib.rs`: request reservation, generation/cancellation, incremental reconciliation, root identity and snapshots; dedicated test-only controls/module as appropriate.
- `crates/gallery-core/tests/`: deterministic worker/storage regressions and existing access/transport tests.
- `apps/gallery/src-tauri/src/discovery.rs`: single worker, pending slot/watermark, shutdown and native-test control integration.
- `apps/gallery/src-tauri/src/main.rs`: startup-after-listen request, command acknowledgments, ordered current-state publication.
- `apps/gallery/src/app/gallery.tsx`, `src/lib/types.ts`, `src/lib/view.ts`: global sequence guard, visible state/cancel/retry, anchor preservation and stale attribution.
- `scripts/test-native.mjs`, normal-build exclusion, `tests/`: meaningful rendered and contract regressions.
- `docs/v0.0.0/`, `schemas/v0.0.0/`, `CHANGELOG.md`: authoritative contracts and chronological history.

## Decisions

1. Reserve each request under the core hub lock with a monotonically ordered operation generation. Enqueue only if newer than the worker's persistent watermark. Replacing pending work cancels admission to old work; Close/Cancel bypass the worker queue. Never join an OS-blocked worker on window shutdown.
2. Validate a new root on the worker before replacing a usable session. Return command acknowledgments promptly. Initial CLI root is requested from startup after the webview listener is installed, avoiding pre-window filesystem enumeration. Progress publications load settings once for a newly committed root, not on each observation.
3. Keep synchronous core open/refresh convenience wrappers for existing test/host consumers, built on the same prepare/run contract. The product host uses the bounded worker exclusively.
4. Maintain a global snapshot sequence across roots and close, distinct from item/content revision. Frontend rejects lower sequence values before activating settings. Events and command responses read current state under the existing publication order.
5. Incomplete scans merge observed entries and retain unseen items with stale attribution. Only complete enumeration removes unseen entries. Cancel wins when its terminal state commits before completion; completion wins if already committed. Changed item grants are revoked only within a validated current operation commit.
6. Root unavailability means missing/unreadable or changed held-root identity; failed means an internal worker failure. Iterator/individual-entry failures yield partial. Failed selection preserves the prior root and its preferences, while reporting the failed request. Retry is explicit; Refresh retries an existing held root, and selecting/reopening explicitly obtains a new root grant.
7. Share the existing handle-derived root identity helper from core; compare current pathname identity with held directory identity. Filter Windows hidden/system/reparse attributes from capability-relative metadata. Include opened-file identity in item signatures where supported. Hard links remain ordinary direct regular files.
8. Anchor each incremental update to the surviving selected item or previous first visible item after full collection sort/filter. On complete-only removal, choose a neighboring surviving old anchor, else clamp to an empty/valid page and announce the change. Manual sort/filter/page choices reset the anchor deliberately.
9. Use test-feature-only deterministic barriers and failpoints. Normal artifacts expose neither control commands nor environment-driven delay/failure behavior. Synthetic failure/recovery proves logic, not physical network/removable outage behavior.
10. Preserve direct files, no descendant links/recursion/mount-child traversal. Explicit root canonicalization may resolve an alias. Windows held roots must close before relocation; generic OS-mounted network/removable paths are best effort, not a newly advertised qualified platform matrix.

## Verification and delivery

Run test-first regressions for intermediate observations, partial retention, cancellation/queued cancellation, replacement/close, stale publication, root identity, native paths and real source integrity. Run repository checks/tests and affected app/site checks, then full qualification with preparation/qualification/combined accounting. Verify exact committed source; push feature branch and create official PR closing #10/#11. Count initial automatic review as round1; allow one explicit second request only if useful. Address every finding/thread and wait terminal applicable CI. Hand off without merging.

## Complexity Tracking

No constitution violations. A single pending slot is chosen over independent spawn_blocking tasks because a blocked OS call must not create an unbounded queue of live worker tasks. No watcher, storage provider framework or speculative traversal expansion is added.
