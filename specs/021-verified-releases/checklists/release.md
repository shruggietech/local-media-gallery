# Release Requirements Checklist: Verified releases

**Purpose**: Reviewer requirements-quality review, not implementation acceptance.

**Created**: 2026-10-31

**Feature**: [spec.md](../spec.md)

**Review Ownership**: Reviewer-owned. Checked markers mean requirements-quality approval, not implemented behavior. Generation leaves all markers unchecked; implementation must not change them.

## Requirement quality

- [ ] CHK001 Does assembly identity cover every version/source/target/artifact/prerequisite and retained supporting-input obligation? [Completeness, Spec FR-001/002/003]
- [ ] CHK002 Are candidate, staged and verified-published states distinguished from current-download authority? [Clarity, Spec FR-004]
- [ ] CHK003 Are complete retained snapshots and all-version rendering/search/topic/schema checks specified? [Coverage, Spec FR-005/006]
- [ ] CHK004 Are both pre-publication and canonical-record promotion gates required without allowing candidate pointers? [Consistency, Spec FR-007/008]
- [ ] CHK005 Are historical meaning, dated corrections and major glossary review obligations defined? [Coverage, Spec FR-009/010]
- [ ] CHK006 Are partial upload, lost acknowledgement and existing foreign/published conflict outcomes specified? [Coverage, Spec FR-011/012]
- [ ] CHK007 Are previous-pointer preservation and post-publication promotion retry requirements compatible? [Consistency, Spec FR-008/012; Edge Cases]
- [ ] CHK008 Are existing native builders, renderer and unsupported target distinctions retained? [Dependencies, Spec FR-003/014; Assumptions]
- [ ] CHK009 Do fixture acceptance criteria separate service simulation, actual native proof and real publication? [Measurability, Spec SC-001/002/003/005; Assumptions]
- [ ] CHK010 Are source/timing/focus/review/publication boundaries and scope exclusions explicit? [Constraints, Spec FR-014/015/016]

## Notes

Standard depth for PR reviewers; focuses on release identity/recovery and retained-documentation promotion. No extension hooks exist. The installed prerequisite helper requires the plan scaffold, which was initialized before checklist generation; design remains the following phase. Autopilot authorizes proceeding through implementation without changing reviewer-owned markers.
