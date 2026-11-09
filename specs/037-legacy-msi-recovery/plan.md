# Implementation Plan: S037 legacy Windows MSI removal and recovery

**Branch**: codex/s037-legacy-msi-recovery | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

## Summary

Reproduce #97 with immutable published MSI bytes, identify its controlled trigger, and deliver supported ownership-preserving recovery plus regressions. Current ordinary MSI maintenance already verifies registration/payload independently of the legacy ExW check. Old published REMOVE=ALL preflight always reaches that check, so a current fallback alone cannot repair old removal.

Start with an isolated diagnostic-only Windows matrix through the existing native-desktop workflow. Investigate authenticated repair through the existing recovery journal using a genuine short-name alias to the same pinned directory, followed by ordinary removal. This is a hypothesis until native proof. Do not suppress ownership checks or adopt a materially new transform/patch authority without explaining its benefit, burden and alternatives to the owner.

## Technical Context

**Language/Version**: Rust 1.96.0, Node 24.11.0, PowerShell 7 and Python 3.12 for installed Spec Kit.

**Primary Dependencies**: Existing Windows Installer APIs, scoped gallery-update/windows-package guards, external Windows observer and GitHub Actions.

**Storage**: Existing canonical scoped journals, immutable installer/payload inputs and protected scratch/leases; ignored diagnostic receipts under .local.

**Testing**: Node/Rust ownership regressions, isolated hosted native MSI matrix and the unchanged final Qualification scope set.

**Target Platform**: Windows x86_64 MSI maintenance. Other elected product/site/platform scopes remain in final CI.

**Project Type**: Existing desktop application and native maintenance tooling.

**Performance Goals**: Finite diagnosis separate from acceptance; preserve readiness, 660/900-second qualification clocks, 15-second reserve and separate preparation accounting.

**Constraints**: No workstation installer/GUI, mutable canonical release assets, blanket registry edits, disabled ownership checks or new signing requirement.

**Scale/Scope**: One issue, exact published v0.1.0, independent other-version controls, a bounded path matrix, supported recovery and documentation.

## Constitution Check

Pre-research and post-design checks pass. Owner scope is explicit; work is proportional; physical identity and retained data remain authoritative; diagnosis is not acceptance; standard checks and full final hosted CI remain elected. Explicit push/PR authorization overrides the skill's default pre-push stop. Owner merge and publication remain separate.

The planned engineering experiment determines the precise adapter inside the existing maintenance contract. A materially new patch/transform architecture is not preapproved. No unresolved owner scope question blocks the diagnostic phase.

## Project Structure

- Planning: specs/037-legacy-msi-recovery/spec.md, plan.md, research.md, data-model.md, quickstart.md, tasks.md, checklists/ and contracts/recovery.md.
- Diagnosis: scripts/diagnose-msi-registration.mjs, diagnose-msi-upgrade.mjs and .github/workflows/native-desktop.yml.
- Implementation: crates/windows-package/src/ and crates/gallery-update/src/.
- Acceptance: scripts/test-windows-packages.mjs, windows-package-evidence.mjs and existing Node/Rust tests.
- Documentation: docs/unreleased/legacy-msi-recovery.md and CHANGELOG.md.

**Structure Decision**: Reuse existing maintenance authority and observer. Extend the registered diagnostic workflow rather than add another qualification pipeline.

## Chronological delivery

1. Complete Spec Kit artifacts, peer requirements review and read-only analysis.
2. Add diagnostic contract regressions and a bounded hosted matrix. Supply nonblank artifact_run with platform=windows to avoid the self-hosted desktop path.
3. Observe original failures and independent path/version controls. Finalize the supported adapter from native results before production mutation code.
4. Add failing ownership/identity/alias/recovery tests; implement the evidenced adapter and any current lookup correction actually required.
5. Elect exact affected-case removal, replacement, rollback/recovery and subsequent removal in existing acceptance while preserving prior negative and retained-data checks.
6. Update source docs/changelog, run local CI-parity checks, publish the official PR and complete hosted CI and at most two review rounds.
7. Record final hosted acceptance on the PR without a completion-only rebuild; halt for owner merge.

## Complexity Tracking

No constitution violations. Existing authenticated repair/aliases remain hypotheses until native proof. A new patch/transform authority requires an explicit architecture discussion.

## Evidenced adapter decision (2026-11-09 UTC)

The alias repair hypothesis is rejected by exact native observations. A metadata-only MSP built with the existing pinned WiX Torch/Pyro tools applied successfully to the affected exact v0.1.0 installation in run 42541702915, preserving original ProductCode and PackageCode. Native MSI owns patch registration; original published bytes remain unchanged.

Adopt a per-published-payload MSP that adds a compiled LegacyRecovery binary and an early known-folder configuration action, and redirects only Preflight to its explicit legacy entrypoint. The existing ownership binary and deferred VerifyInstalled remain intact. The replacement guard independently checks exact scoped native product/package/component/client identity, physical paths, compiled original payload/manifest and integrations; ExW UNKNOWN alone never grants authority. Only metadata/Binary/CustomAction/sequence differences are allowed. File, Component, Directory, Feature, Registry and Environment tables remain identical. Native patching is a supported installation entrypoint and existing managed worker removal applies the authenticated retained patch before original removal when needed. No generic patch-application service or arbitrary patch input is introduced.

The original immutable legacy payload can be embedded while building each patch before current payload assembly, avoiding a payload hash cycle. Patch files are authenticated members of current Full payload and retained transaction inventories. Published documentation/version/asset contracts are not changed by this source slice. Owner recovery instructions describe the development candidate and existing native MSI/MSP entrypoints. Full final qualification covers application/removal, retention, replacement/restoration and refusals.

This native servicing mechanism was surfaced in commentary after the simpler supported repair failed. It is the supported option with the strongest current evidence, uses existing tooling and authority, and stays within the authorized recovery scope. Autopilot chooses it without a routine permission stop.
