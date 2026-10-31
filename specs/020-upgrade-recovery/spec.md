# Feature Specification: Verified upgrades and recovery

**Feature Branch**: codex/s020-upgrade-recovery

**Created**: 2026-10-31

**Status**: Specified

**Input**: S020, complete #25 end-to-end under Spec Kit/autopilot, push an official PR automatically, handle CI and at most two review rounds, then stop for owner final review and squash merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Replace an owned installation (Priority: P1)

As a recipient, I can replace my installed Full application or adjacent Lite application with an identified compatible candidate, retaining media, settings and integration while receiving an accurate verified result.

**Why this priority**: Current installers accept only the exact same candidate; users need a supported update path before release delivery.

**Independent Test**: Replace an actually installed ordinary candidate with a distinct verified ordinary candidate on every elected native package combination, launch the replacement and inspect its identity and retained user state.

**Acceptance Scenarios**:

1. **Given** an unchanged owned installation and compatible replacement, **When** I request an update, **Then** source/artifact/version/edition/platform/architecture identities are checked before writes, the replacement operates natively and installed bytes/integration match the replacement inventory.
2. **Given** an unchanged current candidate, **When** I repeat the update, **Then** verified already-current success is reported without duplicate integration or destructive reset.
3. **Given** wrong architecture/edition, altered/foreign/linked inputs or a colliding destination/integration, **When** update is requested, **Then** a specific conflict occurs before destructive replacement and unrelated bytes remain unchanged.

### User Story 2 - Recover after interruption (Priority: P1)

As a recipient, I can recover a replacement interrupted before, during or after application switching, without guessing which candidate is active or losing gallery content.

**Why this priority**: A spawned installer, timeout or copied download cannot establish successful replacement.

**Independent Test**: Interrupt real package operations at elected durable boundaries, repeat recovery from retained evidence and verify an exact usable old or new installation and preserved user data.

**Acceptance Scenarios**:

1. **Given** staged verified replacement, **When** staging/write/installer execution fails, **Then** the prior installation remains usable or an explicit durable recoverable state identifies retained application bytes and the recovery command; success is never fabricated.
2. **Given** interruption at a durable switch boundary, **When** recovery is requested, **Then** the observed phase and actual files determine a repeatable completion or restoration, without reapplying an unknown write blindly.
3. **Given** modified/foreign recovery records, running applications, active concurrent operations or externally edited files, **When** recovery/update runs, **Then** it reports the specific conflict and preserves content rather than treating a timeout as proof that writes stopped.

### User Story 3 - Preserve compatible state and reject incompatible downgrade (Priority: P1)

As a recipient, my preferences/history/portable settings remain valid through compatible updates and supported rollback, and an older writer cannot corrupt newer incompatible state.

**Why this priority**: Application replacement and durable-data compatibility are separate outcomes.

**Independent Test**: Exercise ordinary native replacement with existing settings/history and future/foreign/corrupt state fixtures, then validate compatible rollback and blocked incompatible downgrade before replacement.

**Acceptance Scenarios**:

1. **Given** the existing durable format, **When** compatible candidates are exchanged or restored, **Then** media, sidecars, portable choices, user preferences and history remain byte-preserved except explicitly requested normal application activity.
2. **Given** incompatible future, corrupt or foreign state, **When** update/recovery would activate an incompatible writer, **Then** the operation refuses before destructive replacement and retains exact state with actionable diagnostics.
3. **Given** completed replacement/removal/recovery, **When** inspected, **Then** only inventoried owned application files/integration are changed; ordinary browsing and optional preparation behavior remain intact.

### Edge Cases

- Partial staging, missing backup or replacement bytes, tampered manifest/journal, invalid phase, changed modes/ownership/links, foreign path/command/package registration, wrong architecture and edition.
- Concurrent invocations, running app handles, installer-service continuation after timeout, process termination between durable writes, storage/permission errors and restart after each boundary.
- Same software version with distinct candidate/source identity, newer/older compatible versions and incompatible data formats; no fabricated published release is needed for candidate tests.
- Full user/system scopes, Linux package-manager interruption semantics and Lite adjacent galleries, including Unicode/spaces, relocation and retained foreign files.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Update MUST identify installed and replacement versions, candidate/source/artifact identities, edition, platform and architecture before staging or changing owned installation paths.
- **FR-002**: Replacement MUST verify complete artifact/payload files, hashes, modes and physical ownership, reuse established native package integration and reject unrelated/changed/linked content.
- **FR-003**: Full and Lite update/recovery MUST operate on all existing elected native package/scope combinations without silently reducing support; installation/current-candidate repetition/removal contracts remain valid.
- **FR-004**: Update MUST stage verified replacement before destructive switching, retain sufficient owned prior bytes and durable operation identity/phase to recover every elected interruption boundary, and verify actual installed bytes/native identity/integration before success.
- **FR-005**: Recovery MUST use observed durable phase and physical content, be idempotent, retain failed diagnostics and distinguish complete/restored/incomplete/conflict outcomes. A timeout MUST NOT imply subprocess or installer-service termination.
- **FR-006**: Operations MUST coordinate concurrent updates, detect active application use and reject foreign/tampered recovery records or external edits without overwriting unrelated data.
- **FR-007**: Media, sidecars, gallery-local settings, user preferences/history, foreign files and shared runtimes MUST remain preserved; cleanup/removal MUST be limited to verified owned application/staging/backup/integration entries.
- **FR-008**: Durable-format compatibility and downgrade rules MUST be explicit. Existing compatible formats need no invented migration; incompatible future/foreign/corrupt state MUST not be reset or exposed to an incompatible older writer. Any elected format migration MUST have defined recovery before activation.
- **FR-009**: The public update/recovery interface and guidance MUST state actionable commands, identity/result/failure semantics, supported recovery boundaries and actual limits. Finishing a download or spawning an installer MUST NOT certify success.
- **FR-010**: Native tests MUST exercise distinct ordinary candidates, actual successful replacement/launch, same-candidate repeat, compatible restore, wrong identity/architecture, collisions, interruption/write failure and repeatable recovery on elected packages; injected fixtures/failures MUST be distinguished from production bytes and normal native observations.
- **FR-011**: Preserve no-project-signing policy, notices, brand bytes, source/version/schema alignment, existing access and browsing contracts. Product release publication, release-record tooling (#26/#31), sharing (#27) and preview/editing decisions (#20/#21) remain outside S020.
- **FR-012**: All eight applicable CI scopes and independent exact-source artifact/native readback MUST pass. Preserve 660s qualification target,900s hard limit,15s reserve and separate preparation/qualification/combined accounting; local work MUST stay headless and GUI/input MUST use isolated hosted desktops.
- **FR-013**: Spec Kit analysis/convergence, issue/project tracking, automatic push/official PR and every external finding response MUST complete within at most two review rounds. Stop for owner final review/merge without a product release or invented attended acceptance gate.

### Key Entities

- **Candidate identity**: product/version/edition/native target/source/artifact inventory and installed integration identity.
- **Replacement operation**: observed prior candidate, verified replacement, physical destinations, owned staging/backup, durable phase, lock/active-use state and terminal result.
- **State compatibility**: supported format identities and read/write compatibility, preserved state and refused incompatible transitions.
- **Recovery evidence**: retained verified bytes/metadata, observed interruption boundary, specific failure and verified complete/restored/incomplete result.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every elected Full/Lite native package/scope replaces a distinct owned candidate, verifies current identity/integration and launches ordinary browsing with retained user data.
- **SC-002**: Every elected interruption/write-failure boundary has a demonstrated repeatable recovery outcome; no failed, partial or timed-out operation reports success.
- **SC-003**: Every wrong-target/foreign/tampered/concurrent/incompatible-state negative fails specifically before destructive changes, with exact unrelated/state bytes retained.
- **SC-004**: All eight scopes and independent final-source/native/artifact readback pass within the preserved qualification deadline; local source/check/test/app/site verification passes with no workstation focus capture.
- **SC-005**: All findings are handled within two rounds and the clean pushed official PR has green terminal checks and an accurate owner-review handoff.

## Assumptions

- Existing Windows x86_64, Ubuntu24.04 x86_64/X11 and macOS15 arm64 Full/Lite packages and user/system scopes remain the elected baselines.
- Update is an explicit recipient operation against an identified supplied candidate. Network release discovery/publication is not required to prove candidate-to-candidate replacement.
- Keep current software/docs/master-schema version0.0.0; distinct controlled candidate identities and clearly labelled test-only compatibility fixtures demonstrate transitions without inventing a public release.
- Preserve current state formats where no change is needed. Unsupported incompatible downgrade is a specific refusal, not permission to drop compatible rollback/recovery.
- Reuse native ownership and package-manager semantics; no new general-purpose updater service or account system is elected.

## Clarifications

### Session 2026-10-31

Autopilot resolved three questions from the approved scope and current contracts.

- Q: Does update require a published release or network auto-update service? A: No. Verify an explicitly supplied candidate; release-record/publication tooling remains #26/#31. This preserves end-to-end replacement without inventing a release.
- Q: Must this slice create a new persisted format or public software version? A: No. Keep current compatible formats and version0.0.0 unless a demonstrated requirement needs a deliberate migration; use distinct verified candidates and labelled compatibility fixtures.
- Q: Can one platform or rollback behavior be silently excluded to simplify delivery? A: No. Preserve elected native combinations and compatible restoration; reject incompatible writers explicitly before destructive replacement.

Coverage: functional scope, entities/identity, user flows, reliability/observability, dependencies, exceptional recovery, constraints, terminology and completion signals are clear. Platform-specific mechanisms are planning research, not unresolved product choices.
