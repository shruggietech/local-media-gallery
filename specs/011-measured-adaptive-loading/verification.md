# S011 Verification

## Setup and design (2026-10-25)

Base main a0b85881fdf6b9db080d67d70bd7b25bb4a5839a; branch codex/011-measured-adaptive-loading; selector specs/011-measured-adaptive-loading; complete issues #16/#17. Project 8 marks both In progress, Slice S011.

Installed Spec Kit1.0.8 skills mode/Python: specify -> clarify (five autonomous decisions) -> performance checklist -> plan (three required read-only research agents) -> tasks. No extension hooks. Requirements checklist16/16; custom performance checklist0/12 remains reviewer-owned. Owner autopilot authorization permits implementation after analysis without an approval pause. Explicit push/official PR authorization persists; merge/release remain owner operations. Review request cap2.

Baseline binary preserved and receipt hash matched before any rebuild: 1316bdda17deb24f1208231d124eacee3459defdbebd2362a68dc2ac19ec72e0, debug/native-tests flavor, source da459c15f126e1156529c1b012818c9105522b269cb85afa5ebfdbba9983b78e. Raw identity/native receipt in .local/s011-baseline/identity.json.

## Implementation acceptance

Final implementation accepted by the qualification recorded below; hosted CI and bounded PR reviews remain delivery work.

## Analysis and baseline checkpoint (2026-10-25)

Read-only analysis mapped all12 FR/5SC to24tasks,100%coverage,0blocking findings/conflicts/unmapped tasks. Baseline measured three native trials and preserved source inventory. Initial observer timeout and profile temporary-file finalization race were harness failures; retries completed after operation-specific diagnostics and explicit incomplete footprint accounting. See measurements.md for exact observations and proposal rationale.

Test-first regressions reproduced absent report helpers, missing dynamic loader APIs and throwing-cleanup accounting, absent policy, invalid loadingMode accepted as unknown schema/native settings, and missing native counter APIs. All targeted helper/policy/queue/schema/native settings/core feature checks passed after implementation. A sparse slow-frame regression additionally reproduced evidence being discarded between windows, then passed with accumulated finite evidence. Native regression against the preserved old binary passed27existing groups before failing at the absent Loading strategy control, as expected.

## Pre-qualification integration (2026-10-25)

69 Node tests,35 native shell/state tests and35 core tests under discovery-tests passed. The core feature run includes13metadata and one actual resource-permit lifetime test. The restricted-token Node rename/symlink fixture failures passed unchanged under the elected elevated hidden launcher. Initial rendered integration reproduced suppression of errors on an already-settled mounted image; the guard was corrected to distinguish a removed source from a current source. All31 Windows rendered groups then passed, including new loading/visibility/relocation behavior. Final qualification follows on the final source, including the stricter load-event guard and actual settings-envelope schema check.

## Initial full qualification failure (2026-10-25)

Source947a2589fb06382fafb157e56fdb290bdcc1055554b0eaec94474cbe4ae3640c,981files. Preparation47.523s,qualification176.437s,combined223.960s; terminal2026-10-25T13:12:28.227Z. Repository,70Node tests,app/site/browser,shell and31native groups passed; native measurement failed on the environment observer timeout. Normal exclusion/provenance steps did not run. Preserved .local/s011-first-qualification.json. Replace broad environment CIM/volume enumeration with direct OS/drive reads; keep bounded process CIM identity observation, improve observer terminal error handling, and measure actual lazy metadata expansion in both baseline/final with the same harness. Documentation now states the exact at-least-half slow-sample rule. A complete rerun is required on the corrected source.

## Corrected full run and final ownership check (2026-10-25)

All11steps passed on sourcedc2f1fee30b67e38888605e00c2fdecec14ac01bd286249c6d952a16ee696406 (981files), terminal 2026-10-25T13:20:50.809Z: preparation29.684s,qualification150.5s,combined180.184s. Rendered and measured binary hashes match a0c24d4f989d3544c4840ede1edd7096803f47837b0a37648c5e187f04cf3139. Retained .local/s011-corrected-qualification.json. Final review of the memory observer identified a PID-reuse interval between CIM enumeration and .NET counter reads; compare creation identity before and after capture before accepting a process record. Requalify this final observer change rather than inheriting the previous source acceptance.

## Final implementation qualification (2026-10-25)

All11 elected steps PASS, terminal 2026-10-25T13:26:30.249Z; preparation 28.380s, qualification 149.415s, combined 177.795s. Source 893d4a98a2f25ef9ab7f14768cb1a62d4c151c28099cab1feee01f5a5ebcb322, 981 files; native rendered and measured binary 2de9e02e7503154a1994771f4210bf222550b7dbb21eee7faf22dced71233716. Receipt .local/s011-final-qualified.json. All70 Node tests,33 default core tests,35 shell/state tests and31 Windows WebView groups passed, plus the earlier35-test discovery-tests core suite including actual resource lifetimes. Website rendering/accessibility, normal artifact hook exclusion and source/brand provenance passed. Both final measurements have six complete process endpoints with before/after creation-identity checks.

Target660s and hard900s satisfied,15s reserve preserved. Receipt-only tasks.md,verification.md,measurements.md are excluded from the source digest; all normative code/tests/spec/research/contracts/docs remain hashed. See measurements.md for paired observations and platform/scale/cache/packaging limits.

## Official PR publication (2026-10-25)

Commit930e32e9053af1a6badd2cfabbdb7fc786440f92 pushed to codex/011-measured-adaptive-loading; official non-draft PR#50 closes #16/#17 on owner merge. Both Project8 items are PR review,Slice S011; issues remain open. PR-open automatic Codex review is round1; at most one additional requested round is authorized. Hosted Qualification run40198238185 is in progress. No merge/tag/release performed.

## External review round1 (2026-10-25)

Codex PR-open review completed at 2026-10-25T13:36:46Z on930e32e9053af1a6badd2cfabbdb7fc786440f92, has_any_findings=false, has_unresolved_findings=false. Summary issuecomment6398306327. No second review requested because round1 found no issues. Individual review thread audit follows in final handoff.

## Hosted acceptance and delivery receipt (2026-10-25)

Qualification run40198238185 PASS on PR head930e32e9053af1a6badd2cfabbdb7fc786440f92 and synthetic merge cc5a04668a821eee737f2fba0d69214f928404e2. Downloaded all three evidence artifacts and asserted result/step success, identical source893d4a98a2f25ef9ab7f14768cb1a62d4c151c28099cab1feee01f5a5ebcb322,981files and exact synthetic revision.

| Hosted scope | Preparation s | Qualification s | Combined s | Terminal UTC |
| --- | ---: | ---: | ---: | --- |
| repository | 23.914 | 1.856 | 25.770 | 2026-10-25T13:35:08.770Z |
| website | 74.628 | 56.312 | 130.940 | 2026-10-25T13:36:53.940Z |
| product-windows | 351.663 | 76.324 | 427.987 | 2026-10-25T13:41:57.488Z |

Deploy-pages correctly skipped on this ordinary PR. Hosted build/unit/browser evidence is separate from the31 local actual Windows WebView groups and three native measurement trials. Review summary completed with no findings and Codex thumbs-up at2026-10-25T13:36:48Z; zero individual inline threads and zero unresolved findings. One review round used, no manual retrigger.

This delivery commit changes only excluded tasks/verification receipts. Before owner handoff, recheck unchanged qualified source, terminal final-head CI, exact hosted source/revision receipts, review threads, PR/issue/project states and clean local worktree. The PR body retains immutable final-head CI evidence without another receipt-only commit cycle. Owner final review/squash merge/remote branch deletion remain pending; no release or merge performed.
