# Native Media and Accessibility Requirements Quality

**Purpose**: PR reviewer requirements-quality review, standard depth
**Created**: 2026-10-27
**Feature**: [spec.md](../spec.md)

Reviewer-owned: checked markers indicate requirements approval, never implemented behavior. The implementation agent leaves these markers unchanged.

## Evidence completeness

- [ ] CHK001 Are all three elected native target and actual-rendering requirements explicit? [Completeness, Spec §FR-001/002]
- [ ] CHK002 Are fixture identity and independent orientation/color/audio/seek expectations distinguishable? [Clarity, Spec §FR-003/004]
- [ ] CHK003 Is unsupported media distinguished from unavailable test infrastructure? [Consistency, Spec §Clarifications]
- [ ] CHK004 Are original and derived preview claims kept separate? [Coverage, Spec §FR-005]

## Interaction and accessibility

- [ ] CHK005 Are keyboard/viewer/dialog/cross-page focus journeys specified? [Completeness, Spec §FR-008]
- [ ] CHK006 Are native accessibility, screen-reader speech and physical-device evidence distinguished? [Clarity, Spec §FR-009/012]
- [ ] CHK007 Are contrast, themes, scale, narrow windows and reduced-motion conditions defined? [Coverage, Spec §FR-010]
- [ ] CHK008 Are compact fine-pointer and minimum coarse/mixed target requirements consistent? [Consistency, Spec §FR-011]

## Integrity and completion

- [ ] CHK009 Are no-autoplay, original-byte integrity and retired-work requirements preserved? [Consistency, Spec §FR-007]
- [ ] CHK010 Are missing/stale/unavailable observations prohibited from passing acceptance? [Measurability, Spec §FR-013/016]
- [ ] CHK011 Are normal-artifact test-hook exclusion and source-bound receipts specified? [Coverage, Spec §FR-013/015]
- [ ] CHK012 Are complete CI, two review rounds and owner merge authority explicit? [Completeness, Spec §FR-017]

## Notes

Primary, alternate, failure/recovery and presentation scenarios are covered. Native evidence and claim boundaries are the two focus areas. The explicit autopilot request authorizes continuing the workflow without reviewer-owned checkbox changes.
