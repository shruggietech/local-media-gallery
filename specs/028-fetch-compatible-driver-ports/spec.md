# Feature Specification: Fetch-compatible native-driver ports

**Feature Branch**: `codex/s028-fetch-compatible-driver-ports`

**Created**: 2026-11-03

**Status**: Ready for planning

**Input**: S028, complete GitHub #87 end-to-end under Spec Kit/autopilot, automatically push/open PR, handle CI and at most two review rounds, then owner review/merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start native verification with a usable port (Priority: P1)

A maintainer starts native verification, preparation acceptance or measurement. An OS-assigned port must also be usable by the HTTP client used for driver readiness, so an otherwise healthy child is not reported unavailable because its selected port is blocked by that client.

**Why this priority**: An observed restricted port caused a false readiness failure during otherwise unchanged verification.

**Independent Test**: Supply a restricted candidate followed by an admissible candidate; only the admissible, OS-bound candidate is returned and the ordinary readiness client can communicate with an owned fixture.

**Acceptance Scenarios**:

1. **Given** the first OS candidate is restricted and the next is admissible, **When** allocation runs, **Then** the restricted candidate is released and the admissible candidate is returned.
2. **Given** a normal host, **When** allocation runs without test configuration, **Then** its selected candidate has actually been bound on IPv4 loopback and released before the driver binds it.
3. **Given** existing native callers, **When** they request a port with the existing call shape, **Then** they inherit the corrected policy.

### User Story 2 - Refuse allocation without weakening ownership (Priority: P2)

A maintainer receives an attributable allocation failure when candidates are exhausted or binding fails, without changing the system port configuration or treating an unrelated listener as an owned driver.

**Why this priority**: Fallback must remain finite and preserve existing process identity and readiness boundaries.

**Independent Test**: Supply only restricted candidates and injected bind/close failures; allocation stops within its finite attempt bound and releases all successfully bound temporary listeners.

**Acceptance Scenarios**:

1. **Given** only restricted candidates, **When** the attempt limit is reached, **Then** allocation fails with a diagnostic identifying exhaustion and does not start another attempt.
2. **Given** a bind or close failure, **When** allocation cannot complete, **Then** the error is propagated rather than returning an unchecked port.
3. **Given** a selected port later belongs to another process, **When** readiness runs, **Then** existing nonce/PID ownership rejection and readiness deadlines still apply.

### Edge Cases

- Restricted candidates at the end of the allowable port range; repeated identical candidates.
- Invalid/missing listener address; allocation errors and temporary-listener cleanup errors.
- No candidate succeeds within the finite attempt budget.
- The release-before-child-bind interval remains an existing race; allocation does not reserve a port for the child or replace readiness ownership.
- Local acceptance uses only owned headless mock listeners. GUI/input stays on isolated CI.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Shared native-driver allocation MUST return only an integer port from 1 through 65535 that the current HTTP client permits for ordinary HTTP requests.
- **FR-002**: Every returned candidate MUST come from a successful OS-assigned IPv4 loopback bind, with the temporary listener closed before return.
- **FR-003**: Restricted candidates MUST be closed and retried with a new OS allocation, up to a documented finite attempt limit.
- **FR-004**: Exhaustion, invalid addresses and bind/close failures MUST refuse with an attributable error; allocation MUST NOT report an unverified candidate.
- **FR-005**: Existing no-argument callers MUST continue using the shared allocator without requiring new system settings or per-caller policies.
- **FR-006**: Existing nonce/PID ownership, listener attribution, child cleanup and readiness/qualification deadlines MUST remain unchanged. Allocation MUST NOT send a request to an unrelated listener.
- **FR-007**: Deterministic regression coverage MUST include restricted-then-admissible selection, finite exhaustion, errors, listener cleanup and an owned real-listener readiness flow.
- **FR-008**: Validation MUST include repository checks, the full unit suite and applicable hosted native scopes, with final source/check/review evidence and at most two review rounds.

### Key Entities

- **Port candidate**: OS-assigned loopback endpoint, admissibility disposition and temporary-listener lifecycle.
- **Allocation result**: A verified usable port or an attributable refusal after finite work.
- **Driver identity**: Existing owned PID/nonce proof, independent of port selection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every deterministic restricted-then-admissible case returns the later usable candidate and releases all temporary listeners.
- **SC-002**: Every exhaustion fixture terminates at exactly the configured finite attempt limit without leaving a bound listener.
- **SC-003**: Existing ownership and readiness regression cases still pass, and all applicable checks at the final PR revision are green.
- **SC-004**: Issue #87 is fully represented by the delivered change and PR, with no unresolved review findings at owner handoff.

## Assumptions

- This is maintainer/native-acceptance tooling maintenance, not a product behavior or release-publication change.
- The pinned Node runtime is the current driver HTTP client. Its documented restricted-port policy governs admissibility; research will select a proportional representation.
- The system ephemeral port range and all published v0.2.0 artifacts remain untouched.
- Dependency/toolchain changes, unrelated Windows flakiness and TCP reservation redesign are outside this slice.
- Explicit owner push/PR authorization supersedes the autopilot skill's default pre-push pause. Owner retains final merge authority.

## Clarifications

### Session 2026-11-03

No critical ambiguities require an owner decision. The issue, existing callers and constitution establish scope. All coverage categories are clear; implementation representation and attempt count are planning decisions.
