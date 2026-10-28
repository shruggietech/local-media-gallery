# Implementation Plan: Windows Full installation and Lite packages

**Branch**: `codex/015-windows-packaging` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

## Summary

Complete #22 with ordinary release Full/Lite binaries, two scope-specific Windows Installer packages and small trusted prerequisite entrypoints. Windows Installer owns copying, rollback, registration and selective removal. Project preflight/read-back adds actual ownership and identity checks, not another installation engine. Preserve S014's native campaign and add an independent Windows package campaign on its own isolated machine.

## Technical Context

- Language/runtime: Rust1.96/edition2024, existing Tauri2.12.5 product, Node/Python maintainer tooling and Windows Installer.
- Primary dependencies: existing MSVC/WebView2 baseline; portable WiX3.14.1, pinned by immutable release bytes, with its archived tooling disposition recorded. Project-authored MSI tables avoid stock Tauri's unsafe compatibility-uninstall discovery and machine-only template assumptions.
- Runtime provisioning: pinned Microsoft bootstrapper1.3.303.7, exact bytes/hash and valid Microsoft signature checked before use; native API result is verified afterward. A real process-local native-loader failure is elected for negative handling. Physical clean absence/provisioning is explicitly unqualified on a server that may require WebView2.
- Storage: application-owned installation files/registrations separate from existing SQLite/settings/gallery state and shared runtime. No new media catalogue.
- Testing: preserve existing check/test/app/site/normal proof/native media/accessibility. A required windows-packages job builds ordinary release candidates, exercises both scopes and Lite through external UIA/native image observations, audits actual installed/extracted identities and independently reads archives. No private test hooks ship.
- Target: Windows x86_64; approved client baseline and precisely recorded hosted proof. Default user scope and explicit machine scope.
- Project type: native desktop product with installed and portable editions.
- Performance: verified prerequisite readiness, target660s/hard900s qualification,15s reserve, separate preparation/qualification/combined accounting and terminal timestamps.
- Constraints: no local GUI/input/install/uninstall/runtime provisioning; no release/tag/merge; no undeclared recipient tools or blanket support claims.
- Scope: #22 only, candidate artifacts0.0.0; preserve cross-platform behavior and existing security/integrity/provenance checks. Other packaging/release issues retain their own scope.

## Constitution Check

Owner-directed scope passes: #22 and S015 are explicitly confirmed; the established publication/review protocol continues. Research selects only among allowed package mechanisms and records rationale. Proportionality passes: reuse the native application and standard installer mechanisms; avoid a second application or installation framework. Data/brand integrity passes: UTF-8/LF, governed bytes unchanged, existing names/assets. Verification passes conditionally on mandatory real package journeys and exact-source evidence. Publication boundary passes: automatic push/PR is authorized; product release/tag/merge is not. Recheck after design and analysis before implementation.

## Project Structure

- Planning: `specs/015-windows-packaging/{spec,plan,research,data-model,quickstart,tasks,verification,measurements}.md`, `contracts/`, `checklists/`.
- Existing product: `apps/gallery/src-tauri/`, `crates/gallery-core/`, versioned docs/contracts. Keep the ordinary application's global install command unavailable; the new candidate entrypoints are separate.
- Native installer support: `crates/windows-package/{Cargo.toml,build.rs,src/lib.rs,src/native.rs,src/bin/setup.rs}` for shared manifest/ownership logic, read-only MSI preflight, deferred post-copy verification and scoped prerequisite launchers. No media/file installation engine is duplicated.
- Package authoring: `packaging/windows/installer.wxs`, `packaging/windows/inputs.json`; generate user/machine variants from one controlled template. User setup is asInvoker; the separately selected machine entrypoint declares administrator execution through the OS. No custom elevation broker.
- Maintainer build/evidence: `scripts/windows-packages.mjs`, `build-windows-packages.mjs`, `windows-package-evidence.mjs`, `inspect-windows-package.ps1`, plus existing normal payload assembly. Reuse its notices/inventory and correct stale optional-provider prose.
- Native qualification: `scripts/test-windows-packages.mjs`, `windows-package-ui.ps1`, `scripts/ci.mjs`, `.github/workflows/ci.yml`; isolate installer mutations from the existing product-windows VM.
- Focused existing-harness correction: `scripts/native-driver-lifecycle.mjs`, `test-native.mjs`, `test-preparation.mjs` for bounded owned shutdown, per-launch WebView profile isolation, available listener allocation and actionable startup diagnostics. Preserve existing assertions/deadlines; merged-main exposed preparation-driver startup failure after31 browsing cases passed.
- Public contracts/docs: `schemas/v0.0.0/windows-packages.schema.json`, installation/platform/verification guidance, index/status and CHANGELOG. Keep package records unpublished candidates and all versions at0.0.0.

## Design decisions

1. Full ZIP carries user/machine MSI packages, user-default and explicit-machine prerequisite launchers, pinned vendor input, identity and notices. Lite ZIP places its executable at the gallery root. Shared-runtime and optional payload footprints are separate from application bytes.
2. MSI uses explicit File/Component/Registry/Shortcut/Environment rows and nonrecursive empty-folder removal. No wildcard deletion, unknown registry uninstaller execution or automatic MajorUpgrade. Registered product/package/component identity and actual current integration determine ownership; display names and loose markers alone do not.
3. Native read-only preflight occurs before destructive installation/removal. The standard engine applies owned changes; deferred read-back verifies files and integration before final commit. Entry points verify packaged input hashes and installed results. Unsupported replacements report recovery state instead of assuming success.
4. Actual PATH integration is scope-specific and appends/removes only the owned directory segment. Native qualification derives a fresh effective environment from actual registry data, not a test-injected install directory. Existing foreign commands/shortcuts/registrations are collisions.
5. Shared Evergreen remains independent. The bootstrapper input is pinned; the downloaded Evergreen version is observed, not claimed pinned. Controlled native API absence is not physical clean-machine proof. Use actual browser-child path/scope where attributable for runtime footprint; ambiguity is null plus reason.
6. Optional FFmpeg stays separately selected. Normal browsing needs no Node/Python/Rust/FFmpeg or chosen browser. Package candidates use release profiles; existing debug/native proof remains a distinct preserved scope.
7. Both launcher/helper PE files and app payloads receive actual dependency/architecture/signing audits. Windows system DLL search hardening is elected where only system imports are declared, preserving arbitrary gallery content rather than adding filename eligibility rules.
8. Native UIA observes ordinary recipient binaries, real decoded fixture pixels, roots, relocation and manual Refresh. Normal builds use actual CI-profile state; compare retained state immediately before/after uninstall because browsing may legitimately update history.

## Post-design Constitution Check

Pass: scope is the confirmed issue, all construction choices are within the approved Windows policy, Windows Installer remains the standard engine, user media/state are outside ownership, source/version/brand integrity is retained, actual candidate and native observations are mandatory, and no local installer/GUI or unapproved release/merge occurs. Source/publication/review boundaries remain explicit. Research uncertainties are resolved in research.md; blocking analyze follows task generation.

## Chronological execution

1. Housekeep merged S014, retain outstanding receipts, independently audit all six archives and mark #18/#19 Done.
2. Specify S015/#22, clarify the five behavior boundaries and generate built-in/custom checklists.
3. Research standard Windows installation, shared-runtime provisioning and ordinary recipient qualification; select the smallest compliant mechanisms.
4. Complete design/contracts/quickstart, generate mapped tasks and pass blocking analyze.
5. Implement meaningful failing regressions first, package candidates and integrate mandatory isolated native journeys.
6. Freeze source, qualify exact artifacts and record footprints/identity/timing and explicit support limits.
7. Push/open official PR automatically, track #22 In progress/PR review as appropriate, handle at most two S015 review rounds and all findings, then await owner final review/merge with green applicable CI.

## Process notes

The installed checklist helper requires plan.md. Its template was resolved before checklist generation only to satisfy that structural prerequisite; technical planning/research begins after the completed checklist stage. Helpers receive explicit SPECIFY_FEATURE and SPECIFY_FEATURE_DIRECTORY so reported branch, actual codex branch, selector, directory and S015/#22 agree. No hooks are installed. Existing owner authorization supersedes the autopilot skill's default pre-push pause.
