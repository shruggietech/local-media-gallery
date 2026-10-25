# Performance Requirements Checklist: S011

**Purpose**: PR reviewer assessment of measurement, adaptation and lifetime requirement quality.
**Created**: 2026-10-25
**Feature**: [spec](../spec.md)

Checkboxes belong to the reviewer. An [x] means approval of requirements quality; implementation does not modify markers.

## Completeness and clarity

- [ ] CHK001 Are environment, fixture and source/artifact identities defined? [Completeness, Spec FR-001]
- [ ] CHK002 Are every elected operation and repeated observations separately attributable? [Coverage, Spec FR-002]
- [ ] CHK003 Is process-cold distinguished from OS-cache-cold evidence? [Clarity, Spec Clarifications]
- [ ] CHK004 Are unavailable memory and distribution observations explicit? [Completeness, Spec FR-003/004]
- [ ] CHK005 Are threshold proposals separated from general performance claims? [Clarity, Spec FR-004/005]

## Consistency and lifetime

- [ ] CHK006 Are finite resource limits compatible across media, discovery and metadata? [Consistency, Spec FR-006]
- [ ] CHK007 Are manual precedence, relocation and transient observations distinguished? [Consistency, Spec FR-007]
- [ ] CHK008 Are navigation and healthy playback invariants explicit? [Coverage, Spec FR-008]
- [ ] CHK009 Are focus, hidden-state and long-gap behavior defined? [Coverage, Spec FR-009]
- [ ] CHK010 Are cancellation and obsolete measurements covered? [Edge Cases, Spec FR-010]

## Acceptance and scope

- [ ] CHK011 Are measurable acceptance criteria tied to deterministic and native evidence? [Measurability, Spec SC-001..005]
- [ ] CHK012 Are privacy, source integrity and future-feature exclusions consistent? [Scope, Spec FR-010/011, Assumptions]

## Notes

Created with the resolved canonical checklist template. Standard depth; audience PR reviewer. No extension hooks. The installed checklist prerequisite requires plan even though autopilot orders checklist first; template resolved directly before planning, as in prior slices.
