# Feature Specification: v0.2.0 release preparation

**Feature Branch**: `codex/s026-v020-release-publication`

**Created**: 2026-11-02

**Status**: Specified

**Input**: Owner-directed S026 prepares v0.2.0 for publication, automatically pushes/opens an official PR, completes CI and at most two review rounds, and stops for final owner review and merge. Tracking: #83.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand the new release and migration (Priority: P1)

A recipient reads accurate v0.2.0 release information covering guided gallery preparation, one portable Lite executable and one offline system Full installer for each covered platform. Existing v0.1.0 users can identify their migration path without confusing older packages with the new contract.

**Why this priority**: Publication requires clear, truthful recipient instructions and a stable supported scope.

**Independent Test**: Review release highlights and the complete current documentation against the implemented product and historical snapshots.

**Acceptance Scenarios**:

1. **Given** the implemented v0.2.0 product, **When** release information is prepared, **Then** software, documentation and schema agree on 0.2.0 and describe existing capabilities without adding features.
2. **Given** a legacy Windows per-user Full installation, **When** its owner follows the new guidance, **Then** normal removal before system installation and retained media/settings behavior are explicit.
3. **Given** no published v0.2.0 record, **When** a reader visits the public site, **Then** downloads and latest documentation still select the verified published product; current source documentation does not falsely announce publication.

### User Story 2 - Retain a verifiable release candidate (Priority: P1)

The maintainer can reproduce the release candidate's exact identity from retained qualification evidence and distinguish it from shipped products.

**Why this priority**: Accepted native bytes and source identity must survive preparation, review and future publication unchanged.

**Independent Test**: Run the elected checks and independently compare original retained evidence, six product files, supporting source, documentation and website output with the candidate record.

**Acceptance Scenarios**:

1. **Given** an edited current release snapshot, **When** qualification runs, **Then** refreshed inventories and review receipts match its actual bytes and every retained historical snapshot is unchanged.
2. **Given** six qualified products and supporting source/metadata, **When** candidate assembly repeats, **Then** identities and file hashes match without rebuilding accepted product bytes.
3. **Given** altered inputs, stale source/revision, missing elected evidence or incomplete checks, **When** acceptance is evaluated, **Then** the candidate is refused rather than reported ready.

### User Story 3 - Review preparation before publication (Priority: P1)

The owner receives an official PR whose release preparation, checks and review resolutions are complete, together with the exact publication procedure to run after merge.

**Why this priority**: The owner explicitly retains final review and merge; preparing publication does not itself publish a release.

**Independent Test**: Inspect the PR, current-head checks, resolved review threads, tracking state and publication handoff against the elected candidate.

**Acceptance Scenarios**:

1. **Given** verified preparation changes, **When** the PR is opened, **Then** all applicable checks complete and every actual review finding receives a response and necessary correction, with at most two review rounds.
2. **Given** successful final-head qualification and independent readback, **When** the slice is handed off, **Then** the owner is pinged for final review/merge while tagging, publication, promotion and milestone closure have not occurred.
3. **Given** a later successful trusted-main qualification, **When** the documented publication procedure is used after owner merge and authorization, **Then** it selects version 0.2.0, predecessor 0.1.0 and those exact retained assets, followed by independent public/download/documentation readback.

### Edge Cases

- Current prose still describes implemented single-file delivery as future development or an unrelated release as current.
- Moving unreleased history into a version entry accidentally announces availability before canonical publication.
- Current documentation edits invalidate retained inventory, vocabulary or gate receipts.
- An older documentation/schema snapshot or accepted v0.1.0 release asset changes during preparation.
- Public latest/download selection advances merely because current source says 0.2.0.
- A reviewed branch, squash merge and future final-main qualification have different revisions; their evidence cannot be interchanged silently.
- A startup or hosted-runner failure requires attributed diagnostics and unchanged checks/deadlines rather than an unsupported success claim.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The elected product version MUST remain 0.2.0 across software, current documentation and application-owned schema contracts. This slice MUST retain the existing covered platform and feature scope.
- **FR-002**: The changelog and concise release highlights MUST describe guided gallery preparation, direct Lite delivery, offline system Full dependencies/features and relevant migration changes without implying a published release before observation.
- **FR-003**: Current documentation MUST state authoritative implemented contracts and derive download availability from actual verified publication rather than hard-coded candidate/future-release claims.
- **FR-004**: All v0.0.0/v0.1.0 source snapshots, captured references and accepted public v0.1.0 identities MUST remain byte-for-byte preserved.
- **FR-005**: Current documentation inventories, ordinary vocabulary review and release gate evidence MUST match the edited source. Candidate and controlled-publication rendering/navigation/search/schema/link/asset checks MUST remain mandatory.
- **FR-006**: Candidate acceptance MUST cover six literal Full/Lite products for Windows x86_64, Ubuntu 24.04 x86_64 and macOS 15 Apple Silicon, separately identified corresponding source and required metadata, and source-bound native lifecycle/offline-recipient evidence.
- **FR-007**: The final PR head MUST have all nine applicable successful qualification scopes and complete independent original-archive, source/revision, native/product and website/documentation readback. Failed attempts MUST remain retained and separately attributed.
- **FR-008**: Qualification MUST retain the 660-second target, 900-second hard limit, fifteen-second finalization reserve, terminal timestamp authority and separate preparation/qualification/combined timing. Native GUI/input/installers MUST run only on isolated hosts.
- **FR-009**: S026 MUST automatically push/open an official PR, respond to all actual review findings, request no more than two total review rounds, and stop for owner final review and squash merge.
- **FR-010**: The handoff MUST document publication using a later successful elected trusted-main run, version 0.2.0 and predecessor 0.1.0, preserving exact accepted assets without rebuild and requiring public metadata/assets/site readback. Actual tagging, publication, public promotion and milestone closure are outside this preparation slice.

### Key Entities

- **Release scope**: Existing implemented capabilities, covered edition/platform rows, migration guidance and support limits for 0.2.0.
- **Retained snapshot**: Version-owned documentation, schema, captured references, inventories and review provenance.
- **Qualified candidate**: Exact source/revision, six products, supporting source/metadata, receipts and candidate identity.
- **Publication handoff**: Elected version/predecessor, trusted-main run selection, unchanged accepted assets and independent public verification procedure, separated from this pre-merge work.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every current product/version contract identifies 0.2.0, all six product choices have accurate release/migration guidance, and every historical snapshot byte remains unchanged.
- **SC-002**: All nine elected final-head checks and independent readback pass with zero mismatched candidate/source/artifact identities and zero omitted mandatory gates.
- **SC-003**: The official PR has zero unresolved review findings after no more than two review rounds, and tracking identifies S026/#83 consistently.
- **SC-004**: The owner handoff contains the exact later publication/readback procedure, while canonical v0.1.0 selection and actual public release assets remain unchanged during this slice.

## Assumptions

- S024/S025 supply the implemented v0.2.0 feature and single-file delivery contracts; no new feature, dependency upgrade or platform election is needed.
- Post-merge baseline run 41534721599 passed all applicable checks and Pages deployment for d2c0ed736d323b68d221ea10afa1874f9e2aaad9.
- Existing release recovery/publication tooling is reused unless a demonstrated preparation defect requires a proportional correction.
- Current owner authorization covers branch, issue/project tracking, push, official PR and bounded review handling. The explicit final-review/merge boundary governs this run.
