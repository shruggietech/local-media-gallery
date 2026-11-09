# S038 qualification repair tasks

## Setup and foundation

- [x] T001 Preserve both failed run artifacts and track the repair in issue #118; document evidence in specs/038-v030-release-preparation/repair/research.md.
- [x] T002 Complete Spec Kit specification, clarification, checklist and design in specs/038-v030-release-preparation/repair/.

## US1: Bounded complete qualification

- [x] T003 [US1] Add failing routing and ownership regressions in tests/windows-package-cohort.test.mjs, including historical defaults and explicit invalid markers.
- [x] T004 [US1] Implement elected group routing and receipt selection in scripts/windows-package-cohort.mjs, scripts/test-windows-packages.mjs and scripts/build-windows-packages.mjs.
- [x] T005 [US1] Add failing initialization, deadline, denial and source-tamper regressions in tests/windows-package-observer.test.mjs.
- [x] T006 [US1] Implement one bounded initialization in scripts/windows-package-observer.mjs, scripts/Invoke-WindowsPackageObserver.ps1 and scripts/windows-msi-ui.ps1; bind it into scripts/test-windows-packages.mjs.

## US2: Evidence integrity and compatibility

- [x] T007 [US2] Add malformed readiness, PID, apartment, source-hash and missing-proof cases in tests/windows-package-cohort.test.mjs and tests/windows-package-observer.test.mjs.
- [x] T008 [US2] Require valid new initialization proofs in scripts/windows-package-cohort.mjs while retaining historical packets.

## Verification and handoff

- [x] T009 Run targeted regressions, npm run check and npm test; inspect encoding and record results in specs/038-v030-release-preparation/repair/verification.md.
- [x] T010 Research transfer duplication and update specs/038-v030-release-preparation/repair/plan.md; repeat analysis gate with FR-008.
- [x] T011 Add failing round-trip, integrity, aliases, bounds, deadlines, repeated/partial hydration and compatibility regressions in tests/windows-evidence-transport.test.mjs.
- [x] T012 Implement scripts/windows-evidence-transport.mjs and bind it in scripts/ci-windows-package-cohort.mjs, scripts/windows-package-cohort.mjs, scripts/windows-package-evidence.mjs, scripts/release-assembly.mjs, scripts/build-windows-packages.mjs and .github/workflows/ci.yml.
- [x] T013 Run targeted and full repository checks; record dated decision in CHANGELOG.md.
- [ ] T014 Push the completed repair, complete hosted review and exact-head CI, and hand off for owner merge through PR #119.
- [ ] T015 After owner merge, accept only new successful trusted-main artifacts and resume authorized publication; retain operational evidence under .local/s038-publication/.

## Dependencies and strategy

T001 -> T002 -> initial analyze gate -> T003 through T009 -> preserved native acceptance/transfer failure -> T010 -> repeated analyze gate -> T011 -> T012 -> T013 -> T014 -> owner merge -> T015. Both user stories remain required. No further unchanged Windows retry. One unchanged macOS cleanup diagnostic retry is running against the first repair head, preserving original evidence and assertions.
