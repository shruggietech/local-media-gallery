# Feature Specification: v0.2.2 hotfix release preparation

**Feature Branch**: codex/s034-v022-hotfix-preparation

**Created**: 2026-11-06

**Status**: Specified

**Input**: Prepare v0.2.2 under Spec Kit/autopilot, push and open the official PR, complete CI and at most two hosted review rounds, then stop for owner review and merge.

## User Scenarios & Testing

### User Story 1 - Identify one coherent hotfix candidate (Priority: P1)

A recipient can identify version 0.2.2 consistently in the application, documentation, contracts and prepared release information, while previously published versions retain their original contents and identities.

**Why this priority**: The merged ordinary-upgrade repair must become a distinct patch release rather than replace published v0.2.1 bytes.

**Independent Test**: Check all active version declarations and candidate documentation together; independently compare every retained published documentation/schema snapshot and current public release selection with the starting state.

**Acceptance Scenarios**:

1. Given the merged repair, preparing the hotfix results in version 0.2.2 across the product, its documentation and owned schema.
2. Given existing v0.1.0/v0.2.0/v0.2.1 releases, preparing this candidate leaves their artifacts, records, retained snapshots and public selection unchanged.
3. Given an unpublished 0.2.2 candidate, documentation and release notes describe its actual availability and concise hotfix highlights without presenting it as a shipped release.

### User Story 2 - Upgrade normally without losing data (Priority: P1)

A Windows Full user opens the downloaded candidate over an existing published v0.2.0 or v0.2.1 installation and completes the ordinary wizard without manual removal or registry edits.

**Why this priority**: The previous publication failed the expected upgrade experience. Both supported immediate starting states must receive fresh automated runtime evidence for this candidate.

**Independent Test**: Exercise each exact published predecessor on isolated hosts, retain the actual wizard and terminal results, verify the resulting installed product and launch it. Compare preserved user, gallery and unrelated data and verify cancellation/refusal boundaries.

**Acceptance Scenarios**:

1. Given published v0.2.0 or v0.2.1 Full installed, the ordinary candidate wizard completes replacement, preserves installation choices and establishes one matching current installation.
2. Given a cancelled operation or changed predecessor ownership, the result is attributable and retains the prior recoverable state and unrelated bytes.
3. Given a successful upgrade, ordinary launch of the installed application renders the expected gallery fixture.

### User Story 3 - Review a publication-ready change (Priority: P2)

The owner receives a concrete release-preparation PR with source-bound verification and completed hosted reviews, retains the final merge ritual and can subsequently publish exact accepted artifacts from a qualifying main revision.

**Independent Test**: Match the final PR head to all applicable terminal CI checks, independently read original retained evidence and confirm all review findings are addressed within two hosted rounds.

**Acceptance Scenarios**:

1. Given a qualified candidate, every applicable check passes and original metadata, hashes, runtime receipts and documentation agree with its elected source.
2. Given hosted review feedback, each finding is addressed and resolved without requesting more than two rounds.
3. Given the final handoff, the PR remains unmerged and no tag, product release or public latest promotion has been created.

### Edge Cases

- Published predecessor selection versus the additional retained v0.2.0 upgrade case.
- Ordinary full UI versus quiet installation or advanced recovery; elevated-only observations cannot replace limited-client coverage.
- Cancellation, changed ownership, stale or mixed source/run evidence and duplicate same-name rerun artifacts.
- Missing historical topics, schemas or assets; candidate selection versus public latest selection.
- Interrupted qualification or missing original evidence; fixture execution never uses the owner's active installation.

## Requirements

### Functional Requirements

- **FR-001**: Active software, package metadata, documentation and application-owned schema MUST identify version 0.2.2 consistently.
- **FR-002**: Exact published v0.2.0 and v0.2.1 Full starting states MUST be covered by automated ordinary-wizard upgrade evidence for the 0.2.2 candidate.
- **FR-003**: Successful upgrades MUST preserve scope, location and integrations, leave one matching current native installation and launch the installed application successfully.
- **FR-004**: Settings, history, media, sidecars and unrelated files MUST retain their intended bytes; cancellation and changed-input refusal MUST retain attributable recoverable state without weakening ownership/source checks.
- **FR-005**: Previously published release assets, tags, accepted records and historical documentation/schema/retained snapshots MUST remain unchanged; the public latest selection MUST not advertise this pending candidate.
- **FR-006**: Candidate documentation, retained snapshot, short release notes and publication handoff information MUST be complete, internally consistent and explicit about current availability and actual host coverage.
- **FR-007**: All existing elected repository, native product, package, documentation/site and aggregate checks MUST remain enabled with the 660-second advisory target, 900-second hard limit and fifteen-second provisional reserve; preparation, qualification and combined times MUST be recorded separately.
- **FR-008**: Final acceptance MUST bind actual source/revision, artifacts, hashes and original runtime/election receipts; stale or mixed observations and newer failures MUST never be replaced by older passes.
- **FR-009**: Installer/runtime tests MUST run only on isolated hosts, with no owner workstation installation/GUI/policy mutations or invented attended verification requirement.
- **FR-010**: Push and official PR creation are authorized. Complete at most two hosted review rounds, address every finding, preserve internal planning/tracking and stop before merge, tagging, product publication or public promotion.

### Key Entities

- Hotfix candidate: version, source identity, six product artifacts and current documentation/contracts.
- Published predecessor: immutable release record, exact original artifact and installed starting state.
- Upgrade observation: host/client identity, original wizard/log, terminal result, preservation inventories and installed launch.
- Qualification and review handoff: exact candidate head, original scoped evidence, timing, findings and owner merge boundary.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All active product/documentation/schema declarations agree on 0.2.2, with no changed published historical bytes or public release selection.
- **SC-002**: Both published predecessor upgrade paths complete the ordinary wizard and installed application launch on their elected isolated hosts.
- **SC-003**: Preservation, cancellation and refusal scenarios pass without removed assertions or accepted unrelated-byte changes.
- **SC-004**: All applicable final-head CI checks and nine canonical receipts pass, with source/artifact/election readback and complete timing accounting.
- **SC-005**: Every hosted finding is addressed, zero review threads remain unresolved and the hosted review count is no greater than two.
- **SC-006**: The owner receives one reviewable PR and publication-preparation handoff while merge and release state remain owner-controlled.

## Assumptions

- Version 0.2.2 is a patch release carrying the merged repair and necessary preparation/verification changes. Dependency PRs #104-#107, navigation #94 and separate legacy-path investigation #97 remain outside this slice.
- Existing supported platform/edition and no-project-signing policies remain unchanged.
- Publication is a subsequent action after the preparation PR is merged and its exact main artifacts qualify; this request authorizes preparation and PR publication, not the product release itself.

## Clarifications

### Session 2026-11-06

- Owner authorization already covers automatic push and official PR creation; no additional permission pause is needed.
- Published history and latest selection stay immutable during preparation; add a new 0.2.2 snapshot rather than recapturing 0.2.1.
- Both ordinary predecessor journeys remain automated on isolated hosts. No owner walkthrough, signing or unrelated dependency upgrade is introduced.
