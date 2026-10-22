# Feature Specification: Responsive, content-first gallery browsing

**Feature Branch**: local `main` (S003, no remote)

**Created**: 2026-10-22

**Status**: Implemented local candidate; qualification recorded separately

**Input**: Approved revised outline and field feedback: bound gallery work, remove automatic scanning, shrink controls, use masonry, retain explicit settings and keep the focused asset dominant. Execute end to end locally.

## Clarifications

### Session 2026-10-22

Autopilot answers use the owner-approved revised outline. No owner input is required.

- Q: Is refresh automatic? A: Only opening a directory and explicit Refresh initiate discovery; later automatic refresh is advanced and default off.
- Q: How long does information disclosure persist? A: Global immediate preference through navigation, viewer closure and application restart, until manually toggled.
- Q: Pagination or continuous virtualization? A: Explicit bounded pagination, 48 default and 24/96 choices; test boundaries with a private four-item page election.
- Q: Which preferences are global now? A: Page/card size, controls, scrolling indicator, information, filter and sort; directory history remains future.
- Q: Which native platforms qualify this slice? A: Windows first, small fixture only; Linux/macOS runtime checks remain deferred.

- Q: Are the first candidate controls small enough? A: No; owner observed substantially oversized buttons. Use compact desktop controls around32px, retaining larger coarse/mixed input targets and text scaling.

Coverage scan: functional behavior, entities/lifetime, UX, errors, performance bounds, security, constraints, terminology and completion are clear. Cross-process writes preserve newer state through conflict detection rather than last-writer truncation. No architecture-defining ambiguity remains.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse without collection-wide media work (Priority: P1)

As a user I can open a directory, sort the entire discovered collection and browse a bounded page without activating every original asset.

**Why this priority**: Field feedback reports unusable browsing and playback when many cards stay active.

**Independent Test**: A small mixed fixture with a deliberately small test page crosses page boundaries; mounted media remain bounded and largest-first sorting applies before pagination.

**Acceptance Scenarios**:

1. **Given** an open directory, **When** files are added or removed while idle, **Then** the collection does not change until Refresh, and no directory scans or collection polling occur.
2. **Given** multiple pages, **When** sorting by size descending or filtering, **Then** the whole collection is ordered first, the page resets to one and no more than the selected page size of cards is mounted.
3. **Given** a changed folder, **When** Refresh is requested, **Then** the refreshed collection preserves an existing focused asset and clamps an invalid page; missing assets close with a readable explanation.

### User Story 2 - Focus on an asset (Priority: P1)

As a user I can inspect or play one asset without hidden gallery decoders competing with it, with information available when requested.

**Why this priority**: Playback currently suffers from background work and metadata consumes too much space.

**Independent Test**: Open a video, toggle information during playback and navigate across page boundaries; background gallery media are absent and playback is not restarted by toggling information.

**Acceptance Scenarios**:

1. **Given** first use, **When** an asset opens, **Then** metadata is collapsed, the uncropped asset has the dominant canvas and a labelled information toggle is available.
2. **Given** playback, **When** information expands, **Then** the same asset resizes to make room without remounting or resetting playback; disclosure is immediately persisted and remains until explicitly changed, including navigation and restart.
3. **Given** an asset at a page boundary, **When** Previous or Next is selected, **Then** it navigates in complete filtered sort order; closing returns to the corresponding page and focused card.

### User Story 3 - Keep a quiet, adjustable interface (Priority: P2)

As a user I see compact controls and tightly packed cards and can retain my display choices.

**Why this priority**: The content must take precedence over interface decoration.

**Independent Test**: Measure normal toolbar and card gaps, resize mixed aspect ratios, use keyboard settings, restart and observe restored preferences.

**Acceptance Scenarios**:

1. **Given** normal text scale, **When** secondary controls are collapsed, **Then** the toolbar is approximately 48 logical pixels high with folder identity, essential actions and an expansion control; accessibility scaling may increase it.
2. **Given** mixed aspect ratios, **When** the viewport changes or facts arrive, **Then** cards fill shorter columns without fixed row gaps, preserve aspect ratio and maintain sort and keyboard order, with 12 logical pixel gaps in both directions.
3. **Given** scrolling, **When** the position changes, **Then** an on-brand position indicator appears and hides after idle, without reserving a native scrollbar gutter; keyboard, wheel and touch scrolling remain available.
4. **Given** changed view settings, **When** the app restarts, **Then** page size, card size, control visibility, scrolling indicator preference, metadata disclosure, sort and filter are restored from the per-user settings file.

### Edge Cases

- Empty collections and filters show an explicit empty state; page count is at least one and page input is clamped.
- Manual refresh is serialized/coalesced while busy; stale media/facts never attach to a different session or revision.
- Unchanged media facts are reused; leaving a page cancels probes, unloads media and obsolete responses are ignored.
- Deleted or replaced originals can fail on requested access before Refresh; show a readable item error and offer Refresh, without starting a scan.
- Missing settings use defaults. Malformed, unsupported or unwritable settings report a non-blocking warning and retain usable session choices without silently overwriting unreadable data.
- Rapid preference changes persist in order; no gallery directory receives settings or generated files.
- Small viewports and increased text scale keep essential actions and dismiss controls reachable; reduced motion disables decorative fading.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Discover only on opening a directory or explicit Refresh. No watcher, periodic scan, automatic refresh or collection polling may run while idle.
- **FR-002**: Bound mounted cards to the selected page; defaults are 48 with 24 and 96 alternatives and an accessible page jump. Sort/filter the whole collection before paging.
- **FR-003**: Preserve valid focused selection across Refresh, clamp invalid pages, reset page on sort/filter changes, and explain disappearance/access failures.
- **FR-004**: Bound concurrent gallery probes (combined image source loading/decoding and video metadata admission) to four, prioritize visible items, reuse unchanged facts and cancel/unload obsolete work on page, session or viewer changes. Do not autoplay gallery video.
- **FR-005**: Remove gallery media elements and probes while the focused viewer is open. Only the focused media may decode/play.
- **FR-006**: Start metadata collapsed; expansion resizes the uncropped asset canvas without replacing its media element or restarting playback.
- **FR-007**: Immediately persist metadata disclosure as an application preference until explicitly changed, across asset navigation, closing and restart.
- **FR-008**: Previous/Next follow complete filtered sorted order across pages; closing restores page and keyboard focus to the selected card.
- **FR-009**: Provide a compact approximately 48 logical pixel toolbar at normal text size, with approximately 32 logical pixel controls for fine-pointer desktop use and at least 44 logical pixel targets for coarse or mixed touch input. Reduce padding, icons and button prominence across toolbar, viewer and pagination. Collapse secondary controls by default and expose accessible view settings.
- **FR-010**: Pack variable-height cards into shortest columns, use 12 logical pixel horizontal/vertical gaps and preserve logical sort/keyboard order with no cropping.
- **FR-011**: Hide native gallery scrollbar/gutter and show a branded non-interactive position indicator only during scrolling by default; provide an always-visible preference, reduced motion and standard scrolling input support.
- **FR-012**: Persist page size, card size, control visibility, indicator mode, metadata disclosure, sort and filter in per-user `settings.json`; use AppData on Windows and platform user configuration directories elsewhere. Never write preferences into the media directory.
- **FR-013**: Validate settings, serialize writes and report load/write failures; preserve malformed/unsupported settings for recovery, keep usable in-memory defaults or choices, and retain security boundaries for media requests and roots.
- **FR-014**: Update official documentation sources, relevant schema, README and changelog to describe current behavior and distinguish future automatic refresh (advanced, default off) from implemented manual refresh.
- **FR-015**: Keep all artifacts, commits and checks local; Windows native acceptance uses small fixtures and reduced test page sizes, without a bulk collection gate. Preserve existing access, traversal, streaming and automation exclusion regressions.

### Key Entities *(include if feature involves data)*

- **Collection snapshot**: Discovered read-only observations from the last user-requested scan; session and revision bind access.
- **Page**: Bounded window into fully sorted filtered items, with selected size and clamped one-based index.
- **Media facts**: Revision-bound dimensions/duration/errors, cached only while the session remains applicable.
- **View preferences**: Validated per-user choices with defaults and immediate persistence status.
- **Viewer state**: Focused item, complete navigation order, persistent disclosure and return focus target.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: During an idle observation interval, no discovery/collection requests occur and filesystem changes become visible only after explicit Refresh.
- **SC-002**: Page transitions/sort/filter never mount more cards than page size; no more than four gallery probes run simultaneously, including cancellation transitions.
- **SC-003**: An open viewer has zero background gallery media/probes; a playing test video advances through information expansion/collapse without replacing the media element or resetting time.
- **SC-004**: Expanded information and all view preferences survive restart; malformed/unwritable state has a readable warning without corrupting source data.
- **SC-005**: Native geometry confirms 12 pixel gaps and shorter-column packing, a normal collapsed toolbar near 48 pixels with desktop controls near 32 pixels, keyboard logical order and an idle-hidden scrolling indicator.
- **SC-006**: Repository, documentation, schema, brand, Rust and actual Windows native checks pass with separate prerequisite/qualification timing and source provenance. No Linux/macOS runtime or owner-dataset performance claim is made.

## Assumptions

- Existing Rust/Tauri static Next.js application remains; Full/Lite packaging, thumbnail generation, sidecar parsing and path-history storage are outside this slice.
- Collections of thousands remain a product target. Small boundary fixtures prove bounded work; they cannot certify frame rate for the owner's 1,364 originals or every codec.
- Global view preferences are appropriate now; future directory history may override them without changing manual refresh default.
- Automatic refresh is future advanced functionality default off; no inactive placeholder setting will imply it exists today.
