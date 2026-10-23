# Feature Specification: Website experience overhaul

**Feature Branch**: `codex/007-website-experience`

**Created**: 2026-10-23

**Status**: Implementing after consistency gate

**Input**: S007 completes epic #36 and #37–#45 under autopilot. The owner selected Next.js, Fumadocs and Shiki and authorized automatic push/PR, CI/review handling with at most two rounds, and handoff before final merge.

## User Scenarios & Testing

### User Story 1 - Understand the gallery (Priority: P1)

A visitor sees a composed product introduction, a tangible gallery illustration and useful next actions without mistaking development work for a published installable product.

**Why this priority**: The main landing page must explain the product and demonstrate the quality promised by its identity.

**Independent Test**: Inspect the landing at mobile, tablet and desktop sizes and follow its documentation/source actions.

**Acceptance Scenarios**:

1. **Given** no published package, **When** a visitor opens home, **Then** a clear hero, explicitly illustrative gallery preview, short directory-to-gallery explanation, edition context and useful footer appear with truthful availability and working documentation/source actions.
2. **Given** a narrow viewport or enlarged text, **When** the visitor reads the page, **Then** the composition reflows without page overflow, hidden actions or tiny preview labels.
3. **Given** a selected theme or reduced-motion preference, **When** the visitor returns, **Then** supported theme preference persists and useful content remains apparent without decorative motion.
4. **Given** disabled JavaScript or unavailable imagery/fonts, **When** home is read, **Then** its product explanation, navigation and meaningful visual alternatives remain available.

### User Story 2 - Read and navigate retained documentation (Priority: P1)

A reader selects a version, searches its chapters and reads long pages with stable chapter context and a pinned active page contents list.

**Why this priority**: A documentation framework is useful only when its rendered navigation and content fidelity improve the actual reading task.

**Independent Test**: Open a long chapter, use keyboard and contents links, scroll to the final section, return through history, search and switch a topic across two snapshot fixtures.

**Acceptance Scenarios**:

1. **Given** a long page, **When** the reader scrolls, **Then** desktop navigation remains available, the current section is identified beyond color, its contents entry remains visible, and focus/history are not changed by manual scrolling.
2. **Given** a fragment URL, **When** it is opened, refreshed or reached through history, **Then** its heading is visible below chrome and real anchor behavior is preserved.
3. **Given** mobile or high zoom, **When** chapter/contents navigation is needed, **Then** an accessible compact alternative avoids burying the article beneath a long list.
4. **Given** two snapshots with different topic sets, **When** a reader changes version or searches, **Then** topic preservation, explicit missing-topic fallback and result version context remain correct.
5. **Given** raw source and retained schema/changelog references, **When** they are read, **Then** all authored content, examples, fragments and intended version relationships survive rendering.

### User Story 3 - Learn from examples and diagrams (Priority: P1)

A reader can understand and copy code, inspect readable relationship diagrams and identify links in every supported theme.

**Why this priority**: Examples and diagrams are core technical content, not decorative renderer-presence checks.

**Independent Test**: Read/copy JSON and language fixtures, inspect every diagram, change themes, and repeat with disabled JavaScript.

**Acceptance Scenarios**:

1. **Given** highlighted code, **When** it is copied, **Then** exact source bytes/whitespace are copied without line numbers/toolbars and success or failure is communicated accessibly.
2. **Given** a long/unknown-language example, **When** it is read, **Then** escaped plaintext remains useful and local overflow does not expand the whole page.
3. **Given** a meaningful diagram, **When** it is encountered visually or through assistive semantics, **Then** its labels/arrows are legible and a distinct title plus relationship description is available.
4. **Given** theme/navigation changes or unavailable scripting, **When** diagrams/examples are read, **Then** stable content and useful source/explanatory alternatives remain present.
5. **Given** a multiline prose link, **When** hovered, focused or used with reduced motion/forced colors, **Then** its underline and focus remain unambiguous with no layout shift or hover-only dependency.

### User Story 4 - Recognize and discover the official site (Priority: P1)

A visitor sees the correct branded icon and useful shared-link information; retained documentation has coherent version-aware discovery metadata.

**Why this priority**: Site identity, accurate status and route metadata must agree with visible public content.

**Independent Test**: Inspect exported/live head tags, icon/social resources, sitemap and canonical inventory for landing, explicit-version and alias routes.

**Acceptance Scenarios**:

1. **Given** an indexable route, **When** its metadata is inspected, **Then** it has an accurate title/description, canonical HTTPS URL and appropriate branded social presentation.
2. **Given** duplicate aliases and distinct historical versions, **When** discovery metadata is generated, **Then** duplicates consistently identify their authoritative equivalent without flattening distinct versions into latest.
3. **Given** a favicon/social target, **When** requested, **Then** its real type/dimensions and approved identity match the declaration.
4. **Given** the public docs entry, **When** read, **Then** one concise statement identifies an unreleased specification baseline while accurately acknowledging the live website and unavailable installable packages.

### User Story 5 - Verify and publish the actual experience (Priority: P1)

A maintainer can compare the real design against reference compositions and publish exactly the output that passed functional, accessibility, performance and integrity checks.

**Independent Test**: Run qualification, inspect screenshots/measurements and verify the deployed inventory after all hosted checks pass.

**Acceptance Scenarios**:

1. **Given** a site change, **When** qualification runs, **Then** meaningful rendered navigation/copy/diagram/metadata assertions and representative screenshots accompany source/link/version/brand/byte checks.
2. **Given** performance measurements, **When** evidence is reported, **Then** reproducible lab conditions and budgets are distinguished from unavailable field samples.
3. **Given** an official PR, **When** actual review feedback arrives, **Then** every finding is answered and resolved with no more than two rounds, and final owner review/merge is the stopping boundary.

### Edge Cases

- Duplicate headings, short/long TOCs, rapid route changes, final-section activation and nested/local scrolling.
- Theme/storage unavailability, delayed fonts, reduced motion, forced colors, keyboard-only use, 200% text sizing and 320 CSS-pixel reflow.
- Code containing Unicode, HTML-like text, unknown languages, long lines and clipboard rejection.
- Diagram syntax errors, disabled JavaScript, repeated SVG identifiers and changing font metrics.
- Missing historical topics/assets, failed search indexes, aliases, 404 and unpublished package metadata.
- Changed deployment identity or stale checked artifacts; no success is claimed for an earlier revision.
- The site has no accounts or tenant data; existing source-escaping, asset confinement and artifact-integrity tests remain mandatory.

## Requirements

### Functional Requirements

- **FR-001**: Preserve every canonical retained source, topic/version route, heading ID, raw source, schema/example, changelog and captured reference; preserve safe source-as-data semantics and version-scoped search/fallback. (#37)
- **FR-002**: Provide the independent branded landing composition and clearly labeled gallery illustration, coherent workflow/edition explanation and verified-release-driven actions. (#38)
- **FR-003**: Use delivered identity, approved message roles, exact local font roles/weights and semantic theme/layout/motion vocabulary; governed bytes remain synchronized through the existing updater. (#38/#42)
- **FR-004**: Support system, light and dark reading preference with accessible controls, persistence where available, readable fallback and consistent identity/diagram/code colors. (#42)
- **FR-005**: Provide pinned chapter navigation and hierarchical active page TOC with bounded overflow, polished reduced-motion-aware indicators, real fragment/history semantics and usable compact navigation. (#39)
- **FR-006**: Keep one owner for root scrolling/chrome/insets; focused items and anchor targets remain visible without scroll hijacking, focus theft or manual-scroll history spam. (#39)
- **FR-007**: Present readable build-highlighted examples with language labels, accessible exact-source copy feedback and useful no-script/unknown-language/long-line behavior. (#40)
- **FR-008**: Present every corpus diagram with legible themed relationships, distinct accessible title/description, stable IDs/layout and useful explanation/source when scripting or rendering is unavailable. (#41)
- **FR-009**: Provide visible branded multiline underlines and deliberate hover/focus states; motion never supplies the sole affordance, changes text geometry or excludes keyboard/touch/reduced-motion/forced-color users. (#42)
- **FR-010**: Supply accurate per-route title/description/canonical/social metadata, approved favicon/social assets, coherent robots/sitemap/version-alias policy and truthful structured data without fictional availability/ratings. (#43)
- **FR-011**: Correct current-status assertions in the public index/aliases and related pages while preserving historical product meaning, source equality and concise baseline labeling. (#45)
- **FR-012**: Qualify representative landing, long prose, code, every diagram, schema, changelog, search, aliases and 404 at mobile/tablet/desktop widths in both themes, including keyboard, zoom, motion, contrast and metadata-resource checks. (#44)
- **FR-013**: Retain before/after design screenshots and explicit comparison with inspected sibling composition; measure lab performance and declared asset/runtime budgets without claiming field outcomes from synthetic checks. (#44)
- **FR-014**: Publish the exact qualified static output through existing serialized, all-check-gated hosting and verify actual live DNS/HTTPS/identity/bytes/rendered behavior. No request-time service is introduced. (#36/#37)
- **FR-015**: Complete all nine child outcomes, update tracking, push/open the official PR automatically, satisfy CI and every actual review within at most two rounds, and hand off before merge. (#36)

### Key Entities

- **Snapshot**: release/specification version, ordered topics, owned sources/references/schema and status.
- **Reading page**: stable route/title/headings/contents/raw source, selected snapshot and search context.
- **Example**: source text, declared language, rendered tokens and exact-copy payload.
- **Diagram**: relationship source, distinct accessible title/description, theme representations and safe unique identity.
- **Public route**: canonical path/indexing policy, metadata and verified icon/social references.
- **Qualification record**: revision/source/artifact identity, test scopes, terminal times, screenshots and measurements.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every retained route/source/link/fragment/schema example passes the existing completeness and integrity checks, including a two-snapshot missing-topic fixture.
- **SC-002**: The landing visibly includes one clear hero, a meaningful labeled gallery preview, useful actions, workflow/edition context and footer at 390/768/1440 widths in both themes; no unavailable download is advertised.
- **SC-003**: All long-page TOC targets, active/last-section behavior, direct fragments/history and compact navigation pass actual interaction/geometry checks with no hidden focused control.
- **SC-004**: Exact-copy and no-script highlighting pass representative code fixtures; every current diagram passes accessible-description and visual-legibility checks in both themes and aliases.
- **SC-005**: The representative matrix meets applicable AA contrast, keyboard/focus, 200% text resize and 320 CSS-pixel reflow checks, with automated and directed-review evidence and stated coverage limits.
- **SC-006**: Every indexable output has coherent metadata/canonical inventory; every declared icon/social target resolves with matching dimensions/type; sitemap excludes duplicate/error/internal routes.
- **SC-007**: Reproducible lab measurements stay within baseline-derived runtime/asset budgets defined before implementation; field targets remain p75 LCP <=2.5s, INP <=200ms and CLS <=0.1, without inventing missing field samples.
- **SC-008**: Full qualification meets the existing 660-second target/900-second hard limit after verified readiness, retaining separate preparation/qualification/combined accounting and fifteen-second finalization reserve.
- **SC-009**: Final-head hosted checks and deployment pass, live static bytes match the checked artifact, actual review threads are resolved within the two-round cap, and the PR remains open for the owner.

## Assumptions

- The owner has approved Next.js/Fumadocs/Shiki and all of #36. No new framework decision question is needed.
- Static Pages hosting, official apex, canonical Markdown and governed kit remain the baseline; no product release or DNS change is needed.
- A labeled illustration is suitable for the development product preview; published product screenshots/downloads are not fabricated.
- The approved corpus and owned regression fixtures suffice; no user/private media is published.
- Default theme follows the system unless a stored explicit preference exists.
- Public testing may use the existing explicitly scoped temporary PR bootstrap mechanism for exact-artifact live acceptance before owner merge, then remove it during post-merge housekeeping.

## Clarifications

### Session 2026-10-23

- Q: Which website stack is selected? A: The owner explicitly selected Next.js/Fumadocs/Shiki; retain the canonical Markdown adapter without introducing duplicate authored content.
- Q: Should the development product preview imply a release? A: Use a clearly labeled illustration and truthful documentation/source actions until a verified release record exists.
- Q: Which themes and scrolling behavior should ship? A: System/light/dark with remembered explicit preference, native scrolling and short anchor/active-marker motion with immediate reduced-motion behavior.
- Q: Must static diagrams depend on reader scripting? A: Prefer immediate statically generated accessible diagrams when build costs fit existing preparation, with source and explanatory fallback.
- Q: How is quality completion demonstrated? A: Measured browser interaction/contrast/metadata/performance checks, directed visual/keyboard review and exact live artifact acceptance; field data remains separately identified.
