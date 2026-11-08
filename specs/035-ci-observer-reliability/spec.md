# Feature Specification: CI observer reliability and published Linux recipients

**Feature Branch**: `codex/s035-ci-observer-reliability`

**Created**: 2026-11-08

**Status**: Specified

**Input**: Proceed with S035 under Spec Kit and autopilot; fix GitHub #110, #111 and #112, complete Linux recipient verification, publish a PR automatically and stop for owner merge after green CI and at most two review rounds. Perform stale-branch cleanup first.

## Clarifications

### Session 2026-11-08

- Autopilot resolution: retain all existing functional, integrity, provenance, ownership and signal checks and the 660/900/15-second contract. Repair observation and teardown rather than accepting incomplete evidence or repeatedly retrying failures.
- Autopilot resolution: verify the actual published v0.2.2 Lite recipient with the repaired observer. The observer source revision and published product source revision are distinct identities; neither may substitute for the other.
- Autopilot resolution: PackageKit may parent a coordinator through a daemon, so parentage is recorded but an Installer ancestry chain is not assumed. Unique operation, birth, executable and intent-generation binding establish admission.
- Autopilot resolution: this slice changes maintainer qualification tooling. It does not replace published assets, publish another release, add signing, or require an attended owner walkthrough.

## User Scenarios & Testing

### User Story 1 - Complete published Linux recipient verification (Priority: P1)

A maintainer obtains a complete, attributable native result for a gallery prepared with the actual published Linux Lite download, including relocation and explicit Refresh.

**Why this priority**: Prior post-publication qualification stopped in a silent-output observer before reaching this recipient case.

**Independent Test**: An isolated supported Linux host captures the complete finite tone/silence observations and exercises the actual published prepared recipient in place and after relocation, with original hashes, executable modes, retained settings/media and native image evidence independently read back.

**Acceptance Scenarios**:

1. **Given** a silent control on an isolated native output, **When** its declared finite observation is collected, **Then** every required sample arrives within the existing bound and the no-input/silence assertions hold.
2. **Given** delayed, missing, truncated or prematurely exited capture, **When** observation ends, **Then** qualification fails with bounded useful partial diagnostics and owned capture processes are retired.
3. **Given** an actual published v0.2.2 Linux Lite recipient, **When** its gallery is prepared, reopened, relocated and explicitly refreshed, **Then** exact public bytes and retained gallery state remain attributable to that release and native red/green rendering is observed.

### User Story 2 - Interrupt the intended macOS installation (Priority: P2)

A maintainer fault test stops and kills the coordinator owned by its current installation at the admitted partial-install boundary, then observes the existing refusal and recovery behavior.

**Why this priority**: A stale coordinator selection must not miss the fault or signal an unrelated process.

**Independent Test**: Focused process-lifetime regressions and an actual isolated macOS first-install interruption prove identity binding, live-authority refusal and successful recovery.

**Acceptance Scenarios**:

1. **Given** an active current installation and eligible partial intent, **When** interruption is admitted, **Then** the signalled coordinator matches current operation ancestry, process creation identity and executable identity immediately before signalling.
2. **Given** an exited, replaced, reused or unrelated process, **When** an observer considers interruption, **Then** it does not signal that process and retains the reason, observed identity, intent and installation outcome. A missed interruption is never a passing fault test.

### User Story 3 - Diagnose and retire stalled Windows qualification (Priority: P2)

A maintainer receives source-bound progress and terminal diagnostics when a native observer or owned child stalls, while the isolated worker can finish teardown and evidence transfer.

**Why this priority**: The original stalled experience worker produced no packet or downloadable job log.

**Independent Test**: Stalled request/child and inherited-I/O regressions retain pre-call checkpoints and bound cleanup; ordinary MSI journeys still pass on an isolated Windows host.

**Acceptance Scenarios**:

1. **Given** a risky native request or installer transition, **When** work begins, **Then** a retained checkpoint identifies source, shared clock, phase, pending request and attributable actor before the call can block.
2. **Given** a stalled request, unclosed output pipe or failed child termination, **When** the operation deadline arrives, **Then** the controller records an incomplete outcome and bounded owned teardown without waiting indefinitely for queued requests or I/O closure.
3. **Given** ordinary successful MSI journeys, **When** they complete, **Then** all existing source, actor, installation, upgrade, receipt, byte, offline and retention assertions still apply and consoles remain hidden/noninteractive.

### Edge Cases

- A coordinator exits between discovery, boundary admission and signalling; a PID is reused; multiple matching helpers belong to different installations.
- Native capture chunks split at arbitrary byte boundaries, the final samples arrive late, a process exits before stream closure, or a stream changes/corks during capture.
- Observer startup, queued requests, blocked native calls, failed process termination, inherited open output handles and diagnostic-write failure.
- Qualification reaches its active deadline; cleanup cannot turn late or missing evidence into acceptance.
- The published product is unchanged while the observer source changes; archives from older failures remain diagnostic and cannot replace elected current evidence.

## Requirements

### Functional Requirements

- **FR-001**: Linux observation MUST retain the complete declared finite sample window, original signal/silence thresholds, selected-stream ancestry and sink continuity, and before/after absence checks for the no-audio fixture.
- **FR-002**: Capture delivery MUST be configured deterministically within the existing local observation bound; partial capture MUST fail with bounded timing, byte/sample progress, process state and stderr diagnostics.
- **FR-003**: macOS fault admission MUST bind the coordinator to the current installation operation using operation binding, recorded ancestry, process creation and executable identities, revalidating immediately before signals and refusing stale/reused/unrelated identities.
- **FR-004**: macOS missed-boundary and signal failures MUST retain process identity, signal result/error, intent phase and available terminal installer outcome. A genuine stopped/killed coordinator and existing live-authority refusal/recovery evidence remain mandatory.
- **FR-005**: Windows qualification MUST persist bounded source/clock/phase/request/actor checkpoints before risky calls and transitions, including the last attributable MSI action and process creation identity when observed. Unknown facts remain explicit.
- **FR-006**: Windows requests MUST use finite deadlines clipped to the shared active deadline; owned cleanup MUST use finite bounds inside the shared hard deadline and finalization reserve. Pending queues, output handles or failed termination MUST NOT keep controller settlement unbounded. Failed termination remains a failure rather than a stopped-process claim.
- **FR-007**: Windows failure and teardown records MUST remain eligible for diagnostic upload on a responsive isolated host, without requiring successful native outcomes. No promise is made that a lost hosted machine can upload.
- **FR-008**: All platforms MUST preserve the 660-second advisory target, 900-second hard limit, 15-second reserve, terminal timestamp authority and separate preparation/qualification/combined accounting.
- **FR-009**: All original functional, integrity, provenance, ownership, security, byte, actor and receipt assertions MUST remain mandatory; no late/partial outcome or older passing artifact may authorize acceptance.
- **FR-010**: Linux published-recipient evidence MUST distinguish the repaired observer source from the exact published product source and bind the canonical record, actual downloaded bytes, archive modes, retained data and native screenshots to their observed roles.
- **FR-011**: Published v0.2.2 artifacts, canonical metadata and prior release records MUST remain unchanged. Local native GUI/input MUST remain off the owner's workstation; actual native campaigns run on isolated hosted desktops.
- **FR-012**: S035 MUST retain Spec Kit analysis and regression evidence, pass repository and affected hosted qualification, publish a PR automatically, handle every review finding with at most two hosted review rounds, and stop for owner review/merge.

### Key Entities

- **Observer run identity**: Current test source revision/digest, hosted run/job and elected artifact identities, shared readiness/deadline and terminal timestamps.
- **Owned actor identity**: Observed process ID, parent/operation ancestry, creation identity and executable path/digest, plus liveness and signal/termination observations.
- **Checkpoint**: Bounded sequence/time, phase/request/action, actor facts, clock authority and pending/terminal status; no credentials or unnecessary payload data.
- **Finite capture**: Required and observed bytes/samples, first/last progress, stream identity, bounded stderr and terminal process state.
- **Published recipient**: Immutable canonical release/product identity and public artifact bytes, prepared gallery archive, retained data and native rendering observations, separate from observer identity.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every admitted successful audio observation contains the full required sample count and passes existing tone/silence and attribution checks; truncated/delayed/exit regressions fail within their declared deadlines with retained diagnostics.
- **SC-002**: Stale, exited, reused and unrelated macOS actor regressions never signal the rejected actor; an actual current-operation interruption, live-authority refusal and recovery pass on isolated macOS.
- **SC-003**: Injected Windows request, child and inherited-I/O stalls settle within their admitted request/teardown bounds, retain a pre-call checkpoint and produce a truthful incomplete outcome. Actual ordinary MSI journeys remain passing.
- **SC-004**: The actual published Linux Lite recipient passes in-place and relocated native use with Refresh; an independent readback validates its complete archived inventory, public product identity, retained state and original screenshots.
- **SC-005**: Exact-head CI has all applicable checks terminal-successful with unchanged acceptance clocks and mandatory assertions. Failed historical observations remain retained separately.
- **SC-006**: The PR is reviewable, all hosted findings are answered and resolved within two rounds, and merge remains with the owner.

## Assumptions

- Current supported native baselines and already published v0.2.2 remain the product authority. Qualification tooling may change independently.
- GitHub-hosted native desktops and provider artifact retention are available; interruption of an entire host remains distinguishable from owned-controller stalls.
- Cleanup of stale branches was explicitly authorized and performed before slice implementation, with verified recoverable bundles for removed unmerged commits.
- Dependency updates, new product features, broader platform support, a new release and changes to signing policy are outside this slice.
