# Feature Specification: S013 Optional Thumbnail Jobs and Diagnostics

**Feature Branch**: `codex/013-thumbnail-jobs-diagnostics`

**Created**: 2026-10-27

**Status**: Implementation and qualification

**Input**: Complete GitHub #12 and #15 under Spec Kit autopilot, including optional image/video thumbnails, relocatable validated caches, scoped diagnostics/export/recovery, automatic PR publication, CI and at most two review rounds. Owner retains final review and merge.

## Clarifications

### Session 2026-10-27

- Q: Which cache destination is the initial choice? → A: Machine-local; portable explicitly selected.
- Q: May successful completed entries be evicted automatically? → A: No; explicit owned cleanup only.
- Q: How long should ordinary diagnostics be retained? → A: Bounded memory until process exit.
- Q: What must cancellation prove before reporting stopped helper work? → A: Confirmed child exit before stopped.
- Q: Should a cache replace media in the focused viewer? → A: Cards only; viewer uses originals.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deliberate optional preparation (Priority: P1)

A gallery owner can browse originals immediately, inspect a thumbnail preparation preview, choose local or portable cache storage and explicitly start work from the gallery or command entry point.

**Why this priority**: Preparation must improve browsing without becoming a prerequisite or silently writing into a shared gallery.

**Independent Test**: Open a small mixed image/video gallery with no cache, obtain a preview without writes, generate thumbnails after explicit commitment and observe usable cached cards while focused viewing retains the original.

**Acceptance Scenarios**:

1. **Given** no cache, **When** the gallery opens, **Then** originals remain usable and no preparation runs automatically.
2. **Given** a preview, **When** work starts, **Then** its destination, eligible item count, output policy, storage commitment, tool availability and collisions are visible before writes.
3. **Given** an existing unrelated destination, **When** preparation is requested, **Then** the collision is attributable and unrelated content remains byte-identical.
4. **Given** a preparation job, **When** viewing or explicit Refresh continues, **Then** progress does not block those operations or change deliberate presentation choices.

### User Story 2 - Valid caches survive interruption and relocation (Priority: P1)

A recipient can use a portable cache after moving a gallery, while invalid, stale, incomplete or missing cache entries fall back to originals. An owner can cancel preparation and recover without losing valid completed entries.

**Why this priority**: Derived data must never become the only media list or overwrite originals.

**Independent Test**: Generate a mixed gallery, relocate it, replace a source, corrupt/delete an entry, cancel a later job and compare originals, sidecars and unrelated files before and after.

**Acceptance Scenarios**:

1. **Given** a portable cache, **When** its outer gallery moves, **Then** cache lookup requires no sender absolute path or sender profile.
2. **Given** changed source identity/content under the declared fingerprint policy or changed generation parameters, **When** an entry is considered, **Then** it cannot be presented as current without validation.
3. **Given** cancellation, decoder failure, storage exhaustion or permission denial, **When** a job terminates, **Then** completed, failed, skipped and remaining work are attributable; committed valid entries and source files remain intact.
4. **Given** a replaced/closed root or retired job, **When** late work finishes, **Then** it cannot publish into the replacement gallery or commit under retired authority.
5. **Given** cache cleanup, **When** explicitly elected, **Then** only identified owned outputs are removable; media, external metadata and settings remain independent.

### User Story 3 - Understand failure and export useful facts (Priority: P2)

A user can inspect bounded diagnostics, understand recovery choices and explicitly export a described report without automatic telemetry or unnecessary disclosure of local paths and sidecar contents.

**Why this priority**: The existing operation result contract needs practical failure attribution and recovery for state, media and optional jobs.

**Independent Test**: Trigger unavailable root/item, unsupported media, invalid settings, partial/cancelled generation and helper failure; inspect categories, retention and export contents while useful browsing remains available.

**Acceptance Scenarios**:

1. **Given** an operation failure, **When** diagnostics are inspected, **Then** operation identity, version, edition, runtime, stable category and useful recovery guidance are distinguishable from guesses about cause.
2. **Given** an export request, **When** it is confirmed, **Then** the included fields and redaction defaults are described and the report is written only to the user-elected destination or delivered through the requested command output.
3. **Given** damaged or future convenience state, **When** recovery is shown, **Then** original bytes remain available and continued default/in-memory browsing does not silently reset persistent choices.
4. **Given** a helper timeout, **When** reported, **Then** timeout is distinct from confirmed process exit and cannot certify that a helper or write stopped without evidence.

### Edge Cases

- Empty, unsupported-only and mixed galleries; exact native names with spaces, non-ASCII and non-Unicode spellings; no metadata prerequisite.
- Destination links/aliases, replaced directories, traversal references, malformed/oversized/future cache metadata, corrupt/oversized generated images and conflicting concurrent writers.
- Source replacement during generation/validation, parameter/provider changes, repeated preview/start, cancellation before/after commit, app termination with abandoned staging and same-root/new-root late completion.
- Missing optional tool, wrong/mutated tool identity, malformed helper output, helper failure/timeout, failed child termination, full disk and access failures.
- Invalid/future settings/history state, missing diagnostic facts, large counters and privacy-sensitive native error strings.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Keep originals-first browsing, explicit Refresh, current settings precedence and focused playback usable without thumbnails, optional encoders or initialization. No unrequested generation, autoplay, scan or installation.
- **FR-002**: Define initial image/video output formats, dimensions, orientation/color policy, video frame selection, tool versions/provenance and actual platform evidence before claiming support; unsupported inputs remain attributable.
- **FR-003**: Initially select machine-local storage; portable storage is an explicit alternative. Provide a write-free preparation preview with root/destination identity, eligibility, planned owned outputs/collisions, storage commitment, provider availability and parameter policy. Require explicit selected local/portable destination and start commitment.
- **FR-004**: Implement optional image and video thumbnail generation using one bounded native job contract shared by command and gallery actions. Expose exact job identity, progress, cancellation and complete/partial/cancelled/unavailable/failed results without conflating startup and completion.
- **FR-005**: Stage and validate outputs before owned commits. Revalidate source, root, job and destination authority at commit; never overwrite originals, sidecars, settings or unrelated content. Coordinate concurrent writers and preserve prior valid entries on failed replacement.
- **FR-006**: Define cache format/version, relative source identity, source/parameter/provider fingerprinting, freshness validation, size limits, storage placement and eviction/cleanup policy. Do not automatically evict completed entries; explicit cleanup removes only verified owned outputs. Portable caches must not require sender absolute paths, machine observations or history.
- **FR-007**: Use only validated current derived entries for gallery cards; fall back to original media or an attributable unsupported result when absent/stale/invalid. Focused viewing and metadata inspection retain original identity and content.
- **FR-008**: Keep generation, validation, source reads and helper activity bounded and off the UI thread. Cancellation and retired roots prevent new commits; completed valid entries survive. Terminal results identify completed/failed/skipped/remaining work and unknown facts explicitly.
- **FR-009**: Preserve exact native-path authority, large counters, absent/null distinctions and stale-result rejection. Cache metadata and renderer-supplied names never expand filesystem or executable access.
- **FR-010**: Identify optional helper binaries, version, origin, integrity and associated payloads before activation. Report download, extracted/runtime and output-cache footprints separately. Ordinary browsing does not require the optional tools; recipients need no developer toolchain.
- **FR-011**: Hide project-owned Windows console children, close interactive input where unused and redirect diagnostics/output. Handle malformed output, process exit and bounded timeout observably, distinguishing unknown lifetime from confirmed termination. An unknown live helper retains its generation resource reservation until exit is observed; it cannot be relabeled stopped to admit unbounded replacements.
- **FR-012**: Define a bounded diagnostic record and retention policy containing operation/version/edition/runtime context, stable categories, attributable outcomes and recovery guidance. Retain at most 256 records and 256 KiB of serialized diagnostic facts in memory until process exit; write no ordinary diagnostic log to disk. Ordinary diagnostics omit unnecessary paths, credentials and sidecar payloads.
- **FR-013**: Distinguish unavailable roots, missing/changed items, unsupported media, invalid state, partial/cancelled preparation, helper failures/timeouts, conflicts and internal errors. Integrate existing operation, media and state failures without replacing their useful user-facing outcomes.
- **FR-014**: Provide explicit diagnostic inspection/export through gallery and command entry points, describing contents and redaction defaults. No automatic submission, telemetry or unrelated network listener is introduced.
- **FR-015**: Explain recovery for interrupted jobs, abandoned owned staging, absent/corrupt cache and damaged convenience state. Cleanup/reset must not silently destroy invalid/future state or unrelated content; unknown prior work is not blindly repeated as idempotent.
- **FR-016**: Define keyboard/focus, non-color progress/status, empty/error and narrow-window behavior for preparation and diagnostics using existing compact branded controls.
- **FR-017**: Update authoritative versioned help/schema/docs and chronological changelog, resolving U-09/U-11 for delivered policy while preserving downstream packaging, release and gallery-sharing boundaries.
- **FR-018**: Qualify actual local rendered behavior, native image/video generation and adverse integrity cases, hosted elected platform proof and unchanged normal-artifact automation exclusion. Record exact source/artifact/tool identity and separate preparation/qualification/combined timings before PR handoff; handle every review within two rounds.

### Key Entities

- **Preparation preview**: Immutable root/destination/parameter/provider identity, planned outputs, eligibility, collision and storage observations, bound to the later job.
- **Thumbnail job**: Operation-owned request, bounded work, per-item outcomes, current progress, cancellation/termination evidence and commit ownership.
- **Cache entry**: Versioned relative source/parameter/provider identity, validated output identity and declared freshness observations.
- **Diagnostic record/report**: Bounded redacted context, exact operation/category/outcome and recovery facts with explicit export contents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Both entry points preview without writes and produce attributable image and video results for the elected mixed fixtures; ordinary no-cache browsing remains usable.
- **SC-002**: Every collision, source replacement, invalid/future cache, relocation, cancellation and injected write/decoder failure fixture preserves all original/sidecar/unrelated bytes and prevents stale commits.
- **SC-003**: Every cache acceptance/fallback decision follows the documented fingerprint/validation policy; moving a portable gallery requires zero sender path/profile information.
- **SC-004**: Every elected operation failure maps to a stable diagnostic category with useful recovery; exported ordinary reports contain zero fixture private-path/credential/sidecar-content sentinels.
- **SC-005**: All new controls are operable by keyboard, retain visible focus and distinguish progress/outcomes without color; active browsing and healthy focused playback remain usable during work.
- **SC-006**: All mandatory local and elected hosted checks pass on the exact final source with terminal evidence, separate timings, verified tool/artifact inventories and no unresolved review threads before owner final review.

## Assumptions

- S012 (#5/#7) and S008 (#8) are merged prerequisites. Reuse existing Rust/Tauri gallery, native roots/grants, persistence and versioned operation semantics.
- Final installers/updates (#22..#25), actual release publication and documentation promotion (#26/#31), recipient launcher preparation (#27), broad media/accessibility qualification (#18/#19), preview/editing decisions (#20/#21) remain separate outcomes.
- Thumbnail format support is qualified separately from native playback support. Existing intended OS targets remain intact; unexercised combinations remain explicit.
- Resolve routine U-09/U-11 policy choices autonomously from existing contracts and primary technical evidence, recording alternatives and rationale during planning. No user decision or attended verification gate is invented.
- Explicit push/official PR and two-round review authorization supersedes the skill's default pre-push halt. Merge, tags and releases remain owner operations.
