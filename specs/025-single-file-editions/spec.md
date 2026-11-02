# Feature Specification: Single-file editions

**Feature Branch**: `codex/s025-single-file-editions`

**Created**: 2026-11-02

**Status**: Implemented and qualified; owner final review and merge pending

**Input**: S025, complete GitHub #80 under autopilot, automatic push and PR publication, at most two review rounds, owner-controlled final review and merge.

## User Scenarios & Testing

### User Story 1 - Download and move one Lite executable (Priority: P1)

A recipient downloads one native Lite executable, places it with a gallery and opens that gallery without installing Full or handling application companions. Moving that file and the gallery preserves browsing and Refresh.

**Why this priority**: An archive or application directory fails the explicit distribution requirement.

**Independent Test**: Copy only the downloaded executable into a fresh gallery on each supported host; launch without Full or maintainer tools, relocate, relaunch and Refresh.

**Acceptance Scenarios**:

1. **Given** a supported host with declared Lite prerequisites and no Full, **When** the single delivered executable launches, **Then** images and videos are browsable without downloaded companions, installation, elevation or sender state.
2. **Given** a working gallery, **When** media and the executable move, **Then** relaunch and Refresh use the new root and retain media.
3. **Given** a missing declared host prerequisite, **When** Lite starts, **Then** the actual missing prerequisite is reported without claiming success or installing Full.

### User Story 2 - Install complete Full offline (Priority: P1)

A recipient downloads one Full installer and uses normal platform privileges to install every implemented feature at system scope without online bootstrap downloads or selecting extra components.

**Why this priority**: Loose toolkits and online runtime provisioning do not provide the requested experience.

**Independent Test**: Copy only the installer onto an isolated supported clean host with redistributable prerequisites absent and networking disabled; install, browse/play media and generate video thumbnails using bundled dependencies.

**Acceptance Scenarios**:

1. **Given** a supported clean host with only unavoidable OS facilities, **When** the single installer runs offline, **Then** application, redistributable runtimes, feature helpers and integration are installed at system scope.
2. **Given** installed Full, **When** browsing, playback and video-thumbnail preparation run, **Then** each feature uses declared OS facilities or bundled dependencies without maintainer tools or separately selected helpers.
3. **Given** an owned installation or foreign destination, **When** install, repeat, upgrade, recovery or removal runs, **Then** ownership checks remain enforced and media, sidecars and retained settings survive.

### User Story 3 - Select and maintain the right product (Priority: P2)

Downloads present exactly Lite and Full per covered platform. Gallery preparation and maintenance consume the same verified artifacts without manual internal metadata handling.

**Why this priority**: Packaging alone leaves release, update and sharing paths incompatible.

**Independent Test**: Validate all six candidate product artifacts, download projections, prepared recipient files and maintenance operations against release identities.

**Acceptance Scenarios**:

1. **Given** a covered platform, **When** selecting a download, **Then** exactly two product choices identify edition, version, OS and architecture, separately from metadata/debug material.
2. **Given** verified release metadata, **When** gallery preparation selects Lite, **Then** only its executable is delivered as the recipient application and replacement integrity is checked.
3. **Given** a separately authorized official release, **When** downloads are published, **Then** final product names omit candidate and historical v0.1.0 bytes remain unchanged.

### Edge Cases

- Truncated, tampered, stale and mismatched-platform artifacts fail before installation or replacement.
- Unicode/spaced paths, open processes, read-only galleries and cancellation retain integrity guarantees.
- Privilege denial reports failure without claiming installation.
- Demonstrated platform or redistribution constraints require owner resolution before weakening a requirement.
- User-generated gallery settings and caches are not distributed application dependencies.
- Debug databases and build/qualification tooling are excluded from product payloads.

## Requirements

### Functional Requirements

- **FR-001**: Exactly one Lite and one Full artifact for Windows x86_64, Ubuntu 24.04 Linux x86_64 and macOS 15 Apple Silicon; retained untested architectures remain unqualified.
- **FR-002**: Lite is one directly delivered native executable containing required resources, notices and maintenance metadata, without distributed companion files or manual extraction.
- **FR-003**: Lite launches and relocates without elevation, Full, system installation, sender state or maintainer tools; host prerequisites and feature differences are precise.
- **FR-004**: Full is one self-contained system installer with all application payloads, redistributable runtimes, available feature dependencies, helpers, maintenance metadata and notices.
- **FR-005**: Full installs with networking disabled and redistributable prerequisites initially absent. A per-platform feature inventory distinguishes OS facilities and bundled dependencies.
- **FR-006**: Full automatically wires bundled video-thumbnail support and preserves every implemented feature.
- **FR-007**: Managed installation may deploy internal components, but ordinary install/maintenance requires no loose directories or manually selected descriptors. Lite distributes no such companions.
- **FR-008**: Preserve ownership/collision checks, repeat installation, upgrade/recovery, uninstall and media/settings retention. Exclude build/debug artifacts.
- **FR-009**: Builders, schemas/manifests, updates, gallery preparation, docs and website agree on artifact forms and two product choices per platform.
- **FR-010**: Official product names identify version, edition, OS and architecture without candidate. Candidate provenance remains explicit in internal evidence and machine metadata.
- **FR-011**: Preserve v0.1.0 identities and snapshots; coordinate new source/docs/schema as unreleased v0.2.0 until separately authorized publication.
- **FR-012**: Native acceptance copies only delivered files onto isolated hosts and proves launch/install/features/lifecycle with inventory, integrity and provenance evidence.

### Key Entities

- **Product artifact**: Edition/platform/architecture/version identity and directly delivered executable or installer bytes with required embedded contents.
- **Dependency inventory**: Feature mapping to OS facilities or bundled redistributables with provenance and notices.
- **Managed installation**: Owned files/integration and lifecycle identity with retained data boundaries.
- **Release projection**: Verified product identities shared by downloads, updates and preparation, separate from maintainer evidence.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Three platform rows produce two product files each, six total, with no required distributed application companions.
- **SC-002**: Every Lite file passes copy-alone launch, relocation and Refresh on its declared host.
- **SC-003**: Every Full installer passes offline system installation and all implemented features with redistributable prerequisites initially absent.
- **SC-004**: Every supported lifecycle path retains media/settings and rejects foreign collisions.
- **SC-005**: Downloads, updates and gallery preparation consume the same six release identities; historical identities remain unchanged.

## Assumptions and Clarifications

- Current authorization covers implementation, automatic push and PR creation. Merge and release publication remain owner-controlled.
- Full bundles redistributables; unavoidable OS facilities remain prerequisites. Lite may declare host prerequisites without hiding distributed companion requirements.
- Generated private runtime state differs from distribution; ordinary users must not unpack or retain an application directory to run Lite.
- Legacy per-user Full defaults, Lite archives and loose maintenance operands are behavior to replace, not exceptions to #80.
- No signing, notarization or attended acceptance prerequisite is introduced.

## Clarifications

### Session 2026-11-02

No critical product ambiguities detected. Functional scope, entities, identity, error/recovery, dependencies, terminology and completion criteria are clear. Packaging mechanics and native feasibility are deferred to plan research. No owner questions asked; quality checklist remains 7/7.
