# Packaging Requirements Checklist: Windows Full and Lite

**Purpose**: Reviewer assessment of ownership, runtime and recipient-evidence requirements.

**Created**: 2026-10-27

**Feature**: [spec.md](../spec.md)

**Review Ownership**: Reviewer-owned requirements-quality checklist. A checked item means the requirement wording was reviewed, not that implementation passed. The implement command does not modify these markers.

## Completeness and consistency

- [ ] CHK001 Are edition, version, source, architecture and package identities complete and mutually consistent? [Completeness, Spec FR-001/002]
- [ ] CHK002 Are default-user and explicit-machine scope requirements distinguished? [Clarity, Spec FR-003]
- [ ] CHK003 Are file, directory, command, shortcut and registration collisions covered before destructive changes? [Coverage, Spec FR-004/011]
- [ ] CHK004 Is same-artifact idempotency measurable without implying broader upgrade support? [Consistency, Spec FR-005/011, SC-002]

## Runtime and recipient behavior

- [ ] CHK005 Are prerequisite discovery, provisioning failure and terminal verification defined? [Completeness, Spec FR-006/008]
- [ ] CHK006 Are installed/in-place roots, unrelated callers, relocation and Refresh requirements explicit? [Coverage, Spec FR-007/009]
- [ ] CHK007 Are recipient dependencies and optional-tool boundaries distinguished from build tools? [Clarity, Spec FR-008/012]
- [ ] CHK008 Are ownership and retention rules for media, user state and shared runtime consistent across installation/removal? [Consistency, Spec FR-004/010]

## Evidence and delivery

- [ ] CHK009 Are download, extracted, installed, runtime and optional-payload footprint definitions independently measurable? [Measurability, Spec FR-012]
- [ ] CHK010 Are native host, signing and unqualified-client claims bounded by actual evidence? [Clarity, Spec FR-013/014]
- [ ] CHK011 Are preparation, qualification, integrity and workstation-isolation requirements retained? [Completeness, Spec FR-014/015]
- [ ] CHK012 Are candidate/publication boundaries and review/merge responsibilities explicit? [Consistency, Spec FR-016/017]

## Notes

Standard-depth PR review checklist, created during the checklist stage. All12 items remain reviewer-owned. Built-in spec quality is separately16/16; explicit autopilot authorization allows implementation without treating this reviewer artifact as an attended test gate.
