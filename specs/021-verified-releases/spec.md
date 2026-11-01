# Feature Specification: Verified releases and versioned documentation

**Feature Branch**: codex/s021-verified-releases

**Created**: 2026-10-31

**Status**: Specified

**Input**: S021, complete #26 and #31 end-to-end with Spec Kit/autopilot, automatically push and open the official PR, handle CI and at most two review rounds, then stop for owner final review and merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Assemble an identified release (Priority: P1)

As a maintainer, I can assemble a release from exact qualified Full/Lite artifacts without rebuilding accepted bytes or confusing a candidate with a published product.

**Why this priority**: Native package campaigns exist, but consumers lack one verifiable release/artifact identity.

**Independent Test**: Assemble every elected package row from identified qualification inputs, retain supporting update metadata/notices and reject changed, missing, wrongly versioned or unqualified input.

**Acceptance Scenarios**:

1. **Given** complete qualified inputs, **When** a release is assembled, **Then** one record binds software/source, editions/targets/packages/prerequisites, exact artifact bytes and documentation/schema identity.
2. **Given** missing files, changed bytes/modes, wrong source/version or incomplete qualification, **When** assembly is requested, **Then** it refuses and no public record or download advances.
3. **Given** unchanged accepted inputs, **When** assembly is repeated, **Then** identical identities/bytes remain without rebuilding or overwriting unrelated output.

### User Story 2 - Retain and qualify complete documentation (Priority: P1)

As a reader, I can select complete documentation for each released version even after renderer changes, with matching schemas, examples and download identities.

**Why this priority**: A release is incomplete when its documentation is missing or latest aliases imply an unpublished product.

**Independent Test**: Retain two small version snapshots with different topics/schemas, compile both through the current renderer, and exercise version selection, scoped search, assets/fragments, historical meaning and release matching.

**Acceptance Scenarios**:

1. **Given** a new release and older snapshots, **When** documentation is captured/qualified, **Then** complete sources/navigation/assets/schema references are retained, version-aligned and checked together.
2. **Given** a topic absent from another version or a changed renderer, **When** versions are switched, **Then** topic preservation or explicit missing-topic fallback remains correct without changing historical meaning silently.
3. **Given** missing/mismatched documentation, schemas/examples/artifacts or required glossary review, **When** publication or canonical-record promotion is requested, **Then** its mandatory documentation gate refuses before promotion.

### User Story 3 - Publish and promote observed complete releases (Priority: P1)

As a maintainer, I can stage, resume and verify publication; readers receive new latest/download pointers only after matching artifacts are actually published and checked.

**Why this priority**: A completed upload or successful request does not establish a complete published release.

**Independent Test**: Exercise publication against a controlled service fixture with partial uploads, lost acknowledgements, foreign/conflicting assets, failed publication and successful byte readback. Only verified complete publication can promote canonical records and website pointers.

**Acceptance Scenarios**:

1. **Given** accepted artifacts and matching complete documentation qualification, **When** publication is explicitly executed, **Then** exact staged bytes are uploaded idempotently and actual published identity/bytes are read back before canonical records or public pointers advance.
2. **Given** partial/failed publication, uncertain acknowledgement or conflicting remote content, **When** publication resumes, **Then** observation determines repeatable completion or specific refusal; unrelated/published mismatched bytes and previous pointers remain untouched.
3. **Given** candidates, absent publication or stale qualification, **When** ordinary website/download consumers run, **Then** no candidate becomes a published current download and no product release is fabricated from the specification baseline.

### Edge Cases

- Wrong repository/tag/source/version/target, duplicate/unsafe paths, changed archives/inventories, missing notices/update descriptors and unsupported architecture claims.
- Partial uploads, same-name foreign bytes, conflicting published tags, lost mutation acknowledgement, mismatched qualification and concurrent pointer edits.
- Missing snapshot/topic/asset/fragment, escaping search/version scope, mismatched schema/example, renderer upgrades and dated archive corrections.
- Ordinary vocabulary review versus a major release's complete terminology/definition/primary-reference/local-usage refresh.
- Publication succeeds but pointer promotion fails: retain observed publication and prior pointers, allowing verified retry without rebuilding accepted packages.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Assembly MUST bind exact qualified source/revision, software version, edition, OS/architecture, package/prerequisite identities, artifact filenames/bytes/hashes/URLs, optional-tool identity and verification results in one canonical release contract.
- **FR-002**: Assembly MUST reuse accepted package bytes and verify complete inventories, executable modes/bundle closure, notices, native dependencies and supporting update metadata before upload. Missing, changed or mixed-source/version inputs MUST refuse.
- **FR-003**: Preserve existing elected Windows x86_64, Ubuntu24.04 x86_64 and macOS15 arm64 Full/Lite packaging and native scope evidence; unbuilt targets MUST not inherit support claims.
- **FR-004**: Release states MUST distinguish assembled candidate, staged draft and independently verified publication. Ordinary current-download consumers MUST reject absent, candidate, mismatched or merely uploaded records.
- **FR-005**: Each release MUST retain a complete documentation/navigation/assets/schema snapshot bound to software version/source, preserving older snapshots and historical meanings.
- **FR-006**: New and every retained snapshot MUST compile through the existing renderer, checking routes/navigation, local links/fragments/assets, topic-preserving selection and explicit missing-topic fallback, scoped search, schemas/examples and exact release/download identity.
- **FR-007**: Complete matching documentation qualification MUST gate both product publication and canonical published-record/pointer promotion. Another source/version/renderer/snapshot/artifact set MUST not authorize either operation.
- **FR-008**: Latest documentation and landing downloads MUST advance only after actual matching publication and independent readback. Candidate/failure runs and conflicting concurrent pointer edits MUST preserve previous public pointers.
- **FR-009**: Software/documentation/master schema release versions MUST align. Renderer adapters MUST preserve historical meaning; material archive corrections MUST have dated records and changelog entries.
- **FR-010**: Every release MUST record vocabulary/glossary review; major releases MUST require complete terminology, definitions, external primary references and local usage review. Short release notes MUST explain applicable breaking/migration changes and end with the master changelog link.
- **FR-011**: GitHub Release publication MUST stage/resume idempotently, verify remote identity and uploaded/downloaded bytes and refuse conflicting foreign assets without overwriting unrelated or published content.
- **FR-012**: Uncertain mutation results MUST remain uncertain until reconciled by remote observation. Partial upload, wrong identity/hash/version, absent docs and failed publication/promotion MUST have tested terminal outcomes and retained useful diagnostics.
- **FR-013**: Binaries MUST stay in Releases rather than Pages. Website deployment MUST preserve exact-artifact publication and unreleased baseline behavior.
- **FR-014**: Preserve permanent no-project-signing/no-notarization policy, governed brand bytes, local viewing/state/update behavior and distinctions between runtime proof fixtures and ordinary packages. No preview/editing/sharing implementation is elected.
- **FR-015**: Run repository/tests and affected product/site checks, retain exact-source/native/artifact readback and660/900/15-second accounting. Local work MUST stay headless; GUI/input belongs on isolated hosted desktops.
- **FR-016**: Complete Spec Kit analysis/convergence, issue/project tracking, automatic push/official PR and all findings within at most two review rounds. Stop for owner final review/merge. Deliver tooling/qualification without inventing a shipped v0.0.0 release.

### Key Entities

- **Release candidate**: immutable software/source identity, qualified artifacts and complete supporting delivery material.
- **Documentation snapshot**: complete retained versioned source/navigation/assets/schema/examples with source identity and review records.
- **Documentation qualification**: exact candidate/snapshot/renderer/evidence binding and required terminal outcomes.
- **Publication operation**: expected remote release/assets, observed partial/staged/published state and repeatable recovery outcome.
- **Published release record**: observed published identity, independently checked bytes and matching documentation qualification.
- **Public pointers**: latest documentation/download selection advanced after publication and compared with prior state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All six elected Full/Lite package rows and supporting material assemble with exact qualified source/bytes; every wrong/missing/changed input fixture refuses.
- **SC-002**: At least two retained fixture versions pass rendering/topic/fallback/search/link/asset/schema/release checks; missing/mismatched inputs block publication and promotion.
- **SC-003**: Controlled publication demonstrates success/repeat/partial upload/uncertain acknowledgement/conflicting assets/failed publish/failed pointer promotion without rebuilding accepted bytes or advancing failed candidates.
- **SC-004**: Normal and major-release fixtures demonstrate vocabulary/glossary requirements and historical-correction rules.
- **SC-005**: All applicable hosted scopes and independent exact-source/native/artifact checks pass within preserved qualification policy, without local focus capture.
- **SC-006**: A clean pushed official PR closes both outcomes with green terminal checks and every finding handled within two rounds, ready for owner review/merge without a fabricated product release.

## Assumptions

- Reuse native package builders/validators and the current website renderer rather than replacing them.
- Current software/docs/master-schema version remains0.0.0 as an unreleased baseline. Controlled future-version fixtures validate tooling without asserting real publication.
- Real publication requires an elected version/support scope and explicit execution. Current authorization covers S021 implementation/push/PR; no product tag/release is created during delivery.
- Controlled service fixtures exercise mutation/readback/failure without credentials/public mutation; production commands use the same state machine and verifiers.
- #27 consumes this contract later; #20/#21 remain independent owner decisions. Existing public contracts and permanent no-signing policy govern all paths.

## Clarifications

### Session 2026-10-31

Autopilot resolves the following from approved scope and authoritative contracts.

- Q: Does S021 execute a real first product release? A: No. Deliver and qualify complete production tooling with controlled future-version/service fixtures; leave the unreleased baseline and real publication boundary intact.
- Q: Can a candidate documentation build authorize public latest/download pointers? A: No. Pre-publication documentation qualification gates product publication; actual publication readback and matching documentation qualification separately gate canonical record/pointer promotion.
- Q: Must the renderer, native packages or supported targets be replaced? A: No. Extend existing contracts/builders/validators for the six elected package rows and retain their actual native evidence and unsupported-target distinctions.

Coverage: functional scope, actors, data/identity, lifecycle, reliability/observability, dependencies, failure cases, constraints, terminology and completion signals are clear. API, archive and renderer integration are planning research. Requirements checklist remains16/16 with no changed markers or regressions.
