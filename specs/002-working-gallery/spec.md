# Feature Specification: First working local gallery

**Slice**: S002

**Feature Branch**: `main` (local specification work; feature identity is independent of the branch)

**Created**: 2026-10-21

**Status**: Draft with proposed defaults; owner selected Windows-first native validation

**Input**: Specify the first working gallery using Spec Kit, propose sensible defaults, flag required owner input before implementation, and keep everything local. The owner explicitly rejected testing on 1,000 images.

## User Scenarios & Testing

### User Story 1 - Open a directory immediately (Priority: P1)

A user opens the application, chooses a local directory and sees its image/video entries without generating anything or changing the collection structure. They can also provide the directory when launching the application from a terminal.

**Why this priority**: This is the smallest useful gallery journey and establishes the native application and live directory boundary.

**Independent Test**: Open a small prepared verification fixture using both entry points, then repeat with an empty and an unavailable directory. Compare the discovered entries with the known fixture inventory.

**Acceptance Scenarios**:

1. **Given** no initial directory, **When** the application opens, **Then** a native directory-selection action is available; cancelling leaves the current session unchanged.
2. **Given** a readable directory containing the fixture's supported media, **When** it is selected or supplied at launch, **Then** its direct media entries appear without a manifest, thumbnails, account, user browser selection or frontend rebuild.
3. **Given** an empty directory, an inaccessible root or an unreadable child, **When** discovery finishes, **Then** the UI distinguishes empty, failed and partial discovery while retaining readable siblings.
4. **Given** media inside a child directory or a linked child entry, **When** the default discovery runs, **Then** it remains outside this slice's proposed direct-files-only scope and the interface identifies that scope.

### User Story 2 - Browse, view and inspect media (Priority: P1)

A user sees a stable collection view, filters images/videos, changes basic ordering, opens an item and reads its file/media information. The cards adapt to the media's proportions.

**Why this priority**: A directory listing becomes a useful gallery only when users can see, navigate and inspect its contents.

**Independent Test**: Use the same small fixture to check ordering, each media-type filter, portrait/landscape cards, item details and successful playback of the nominated video fixtures on the elected native validation environment.

**Acceptance Scenarios**:

1. **Given** mixed image/video entries, **When** the user selects All, Images or Videos and changes filename, modified-time or size ordering, **Then** results/counts match the selected criteria and equal values have a stable tie-breaker.
2. **Given** portrait, landscape and square images, **When** their cards and viewer open, **Then** proportions are preserved, full content is accessible and images are not stretched or silently cropped.
3. **Given** a valid nominated video, **When** the user plays, pauses and seeks it, **Then** playback controls work and seeking demonstrably changes the playhead/content. A first frame alone does not satisfy this scenario.
4. **Given** any represented item, including an unsupported or damaged candidate, **When** its information view opens, **Then** current filename, relative location, type and available file/media facts are accessible, with unavailable values explicitly identified.
5. **Given** another video is playing, **When** a new video opens or the viewer/gallery closes, **Then** the prior playback stops and no hidden audio continues.

### User Story 3 - Keep the gallery current and movable (Priority: P1)

A user adds, removes or replaces media while browsing. They can move the directory and reopen it without regenerating a manifest.

**Why this priority**: Fresh directory discovery and relocation directly address the previous gallery workflow's major pain points.

**Independent Test**: Add, remove and replace one temporary fixture item at a time; reopen the same small collection under a different parent path. Switch roots while work is outstanding.

**Acceptance Scenarios**:

1. **Given** a completed scan, **When** one file is added or removed and the directory settles, **Then** the unfiltered view and count reconcile automatically within the proposed five-second local-fixture window, without a preparation command.
2. **Given** a file replaced at the same name, **When** it is observed again, **Then** current information/media replace stale results and a partial copy is not permanently classified from its first failed read.
3. **Given** a selected item removed externally, **When** reconciliation completes, **Then** the interface explains the disappearance and leaves selection/navigation valid.
4. **Given** a gallery moved to a different parent, **When** the user reopens its new root, **Then** its current media are discovered without relying on the former absolute path.
5. **Given** discovery or media loading for one root, **When** the user opens another root, **Then** late results and playback from the former session do not appear in the new one.

### User Story 4 - Recover and navigate without surprises (Priority: P2)

A user can operate the gallery by keyboard, understand failures and browse without ordinary viewing writing into their collection.

**Why this priority**: A small native prototype must still have reliable interaction and preserve source data.

**Independent Test**: Complete the picker, filters, viewer and details journey using the keyboard; inspect the fixture before/after browsing and exercise damaged media and root-access failures.

**Acceptance Scenarios**:

1. **Given** keyboard-only input, **When** a user opens the picker, changes controls and opens/closes the viewer/details, **Then** controls have useful names, focus remains visible and closing returns focus meaningfully.
2. **Given** damaged or unsupported media, **When** display fails, **Then** the affected item remains represented with an attributable result while unaffected media remain usable.
3. **Given** an ordinary browse session, **When** it ends, **Then** original media/nearby documents have identical bytes and no manifest, thumbnail or settings file has been created in the gallery.
4. **Given** a root or entry with Unicode, spaces, URL-significant characters or markup-looking text, **When** it is opened or inspected, **Then** the correct resource is used and labels remain inert data.

### Edge Cases

- Picker cancellation, invalid launch input and a root removed after selection must leave an understandable recoverable state.
- The root itself may be an explicitly chosen resolved location; linked descendants are not followed by default. Cycles and automatic escape to another directory must not occur.
- A same-name replacement must invalidate obsolete inspection/loading results. Discovery completion and a transient decoder error must not be confused.
- Filtering or sorting during discovery, removing the selected item and switching roots during playback must leave valid counts, focus and selection.
- Hidden/system/generated entries, unrelated documents and candidate media with damaged bytes follow the documented inclusion rules rather than accidental library defaults.
- Native names that cannot be displayed losslessly must retain an unambiguous native item identity; display normalization must not select a different file.
- A supported container extension does not prove its codec can play. A codec failure is reported; it cannot count as passing a required playback case.
- Root unavailability is distinct from successful reconciliation of an empty root. Any recovery control must not erase deliberate source data.

## Requirements

### Functional Requirements

- **FR-001**: The user MUST be able to select a local root through a native chooser or supply one directory at application launch. No directory means an explicit selection state, not an implicit scan of an arbitrary working directory.
- **FR-002**: Cancelling selection MUST preserve the current gallery. Invalid or unavailable launch roots MUST produce an actionable result with an option to choose another root.
- **FR-003**: Proposed discovery MUST cover direct regular-file media candidates, omit child traversal and linked descendants, and expose that scope. Exact inclusion proposals are recorded in [decisions](decisions.md).
- **FR-004**: Discovery MUST use current directory observations without compulsory manifests, thumbnails or source writes. Available results SHOULD appear before all optional file/media facts are known.
- **FR-005**: The interface MUST distinguish scanning, complete, partial, empty-directory, no-filter-matches and inaccessible-root states, with counts appropriate to that state.
- **FR-006**: Users MUST have All, Images and Videos filters and ascending/descending filename, modified-time and size sorting. Ties MUST have deterministic relative-name ordering; missing facts MUST not hide an item.
- **FR-007**: Cards MUST preserve the displayed media's aspect ratio, provide a useful pending/unsupported representation and retain deterministic visual/keyboard order at narrow and wide window sizes.
- **FR-008**: A selected image MUST be viewable in full without a thumbnail dependency. The viewer MUST support previous/next navigation within the active result set and closing back to meaningful gallery focus.
- **FR-009**: The nominated video fixtures MUST play, pause and seek successfully on each native environment elected for this slice. Proposed behavior is user-initiated playback with only one active video; closing/replacing its session MUST stop it.
- **FR-010**: Every represented item MUST expose current filename, relative location, category, size and modified time, plus dimensions/duration where obtainable. Unknown values MUST be distinguishable from zero or fabricated values.
- **FR-011**: Unsupported/damaged candidates MUST retain an inspectable item representation and attributable failure without discarding readable siblings.
- **FR-012**: Additions, removals and replacements MUST reconcile automatically after the directory settles. A manual refresh MUST also recover the current view, without being the only ordinary change mechanism.
- **FR-013**: Reopening a relocated directory MUST discover its contents from the new root without regenerating a listing or consulting former machine-local history.
- **FR-014**: Replaced/cancelled sessions and stale item observations MUST NOT update the current collection, selected item or playback.
- **FR-015**: Discovery, pending media work and active playback MUST be bounded and releasable; scrolling MUST NOT eagerly load/play every original in the directory. Closing/replacing a gallery MUST stop admission of its old work.
- **FR-016**: Gallery controls MUST be keyboard operable, named and visibly focused. Status MUST not rely on color alone, and reduced-motion preferences MUST be respected.
- **FR-017**: Viewing MUST NOT rewrite originals/sidecars or create collection-local settings, manifests or thumbnails. Slice controls are session-only; durable preferences are separate work.
- **FR-018**: Resource access MUST remain tied to the chosen root/session and declared traversal policy. Filenames and external strings MUST remain data rather than executable markup, paths-as-authority or process instructions.
- **FR-019**: Ordinary use of the built local application MUST use bundled interface assets and native media access without a recipient browser choice, a Node development server or external gallery service. Build tools remain maintainer prerequisites.
- **FR-020**: Project-owned Windows console helpers MUST remain hidden and noninteractive, with failures returned to the invoking operation. No installer/system integration is required to exercise this slice.
- **FR-021**: Verification MUST use the small representative fixture and focused failure cases in [acceptance](acceptance.md). A 1,000-image test, bulk-media benchmark or equivalent synthetic stress prerequisite MUST NOT be introduced. These checks establish functional evidence only, not a thousands-item performance claim.
- **FR-022**: Build, native runtime, browser preview, source checks and hosted evidence MUST remain separately identified. This slice MUST NOT be described as a shipped Full/Lite release or completion of all v0.0.0 product contracts.
- **FR-023**: Windows, Linux and macOS remain product targets. Following the owner's Q-01 answer, S002 native acceptance MUST cover the current Windows development host; Linux/macOS native runtime checks are explicitly deferred and MUST NOT be reported as verified. Exact host/runtime facts are captured when implementation prerequisites are checked.

### Key Entities

- **Gallery session**: One selected root, its lifetime, discovery state and current selection. Replacing it retires its old work and media access.
- **Media item**: A currently observed candidate with native identity, relative display location, type and available file/media facts.
- **Collection view**: The active type filter, ordering, result count, browsing position and selection for one session.
- **Observation revision**: A logical version of a root/item read used to reject stale asynchronous results.
- **Item result**: Current display/inspection/playback outcome, including unavailable/unsupported/damaged cases without erasing the item.
- **Verification fixture**: A small owned/licensed set with known expected facts and operation outcomes, separate from an owner's personal collection.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Both supported opening paths discover exactly the expected direct candidates in the small fixture; unrelated files, nested children and linked descendants are excluded according to the elected defaults.
- **SC-002**: Each proposed required still-image format displays correctly in the fixture, and both nominated short videos complete play/pause/seek checks on every elected native environment. Every represented item has an accessible information result.
- **SC-003**: All three type filters and all six sort/direction combinations produce the fixture's expected results with deterministic ties. Portrait, landscape and square cards preserve proportions.
- **SC-004**: After each settled add/remove/replace operation on the small local fixture, the gallery converges within five seconds; reopening after relocation needs no generated listing. This is a proposed functional update window, not a throughput benchmark.
- **SC-005**: Root replacement, failed media and picker cancellation preserve valid state; no former session's results or audio appear after it is retired.
- **SC-006**: The keyboard journey completes without an inaccessible control or stranded focus, and ordinary browsing leaves source bytes unchanged with zero new collection-local files.
- **SC-007**: Required local checks and elected native/build checks have terminal outcomes bound to the tested revision. The evidence explicitly lists untested platforms and excludes unsupported scale/package claims.

## Assumptions

The [v0.0.0 specification](../../docs/v0.0.0/index.md) remains authoritative. Slice-specific proposals are collected in [decisions](decisions.md), including rationale, deferred questions and Q-01. They are not approvals or public support claims.

The working fixture is proposed as twelve represented media candidates (eight valid still images, two short videos, one known unsupported candidate and one damaged candidate), plus a few non-media/nested/link cases. Files are reused across scenarios, and mutation checks operate one at a time. No owner collection or large generated corpus is required. A 1,000-image test is excluded by the owner; the twelve-candidate fixture is our proposed alternative, not an owner-selected fixture size.

Persistent `settings.json`, installed AppData state/SQLite history, flexible sidecar inspection, optional thumbnail generation, Full/Lite installers/sharing packages, adaptive device calibration, editing and the public website are deferred slices. Their product requirements remain intact. No hard media-count limit or eligibility restriction is introduced.

## Clarifications

### Session 2026-10-21

- Q: Should S002 native acceptance start on Windows, or require native checks on all three product platforms? A: The owner selected "Windows first (recommended)." FR-023 and D-01 now use Windows-first native acceptance; Linux/macOS remain targets with runtime checks deferred.
- The owner excluded testing on 1,000 images. A small functional fixture is the proposed alternative for this slice; no broader testing policy or product file-count limit is inferred.

## Dependencies and readiness

S001 supplied the public contract baseline and maintenance tools. The selected native/interface direction, delivered brand contract and hidden Windows process rules constrain later implementation. Exact library pins, repository app layout, transport messages and implementation tasks belong to the subsequent technical planning phase.

No application code is authorized by this specification request. No further clarification is blocking specification completion. Technical planning follows this specification; implementation still requires owner direction on the proposed slice. The quality review is in [requirements checklist](checklists/requirements.md); current authoring checks are in [verification](verification.md). No remote, push, tag, release, site deployment or public tracking setup is included.
