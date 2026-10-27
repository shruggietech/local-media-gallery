# Feature Specification: Full/Lite Platform and Launch Contracts

**Feature Branch**: `codex/012-platform-launch-contracts`

**Created**: 2026-10-25

**Status**: Specification validated

**Input**: S012, complete GitHub #5 and #7 end-to-end under Spec Kit/autopilot, automatic push/official PR, CI and at most two review rounds; owner final review and merge.

## Clarifications

### Session 2026-10-25

- Q: Must both editions expose the same browsing and settings capabilities? → A: Yes. Keep shared host-local preference/history semantics and gallery-local/temporary destinations; neither edition depends on sender state. Separate arbitrary feature restrictions and a new Lite-only persistence subsystem were rejected as unsupported scope.
- Q: What qualification can matrix closure claim? → A: Native proof artifacts and separately named observations, with unexercised combinations explicitly unqualified. Final platform installers and broad native media/accessibility certification remain their existing issues; a paper-only matrix is insufficient.
- Q: What is the default UI lifetime behavior? → A: Wait for the UI process, preserving existing invocation behavior; explicit detach waits up to30 seconds for a matching native startup acknowledgement. Timeout does not prove the child stopped and never claims discovery completion.
- Q: How do repeated launches interact? → A: Independent processes/windows/sessions. A shared single-instance broker is unnecessary architectural expansion and would change existing launch isolation.
- Q: How are preparation/installation commands represented before providers exist? → A: Named finite operations return versioned unavailable-capability outcomes, no writes and documented exit codes. Fake completion and implementing downstream providers inside this contract slice were rejected.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose an attributable artifact (Priority: P1)

A recipient can identify the edition, version, operating system, architecture, prerequisites and measured footprint of a proposed artifact, and distinguish a proof build from a published supported package.

**Why this priority**: Launch and package promises require an explicit platform and dependency contract.

**Independent Test**: Inspect each elected proof artifact and its bound record on the native host, with separate application/runtime/tool measurements and explicit unavailable observations.

**Acceptance Scenarios**:

1. **Given** a Full or Lite proof artifact, **When** its identity and matrix row are inspected, **Then** the version, platform, architecture, edition and prerequisite rules agree.
2. **Given** an unexercised platform combination, **When** support information is read, **Then** its qualification is explicit without inheriting another host's results.
3. **Given** a missing prerequisite, **When** the artifact is inspected or launched, **Then** useful attributable guidance replaces any false success result.

### User Story 2 - Open the intended gallery (Priority: P1)

Full users can explicitly select a directory or open the chooser. Lite users can open the directory containing the distributed launcher without depending on the sender's working directory or profile. Explicit paths take precedence in both editions.

**Why this priority**: Portable placement and installed launch must share browsing semantics while resolving the correct root.

**Independent Test**: Launch each edition with no directory, an explicit relative/absolute directory and an explicit dash-leading directory, then relocate the containing gallery and repeat.

**Acceptance Scenarios**:

1. **Given** Full without a directory, **When** launched, **Then** the existing selection experience opens without silently selecting the executable directory.
2. **Given** Lite placed beside a gallery, **When** launched from an unrelated working directory, **Then** its external containing gallery is selected, outside bundle internals or package mounts.
3. **Given** an explicit directory in either edition, **When** launched, **Then** it wins over placement, remembered history and defaults.
4. **Given** repeated launches, **When** the next process starts, **Then** the declared independent-window/session behavior applies without retiring an unrelated process's root.

### User Story 3 - Automate finite and long-lived operations (Priority: P1)

A caller can distinguish accepted UI startup from completed discovery, finite job completion, cancellation, partial work, unavailable capabilities and failure, using stable operation identities and results.

**Why this priority**: Downstream preparation, diagnostics and installation need one shared result contract rather than interpreting process spawning as success.

**Independent Test**: Exercise help/version, invalid input, UI wait/detach and finite unavailable-provider results with redirected output and exact exit codes.

**Acceptance Scenarios**:

1. **Given** machine output is requested, **When** a finite command ends, **Then** one versioned result is separate from human diagnostics and preserves exact values and null/absence distinctions.
2. **Given** an unimplemented preparation or installation provider, **When** requested, **Then** the finite result explicitly reports unavailable capability, writes no outputs and never claims preparation or installation completed.
3. **Given** a UI operation, **When** startup is acknowledged, **Then** its process/session identity and acknowledgement boundary are distinct from completed discovery and later UI lifetime.
4. **Given** a cancelled or replaced operation, **When** a late result arrives, **Then** it cannot change another active root or certify stopped work solely from a timeout.

### Edge Cases

- Spaces, non-ASCII and native non-Unicode paths; dash-leading paths and option terminators; explicit paths relative to the invoking working directory.
- macOS executable inside an app bundle; Linux portable package mounts versus original artifact placement; missing or inconsistent original-artifact hints.
- Missing, unsupported or inaccessible roots; unavailable runtime; invalid options and incompatible operation flags; output pipes and detached child failure.
- Multiple independent processes and sessions; cancellation before/after completion; stale operation identity; process exit without an acceptance receipt.
- Missing footprint observations, unsigned/unnotarized proof artifacts and incomplete native qualification; no published product download is fabricated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Define initial Full/Lite platform rows with minimum OS/architecture, runtime/library/display requirements, artifact formats, installation scope/destinations and signing/notarization disposition. Retain Windows, Linux and macOS targets.
- **FR-002**: Bind native proof artifacts and observations to exact edition/version/platform/architecture, source and artifact identity. Report archive/application/runtime/optional-tool footprints separately, with unavailable measurements explicitly named.
- **FR-003**: Declare which combinations were actually exercised and what was observed. Compilation, command execution, rendered browsing and final installation qualification remain distinct claims; unexercised combinations stay unqualified.
- **FR-004**: Give actionable prerequisite/capability results without requiring recipient developer tooling, Full installation for Lite or a chosen browser application. Common browsing has no arbitrary edition feature/file-count restriction.
- **FR-005**: Define stable executable/operation names and preserve existing explicit-directory/help/version usage. Reject invalid or conflicting arguments before changing state.
- **FR-006**: Full no-argument launch opens the chooser; Lite no-argument launch resolves its external containing gallery. Explicit native paths take precedence and relative paths use the caller's working directory.
- **FR-007**: Resolve macOS gallery roots outside app internals and Linux portable roots outside temporary package mounts. Missing/invalid placement information is attributable, never silently replaced with an unrelated root.
- **FR-008**: Define wait-by-default UI lifetime, explicit detach with a30-second matching startup acknowledgement, process exit and independent repeated launches. Detached startup success requires a bounded attributable acceptance boundary and must not mean discovery or finite work completed.
- **FR-009**: Provide a shared versioned operation/result contract with stable identity, status/error categories and useful exit codes for success, failure, partial, cancelled and unavailable capability.
- **FR-010**: Separate machine results from human progress/diagnostics. Preserve native-path information, exact large values and null distinctions without lossy coercion.
- **FR-011**: Apply the shared result/operation semantics to existing native session/discovery operations and CLI entry points. Retired identities cannot publish into replacement roots; cancellation and timeout remain distinct observations.
- **FR-012**: Declare preparation/install provider availability truthfully. Unavailable providers return finite results with no writes; this slice does not implement downstream thumbnail jobs or final installers.
- **FR-013**: Keep project console children hidden, noninteractive and redirected on Windows while preserving documented terminal output for deliberately invoked commands. Do not introduce test controls into ordinary artifacts.
- **FR-014**: Update public help/schema/docs and internal evidence; resolve U-01/U-02 for elected initial rows and U-08 launch/result decisions. Qualify functional/integrity/provenance/elected checks, exact source and separate timings before authorized PR handoff.

### Key Entities

- **Platform row**: Edition, version, OS/architecture baseline, package/prerequisite/signing rules and qualification state.
- **Proof artifact record**: Exact source/artifact identity, native observations, separated footprint basis and unavailable evidence.
- **Launch request**: Operation, edition, explicit path, placement context, wait/detach behavior and output mode.
- **Operation result**: Versioned identity, status, attributable error, session/process acknowledgement and finite outcome without conflated completion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every elected platform/edition row has all identity/prerequisite fields and explicit qualification/footprint status; zero rows inherit untested native support.
- **SC-002**: Both editions choose the expected directory for every explicit/default/relocation fixture, including spaces, non-ASCII names and external bundle/package placement.
- **SC-003**: Every declared operation/status has a tested result and exit/output boundary; invalid combinations and unavailable providers perform zero gallery writes.
- **SC-004**: UI startup, discovery completion, cancellation, timeout and independent launches remain observably distinct in native regressions; no retired result changes a replacement root.
- **SC-005**: Ordinary artifacts exclude native automation controls; Windows child-launch tests verify hidden, redirected, noninteractive execution.
- **SC-006**: All elected repository/product/site/native checks pass with exact source/artifact evidence and preparation/qualification/combined accounting; final PR head CI and all review threads are settled within at most two rounds before owner handoff.

## Assumptions

- Existing Rust/Tauri/native core, static interface, root grants, settings precedence, metadata and bounded loading remain the shared behavioral baseline.
- Platform matrix proof builds are exploratory artifacts, not final installer delivery or a product release. Final platform packaging remains #22/#23/#24, native media/accessibility qualification #18/#19, downstream jobs #12/#15/#27 and release publication #26/#31.
- Initial matrix qualification may explicitly retain unexercised combinations, as #5 permits; all three OS targets remain declared.
- No signing credentials or release-publication authorization is inferred. Public documentation remains self-contained; numbered planning evidence remains internal.
- Explicit owner authorization supersedes the autopilot pre-push halt. Merge/tag/release remain owner operations.
