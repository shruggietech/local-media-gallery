# Feature Specification: Responsive discovery and root recovery

**Feature Branch**: `codex/009-responsive-discovery-recovery`

**Created**: 2026-10-24

**Status**: Specified and clarified

**Input**: S009, complete GitHub #10 and #11 end-to-end under Spec Kit autopilot, publish a PR, handle CI and at most two review rounds, then await owner review and merge.

## Clarifications

### Session 2026-10-24

- Q: Should cancellation discard newly discovered media? A: Retain useful observations and explicitly mark the result cancelled; incomplete discovery never proves deletion.
- Q: Should this slice enable recursive or linked traversal? A: Preserve direct regular-file discovery and excluded descendant links; document root canonicalization separately.
- Q: Should storage loss trigger automatic recovery? A: Preserve state and require explicit Refresh/retry or reopen; no idle enumeration.
- Q: Which support evidence is elected? A: Native Windows local paths plus deterministic injected failure/recovery; generic mounted storage remains best effort with physical/network and other native runtimes explicitly unqualified.
- Q: Does cancellation promise to terminate a blocked OS call? A: No; it prevents further admission and publication at cooperative boundaries and cannot certify the call stopped.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse while requested discovery runs (Priority: P1)

A user opening a folder or selecting Refresh sees the window and available media before the entire enumeration finishes, with useful discovery state.

**Why this priority**: The current initial enumeration finishes before the window starts; slow storage must not prevent using the interface.

**Independent Test**: A small deliberately delayed discovery exposes an item and scanning state before its completion barrier is released.

**Acceptance Scenarios**:

1. **Given** a slow folder, **When** it opens, **Then** the interface remains usable, discovered media appears incrementally, and progress reports observed counts without a fabricated percentage.
2. **Given** additions, removals or changes, **When** Refresh is selected, **Then** collection-wide sort/filter precedes pagination, surviving selection remains stable, and completion distinguishes partial from complete results.
3. **Given** an unreadable entry, an empty directory or a filter with no matches, **When** discovery settles, **Then** these three outcomes remain distinguishable and accessible siblings remain usable.

### User Story 2 - Cancel or replace requested work (Priority: P1)

A user can cancel discovery, close the folder or choose a different folder without late results overwriting the current session.

**Why this priority**: Incremental publication requires explicit retirement of both session and operation identity.

**Independent Test**: Pause a worker after an observation, cancel or replace its operation, release it, and assert no subsequent publication or source access is admitted for that operation.

**Acceptance Scenarios**:

1. **Given** an active scan, **When** Cancel is selected, **Then** admission stops at the next cooperative boundary and the visible result explicitly says cancelled while retaining usable observations.
2. **Given** an old scan, **When** a new root replaces it or the session closes, **Then** old observations and completion notifications cannot mutate the new view or saved state.
3. **Given** an active Refresh, **When** another Refresh is requested, **Then** operations do not overlap directory enumeration and the current request has a deterministic outcome.

### User Story 3 - Recover an unavailable folder (Priority: P2)

A user sees an unavailable folder as unavailable, retains deliberate preferences, and can retry explicitly or reopen its new location.

**Why this priority**: Storage loss is not an empty gallery and must not erase user intent.

**Independent Test**: Inject root enumeration failure, verify retained items/preferences and explicit unavailable state, restore access, explicitly retry, and verify complete discovery.

**Acceptance Scenarios**:

1. **Given** a folder becomes inaccessible, **When** requested discovery fails, **Then** the view reports unavailability, preserves prior observations as stale, and offers explicit retry or folder selection.
2. **Given** a failed new selection, **When** another root remains usable, **Then** the failed selection does not replace that usable root.
3. **Given** a closed folder moved to a path with spaces or non-ASCII/reserved characters, **When** reopened, **Then** current files and portable choices resolve from the actual native location without a manifest.

### Edge Cases

- A directory iterator fails after yielding accessible siblings; present a partial result, never a falsely complete empty collection.
- Cancel during an individual blocking filesystem call stops future admission/publication; cancellation does not certify that the OS call itself stopped.
- A cancelled or partial Refresh must not infer deletion of unobserved old items.
- A path is replaced while the session holds a directory grant; do not silently switch to the replacement resource.
- A linked file, directory cycle, nested gallery or hidden/system entry must not broaden the selected traversal policy.
- Filter/sort/page changes during scanning must not discard the user's current choices; item disappearance uses a documented neighboring/empty destination.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Opening and explicit Refresh MUST run potentially expensive enumeration off the window startup/event loop and expose scanning state before full reconciliation completes.
- **FR-002**: Discovery MUST publish bounded incremental observations, observed entry/media counts and explicit complete, partial, cancelled, failed and unavailable outcomes without claiming a known total.
- **FR-003**: Only opening and user-initiated Refresh/retry MUST enumerate; no watchers, idle scan, timer-triggered refresh or automatic reconnection enumeration may be added.
- **FR-004**: Cancel, root replacement and close MUST retire operation admission at cooperative boundaries; session plus operation identity MUST reject late observations and terminal results.
- **FR-005**: Requested Refresh operations MUST serialize enumeration. Cancellation MUST remain available while a worker is waiting for or performing a scan.
- **FR-006**: Sorting/filtering MUST apply to the entire observed collection before pagination. Surviving selected item and page anchor MUST remain stable as observations arrive; final removal MUST produce an explained neighboring/empty destination.
- **FR-007**: Complete enumeration alone MAY remove unobserved old items. Partial/cancelled/failed/unavailable scans MUST retain unconfirmed prior observations with an explicit incomplete/stale indication.
- **FR-008**: Root unavailability MUST preserve saved choices/history and distinguish stale previous observations, truly empty scope, filter-empty scope and item-scoped errors. Recovery MUST require an explicit retry or reopen.
- **FR-009**: The initial policy MUST remain direct regular-file candidates only, without recursive or descendant symlink/reparse traversal. Nested directories and mount children are not entered. An explicitly selected root may resolve its native canonical target, but resource replacement MUST NOT silently retarget an active grant.
- **FR-010**: Storage support MUST distinguish tested local behavior, generic best-effort OS-mounted removable/network paths and combinations without physical/native qualification. It MUST NOT claim tested disconnection or cross-platform behavior from simulations or compilation.
- **FR-011**: Native path spelling, case/aliases, spaces, non-ASCII/reserved characters and relocation MUST retain filesystem semantics and capability-relative source access. Media and existing state bytes MUST remain unchanged except deliberate existing state operations.
- **FR-012**: Progress, cancellation, retry and result explanations MUST be keyboard accessible, avoid invented percentages, and retain bounded media loading and focused-playback behavior.
- **FR-013**: Authoritative lifecycle, interface, architecture, support and JSON contracts MUST describe implemented behavior; internal planning/evidence MUST remain under this slice's `specs/` directory.
- **FR-014**: Small deterministic delayed/failing fixtures MUST prove intermediate publication, cancellation, replacement/close rejection, partial retention, unavailable recovery, path/traversal boundaries and source integrity. Existing product/state/site checks MUST remain passing.

### Key Entities

- **Gallery session**: An opaque identity and held native directory grant with current presentation choices and observed items.
- **Discovery operation**: One initial/Refresh request, its session identity, generation, cancellation state, counts, observations and terminal outcome.
- **Observation**: An item fact tied to native resource identity and the operation that observed it.
- **Retained observation**: A prior item not yet confirmed by the latest incomplete operation, visibly distinguishable from current verification.
- **Storage policy**: Elected traversal and recovery rules plus separately attributed qualification evidence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A controlled delayed scan displays at least one usable observation and progress while further discovery remains blocked.
- **SC-002**: Every cancellation, replacement and close regression rejects all deliberately released late updates; a replacement folder's media and preferences remain unchanged.
- **SC-003**: Small complete/partial/cancelled/failed/unavailable/empty/filter-empty fixtures produce their distinct documented outcomes, with zero incorrect unobserved-item removals after incomplete scans.
- **SC-004**: Explicit recovery restores current observations and choices; path/traversal fixtures preserve source hashes and never expose linked descendants.
- **SC-005**: Repository, product, native functional, site, integrity and provenance qualification passes within the existing timing contract; CI and review comments are resolved before owner handoff.

## Assumptions

- Existing Rust/Tauri core, Next interface, held directory grants and S008 state resolver remain the architecture of record.
- Windows local filesystem behavior is elected for native functional qualification. Native Linux/macOS, physical removable disconnection and real network outage behavior require their own evidence and remain explicitly unqualified here.
- Recursion, descendant links, automatic refresh, thumbnails, sidecars, installers and performance guarantees are outside this slice; practical scale remains a product goal without a bulk acceptance gate.
- GitHub #10 and #11 share no open prerequisite and are both included, rather than treating documentation of one as implementation of the other.
