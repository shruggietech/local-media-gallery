# Feature Specification: ordinary Windows MSI upgrade repair

**Feature Branch**: codex/s033-windows-msi-upgrade

**Created**: 2026-11-06

**Status**: Specified

**Input**: S033. Reproduce and repair the ordinary v0.2.0-to-v0.2.1 double-click upgrade failure, add regression coverage, push/open a PR, handle CI and at most two hosted review rounds, then stop for owner merge.

## User Scenarios & Testing

### User Story 1 - Upgrade by opening the downloaded installer (Priority: P1)

A Windows user downloads and unblocks the Full MSI, opens it and follows the ordinary wizard over an existing v0.2.0 machine installation. Installation completes without manual predecessor removal or registry changes.

**Independent Test**: Retain the actual failure from exact published v0.2.0 and v0.2.1, then repeat the same full-UI journey with the repaired candidate, checking terminal success and native installed identity.

**Acceptance Scenarios**:

1. Given published v0.2.0 installed for all users, opening the published v0.2.1 MSI reproduces the reported failure or yields explicit contrasting evidence sufficient to isolate its necessary trigger.
2. Given that reproduced predecessor state, opening the repaired candidate completes replacement, preserving scope, location and integrations and allowing ordinary application launch.

### User Story 2 - Preserve data and recover from unsuccessful replacement (Priority: P1)

An upgrade preserves settings, media and unrelated files, and failed/cancelled operations leave an attributable recoverable result.

**Independent Test**: Compare native registration and retained byte inventories before and after successful, cancelled and refused replacement. Changed or unrelated ownership is never silently adopted.

**Acceptance Scenarios**:

1. Verified predecessor application files are replaced while private/gallery/foreign bytes remain unchanged.
2. Changed predecessor ownership or invalid source is refused before destructive work; cancellation/rollback retains the verified prior or successful new product with truthful diagnostics.

### User Story 3 - Receive a reviewable repair (Priority: P1)

The owner receives a source-bound PR with failing-before/passing-after evidence and green applicable CI, and retains the final merge decision.

**Independent Test**: Match final PR head to terminal CI, original runtime receipts and resolved review threads, with no more than two hosted Codex rounds.

### Edge Cases

- Full-UI replacement versus quiet or advanced updater operation.
- Current-user versus machine scope and saved integration choices.
- Existing shared runtime and an absent runtime.
- Missing, changed or foreign predecessor files and cached/native package identity.
- Installer cancellation and failure before/after predecessor removal.
- Historical published installers cannot be silently replaced.

## Requirements

### Functional Requirements

- **FR-001**: Retain an isolated baseline using exact published v0.2.0/v0.2.1 artifact identities, ordinary full-UI entrypoint, original failure logs/screenshots and actual host identity; any non-reproduction must be reported literally and narrowed by controlled cases.
- **FR-002**: The repaired Full MSI MUST complete the reproduced ordinary predecessor replacement without manual uninstall, registry editing or companion operands.
- **FR-003**: Replacement MUST retain installation scope/location/integration choices and establish one matching native product, with ordinary installed application launch verified.
- **FR-004**: Media, sidecars, settings, history and unrelated files MUST retain original bytes through replacement; only verified owned application/integration data may be replaced.
- **FR-005**: Existing source/package/ownership/provenance checks MUST remain enforced; changed/foreign inputs MUST receive attributable refusal and rollback/cancellation MUST preserve a valid recoverable state.
- **FR-006**: Regression coverage MUST exercise the failing ordinary full-UI predecessor journey separately from quiet/advanced recovery coverage, with a failing-before/passing-after record.
- **FR-007**: Installer/native input MUST run on isolated hosts, never the owner's active workstation; report actual Windows Server versus client coverage without substituting one for the other.
- **FR-008**: Existing published releases, tags, accepted artifacts and historical version inventories MUST remain unchanged; the candidate repair is not a published release.
- **FR-009**: Mandatory repository and affected product/site/qualification checks MUST pass with unchanged 660-second advisory target, 900-second hard limit and fifteen-second finalization reserve, recording preparation/qualification/combined timing separately.
- **FR-010**: Spec Kit artifacts and chronological evidence MUST use UTF-8 without BOM/LF and remain internal; issue/Project/PR tracking MUST bind exact source, checks and review outcomes.
- **FR-011**: Push and official PR creation are explicitly authorized; use at most two hosted Codex review rounds, respond to every finding and stop before owner merge or release publication.

### Key Entities

- Published predecessor and broken target: exact canonical version, hash, native package/product identity and input provenance.
- Reproduction observation: host, invocation, installed starting state, dialog/log, terminal result and preserved bytes.
- Repair candidate: source, built MSI, runtime transition and negative cases.
- Review handoff: final head, checks, reviews, issue/Project state and remaining evidence limits.

## Success Criteria

- **SC-001**: One attributable original failing ordinary upgrade is retained, or the necessary environmental trigger is isolated with explicit failure/non-failure controls before claiming reproduction.
- **SC-002**: The same starting state and ordinary wizard succeed with the repair and launch the installed matching application.
- **SC-003**: Preserved byte inventories/native identity agree, and ownership/refusal/cancellation regressions pass without removed assertions.
- **SC-004**: The ordinary upgrade regression is elected in affected hosted CI and is distinct from existing advanced recovery tests.
- **SC-005**: Final applicable CI is terminal green at the review candidate and all comments are addressed within two review rounds.
- **SC-006**: Published state remains unchanged and the owner receives a concrete PR handoff with actual reproduction/fix/host/timing evidence.

## Assumptions

The reported downloaded MSI is byte-identical to published v0.2.1 and read-only installed payload is v0.2.0 Full machine scope. The old custom-action error points to predecessor execution; its exact trigger remains a research question. Version 0.2.1 remains the development contract until a separately approved release-preparation slice. Public historical snapshots remain immutable.

## Clarifications

### Session 2026-11-06

- The required entrypoint is ordinary download/unblock/open, with no extra owner troubleshooting prerequisite.
- The existing active workstation installation is evidence only and is not mutated or used for unattended tests.
- Existing isolated hosted Windows infrastructure is the initial reproduction host. A passed Server case does not claim client proof; investigate any missing trigger rather than relabeling it reproduced.
- PR push/publication is authorized; merge and product-release publication are not.
