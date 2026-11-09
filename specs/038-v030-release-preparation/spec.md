# Feature Specification: S038 resilient qualification and v0.3.0 preparation

**Feature Branch**: `codex/s038-v030-release-preparation`

**Created**: 2026-11-09

**Status**: Specified

**Input**: Proceed with S038 using Spec Kit and autopilot. Fix CI download reliability and prepare v0.3.0. Push and open the PR automatically, handle CI and at most two review rounds, then stop for owner review and merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete prerequisite acquisition through temporary outages (Priority: P1)

A release maintainer can run qualification when a prerequisite host briefly refuses or interrupts a download. Acquisition retries temporary failures within explicit attempt and elapsed-time limits, verifies the accepted bytes and reports a useful terminal failure when recovery is impossible.

**Why this priority**: Post-merge qualification at `9509deb` failed before product testing because prerequisite downloads returned unsuccessful responses, including HTTP 504. Unbounded or indiscriminate retries would hide different failures and consume the qualification window.

**Independent Test**: Elect controlled temporary, permanent, interrupted, corrupt and stalled responses. Observe exact attempts, elapsed-time admission, accepted bytes and terminal diagnostics without requiring an external outage.

**Acceptance Scenarios**:

1. **Given** temporary server refusal followed by the correct content, **When** acquisition runs, **Then** a bounded retry obtains and verifies the content before it becomes usable.
2. **Given** permanent refusal, invalid integrity or incompatible content, **When** acquisition runs, **Then** it fails without accepting bytes or retrying the invalid result.
3. **Given** an interruption, cancellation, exhaustion or expired caller deadline, **When** another attempt would begin, **Then** acquisition stops within the existing bound and retains the actual causes and attempt count.
4. **Given** a large elected artifact and its existing transfer limit, **When** acquisition runs, **Then** temporary failures share that limit and the artifact retains its existing byte and digest requirements.

### User Story 2 - Review a coherent v0.3.0 candidate (Priority: P1)

The owner can review a v0.3.0 candidate containing the completed navigation, installer recovery and observer reliability work, with matching software, schemas, documentation, release metadata and concise release highlights.

**Why this priority**: The latest published product is v0.2.2. The merged improvements need a versioned, testable release candidate before publication.

**Independent Test**: Validate version alignment, render candidate and historical documentation, exercise candidate packages and compare historical publication identities before and after preparation.

**Acceptance Scenarios**:

1. **Given** the merged improvements and v0.2.2 publication, **When** v0.3.0 is prepared, **Then** all candidate contracts agree on v0.3.0 and explain the implemented navigation and maintenance workflows.
2. **Given** a published predecessor, **When** ordinary upgrade, recovery or removal is elected, **Then** actual candidate behavior, native outcomes, integration cleanup and retained independent/private bytes satisfy the existing contracts.
3. **Given** a prepared but unpublished candidate, **When** public downloads or latest published docs are selected, **Then** selection remains bound to observed canonical publication and historical released bytes remain unchanged.

### User Story 3 - Receive an evidenced PR handoff (Priority: P1)

The owner receives an official pushed PR with complete exact-head qualification and review dispositions, ready for the usual final review and squash merge.

**Why this priority**: Source checks, runtime acceptance, publication and owner merge are distinct decisions.

**Independent Test**: Inspect the PR head, terminal checks, retained native receipts, issue/project status and bounded review ledger.

**Acceptance Scenarios**:

1. **Given** the implementation and candidate, **When** qualification completes, **Then** all applicable checks are terminal-successful for the exact head and failed observations remain attributable.
2. **Given** hosted findings, **When** up to two review rounds run, **Then** every actionable comment is addressed and its thread resolved; a service failure is reported literally without exceeding the cap.
3. **Given** a ready PR, **When** the owner handoff occurs, **Then** source remains pushed and clean, and no merge, tag or release publication has been performed by this slice.

### Edge Cases

- A response begins successfully but its body stalls, disconnects, exceeds its existing size bound or fails a digest check.
- A server supplies a long, malformed or date-based retry delay while the caller has little time left.
- Cancellation arrives during request, body consumption or delay; no later request may begin.
- An existing verified file or immutable historical release is present when acquisition fails.
- Concurrent independent acquisitions fail differently; one must not reuse another's attempts or bytes.
- Redirected or credential-bearing URLs appear in a terminal cause; diagnostics must not disclose credentials or query tokens.
- A signed temporary asset URL expires; existing attributable URL-renewal behavior must not become a generic authorization retry.
- A new version changes candidate identity while the canonical release still selects v0.2.2.
- Hosted qualification or review fails; historical success cannot qualify changed bytes and the review cap remains binding.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Prerequisite acquisition MUST recover from elected temporary server and transport failures with a finite attempt limit and an explicit total elapsed-time bound.
- **FR-002**: Permanent authorization, absence, certificate, content-compatibility, integrity and elected-size failures MUST remain terminal; retries MUST NOT turn invalid bytes into accepted content.
- **FR-003**: Requests, response-body consumption and retry delays MUST share the caller's existing deadline. Cancellation or exhausted admission MUST prevent another request, and large-artifact transfer bounds MUST remain available.
- **FR-004**: A bounded server-requested retry delay SHOULD be honored when it fits the remaining budget; malformed or excessive delays MUST NOT extend the budget.
- **FR-005**: Partial content MUST NOT replace a verified input or be published as a complete artifact. Existing digest, provenance, archive and byte-limit checks MUST remain authoritative after acquisition.
- **FR-006**: Terminal download diagnostics MUST identify the acquisition, attempts, actual response/transport cause and elapsed outcome without exposing credentials, tokens or response secrets.
- **FR-007**: The observed tool, media and Windows installer prerequisite paths and equivalent preparation download paths MUST use consistent retry semantics. Generic retries MUST apply only to idempotent acquisition; release mutations and functional test failures MUST NOT gain automatic retries.
- **FR-008**: Software, master schema, versioned documentation and candidate release metadata MUST align at v0.3.0. Existing framework/toolchain and signing policies MUST remain unchanged.
- **FR-009**: v0.3.0 documentation and highlights MUST describe the merged navigation, legacy MSI recovery and observer reliability behavior, including actual support limits and the owner-facing maintenance procedure.
- **FR-010**: Historical published packages, documentation evidence, release records and canonical latest selection MUST remain unchanged until a separately authorized publication is observed.
- **FR-011**: Candidate qualification MUST retain all mandatory platform/package, native, recipient, integrity and provenance elections, including ordinary latest-published upgrades and separate affected v0.1.0/v0.2.0 legacy recovery/removal cases. Candidate sender and canonical published Lite receiver versions MUST remain distinct in prepared-recipient evidence; native candidate Full/Lite proof is separate.
- **FR-012**: Qualification MUST preserve the 660-second advisory target, 900-second hard limit, fifteen-second provisional finalization reserve and terminal timestamp authority. Preparation, qualification and combined accounting MUST remain separate.
- **FR-013**: Spec Kit specify, clarify, checklist, plan, tasks and analyze gates MUST precede implementation. GitHub Issues/Project and internal slice artifacts MUST track the work without exposing numbered tracking artifacts as official documentation.
- **FR-014**: The slice MUST run repository and affected product/site checks, push an official PR, address every actionable hosted finding within at most two requested review rounds, and leave final merge and publication to the owner.

### Key Entities

- **Acquisition**: An idempotent input request with an identity, deadline, attempt policy, accepted bytes and attributable terminal result.
- **Attempt observation**: A response or transport outcome, elapsed time and bounded retry decision; it does not establish integrity acceptance.
- **Release candidate**: v0.3.0 software, schema, documentation and artifact identities tied to one qualified source/head.
- **Canonical publication**: An observed published record and immutable released bytes; a prepared candidate cannot replace it.
- **Qualification receipt**: Exact source, artifacts, elected functional/integrity checks, clock and actual terminal outcome.
- **Review ledger**: Requested rounds, heads, findings, dispositions and any external service failure, with a maximum of two rounds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Controlled temporary-response and interrupted-body cases recover within the elected attempt/time limits, while permanent, corrupt, cancelled and exhausted cases admit zero unauthorized extra attempts and accept zero invalid artifacts.
- **SC-002**: Every in-scope acquisition preserves the existing integrity/size checks and produces an actionable, credential-free terminal failure in the elected failure cases.
- **SC-003**: All candidate software/schema/documentation/version checks agree on 0.3.0; historical canonical records and released content remain unchanged.
- **SC-004**: Every mandatory elected native/platform/package and recipient campaign has a complete actual terminal pass on the exact final candidate, with independent byte/provenance readback and unchanged qualification clocks.
- **SC-005**: The official PR has a pushed clean final head, terminal-successful applicable CI, no unresolved actionable review thread and no more than two requested hosted rounds; owner merge and publication remain pending.

## Assumptions

- The owner has authorized automatic pushes and PR creation for S038, overriding the generic pre-push pause. Final merge and release publication are not authorized by this request.
- v0.3.0 contains already approved and merged behavior; richer previews, media editing, unrelated feature work and dependency/framework upgrades are outside scope.
- Acquisition resilience is a maintainer/release concern. It does not introduce product network behavior or change ownership/data retention rules.
- Temporary outages can be modeled deterministically. A successful retry is acquisition evidence, never a substitute for functional or integrity qualification.
- Existing release tooling, candidate/canonical separation, package matrix and unsigned distribution policy are retained.
