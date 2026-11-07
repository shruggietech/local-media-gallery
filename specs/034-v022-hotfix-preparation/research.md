# Research: v0.2.2 hotfix preparation

## 2026-11-06: version and snapshot inventory

Decision: Reuse product-version and committed-source snapshot capture; add new complete 0.2.2 documentation/schema/reference trees and preserve all published trees. The website package has independent version 0.1.0. Master portable settings compatibility must retain 0.1.0, 0.2.0 and 0.2.1 while adding 0.2.2.

Rationale: Runtime declarations already read the elected product version. Historical capture receipts are immutable. New v0.2.1 preservation coverage closes the existing inventory-test omission. Fix the inherited release-version 0.0.0 wording only in the new 0.2.2 interfaces chapter.

Alternatives: Global version replacement would corrupt historical compatibility and snapshots; recapturing 0.2.1 would change accepted bytes; neither is used.

## 2026-11-06: two ordinary predecessor paths

Decision: Reuse one ordinary-upgrade routine for 0.2.0 and 0.2.1, with distinct receipts/launch labels. Keep advanced recovery inputs unchanged. Modern predecessor machine installation must be explicit, and registration reads must use its actual generation ProductCode.

Rationale: The S033 validator is intentionally legacy-specific and requires an early authorized child that modern 0.2.1 does not use. New evidence must enforce both real authorization paths, every preservation and refusal check, and exactly one installed-launch record for each predecessor.

Alternatives: Duplicating the full campaign risks diverging checks; requiring legacy markers for modern replacement rejects a valid path; dropping limited-client or native state checks loses the original regression boundary.

## 2026-11-06: immutable modern input

Published v0.2.1 release.json is 12,128 bytes, SHA-256 1fe581cf724c1aab9c3451c40efd94cac78eba997112e9423aa03e29e5fbb5ce. Its source revision is 8dcaf834994b51e86be31d9cf817d816334599da and source digest ac115368a8c7355b2e8692c961fd374d3abf6fe2caa8036d6e582eee6c319329. The direct Full MSI is 245,473,280 bytes, SHA-256 f6bf1c0d500a1f55159f964144c934434882da2184631d0d7c9c923651b4a146. These were read from the actual public canonical record; no product was launched locally.

Use isolated Windows administrative image extraction for the embedded payload, followed by manifest/source/inventory verification and native MSI audit. Microsoft documents [administrative installation](https://learn.microsoft.com/en-us/windows/win32/msi/administrative-installation), its separate [execution sequences](https://learn.microsoft.com/en-us/windows/win32/msi/action-execution-order) and [TARGETDIR](https://learn.microsoft.com/en-us/windows/win32/msi/targetdir). This preparation step does not substitute for an actual ordinary upgrade.

## 2026-11-06: review and publication boundaries

Explicit push/PR authorization supersedes the generic skill pre-push pause. The owner retains merge; product publication and tags are not authorized. Source A supplies committed review/capture inputs; source B includes the retained new snapshot and becomes the PR candidate. Final evidence records remain in the PR/ignored workspace after exact-head qualification, preventing a final-notes commit from invalidating that head. No unresolved architecture or scope question remains.

Read-only Phase 0 agents: s034_release_inventory and s034_upgrade_coverage. No product fix beyond the merged repair was demonstrated by research; any observed new defect must retain evidence and receive a proportional fix before acceptance.
