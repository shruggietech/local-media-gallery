# Feature Specification: Dependency closure and native qualification

**Feature Branch**: `codex/s017-dependency-closure`

**Slice**: S017

**Created**: 2026-10-29

**Status**: Implemented, owner review pending

**Input**: Complete #64, #57 and #58 under Spec Kit autopilot, automatically publish a PR, satisfy CI and no more than two review rounds, then request owner final review and merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trust native qualification and diagnose failures (Priority: P1)

As a maintainer, I need isolated native checks to observe real playback and identify failures so that passing evidence supports the compiled artifact and a failure can be investigated without repeating opaque campaigns.

**Why this priority**: Current merged-main native media checks fail intermittently and obscure whether startup, playback, capture or observation failed.

**Independent Test**: Exercise early driver exit and unrelated listeners using small headless fixtures, then qualify ordinary native Full/Lite behavior on the elected hosted environments.

**Acceptance Scenarios**:

1. **Given** a driver exits or its requested listener is unavailable or occupied, **When** readiness is checked, **Then** qualification fails within the original deadline and retains bounded output, exit/signal, listener and trial/source/edition context without accepting an unrelated listener.
2. **Given** an audible or silent media fixture, **When** trusted native input starts playback, **Then** evidence separately records actual media clock progression, changing decoded frames and decoded/captured PCM, rejecting stalled playback, silent audible fixtures and unobserved samples.
3. **Given** a failed native observation, **When** qualification terminates, **Then** its bounded diagnostics and exact fixture/runtime/source identity are retained, with missing observations distinct from valid zero measurements.
4. **Given** the elected Windows, Ubuntu and macOS hosts, **When** final qualification runs, **Then** ordinary browsing, relocation, Refresh, native accessibility and existing measurement assertions pass without local workstation focus changes.

### User Story 2 - Use the patched governed renderer (Priority: P1)

As a maintainer, I need a patched image dependency with authentic upstream attestation so brand verification continues to prove the actual installed assets.

**Why this priority**: The current image dependency has outstanding advisories; its version is part of the governed renderer attestation.

**Independent Test**: Import an upstream supported kit through the existing verified importer, install the patched image dependency and pass the complete recovered verifier, inventory and exact pixel checks.

**Acceptance Scenarios**:

1. **Given** an upstream release supporting the patched renderer, **When** it is imported, **Then** release/archive/manifest/recovery provenance is recorded and no governed bytes are edited by hand.
2. **Given** the patched image dependency, **When** proof verification and applicable native/package readbacks run, **Then** every required asset, image mode/dimension/pixel comparison and manifest check passes; tampering remains rejected.
3. **Given** the compatible patched pin, **When** dependency automation reads the manifest, **Then** its temporary exclusion is removed and advisory status is truthfully reported for the actual published branch, with merged-manifest closure checked after owner merge.

### User Story 3 - Remove the affected Linux iterator implementation (Priority: P1)

As a Linux recipient, I need the GTK dependency's known iterator defect corrected without losing the declared native runtime or package prerequisites.

**Why this priority**: The locked dependency contains the confirmed affected implementation.

**Independent Test**: Exercise the real corrected string iterator in an optimized Linux build, bind its source to retained provenance, then run native Full/Lite media and lifecycle qualification.

**Acceptance Scenarios**:

1. **Given** the existing GTK dependency family, **When** dependency resolution completes, **Then** every affected version used by the product resolves to a compatible upstream fix or a narrow provenance-bound backport, rather than leaving the affected code beside an unrelated newer dependency.
2. **Given** an optimized Linux build, **When** empty and populated string variants are iterated, including boundary positions, **Then** exact expected values and termination are observed using the corrected implementation.
3. **Given** the final Linux artifact, **When** browsing, relocation and Refresh run, **Then** existing runtime and recipient prerequisites remain valid and advisory reporting identifies whether the scanner recognizes the actual backport.

### Edge Cases

- Child emits excessive output, exits during readiness or fails after a status response; a different process occupies the port.
- Media metadata is late; the playback clock advances while PCM is absent; an observer changes native playback; silent media has valid zero PCM.
- Upstream release has the same brand version but a newer compiler; archive/recovery or asset bytes disagree; regenerated pixels differ despite equivalent compression.
- Multiple GLib families coexist; a patched package retains an advisory version; optimized code exposes undefined behavior hidden by debug builds.
- A final source change invalidates earlier receipts. Retries retain all failed evidence and do not certify missing observations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Readiness MUST be attributable to the owned driver and retain bounded output, exit/signal, port/listener and trial/source/edition context on failure within the existing startup deadline.
- **FR-002**: Small real-process fixtures MUST reject early child exit, unavailable listeners and unrelated listener collisions, with cleanup limited to owned children.
- **FR-003**: Native media evidence MUST distinguish trusted input, media clock progression, decoded frame progression, audible/silent PCM observations and observer/capture failure without relaxing their functional assertions.
- **FR-004**: Native failures MUST retain bounded diagnostics with exact fixture/runtime/source/edition identity and distinguish unavailable samples from measured zero samples.
- **FR-005**: Governed brand bytes MUST enter only through the existing checksum/manifest-verifying importer, with exact recovery version and release provenance.
- **FR-006**: The authoritative image dependency MUST use a patched compatible release and its temporary automation exclusion MUST be removed while exact asset, manifest and pixel verification remains enforced.
- **FR-007**: Linux dependency resolution MUST replace the affected GLib iterator implementation with a compatible fix and bind all maintained source changes to upstream provenance.
- **FR-008**: An optimized Linux regression MUST exercise the actual corrected iterator, including empty, multiple-value and termination boundaries.
- **FR-009**: Final source-bound qualification MUST pass repository/tests/site and all elected native/package checks, preserve original media, runtime prerequisites, 660-second target, 900-second hard limit, finalization reserve and separate preparation/qualification/combined accounting.
- **FR-010**: Advisory disposition MUST distinguish patched implementation, scanner recognition and merged-main alert closure; no unrelated alert dismissal or weakened verifier may substitute for remediation.

### Key Entities

- **Driver observation**: owned child identity, requested listener, bounded output, exit/signal/error, startup deadline and operation context.
- **Media observation**: fixture/source/edition/runtime identity, trusted input, clock/frame progression, PCM availability and measurements, bounded failure context.
- **Governed dependency record**: authoritative version, upstream archive/revision/digest, exact imported inventory and verification results.
- **Qualification receipt**: exact source and artifact identities, elected environment, terminal outcomes, separated elapsed accounting and retained failed attempts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All real-process failure fixtures reject false readiness and terminate within their declared deadlines, retaining bounded useful diagnostics.
- **SC-002**: Every elected native Full/Lite campaign passes all existing media/lifecycle/accessibility assertions on final source; failures cannot masquerade as zero-valued successful observations.
- **SC-003**: The patched image dependency passes authentic recovered verification with zero pixel or manifest discrepancies and a verified formal upstream provenance record.
- **SC-004**: The actual corrected Linux iterator passes optimized regression and native acceptance, with no affected implementation left in the resolved product graph.
- **SC-005**: Final applicable CI is green and every review comment is resolved within at most two review rounds; the PR is ready for owner final review and merge.

## Assumptions

- This slice changes maintainer qualification/dependency integration, preserving current product behavior and declared platforms. Linux packaging #24 and release publication remain separate.
- Upstream formal releases may be imported within the authorized dependency work. A maintained narrow backport is permitted by #58 when the existing GTK family prevents a compatible direct upgrade.
- The owner performs the final squash merge. Merged-manifest GitHub alert closure can be verified only after that merge; pre-merge evidence must state this boundary.
- Interactive native work runs only on isolated hosted desktops. No local GUI or keyboard acceptance is permitted.

## Clarifications

### Session 2026-10-29

- Q: Does the slice include the failed observer experiment from #65? A: Reuse only evidence-backed diagnostics or corrections; the closed experiment is unqualified and must not be copied wholesale.
- Q: How should image dependency alert closure be handled before owner merge? A: Prove the patched manifest and verification on the PR, report current scanner state, and reserve merged-main closure confirmation for post-merge housekeeping.
- Q: Should the Linux runtime stack be replaced to fix a single iterator? A: Prefer a compatible narrow upstream fix or provenance-bound backport, retaining the declared GTK/WebKitGTK runtime and recipient prerequisites.
