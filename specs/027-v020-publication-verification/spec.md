# Feature Specification: S027 v0.2.0 publication and verification

**Feature Branch**: `codex/s027-v020-publication-verification`

**Created**: 2026-11-03

**Status**: Specified

**Input**: Publish the owner-approved v0.2.0 candidate after final-main qualification, verify its public distribution and documentation, close M3, and deliver an audit PR for owner review under autopilot with at most two review rounds.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Obtain the accepted release (Priority: P1)

A recipient downloads v0.2.0 Full or Lite for Windows, macOS or Linux and receives the exact bytes that passed qualification on approved main.

**Why this priority**: Publication is the remaining delivery step after S026 was merged.

**Independent Test**: Compare every published package and corresponding source archive against the accepted candidate's size and digest, and verify the canonical release record.

**Acceptance Scenarios**:

1. **Given** a successful final-main qualification and independent evidence readback, **When** publication executes, **Then** v0.2.0 becomes the canonical latest release with all six platform/edition packages, corresponding source and required metadata, without rebuilding accepted products.
2. **Given** a failed or interrupted upload, **When** recovery is attempted, **Then** retained upload authority identifies only the same candidate and any unowned or inconsistent bytes prevent promotion.

### User Story 2 - Discover and acquire the published product (Priority: P1)

A site visitor finds v0.2.0 through current/latest documentation and downloads, while v0.1.0 remains available with its historical documentation.

**Why this priority**: A release must be discoverable through the actual public site.

**Independent Test**: Read the deployed site, version routes, metadata, download links and prepared-gallery acquisition result against canonical release data.

**Acceptance Scenarios**:

1. **Given** public v0.2.0 assets, **When** the publication site is deployed, **Then** current/latest routes and platform download choices select v0.2.0, versioned v0.2.0 documentation renders, and v0.1.0 assets and documentation retain their prior identities.
2. **Given** a prepared gallery, **When** its recipient resolves acquisition through the canonical release, **Then** the chosen platform artifact belongs to the published v0.2.0 record.

### User Story 3 - Close the release campaign with evidence (Priority: P2)

The owner reviews a concise audit PR containing the publication provenance, public verification and milestone disposition.

**Why this priority**: Completion must be inspectable without another release-preparation slice.

**Independent Test**: Trace the approved revision, qualification run, original artifact hashes, publication run, canonical record and public observations through retained evidence and the audit PR.

**Acceptance Scenarios**:

1. **Given** successful publication and public verification, **When** campaign tracking is updated, **Then** M3 is closed, all elected work is accounted for, and the official PR is ready for owner review after green CI and satisfied review comments.

### Edge Cases

- Main changes before execution: reject the stale selection and assess the new approved source before publication.
- Qualification or evidence integrity fails: retain diagnostics and do not publish that candidate.
- Release already exists: validate ownership and exact identity; never replace unrelated assets or change accepted bytes.
- Upload/promotion succeeds but Pages fails: retain the publication, repair or rerun deployment through its supported path, and verify actual public state before campaign closeout.
- Review findings: correct necessary records or demonstrated defects and resolve each comment; request at most one second review after the automatic opening round.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Publication MUST use owner-approved main revision `7d714ed723483d6bdb1a2286fb89fcbe8550cd40`, version 0.2.0, expected predecessor v0.1.0, and a successful final-main qualification with independent artifact readback.
- **FR-002**: Every published product and corresponding source MUST preserve accepted bytes, sizes, digests and provenance. No package rebuild or signing requirement is elected.
- **FR-003**: Publication MUST use the existing controlled release process, retain intermediate evidence and recover only with authority for the same candidate.
- **FR-004**: Public readback MUST verify canonical/latest selection, every asset, all six platform/edition choices, versioned documentation, current aliases, deployed Pages and prepared-gallery acquisition.
- **FR-005**: The predecessor's release assets and immutable documentation MUST retain their identities.
- **FR-006**: M3 MUST close only after actual publication and public verification succeed. Operational evidence and issue/project state MUST distinguish publication completion from the audit PR's pending owner merge.
- **FR-007**: S027 MUST deliver an official audit PR, green applicable CI, responses and resolution for every review comment, at most two review rounds, and owner final review without automatic merge.
- **FR-008**: Evidence MUST separate preparation, qualification and combined timing, preserve terminal timestamps and the existing 660-second advisory target, 900-second hard limit and 15-second finalization reserve. Native acceptance MUST run on isolated CI hosts without local focus changes.
- **FR-009**: Release notes MUST contain short highlights ending with the master changelog link. Public contracts MUST remain self-contained and version-aligned; internal slice records MUST remain internal.

### Key Entities *(include if feature involves data)*

- **Approved candidate**: version, source revision, logical source identity, qualification run, artifact inventory and measured receipts.
- **Publication execution**: trusted-main run, candidate identity, upload authority, retained journal, canonical promotion and Pages deployment.
- **Public verification receipt**: observed release/assets/site identities, predecessor comparison and acquisition results.
- **Campaign record**: milestone, operational issue, project status and audit PR/review disposition.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All six platform/edition packages and every required source/metadata asset are publicly downloadable and match the accepted candidate exactly.
- **SC-002**: Canonical/latest release and current site acquisition choices resolve v0.2.0; both v0.2.0 and v0.1.0 documentation remain reachable, with predecessor identity unchanged.
- **SC-003**: One retained evidence chain connects approved source through qualification to public bytes and site deployment, with no unaccounted artifact substitution.
- **SC-004**: M3 is closed after verification and an official audit PR reaches owner handoff with applicable CI green and no unresolved review findings within two review rounds.

## Assumptions

- S026 merge approved the release-producing source. S027's separate worktree records operational work and does not become an unmerged release producer.
- Existing release and documentation pipelines provide the required behavior; source changes are necessary only for demonstrated defects.
- The owner authorized publication by accepting the proposed S027 scope and authorized push/PR explicitly. Final audit PR merge remains owner-controlled.
- No runtime, dependency, brand-kit or attended native acceptance changes are elected.

## Clarifications

### Session 2026-11-03

All scope, release authority, identity, recovery, review and handoff dimensions are clear from the accepted recommendation and explicit owner instructions. No further questions are needed.
