# Feature Specification: Linux Full/Lite packaging

**Feature Branch**: `codex/s018-linux-packaging`

**Created**: 2026-10-29

**Status**: Ready for planning

**Input**: S018, complete GitHub issue #24 end-to-end under Spec Kit/autopilot, publish a PR automatically, resolve CI and at most two review rounds, then stop for owner final review and merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install and remove Full (Priority: P1)

As a recipient on the elected Linux host, I can install Full with the platform package manager, obtain its required runtime and command/desktop integration, and remove the application while my galleries and user state remain intact.

**Why this priority**: Full must be an actual verifiable installation rather than a developer build or archive.

**Independent Test**: Install the produced Full package on the elected isolated host, inspect installed identity/integration and actual native browsing, repeat installation, then remove the owned application and verify retained gallery/state sentinels.

**Acceptance Scenarios**:

1. **Given** the supported host and Full package, **When** installation completes, **Then** required native prerequisites, architecture, exact installed payload and command/desktop integration are verified before success is reported.
2. **Given** the same unchanged owned installation, **When** installation repeats, **Then** the owned application remains valid and no duplicate integration is created.
3. **Given** an unrelated destination, command, desktop integration, changed owned payload or incompatible candidate, **When** installation/removal is attempted, **Then** the operation reports the specific conflict before replacing or deleting conflicting content.
4. **Given** an owned installation and galleries/settings/history outside it, **When** the package is removed or purged, **Then** only unchanged owned application/integration files are removed, unrelated extras and gallery/user data are retained, and the actual remaining state is reported.

### User Story 2 - Browse and relocate Lite (Priority: P1)

As a recipient with the declared Linux host runtime, I can extract Lite beside a gallery and browse without Full, sender history or developer tools. I can relocate the complete package/gallery and explicitly refresh media.

**Why this priority**: Portable sharing depends on real in-place operation and retained executable permissions.

**Independent Test**: Extract Lite preserving permissions into a space/non-ASCII path, launch with no argument and an explicit different root, relocate the gallery/package, modify media and use Refresh. Verify portable settings and independent recipient state.

**Acceptance Scenarios**:

1. **Given** extracted Lite beside gallery media, **When** launched from an unrelated working directory without a root argument, **Then** the gallery is the package's external directory, not an internal payload location or sender path.
2. **Given** an explicit root, **When** Lite launches, **Then** that root takes precedence and existing browsing/settings contracts apply.
3. **Given** a relocated package/gallery, **When** launched and refreshed after a media change, **Then** browsing reflects the new root and actual current media without regenerating a manifest.
4. **Given** Lite is removed, **When** only its inventoried files are deleted, **Then** media, sidecars, gallery settings and recipient state remain independently usable.

### User Story 3 - Understand host compatibility and package identity (Priority: P1)

As a recipient or maintainer, I can identify the exact edition/version/architecture, understand required host facilities, and distinguish installation, runtime and missing-prerequisite outcomes.

**Why this priority**: An executable archive alone cannot establish supported recipient operation.

**Independent Test**: Inspect both produced packages and actual target hosts, exercise wrong-host/missing-prerequisite paths, and match every accepted package/payload to source-bound identities and measured footprints.

**Acceptance Scenarios**:

1. **Given** a missing required host facility or incompatible architecture/native ABI, **When** the supported entry point is run, **Then** actionable prerequisite guidance is returned before normal GUI startup; a failed loader is not reported as a successful install or empty gallery.
2. **Given** either artifact, **When** its metadata and extracted/installed payload are inspected, **Then** software version, edition, target, prerequisites, notices, permissions and complete file identities agree.
3. **Given** host-shared libraries and package bytes, **When** footprints are reported, **Then** download/container, extracted/installed application and attributable runtime measurements remain separate; unavailable runtime attribution includes a reason and is never zero by assumption.

### Edge Cases

- Foreign files or symlinks occupy an install/command/desktop/icon destination; an owned file is modified, removed or replaced by a link; foreign extras appear beside installed files.
- Package-manager interruption, failed prerequisite resolution, corrupt payload/manifest, candidate mismatch or concurrent package operation; no unverified success or recursive deletion of user content.
- Root arguments, spaces/non-ASCII paths, unrelated working directory, relocated Lite, missing executable bits, absent display or host libraries.
- A desktop launch has different environment from a terminal; gallery settings and installed user state remain distinct from package data.
- Full removal must not remove runtime dependencies shared with other applications or purge home-directory user state.
- An old source receipt, failed native observation or missing artifact cannot certify the final PR head. Retries retain failed evidence.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Both editions MUST target the approved Ubuntu24.04 x86_64 GNU/native-webview/display baseline, preserve common browsing and launch/state behavior, and identify other unqualified combinations truthfully.
- **FR-002**: Full MUST provide the approved system package-manager installation with declared prerequisite provisioning/verification and one owned command, desktop entry and governed application icon integration.
- **FR-003**: Full MUST verify actual destination, package ownership, version/candidate, edition and architecture, rejecting unrelated destination/command/integration collisions and changed owned content before destructive replacement or removal.
- **FR-004**: Reinstalling the same unchanged candidate MUST verify the owned result without duplicate integration. Cross-version update/downgrade remains the separate #25 contract and MUST NOT be silently attempted.
- **FR-005**: Removal/purge MUST affect only owned unchanged application/integration files, retain media, sidecars, shared galleries, foreign extras, shared runtime and default-retained user state, and verify the result. No implicit user-data deletion is permitted.
- **FR-006**: Lite MUST preserve executable permissions and auxiliary/notices payloads, run without Full, developer tools or a chosen browser application on its declared host, and resolve no-argument browsing from its external directory with explicit-root precedence.
- **FR-007**: Actual installed Full and extracted Lite MUST pass native launch/browsing/media checks; Lite MUST additionally pass space/non-ASCII paths, unrelated working directory, relocation, portable settings and explicit Refresh against small synthetic media.
- **FR-008**: Supported entry points MUST provide actionable wrong-host/missing-prerequisite guidance before GUI startup, distinguish actual from injected prerequisite tests and require no sender state. Full provisioning MUST use the host package manager and MUST NOT remove shared prerequisites during application removal.
- **FR-009**: Artifacts MUST contain verifiable version/edition/OS/architecture/package/prerequisite/source identities, complete payload inventory, notices including vendored dependencies, executable modes and truthful signing disposition; malformed/modified/unlisted/unsafe payloads MUST be rejected by qualification.
- **FR-010**: Download/container, extracted/installed application and host-runtime footprints MUST be recorded separately with exact units and attribution; unavailable observations MUST retain explicit reasons.
- **FR-011**: Native/package verification MUST run on isolated hosted Linux desktops with actual produced release-profile candidates and existing source-bound media/lifecycle/integrity gates; local work MUST remain headless. Preserve 660-second qualification target,900-second hard limit,15-second finalization reserve and separate preparation/qualification/combined accounting.
- **FR-012**: Public documentation, platform matrix and package contracts MUST describe supported installation, Lite operation, prerequisites, collisions, repeat/removal and measured trust limits without advertising an unreleased product as published.
- **FR-013**: Final applicable CI MUST be green, every external review comment MUST be handled within at most two rounds, and the pushed official PR MUST stop for owner final review and squash merge.

### Key Entities

- **Linux package identity**: software version, edition, target, package format, source and artifact digests, exact payload inventory/modes, prerequisite and trust disposition.
- **Owned installation**: registered package, physical owned application/integration destinations and exact candidate identity; foreign or modified content is an explicit conflict.
- **Recipient session**: installed or Lite entry point, explicit/external gallery root, host prerequisites and independent portable/user state.
- **Qualification receipt**: exact source/artifact/host identities, native outcomes, retained failures, measured footprints and separate elapsed accounting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Full installs, runs, repeats and removes on the elected host with exactly one command/desktop integration, exact payload identity and all retained data sentinels unchanged.
- **SC-002**: Extracted Lite passes all elected in-place/explicit-root/relocation/Refresh/settings/native media scenarios without Full or a sender profile.
- **SC-003**: Every elected corruption, wrong-host, missing-prerequisite and ownership-collision fixture fails actionably; no unrelated content is overwritten or removed and no failed observation becomes a successful receipt.
- **SC-004**: Both final artifacts have verified complete identities, notices, modes and independently readable footprint/source evidence, with all mandatory qualification scopes passing within the preserved hard deadline.
- **SC-005**: All review comments are resolved in at most two rounds, final CI is green on the pushed PR head and the owner receives an accurate final-review handoff.

## Assumptions

- The approved initial Linux policy is a Full Debian package and Lite executable tar.gz for Ubuntu24.04 x86_64, GTK3/WebKitGTK4.1/libsoup3 and isolated X11. Alternate distributions/architectures, AppImage and Wayland retain separate qualification.
- Reuse the native core and settled launch/settings/brand contracts. This slice does not add previews/editing, update migration, gallery preparation or product release publication (#20/#21/#25/#26/#27/#31).
- Full uses normal explicit administrator/package-manager authorization; Lite remains non-installing. Signing disposition is recorded truthfully; no new release credentials or repository-signing infrastructure is implied.
- Candidate creation, CI publication and PR creation are explicitly authorized. Actual product release and final PR merge are not authorized by this request.

## Clarifications

### Session 2026-10-29

- Q: Which Full installation scope is elected? A: The existing approved Debian system package-manager scope; no parallel home installer or replacement package architecture.
- Q: What should happen to changed owned files during removal or repeat? A: Refuse destructive operations with exact conflict guidance, retaining unrelated extras and all gallery/user state; cross-version replacement remains #25.
- Q: Does artifact publication in this slice create a product release? A: No. Publish source-bound CI package candidates and the official PR; actual product release remains #26/#31 and owner merge is the final boundary.
