# S038 qualification repair implementation plan

Date: 2026-11-09. Issue: #118. Branch: codex/s038-windows-qualification-repair.

## Summary and technical context

Internal Node.js 24 and PowerShell 7 CI harness repair. Keep the existing MTA owned observer, two Windows workers, JSON fragment/receipt reconciler, SHA-256 source identity, isolated hosted native desktop and exact artifact readback. No dependencies or public interfaces change.

## Constitution check (before and after design)

Pass: owner publication authority preserved; final code merge remains owner-controlled. All required native behavior and data/provenance checks remain mandatory. The 660/900/15 clocks remain exact and initialization is counted within the same absolute deadline. No workstation native execution. Existing published evidence remains readable. Planning stays internal; product/docs/schema version remains 0.3.0. UTF-8 without BOM and LF required.

## Design

1. Add optional ordinaryUpgradeWorker marker to new build packets, elected lifecycle. Shared selector defaults only absent markers to historical experience; explicit invalid values fail. Execute the complete ordered group once at the elected worker's clean point. For lifecycle, place it after prepared-recipient verification and before final receipt creation. Keep 29 lifecycle checks and all existing native rows.
2. Combiner selects ordinary rows from the elected worker. New explicit assignment requires ordered exact predecessor versions, matching singular alias, and no ordinary rows on the other worker. Historical packets keep existing behavior. Complete byte validator remains authoritative.
3. Add Initialize switch to the existing hash-bound MSI UI script. It loads assemblies and compiles the existing type once, then returns readiness, PID, MTA and script hash before any desktop enumeration. Add fixed msi-initialize route to both server/client source maps. Invoke once with 60-second allowance through existing request API, clipped to the existing campaign deadline. Ordinary MSI calls retain 20 seconds; no retry.
4. New build marker msiObserverInitialization=explicit-v1 requires both fragments to carry a validated initialization proof matching their owned observer identity and MSI source hash. Old packets without marker retain old reader behavior. Fail unknown markers.

## Research and alternatives

See research.md. Moving one predecessor leaves too little final-gate time. Increasing hard deadline or dropping tests is rejected. A separate helper file adds transitive hash complexity; retain one source-verified script. Warming UI locally is prohibited. No new worker fleet or background daemon.

## Structure and delivery

Touch scripts/windows-package-cohort.mjs, windows-package-observer.mjs, Invoke-WindowsPackageObserver.ps1, windows-msi-ui.ps1, test-windows-packages.mjs, build-windows-packages.mjs, affected tests and CHANGELOG.md. Test before implementation, run npm check/test, push focused PR, resolve hosted review/CI, hand off for owner merge. Only then accept new trusted-main artifacts and resume authorized publication.
