# Feature Specification: Guided gallery preparation

**Feature Branch**: `codex/s024-gallery-preparation`

**Created**: 2026-11-01

**Status**: Specified

**Input**: S024, complete issues #27 and #79 using Spec Kit and autopilot, with automated PR publication and at most two review rounds.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose preparation independently (Priority: P1)

A sender can browse immediately or elect gallery-local presentation, thumbnails, and selected recipient launchers independently. Before changing the gallery they see destinations, identities, estimated storage, and collisions.

**Why this priority**: Preparation must remain optional and understandable.

**Independent Test**: Preview every combination and verify that declining all choices leaves the gallery unchanged and browsable.

**Acceptance Scenarios**:

1. **Given** an open gallery, **When** preparation is opened, **Then** the sender chooses each optional action independently and sees its exact destination and storage commitment before confirming.
2. **Given** a preview with unrelated existing content, **When** preparation runs, **Then** collisions are reported without replacing unrelated files.
3. **Given** the sender declines preparation, **When** browsing or Refresh runs, **Then** discovery works without a generated manifest.

### User Story 2 - Prepare and share recipient launchers (Priority: P1)

A sender selects available recipient systems and acquires verified published Lite launchers without compiling software. The extracted gallery can move between directories and recipient computers.

**Why this priority**: This completes relocatable gallery sharing using the published product.

**Independent Test**: Prepare published Windows x86_64, Linux x86_64 and macOS arm64 Lite bundles, extract, launch, relocate and explicitly Refresh on their native hosts.

**Acceptance Scenarios**:

1. **Given** a canonical release, **When** the sender selects a recipient, **Then** only the identity- and integrity-verified matching Lite artifact is installed with its bundle structure, executable permissions and auxiliary payloads preserved.
2. **Given** a prepared gallery, **When** preparation repeats, **Then** matching outputs are reused and unrelated content remains byte-identical.
3. **Given** a moved gallery, **When** the recipient launches and Refreshes, **Then** current local media is discovered without sender paths, history or manifest regeneration.

### User Story 3 - Observe partial and canceled work (Priority: P1)

The sender sees meaningful progress and can cancel preparation. Completed independent outputs remain usable when another optional action fails or an artifact is unavailable.

**Why this priority**: Large galleries and multiple recipient downloads must remain controllable.

**Independent Test**: Cancel active work and inject a missing artifact, hash mismatch and output collision; inspect terminal outcomes and unchanged originals.

**Acceptance Scenarios**:

1. **Given** active preparation, **When** cancellation is requested, **Then** child work terminates before reporting cancellation, incomplete staged output is removed and completed outputs remain usable.
2. **Given** one unavailable recipient, **When** other elected actions finish, **Then** the result distinguishes completed, failed, skipped and canceled work and browsing remains available.

### User Story 4 - Prove resolved Windows presentation (Priority: P1)

Package qualification waits for the portable presentation requested by its fixture, including a transient default presentation before settings resolve.

**Why this priority**: A resolved-state race must not invalidate correct packages or conceal wrong settings.

**Independent Test**: Feed default then expected observations and persistent wrong observations through the readiness predicate.

**Acceptance Scenarios**:

1. **Given** default controls followed by the requested expanded controls, **When** startup is observed, **Then** readiness succeeds only at the requested state within the existing deadline.
2. **Given** persistently wrong presentation, **When** the deadline expires, **Then** qualification fails retaining the last attributed UI observation, selected root and portable settings identity.

### Edge Cases

- Offline or malformed release records, missing recipient artifact, mismatched identity/digest or truncated downloads.
- Existing unrelated files, modified previously generated payloads, symlink escapes, archive traversal and interrupted extraction.
- Unwritable gallery, exhausted storage, concurrently changed preview inputs and canceled thumbnail helpers.
- No selected actions, repeated preparation, moved roots, non-ASCII paths and partially completed work.
- A stable wrong Windows presentation must fail rather than being treated as a transient default.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Browsing MUST remain available without preparation or a generated manifest.
- **FR-002**: Presentation, thumbnail generation and each recipient launcher MUST be independently elected.
- **FR-003**: Preview MUST identify each destination, release/platform identity, expected or estimated storage and collision before writes; execution MUST revalidate changed inputs.
- **FR-004**: Recipient payloads MUST come only from a verified canonical published release record and pass artifact identity, byte-count and digest verification before extraction.
- **FR-005**: Extraction MUST preserve bundle structure, executable modes and required auxiliary payloads without escaping the selected destination or replacing unrelated gallery content.
- **FR-006**: Reruns MUST reuse matching outputs and report modified or unrelated collisions without overwriting them.
- **FR-007**: Preparation MUST use existing native job admission, progress, cancellation and terminal result semantics; no source compiler or maintainer runtime may be required on the sender.
- **FR-008**: Failures/cancellation MUST retain completed independent outputs and original media, remove incomplete staged output and report complete/partial/canceled outcomes accurately.
- **FR-009**: Elected recipient launchers MUST launch after extraction and relocation, discover local media and support explicit Refresh without retaining sender absolute paths/history.
- **FR-010**: Windows startup qualification MUST wait for the expected portable presentation within its existing startup deadline and retain diagnostic context on failure.
- **FR-011**: Deterministic regression coverage MUST distinguish transient default-to-resolved presentation from persistently wrong settings.
- **FR-012**: Current product, documentation and master schema versions MUST agree; shipped documentation and canonical release bytes remain immutable.

### Key Entities

- **Preparation selection**: Independent presentation, thumbnail and recipient choices scoped to the currently selected gallery.
- **Preparation preview**: Bound gallery identity, selected actions, destinations, release/artifact identities, storage commitment and conflicts.
- **Preparation job**: Progress, cancellation, independent action outcomes and terminal summary.
- **Recipient payload**: Verified canonical release artifact with platform, archive identity, digest, bundle layout and reusable output identity.
- **Presentation observation**: Attributed native UI state associated with the selected root and expected portable settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All independent option combinations can be previewed without writes; declining preparation leaves originals and browsing unchanged.
- **SC-002**: Each elected published recipient platform passes native extract, launch, relocate and Refresh verification with retained artifact integrity evidence.
- **SC-003**: Repeating a successful preparation produces zero changes to matching payloads and original media.
- **SC-004**: Collision, integrity failure, unavailable artifact and cancellation scenarios preserve originals and completed independent outputs and accurately distinguish their outcomes.
- **SC-005**: The Windows readiness regression accepts a transient default only after the expected state arrives, and rejects a permanently wrong state without increasing the startup deadline.

## Assumptions

- The published v0.1.0 canonical release supplies Windows x86_64, Linux x86_64 and macOS arm64 Lite recipients. Additional unavailable platforms are reported rather than fabricated.
- Recipient host runtime prerequisites remain those declared by the published release; source compilation is never a sender requirement.
- Gallery-local presentation and thumbnails reuse current settings and cache contracts.
- Release publication and merge remain owner-controlled; this slice publishes a reviewable PR, not a new release.
