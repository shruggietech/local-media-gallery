# Feature Specification: Website foundation and hosted qualification

**Feature Branch**: `codex/005-website-foundation`

**Created**: 2026-10-23

**Status**: Approved for autonomous implementation

**Input**: Owner-authorized S005 implementing GitHub issues #6, #28, #29 and #30 with automatic push and official PR, bot review handling (maximum two rounds), and a final halt before merge.

## User Scenarios & Testing

### User Story 1 - Understand availability (Priority: P1)

A visitor reads an independent branded introduction and reaches documentation, support and licensing with honest edition/platform availability.

**Why this priority**: Source publication must not imply downloadable product packages.

**Independent Test**: Visit the landing page before any product release; read approved identity/copy and development status, use keyboard navigation and follow documentation/support/license links.

**Acceptance Scenarios**:

1. **Given** no verified published product, **When** the landing opens, **Then** no invented download links or qualified-platform assertions appear.
2. **Given** verified release metadata, **When** the site builds, **Then** download claims use only matching published artifact identity; malformed or candidate records fail validation.
3. **Given** a narrow viewport or keyboard-only interaction, **When** visitors use navigation, **Then** content remains readable and focus visible without documentation-only runtimes on the landing.

### User Story 2 - Read a complete version (Priority: P1)

Readers browse all retained documentation, choose a version and search within a visible version context.

**Why this priority**: Historical contracts must remain distinguishable and navigable.

**Independent Test**: Crawl all fifteen baseline chapters and a synthetic second snapshot; follow chapter/fragment/image/reference links, search and switch topics between versions.

**Acceptance Scenarios**:

1. **Given** a retained snapshot, **When** any chapter opens, **Then** its complete content, ordered navigation, diagrams and labelled code are readable at stable topic URLs.
2. **Given** a matching topic in another version, **When** switching versions, **Then** the topic is preserved; a missing topic produces an explicit fallback explanation.
3. **Given** a historical page or search, **When** following ordinary links/results, **Then** the selected version and its assets remain authoritative.
4. **Given** documentation entry/latest aliases, **When** opened on static hosting, **Then** working static pages identify the selected snapshot and its pre-product status.

### User Story 3 - Inspect public references (Priority: P2)

Readers inspect the single master changelog and application-owned versioned JSON contracts, including nested/composed schema structures and raw sources.

**Why this priority**: Reference documentation must follow actual sources rather than duplicated field lists.

**Independent Test**: Compare rendered/raw references with source hashes and inspect nested objects, arrays, references, alternatives and conditionals in small schema fixtures.

**Acceptance Scenarios**:

1. **Given** an existing schema, **When** its reference opens, **Then** version, generic structure, reference targets and exact raw source are available.
2. **Given** no schema for a version, **When** browsing its references, **Then** no fabricated contract appears.
3. **Given** schema examples, **When** checked, **Then** each is validated against its stated historical schema.

### User Story 4 - Assess an exact revision (Priority: P1)

Maintainers receive terminal hosted results using the same repository/product/site checks and identifiable source/artifact evidence.

**Why this priority**: Local source checks alone cannot satisfy hosted CI or native runtime claims.

**Independent Test**: Observe successful hosted jobs on the final PR revision, inspect qualification/artifact records, and read back the applied required-check policy.

**Acceptance Scenarios**:

1. **Given** a pushed revision, **When** CI runs, **Then** pinned least-privilege workflows run repository, documentation, unit, affected Rust/frontend/brand and site checks.
2. **Given** verified readiness, **When** qualification completes or fails, **Then** terminal outcomes and preparation/qualification/combined timings identify exact source and artifacts, with 660-second target, 900-second hard limit and 15-second reserve.
3. **Given** unsupported hosted desktop/input capabilities, **When** results are reported, **Then** compile/unit evidence is distinguished from native runtime and an automated native-runner path is documented.
4. **Given** passing real workflow names, **When** repository policy is applied, **Then** required checks retain squash-only merge and merged-branch deletion behavior.

### Edge Cases

Missing/duplicate version or topic, traversal and unsafe links, duplicate headings, historical asset changes, unsupported Markdown, broken fragments, absent/mismatched schema/release record, recursive schema references, absent downloads, failed/timed-out prerequisites/checks, and old source results arriving after new commits must be detected or explained without false completion.

## Requirements

### Functional Requirements

- **FR-001**: Landing MUST independently present approved identity, availability and documentation/support/license access with truthful verified-release links.
- **FR-002**: Site MUST render every retained chapter at stable version/topic routes with ordered navigation and static entry/latest aliases.
- **FR-003**: Version selection MUST preserve existing topics or explicitly explain fallback; search MUST be local/prebuilt, scoped and version-labelled.
- **FR-004**: Chapter, image, reference and fragment links MUST resolve within the correct snapshot; historical assets MUST be retained; source content MUST not execute scripts or expose internal planning/private paths.
- **FR-005**: Master changelog and existing versioned contracts MUST have readable generic rendering and exact raw/source access; schema examples MUST match historical schemas.
- **FR-006**: Landing/docs/reference controls MUST support keyboard/focus, responsive reading, reduced motion, meaningful headings and pinned brand rules.
- **FR-007**: Hosted workflows MUST reuse existing mandatory checks, use pinned actions/least privilege, and identify source plus produced artifacts.
- **FR-008**: Qualification MUST record verified readiness and terminal outcomes with separate preparation/qualification/combined time, 660/900-second budgets and 15-second reserve; target-only overruns are advisory.
- **FR-009**: Native runtime claims MUST remain separate from compile/unit/hosted evidence, with small fixtures and hidden noninteractive helpers; unsupported hosted capabilities MUST have an automated native-runner path.
- **FR-010**: Real passing stable check names MUST be applied to repository policy while preserving owner-directed squash merge and branch deletion.
- **FR-011**: U-12 renderer/search/metadata/aliases/archive-correction decisions MUST be documented; latest/download pointers MUST not advance to candidate releases.
- **FR-012**: Work MUST retain UTF-8 without BOM/LF, governed-kit provenance and source integrity, keep public navigation self-contained, and deliver an official PR with every bot finding addressed and no more than two review rounds before owner merge.

### Key Entities

- **Documentation snapshot**: Version, status, source root, ordered topics, assets and optional matching schema/examples.
- **Search entry**: Version, topic, heading, URL and source-derived text.
- **Release record**: Published status, version/source identity and verified artifact identities/URLs.
- **Qualification record**: Source/artifact identity, readiness/terminal timestamps, named outcomes, separate durations and elected evidence scope.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every one of the fifteen baseline chapters and its local links/fragments/assets is reachable and complete in the exported site.
- **SC-002**: Synthetic retained versions prove topic-preserving switching, explicit missing-topic fallback, historical assets and version-scoped search without latest-content substitution.
- **SC-003**: Raw changelog/schema bytes match their sources and nested/composed/reference examples remain inspectable; invalid source/release/example fixtures are rejected.
- **SC-004**: Keyboard and narrow/wide rendered acceptance pass; landing loads no documentation-only search/diagram/highlighting runtime.
- **SC-005**: Required hosted checks are terminal green on the final PR revision, policy is read back, every review finding is resolved and the PR is ready for owner review without merging.

## Assumptions

Next.js/static hosting and the pinned brand kit are approved. Site generation does not require platform installers or a product release. Live domain/Pages/Cloudflare deployment (#32) and release-linked retention/promotion (#31) remain separate. Scope covers #6/#28/#29/#30 entirely; no other issue is claimed closed.

## Clarifications

### Session 2026-10-23

- Q: Which publication boundary? A: Explicit owner authorization includes push and official PR; stop before merge, with at most one manually requested second review round.
- Q: Which first docs version/latest status? A: Retain v0.0.0 as a labelled specification baseline; entry/latest pages link to the selected manifest version and never claim a product release.
- Q: How to handle unqualified platforms? A: Retain all three product targets while advertising no installable artifact or native qualification beyond actual evidence.
- Q: Archive corrections? A: Preserve snapshot meaning; material corrections require an explicit dated correction record/changelog, with renderer-only compatibility adapters permitted.
