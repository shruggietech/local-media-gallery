# Driver allocation requirements checklist

**Purpose**: PR reviewer requirements-quality review for finite allocation and ownership boundaries.

**Created**: 2026-11-03

**Feature**: [spec.md](../spec.md)

Checkboxes belong to the reviewer. Checked means requirements-quality approval, not implementation completion. Autopilot proceeds under the owner's explicit end-to-end instruction; these markers are not edited by implementation.

## Completeness and clarity

- [ ] CHK001 Are admissibility and actual OS binding separately required? [Completeness, Spec FR-001/FR-002]
- [ ] CHK002 Are rejection, listener release and exhaustion requirements explicit? [Coverage, Spec FR-003/FR-004]
- [ ] CHK003 Is the finite attempt limit quantified in the plan? [Clarity, Spec FR-003]
- [ ] CHK004 Are invalid address and bind/close error outcomes specified? [Coverage, Spec FR-004]

## Consistency and boundaries

- [ ] CHK005 Does the compatibility requirement cover every shared caller? [Consistency, Spec FR-005]
- [ ] CHK006 Are ownership, readiness deadlines and unrelated-listener boundaries distinct from selection? [Clarity, Spec FR-006]
- [ ] CHK007 Do regression requirements include deterministic fallback and owned real-listener acceptance? [Measurability, Spec FR-007]
- [ ] CHK008 Are local focus restrictions and final CI/review completion defined? [Coverage, Spec FR-008 and Edge Cases]

## Notes

Standard depth; PR reviewer audience. The separate built-in requirements checklist passed 16/16.
