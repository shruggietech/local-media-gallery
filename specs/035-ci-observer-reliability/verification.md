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

PR #113 opened at e4897c2103cdd496fa953bb2c28e5a96d5b5f240. Automatic hosted review round one completed at 2026-11-08T14:03:39Z with no findings and a bot thumbs-up. No explicit second round has been requested. At most one explicit second round is authorized. Owner performs final merge. No published product or release version changed.

Independent anonymous public readback verified the Linux Lite SHA-256 and embedded product revision/source, canonical metadata and unchanged identities for all four published releases. Actual public Linux recipient execution remains pending the hosted native campaign.

## 2026-11-08: first hosted attempt retained

Run 42487685876 at e4897c2103cdd496fa953bb2c28e5a96d5b5f240 used explicit branch-head checkout (temporary merge SHA only labels transport artifacts). Repository, website and macOS/Windows native product campaigns passed. Package acceptance remains pending.

Original macOS artifact 13621220217 (614575199 bytes) was read by exact provider ID using ZIP central-directory ranges and per-entry CRC, retaining ci-macos-packages.json, the build, 17 passing compiled selftests, failure and observer.json. Preparation 500.960 seconds, qualification 247.479 seconds, combined 748.439 seconds; result failed. It confirmed the actual current coordinator stopped at the generation-bound partial-app boundary and live authority refused replay. KILL returned zero, then BSD-info arg=0 returned ESRCH while kill(pid,0) still saw an unreaped process. The observer correctly refused to claim retirement.

The correction uses the SDK-supported BSD-info arg=1 zombie lookup, adds an actual owned unreaped-child regression, and bounds signal history. A subsequent successful original hosted packet is required; this failed packet is never substituted for one. Windows wizard requests also now carry their owned MSI client PID for creation-time checkpoints.

## 2026-11-08: public Linux recipient independently completed

Original Linux artifact 13620617704 from run 42487685876 at e4897c2 is 2402989206 bytes, provider SHA-256 192cbd94e9cea1d2001e24055b19859938b7180917ae98cc4c3775ed20735ad7. Exact-ID ZIP ranges checked original entry CRCs. The retained prepared archive, inventory, executable mode, canonical release, public Lite bytes and embedded product source passed independent readback. Observer source differs from delivered v0.2.2 product revision 494ecc3 as intended.

Actual public Lite launched in place and after relocation; explicit Refresh rendered the added green fixture. All three original PNG hashes passed, and independent decoding found 626090 expected-color pixels per frame. Retained settings/media/sidecars and repeated-preparation reuse passed. All eight tone/silence monitor observations contain 16384 samples / 65536 bytes at 48 kHz; no partial acceptance. Preparation 1249.659 s, qualification 337.524 s, combined 1587.183 s, result pass. The fresh final-head Linux run remains separately required.

## 2026-11-08: SDK regression passed; update-root admission repaired

Run 42489263001 at e6dcd09 retained original macOS artifact 13620674723 (614663941 bytes; provider SHA-256 fa7394bb9054be9d5408886363dc47fde1b0b96ecfba5e02962fbaefa3ff3849). All 18 compiled selftests passed, including the real unreaped-child case. First-install interruption confirmed stopped state, live refusal, real retirement and Installer exit 1; the campaign proceeded through first-install recovery. The later update interruption failed on multiple matching helper processes. Preparation 398.630 s, qualification 297.164 s, combined 695.794 s; failed, never accepted.

The original snapshot omitted the second actor. Source inspection shows native command spawning can transiently expose the same executable in a fork child before exec. Selection now records bounded matching snapshots and admits the unique new same-executable family root, excluding its children and pre-existing families. Independent roots still refuse. New compiled and receipt regressions cover these distinctions (21 compiled cases elected); the receipt validator independently recomputes the chosen root. The next hosted attempt must supply actual family and recovery evidence.

Initial Windows lifecycle artifact 13620933780 (5064232657 bytes; provider SHA-256 3c626624ee9db959ec175313ff8299d65032456504c2fe36534a5b3f7ac98095) passed independent checkpoint/file-hash readback. All 29 lifecycle checks passed. The bounded journal retained the last 256 of 831 records, final cleanup closed, native observer and target creation identities were present, and all five diagnostic hashes matched. Experience and final-head reconciliation remain separate.

Initial Windows experience artifact 13621159123 passed independent original journal/native checkpoint and all five diagnostic hashes. Its bounded journal retained 256 of 3518 records and closed after observer teardown. Both ordinary v0.2.0/v0.2.1 upgrade journeys, eight choice cases and existing maintenance/retention assertions passed. Experience qualification 784.192 s (advisory target overrun, below the unchanged hard limit); complete reconciliation artifact 13621466889 passed at 816.409 s qualification / 2178.329 s combined, with 1361.920 s preparation. Both workers and the gate used the same absolute clock. Final-head Windows evidence remains separately required.

## 2026-11-08: cold Windows ownership query failure corrected

Run 42490907587 at 872f85d, product-windows job 128762853717, retained original artifact 13622210736 (41904537 bytes; provider SHA-256 478283886f2bffdee23093c55f7e764e2ce37063e3442748b0b38aa0ab0b5db3) and job logs. Native Full/Lite archive, media and accessibility checks passed, then the real legacy-listener regression failed: HTTP ready at 110 ms, no ownership observer response within ten seconds, overall readiness failure at twelve seconds. Preparation 347.066 s, qualification 193.476 s, combined 540.542 s; failed, never accepted.

A new real IPv4/IPv6 regression with Get-NetTCPConnection deliberately unavailable reproduced the provider dependency. The replacement uses documented SDK owner-PID tables in a once-compiled helper, preserving actual foreign-owner refusal and original deadlines. All 26 listener/driver tests pass locally, including the unchanged legacy test and the new unavailable-CIM/foreign-owner case. The existing authored-file encoding check now also covers the new C# source and C bridge. Fresh hosted confirmation remains required.

## 2026-11-08: macOS operation-bound interruption independently passed

Original macOS artifact 13622097747 from run 42490907587 at 872f85d is 697185692 bytes, provider SHA-256 16e9b4a7503b50a08231471e38628524016ddae9c66c217e18526d0247d9a317. Exact-ID ZIP ranges and original-entry CRCs retained the complete build/result/qualification receipts, compiled selftests and both raw observer packets. Independent validation recomputed the unique coordinator root from family/birth/path/digest facts, expected package/generation and prelaunch snapshot.

Both actual first-install partial-app and update prepared-phase interruptions confirmed stopped status 4, revalidated STOP/KILL identities, real retirement, live-authority refusal and Installer exit 1. Ordinary same-package recovery succeeded without JSON operands, followed by rollback/repeat/uninstall and offline native rendering. All 21 compiled cases and complete package readback passed. Preparation 674.349 s, qualification 498.200 s, combined 1172.549 s. The successful capture did not retain a multiple-helper snapshot, so the second attempt's transient-child explanation remains source-derived; root selection is covered by explicit family regressions.

A real held-fork SDK case is additionally elected for the final run (22 compiled cases), proving parent/child executable identity and root selection deterministically. The Windows direct listener repair passed the complete 342-case local suite (340 pass, two platform-specific skips). Its new provider and final-head native scopes remain pending fresh hosted confirmation.
