# Feature Specification: Release recovery and retained gate evidence

**Feature Branch**: `codex/s023-release-recovery`

**Slice**: S023

**Created**: 2026-11-01

**Status**: Specified

**Input**: Complete GitHub #76 under Spec Kit autopilot, publish an official PR, complete CI and at most two review rounds, then stop for owner review and squash merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stage and publish real draft assets (Priority: P1)

A release operator stages verified original packages while GitHub supplies temporary draft URLs. Publication verifies the final public URLs without rebuilding or replacing accepted bytes.

**Why this priority**: The first public release required manual recovery at this boundary.

**Independent Test**: A controlled GitHub service exposes temporary draft URLs and authenticated asset endpoints, then transitions to final URLs only after publication.

**Acceptance Scenarios**:

1. **Given** an owned candidate draft with temporary URLs, **when** packages are staged, **then** exact release ownership, asset identity, names, states, sizes and content hashes pass before publication.
2. **Given** a published release, **when** it is read back, **then** every package has its exact expected final public URL and accepted bytes.
3. **Given** foreign or changed payloads, duplicate identities or a mismatched source, **when** staging or publication is attempted, **then** it fails without promoting latest or replacing published packages.

### User Story 2 - Observe committed mutations (Priority: P1)

An operator can complete or resume an attributable mutation whose response was lost or whose committed state becomes visible after a short delay.

**Why this priority**: Immediate reads failed to observe the first owned draft.

**Independent Test**: Controlled delayed reads follow one create/upload/delete/publish/promote mutation; delayed success is accepted within the observation budget and permanent absence fails.

**Acceptance Scenarios**:

1. **Given** one committed mutation with a lost acknowledgement and delayed visibility, **when** readback reconciles, **then** it succeeds with no duplicate write.
2. **Given** foreign state during reconciliation, **when** it is observed, **then** it fails immediately rather than retrying until that conflict disappears.
3. **Given** permanent absence or incomplete state, **when** the observation budget expires, **then** execution fails with retained recovery evidence before its qualification deadline.
4. **Given** an attributable empty starter, **when** recovery deletes it, **then** deletion must be observed before retrying its upload; unrelated starters are retained.

### User Story 3 - Independently recompute both documentation gates (Priority: P1)

A reviewer downloads retained execution evidence and recomputes both gates from the exact candidate and published static exports.

**Why this priority**: Another export cannot substantiate a later projection hash.

**Independent Test**: Extract evidence into a fresh directory, verify inventories and both gate projections, then demonstrate refusal of a modified or missing export.

**Acceptance Scenarios**:

1. **Given** a qualified candidate export, **when** execution continues or fails later, **then** its exact files, inventory and matching record survive in execution artifacts.
2. **Given** successful publication, **when** evidence is read back, **then** both retained exports independently match their exact gate records, source and renderer.
3. **Given** a changed file, missing export or mismatched record, **when** evidence is verified, **then** verification fails.

### Edge Cases

- A write fails before commit versus commits before its acknowledgement is lost.
- Stale release lists, absent uploaded assets, a temporary starter, delayed deletion, delayed published state, missing tag and stale latest.
- Another release becomes latest during promotion, or a draft changes ownership/source.
- An API asset URL points to another repository, release or credential destination.
- Observation consumes the remaining deadline; no new mutation is admitted after expiry.
- An execution fails before or after candidate evidence is retained.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Draft verification MUST validate candidate ownership, expected source/tag, unique asset IDs/names, actual authenticated asset endpoints, uploaded states, accepted sizes and SHA-256 hashes.
- **FR-002**: Exact final browser URLs MUST be enforced after publication. Temporary draft URLs MUST NOT enter canonical publication metadata.
- **FR-003**: Each mutation MUST be issued once per operation and reconciled through bounded reads; lost acknowledgements MUST NOT cause blind mutation replay.
- **FR-004**: Reconciliation MUST retry only explicitly pending observations; foreign/malformed/mismatched state and authentication/API failures MUST remain failures.
- **FR-005**: Observation MUST use a finite attempt/time budget capped by the active qualification deadline and preserve the finalization reserve.
- **FR-006**: Upload recovery MUST preserve attributable starter journals, refuse unrelated deletion, observe deletion before replacement and never replace accepted published package assets.
- **FR-007**: Execution artifacts MUST retain the exact qualified candidate export, its inventory and matching gated record, including when a subsequent phase fails.
- **FR-008**: A repeatable readback procedure MUST independently recompute both before/after projection gates from retained exports and reject missing/tampered evidence.
- **FR-009**: Regression tests and the full controlled campaign MUST model actual temporary draft URLs, delayed reads, lost acknowledgements, immutable payloads and strict final URLs.
- **FR-010**: Trusted-main provenance, both documentation gates, canonical promotion, source retirement checks and existing qualification clock rules MUST remain mandatory.

### Key Entities *(include if feature involves data)*

- **Candidate**: Existing immutable native asset/source/documentation identity; not redefined by this slice.
- **Pending observation**: A specifically missing or pre-mutation view, bounded by count, wall time and the existing deadline.
- **Retained gate evidence**: Exact candidate/published file inventories, exports and matching release records for independent projection recomputation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The complete controlled release campaign stages temporary draft URLs, survives delayed committed mutations, publishes exact final URLs and repeats without additional package writes.
- **SC-002**: Permanent pending state terminates within the configured observation bound; conflicts fail on their first observed read.
- **SC-003**: Independent extraction/readback recomputes both gates; every elected missing/modified evidence case fails.
- **SC-004**: Repository checks/tests, affected release/site campaign and final-head CI pass; every review finding is addressed within at most two requested rounds.

## Assumptions

- S023 is maintainer pipeline work; shipped v0.1.0 source snapshots, binaries and canonical record remain immutable.
- Tests use controlled local API service and headless browsers. No real release/tag mutation is required or authorized for this PR.
- No native product behavior, brand kit, signing or packaging matrix changes.
- The existing 660-second target, 900-second hard limit, 15-second reserve and preparation/qualification/combined accounting apply.

## Clarifications

### Session 2026-11-01

- Autopilot decision: use separate draft authenticated-content checks and post-publication final URL checks; do not rewrite expected public URLs.
- Autopilot decision: retry explicitly pending reads after one write, retaining all conflict checks; do not retry arbitrary exceptions or replay mutations.
- Autopilot decision: retain candidate evidence immediately after its gate, with an always-upload workflow path, and verify it through a reusable maintainer command.
- Hosted verification refinement: same-version selections must await their new document before later navigation; the delayed document-identity regression addresses the repeated #78 failure without dropping assertions.
