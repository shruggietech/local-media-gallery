# Measurements: S035

## 2026-11-08: planning

No new native qualification result is claimed. Retain 660-second advisory target, 900-second hard limit, 15-second reserve and terminal timestamp authority. Record actual preparation, qualification and combined durations separately after each verified readiness boundary.

## 2026-11-08: local checks

Final local Node suite: 9.6513403 seconds, 340 cases (338 pass, two platform-specific skips). Site browser verification: 65.645 seconds, ten groups. These are local tooling checks, not native qualification timings. Actual hosted preparation, qualification and combined durations remain pending.

## 2026-11-08: initial hosted macOS package attempt

Run 42487685876 at e4897c2: preparation 500.960 s, qualification 247.479 s, combined 748.439 s; failed SDK retirement observation after confirmed interruption. These figures preserve the original readiness and terminal timestamps. No native package acceptance is claimed.

## 2026-11-08: initial hosted Linux package attempt

Run 42487685876 at e4897c2: preparation 1249.659 s, qualification 337.524 s, combined 1587.183 s; all Linux package and actual public prepared-recipient checks passed. Eight complete native PCM windows; three independently decoded recipient PNGs. Readiness and terminal timestamps remain authoritative.

## 2026-11-08: second macOS and initial Windows lifecycle

Run 42489263001 at e6dcd09, macOS: preparation 398.630 s, qualification 297.164 s, combined 695.794 s; first-install recovery passed, later update-root selection failed. Run 42487685876 at e4897c2, Windows lifecycle: preparation 1361.920 s, qualification 380.546 s, combined 1742.466 s; 29 checks and independent original diagnostic readback passed.

Initial Windows experience: preparation 1361.920 s, qualification 784.192 s, combined 2146.112 s, pass (advisory overrun). Complete Windows gate: preparation 1361.920 s, qualification 816.409 s, combined 2178.329 s, pass. Transport/readback elapsed time remains inside the same original cohort window.

## 2026-11-08: initial current-head Windows product failure

Run 42490907587 at 872f85d: preparation 347.066 s, qualification 193.476 s, combined 540.542 s; unanswered legacy listener owner query, failed. Local repaired driver/listener suite: 26/26 pass in 9.4804511 s; original real legacy owner case 0.681471 s and unavailable-CIM/foreign-owner case 0.7100258 s. These local timings are not hosted qualification results.

## 2026-11-08: successful macOS package campaign

Run 42490907587 at 872f85d: preparation 674.349 s, qualification 498.200 s, combined 1172.549 s; complete package campaign and independent original interruption/refusal/recovery readback passed. All 21 compiled selftests passed. The final run additionally elects a real held-fork SDK regression (22 cases).

## 2026-11-08: current implementation and hosted-review regression

At b9186cd, Windows product: preparation 413.903 s, qualification 338.412 s, combined 752.315 s, all steps pass including direct listener ownership. macOS packages: preparation 515.921 s, qualification 581.744 s, combined 1097.665 s, complete pass; 22 compiled cases included actual held-fork parent/child SDK facts. The post-review local suite passed 343 cases (341 pass, two platform skips) in 9.6779579 s. The changed termination-reference path still requires fresh hosted CI.

## 2026-11-08: controller fixture readiness regression

At 3a38d4c, original macOS package artifact 13624229343 independently passed 22 compiled cases and both real interruption/recovery journeys: preparation 575.287 s, qualification 450.389 s, combined 1025.676 s. The same run failed the Windows experience pre-campaign controller regression and was cancelled after its original failure packet and successful macOS packet were retained. Its incomplete scopes do not grant acceptance.

The readiness-admitted real controller regression failed in 1.681 s when the production reference-release repair was removed, then passed all three scenarios after restoration. Full local suite: 9.6989039 s, 343 cases (341 pass, two platform skips). The five-second readiness bound is separate from unchanged 40 ms operation and 40 ms termination test bounds; no native campaign limit increased.

## 2026-11-08: readiness-corrected implementation receipts

Run 42498777911 at 5737356: repository preparation 25.212 s, qualification 19.220 s, combined 44.432 s; Windows product preparation 296.583 s, qualification 327.404 s, combined 623.987 s; macOS packages preparation 568.164 s, qualification 540.342 s, combined 1108.506 s. All passed, with independently read original source-bound receipts. Remaining package scopes are recorded after their terminal evidence.

Run 42498777911, original Linux artifact 13625358440: preparation 1180.561 s, qualification 333.686 s, combined 1514.247 s; complete package campaign and independent public-recipient readback pass. All eight PCM windows completed within four seconds. Independent original PNG decoding found 626090 expected-color pixels in each of three frames.

Run 42498777911, Windows lifecycle artifact 13625965504: preparation 1460.279 s, qualification 351.290 s, combined 1811.569 s; all 29 checks and independent checkpoint/diagnostic readback pass.

Run 42498777911, Windows experience artifact 13626315192: preparation 1460.279 s, qualification 733.842 s, combined 2194.121 s, pass with advisory target overrun. Final Windows gate artifact 13625887016: preparation 1460.279 s, qualification 754.348 s, combined 2214.627 s, pass. Both remain below the unchanged 900-second hard limit with terminal timestamps authoritative.

## 2026-11-08: complete implementation acceptance

Run 42498777911 completed all twelve applicable jobs successfully on 5737356; production Pages deployment intentionally skipped for this PR. Aggregate release-validation artifact 13626560007: preparation 168.488 s, qualification 225.762 s, combined 394.250 s, pass. Each scope retains its own readiness and terminal timestamp authority; the complete workflow wall time is not a single qualification window. The final evidence-only commit preserves implementation source 7f7da549 and receives a separate fresh head run, recorded on PR #113 before handoff. No native acceptance threshold or 15-second reserve changed.
