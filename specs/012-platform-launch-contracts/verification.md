# S012 Verification

## Setup and specification (2026-10-25)

Base92563aeb36092a3e082df00b3ccea19abb47b024; branch codex/012-platform-launch-contracts; selector specs/012-platform-launch-contracts; issues#5/#7. Installed Spec Kit1.0.8, skills mode/Python, sequential numbering, hyphenated commands. No extensions.yml/hooks. Actual template resolver and clarify prerequisite helper used. Requirements checklist16/16 after five autonomous clarifications; custom platform-launch checklist12unchecked reviewer-owned criteria. Owner explicitly authorizes publication and up to two review rounds; final review/merge remains owner-controlled. No S012 implementation acceptance yet.

## Design analysis and implementation gate (2026-10-25)

Actual setup_plan/setup_tasks and prerequisite helpers used. Three required read-only research agents resolved platform, launch and proof design. Read-only analysis covered14FR+6SC across29tasks (100%),no unmapped tasks/constitution conflicts. I1(high) placed hosted acceptance before publication; fixed T027 publication → T028 hosted acceptance. D1(low) duplicated compiled-edition ownership; T007 introduces it,T011 reuses it. Read-back analysis finds0remaining critical/high/medium findings. Requirements16/16; custom checklist0/12 reviewer-owned, markers unchanged. Explicit owner autopilot/proceed authorization governs continued implementation without another pause.

## Test-first path and launch contracts

Exact native-path tests first failed with absent shared type/fields, then3passed after codec/snapshot/session attribution. Additional pending-selection regression proved the need for per-discovery session attribution: a failed pending selection retains the usable old session but must not label that session as the failed request's result. Five parser/placement/native-argument/status/receipt tests failed before launch module implementation, then passed. Full integration and bounded IO adversarial tests follow; no S012 acceptance claimed yet.

## Boundary and artifact regressions

Four owned operation/platform/schema/proof-integrity tests failed before missing definitions/helpers, then passed. Eight launch tests reproduced and fixed a queued-acknowledgement/child-exit race; stalled/oversized/slow-drip reads remain bounded. Edition bundle/state regression failed before introducing distinct compiled bundle identifiers and explicit reuse of product settings/history location, then the complete9-test launch suite passed in both Full and Lite builds. Actual native launch suite failed on preserved S011 binary at --version --json as expected. Current four-artifact builds and native integration remain pending.

## Initial integrated preparation

The first complete preparation rebuilt all four native variants and exported the site/matrix, then correctly failed before readiness on two new Clippy warnings (items_after_test_module and collapsible_if). Preparation61.172s,qualification0s,combined61.172s; no timed checks ran and no acceptance claimed. Move the notification function before tests and collapse the conditional rather than suppressing either lint. Correct the public placement-error exit description to the implemented failure category.

## Complete code acceptance before final documentation consistency

All14elected checks passed on source 8e634b9de725af2971db8e682aeba89de74863a728f5a08732fb3204c0e73331 (1000files), including75Node,36core,45Full/45Lite,31renderednative,6launchgroups,10extractedCLIchecks/edition,normalFull/Lite exclusion,website/browser,measurements andprovenance. Preparation44.374s,qualification214.377s,combined258.751s. Final cross-chapter consistency scan found two architecture sentences still describing U-08 as unsettled; replace them with links to the settled contract and rerun complete qualification against final normative source. Preserved .local/s012-code-qualified.json separately.

## Final normative source local acceptance

PASS all14elected checks on d7b7b19a787e8b008af321c52591189bfb7dcdd6a6c5aa212ef56c56f1b64dac (1000files). Preparation38.242s,qualification203.859s,combined242.101s; terminal 2026-10-26T00:40:05.695Z. Target660s/hard900s/reserve15s respected. Includes75Node,36core,45Full/45Lite,31renderednative,6Full/Litelaunchgroups,10extractedCLIchecks/edition,bothnormalartifactwindows/listener/private-hookexclusion,288websiteartifacthashes,renderedbrowserchecks,3measurementtrials andsource/brandintegrity. Full native functional/launch/measurement hashes agree; each edition launch hash matches its native-test binary; each normal proof hash matches ordinary-window acceptance. Local proof revision is the base92563ae working-tree source; digest binds final uncommitted content. Hosted receipts will bind committed PR merge revision separately. No final installer or native Linux/macOS GUI claim.
