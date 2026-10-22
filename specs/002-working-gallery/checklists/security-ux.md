# Security and interaction requirements checklist: S002

**Purpose**: Review requirements completeness before implementation.

**Created**: 2026-10-21

**Feature**: [S002](../spec.md)

**Review ownership**: The autopilot agent reviews requirements quality under the owner's explicit authorization. Markers concern requirements quality, not implemented behavior. Implementation reads these markers without modifying them.

## Access and source integrity

- [x] CHK001 Are root, linked-entry and stale-session access boundaries explicit? [Completeness, Spec FR-003/FR-014/FR-018]
- [x] CHK002 Are source writes excluded and ownership boundaries clear? [Clarity, Spec FR-017]
- [x] CHK003 Are malformed/unsupported media and lost directory access distinguished? [Coverage, Spec FR-005/FR-011]
- [x] CHK004 Are native helper execution and private diagnostic constraints specified? [Completeness, Spec FR-020; public SR-05/SR-07]

## Interaction and verification scope

- [x] CHK005 Are keyboard, focus return, playback cleanup and reduced-motion outcomes explicit? [Coverage, Spec FR-008/FR-009/FR-016]
- [x] CHK006 Are selection/counts and stale work defined under sorting, changes and root replacement? [Consistency, Spec FR-006/FR-012/FR-014]
- [x] CHK007 Is the settled-file five-second window measurable without inventing a scale claim? [Measurability, Spec SC-004]
- [x] CHK008 Are native Windows checks separate from browser/core evidence and unverified Linux/macOS behavior? [Clarity, Spec FR-022/FR-023]
- [x] CHK009 Is the small fixture scope consistent with the owner's excluded 1,000-image test? [Consistency, Spec FR-021]

## Notes

Generated through the installed checklist command, then reviewed separately before the implementation gate. Full implementation checks remain in acceptance/tasks and verification evidence.

Requirements review: all nine criteria are satisfied by FR-003 through FR-023 and the native/data contracts. Reviewed by the autopilot agent under owner authorization before implementation; these markers do not certify code.
