# Metadata Requirements Quality Checklist

**Purpose**: PR review of metadata fidelity, access, freshness and presentation requirements.

**Created**: 2026-10-25

**Feature**: [Specification](../spec.md)

Markers are reviewer-owned approvals of requirements quality. Implementation does not modify them. Autopilot selects standard depth and PR reviewer audience from the approved scope.

## Completeness and clarity

- [ ] CHK001 Are naming, reference/index priority and ambiguity rules explicitly required? [Completeness, Spec FR-001/002]
- [ ] CHK002 Are all accepted JSON values, repeated keys and exact numeric forms covered without mandatory external keys? [Clarity, Spec FR-003]
- [ ] CHK003 Are native identity/case and root confinement requirements consistent across association and demand reads? [Consistency, Spec FR-001/004/005]
- [ ] CHK004 Are read, parsing, depth, association and display resource bounds required and exceptional results attributable? [Measurability, Spec FR-004]

## Scenario coverage

- [ ] CHK005 Are stale indexes, ambiguous stems, replacement and delayed completion requirements complete? [Coverage, Spec Edge Cases, FR-002/005]
- [ ] CHK006 Are missing/null/false/zero/empty distinctions and source conflicts separately specified? [Clarity, Spec FR-003/008]
- [ ] CHK007 Are summary identity, relocation and every existing persistence destination included? [Completeness, Spec FR-007, SC-003]
- [ ] CHK008 Are invalid/future documents and failed/conflicting settings writes required to preserve original bytes? [Coverage, Spec US2, SC-003]

## Non-functional requirements and dependencies

- [ ] CHK009 Are keyboard/focus/text-scale and playback continuity requirements stated observably? [Measurability, Spec FR-009, SC-005]
- [ ] CHK010 Are demand-only work, control responsiveness and manual discovery consistent? [Consistency, Spec FR-005/010]
- [ ] CHK011 Are source preservation, active-content-as-data and no arbitrary path authority requirements explicit? [Completeness, Spec FR-002/004/006]
- [ ] CHK012 Are acceptance evidence, platform limitations and final owner merge boundary distinct? [Traceability, Spec FR-012, Assumptions]

## Notes

This checklist reviews English requirements; concrete tests and evidence belong to tasks/verification. Source-neutral fixtures cover legacy compatibility without public private-project references.
