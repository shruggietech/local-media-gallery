# Feature Specification: Application storage and private-state recovery

**Feature Branch**: `codex/s029-private-state-storage`

**Created**: 2026-11-04

**Status**: Ready for planning

**Input**: S029 completes #90, #91, #92 and #93 under Spec Kit/autopilot, with automatic push/official PR, CI, at most two review rounds and owner final review/merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keep development state disposable (Priority: P1)

A maintainer runs fixtures or development tools without creating updater locks, transactions, settings, history or browser profiles in actual application storage.

**Why this priority**: Existing updater fixtures polluted the owner's profile. Isolation must precede development checks.

**Independent Test**: Run updater fixtures with owned disposable roots and verify all generated state and coordination files remain inside those roots.

**Acceptance Scenarios**:

1. **Given** a fixture workspace, **When** its update/app operations run, **Then** its generated state, transaction inputs and locks are owned by that workspace.
2. **Given** intentionally retained diagnostics, **When** a run ends, **Then** retained diagnostics stay within tooling storage and disposable cleanup does not visit real application directories.

### User Story 2 - Share explicit application directories (Priority: P1)

Windows Full and Lite use application-named directories consistently, independent of reverse-domain bundle identifiers.

**Independent Test**: Resolve paths for both editions and verify preferences use Roaming AppData/local-media-gallery, while history, caches and WebView2 use Local AppData/local-media-gallery subdirectories.

**Acceptance Scenarios**:

1. **Given** either edition, **When** it resolves normal user state, **Then** both editions select the same intended application locations.
2. **Given** the old reverse-domain/profile-root names, **When** the application runs, **Then** it adopts the new locations directly without migration, backup or legacy-directory recreation.

### User Story 3 - Recover private state automatically (Priority: P1)

An owner opens the app with obsolete or incompatible private settings/history and gets usable defaults and working preference saves without a persistent routine-reset warning.

**Independent Test**: Open owned private-state fixtures with incompatible formats, malformed data and compatible values labeled with older/newer product releases; verify reset versus preservation and subsequent writes.

**Acceptance Scenarios**:

1. **Given** compatible state with an ordinary different product release label, **When** read, **Then** its compatible values remain usable; product version alone is not a rejection reason.
2. **Given** obsolete/incompatible owned private state, **When** normal state access occurs, **Then** obsolete state is removed and usable defaults are recreated without migration/backup or a persistent error banner.
3. **Given** an actual read/write failure, **When** the app reports it, **Then** a concise message names the affected file and available action.
4. **Given** portable gallery settings, originals or sidecars, **When** private recovery occurs, **Then** those independently owned files are untouched.

### User Story 4 - Bound updater state lifetimes (Priority: P2)

An updater uses the normal user/machine application updates directory, retains what active/recovery/rollback operations need and reclaims obsolete scratch/coordination artifacts without splitting synchronization between concurrent operations.

**Independent Test**: Exercise completion, refusal, recovery, rollback and simultaneous ownership with isolated update roots; verify retained versus reclaimed files and mutual exclusion.

**Acceptance Scenarios**:

1. **Given** user/machine scope, **When** update storage resolves, **Then** it is respectively Local AppData/local-media-gallery/updates or ProgramData/local-media-gallery/updates.
2. **Given** active or recoverable work, **When** cleanup runs, **Then** necessary authenticated inputs/records remain.
3. **Given** completed/obsolete scratch and released coordination, **When** their lifetime ends, **Then** obsolete artifacts are reclaimed without allowing competing owners of the same destination.

### Edge Cases

- Concurrent state readers/writers, live SQLite handles, interrupted replacement and active updater ownership.
- Read-only or unavailable state directories, malformed/oversized private documents, corrupt or unsupported private databases.
- Links/reparse points or changed paths must not redirect cleanup to unrelated files.
- Recovery and supported rollback need retained inputs; cleanup is not indiscriminate deletion.
- The owner already deleted the reported legacy directories. No repeat cleanup of those directories is requested.
- Local work is headless; hosted native GUI checks use isolated CI. Owner product testing follows actual publication, without new attended pre-release gates.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Automated fixtures and development tooling MUST use explicitly tooling-owned disposable state/transaction/coordination storage, with any retained diagnostics inside the tooling workspace (#92).
- **FR-002**: Fixture cleanup MUST remain within its owned storage and automated runs MUST NOT populate normal private application/update directories (#92).
- **FR-003**: Windows preferences MUST use %APPDATA%/local-media-gallery; history, caches and WebView2 profiles MUST use appropriate subdirectories under %LOCALAPPDATA%/local-media-gallery (#90).
- **FR-004**: Full and Lite MUST share those intended state roots. Filesystem paths MUST be explicit; bundle identity MUST NOT choose their visible Windows directory names (#90).
- **FR-005**: New locations MUST be adopted directly with no migration/backup subsystem or recreation/cleanup of the reported old profile-root locations (#90/#93).
- **FR-006**: Compatible private settings MUST remain usable across ordinary product release changes, based on actual format/value compatibility rather than a product-release allowlist (#91).
- **FR-007**: Obsolete/incompatible application-owned private settings/history MUST be automatically discarded and usable defaults recreated without a persistent routine-reset banner or disabled saving (#91).
- **FR-008**: Actual filesystem failures MUST name the affected file and an available action; private reset MUST NOT change original media, sidecars or portable gallery settings (#91).
- **FR-009**: Windows user/machine updater inputs, recovery records, scratch and coordination MUST consistently use %LOCALAPPDATA%/local-media-gallery/updates and %PROGRAMDATA%/local-media-gallery/updates respectively (#93).
- **FR-010**: Updater lifetimes MUST distinguish active operation, recoverable operation, supported rollback and obsolete scratch/coordination. Necessary inputs/records MUST remain; obsolete artifacts MUST be reclaimed (#93).
- **FR-011**: Coordination reclamation MUST preserve mutual exclusion across concurrent operations and must not create multiple independent locks for the same destination (#93).
- **FR-012**: Application operations, diagnostics, update compatibility behavior, relevant maintainer tooling and documentation MUST agree with the new paths and private-state policy (#90-#93).
- **FR-013**: Existing published documentation/schema snapshots and release assets MUST remain intact. Changed software, current documentation and owned master schema MUST share a new unreleased patch version.
- **FR-014**: Existing automated repository/unit/affected checks and CI MUST pass with functional, integrity and provenance evidence. No new attended or owner pre-publication gate may be added.
- **FR-015**: Automatically push/open an official PR closing the four issues, handle every review finding with at most two rounds and hand off unmerged for owner final review.

### Key Entities

- Storage layout: user preferences, local user state/cache/WebView2, user updater and machine updater roots.
- Tooling workspace: disposable fixture roots and intentionally retained diagnostics.
- Private state: compatible values, obsolete/incompatible state eligible for reset, and actual I/O failure.
- Update transaction: active, recoverable, rollback-retained or obsolete; authenticated inputs and records.
- Coordination ownership: one effective owner per destination despite cleanup/concurrency.

## Success Criteria *(mandatory)*

- **SC-001**: Every fixture-generated state/coordination artifact is inside its owned tooling root; no expected production root is created by fixture checks.
- **SC-002**: Both Windows editions resolve identical intended application state paths and no routine path creates the old reverse-domain/profile-root names.
- **SC-003**: All obsolete/private-state recovery cases regain writable defaults without a routine persistent warning; compatible cross-release cases retain their choices.
- **SC-004**: Concurrent update checks never admit competing owners, and retained/reclaimed artifacts exactly match the documented transaction states.
- **SC-005**: All four issues have implemented behavior, matching versioned contracts, passing applicable CI and no unresolved review findings at owner handoff.

## Assumptions

- Product/docs/schema candidate version is 0.2.1; current published v0.2.0 remains authoritative until separately authorized publication.
- Existing preserve-and-block private-state behavior is intentionally replaced by the owner-requested reset policy. Portable state keeps its independent preservation contract.
- #89 MSI redesign and #94 navigation redesign are outside S029.
- Owner-requested post-publication product testing remains the feedback model; existing automated engineering checks continue.
- Explicit push/PR authorization replaces the autopilot skill's default pre-push pause. No merge, tag or release publication is authorized here.

## Clarifications

### Session 2026-11-04

No owner question is needed: direct location adoption, no migration/backup, private-only reset and no repeat local cleanup are explicit. The plan must resolve concurrency-safe reclamation and isolation details before implementation.
