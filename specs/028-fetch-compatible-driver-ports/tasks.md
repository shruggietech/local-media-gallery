# Tasks: Fetch-compatible native-driver ports

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md).

## Phase 1: Setup

- [x] T001 Align S028 branch, feature selector and specification in specs/028-fetch-compatible-driver-ports/spec.md.

## Phase 2: Foundation

- [x] T002 Complete official-policy research, data lifecycle and bounded design in specs/028-fetch-compatible-driver-ports/plan.md and research.md.
- [x] T003 Run the read-only blocking consistency/coverage gate across specs/028-fetch-compatible-driver-ports/spec.md, plan.md and tasks.md.

## Phase 3: US1 usable allocation (P1)

**Independent criterion**: restricted candidate followed by usable candidate returns the latter after both temporary listeners close; actual owned HTTP readiness still succeeds.

- [x] T004 [US1] Add failing deterministic restricted-policy selection cases and default real-listener coverage in tests/native-driver-lifecycle.test.mjs (FR-001, FR-002, FR-007).
- [x] T005 [US1] Implement private pinned restriction Set and OS bind/close/filter path in scripts/native-driver-lifecycle.mjs (FR-001, FR-002, FR-005).
- [x] T006 [US1] Route the existing foreign-listener fixture through shared allocation and retain actual nonce/PID readiness checks in tests/native-driver-lifecycle.test.mjs (FR-005, FR-006, FR-007).

## Phase 4: US2 bounded refusal (P2)

**Independent criterion**: fake candidates exhaust at the requested 1..32 attempt bound; invalid controls and observed address failures refuse, every successfully bound temporary listener closes and bind/close errors propagate.

- [x] T007 [US2] Add failing exhaustion, invalid input/address and factory/bind/close error cases in tests/native-driver-lifecycle.test.mjs (FR-003, FR-004, FR-007).
- [x] T008 [US2] Complete maximum 32 attempts, validated reduced test budget and cleanup/refusal behavior in scripts/native-driver-lifecycle.mjs (FR-003, FR-004, FR-006).

## Phase 5: Verification and delivery

- [x] T009 Record the tooling correction in CHANGELOG.md and local focused/full check/test/docs results in specs/028-fetch-compatible-driver-ports/verification.md (FR-008).
- [ ] T010 Commit/push and open the official PR closing #87; update GitHub Project 8 and record CI source/revision identity in the PR (FR-008).
- [ ] T011 Verify final applicable hosted checks, handle every finding within two review rounds and record final receipts in the PR, then hand off for owner review/merge (FR-008).

## Dependencies and execution strategy

T001 -> T002 -> T003 -> T004/T007 red tests -> T005/T008 helper -> T006 integration -> T009 -> T010 -> T011.

Implement both user stories as one small atomic helper change after red tests. US1 is the useful minimal selection fix; US2 completes finite/error behavior before shipping. Shared helper/test edits are sequential. Read-only research and repository inspection can run in parallel; no parallel file mutations are planned.

All tasks map to issue #87. No dependency, schema, product release or deadline change is required. Custom review checkboxes remain reviewer-owned. Post-push CI/review task completion is recorded on the PR to avoid a record-only native rebuild.
