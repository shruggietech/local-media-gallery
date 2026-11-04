# Storage and private-state requirements checklist

**Purpose**: Reviewer-owned requirements-quality review.

**Created**: 2026-11-04

**Feature**: [spec.md](../spec.md)

Checked means reviewer approval of requirements quality, not implementation completion. Implementation leaves these markers unchanged and proceeds under the owner's explicit autopilot instruction.

## Ownership and paths

- [ ] CHK001 Are production and tooling storage owners distinguished for every state class? [Completeness, Spec FR-001/FR-002]
- [ ] CHK002 Are Windows Full/Lite, WebView2 and updater scope paths explicit? [Clarity, Spec FR-003/FR-004/FR-009]
- [ ] CHK003 Are direct adoption and no migration/backup or repeat legacy cleanup specified? [Consistency, Spec FR-005]

## Recovery and lifetime

- [ ] CHK004 Is format compatibility separated from product release labels? [Clarity, Spec FR-006]
- [ ] CHK005 Are private reset, I/O refusal and portable/media ownership differentiated? [Coverage, Spec FR-007/FR-008]
- [ ] CHK006 Are active, recovery, rollback and obsolete artifact lifetimes defined? [Completeness, Spec FR-010]
- [ ] CHK007 Are worker ownership and concurrent lock identity preserved during cleanup? [Consistency, Spec FR-011]

## Delivery

- [ ] CHK008 Do docs, diagnostics and preflight use matching semantics? [Traceability, Spec FR-012/FR-013]
- [ ] CHK009 Are existing automated checks distinct from owner post-publication testing? [Clarity, Spec FR-014]
- [ ] CHK010 Is the push/review/owner-merge boundary and two-round limit explicit? [Coverage, Spec FR-015]

## Notes

Standard depth, PR reviewer audience. Built-in spec checklist passes 16/16.
