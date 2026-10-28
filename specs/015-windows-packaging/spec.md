# Feature Specification: Windows Full installation and Lite packages

**Feature Branch**: `codex/015-windows-packaging`

**Created**: 2026-10-27

**Status**: Draft

**Input**: Owner confirmed S015/#22 after merging S014. Continue Spec Kit/autopilot, automatic push/PR, CI and at most two review rounds; owner performs final review/merge.

## User Scenarios & Testing

### User Story 1 - Install verifiable Full (Priority: P1)

A Windows user installs Full into the documented default user location, gets usable application/command integration, and can identify the installed version, edition and architecture. Installation verifies or provisions the declared shared runtime. Repeating installation does not duplicate integration.

**Why this priority**: The existing native application has no recipient installer.

**Independent Test**: Install the generated artifact on an isolated Windows host, inspect payload/integration, launch a small gallery and repeat installation.

**Acceptance Scenarios**:

1. **Given** a supported host without this application, **When** Full is installed, **Then** actual files, scope, version, architecture and integration agree with the candidate identity and native browsing works.
2. **Given** a missing shared runtime, **When** Full installation is selected, **Then** it provisions and verifies the prerequisite or reports an actionable failure before claiming success.
3. **Given** the same owned installation, **When** installation is repeated, **Then** exactly one owned integration set remains and media/user state are unchanged.
4. **Given** a conflicting directory, command, shortcut, architecture or unrelated installation, **When** installation is attempted, **Then** the conflict is identified before unrelated bytes or registrations are replaced.

### User Story 2 - Extract and relocate Lite (Priority: P1)

A recipient extracts Lite alongside a gallery and browses without Full, developer tools, sender state or a chosen browser application. Moving Lite and the gallery together preserves in-place resolution and manual Refresh.

**Why this priority**: Independent in-place use is Lite's defining recipient behavior.

**Independent Test**: Extract to a path with spaces/non-ASCII text, browse, relocate, change media and explicitly Refresh.

**Acceptance Scenarios**:

1. **Given** extracted Lite and the declared host runtime, **When** launched in place, **Then** it resolves the gallery independently of sender history and native viewing works.
2. **Given** relocated Lite/gallery files, **When** files change and Refresh is selected, **Then** current files are observed with portable settings and source bytes preserved.
3. **Given** a missing prerequisite, **When** Lite is launched, **Then** it reports a useful dependency/installation result without claiming success or substituting a different product.

### User Story 3 - Remove only owned installation state (Priority: P1)

A user removes Full while retaining galleries, media, sidecars, unrelated content and default-retained preferences. Removing Lite leaves media independent.

**Why this priority**: Packaging must preserve data outside installation ownership.

**Independent Test**: Install with sentinel galleries/state and unrelated content/integration, uninstall the actual artifact, and compare bytes and registrations.

**Acceptance Scenarios**:

1. **Given** owned Full and independent user data, **When** Full is removed, **Then** only its owned application files/integration are removed and retained data remains byte-identical.
2. **Given** unrelated files or colliding registrations, **When** removal runs, **Then** it preserves them and never executes an unrelated uninstaller.
3. **Given** extracted Lite, **When** its package files are removed, **Then** gallery media remains independently usable.

### User Story 4 - Inspect exact candidate identity and evidence (Priority: P2)

A maintainer can distinguish candidates from published releases and inspect exact payload, prerequisite, signing and download/extracted/installed/runtime footprints.

**Why this priority**: Support and distribution claims require attributable recipient evidence.

**Independent Test**: Build both artifacts, independently inspect their inventories, execute elected native journeys and reject changed/mismatched payloads.

**Acceptance Scenarios**:

1. **Given** generated artifacts, **When** evidence is inspected, **Then** source, shared software/docs/schema version, edition, architecture, format, hashes, notices and footprints agree.
2. **Given** damaged, incomplete or mismatched payloads, **When** packaging/installation validation runs, **Then** it fails before reporting verified installation or support.
3. **Given** no published product release, **When** artifacts are described, **Then** they remain candidates and public release/download pointers do not advance.

### Edge Cases

- Empty and unrelated nonempty destinations, substituted/redirected paths, denied writes and wrong architecture.
- Unrelated command/shortcut/uninstall entries, stale ownership markers and incomplete previous installation.
- Absent or incompatible runtime, failed provisioning, and an existing shared runtime used by other applications.
- Spaces/non-ASCII paths, unrelated working directories, relocation and absent developer tools.
- Repeated/canceled installation/removal; media or sidecars adjacent to installation files; retained preferences and unknown settings fields.
- Unsupported updates/downgrades must be identified before destructive replacement; broader migration/recovery remains separate work.

## Requirements

### Functional Requirements

- **FR-001**: Produce distinct Windows x86_64 Full installer and in-place Lite artifacts using the existing native application, common launch/state contracts and bundled interface.
- **FR-002**: Bind artifacts to exact qualified source, shared software/docs/schema version, edition, architecture, package format, payload inventory and hashes; reject missing/mismatched entries.
- **FR-003**: Full MUST default to the approved per-user Programs destination and provide a separately elected per-machine scope. Both scopes MUST identify privileges, actual destination and native verification results.
- **FR-004**: Inspect actual destination, ownership, version, architecture and integration before replacement; unrelated collisions MUST leave unrelated content unchanged.
- **FR-005**: Repeating the same owned installation MUST leave one integration set, verified installed identity and preserved media/user state.
- **FR-006**: Full MUST verify or provision the declared shared runtime and report failure before claiming installation success. Application removal MUST preserve shared runtime ownership.
- **FR-007**: Installed Full MUST expose documented application/command integration and launch the actual gallery from ordinary and unrelated working directories.
- **FR-008**: Lite MUST browse on the declared host without Full, sender state, developer tools or a chosen browser application; missing prerequisites MUST be actionable.
- **FR-009**: Lite extraction/relocation MUST preserve bundle/auxiliary payloads, in-place/explicit-root launch, portable settings and Refresh without gallery-manifest regeneration.
- **FR-010**: Removal MUST affect only owned application files/integration and retain media, sidecars, galleries, unrelated content and default-retained settings. Data deletion requires a separate explicit choice.
- **FR-011**: Failed/canceled installation or unsupported replacement MUST not claim success or reset state; diagnostics MUST identify remaining ownership/recovery state. Broader migration/rollback remains separate work.
- **FR-012**: Report download, extracted, installed application, shared runtime and optional-payload bytes separately; unknown measurements MUST carry reasons instead of zero.
- **FR-013**: Record signing disposition, prerequisites, exact elected hosts and unqualified combinations; build success alone MUST NOT imply client, trust-prompt or clean-machine qualification.
- **FR-014**: Exercise real artifact install/reinstall, extraction, native launch, relocation, Refresh, missing-runtime handling, collisions and removal on isolated hosted Windows machines, retaining source/artifact/fixture-bound receipts and independent read-back.
- **FR-015**: Preserve existing repository, native media/accessibility, launch, state and integrity contracts. Run mandatory checks under existing preparation/readiness and qualification timing rules. Local GUI/input/installer execution on the owner's workstation is prohibited.
- **FR-016**: Publish authoritative candidate guidance and dated decisions, preserving version0.0.0 until separately authorized release work. Do not publish a release/tag or advance public download pointers.
- **FR-017**: Automatically push/open the S015 PR for #22, address findings under at most two S015 review rounds, and stop for owner final review/merge after applicable CI is green.

### Key Entities

- **Windows candidate package**: edition/version/source/architecture, format, prerequisite/signing disposition, exact payload and footprints.
- **Owned installation**: verified destination/scope, installed identity and owned files/registrations, separate from user data and shared runtime.
- **Integration set**: application/command, shortcut and uninstall registrations, intended scope and collision observations.
- **Prerequisite observation**: runtime discovery, version/architecture, provisioning action and verified terminal result.
- **Native package receipt**: install/extract/remove journeys bound to source, artifact bytes, elected host, fixture integrity and timing.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Both editions complete actual native recipient journeys on every elected package/host combination without sender/developer-tool browsing dependencies.
- **SC-002**: Two installations of the same Full artifact leave exactly one owned integration set and the expected installed inventory.
- **SC-003**: Every elected collision, damaged identity and missing-runtime failure is attributable before success, with unrelated sentinel bytes/registrations unchanged.
- **SC-004**: Removal and Lite relocation preserve100% of elected media, sidecar and retained-preference hashes.
- **SC-005**: Every accepted receipt matches exact source/artifacts and includes required identity, scope, runtime, signing and footprint observations; mandatory source/product/site checks pass under existing qualification rules.
- **SC-006**: The official S015 PR closes #22 on owner merge, with all findings addressed, at most two review rounds and no agent-performed release/tag/merge.

## Assumptions

- #22 is the owner-confirmed slice. The existing Windows x86_64/shared-runtime policy and per-user default govern; construction choices will be researched and recorded.
- Hosted native Windows provides elected evidence; other client versions/architectures remain separately identified instead of inheriting unperformed tests.
- No signing credentials or release publication are supplied/authorized. Candidate signing disposition remains explicit without invented signatures or attended gates.
- Optional tools remain independently identified and cannot become undeclared mandatory browsing dependencies.
- Cross-platform packages, migrations, release publication, gallery launchers and docs promotion remain #23/#24/#25/#26/#27/#31 respectively.

## Clarifications

### Session 2026-10-27

Autopilot answers use #22 and the approved installation policy; they are engineering resolutions, not newly attributed owner instructions.

- Q: Which installation scopes are elected? A: Per-user default and explicit per-machine, each with native verification (FR-003).
- Q: Are these published releases? A: No, version0.0.0 candidates only; no release/tag or public pointer promotion (FR-016).
- Q: What determines removable content? A: Exact application ownership; unrelated files, media, sidecars, state and shared runtime remain outside removal ownership (FR-004/010).
- Q: Does this slice implement version migration? A: No; same-artifact repetition is required, unsupported replacements fail before destructive changes, and broader upgrades/recovery remain #25 (FR-005/011).
- Q: Where are real installation and GUI checks executed? A: Isolated hosted Windows only; exact host/architecture/coverage is recorded and client targets do not inherit unperformed tests (FR-013/014/015).
