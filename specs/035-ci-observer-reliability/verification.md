# Verification: S035

## 2026-11-08: setup and planning

Stale branch cleanup completed before implementation. Four explicitly requested pending Dependabot branches/PRs and the local S032 closeout branch were archived into a verified ignored Git bundle, then removed. Main is the only remote branch at this point.

Spec Kit specify, clarify, checklist, plan, tasks and read-only analyze completed. Eighteen requirements/criteria map to twenty-four tasks; both checklists pass. No implementation or hosted native pass is claimed yet.

Published v0.2.2 remains immutable; current harness source will differ from its product source. Capture and interruption failures from prior qualification remain diagnostic.

## 2026-11-08: publication baseline and local implementation

The independent baseline in ignored .local/s035-baseline.json confirms public v0.2.2 release 437393889, candidate 46c9505542a8bac42e92f0eaed7a0151fd5da5773678f3061b40d36cc01dcfa6, product revision 494ecc37634c25ed634a04ebf8c4a5d0a1b3aad8 and source SHA-256 410b3ee32ff8069bc0465d6717f5c17960635228b5b056c0f5b0a1bebbd8e030 (1707 files). Canonical bytes, provider asset identities and all four historical release records are retained for final immutability comparison. The public artifact source remains separate from this changed observer source.

Original failed run 42348649386 and diagnostic artifact 13564963299 remain evidence of a missed Linux silence window (65520/65536 bytes), not a completed recipient check. The original macOS missed interruption and Windows worker failure remain diagnostic observations; the historical Windows root cause is not proven.

Meaningful failing regressions preceded each repair. Local green results: npm run check; npm test (340 tests, 338 pass, two platform-specific skips); site build/check; ten rendered site browser groups (65.645 seconds). Focused tests cover both short final PCM chunks, missing EOF/exit, stalled command checkpoint, request close/deadline behavior, source/clock context and process creation identity. A real non-native PowerShell ping fixture caught ISO timestamp coercion; context JSON is now preserved verbatim and the fixture passes. No owner desktop UI or native installer was exercised.

macOS receipt regressions pass locally; SDK compilation, 17 compiled process-lifetime selftests and actual interruption/refusal/recovery are elected in hosted macOS CI and remain pending. Windows actual native campaigns and Linux public prepared-recipient execution remain pending hosted evidence. None of these local tests grants native package acceptance.

## Delivery accounting

Review rounds requested: zero. PR automatic hosted review will be round one; at most one explicit second round is authorized. Owner performs final merge. No published product or release version changed.
