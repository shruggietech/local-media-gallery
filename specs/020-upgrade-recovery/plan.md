# Implementation Plan: Verified upgrades and recovery

**Branch**: codex/s020-upgrade-recovery | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

## Summary

Complete #25 with a native, offline recipient transaction coordinator. Package-manager Full installs remain owned by MSI or dpkg. Direct macOS bundles and Lite inventories use staged owned-file replacement. Retain original and replacement inputs outside installed content, verify actual state, and expose explicit update, recover and rollback commands. All current data formats and product version remain unchanged.

## Technical Context

**Language/Version**: Rust1.96/edition2024; Node24 ESM for build/evidence; POSIX sh for Debian guards.

**Primary Dependencies**: Existing serde/serde_json, SHA256, tempfile and platform package APIs; existing SQLite/settings readers. A small shared gallery-update crate avoids three duplicate transaction implementations. No network updater service or new desktop framework.

**Storage**: Bounded UTF-8 JSON candidate/journal documents, verified retained package files and owned-file backups. Existing settings format1 and history SQLite applicationId0x4c4d4701/userVersion1 stay unchanged.

**Testing**: Rust transaction/CLI/state tests, Node package/guard/evidence tests and all existing eight isolated hosted qualification scopes. Build paired candidates in preparation; no second full application compilation during qualification.

**Target Platform**: Windows x86_64 Full user/machine and Lite, Ubuntu24.04 x86_64/X11 Full/Lite, macOS15 arm64 Full user/system and Lite.

**Project Type**: Native desktop application with companion recipient CLI.

**Performance Goals**: Existing660s target/900s hard qualification limit and15s finalization reserve; separate preparation/qualification/combined times.

**Constraints**: No project signing/notarization, no workstation focus, no release/tag publication, no manual /usr copying, no MSI-owned raw-file replacement. Failed operations retain recovery evidence. Public docs describe contracts without slice links.

**Scale/Scope**: One explicit supplied-candidate transaction, one elected destination/scope at a time, bounded manifests, no background service.

## Constitution Check

Pre-research and post-design gates PASS: local-first recipient workflows, physical ownership/inventory checks, non-destructive state handling, native package ownership, exact source provenance, version alignment, headless local execution, timed native verification, and owner squash-merge boundary remain enforced. Existing legitimate read-only Lite browsing must not gain a writable-location prerequisite. No governed brand bytes change. No constitution exception is requested.

## Architecture and recovery boundaries

The shared engine validates old/new descriptors, retains inputs, serializes a durable journal and locks an owned transaction directory. Candidate identity includes version, generation, edition/OS/architecture, source and artifact/inventory hashes. Revalidate retained records and actual physical files on every resumed command.

Direct inventories switch only inventoried application entries, never a Lite gallery directory. Whole macOS .app replacement may retain the complete verified bundle; unchanged foreign extras cannot be erased. Native Full adapters invoke the real installer, wait for terminal status and then independently verify registration, payload, native identity and integration. Windows inventory-shape changes and legacy helpers use recoverable native uninstall/install rather than violating MSI component rules. Debian uses unpack/configure and retains both complete archives.

Named durable boundaries:

1. **Prepared**: validated old/new identities, compatible selected state, complete retained inputs and verified stage; live old files unchanged. Persist before any destructive action.
2. **Applying / PriorRetained**: journal authorizes switching; old owned bytes are retained before each live removal. For direct files, each path can be old at live, old at backup, or new at live. Native adapter records command intent before launch. Debian Unpacked is an explicit observable sub-boundary before configure.
3. **CandidateActivated / Verifying**: selected candidate is physically present, but success is provisional until exact inventory, ordinary native identity and integration are independently checked.
4. **Committed**: verified selected candidate and terminal operation receipt are durable. Retained prior inputs remain available for explicit compatible rollback.
5. **Restoring / Restored**: restore only verified prior owned bytes through the same native owner or direct-file rules. Verify the old candidate before terminal restored success.
6. **Incomplete / Conflict**: retain all material and explain the observed missing/active/tampered state. Never infer service termination from client timeout.

Recovery reconciles physical inventories even when mutation completed before the next journal write. For every owned path, present bytes must equal old or new inventory, or an explicitly recorded retained/staged copy must supply the missing content. Unknown bytes, changed parents, foreign ownership or invalid records block further mutation. Repeated recovery observes already-selected exact state and returns the same terminal outcome. An operation lock does not prove app inactivity or a native installer stopped; each is separately observed. No strict device-power-loss durability claim follows from filesystem flushes alone.

Compatibility preflight uses the ordinary application's existing parsers in a finite read-only probe. Explicit selected profile/history/portable paths are checked before activation; elevated system operations do not substitute root HOME for the recipient. Other profiles remain untouched and ordinary application writers retain their own per-profile compatibility checks. Future/foreign/corrupt state blocks activation rather than repair/reset. There is no new migration in this slice.

## Project Structure

### Documentation

specs/020-upgrade-recovery contains spec, plan, research, data model, contracts/recipient-update.md, quickstart, tasks, verification and measurements. Reviewer-owned checklists gate implementation.

### Source

- crates/gallery-update/: shared native transaction library and lmg-update CLI.
- crates/windows-package/src/: existing scoped installer authorization and independent observation.
- crates/macos-package/src/: receipt validation and helper integration.
- apps/gallery/src-tauri/src/: read-only state compatibility probe using current parsers.
- scripts/*-packages.mjs and linux-package-guard.sh: ordinary paired preparation, native transitions, interruption campaigns and evidence readback.
- tests/: package/guard/provenance/evidence regression tests.
- docs/v0.0.0/installation-and-distribution.md and configuration-and-state.md: authoritative recipient contract.
- CHANGELOG.md: concise change history.

**Structure Decision**: Share only transaction/identity/inventory/locking logic. Keep platform-native ownership and integration adapters in existing package modules.

## Complexity Tracking

No constitution violations. A shared small native coordinator is necessary because Lite cannot require Node/Python/Rust at recipient runtime and three independent journal implementations would diverge.

## Implementation refinements

Native MSI/dpkg mutation runs in an independent headless supervisor with its own destination lease and durable intent/client/terminal records. Coordinator termination does not kill that supervisor or establish native service termination. Recovery observes its terminal receipt before mutation. Finite read-only identity/state processes retain separate deadlines.

Windows transaction storage uses atomically created protected owner/DACL records. User/Lite defaults to the current user profile .local-media-gallery-updates; machine defaults to ProgramData/LocalMediaGalleryUpdates with Administrators ownership and elevated membership. Existing foreign storage is refused without ACL repair or takeover. Sensitive staged files receive explicit ACLs and native MSI inputs remain locked against write/delete.

Direct displacement uses an exclusive rename to a deterministic sibling of each live file. This keeps renames on the live filesystem when retained storage is on another drive. Revalidate displaced bytes before deletion; unknown bytes remain for diagnosis. Reconcile missing live paths from complete verified retained copies. macOS integration receipts use the same exclusive sibling protocol, physical bounded handles and expected UID/mode checks. Exclusive rename does not provide a filesystem-wide compare-and-swap against arbitrary concurrent external writers.

Legacy 0.0.0 binaries lacking the state probe may use the other supplied 0.0.0 writer to validate the unchanged format1/history contract. This exception does not authorize a future-version downgrade or migration. Legacy native package transitions use native removal/install when the old guards cannot authorize modern partial-state repair; legacy foreign private application content refuses before destructive replacement.

Windows inventory passes pin each unique physical directory once, retaining no-delete handles until all leaf hashes are checked. Retained staging reuses that namespace rather than reopening the same ancestors for each notice file. Each ACL pass resolves the effective owner/principal policy once, while reading every file security descriptor afresh. These are per-pass objects, not persisted validation caches; current invocation, leaf bytes, ACLs, native identity and flush requirements remain independently checked.

For same-version Windows Full candidates with protocol1, compare actual read-only MSI Component, File layout, Feature, FeatureComponents, Directory and ProductVersion rows while both retained archives are hash-locked. Equal layouts use native recaching with REINSTALLMODE=vamus. Proven independent Application/Payload/Notices feature membership permits selecting only integration and groups with changed or missing owned files; unrecognized legacy feature layouts retain REINSTALL=ALL. Legacy, version, product, scope or layout differences retain verified native remove/install. File sizes/versions/cabinet bytes may change; component GUIDs/key paths/feature membership may not. The actual-pair regression mutates a disposable MSI component GUID and proves the originals remain unchanged.

Windows native reinstalls query the installed scope's recorded PackageName through the read-only source-list API. Each native job creates a private, hash-verified source copy under that basename in its own retained directory, records its candidate/header binding and keeps the input/parent handles through native completion. This preserves source resolution without changing system policy or editing the Windows Installer cache.

Recovery CLI commands load the bound authority and execute one complete integrity pass immediately before observation/mutation. The standalone open API retains its complete-validation contract. Candidate inventories use at most eight read-only workers with bounded64KiB streaming hashes; private ACL and byte checks share the same per-file pass. Windows registration/integration observation follows the already checked candidate inventory instead of repeating all file reads. Native supervisors still validate independently before launching an installer.

Installed-writer state compatibility is checked before retaining candidate bytes. Legacy0.0.0 writers without the finite probe defer to the existing retained compatible-writer check. Windows large inventories stage with at most eight independent copy workers after physical private parents are created and pinned; each copy retains exclusive publication, content checks, protected ACLs and its file flush. Every worker joins before the journal is published. Completed independent transaction evidence snapshots copy concurrently and all results are awaited.

Read-only independent campaign leaf observation uses at most eight workers, retains descriptor order in its receipt and waits for every worker before reporting a result. Every original size/hash/type/mode/UID/GID assertion remains elected.

Windows physical validation reuses one pinned ancestor namespace per staging/archive/reconciliation pass while inspecting every leaf for links/reparse attributes. Missing installed directories remain valid observations for recovery through the original physical walk. Pins end before native mutation. No ancestor cache persists across commands or permits directory replacement while a pass is active.

Operation, destination and independent-native leases explicitly unlock when their owning guard ends. A surviving duplicated or inherited descriptor cannot extend an already-ended owner lease. Contenders still acquire the actual native lock before proceeding, and a live native worker retains its independent guard until its real client completes.

MSI application files and third-party notices are independent top-level features, with integration in Application. Compare the actual Feature/FeatureComponents/File rows to the deterministic file/component identifiers before selecting groups. Force selected groups to retain same-version and downgrade behavior; ADDLOCAL also restores missing selected features. The native supervisor computes selection from current physical files, and full post-install inventory/integration checks still determine success. A registered selected package with missing owned bytes uses the same native reinstall/repair path.

Completed immutable Windows evidence snapshots use fresh exclusive destination files and eight bounded copy workers after a physical regular-file tree walk. Independent payload verification retains every fresh ancestor, missing-file, size and hash assertion with eight read-only workers. All workers join before success or failure; snapshot receipt validation still independently checks every retained transaction byte. No case, qualification boundary or integrity assertion is removed.

Linux ordinary native readiness observes both a visible usable media action and an enabled settings disclosure within the original20s startup budget. Discovery can precede asynchronous settings resolution. After readiness, the existing portable-precedence assertion requires the visible enabled Hide controls action; an enabled Show controls value is immediately ready for that assertion to reject.

All three ordinary native observers share enabled-settings readiness before checking portable precedence. Windows/Linux consume their existing native enabled/visibility fields; macOS records AXEnabled through the existing read-only attribute accessor. Original20s macOS/Linux and25s Windows startup budgets stay fixed, and enabled wrong values still reach the unchanged expected-portable assertion immediately. Windows failure logs retain the last native control tree.

Windows ordinary observations run through one owned hidden PowerShell pipe session. Its attributed handshake binds PID and exact UI/shortcut script hashes; every invocation verifies unchanged source and runs in a fresh child scope. Only compiled declarations are reused. Accessibility records, pixels, process identity and read-only shortcut fields are reacquired for every request. Registry/MSI observations retain independent fresh processes. Original per-query/startup/qualification deadlines remain fixed; malformed responses, wrong identity, output overflow or an indeterminate action timeout terminate only the owned observer without replay. EOF joins the observer before campaign completion.

Independent Windows ownership units run concurrently with the ordinary package campaign after readiness, under the same absolute qualification deadline. Units use unique disposable transaction roots and MSI mutation copies; actual prepared MSI inputs are read-only, and units perform no native installation or desktop interaction. Both branches retain named start/terminal/result records and are always joined, including failures. The final independent package/source validator starts only after both branches pass. No elected work moves into preparation and no deadline changes.
