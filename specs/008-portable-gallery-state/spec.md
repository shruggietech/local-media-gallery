# Feature Specification: S008 Portable Gallery State

**Feature Branch**: `codex/008-portable-gallery-state`

**Created**: 2026-10-24

**Status**: Specified

**Input**: Complete GitHub issues #8 and #9 end-to-end under Spec Kit/autopilot, automatically push/open the PR, handle CI and at most two review rounds, then hand off for owner final review and merge.

## Clarifications

### Session 2026-10-24 (autopilot decisions)

- Q: Which scope wins? A: Defaults < user < remembered folder < portable gallery < current session; every field reports its source. Portable choices carry the sender's explicit presentation, while current choices stay responsive.
- Q: How are scopes edited? A: A visible target selector governs explicit writes; changes remain active session overrides even when saved to a lower-precedence destination. An explicit clear-temporary action restores persisted inheritance; sparse scopes support removing individual overrides.
- Q: What counts as activity and expiry? A: Successful root opening or explicit remembered-folder saving; 90 days at the exact boundary. Rendering/listing/failed opens do not refresh activity; expiry is requested-operation cleanup, with rollback-resistant timestamps.
- Q: How is portable state distinguished from unrelated data? A: A recognizable product/kind/version envelope with sparse known fields and preserved compatible unknown data; malformed/future or unrelated settings.json is preserved with a warning and blocked portable writes.
- Q: What can forget/clear remove? A: Only machine-local directory convenience records. Media, sidecars, portable settings and caches are outside those operations, and failed/unavailable-root opens do not erase records.

Refinements after independent requirements review: removing a persisted field clears the matching session field; root replacement resets the target to user defaults; forgetting/clearing re-resolves the active remembered layer while retaining temporary choices. Destination visibility applies to collapsed controls and the focused viewer.

Coverage: functional scope, data ownership/identity, UX, reliability, failure/recovery, concurrency, constraints, terminology and completion are clear. Database driver/platform access details move to implementation planning, not unresolved product requirements. Five questions resolved under the authorized autopilot policy; no user input required.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Carry deliberate presentation with a gallery (Priority: P1)

A reader explicitly saves selected presentation choices with a gallery, moves or shares it, and receives those choices without the sender's profile. Ordinary opening remains possible without creating portable files.

**Why this priority**: This is the portability contract required by #8 and by later metadata, preparation and package work.

**Independent Test**: Save two deliberate choices in gallery A, copy it to a different parent and open with a fresh user profile; those choices apply while unspecified choices inherit the recipient's defaults.

**Acceptance Scenarios**:

1. **Given** a gallery without portable settings, **When** it is browsed without an explicit portable save, **Then** no settings or coordination file is created inside it.
2. **Given** conflicting defaults, user preferences, remembered choices and portable choices, **When** a session opens, **Then** one policy resolves every setting and reports its effective source.
3. **Given** a sparse portable document with compatible unknown fields, **When** one known preference is explicitly saved, **Then** unknown data and other choices survive and no sender absolute path is introduced.
4. **Given** a relocated copy and a fresh recipient profile, **When** it opens, **Then** portable choices work independently of machine history.

### User Story 2 - Remember a directory without making history authoritative (Priority: P1)

A reader can deliberately remember choices for a directory, reopen it from recent locations, and forget one or all remembered locations. Moving a gallery may create a new history entry while portable choices continue to work.

**Why this priority**: #9 shares the resolver and state ownership boundary with #8; both issues are required for this slice.

**Independent Test**: Give two small galleries different remembered preferences, close/reopen each, then forget one; only its local convenience record disappears.

**Acceptance Scenarios**:

1. **Given** two directories with different remembered preferences, **When** either reopens, **Then** each gets its own choices and recents order reflects successful opening activity.
2. **Given** a root reached through a native alias, **When** it opens, **Then** identity follows native path/case semantics without blind lowercasing or frontend path reconstruction.
3. **Given** an unavailable recent location, **When** opening fails, **Then** a useful error appears and its history/preferences are retained until expiry or explicit forgetting.
4. **Given** an expired, corrupt or unavailable history store, **When** readable media opens, **Then** browsing continues without treating history as a media catalog.

### User Story 3 - Understand and control where a choice is saved (Priority: P1)

A reader can distinguish temporary choices, user defaults, remembered directory choices and portable gallery choices. Each write has an explicit visible destination and failures remain attributable without losing the active choice.

**Why this priority**: Scope must be understandable to preserve existing global saves while introducing portable and remembered destinations.

**Independent Test**: Change a preference at each selected scope, inspect effective-source information, reopen and observe the declared persisted outcome; induce a conflict and read-only failure without losing media or stored bytes.

**Acceptance Scenarios**:

1. **Given** the existing user preference file, **When** the upgraded app opens, **Then** its compatible values and unknown fields remain available without rewriting it on read.
2. **Given** a temporary change, **When** it is saved to a lower-precedence destination, **Then** the current session keeps the explicit choice and explains the source; reopening follows persisted precedence.
3. **Given** another writer changed a document or root/session was retired, **When** an older save completes or is attempted, **Then** it cannot overwrite newer state or apply to a replacement session.
4. **Given** malformed, oversized, future-version or read-only state, **When** reads or saves occur, **Then** original bytes remain intact, fallback/unsaved state is visible and readable media remains usable.

### Edge Cases

- Missing versus explicit default values; sparse override removal; false/zero/empty versus absence; compatible unknown nested fields.
- Unrelated settings.json, linked/reparse destinations, concurrent document edits and process writers, interrupted replacement and destination collisions.
- Missing/corrupt/future history store, failed migrations, database contention, clock rollback, expiry boundary and unavailable drives.
- Native non-ASCII/reserved names, aliases and case-sensitive paths; relocation after closing the held Windows root; duplicate recents ordering.
- Pending preference saves during root replacement, recent-location opening, repeated forget/clear and stale recents identifiers.
- Keyboard operation, focus, text scale and narrow windows with the existing compact toolbar/media behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Resolve each existing presentation field through one native policy: built-in defaults, then valid user preferences, remembered directory choices, portable choices, then explicit session changes (later wins).
- **FR-002**: Report the effective source of every field and visible save destination; unpersisted changes remain distinguishable from stored choices.
- **FR-003**: Read a versioned sparse gallery-local settings.json only for the current native-granted root; do not require it or create gallery files during casual browsing.
- **FR-004**: Portable data must contain intentional presentation only, with a recognizable product/kind/version envelope; retain compatible unknown fields and reject invalid known values or unsupported versions without rewriting originals.
- **FR-005**: Preserve the current flat user-settings format and default behavior, including font scale, metadata disclosure and immediate explicit user preference saves. Missing legacy fields retain their documented defaults.
- **FR-006**: Provide visible destination selection for temporary, user, remembered-folder and portable-gallery writes. Selecting portable saving is deliberate. Only explicitly changed fields are added to sparse scopes; removing a persisted field also clears its temporary override and restores inheritance. The target resets to user defaults on root replacement and remains visible even with controls collapsed or the viewer open.
- **FR-007**: Explicit session choices take precedence until the session changes or the reader clears temporary choices; saving elsewhere does not unexpectedly revert the current choice.
- **FR-008**: Persist documents using coordinated revision/conflict checks and validated atomic replacement, preserving prior bytes on failure and compatible unknown fields on success.
- **FR-009**: Confine portable access and coordination to the current granted directory, reject linked/reparse destinations, and validate native session identity before mutation or applying asynchronous results.
- **FR-010**: Store directory choices and recent locations in machine-local convenience state, separate from portable documents and disposable caches. Define platform locations with deliberate Windows Local versus Roaming allocation.
- **FR-011**: Directory keys must preserve actual native absolute-path/case/alias identity; frontend display strings and blind lowercasing cannot define lookup identity.
- **FR-012**: Record successful opening and explicit remembered-folder writes as activity; listing, rendering, failed opening and background time do not refresh activity.
- **FR-013**: Expire convenience records after 90 days of inactivity, at the exact boundary, using bounded cleanup during requested history operations rather than a watcher or timer. Clock rollback must not spuriously expire a recent record.
- **FR-014**: List up to 20 recent locations in descending activity order with a deterministic tie-break; reopen through an opaque native record identity and the ordinary root-opening boundary.
- **FR-015**: Offer explicit forget-one and clear-history operations. They remove only convenience records, never media, sidecars, portable settings or caches; repeated requests have defined idempotent outcomes. Forget/clear immediately drops the active remembered contribution but preserves explicit temporary choices; it does not re-add a location until a new successful opening or explicit remembered save.
- **FR-016**: Serialize/coordinate concurrent history writers, declare a versioned migration policy, and preserve corrupt or unsupported stores. Missing/unavailable/future history degrades to attributable browsing without silently rebuilding over damaged bytes.
- **FR-017**: Unavailable drives and failed recent opens leave retained records intact except for declared inactivity expiry; moved roots can receive a new history entry and portable preferences still apply.
- **FR-018**: Expose fallback, conflict, read-only, unavailable and unsaved outcomes with accessible controls/status; keep the active media and ordinary browsing usable.
- **FR-019**: Preserve current manual discovery, media admission, paging, viewer focus/playback and text-scale behavior. No background directory enumeration, media mutation or new editing capability is introduced.
- **FR-020**: Update authoritative state/interface/lifecycle documentation, master schema, representative examples and glossary terms where changed, keeping software/docs/schema release version aligned at the unreleased baseline.
- **FR-021**: Qualify all resolver precedence pairs, sparse/default distinctions, legacy/unknown/future formats, simultaneous writers, root retirement, native identity, relocation, unavailable storage, migrations and exact expiry with small deterministic fixtures plus rendered Windows interactions.
- **FR-022**: Deliver the complete two-issue slice through successful local/hosted qualification, an automatically pushed official PR, responses/resolution for all findings with at most two review rounds, and owner final-review/merge handoff.

### Key Entities

- **Presentation choices**: existing fields, sparse intentional overrides, effective values and their individual sources.
- **Portable document**: product/kind/format/release identity, sparse choices, compatible unknown data and content revision.
- **Root session**: native grant and path identity, lifetime, active temporary changes and selected write destination.
- **Remembered location**: opaque record identity, native absolute location, sparse choices, last qualifying activity and revision.
- **State outcome**: useful warning/error, persisted-versus-unsaved status and recoverable fallback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The precedence matrix produces the declared value and source for every supported field; sparse omission and explicit defaults remain distinguishable.
- **SC-002**: Two galleries and a relocated copy retain independent portable/remembered behavior under a fresh recipient profile without sender-specific paths in portable bytes.
- **SC-003**: Casual opening creates zero files in a gallery; expiry/forget/clear changes zero media, sidecar, portable or cache bytes.
- **SC-004**: Every invalid/future/conflicting/read-only/retired-root case preserves existing durable bytes and reports the correct fallback or unsaved result. Interrupted replacement leaves a valid prior document or a fully committed validated replacement, never a partial document.
- **SC-005**: Recents, activity and expiry satisfy exact before/at/after-boundary cases and unavailable-root/clock-rollback scenarios without background scanning.
- **SC-006**: All new controls remain usable by keyboard at current text scales and narrow native windows; existing native gallery groups still pass.
- **SC-007**: All mandatory checks pass with preparation, qualification and combined timing separated, 660-second target, 900-second hard limit and 15-second finalization reserve retained.
- **SC-008**: Final PR closes #8 and #9 on merge, has green applicable exact-head CI and no unresolved review findings; merge remains the owner's action.

## Assumptions

- Existing Rust/Tauri/Next gallery and brand vocabulary are retained; no product packages or release are published by this slice.
- All three stories are required. Their independent tests do not reduce the two-issue completion boundary.
- Gallery-local settings are explicit; machine-local recents can record successful opening automatically because they do not modify shared media directories.
- Ninety-day inactivity and a 20-entry visible list are deliberate S008 policy choices, not inherited approval of an earlier suggestion. Storage may contain additional non-expired records; listing has a fixed result bound.
- Native Windows behavior is qualified here; platform path/location and persistence logic receive portable tests, without claiming unobserved macOS/Linux native application behavior.
- New media/metadata field features, installation/package work, asynchronous discovery and general diagnostics are separate issues.
