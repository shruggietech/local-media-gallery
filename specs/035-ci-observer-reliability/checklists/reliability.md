# Requirements Checklist: Native observer reliability

**Purpose**: Review requirements quality at the design boundary. **Created**: 2026-11-08.

**Feature**: [S035](../spec.md). Markers record the autopilot review of requirements, not executed implementation tests.

## Completeness and attribution

- [x] CHK001 Are complete-window and incomplete-capture outcomes defined separately? [Spec FR-001, FR-002]
- [x] CHK002 Are macOS process reuse, operation binding and missed interruption outcomes specified? [Spec FR-003, FR-004]
- [x] CHK003 Are pending Windows requests, pipe lifetime and teardown failure requirements defined? [Spec FR-005, FR-006]
- [x] CHK004 Are diagnostics bounded and source/clock/actor attributed without promising upload from an unavailable host? [Spec FR-005, FR-007]
- [x] CHK005 Are all timing limits and terminal acceptance semantics explicit? [Spec FR-008, FR-009]
- [x] CHK006 Are observer source and published product source separate evidence roles? [Spec FR-010]
- [x] CHK007 Are actual published Linux bytes, modes, retained data and native render outcomes required? [Spec SC-004]
- [x] CHK008 Are release immutability, isolated desktops and owner merge boundary explicit? [Spec FR-011, FR-012]

## Notes

Eight of eight requirements-quality criteria pass. Implementation evidence is recorded separately in verification.md.
