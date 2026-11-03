# Tasks: S027 v0.2.0 publication and verification

**Status convention**: This file records the pre-push execution snapshot. Post-push CI, acquisition, reviews and tracking closeout are recorded with completed task IDs in the official PR closeout comment and GitHub issue/project state, avoiding a record-only rebuild.

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [publication contract](contracts/publication.md).

## Phase 1: Setup

- [x] T001 Create aligned branch/feature/selector and operational issue #85; retain scope and authority in spec.md.
- [x] T002 Complete clarification, requirements checklists, research and design in spec.md, plan.md, research.md, data-model.md, contracts/publication.md and quickstart.md. Run blocking analysis before operations.

## Phase 2: Foundation

- [x] T003 Require successful exact-main run 41595557848 and independently retain/replay original artifacts, source identity, clocks, literal products, assembly and docs with .local/s027-readback.mjs. Record in verification.md. (FR-001, FR-002, FR-008)
- [x] T004 Capture predecessor canonical/API asset identities and immutable documentation source hashes in .local/s027-predecessor.json; record baseline in verification.md. (FR-005)

## Phase 3: User Story 1, publish accepted products

**Goal**: Actual canonical v0.2.0, preserving accepted bytes.

**Independent test**: Publication run and all anonymous asset hashes agree with approved candidate.

- [x] T005 [US1] Dispatch existing release.yml on unchanged main with 0.2.0/0.1.0/highlights, retain original execution ZIPs and recover only same-candidate owned state if necessary. Record execution in verification.md. (FR-001, FR-002, FR-003, FR-009)
- [x] T006 [US1] Independently replay both retained production gate exports, canonical state/source/tag/latest and every anonymous artifact using .local/s027-published-readback.mjs. Record identities and clocks in verification.md. (FR-002, FR-003, FR-004, FR-008)

## Phase 4: User Story 2, verify public discovery and acquisition

**Goal**: Actual public site and recipients select the published product.

**Independent test**: Complete public inventory matches retained export; acquisition selects canonical 0.2.0.

- [x] T007 [US2] Verify all deployed bytes, three documentation versions, current/latest aliases, search/switcher and six package links through .local/s027-live-readback.mjs; compare predecessor API/canonical and frozen source identities. Record in verification.md. (FR-004, FR-005)
- [ ] T008 [US2] Inspect audit-PR isolated native prepared-recipient receipts and independently replay retained archives; require 0.2.0/canonical candidate identity. Retain evidence and report in official PR comment. (FR-004, FR-008)

## Phase 5: User Story 3 and closeout

**Goal**: Inspectable audit and owner-controlled merge.

**Independent test**: Official PR exact head checks/review threads and campaign state agree with final evidence.

- [ ] T009 [US3] Finish internal verification.md with source/run/asset/gate/site evidence, run npm run check and npm test plus affected checks, check UTF-8/LF/mojibake and diff; push/open official PR automatically. (FR-007, FR-009)
- [ ] T010 [US3] Complete green exact-head PR CI, respond/resolve every review comment within automatic opening plus at most one requested second round; retain exact-head readback in PR comments. (FR-007)
- [ ] T011 [US3] Close issue85/M3 only after successful actual publication/public acquisition readback, update project and deliver owner final review/merge handoff without merging PR. (FR-006, FR-007)

## Dependencies and parallel work

T001 -> T002 -> T003/T004 -> T005 -> T006 -> T007 -> T009 -> T008/T010 -> T011. T003 and T004 may run independently. Public static and asset observations may run independently after successful execution; no simultaneous writers to shared staging. Audit PR native campaigns run on separate hosted hosts; no published products are rebuilt or replaced. Reviewer-owned checklist questions remain unchecked under the explicit end-to-end autopilot instruction.

## Implementation strategy

Deliver actual publication and independently verified public assets first, then one complete audit commit and PR. Later CI/review receipts belong in PR comments, avoiding a record-only commit that restarts all native builds. Necessary review fixes still require fresh exact-head checks. No new product tests are elected without a demonstrated code defect; existing mandatory checks remain required.

## 2026-11-03: Post-publication CI follow-up

- [x] T012 Correct the demonstrated version-specific current-documentation assertion in scripts/test-site.mjs, preserve canonical authority/version/package checks, record the failure in verification.md and chronological CHANGELOG.md, and pass the complete local repository/docs/site suite. Final exact-head CI remains covered by T010. (FR-007, FR-009)
