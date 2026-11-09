# Feature Specification: Organized application navigation

**Feature Branch**: codex/s036-application-navigation
**Created**: 2026-11-08
**Status**: Specified and clarified
**Input**: S036, complete GitHub #94 end-to-end under autopilot through PR, at most two hosted review rounds and green CI; owner performs final merge.

## User Scenarios & Testing

### User Story 1 - Find gallery actions without a crowded header (Priority: P1)

A person opens, identifies and browses a gallery using a compact persistent bar, while secondary actions live in a predictable drawer.

**Why this priority**: The current flat header obscures the folder identity and mixes unrelated tasks for every gallery session.
**Independent Test**: Starting without a gallery, open a recent or chosen directory, inspect its full path, sort the collection and traverse every drawer category at wide and narrow sizes.

**Acceptance Scenarios**:
1. Given no gallery, the bar names the application and the main content exposes Open folder and recent folders.
2. Given an open gallery, the bar contains Menu, a usable folder-name details trigger and Refresh. Selecting the name exposes the entire selectable wrapping path and Copy path.
3. Given the root drawer, each required category opens a titled submenu inside that drawer; Back returns to the preceding level. The hierarchy is identical at wide and narrow widths.
4. Given a filtered collection, Sort and filter is reachable next to the collection count, preserves existing sort/filter choices and exposes an understandable no-match state.

### User Story 2 - Change settings and prepare a gallery in context (Priority: P1)

A person edits settings with their destination visible, finds history separately from provenance and follows progress and cancellation without expanding a dense header.

**Why this priority**: Relocation must retain all implemented choices and data semantics.
**Independent Test**: Exercise all four save destinations, inspect saved overrides, reopen recent folders, and start/cancel preparation from their dedicated destinations.

**Acceptance Scenarios**:
1. Given a settings editor, its selected save destination is visible before changing a value and applies to that value. All four existing destinations remain available when supported by the current session.
2. Given recent history, Gallery > Recent folders exposes it independently of Settings > Saved preferences and overrides. History management retains its existing effects and failure reporting.
3. Given active preparation or thumbnail work, current progress and cancellation remain reachable; dismissing navigation does not cancel work. Detailed counters and diagnostics belong to their relevant task screens.
4. Given a failed save, copy or operation, an accessible local result explains the failure while existing usable session state is retained.

### User Story 3 - Navigate accessibly without disrupting viewing (Priority: P1)

A person uses keyboard, touch or assistive technology to open secondary controls and return to the same media.

**Why this priority**: A visual reorganization must preserve navigation, playback and accessible operation.
**Independent Test**: Open a focused image/video, traverse drawer and task screens, dismiss with Escape/close, and verify focus, selection and playback lifetime.

**Acceptance Scenarios**:
1. Given an open viewer, its primary controls remain close/back, filename, information, previous/next and playback; secondary settings use the same navigation model.
2. Given an open drawer, keyboard focus remains within it, starts at a meaningful control, follows submenu transitions and returns to the invoking control when dismissed. Escape closes the drawer; its Back action goes up one level.
3. Given an input or drawer interaction, gallery/viewer shortcuts do not consume that interaction. Opening or closing navigation does not replace active media or reset its position.
4. Given 320-logical-pixel width, enlarged text or touch input, essential actions and full folder details remain reachable without page-level horizontal overflow.

### Edge Cases

- No gallery, empty directory, no matching items, missing recent path and failed folder selection.
- Long Unicode names/paths, unbroken path segments, inaccessible clipboard and changed root while a task panel is open.
- Gallery-only save scopes before a gallery exists; a remembered or portable setting that cannot be written.
- Active preparation during drawer dismissal, returning from a diagnostic/task screen, cancelled native chooser and persistent operation error.
- Viewer on first/last item, playing media, text inputs, nested disclosures and focus target removed by closing the gallery.
- Fine versus coarse pointers, narrow windows, text scaling and reduced motion.

## Requirements

### Functional Requirements

- **FR-001**: The persistent app bar MUST prioritize exactly three groups: Menu, gallery-folder name/details (application title when empty), and Refresh (unavailable without a gallery).
- **FR-002**: With no gallery, main content MUST expose Open folder and independent recent folders.
- **FR-003**: The drawer MUST contain the hierarchy below, with titled submenus, explicit Back and Close controls and the same routes on wide/narrow windows.
- **FR-004**: Folder details MUST expose the entire selectable wrapping absolute path and Copy path, with an accessible success/failure result independent of hover.
- **FR-005**: A compact Sort and filter shortcut MUST sit beside the collection count and retain existing deterministic ordering/filter behavior.
- **FR-006**: Settings editors MUST place save destination beside the values being edited, visibly before mutation. User defaults, Temporary session, Remember this folder and Portable gallery MUST retain their current persistence and availability rules.
- **FR-007**: Recent folders MUST have a location independent from saved-preference provenance. History and provenance actions MUST preserve existing effects and error feedback.
- **FR-008**: Active preparation/thumbnail work MUST retain visible progress, a route to details and cancellation; closing navigation MUST NOT cancel work. Detailed counters and diagnostics MUST appear with the relevant task.
- **FR-009**: The viewer MUST keep its primary viewing controls focused and use the common drawer hierarchy for secondary settings, preserving current media and playback position through navigation.
- **FR-010**: All implemented gallery actions, settings, information controls, preparation, thumbnails, diagnostics, documentation and licensing information MUST remain reachable. Relocation MUST NOT silently remove capability or change persisted data semantics.
- **FR-011**: The drawer MUST provide labelled modal semantics, meaningful initial focus, contained keyboard traversal, deliberate submenu focus and focus return. Escape MUST close it; Back MUST return one level. A removed invoking control MUST use a surviving logical fallback.
- **FR-012**: Keyboard shortcuts MUST ignore navigation and editable interactions; touch targets MUST retain at least 44 logical pixels for coarse/mixed input and existing accessible focus styling. Layout MUST work at 320 logical pixels, desktop widths and enlarged text without page-level horizontal overflow.
- **FR-013**: Navigation state MUST be transient. Route/drawer changes MUST NOT reopen a gallery, clear selection, restart discovery, mutate save destinations, cancel work or remount active media merely as a side effect.
- **FR-014**: Unsupported or failed clipboard/native/help actions MUST retain user-visible accessible feedback. Modal/background interaction boundaries MUST prevent accidental actions behind navigation.
- **FR-015**: Existing governed brand identity, shell, typography, colors and motion preferences MUST remain authoritative. No governed kit bytes are edited as part of this reorganization.
- **FR-016**: Authoritative documentation and changelog MUST describe the resulting navigation while preserving published release records and documentation history through the existing version workflow.
- **FR-017**: Existing repository, gallery, site, native and integrity/provenance checks MUST remain applicable. No attended pre-release gate or new approval step is introduced. Qualification retains 660-second advisory target, 900-second hard limit, 15-second reserve and terminal timestamp authority.
- **FR-018**: Delivery MUST include the official PR, responses/resolution for every hosted finding within two review rounds maximum, terminal-successful applicable final-head CI, and an owner review/merge handoff. Push/PR are authorized; final merge and release publication are outside this slice.

| Category | Submenus/actions |
| --- | --- |
| Gallery | Open folder; Recent folders; Refresh; Folder details; Close folder |
| View | Sort and filter; Layout; Information display |
| Prepare & share | Prepare gallery; Thumbnails; Preparation progress |
| Settings | Appearance; Loading; Saved preferences and overrides; History |
| Help | Diagnostics; Documentation; About and licenses |

### Key Entities

- Navigation session: open state, current category/task and invoking control; never persisted as user preference.
- Gallery identity: current folder basename and full absolute path; unchanged discovery and selection authority.
- Settings destination: one existing write scope associated with each settings editor before mutation.
- Task state: existing preparation/thumbnail progress, cancellation and diagnostics authority, independent of navigation visibility.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All five categories and every listed destination are reachable in both a 320-pixel and desktop window; the persistent bar retains its three priority groups.
- **SC-002**: The full long Unicode path is selectable and copyable from folder details, with successful copying matching every original character or a clear failure result.
- **SC-003**: All four supported save destinations remain operable with their existing persistence effects; recent folders and provenance are independently reachable.
- **SC-004**: Keyboard-only traversal, Back, Escape, focus return and touch activation pass for all navigation groups without background shortcut activation or overflow.
- **SC-005**: Opening/closing navigation preserves the selected item, media element/playback position, active work and cancellation capability.
- **SC-006**: All applicable checks pass on the final PR head, review findings are answered/resolved within the cap, and the PR remains open for owner merge.

## Assumptions

- This is navigation reorganization of current capabilities, not a backend/state-schema redesign, a legacy MSI repair or a new release publication.
- Current Full/Lite capability restrictions and write-scope availability remain authoritative; unsupported actions explain their existing limitation.
- The existing renderer, native host and governed brand remain in place. An ordinary navigation path needs no network access; external documentation links retain existing host behavior.
- Existing automated regression/qualification remains required. Post-publication user observations continue through issues, without an attended pre-release ceremony.

## Clarifications

### Session 2026-11-08

- Autopilot resolves routine navigation choices: identical modal drawer hierarchy at all widths; Escape dismisses it, explicit Back returns one level, and dismissal restores the invoking control or an existing logical fallback.
- Settings write destination is shown within each settings editor; moving between routes does not silently change the selected destination.
- Closing a drawer/task panel does not stop an operation or viewer. Existing explicit cancellation/close-gallery/close-viewer actions retain their effects.
- No critical scope ambiguity requires an owner question. Documentation/version placement and concrete focus primitives are implementation research, not unapproved product changes.
