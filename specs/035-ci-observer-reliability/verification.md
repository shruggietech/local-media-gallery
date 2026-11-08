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

After retaining original successful macOS artifacts and the diagnosed Windows failure, superseded run 42490907587 was cancelled to release queued runner slots. Its incomplete remaining jobs cannot grant acceptance. The current corrected head must run every applicable scope afresh.

Second and final hosted code review requested on implementation b9186cd9dd77d2b0c2a457394d9c1a6ff15be782. Two rounds total are now used; no further trigger is authorized. Findings and final CI remain pending.

## 2026-11-08: final hosted review finding and real-process regression

Hosted round two completed on b9186cd with one P2 finding (thread PRRT_kwDOVUAZgc61B42W): a settled failure could still retain the live ChildProcess handle and block controller exit. A real child/controller regression reproduced the hang after the termination promise rejected.

Settlement now destroys its stdin/output pipes, unreferences an owned IPC channel and the unobserved live process handle, and preserves original exit/EOF observations plus an explicit controller-reference-release fact. The tree helper and its watchdog cannot retain a controller beyond a shorter outer budget. A separate owned control socket retires test children without PID-based cleanup. Actual-controller cases cover plain stdio, explicitly referenced IPC and a stubborn tree helper with a longer watchdog. All 343 local tests pass (341 pass, two platform skips), including the real controller exiting naturally with process.exitCode=1 while exitObserved and stdioClosed remain false.

All b9186cd hosted scopes subsequently passed. The review correction changes the implementation, so it must receive fresh exact-head CI before owner handoff. No third hosted review round will be triggered.

The P2 correction was pushed as 3a38d4ccafbd920ffb63b8a2feb1d0c85f63631a, replied to in comment 4506820581 and thread PRRT_kwDOVUAZgc61B42W resolved. Both authorized review rounds are complete; no further trigger will be issued. Fresh correction-head CI remains required.

## 2026-11-08: real-controller fixture readiness corrected

Run 42497214766 at 3a38d4c retained the original Windows experience failure in job 128784861774 and artifact 13624516198 (21831 bytes; provider SHA-256 bcbff549bc234a36ee916005b024d169a0dafcb8ee481d75b1ef40e0bf137119). The new real-controller regression failed waiting for its owned child socket, before native experience admission. Its 80 ms settlement clock had begun before the real child/helper readiness handshake, mixing process startup with the operation being tested. This packet is failed evidence, never package acceptance.

The fixture now waits for authenticated child/helper readiness before asking the controller to begin the unchanged 40 ms operation plus 40 ms termination bounds. The controller disconnects its parent control channel before measurement; child IPC remains deliberately referenced in the IPC case. Readiness has a separate finite five-second bound and scenario-specific diagnostics. Removing the production reference-release repair still makes the admitted real controller hang (preserved red log); restoring it passes all three actual stdio, IPC and stubborn-helper cases. No product or qualification deadline changed. Fresh hosted verification remains required.

## 2026-11-08: readiness-corrected native receipts

Run 42498777911 explicitly checked out 57373565e99446a0a1d478841f17ecb55774eb64 (temporary merge SHA dead38579d0e3d7d35cc56f3c9cfb0c8ba1d7451 labels transport artifacts only). Repository artifact 13624796339 and local source recomputation agree on SHA-256 7f7da54936faf22b2122a769353230405920ac3f9664dd5d12884ac6c86ff807, 1721 files. The three designated internal evidence files remain excluded; requirements, plan, implementation and regressions remain included.

Original macOS artifact 13625161732 (697236005 bytes; provider SHA-256 e445053df61bd4c6f049b1ae2594aaa0d4ef9f27f3b06b8a3c18c374739d9b60) passed exact-ID ZIP-entry CRC and independent SDK/root/binding/readback. All 22 compiled cases, including actual unreaped and held-fork actors, passed. Both first-install and update interruptions confirmed stopped status, per-signal identity, live-authority refusal, retirement and Installer exit 1; ordinary same-package recovery succeeded without JSON operands. Preparation 568.164 s, qualification 540.342 s, combined 1108.506 s.

Original Windows product artifact 13623949731 (42076365 bytes; provider SHA-256 bb3c886896011d48c13528ce1fa6632b2a817b4232b726825e0eecfd6baa9b79) passed source-bound readback. All twelve native qualification steps passed, including the actual direct-listener/unchanged-baseline regression, browsing, preparation, launches, measurements and normal GUI exclusion. Preparation 296.583 s, qualification 327.404 s, combined 623.987 s. These completed native results do not substitute for remaining package workers.

## 2026-11-08: current-head public Linux recipient completed

Original Linux artifact 13625358440 from run 42498777911 (2403031399 bytes; provider SHA-256 d77572cf8c9258368f94ffaad3f67de7ec3bf4e78664f720ed6c2ecaa42d4c97) passed exact-ID ZIP-entry CRC and independent prepared-recipient replay. The retained archive SHA-256 is 948b0a606e623b0cf9879f0d59eb6ba797c0b7a4dc92852125f22532fa9c61e2, 7194895 bytes; modes, actual public executable, immutable canonical record, original media/settings/sidecar retention and repeated-preparation reuse all passed. The delivered binary remains public product 494ecc3 / source 410b3ee3, separately from observer 5737356 / source 7f7da549.

Actual public Lite launched in place and after relocation under an ordinary XDG profile with system-only PATH and no private native hooks. Explicit Refresh rendered newly added green.png. All three original PNG hashes passed independent Pillow decoding with 626090 expected-color pixels each; the relocated green frame was also visually inspected. All eight native output-monitor windows contain exactly 16384 samples / 65536 bytes at 48 kHz, with complete delivery within four seconds; silence retained no-input observations before and after. No partial window or old-pass fallback was accepted. Preparation 1180.561 s, qualification 333.686 s, combined 1514.247 s, result pass.

## 2026-11-08: current-head Windows lifecycle readback

Original lifecycle artifact 13625965504 from run 42498777911 (5064242295 bytes; provider SHA-256 59ec3608a930a4059ff9de013e2a43c7916227d6768f52d938870ea1c09c5a63) passed exact-ID ZIP-entry CRC and all five retained diagnostic file hashes. Revision/source, shared clock, native observer creation identity and final close/terminal ordering independently matched. All 29 lifecycle assertions passed; the bounded journal retained 256 records and explicitly counted 581 dropped older records, ending closed after teardown. Preparation 1460.279 s, qualification 351.290 s, combined 1811.569 s. Experience and complete reconciliation remain separate.

## 2026-11-08: current-head Windows experience and reconciliation

Original experience artifact 13626315192 (86098992 bytes; provider SHA-256 c6265e08208ac34b0dd6ad6f314bc0b7a45a1a2129cf90cedb6a86d6d16c3d0f) passed independent exact-ID CRC, all five diagnostic hashes, source/clock/creation identity and post-teardown closure checks. The bounded journal retained 256 records and counted 3030 dropped records. Both ordinary v0.2.0/v0.2.1 MSI upgrade journeys and all eight installer-choice cases passed. Preparation 1460.279 s, qualification 733.842 s, combined 2194.121 s; advisory target exceeded, unchanged hard limit met.

Original Windows gate artifact 13625887016 (2311785608 bytes; provider SHA-256 f6a6e0d6181ff8823c190ac47951439026dddd5e4c3ff180e2e747e38077d35f) independently confirmed 5737356 / 7f7da549, both workers sharing one source/recipient/absolute clock, and complete package/native/retained-source/governed-byte readback. Preparation 1460.279 s, qualification 754.348 s, combined 2214.627 s, pass. All eleven upstream/native jobs are terminal-successful; aggregate release-validation is still required before final closeout.

## 2026-11-08: implementation acceptance and owner handoff preparation

Run 42498777911 completed successfully on exact branch head 57373565e99446a0a1d478841f17ecb55774eb64. All twelve applicable jobs are terminal-successful. Production Pages deployment is intentionally skipped on this non-bootstrap PR; no published site or release is changed. Original aggregate artifact 13626560007 (22136140 bytes; provider SHA-256 14626a8df8c1a26e242085f0d6893a3db27f52836b6e85c8557fd354b9edaf39) independently confirmed source 7f7da549, strict recovery regressions, exact package assembly, all retained documentation versions, current renderer/HTTP publication fixtures and governed bytes. Preparation 168.488 s, qualification 225.762 s, combined 394.250 s, pass.

Both hosted review rounds are complete. Automatic round one had no findings; final round two had one P2 retained-child-handle finding, fixed in 3a38d4c, replied to in 4506820581 and resolved in PRRT_kwDOVUAZgc61B42W. Readiness correction 5737356 retains the real-controller red/green proof. No third review was requested. The 343-case local suite passed (341 pass, two platform skips); current-head hosted product, package, website and aggregate checks supply separate actual native acceptance.

Public readback was repeated after qualification against the independent original baseline: all four historical release records, tags, asset identities, canonical bytes and actual public Linux Lite bytes/embedded product source remain unchanged. Linux public recipient verification is complete. No published v0.2.2 record or asset was replaced or uploaded. Native installers ran only on isolated hosted desktops; no owner workstation installer or GUI qualification is claimed.

Before implementation, stale local/remote refs were archived in an independently verified ignored bundle and removed. Superseded dependency PRs 104–107 were closed without merging their changes. Local and remote refs now contain only main and this active S035 branch; primary main remains clean and synced at 494ecc3. The active slice selector belongs to S035 and is retained until merge. Issues 110–112 remain in PR review and close through PR #113 after owner merge; unrelated issues 94 and 97 remain open.

This closeout changes only the three designated excluded evidence files. Its source digest must remain 7f7da54936faf22b2122a769353230405920ac3f9664dd5d12884ac6c86ff807 (1721 files). Owner handoff requires a successful final-head run after this evidence-only commit. The final SHA, run, source/artifact readback and resolved review state are recorded on PR #113 without recursively modifying this accepted evidence. The PR remains open with auto-merge disabled for the owner final review and merge ritual.
