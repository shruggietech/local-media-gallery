# S038 qualification repair (#118)

Created: 2026-11-09. Status: specified. Parent: ../spec.md.

## User scenarios and acceptance

### P1: Qualify the publication candidate on trusted main

As the release operator, I need all required Windows installation and upgrade observations to complete within the existing qualification window so that v0.3.0 can be published from the exact accepted artifacts.

Given a cold isolated Windows worker, when the observer first initializes, then initialization has a finite explicit allowance within the existing absolute campaign clock and cannot be mistaken for a functional wizard observation.

Given the two-worker cohort, when ordinary upgrades run, then all published predecessors 0.2.0, 0.2.1 and 0.2.2 execute serially on exactly one elected worker, with every existing assertion retained.

### P2: Preserve evidence integrity and historical readers

Given a new build packet, when worker evidence is combined, then missing, foreign, duplicated or misassigned initialization and upgrade records fail closed. Given a historical packet without new markers, its existing interpretation remains unchanged.

## Requirements

- FR-001: Keep the 660-second advisory target, 900-second hard limit, 15-second reserve and terminal timestamp authority unchanged.
- FR-002: Bound observer initialization once per owned session; do not retry timed-out native operations or reset the campaign clock. Functional MSI request allowance remains 20 seconds.
- FR-003: Retain all three ordered ordinary predecessor campaigns, cancellation, changed-payload refusal, successful upgrade, actual native browse, retained data and cleanup proofs.
- FR-004: Assign ordinary upgrades to the less-loaded existing lifecycle worker for new builds; historical packets default to experience.
- FR-005: Bind initialization readiness to actual observer PID, MTA apartment and hash-verified MSI source. Reject malformed or foreign proofs.
- FR-006: Keep product behavior, release version and public contracts unchanged. No workstation installer or app GUI execution.
- FR-007: Preserve failed evidence from main run 42694671875 attempts 1 and 2. Publish only after a new accepted trusted-main run after repair merge.

- FR-008: Transfer every completed Windows update snapshot path and byte through SHA-256 deduplication, bind the manifest to source/revision and the fragment, reject malformed/missing/foreign blobs and redirected destinations, and restore complete independent regular files before existing validators. Keep historical raw evidence readable. No original worker snapshot is deleted.

## Success criteria

All local repository checks and targeted regression tests pass. Exact-head hosted qualification completes all mandatory cases inside the original hard deadline. Hosted review findings are resolved before owner merge. Trusted-main qualification and exact-artifact publication remain separately required.

## Clarification decisions

No owner decision is needed for internal worker assignment or bounded cold-start initialization. No third unchanged retry. Existing MTA observer contract is authoritative. Repair stays within S038 and does not introduce a new slice code.
