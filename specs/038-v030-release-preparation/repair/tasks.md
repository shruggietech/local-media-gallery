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
- [ ] T010 Record dated internal CI decision in CHANGELOG.md, push repair PR, resolve hosted review and exact-head CI; record handoff in specs/038-v030-release-preparation/repair/verification.md.
- [ ] T011 After owner merge, accept only a new successful trusted-main qualification and resume exact-artifact publication; record operational evidence under .local/s038-publication/.

## Dependencies and strategy

T001 -> T002 -> analyze gate -> T003 -> T004 -> T005 -> T006 -> T007 -> T008 -> T009 -> T010 -> owner merge -> T011. Implement locally in sequence; read-only research was parallel. US1 independently proves complete bounded execution; US2 proves corrupted new evidence rejection and historical compatibility. Both stories are required before handoff.
