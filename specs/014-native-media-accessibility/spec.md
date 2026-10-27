# Feature Specification: S014 Native Media and Accessibility Qualification

**Feature Branch**: `codex/014-native-media-accessibility`

**Created**: 2026-10-27

**Status**: Clarified

**Input**: Complete issues #18 and #19 end-to-end under Spec Kit/autopilot, automatically publish a PR, handle CI and at most two review rounds, then return for owner review and merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Know what local media actually works (Priority: P1)

A recipient can learn which image/video formats and media behaviors were actually observed on their native runtime, then open and control representative media without relying on thumbnails or extension recognition as proof of decoding.

**Why this priority**: Native behavior differs across supported systems and determines useful support/package guidance.

**Independent Test**: Open a small identified mixed-media gallery in each elected native runtime and compare real displayed/decoded results and control behavior with the fixture expectations and recorded support rows.

**Acceptance Scenarios**:

1. **Given** identified normal and qualification artifacts from one source, **When** image fixtures are opened, **Then** dimensions, orientation and color-policy observations are attributable to that runtime and fixture.
2. **Given** a supported clip with known changing frames and audio, **When** the user plays, pauses and seeks, **Then** observed frames/time/audio behavior and partial source reads establish each claimed capability separately.
3. **Given** damaged or unsupported media, **When** it is selected, **Then** it remains discoverable and inspectable with useful failure/capability information and unaffected items remain usable.

### User Story 2 - Browse through keyboard and accessible controls (Priority: P1)

A recipient can navigate, open and close media, change pages, inspect information and control playback using named controls and visible focus, including their representative assistive technology.

**Why this priority**: These are existing interaction contracts rather than optional new features.

**Independent Test**: Exercise the actual rendered gallery through keyboard and the elected native accessibility/assistive stack, recording exposed names/states, focus destinations and any concrete findings.

**Acceptance Scenarios**:

1. **Given** a gallery spanning pages, **When** keyboard navigation opens/closes a viewer or crosses a page boundary, **Then** the destination is meaningful, visible and named, and current selection/playback is not expressed only by color.
2. **Given** preparation/diagnostic controls and dialogs, **When** the recipient inspects or cancels work, **Then** controls and state are reachable and understandable without pointer-only or hover-only interaction.
3. **Given** an elected assistive stack, **When** names, state and focused content are inspected, **Then** the report identifies the actual technology and observations without substituting source markup for native evidence.

### User Story 3 - Keep content usable across presentation needs (Priority: P2)

A recipient retains readable controls and dominant media with narrow windows, enlarged text/display scaling, reduced motion and fine/coarse input conditions.

**Why this priority**: Native presentation must preserve existing compact controls while supporting accessible interaction.

**Independent Test**: Run rendered geometry, focus, contrast and motion checks with explicitly recorded window/scale/theme/input conditions.

**Acceptance Scenarios**:

1. **Given** fine-pointer desktop defaults, **When** ordinary browsing is displayed, **Then** compact controls and media-first geometry remain intact.
2. **Given** narrow/enlarged/coarse or mixed input conditions, **When** all essential controls and dialogs are used, **Then** controls remain reachable, content is not clipped and elected target sizes are met.
3. **Given** reduced motion and both governed themes, **When** scrolling/status/focus changes occur, **Then** decorative motion respects the preference and information/focus remains distinguishable with adequate contrast.

### User Story 4 - Trust the reported qualification (Priority: P2)

A maintainer receives bounded, repeatable evidence identifying exact source/artifacts, fixtures, host/runtime, elected capabilities, terminal outcomes and remaining untested combinations.

**Why this priority**: Package/support documentation needs observed evidence rather than inferred cross-platform support.

**Independent Test**: Check complete source-bound receipts and deliberately missing/mismatched/failed observations; an unavailable environment cannot become a pass.

**Acceptance Scenarios**:

1. **Given** the elected Windows, Linux and macOS native targets, **When** qualification completes, **Then** each has its own media and interaction observations, with explicit accessibility, audio, color and display limits.
2. **Given** absent native facilities or a failed check, **When** the report is assembled, **Then** the outcome remains failed/unavailable with a concrete reason and cannot inherit another runtime's result.
3. **Given** a final PR, **When** handoff occurs, **Then** applicable CI is green, every review finding is addressed within at most two rounds, and the owner retains final merge authority.

### Edge Cases

- A recognized extension contains damaged or unsupported data, or a browser capability hint disagrees with real decoding.
- Orientation changes geometry; embedded color metadata differs from an unmanaged cached preview; alpha/animation/frame selection differs by runtime.
- A video loads metadata but fails frame decoding, audio or a seek; an available audio graph does not establish physical speaker audibility.
- A window/display/assistive stack is absent, inaccessible or virtualized; absent observations remain distinguishable from successful checks.
- Root/page/viewer changes retire media while callbacks or accessibility announcements remain pending.
- Focus is inside a scrolling dialog or off-page item; enlarged text, coarse input and reduced motion alter presentation.
- Qualification artifacts or fixtures are changed, reports are stale, hooks leak into normal builds, or terminal checks finish after the deadline.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Qualification MUST identify exact source, artifact, fixture, edition, OS, architecture, webview/media runtime and elected display/assistive conditions for every claimed observation.
- **FR-002**: Each elected Windows x86_64, Ubuntu 24.04 x86_64 and macOS 15 arm64 native runtime MUST exercise actual rendered media and interaction; compile/CLI-only results cannot satisfy rendered acceptance.
- **FR-003**: Image checks MUST cover the elected representative formats, intrinsic dimensions, all embedded orientation transforms, color-policy behavior and damaged/unsupported cases using known small fixtures.
- **FR-004**: Video checks MUST independently observe decoded changing frames, user-initiated play/pause/seek, source partial reads and elected audio behavior. Metadata/capability hints alone MUST NOT be called successful playback.
- **FR-005**: Original viewing MUST remain available without thumbnails. Qualified thumbnail observations MUST remain distinct from original orientation/color/decoder evidence.
- **FR-006**: Unsupported/damaged media MUST stay represented and inspectable with useful capability/failure information, while unaffected media remains usable.
- **FR-007**: Qualification MUST preserve bounded admission, source retirement, explicit playback and byte-identical originals/sidecars; normal browsing MUST NOT gain autoplay or editing.
- **FR-008**: Rendered checks MUST exercise named controls, keyboard-only navigation, visible focus, viewer/dialog open/close, cross-page destinations and non-color state communication.
- **FR-009**: Accessibility evidence MUST inspect actual native accessibility/assistive behavior with exact technology/version and observed names/states/focus, keeping accessibility-tree, speech and physical input claims distinct.
- **FR-010**: Checks MUST cover rendered contrast, both themes, enlarged text, narrow windows, elected display-scale conditions and reduced motion, correcting proportional findings.
- **FR-011**: Fine-pointer defaults MUST retain the existing compact media-first layout; coarse/mixed targets MUST meet the existing minimum 44 logical-pixel policy without applying oversized controls to all desktop users.
- **FR-012**: Actually tested screen-reader, physical/virtual touch, display-scale, audio/output and runtime combinations MUST be recorded explicitly; untested combinations MUST NOT acquire inherited support claims.
- **FR-013**: Native qualification MUST be repeatable, finite, cancellable where relevant and independently bound to the final source and artifact. Instrumentation MUST NOT grant normal recipient artifacts test commands or listeners.
- **FR-014**: Public media/support/accessibility/thumbnail guidance and owned contracts MUST reflect demonstrated behavior, known limits and recovery, with numbered implementation receipts confined to internal planning.
- **FR-015**: Meaningful regressions MUST reproduce findings before their fixes. Existing functional, integrity, provenance, brand and elected checks MUST remain mandatory.
- **FR-016**: The final source MUST pass complete applicable local/hosted qualification with separate preparation, qualification and combined timing, the 660-second target, 900-second hard limit, terminal timestamps and 15-second finalization reserve.
- **FR-017**: Delivery MUST publish the authorized official PR closing #18/#19, address every review finding within at most two rounds, verify exact-final-head CI and stop for owner final review/merge.

### Key Entities

- **Qualification target**: Identified native OS/architecture/runtime/display/assistive combination and elected checks.
- **Media fixture**: Small source-neutral content with exact hash, format/codec, dimensions/orientation/color/audio/frame expectations and original-byte inventory.
- **Observation**: Named operation, measured actual outcome, terminal identity/time, evidence type and explicit limits.
- **Qualification receipt**: Source/artifact/environment-bound collection of terminal observations, timings, integrity results and limitations.
- **Support row**: Public description derived from actual elected observations, including unsupported and untested combinations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All three elected native runtime families produce attributable rendered media and interaction results; no row is accepted from compilation or another system's result.
- **SC-002**: Every elected media format has an observed supported/unsupported result, with orientation/color/audio/seek limits recorded independently.
- **SC-003**: Every essential keyboard/viewer/dialog journey passes; proportional accessibility findings are corrected with reproducible regressions.
- **SC-004**: All elected presentation conditions retain reachable controls, visible focus, legible content and byte-identical original media/sidecars.
- **SC-005**: Every accepted receipt matches the final source/artifacts and mandatory terminal outcomes; missing, stale, unavailable or failed observations cannot count as passed.
- **SC-006**: The official PR has green applicable final-head CI and no unresolved review findings after at most two review rounds, ready for owner merge.

## Assumptions

- The merged S013 gallery, native core, existing Windows acceptance, cache/diagnostic contracts and three-OS CLI proofs are baselines to preserve.
- The three elected proof architectures define this campaign. Retained unbuilt architectures/older OS versions remain explicitly unqualified rather than silently removed from product intent.
- Fixtures are synthetic and small; qualification does not claim broad codec coverage, physical display colorimetry, physical speaker audibility or physical touch from virtual observations.
- Representative native assistive evidence is elected during planning and must remain explicit about whether a screen reader, native accessibility client, speech output or physical device was actually exercised.
- Platform installers/upgrades/releases and optional new browsing/editing decisions remain in their existing issues. No attended owner walkthrough is introduced as an acceptance gate.

## Clarifications

### Session 2026-10-27

Autopilot decisions are derived from the issue acceptance and constitution.

- Q: Which native targets must produce rendered observations? → A: The three existing elected targets, Windows x86_64, Ubuntu 24.04 x86_64 and macOS 15 arm64. Their own WebViews must execute the scenarios; an external Chromium or CLI surrogate is insufficient.
- Q: Does a format have to decode everywhere to pass qualification? → A: No. Qualification establishes observed supported/unsupported behavior and useful retained-item recovery; a test infrastructure failure cannot be relabelled as unsupported media.
- Q: What do audio/color observations establish? → A: Identified decoded/rendered signals and embedded-profile behavior under the elected native runtime, with separate limits for physical audibility, display colorimetry and unmanaged thumbnails.
- Q: How is assistive evidence reported? → A: Exercise the actual native accessibility/assistive client on each elected runtime and identify the actual screen-reader/speech/device coverage separately. Source markup alone does not qualify native exposure.
- Q: What happens if a native environment or elected check is unavailable? → A: Preserve a failed/unavailable result, investigate and provision its automated prerequisites. Do not count an absent observation as a pass or silently replace the three-target acceptance with a narrower slice.

### Owner steering: active workstation focus

The owner prohibits taking control of the workstation focus. All remaining focus-changing gallery/keyboard/screen-reader acceptance must execute on isolated CI desktops; local work is limited to builds and headless checks. This changes where native checks run, not the elected three-runtime acceptance or review/publication scope.
