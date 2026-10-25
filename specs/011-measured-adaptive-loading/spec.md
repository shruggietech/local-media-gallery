# Feature Specification: S011 Measured Adaptive Loading

**Feature Branch**: `codex/011-measured-adaptive-loading`

**Created**: 2026-10-25

**Status**: Clarified

**Input**: Complete #16 and #17 end-to-end using Spec Kit and autopilot. Automatically push/open the PR, handle CI and at most two review rounds, then stop for owner final review and squash merge.

## Clarifications

### Session 2026-10-25

- Q: What does a cold run prove? A: A fresh application process with first-use application caches; OS/storage cache state is reported as unqualified unless directly established. No destructive machine cache purge.
- Q: Which manual choices are offered? A: Automatic, Conservative and Standard; manual choices fix work policy without changing page size. Existing settings destinations own persistence.
- Q: Which evidence host is required initially? A: The current Windows native runtime, with exact environment identity and explicit untested OS/provider limits; all product OS targets remain.
- Q: What observations persist or leave the machine? A: Only the deliberate loading preference persists. Bounded session-local signals contain timings/counts, with no collection names, paths, source text or automatic submission.
- Q: How are numerical tuning choices settled? A: Measure the unchanged baseline first, then record initial proposed thresholds and limits with rationale. Measurements are evidence for tuning, not a universal throughput promise.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand measured behavior (Priority: P1)

A maintainer can repeat a small representative gallery exercise and compare attributable operation timings, resource work, memory and distribution footprints without treating a development fixture as a guarantee for arbitrary collections.

**Why this priority**: Measurements must precede the adaptive policy and numerical claims.

**Independent Test**: Run the measurement exercise against an identified native artifact; its report separates environment, cache conditions, operations, unavailable observations and actual results.

**Acceptance Scenarios**:

1. **Given** a fixed small synthetic gallery and identified machine/artifact, **When** opening, scrolling, descending size sorting, filtering, inspecting metadata and seeking media, **Then** each operation has separate measured results and attributable context.
2. **Given** first-use and repeated runs, **When** reporting cache state, **Then** process/application-cold observations are distinguished from OS-cache-cold evidence, with unavailable measurements explicit.
3. **Given** an unpublished distribution or unavailable resource metric, **When** reporting footprints/memory, **Then** absence is explicit and no executable size is presented as an installed runtime or package size.

### User Story 2 - Adapt media work while retaining control (Priority: P1)

A user can leave loading automatic or select a manual performance choice. Automatic loading responds to observed latency, outstanding work, frame responsiveness and failures, while maintaining finite work and predictable presentation.

**Why this priority**: Better responsiveness must not cost selection, navigation or playback continuity.

**Independent Test**: Exercise deterministic healthy/slow/failing workloads and a real native gallery; automatic work decreases under pressure and recovers gradually, while manual choices remain stable.

**Acceptance Scenarios**:

1. **Given** automatic loading and sustained slow or failing work, **When** pressure is observed, **Then** new admission/prefetch work decreases within declared finite limits; already active work is correctly accounted for.
2. **Given** recovery and waiting work, **When** healthy observations accumulate, **Then** automatic work recovers without oscillating on a single sample.
3. **Given** a manual preference saved to an existing destination, **When** reloading or relocating the gallery, **Then** that deliberate choice persists through the common settings precedence resolver; transient machine observations do not travel.
4. **Given** a focused viewer or hidden/suspended page, **When** gallery loading would otherwise run, **Then** background gallery media/probes stop and paused sampling is not interpreted as device slowness.

### User Story 3 - Retire obsolete work and retain valid state (Priority: P2)

A user can change root, page, filter, settings or focused item during slow work without old measurements changing the current session or losing valid navigation/playback.

**Why this priority**: Faults and transitions must preserve the existing lifetime and source contracts.

**Independent Test**: Hold, cancel, fail and complete obsolete work across transitions; current state remains valid and accounting recovers without leaked work or source writes.

**Acceptance Scenarios**:

1. **Given** held or cancelled media work, **When** changing galleries or loading policy, **Then** late outcomes do not affect the new policy/session and cleanup is idempotent.
2. **Given** sidecar inspection, discovery and focused media, **When** operations overlap, **Then** each shared resource class has explicit finite limits; UI control does not wait for blocked reads.
3. **Given** explicit page size, selection and a playing focused video, **When** policy pressure changes, **Then** these presentation choices and the healthy playback element/time remain unchanged.

### Edge Cases

- Slow success, repeated decode failure, synchronous completion, throwing start/cleanup, cancellation and repeated cleanup.
- No pending work, transient sample, exhausted sample window, hidden document, long frame gaps and root retirement.
- Switching automatic/manual mode while active work exceeds a newly lowered admission limit.
- Missing/future settings, invalid choices, portable automatic preference on another machine and precedence conflicts.
- Missing process-memory API, shared runtime processes, unqualified OS storage caches, unpublished archives/installers and absent thumbnail tools/caches.
- Damaged media, empty gallery, metadata failures and source replacement without source mutation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Define repeatable small synthetic fixtures and record exact media composition, counts, sizes/codecs, storage, hardware, OS/runtime, cache conditions and source/artifact identities.
- **FR-002**: Measure opening/discovery, scrolling, descending byte-size sorting/filtering, focused playback/seek and metadata separately, including repeated observations and frame responsiveness.
- **FR-003**: Record native plus webview memory where exposed and bounded active/pending decoder/read work. Explain unavailable metrics and separate observation from inferred cause.
- **FR-004**: Report download, extracted application, required runtime, optional tools and caches separately; retain preparation, qualification and combined timing. Publish evidence-based proposed thresholds with no unmeasured scale guarantee.
- **FR-005**: Automatic mode MUST use bounded observed latency, outstanding work, frame responsiveness and failure signals, with finite sampling, hysteresis and gradual recovery. Device hints alone are insufficient.
- **FR-006**: Keep finite shared resource limits across discovery, sidecar inspection, gallery image/video preparation and active decoding; reduce new work rather than claim cancellation of blocked native work.
- **FR-007**: Offer a manual performance override and persist only the deliberate mode through every existing temporary/user/remembered/portable settings destination and common precedence resolver. Legacy settings remain compatible; automatic observations restart on each recipient/session.
- **FR-008**: Preserve page size/location, valid selection, filters, sort order, explicit settings and healthy focused playback. Adaptation must not repaginate or rewrite preferences based on device samples.
- **FR-009**: Focused viewing retains zero background gallery media/probes. Hidden/suspended sampling and long idle gaps must not produce false pressure; demand and manual Refresh remain the only discovery triggers.
- **FR-010**: Cancel/release work correctly on transitions; reject obsolete outcomes and measurements. No new source/sidecar writes, background enumeration, telemetry submission or arbitrary filesystem authority.
- **FR-011**: Document the measurement/policy/persistence contracts and honest evidence limits; update owned schema and versioned docs consistently at unreleased 0.0.0. Keep internal slice evidence outside public docs.
- **FR-012**: Prove policy and lifetime behavior with deterministic small-fixture regressions and actual native measurement/rendered checks, plus elected repository/site/product/integrity qualification, hosted CI and bounded review delivery.

### Key Entities *(include if feature involves data)*

- **Loading preference**: Portable deliberate automatic/manual mode, owned by existing settings precedence.
- **Observation window**: Finite session-local latency/frame/failure/work samples, reset by lifetime changes and excluded from persisted state.
- **Loading policy**: Current finite admission/prefetch allowance and attributable reason, separate from page layout.
- **Measurement report**: Source/artifact/environment identity, fixture inventory, operation observations, resource peaks, footprints, limitations and timing accounting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every elected operation has a separately attributable baseline and final native observation; unavailable metrics/cache qualifications are explicitly identified.
- **SC-002**: Deterministic pressure and recovery exercises demonstrate bounded decrease and gradual recovery with no admission-cap violation or leaked active work after cancellation.
- **SC-003**: All four persistence destinations and relocation preserve manual/automatic choices while no machine observations appear in saved state.
- **SC-004**: Transition and focused-view fixtures retain valid navigation/playback and observe zero background gallery media/probes during focused viewing.
- **SC-005**: All mandatory qualification steps and final-head hosted checks pass, each review finding is closed within at most two requested rounds, and the owner receives an unmerged official PR.

## Assumptions

- #16 is the evidence prerequisite for #17 and is completed first within this slice; #8/#9/#10/#11/#13/#14 are merged foundations.
- Current page choices and media bounds remain the starting baseline; no bulk-media acceptance gate or fixed universal throughput guarantee is introduced.
- Existing Windows native automation is the initial evidence host. Native Linux/macOS and physical storage-provider behavior remain separately identified rather than inheriting this evidence.
- Packaging, thumbnails, editing, previews, new launch commands and product releases are separate issues. Missing future artifacts are explicitly unavailable in footprint reports.
- Ordinary browsing stays read-only; benchmark fixtures and reports are maintainer-owned output. Owner merge remains the final boundary.
