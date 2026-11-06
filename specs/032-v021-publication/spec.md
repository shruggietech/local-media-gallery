# Feature Specification: v0.2.1 publication and verification

**Feature Branch**: `codex/s032-v021-publication`

**Created**: 2026-11-06

**Status**: Specified

**Input**: Publish v0.2.1 after merged-main qualification succeeds, using its exact accepted artifacts. Verify metadata, hashes, public downloads/documentation and prepared recipients. Publication is explicitly authorized. Tracking: #100.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive the qualified patch release (Priority: P1)

As a downloader, I receive the exact products that passed qualification, with matching version, predecessor, provenance and short release highlights.

**Why this priority**: Publication must deliver the tested products and preserve existing released products.

**Independent Test**: Compare actual release metadata and every product/source download with the elected successful main qualification and independently read their bytes.

**Acceptance Scenarios**:

1. **Given** successful terminal qualification of the elected merged source, **When** publication runs, **Then** v0.2.1 selects exactly six products plus corresponding source, with predecessor v0.2.0 and no rebuild of those accepted assets. The initial f9bd121 candidate failed qualification; any necessary qualification repair must land through the owner-controlled merge boundary and receive fresh push-main qualification.
2. **Given** failed/incomplete qualification, altered evidence or conflicting remote state, **When** publication is attempted, **Then** existing guards refuse incompatible operations and retain diagnostic/recovery evidence.

### User Story 2 - Find matching public downloads and documentation (Priority: P1)

As a visitor, latest downloads, versioned documentation and the canonical record consistently select observed v0.2.1 products while historical versions remain available.

**Why this priority**: Public selection must describe actual published products rather than a pending source candidate.

**Independent Test**: Read the canonical record, deployed inventory, latest/version navigation and download targets through public endpoints and compare exact identities.

**Acceptance Scenarios**:

1. **Given** publication and deployment, **When** a visitor selects latest documentation or a covered platform/edition download, **Then** release identity, documentation version and artifact agree.
2. **Given** historical v0.1.0/v0.2.0 selection, **When** it is read afterward, **Then** retained source/schema bytes and release identities remain unchanged.

### User Story 3 - Prepare recipients from the published release (Priority: P1)

As a gallery sender or recipient, preparation acquires the actual published v0.2.1 Lite product and verifies its selected identity and bytes.

**Why this priority**: Metadata inspection alone does not demonstrate the actual acquisition path.

**Independent Test**: Run existing preparation acquisition on isolated covered Windows, Linux and macOS hosts after publication, comparing actual acquired bytes and metadata with the canonical record.

**Acceptance Scenarios**:

1. **Given** canonical v0.2.1, **When** a prepared recipient is acquired on each covered platform, **Then** version, selected name, size, hash and package identity match that release.
2. **Given** changed or missing recipient operands, **When** verification runs, **Then** it retains attributable failure rather than counting an older or synthetic fixture as current success.

### Edge Cases

- Active/failed main qualification cannot be substituted with prior PR evidence.
- A failed remote acknowledgement requires observing actual state and the retained same-candidate journal before another mutation.
- Expired, modified or mixed-clock supporting evidence fails under existing input rules.
- Delayed deployment remains distinct from asset publication until public selection is verified.
- Failed post-publication acquisition remains retained until an attributable repair/rerun succeeds.
- A retried Windows gate must wait for current-cohort worker artifacts rather than downloading retained same-name packets from an earlier attempt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Publication MUST wait for terminal-successful trusted-main qualification of the elected merged source, including all applicable checks and required receipts.
- **FR-002**: The release MUST bind version 0.2.1, predecessor 0.2.0, qualified source, six products and corresponding source.
- **FR-003**: Published product/source bytes MUST match accepted sizes, hashes and identities without rebuilding or changing those assets.
- **FR-004**: Existing immutable input selection, source/current-renderer checks, both documentation gates, upload recovery and canonical promotion MUST be preserved.
- **FR-005**: Every published product/source asset MUST receive independent public byte/hash readback with actual release/tag/asset metadata recorded.
- **FR-006**: Public latest, documentation navigation, download selection and deployed output MUST agree with canonical v0.2.1.
- **FR-007**: Actual post-publication prepared-recipient acquisition MUST be demonstrated on all three covered platforms and bind selected name, bytes, hash and metadata to v0.2.1.
- **FR-008**: Existing baseline and published v0.1.0/v0.2.0 source/schema/retained bytes MUST remain unchanged.
- **FR-009**: The 660-second advisory target, 900-second hard limit, fifteen-second reserve and terminal timestamp authority MUST remain enforced, with separate preparation/qualification/combined accounting.
- **FR-010**: Authored planning/evidence MUST use UTF-8 without BOM and LF, pass applicable checks and remain outside public documentation navigation.
- **FR-011**: Qualification, publication, public readback and actual recipient observations MUST remain distinct; failed/incomplete observations MUST be retained literally.
- **FR-012**: Once a successful merged source is elected, remote main and its renderer MUST remain unchanged through publication and live verification. A demonstrated qualification defect may receive a proportional reviewed repair before election; its owner-controlled merge requires fresh push-main qualification.
- **FR-013**: Execution MUST use hidden noninteractive consoles and isolated hosted runtime checks, without local installer/GUI execution or an attended owner prerequisite.
- **FR-014**: Completion MUST record issue/Project state, exact execution/public evidence, substantive deviations and owner handoff. #94/#97 and signing remain outside this slice.
- **FR-015**: The Windows gate MUST select completed worker artifacts created within the current cohort's readiness/deadline window and download the exact selected IDs. Retained earlier-attempt packets MUST remain diagnostic history and MUST NOT satisfy current readiness. Existing clock, source, build, receipt and byte checks MUST remain intact.

### Key Entities *(include if feature involves data)*

- **Qualified candidate**: Successful main source/run, accepted assets and original receipts, including immutable supporting Windows operands.
- **Published release**: Actual release/tag/assets and canonical state bound to the candidate.
- **Documentation selection**: Retained identities, renderer/output inventories, both gates and actual deployed navigation.
- **Recipient observation**: Platform, canonical selection, acquired bytes, package identity, execution environment and terminal evidence.
- **Execution journal**: Attributable publication outcomes and same-candidate recovery authority.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: One observed v0.2.1 release binds six products plus corresponding source to successful main qualification with zero identity/hash/size differences.
- **SC-002**: Independent public readback verifies every selected product/source asset and canonical metadata.
- **SC-003**: Live latest/version navigation and all current downloads match the release; historical inventories remain byte-identical.
- **SC-004**: Three attributable post-publication prepared-recipient results identify and acquire matching v0.2.1 products.
- **SC-005**: Mandatory checks pass under unchanged timing policy, with retained failures/retries and separate time accounting.
- **SC-006**: The owner receives the release URL and concrete verification without repeated authorization or an attended gate.
- **SC-007**: Regression coverage rejects retained stale packets while permitting current-cohort completion and preserving the selected immutable artifact identity through download.

## Assumptions

- Explicit authorization on 2026-11-06 covers established release/tag/asset/canonical/Pages operations.
- Elected main run 42174731987 on f9bd121d3dc70e6d315006225514f79c16e0892a is still pending at specification time; this is not a pass claim.
- v0.2.0 is the observed predecessor. Conflicting state is investigated under existing recovery rules.
- Existing tooling is reused; only demonstrated defects justify proportional fixes.

## Clarifications

### Session 2026-11-06

- Publication is explicitly authorized, so no additional confirmation is needed.
- Local S032 planning proceeds while remote main stays fixed through publication/readback.
- Pre-publication v0.2.0 recipient observations do not satisfy post-publication v0.2.1 acquisition; fresh hosted observations are required.
- Owner workstation focus and installed state remain untouched.

### Execution clarification: 2026-11-06

The initial main run failed native observation, then its bounded retry exposed a gate selection defect: retained attempt-1 worker artifacts were downloaded before attempt-2 workers completed. Publication remains undispatched. Repair selection and immutable-ID download in this slice, retain both failed attempts and obtain the normal owner merge before electing a fresh successful push-main source. This is a demonstrated prerequisite repair, not permission to bypass a failing qualification or substitute PR artifacts.
