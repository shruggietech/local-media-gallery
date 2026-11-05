# Implementation Plan: Windows MSI installation experience

**Branch**: `codex/s030-windows-msi-installer` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: S030, issue #89. Implement and qualify one offline Windows Full MSI, publish the PR and stop for owner merge.

## Summary

Replace the ordinary Full EXE with one dual-purpose MSI. Author native WiX dialogs, independent integration features and context-aware ownership. Embed the complete pinned WebView2 standalone installer as a separate MSI Binary stream alongside a small native helper; provision through deferred custom actions in the resolved installation context. Preserve sealed concrete-scope maintenance authority and exact published predecessor compatibility. Give each payload generation a distinct deterministic ProductCode under one stable UpgradeCode, so an ordinary replacement MSI enters the native major-upgrade transaction without requiring command-line reinstall flags.

## Technical Context

**Language/Version**: Existing Rust workspace, Node 24, PowerShell 7 and WiX 3 toolchain.

**Primary Dependencies**: Windows Installer, Win32 tokens/registry/process APIs, pinned Evergreen WebView2 standalone installer, existing payload and update crates.

**Storage**: Native MSI registration/features and existing context-scoped private sealed journals/receipts. No new profile-root storage.

**Testing**: Node contract tests, Rust unit tests, existing isolated Windows package/native campaigns and a native wizard driver. No local GUI or installer execution.

**Target Platform**: Windows x86_64; unchanged Lite and non-Windows artifacts.

**Project Type**: Desktop application and self-contained native installer.

**Performance Goals**: Existing qualification target 660 seconds, hard limit 900 seconds, 15-second provisional reserve. Dependency progress uses real phases; no invented vendor percentages.

**Constraints**: Offline, unsigned application MSI, user install without elevation, machine install with Windows authorization. Keep source version 0.2.1 unpublished and published 0.1.0/0.2.0 immutable.

**Scale/Scope**: One public Full MSI, two concrete effective contexts, four integration combinations, repeat/repair/replace/remove/recovery coverage.

## Constitution Check

Pre-research: passed. Local-first media/sidecar/private data remain outside application ownership; all dependencies remain bundled; Full/Lite distinction and published records remain intact. User authorizes push/PR, owner retains merge/release. Signing and attended verification are excluded by owner direction.

Post-design: passed. Context-specific descriptors remain concrete even when the physical MSI is shared. Shared runtime is not application-owned and is never removed. New custom native UI consumes existing brand assets without editing governed bytes. Existing timing/evidence boundaries remain mandatory; custom requirements checklist remains reviewer-owned and is not an implementation gate under explicit autopilot.

## Project Structure

### Documentation (this feature)

`specs/030-windows-msi-installer/`: spec.md, plan.md, research.md, data-model.md, quickstart.md, contracts/installer.md, checklists/, tasks.md.

### Source Code (repository root)

- `packaging/windows/installer.wxs`: native wizard, dual context and optional features.
- `scripts/windows-packages.mjs`, `scripts/build-windows-packages.mjs`: deterministic package authoring/assembly.
- `crates/windows-package/`: ownership, scope discovery, embedded runtime provisioning and progress.
- `crates/gallery-update/`: concrete native identities, retained choices and replacement/recovery.
- `scripts/test-windows-packages.mjs`, `scripts/windows-package-evidence.mjs`, isolated PowerShell driver: actual MSI/wizard acceptance.
- `scripts/release-record.mjs`, current schema/docs/site retained inventory: version-aware artifact contract.

**Structure Decision**: Extend existing installer/maintenance boundaries rather than add a second packaging framework or surrogate executable entrypoint.

## Complexity Tracking

No constitution exceptions. Two internal effective-context descriptors may point to identical MSI bytes; this retains concrete authority without duplicate public downloads.

## Qualification refinement (2026-11-05)

Repeated closing-head campaigns exposed excessive unoptimized MSI hashing and repeated PowerShell startup. Keep basic debug units, run the same large native MSI checks with optimized binaries, and route fresh registration/runtime observations through the existing owned observer. Fixed routes retain bounded requests, scoped parameters, source-hash checks and fresh child scopes; they do not cache observed native state. The clock, mandatory cases and final integrity readback remain unchanged. Require the foreign-shortcut case to observe actual MSI exit 1603 and its preflight refusal log, rather than accepting a prior shortcut-inspection error.
