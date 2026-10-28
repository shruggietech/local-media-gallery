# Feature Specification: macOS Full and Lite packages

**Feature Branch**: `codex/016-macos-packaging`

**Created**: 2026-10-28

**Status**: Specified

**Input**: S016, complete GitHub issue #23 under autopilot, publish a PR, handle CI and at most two review rounds, stop for owner merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install and remove Full (Priority: P1)

A macOS user installs Full at an elected user or system Applications location, launches a selected gallery, and removes application integration while retaining personal content.

**Why this priority**: A runnable proof bundle does not provide an installation lifecycle.

**Independent Test**: Mount the actual distribution, install Full, invoke its installed command and native window, repeat installation, remove it and inspect retained content.

**Acceptance Scenarios**:

1. **Given** a supported host and empty destination, **When** installation elects user scope, **Then** it verifies the host and candidate, installs the app and one command at documented locations, and reports exact identity.
2. **Given** explicit system scope, **When** the required privileges are available, **Then** installation uses system destinations and reports that scope; an unelevated attempt fails before mutation.
3. **Given** unrelated destination, command or altered installed bytes, **When** install or removal is requested, **Then** it reports the conflict and retains unrelated content.
4. **Given** an unchanged owned installation, **When** installation repeats, **Then** it reports the existing result without duplicate integration.
5. **Given** installed Full plus media, sidecars, settings and foreign extra files, **When** removal completes, **Then** only owned unchanged files and integration are removed and personal content remains.

### User Story 2 - Browse with portable Lite (Priority: P1)

A recipient extracts Lite adjacent to a gallery and browses without installing Full or developer tools.

**Why this priority**: Sharing must work independently of sender state.

**Independent Test**: Extract the actual archive on the elected native host, launch its ordinary app, move the outer gallery, add media and Refresh.

**Acceptance Scenarios**:

1. **Given** Lite beside a gallery with spaces and non-ASCII names, **When** it launches in place, **Then** its gallery root is outside bundle internals and the native window renders the expected media.
2. **Given** a relocated outer gallery, **When** Lite relaunches and Refresh is selected after adding media, **Then** it reflects that directory and preserves portable settings.
3. **Given** an explicit root outside a mounted distribution, **When** either edition launches, **Then** it browses that root rather than the mount or app internals.
4. **Given** a launch whose implicit root is a temporary mount or translocated location, **When** no reliable gallery location exists, **Then** it requires an explicit gallery choice and never claims the temporary directory is the gallery.

### User Story 3 - Inspect distribution identity and trust (Priority: P2)

A maintainer or recipient can identify exact editions, versions, platform, prerequisites, signatures and sizes without treating candidate artifacts as public releases.

**Independent Test**: Independently extract both distributions, verify inventory and executable permissions, inspect native identity/signature/quarantine results and reconcile measured footprints.

**Acceptance Scenarios**:

1. **Given** Full and Lite candidates, **When** inventories are inspected, **Then** both identify the same version, macOS 15 Apple Silicon baseline, ordinary release profile, exact source and separate artifact hashes.
2. **Given** a candidate without Developer ID credentials, **When** trust is assessed, **Then** ad-hoc signing, absent notarization and actual quarantine/Gatekeeper behavior are recorded truthfully without silently removing quarantine.
3. **Given** completed hosted checks, **When** evidence is finalized, **Then** download, extracted, installed and shared-runtime footprints are distinguished and preparation, qualification and combined durations are recorded.

### Edge Cases

Destination symlinks, command symlinks, nested symlink parents, changed ownership receipts, unsupported host/architecture, missing framework, existing different versions, interrupted staging, unreadable files, malformed paths, mount roots, detached DMG, missing auxiliary files, altered app content, and retained foreign additions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Both packages MUST preserve native bundle structure, required assets and executable modes with exact edition/version/OS/architecture/prerequisite identities.
- **FR-002**: Full MUST verify the declared host prerequisites and candidate bytes before installation, and report unsupported prerequisites without claiming success.
- **FR-003**: Full MUST implement explicit user/system scope, verified destination and command ownership, collision refusal, defined repeat behavior and privilege failure before mutation.
- **FR-004**: Removal MUST retain media, sidecars, galleries, settings/history and foreign files, and remove only unchanged owned files and integration.
- **FR-005**: Lite MUST run without Full, sender profile, Node, Python, Rust, FFmpeg or a chosen browser application using the elected host facilities.
- **FR-006**: Native acceptance MUST cover extracted ordinary apps, explicit/in-place roots, Unicode/spaces, relocation, Refresh and visible media outside bundle/mount internals.
- **FR-007**: Temporary/translocated implicit locations MUST require explicit gallery selection instead of silently selecting an unreliable root.
- **FR-008**: Evidence MUST report observed code-signing, notarization, quarantine and recipient launch disposition separately from public release trust.
- **FR-009**: Evidence MUST bind archive and installed inventory, permissions, auxiliary payloads, source, native binaries and visible frames to measured footprints.
- **FR-010**: Mandatory repository, product, site and native package checks MUST preserve existing assertions and the qualification timing contract.
- **FR-011**: Delivery MUST publish the authorized branch/PR, resolve every actionable review thread within at most two requested review rounds, and leave merge to the owner.

### Key Entities

- **Candidate**: Edition, release version, native target, package format, prerequisite identity, source, exact inventory and archive digest.
- **Installation**: Scope, actual destination, command destination, generation, owned file inventory and retained user data.
- **Qualification receipt**: Tested source, host, artifact identities, native operations and observations, footprints and terminal timing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Both extracted editions render and browse the elected native fixture; Lite relocation and explicit Refresh expose the expected added media.
- **SC-002**: Both installation scopes pass install, repeat and selective removal; each tested collision leaves unrelated bytes unchanged.
- **SC-003**: Every shipped file and executable mode reconciles with the artifact inventory, and missing or altered payload fails validation.
- **SC-004**: Every mandatory qualifying scope passes within the existing 900-second hard qualification deadline, recording preparation separately and treating the 660-second target as advisory.
- **SC-005**: The PR has terminal green applicable checks, no unresolved actionable reviews and no more than two requested review rounds before owner handoff.

## Assumptions

- Existing elected baseline is macOS 15 on Apple Silicon. Intel/universal support requires separate evidence.
- Full uses an app bundle distributed by DMG; Lite uses an app archive. No published release or signing credentials are inferred.
- User scope defaults to the user's Applications and local command directory; system scope is explicit. Settings follow existing launch/state contracts.
- Upgrade/downgrade recovery campaigns remain #25; this slice must still reject unsupported replacement and clean failed new-install staging.

## Clarifications

### Session 2026-10-28

- Q: Expand the platform matrix? A: Preserve the existing elected macOS 15 arm64 baseline, retaining unqualified targets explicitly.
- Q: Require Developer ID credentials to build candidates? A: Produce and verify ad-hoc candidates, assess quarantine and record unnotarized disposition; public trust/promotion remains release work.
- Q: Where are Full commands installed? A: User scope uses `~/.local/bin`; system scope uses `/usr/local/bin`. Do not edit shell profiles. Report PATH guidance and detect visible command collisions.
- Q: Which removal policy applies to foreign additions? A: Remove unchanged owned files only, retain extras and changed files with a concrete retained-path result.
