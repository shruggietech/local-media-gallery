# Feature Specification: Initial public release

**Feature Branch**: `codex/s022-initial-public-release`

**Created**: 2026-10-31

**Status**: Specified

**Input**: Owner-directed S022 adopts the proposed first public v0.1.0 release, explicit richer-preview and editing deferrals, full native/documentation qualification, automatic PR publication and at most two review rounds. Stop for owner final review/merge; publish accepted release bytes after that merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Obtain an identifiable first release (Priority: P1)

A recipient obtains the Full or Lite package for an elected supported platform and sees the same 0.1.0 product identity in the software, documentation and schema. The retained 0.0.0 specification remains independently readable.

**Why this priority**: A qualified implementation becomes useful to recipients only when its version and distribution are identifiable.

**Independent Test**: Qualify the complete six-package release candidate, inspect actual native identities and compare every artifact with its retained qualification record.

**Acceptance Scenarios**:

1. **Given** the unreleased baseline, **When** the first release candidate is prepared, **Then** all elected package and contract identities say 0.1.0 and retained baseline bytes are unchanged.
2. **Given** accepted package bytes and evidence, **When** release assembly repeats, **Then** it retains the exact same files, dependencies, source identity and candidate identity without rebuilding accepted bytes.
3. **Given** a stale baseline-only assumption, wrong version, missing input or altered artifact, **When** release qualification runs, **Then** the affected check fails and publication cannot proceed until corrected and requalified.

### User Story 2 - Understand the initial supported scope (Priority: P1)

A reader can distinguish the first release's implemented browsing, metadata, settings, optional thumbnail jobs and Full/Lite operation from later optional additions and unsupported platform combinations.

**Why this priority**: Accurate initial scope enables publication without implying unapproved capabilities.

**Independent Test**: Review the complete 0.1.0 documentation and rendered candidate site against the explicit feature/support inventory and retained baseline.

**Acceptance Scenarios**:

1. **Given** open preview and editing decisions, **When** the first-release scope is recorded, **Then** richer previews/autoplay/additional criteria and media editing are explicitly deferred, while current defaults and read-only viewing remain intact.
2. **Given** an optional gallery-preparation journey, **When** a reader considers sharing, **Then** existing settings/thumbnail operations are distinguished from deferred guided recipient-launcher preparation; browsing never requires either.
3. **Given** no actual published release yet, **When** candidate documentation is rendered, **Then** public download/latest selection remains on the existing baseline; both complete retained versions pass rendering, navigation, search, reference and schema checks.

### User Story 3 - Publish verified bytes after owner merge (Priority: P1)

After the owner reviews and merges the release preparation PR, the operator completes the same slice by publishing its newly accepted main-source release and matching documentation, then independently reads back public results.

**Why this priority**: Preparation alone does not deliver the first public release.

**Independent Test**: First exercise recovery against controlled publication state; after owner merge, verify the real published tag, six primary artifacts, support metadata, canonical record and matching public website.

**Acceptance Scenarios**:

1. **Given** a candidate PR, **When** its CI and at most two review rounds finish, **Then** every finding has a substantive response/resolution and the operator stops for the owner-controlled merge without publishing from the branch.
2. **Given** the owner-merged version and green trusted-main qualification, **When** the publication phase executes, **Then** the exact accepted bytes and observed identities are published, both documentation gates pass, and downloads/latest documentation advance together.
3. **Given** an interrupted upload, stale qualification or failed documentation/promotion step, **When** execution resumes, **Then** existing observed-state recovery is used, unrelated assets remain unchanged and no success is claimed before independent public readback passes.

### Edge Cases

- A nonzero build still emits a baseline version or a mandatory consumer reads the baseline schema.
- Preserving old schemas conflicts with validators that incorrectly demand the current version in all retained snapshots.
- A candidate snapshot is complete but has not yet been associated with a published product.
- Source changes after native acceptance, or the PR merge revision differs from qualification provenance.
- Release or website publication partially succeeds before acknowledgement; a repeat must reconcile actual state.
- A documentation capture source revision differs from the later qualified product revision; both identities remain attributable without a self-referential commit requirement.
- The first release has no previous published product; it must not treat the specification baseline as a shipped predecessor.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Software, release documentation and application-owned master/schema contracts MUST share product version 0.1.0; package manager and compiled native identities MUST agree.
- **FR-002**: The complete 0.0.0 documentation/schema baseline MUST remain byte-for-byte retained and labelled as a specification baseline, with its original meanings preserved.
- **FR-003**: All mandatory build, structural, unit, native, packaging and website consumers MUST correctly handle the elected nonzero version and its matching schema without weakening identity or evidence checks.
- **FR-004**: Release qualification MUST cover the six existing elected Full/Lite package rows for Windows x86_64, Linux x86_64 and macOS aarch64, plus required supporting metadata, native dependencies, inventories, permissions and notices.
- **FR-005**: Initial release scope MUST retain current browsing, filtering/sorting, focused viewing, metadata, settings, explicit Refresh, adaptive loading and optional thumbnail jobs; no existing capability is removed merely to publish.
- **FR-006**: Richer preview/autoplay/extra browsing criteria and media editing MUST be explicitly deferred for 0.1.0. Ordinary viewing remains read-only. These are release-scope decisions for #20/#21, not permanent prohibitions.
- **FR-007**: Guided gallery preparation with fetched recipient launchers remains tracked in #27 for subsequent work consuming verified published Lite artifacts; current optional settings/thumbnail operations and ordinary relocation remain accurately documented.
- **FR-008**: The new complete documentation snapshot and every retained snapshot MUST pass both candidate and observed-publication contexts through the current renderer, with version/topic/search/schema/example/link/asset/download identity checks and an ordinary vocabulary review.
- **FR-009**: Before publication, candidate documentation and downloads MUST NOT replace the existing public selection or assert that a product has shipped. The release manifest MUST support selecting the specification baseline until actual publication is verified.
- **FR-010**: Accepted native bytes MUST be retained unchanged through assembly and publication, bound to exact accepted source, elected version and trusted qualification. Any changed logical source or mismatched input requires new applicable qualification.
- **FR-011**: S022 MUST automatically push/open an official PR, complete green CI, handle every review finding and trigger no more than two total requested review rounds, then stop for owner final review and squash merge.
- **FR-012**: Actual release execution MUST occur only after the owner merge and successful trusted-main qualification. It MUST publish/read back the actual tag/assets/canonical record, pass both documentation gates, deploy the exact accepted site output and verify public latest/download selection.
- **FR-013**: Interrupted publication MUST use the existing observed-state recovery without blindly overwriting foreign assets or rebuilding accepted bytes. An absent predecessor MUST remain explicit for this first release.
- **FR-014**: Qualification MUST retain preparation, qualification and combined terminal accounting, a 660-second target, 900-second hard limit and 15-second finalization reserve. Native GUI/input/installer checks MUST remain isolated from the active workstation. Project signing/notarization/stapling remains permanently out of scope.

### Key Entities

- **Initial release scope**: Version, included existing capabilities, explicit optional deferrals, elected platform rows and published evidence limits.
- **Retained snapshot**: Versioned documentation, schemas, navigation, assets and vocabulary review with complete byte inventory and capture provenance.
- **Qualified release candidate**: Exact source/version identity, six primary native artifacts, support metadata, qualification receipts and immutable candidate identity.
- **Observed publication**: Actual release/tag/asset identities, independent content readback, matching canonical record and public documentation/download selection.
- **Delivery phase**: Pre-merge specification/implementation/qualification/reviews versus post-merge trusted qualification/publication/readback; owner merge separates them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All six elected Full/Lite packages and every current-version software/documentation/schema identity consistently identify 0.1.0; every retained baseline file remains unchanged.
- **SC-002**: Every elected qualification scope terminates with a pass and independently matching source/artifact evidence before its accepted bytes are used.
- **SC-003**: Both retained documentation versions pass complete source/rendered checks, including actual version switching, scoped search, references and exact download selection.
- **SC-004**: Initial-scope decisions for both #20 and #21 are recorded with included/deferred behavior; #27 remains independently tracked without becoming a browsing prerequisite.
- **SC-005**: The pre-merge handoff has a clean pushed head, all terminal required checks green and zero unresolved review threads after at most two requested rounds.
- **SC-006**: After owner merge, one independently verified public 0.1.0 release exposes all six accepted primary artifacts and matching canonical documentation/download selection without modifying accepted bytes.

## Assumptions

- The owner accepted the proposed 0.1.0 scope and release sequence by instructing S022 according to the preceding recommendation. The current request ends at the owner merge ritual; the already specified post-merge publication phase resumes after that merge.
- Release tooling from S021 is the foundation to exercise and correct proportionally, not a reason to introduce another distribution system.
- Current elected hosts and evidence limits remain authoritative; this release does not certify every intended OS/architecture combination.
- No product release currently exists, and the current VERSION is 0.0.0. The first release has no shipped predecessor.
- No new preview, autoplay, editing, media-management, universal runtime bundle or guided preparation implementation is included.
