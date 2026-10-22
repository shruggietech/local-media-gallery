# Feature Specification: Global font size

**Feature Branch**: local `main` (S004)

**Created**: 2026-10-22

**Status**: Specified local enhancement

**Input**: Add a setting to reduce global font size; the current size remains the default.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retain a smaller interface font (Priority: P1)

As a user I can reduce application text from View settings and keep that choice when I reopen the application.

**Why this priority**: The owner needs less prominent interface text without changing the current first-use appearance.

**Independent Test**: Open Settings, select Small or Smaller, observe smaller gallery and viewer text, restart and verify restoration; return to Default to restore the previous size.

**Acceptance Scenarios**:

1. **Given** first use or an existing preference file without this field, **When** the app opens, **Then** text retains its current size and existing preferences remain intact.
2. **Given** the gallery, **When** Small90% or Smaller80% is selected, **Then** application text including toolbar, controls, labels, filenames, information and viewer text resizes immediately and the choice is saved.
3. **Given** a saved reduction, **When** the app restarts, **Then** it restores that reduction; choosing Default100% restores the original size.
4. **Given** reduced text, **When** an asset opens, **Then** media content remains uncropped and card widths,12px gaps, control minimum hit areas and root display scale remain unchanged.

### Edge Cases

- Missing field defaults to100 without writing on load; existing settings, unknown fields and unrelated choices remain intact.
- Invalid stored values retain existing non-destructive fallback/warning behavior. Invalid saves never replace a valid file.
- Save failure keeps the active in-memory size usable and displays the existing warning.
- Text-dependent caption height may shrink; masonry remeasures it. OS dialogs and native media-control styling remain platform-owned.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Offer a labelled Global font size setting with Default100%, Small90%, Smaller80%; current first-use appearance is100%.
- **FR-002**: Apply the chosen factor immediately to all application text, including portaled viewer content, while preserving typography families and browser/OS text scaling.
- **FR-003**: Persist the setting in the existing per-user settings file and restore it on restart; missing field means100% without invalidating or rewriting an older file on load.
- **FR-004**: Validate the three supported values; preserve malformed/unsupported state and existing conflict/failure behavior.
- **FR-005**: Do not scale media, root rem dimensions, card width/gaps or control hit areas with this preference; text-dependent layout can reflow naturally without clipping.
- **FR-006**: Update official preference documentation, owned schema and changelog; keep all changes local and retain small-fixture Windows verification.

### Key Entities *(include if feature involves data)*

- **Font scale**: Global user preference80|90|100, default100; an additive optional-on-read setting in the current format.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Native computed application font sizes follow the selected factor relative to100%, including labels, controls, captions and viewer information.
- **SC-002**: Native restart restores80%; Default restores the100% baseline. Legacy settings load at100% without losing existing choices or changing bytes on load.
- **SC-003**: Root font size, media/card widths,12px card gaps and configured control minimums stay unchanged between font choices.
- **SC-004**: Repository, settings/schema, documentation, brand and Windows native checks pass without bulk-media testing or publication.

## Assumptions

The three discrete presets are a reversible implementation default. This is text sizing, not application zoom. Native operating-system dialogs and built-in media controls retain their platform styling. No framework, installation, release-version or portable configuration change is needed.
