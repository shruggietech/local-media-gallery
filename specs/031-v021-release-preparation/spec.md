# Feature Specification: v0.2.1 release preparation

**Feature Branch**: codex/s031-v021-release-preparation

**Created**: 2026-11-05

**Status**: Draft

**Input**: Owner-directed S031 under autopilot, through official PR creation, at most two hosted Codex review rounds, green CI and final owner merge. Tracking: #98.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prepare accurate patch-release information (Priority: P1)

Users can understand the pending storage/settings fixes and Windows installer changes, choose the correct edition, and distinguish an unpublished candidate from available downloads.

**Why this priority**: The merged fixes need a coherent release without changing published historical products or promising deferred work.

**Independent Test**: Compare the current release descriptions, support information and version-owned documentation with the implemented product and verified published records.

**Acceptance Scenarios**:

1. **Given** the implemented 0.2.1 candidate, **When** release information is prepared, **Then** software, documentation and schema agree on 0.2.1, and highlights explain private-state reset/storage and the offline Windows MSI without announcing publication.
2. **Given** published 0.1.0 and 0.2.0, **When** the preparation is reviewed, **Then** every historical snapshot and public artifact identity remains unchanged and latest/download selection continues to use the verified published record.
3. **Given** the separate legacy v0.1.0 removal issue, **When** compatibility is described, **Then** #97 remains an attributed known issue and no unobserved v0.2.0 impact or completed recovery fix is claimed.

### User Story 2 - Retain a complete publishable candidate (Priority: P1)

The maintainer can revalidate all original evidence and exact accepted files, including supporting Windows worker evidence, before a later authorized publication.

**Why this priority**: A release that passed aggregate qualification must remain reproducibly acceptable through the actual publisher.

**Independent Test**: Revalidate the recorded candidate from retained original artifacts; attempt missing, changed, expired, foreign or oversized supporting inputs and require rejection.

**Acceptance Scenarios**:

1. **Given** a Windows gate that records supporting worker artifacts, **When** publication inputs are selected, **Then** selection follows the accepted gate's exact identities and digests and includes every operand needed by the unchanged complete evidence validator.
2. **Given** legacy evidence without a shared-worker cohort, **When** publication inputs are selected, **Then** the established historical publication path remains available without fabricated supporting artifacts.
3. **Given** altered or incomplete evidence, **When** acceptance is evaluated, **Then** it fails with an attributed diagnostic and never promotes a candidate or substitutes a later same-name artifact.
4. **Given** six qualified product files and supporting source and metadata, **When** the publication handoff is prepared, **Then** it identifies their accepted bytes and the later trusted-main qualification procedure without rebuilding accepted assets.

### User Story 3 - Resolve the tooling advisory and finish owner review (Priority: P1)

The owner receives a PR whose development dependencies, release preparation and hosted qualification are verified, with all received findings addressed within the review cap.

**Why this priority**: The new development dependency advisory belongs with bounded release preparation, while the owner retains final merge and publication authority.

**Independent Test**: Run the advisory regression, actual dependency callers, repository/site checks and all hosted scopes; inspect final-head receipts, tracking and review state.

**Acceptance Scenarios**:

1. **Given** the affected pattern dependency, **When** it is remediated, **Then** adversarial preprocessing remains bounded and existing lint/configuration selection still works without broad dependency churn.
2. **Given** the existing compatible glib backport, **When** preparation runs, **Then** its verified fix and provenance remain unchanged rather than replacing the native dependency family.
3. **Given** all final-head checks and independent readback pass, **When** the PR is handed off, **Then** every received review finding has a response and resolution, no more than two hosted Codex rounds were requested, and no merge, tag, public release or promotion occurred.

### Edge Cases

- A raw Windows worker artifact exceeds the old downloader limit while fitting the existing extraction bound.
- Same-name artifacts from a rerun carry a different ID, digest, source or common clock.
- Gate qualification is stale, incomplete or unaccepted when it attempts to grant artifact-selection authority.
- A missing or changed worker packet is replaced by a later similarly named artifact.
- A major dependency fix removes an API used by an installed parent or changes pattern matching.
- Release/support prose still claims no products have been published.
- Snapshot recapture changes a published version or derives inventories from an uncommitted revision.
- A squash merge has a different revision from the reviewed branch; evidence must not be silently interchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Current software, documentation and schema contracts MUST remain 0.2.1, with six existing Full/Lite platform choices and no new product feature or platform election.
- **FR-002**: Release highlights and current release/support information MUST accurately describe implemented changes and derive availability from verified publication. Highlights MUST be concise and end with the changelog link in the later publication procedure.
- **FR-003**: All published 0.1.0/0.2.0 and historical specification snapshots, captures and canonical identities MUST remain byte-for-byte preserved. Only the unpublished current snapshot may be refreshed through committed-source provenance.
- **FR-004**: The actual publisher MUST retrieve complete supporting Windows worker evidence by the accepted gate's recorded artifact IDs and digests, with run/revision/source/attempt/clock consistency and explicit bounded streaming/extraction. Missing, expired, foreign, changed or oversized evidence MUST fail acceptance.
- **FR-005**: Historical evidence without a shared-worker cohort MUST retain its established selection behavior. Supporting records MUST NOT grant authority unless the canonical gate is independently bound to the qualified candidate.
- **FR-006**: The newly reported pattern-processing advisory MUST be remediated in development tooling, with a bounded security regression and actual caller compatibility checks. The existing glib backport and its provenance MUST remain preserved.
- **FR-007**: Every elected functional, integrity, native, source and documentation check MUST remain mandatory, including all nine final-head canonical qualification scopes and all applicable CI jobs. Failed observations MUST remain separately attributed.
- **FR-008**: Qualification MUST retain the 660-second advisory target, 900-second hard limit, fifteen-second reserve, terminal timestamp authority and separate preparation/qualification/combined accounting. Installer, desktop/input and machine-policy operations MUST remain on isolated hosted machines.
- **FR-009**: Source identity, candidate identity, retained artifact hashes and current documentation inventory/review provenance MUST agree. Changed accepted assets MUST be rejected rather than rebuilt silently or renamed into acceptance.
- **FR-010**: S031 MUST automatically push and open an official PR, respond to every received review finding, use at most two hosted Codex review rounds total, and stop at green final-head CI for owner review and squash merge.
- **FR-011**: Tagging, actual public release publication, public promotion, merge and release milestone closure MUST NOT occur in this slice. The handoff MUST specify version 0.2.1, predecessor 0.2.0 and later successful trusted-main qualification/public readback using the exact accepted assets.
- **FR-012**: Navigation redesign #94 and legacy recovery investigation #97 MUST remain separately tracked; preparation MUST NOT claim either is implemented.

### Key Entities

- **Prepared release**: Elected version, predecessor, implemented scope, support/migration information and known limits.
- **Qualified candidate**: Source/revision, six products, supporting source/metadata, documentation, mandatory receipts and candidate identity.
- **Supporting evidence reference**: Exact artifact ID/name/digest/size, run/source/attempt and common clock recorded by an accepted canonical gate.
- **Publication handoff**: Later trusted-main run selection, unchanged accepted assets and public metadata/download/site/recipient verification procedure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every current release contract identifies 0.2.1; six product choices and their actual support/migration information agree, with zero changed historical snapshot or published artifact bytes.
- **SC-002**: Complete accepted evidence survives actual publisher input selection with zero missing operands, zero substituted artifact identities and rejection of every elected negative evidence case.
- **SC-003**: The advisory regression and installed callers pass, all nine canonical final-head scopes pass, all applicable CI jobs are terminal-successful, and independent artifact/documentation readback has zero identity mismatch.
- **SC-004**: The official PR has zero unresolved received findings after no more than two hosted Codex review rounds. Tracking consistently identifies S031/#98 and the owner is pinged for final merge.
- **SC-005**: The publication handoff names the exact version/predecessor and later qualification/readback procedure while v0.2.0 remains canonical and no tagging, publication, promotion or merge occurs.

## Assumptions

- The merged S028-S030 changes provide the intended patch-release product behavior; this slice adds no unrelated feature.
- Autopilot answers routine clarification and checklist decisions from owner instructions and established contracts; custom requirements-quality checklists remain reviewer-owned and do not create an additional attended gate.
- Native host/client coverage limits remain explicit. No signing or attended prerelease verification is introduced.
- Actual publication requires a later successful elected trusted-main qualification and owner authorization after the merge boundary.

## Clarifications

### Session 2026-11-05

- Q: Does the proposed publication pathway authorize an actual release during S031? A: No. The owner's latest instruction explicitly stops at green CI for the final merge ritual; only preparation and a concrete later publication handoff are in scope.
- Q: Should unresolved navigation and legacy-path work delay this preparation? A: Keep #94 and #97 separate and describe known limits accurately; neither is silently claimed fixed or added to this release-preparation scope.
- Q: May evidence retrieval follow latest artifacts with similar names? A: Supporting evidence follows the accepted gate's immutable recorded identities; legacy selection is preserved only for historical non-cohort contracts.
