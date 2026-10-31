# Recovery Requirements Checklist: Verified upgrades and recovery

**Purpose**: Review upgrade ownership, durable recovery and compatibility requirement quality before implementation.
**Created**: 2026-10-31
**Feature**: [spec.md](../spec.md)

**Review Ownership**: Reviewer-owned requirements-quality checklist. An approved marker does not mean implementation is complete; implement reads markers without changing them.

## Completeness and clarity

- [x] CHK001 Are prior/replacement identities and physical destination authority explicit before writes? [Completeness, FR-001, FR-002]
- [x] CHK002 Are all elected Full/Lite platform and installation-scope combinations included? [Coverage, FR-003]
- [x] CHK003 Are verified staging, durable switching boundaries and usable prior-byte retention defined? [Completeness, FR-004]
- [x] CHK004 Are repeatable recovery outcomes and timeout/unknown-process distinctions specified? [Clarity, FR-005]
- [x] CHK005 Are concurrency, active applications, tampered records and external edits covered? [Coverage, FR-006]

## Data preservation and compatibility

- [x] CHK006 Are media, sidecars, all settings/history, foreign files and shared runtimes independently preserved? [Completeness, FR-007]
- [x] CHK007 Are compatible rollback and incompatible/future/foreign/corrupt-state refusal requirements consistent? [Consistency, FR-008]
- [x] CHK008 Are complete/restored/incomplete/conflict outcomes distinguishable and actionable? [Measurability, FR-005, FR-009]
- [x] CHK009 Are ordinary native candidate observations separated from injected faults and compatibility fixtures? [Acceptance quality, FR-010, SC-001, SC-002]
- [x] CHK010 Are release boundaries, isolated GUI checks, qualification accounting and review cap explicit? [Constraints, FR-011, FR-012, FR-013]

## Notes

Designated independent requirements review (2026-10-31): CHK001, CHK002 and CHK004 through CHK010 satisfy the cited specification requirements. Identity and destination authority precede writes; Full/Lite and native scopes are covered; outcomes, unknown-process handling, refusal conditions, preserved data, compatibility cases, evidence distinctions and operating boundaries are explicit. These markers assess requirement quality only.

Initial review left CHK003 open because FR-004 did not yet name durable boundaries or their observable invariants.

Independent reassessment (2026-10-31): CHK003 is approved after reading plan.md, data-model.md and contracts/recipient-update.md. The normative design now names Prepared, Applying/PriorRetained (including Debian Unpacked), CandidateActivated/Verifying, Committed, Restoring/Restored and Incomplete/Conflict. It requires verified stage and retained prior bytes before destructive actions, durable receipt publication after independent verification, and reconciliation from actual old/new/absent inventories when mutation preceded the next journal write. Unknown content blocks further mutation. This closes the requirements-quality gap; implementation and native qualification remain separate obligations.
