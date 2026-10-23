# Tasks: Website foundation and hosted qualification

**Slice**: S005 | **Issues**: #6, #28, #29, #30 | **Branch**: codex/005-website-foundation

## Phase 1: Setup and contracts

- [x] T001 Create specification, clarify scope/publication, research and design artifacts (FR-011/012).
- [x] T002 Add independent apps/site workspace, exact locked renderer/browser dependencies and generated-output ignores (FR-001/002/006).
- [x] T003 Write failing tests for manifests, link confinement, historic assets, search, raw integrity, schema/example/release validation and qualification failure/deadline accounting in tests/site.test.mjs and tests/qualification.test.mjs (FR-001 through FR-005, FR-007/008/011/012).

- [x] T012 Run blocking analysis and reviewer quality gate before implementation (FR-001 through FR-012).

## Phase 2: User stories 2 and 3, versioned reading and references

- [x] T004 Implement site/versions.json and scripts/site-content.mjs source/parser/link/heading/search/schema/release contracts (FR-002/003/004/005/011).
- [x] T005 Implement build-time staging, raw inventories and static export in scripts/build-site.mjs with source/artifact manifest (FR-002/004/005/007/012).
- [x] T006 Implement docs pages, docs-only search/version/diagrams and generic schema tree in apps/site/src (FR-002/003/005/006).
- [x] T007 Implement exported route/fragment/asset/raw validation and synthetic historical/browser fixtures in scripts/check-site.mjs and scripts/test-site.mjs (FR-002 through FR-006).

## Phase 3: User story 1, independent landing

- [x] T008 Implement landing, development/release availability, support/license/changelog and shared brand shell without docs-only landing runtime (FR-001/005/006).

## Phase 4: User story 4, hosted evidence

- [x] T009 Implement shared qualification failure/deadline records in scripts/ci.mjs and proportional existing-runner corrections; update current evidence exclusions (FR-007/008/009/012).
- [x] T010 Add pinned least-privilege hosted workflow and automated self-hosted desktop dispatch path using existing commands (FR-007/009).
- [x] T011 Update official website/verification contracts, README/contribution commands and dated changelog decisions (FR-011/012).

## Phase 5: Qualification and authorized publication

- [x] T013 Complete local repository/app/brand/native/site qualification with exact artifact/source evidence and separate timings (FR-001 through FR-009/012).
- [x] T014 Commit/push official PR, attach PR, map Project Slice S005, wait for hosted results and apply/read back required checks after passing (FR-007/010/012).
- [x] T015 Respond to every review finding, resolve individual threads and if needed request at most one second round; verify final-head terminal CI and hand off before merge (FR-012).

## Dependencies and execution

T001 precedes all work. T003 runs red before T004/T009. T004 precedes T005/T006; T005/T006 precede T007/T008. T009/T010 integrate completed command definitions. T012 gates source implementation. T013 precedes T014; T015 is the final delivery gate. No parallel source mutations are planned.

## Delivery status

PR #33 was squash-merged as 8609b996a4036307754927714dd8224f7621116f on 2026-10-23. All three merged-main qualification checks passed. Issues #6, #28, #29 and #30 are closed and their Project items are Done. Both original review findings were fixed, replied to and resolved.
