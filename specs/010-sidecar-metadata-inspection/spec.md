# Feature Specification: Sidecar metadata and inspection

**Feature Branch**: `codex/010-sidecar-metadata-inspection`

**Created**: 2026-10-25

**Status**: Specified

**Input**: S010 under Spec Kit and autopilot, completing GitHub #13 and #14 end-to-end with automatic push/PR, at most two review rounds, and owner final review/merge.

## Clarifications

### Session 2026-10-25

- Q: Should a higher-priority match hide competing sidecars? A: No. Order and explain candidates, retain competing values and label ambiguous associations.
- Q: Should duplicate keys silently use the last value? A: No. Preserve ordered repeated members and identify duplicates; any alternative parser limitation must be explicit.
- Q: Which fields may become required metadata? A: None. Accepted arbitrary JSON, including scalar roots, stays inspectable without a product schema.
- Q: How should summaries travel? A: Store source-role and stable escaped field/member addresses through the existing state resolver, without absolute paths or transient grants.
- Q: Does opening information authorize a new scan or writes? A: No. Read observed candidates on demand; opening/Refresh controls reconciliation and inspection preserves source bytes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inspect attributed sidecars (Priority: P1)

A person opens a local gallery and inspects nearby JSON associated with a media item. Missing metadata never prevents viewing. The person can understand why a document was associated, see competing candidates and inspect exact unfamiliar values.

**Why this priority**: Useful, trustworthy inspection requires correct association and preserved values before display conveniences.

**Independent Test**: Open a small synthetic gallery with exact-name sidecars, ambiguous stem names, an index, malformed JSON and media without sidecars. Inspect each item and compare visible values and association explanations with the unchanged source bytes.

**Acceptance Scenarios**:

1. **Given** exact-name and stem candidates, **When** information opens, **Then** candidates show their matching basis and priority, ambiguous matches remain identified, and unrelated JSON is not attached.
2. **Given** a legacy index with existing, deleted and external-path records, **When** metadata is inspected, **Then** only demonstrably matched current gallery items receive attributed records; no entry creates a media item or authorizes another path.
3. **Given** nested unfamiliar keys, very large numbers, null, false, zero and empty values, **When** inspected, **Then** every accepted value remains distinguishable and exact, with its document and field provenance.
4. **Given** malformed, duplicate-key, oversized, unreadable or changed metadata, **When** inspected, **Then** an attributable result explains the limitation while the asset remains available.

### User Story 2 - Choose useful summary fields (Priority: P1)

A person expands nested metadata and chooses fields to include in the information summary. Choices survive reopening and can travel with deliberately selected portable presentation settings.

**Why this priority**: Turning arbitrary metadata into a useful personal information view is the second approved issue and reuses existing state precedence.

**Independent Test**: Select a nested field, save its selection to remembered and portable destinations, reopen and relocate the gallery, and verify precedence, source labels and an explicit missing-field state.

**Acceptance Scenarios**:

1. **Given** nested objects and arrays, **When** expanded with keyboard or pointer, **Then** recognized and unknown values remain reachable without replacing the media element.
2. **Given** a chosen field and an explicit settings destination, **When** saved and reloaded, **Then** stable field selection uses the existing precedence resolver and retains sibling settings and unknown stored fields.
3. **Given** filesystem, media and sidecar values disagree, **When** summary fields are displayed, **Then** each retains its source and no arbitrary sidecar value overrides a current file fact.
4. **Given** a playing video, **When** information, nested disclosure or summary choices change, **Then** the same media element and playback position remain, with visible keyboard focus and text-scale support.

### User Story 3 - Refresh and recover metadata (Priority: P2)

A person edits or replaces an external sidecar and uses Refresh. The next inspection reflects current observations, and delayed work from an earlier item or root cannot replace it.

**Why this priority**: Metadata must follow the established manual refresh and root retirement semantics.

**Independent Test**: Delay an old read, replace the sidecar, Refresh or switch roots, then release the old read. Only the current result is presented; retrying a repaired document recovers.

**Acceptance Scenarios**:

1. **Given** a changed or removed sidecar, **When** opening or explicit Refresh observes it, **Then** associated views and summaries are invalidated without a background scan.
2. **Given** delayed reads and a newer observation or retired root, **When** old work finishes, **Then** it cannot populate the current item or overwrite newer metadata.
3. **Given** a failed sidecar later repaired, **When** explicit Refresh and inspection run, **Then** the result recovers and all original media and sidecar bytes remain unchanged.

### Edge Cases

- Stem collisions across media extensions; multiple naming conventions; native case differences; non-Unicode native filenames; duplicate object keys and invalid Unicode/encoding.
- Scalar/array document roots, escaped field names, empty keys, huge exponents and integers, deep/broad nesting, partial writes and resource limits.
- Index records nested in directories or arrays, duplicate/stale entries, original versus stored filenames, path separators, absolute/traversing references and links.
- Missing field versus null, false, zero, empty string/object/array; source conflicts and persisted fields absent in a different gallery.
- Sidecar/root replacement during reading, link substitution, permissions, cancellation, Close, incomplete discovery and late completion.
- Multiple settings layers, invalid/future settings documents, concurrent revisions and portable relocation; active-looking markup rendered as text.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Associate metadata through documented exact-name, stem and explicit index/reference rules, with explainable priority and visible ambiguity. Native filesystem case/identity semantics govern matching. Proximity alone is insufficient.
- **FR-002**: Support gentle legacy index inspection with source-neutral examples. Stored names may match current observations but never create items, follow arbitrary paths or expand root access. Preserve competing matching records and stale-entry explanations.
- **FR-003**: Preserve all accepted recognized and unknown nested JSON values, exact number text, member names and source attribution. Distinguish missing, null, false, zero and empty values. Define duplicate-key and encoding behavior explicitly without silently dropping values.
- **FR-004**: Apply explicit finite read, nesting, parsing, association and display budgets. Malformed, oversized, unreadable, ambiguous or concurrently changed documents produce attributable item-scoped results; media stays browsable. No source repair or write occurs during inspection.
- **FR-005**: Reconcile candidate observations on opening and explicit Refresh; invalidate associated views and summaries. Demand-driven reads verify observed resource identity and reject replacements without starting a directory scan. Old item/root/read results cannot supersede current state.
- **FR-006**: Provide expandable nested information and visible document/association/field provenance, keeping every accepted value reachable within declared resource bounds. Render active-looking content solely as data.
- **FR-007**: Allow selecting and removing summary fields with stable source and field semantics, preserving choices through temporary, remembered, user and portable destinations already supported by the state resolver. No sender absolute paths or transient grants are persisted.
- **FR-008**: Show selected fields that are absent with an explicit missing result, and retain separately attributed conflicting file/media/sidecar facts. Formatting cannot change source values or imply unsupported interpretation.
- **FR-009**: Preserve collapsed-default information disclosure, persistent disclosure settings, current media element and playback time, keyboard navigation/focus, text scaling and compact controls.
- **FR-010**: Keep media-card work bounded, sidecar reads demand-driven and native control responsive. Metadata inspection must not reintroduce automatic directory polling or wait for settings I/O under discovery authority.
- **FR-011**: Update authoritative metadata, state and interface documentation plus application-owned schema/examples, without constraining external JSON to an application schema. Keep version 0.0.0 and unreleased-package claims accurate.
- **FR-012**: Demonstrate association, exact transport, limits, identity confinement, stale-result rejection, persistence and rendered playback continuity with small source-neutral fixtures and unchanged input hashes. Deliver all applicable repository/site/product qualification and resolve review findings within the two-round cap before owner handoff.

### Key Entities *(include if feature involves data)*

- **Candidate observation**: A directly observed local JSON resource with identity and an explainable relationship to a current media observation.
- **Metadata result**: An attributed document or index record, association basis, exact navigable values and a successful or exceptional state.
- **Summary field choice**: A relocatable source selector and stable field address, resolved through existing presentation state precedence.
- **Inspection request**: A root/item/observation-bound demand whose completion is usable only while its authority remains current.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every accepted value in the synthetic exactness corpus is inspectable with correct provenance, including large numeric tokens and all missing/empty distinctions; zero source bytes change.
- **SC-002**: The association corpus produces zero unexplained or cross-root matches, preserves all competing exact candidates and identifies every elected ambiguity/stale case.
- **SC-003**: Reopen and relocation scenarios retain selected fields and existing presentation choices at each elected destination; invalid/future-state and conflict cases preserve original bytes.
- **SC-004**: Every delayed-read, replacement and refresh/root-switch scenario rejects obsolete results and recovers through explicit retry, without hiding usable media.
- **SC-005**: Rendered keyboard/text-scale and video scenarios retain the same media element and playback progress while metadata disclosure and selected fields change. All elected checks terminate successfully with attributable source identity and separate preparation/qualification/combined timing.

## Assumptions

- S008 state and S009 discovery/root grants are the baseline. Existing native Windows acceptance remains distinct from untested native platforms and physical storage environments.
- This slice includes inspection and summary choices. Media editing, automatic directory watchers, thumbnail generation, extra sort/filter criteria, platform packaging and release publication remain separate issues.
- Autopilot settles reversible association, parser/transport and presentation details against current contracts and records alternatives in plan/research. Push and PR are explicitly authorized; final merge remains owner-operated.
