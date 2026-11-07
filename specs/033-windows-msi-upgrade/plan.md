# Implementation Plan: ordinary Windows MSI upgrade repair

**Branch**: codex/s033-windows-msi-upgrade | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

## Summary

Reproduce the exact published v0.2.0-to-v0.2.1 ordinary MSI wizard failure on an isolated Windows host. Preserve its original observation, identify the causal directory/token/sequence condition with controlled cases, implement the smallest installer compatibility repair and elect the same ordinary upgrade as a regular regression. No published installer is overwritten and the owner retains merge authority.

## Technical Context

**Language/Version**: Existing Rust toolchain, Node 24.11.0, PowerShell 7, WiX 3 pinned inputs and Windows Installer.

**Primary Dependencies**: Existing MSI authoring/native ownership library, immutable release acquisition, observer protocol and isolated hosted workflow.

**Storage**: Local isolated test products and retained source-bound JSON/log/PNG evidence. Existing application/private data formats remain unchanged.

**Testing**: Node regression tests, Rust/native cases, actual published baseline full-UI failure and repaired candidate full-UI success, existing cross-platform CI.

**Target Platform**: Windows x86_64 MSI. Available isolated host is Windows Server 2025; no registered isolated client runner exists. Client proof is not inferred from Server execution.

**Project Type**: Desktop installer and qualification tooling.

**Performance Goals**: Existing qualification target 660 seconds, hard limit 900 seconds and finalization reserve 15 seconds. Preparation and qualification clocks remain separate.

**Constraints**: Preserve exact published bytes, existing ownership/data checks and the owner's active installer state; no local UI automation. At most two hosted Codex review rounds. PR and diagnostic branch pushes are authorized; release/merge are not.

**Scale/Scope**: One reported predecessor upgrade, adjacent scope/choice/cancellation integrity cases and the existing full qualification matrix.

## Constitution Check

Pre-research: PASS. Explicit owner scope, installed Spec Kit, isolated verification, source/history preservation and review boundary align with all five principles. No new stack or product policy.

Post-design: PASS. Reproduction uncertainty is retained as a test gate. Source repair is chosen only after causal evidence; material changes to this design require amended artifacts and another analysis pass. No product/guard changes precede the blocking analysis.

## Project Structure

- specs/033-windows-msi-upgrade/: specification, plan, research, data model, contract, quickstart, tasks and chronological verification/measurements.
- scripts/diagnose-msi-upgrade.mjs and .github/workflows/native-desktop.yml: bounded isolated published-pair diagnostic, with existing modes retained.
- scripts/test-windows-packages.mjs and scripts/windows-msi-ui.ps1: ordinary upgrade wizard regression and attributed failure observations.
- packaging/windows/installer.wxs and crates/windows-package/src/native.rs: affected native authoring and ownership path, only changed as actual diagnosis requires.
- scripts/windows-package-evidence.mjs, scripts/windows-package-cohort.mjs and tests/: elected evidence and meaningful contract/negative regression coverage as necessary.
- CHANGELOG.md: unreleased repair and dated workflow decision.

## Execution Design

1. Acquire canonical published v0.2.0 and v0.2.1 inputs, verify all relevant bytes and use the existing legacy container reader to obtain the old native MSI without executing its EXE. Use the registered diagnostic workflow's new optional mode to avoid rebuilding applications for baseline research.
2. Install v0.2.0 at its default machine location; preserve identities and selected integrations. Launch v0.2.1 with ordinary full UI and no scope/location/feature overrides, retaining log/dialog/terminal evidence. Controlled cases vary only necessary directory attributes, client token/elevation and UI mode. Read-only owner observation identifies CommonPrograms as ReadOnly/Directory/NotContentIndexed; that state must be represented in isolation before declaring non-reproduction.
3. Establish the causal boundary. First evaluate correct native directory authoring/costing compatibility, then current installer sequencing/context as indicated. Do not blindly suppress the legacy action, change the owner's shell folders, mutate published bytes, bypass ownership or invent manual removal. If a different corrective mechanism is necessary, record its exact authority, preservation behavior and counterexample before coding it.
4. Write failing-before regression, implement the minimal demonstrated fix, then repeat the ordinary wizard under the same starting conditions. Verify retained scope/location/choices/native identity/application launch plus private/gallery/foreign byte preservation and cancellation/refusal behavior.
5. Elect the ordinary upgrade in current shared package qualification using existing acquired predecessor inputs; retain existing recovery and quiet tests. Preserve common clocks and source/artifact boundaries, then run all mandatory CI and bounded hosted reviews.

## Decisions

- The baseline diagnostic is separate from acceptance. It may retain a known broken product result while its collection job succeeds, but it cannot be represented as a product pass.
- Reuse existing Windows observer attribution and immutable container acquisition. Do not build an unrelated installer framework or make owner troubleshooting part of product use.
- Ordinary upgrade wizard assertions follow the predecessor's saved choices; fresh-install defaults remain separately verified.
- Published snapshots and 0.2.1 assets stay immutable. This PR is the repair candidate; a future version/publication decision remains separate.
- The source fix is evidence-driven; the plan constrains admissible repairs rather than promoting a speculative root cause to fact.

## Complexity Tracking

No constitutional exceptions or new service/data schema is required. The only workflow expansion is an isolated diagnostic mode and an elected ordinary upgrade regression.

## 2026-11-06: post-reproduction design amendment

Add crates/windows-package/src/msi_elevation.rs for the narrow UI-only legacy machine authorization handoff and pure decision/exit/argument tests. Invoke it from a dedicated native export in InstallUISequence after Configure but before FindRelatedProducts/ExecuteAction. Pin the session-authenticated source while the actual native administrator child runs; record its original exit and return 259 only on success, 1602 on native/user cancellation, and 1603 with diagnostics otherwise. A 3010 child sets native reboot-at-end before skipping the original transaction. Keep existing guard and deferred verification code unchanged in the child. The ordinary limited-token regression must prove one replacement and source/profile/byte identities; actual client/consent limits remain literal.
