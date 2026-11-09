# Feature Specification: S037 legacy Windows MSI removal and recovery

**Feature Branch**: codex/s037-legacy-msi-recovery

**Created**: 2026-11-09

**Status**: Implemented, pending hosted acceptance and reviews

**Input**: Complete GitHub #97 end-to-end under Spec Kit and autopilot; push/open the PR, handle CI and at most two hosted review rounds, then stop for owner merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recover a verified legacy installation (Priority: P1)

An owner whose published v0.1.0 machine installation fails ordinary removal at the reported custom location can use supported maintenance to remove or replace the verified installation while retaining independent files and user state.

**Why this priority**: Successful installation followed by failed removal leaves an ordinary owner without a working maintenance path.

**Independent Test**: Install the exact published predecessor at a reproduced failing location, observe its original removal failure, then exercise the supported repair/removal path and independently inspect native registration and retained data.

**Acceptance Scenarios**:

1. **Given** the exact published v0.1.0 MSI and a reported failing custom location, **When** its original ordinary removal is attempted, **Then** the failure and native identity observations are retained before any recovery mutation.
2. **Given** that installation and verified maintenance inputs, **When** supported recovery removes or replaces it, **Then** the requested owned state is reached and independent media, extras, user preferences, history and shared runtime remain.
3. **Given** an unaffected ordinary installation, **When** standard maintenance runs, **Then** its existing behavior and integration choices remain intact.

### User Story 2 - Retain coherent upgrade, rollback and recovery (Priority: P1)

An owner can update an affected legacy installation and reconcile an interrupted transaction using attributable native and filesystem state.

**Why this priority**: A removal workaround alone must not corrupt the existing replacement and rollback model.

**Independent Test**: Run an affected predecessor-to-current replacement and rollback/recovery cycle at the same reported location, including an injected interruption.

**Acceptance Scenarios**:

1. **Given** an affected verified predecessor, **When** replacement completes, **Then** the intended current payload and registration are present with the elected scope/location/integrations and retained independent data.
2. **Given** a retained predecessor, **When** rollback or recovery completes, **Then** exact selected payload and registration are restored and subsequent supported removal succeeds.
3. **Given** a timeout or interruption, **When** the operation is observed again, **Then** completion is based on terminal native outcome and actual readback, with attributable evidence retained for an incomplete result.

### User Story 3 - Refuse unrelated or changed ownership (Priority: P1)

The owner receives a concrete refusal when native identity, installed payload, retained inputs or selected location do not agree, rather than maintenance acting on unrelated files.

**Why this priority**: Resolving a lookup discrepancy must preserve the project's existing data and ownership boundaries.

**Independent Test**: Exercise mismatched product/package/component/scope, changed owned bytes, foreign or linked paths and changed recovery inputs; verify refusal and unchanged unrelated state.

**Acceptance Scenarios**:

1. **Given** changed identity or payload evidence, **When** maintenance is requested, **Then** it refuses before destructive work and identifies the disagreement.
2. **Given** a misleading same-name or aliased unrelated destination, **When** recovery inspects it, **Then** physical identity and owned content determine the result.
3. **Given** uncertain native termination, **When** the client deadline expires, **Then** it reports an incomplete outcome and retains diagnostics without claiming the worker stopped.

### Edge Cases

- The historical failing 131-character paths also differ in directory structure; neither a universal threshold nor a path-length-only cause is assumed.
- Short/deep, ASCII/Unicode, C:/D: and directory-structure controls; registered spelling versus an equivalent physical path.
- Published v0.2.0, v0.2.1, v0.2.2 and the current candidate are assessed separately from v0.1.0.
- Machine versus user context, shared components, feature/component state disagreement, missing key file, duplicate or foreign registration.
- Changed MSI/payload/receipt, unrelated files, links/reparse points, partial removal, interrupted replacement/restore and stale coordination.
- No installation, native GUI or focus-changing test runs on the active workstation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Reproduce the original v0.1.0 removal failure with exact published inputs and retained before/after native observations on an isolated supported Windows host.
- **FR-002**: Determine a reproducible trigger boundary using controls that independently vary path structure, length, character set and drive; do not infer a universal threshold from the original matrix.
- **FR-003**: Assess other published predecessor versions and the current candidate independently, retaining version/package/engine identity with every outcome.
- **FR-004**: Provide a supported owner-usable removal/replacement recovery path for the reproduced affected installation.
- **FR-005**: Keep original published release bytes unchanged and authenticate all selected maintenance inputs.
- **FR-006**: Require agreement of selected product, package, component, installation context, physical location and owned payload before recovery mutation; a secondary lookup result alone is insufficient ownership proof.
- **FR-007**: Preserve refusal for changed owned files, wrong identities/scopes, foreign or linked locations, changed recovery inputs and ambiguous state.
- **FR-008**: Preserve independent media, extras, compatible user/portable state, history and shared runtime through completed removal, replacement and restoration.
- **FR-009**: Preserve scoped integration choices and the existing verified transaction, rollback and recovery behavior.
- **FR-010**: Retain attributable diagnostics and terminal native outcomes; a timeout is not completion or proof of termination.
- **FR-011**: Add regression coverage for the exact reported failure, selected trigger controls, other version outcomes, negative ownership cases, replacement/rollback/recovery and subsequent removal.
- **FR-012**: Preserve existing elected CI checks and the 660-second advisory/900-second hard qualification clocks, fifteen-second finalization reserve and separate preparation/qualification/combined accounting.
- **FR-013**: Document actual affected versions, supported owner recovery and remaining evidence limits in source-only documentation and the changelog; keep published snapshots and governed brand bytes intact.
- **FR-014**: Deliver an official PR with exact-head green CI and all review findings handled within at most two hosted review rounds, then stop for owner final review/merge without publishing a release.

### Key Entities

- **Installed identity**: product/package/component identities, edition/version, scope and physical destination with native registration observations.
- **Maintenance input**: immutable published MSI or current recovery payload with verified hashes and declared provenance.
- **Observed lookup**: explicit context, lookup result, returned path/count, engine identity and observation time.
- **Recovery transaction**: selected old/new identities, retained verified inputs, scoped authority, phase, native worker outcome and final readback.
- **Regression case**: independently controlled path/version variables, original failure or success, supported recovery result and retained-data inventories.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The original failure is reproduced before repair, and the documented trigger boundary is supported by independently varied controls with complete outcomes.
- **SC-002**: Every elected affected-case recovery reaches the requested owned state, with independently verified registration/payload readback and zero changes to retained independent data.
- **SC-003**: Every elected negative ownership case refuses without destructive changes to unrelated state.
- **SC-004**: Elected replacement, restoration, interruption recovery and subsequent removal cases pass, including separate version assessments.
- **SC-005**: All applicable current-head CI checks pass under existing deadline rules, with original failures and final evidence retained.
- **SC-006**: The PR remains open and mergeable for the owner after no more than two hosted review rounds, with no unresolved review comments.

## Assumptions

- #97's prior observations are diagnostic evidence, not proof of a universal cause or another version's behavior.
- Scope is Windows MSI maintenance; no installer/runtime executes on the owner's workstation.
- No new product eligibility, moderation, signing or attended acceptance requirement is introduced.
- Routine implementation decisions are resolved under autopilot; a genuinely architecture-defining or irreversible scope change is surfaced before adopting it.
- User authorization covers branch pushes and PR/review interaction. Owner merge and release publication remain separate.

## Clarifications

### Session 2026-11-09

- Autopilot resolves technical choices from source and native evidence; zero owner questions are required for the defined scope.
- The historical 131-character examples are observed cases, not a universal threshold.
- Published assets stay immutable; a genuinely new patch/transform architecture is surfaced before adoption.
- All installer and native-input work runs on isolated hosted Windows jobs.
