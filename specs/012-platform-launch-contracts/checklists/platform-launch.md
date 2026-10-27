# Platform and Launch Checklist: S012

**Purpose**: Reviewer requirements-quality review of platform identity, placement, lifecycle and result boundaries.
**Created**: 2026-10-25
**Feature**: [spec.md](../spec.md)

**Review Ownership**: Reviewer-owned. [x] means requirements quality reviewed, not implementation complete. Autopilot authorization permits continued work; the implementation command does not change these markers.

## Platform completeness

- [ ] CHK001 Are OS, architecture, runtime/library/display, package, scope and signing requirements explicit for every proposed edition row? [Completeness, Spec §FR-001]
- [ ] CHK002 Are archive/application/runtime/optional-tool footprint meanings and unavailable observations distinguished? [Clarity, Spec §FR-002]
- [ ] CHK003 Is native qualification separated from build/CLI proof and final installation evidence? [Consistency, Spec §FR-003]

## Launch and result clarity

- [ ] CHK004 Are explicit-path precedence and Full/Lite no-argument roots defined outside bundles/mounts? [Clarity, Spec §FR-006/007]
- [ ] CHK005 Are default wait, bounded detach acknowledgement and independent repeated launches unambiguous? [Clarity, Spec §FR-008]
- [ ] CHK006 Are status/error identity and machine/diagnostic channel requirements consistent for UI and finite jobs? [Consistency, Spec §FR-009/010]

## Boundary coverage

- [ ] CHK007 Are native non-Unicode paths, missing placement, conflicting flags and unavailable prerequisites covered? [Coverage, Spec §Edge Cases]
- [ ] CHK008 Does the timeout language avoid equating a deadline with stopped native work? [Consistency, Spec §FR-011]
- [ ] CHK009 Are unavailable providers and their no-write outcomes distinct from implemented jobs? [Coverage, Spec §FR-012]

## Acceptance and dependencies

- [ ] CHK010 Are process/window, publication and source-integrity obligations measurable in elected checks? [Measurability, Spec §SC-004/005/006]
- [ ] CHK011 Are final installers, jobs and publication separated from matrix proof scope without dropping target OSes? [Dependencies, Spec §Assumptions]
- [ ] CHK012 Are qualified source/artifact, reviewer ownership and final owner merge boundaries explicit? [Completeness, Spec §FR-014]

## Notes

Generated from the canonical checklist template. Standard PR-review depth; platform identity and process lifecycle are the two focus clusters. The canonical template was resolved before planning; the installed --template prerequisite helper subsequently validates paths.
