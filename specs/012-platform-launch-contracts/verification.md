# S012 Verification

## Specification and design (2026-10-25)

Base: 92563aeb36092a3e082df00b3ccea19abb47b024. Branch: codex/012-platform-launch-contracts. Selector: specs/012-platform-launch-contracts. Issues: #5 and #7.

Used installed Spec Kit 1.0.8 in skills/Python mode with sequential numbering and hyphenated commands, actual template/prerequisite/setup helpers and no extensions/hooks. Five autonomous clarifications settled common capabilities, exploratory proof scope, wait/detach, independent processes and unavailable future providers. Requirements checklist: 16/16. The custom platform-launch checklist retains 12 reviewer-owned unchecked markers. Explicit owner autopilot/proceed and push/PR authorization governs continuation; merge/tag/release remain owner operations.

The plan skill required three read-only research agents. Analysis mapped 14 functional requirements and 6 success criteria to 29 tasks (100%). I1 (high) corrected hosted acceptance ordering to publication T027 followed by hosted read-back T028. D1 (low) removed duplicate edition-feature ownership: T007 introduces it and T011 reuses it. No remaining critical/high/medium findings, unmapped requirements or constitution conflicts.

## Test-first implementation

Three exact-path regressions failed before the shared NativePath/fields existed, then passed. A failed pending selection retains the old usable session but must not borrow it for the new operation result; per-discovery session attribution fixes this boundary.

Parser, placement, exact native arguments, status/exit mappings, proof inventory and owned schema tests failed before their implementations. Receipt tests reproduced a queued-acknowledgement/child-exit race, then passed after queued valid receipts were admitted before checking child exit. Tests also cover mismatched nonce/PID, malformed/oversized/slow receipt input, absolute deadlines, known early exit, timeout without killing the child and rejected late acknowledgement. The final native suite includes 11 launch tests in each edition.

The actual launch harness rejected the preserved S011 binary at --version --json. Its first S012 run passed four groups then misclassified a typed OperationResult.error object as a WebDriver error. Restricting the WebDriver error test to its string protocol field corrected the harness; all six groups passed. Preliminary archives and native results remain separately identified in measurements.md.

## Integrated preparation and corrected acceptance

The first complete preparation rebuilt all four variants and exported the site, then failed before readiness on Clippy items_after_test_module and collapsible_if. Preparation: 61.172 s; qualification: 0 s; combined: 61.172 s. Move the notification function before tests and collapse the conditional; neither lint was suppressed. Correct the public invalid-placement exit description to the implemented failure category.

All 14 checks subsequently passed on source 8e634b9de725af2971db8e682aeba89de74863a728f5a08732fb3204c0e73331 (1,000 files): preparation 44.374 s, qualification 214.377 s, combined 258.751 s. A final cross-chapter scan found two architecture sentences still describing U-08 as unsettled. Correct those links and rerun complete qualification against final normative source. Preserve .local/s012-code-qualified.json independently.

## Final local acceptance

PASS all 14 elected checks on d7b7b19a787e8b008af321c52591189bfb7dcdd6a6c5aa212ef56c56f1b64dac (1,000 files). Preparation: 38.242 s; qualification: 203.859 s; combined: 242.101 s. Terminal completion: 2026-10-26T00:40:05.695Z. Target 660 s, hard limit 900 s and finalization reserve 15 s respected.

Acceptance includes 75 Node tests, 36 core tests, 45 Full and 45 Lite shell/state tests, 31 existing rendered native groups, 6 Full/Lite launch groups, 10 extracted CLI checks per edition, both ordinary artifact windows/listener/private-hook exclusions, 288 website artifact hashes, rendered browser checks, three measurement trials and source/brand integrity.

Full native functional, launch and measurement hashes agree. Each edition launch hash matches its native-test binary; each normal proof hash matches ordinary-window acceptance. Local proof revision names base 92563ae while the content digest binds the final working tree; hosted receipts bind the committed PR merge revision separately. Proof archive, executable, extracted and shared-runtime footprints are separate. Final installers and native Linux/macOS GUI behavior are unqualified.

## Publication and first review

Commit 248d648bc9f05497c5d73c84e3bfb4cd3ad9fcd7 pushed to codex/012-platform-launch-contracts. Official non-draft [PR #51](https://github.com/shruggietech/local-media-gallery/pull/51) opened and attached to the chat. Both issues moved to Project 8 PR review / S012 and remain open until owner merge.

PR-open review is round 1. Codex completed it at 2026-10-26T00:43:39Z with no findings and zero review threads. At most one second request remains available. Hosted run 40250562599 uses synthetic merge e51aee8fe45cc4b10f08da850b69a8028cbfdfab; hosted native proof/read-back and final delivery receipt remain pending.

## First hosted macOS failure and fixture correction

Run 40250562599 failed native check:app on macOS 15.7.9 arm64 at discovery.rs:172: the filesystem rejected the invalid UTF-8 fixture filename with OS error92 (Illegal byte sequence), before discovery. Preparation 505.575 s, qualification 25.992 s, combined 531.567 s. Preserve .local/s012-first-macos/ci-product-macos.json and its original source/merge identity separately.

Keep actual grant/metadata isolation tests on macOS using distinct Unicode filenames admitted by its filesystem; retain invalid-byte filesystem fixtures on Linux and unpaired-code-unit fixtures on Windows. Add an all-platform in-memory regression proving two colliding lossy display labels retain distinct native encodings and operation roots. No test is skipped, and no product path eligibility rule is introduced. The analogous metadata fixture is corrected before the next macOS run. Full local qualification and hosted acceptance must rerun on the corrected source.

## First hosted Ubuntu failure and compression-only correction

Run40250562599 passed repository, website and Windows native proof. Ubuntu native check:app passed core tests, then its isolated pinned brand verifier rewrote comparison PNG encodings and failed identity-report/manifest hashes. Preserve .local/s012-first-hosted receipts and original failed run. Add a consumer-side PNG save adapter limited to128checksum-verified comparison files: require exact regenerated mode/dimensions/pixels, keep original compressed bytes, execute unchanged recovered verifier and all manifest checks. Test-first wrapper import failed while absent. Four regressions cover identical pixels with different compression, changed pixel rejection, size/mode rejection and unlisted ordinary outputs. Complete local/hosted qualification must rerun; installed kit and recovery bytes are unchanged.

First Ubuntu receipt: preparation 846.558 s, qualification 30.493 s, combined 877.051 s; result fail. Fixture-only correction local qualification passed on 8dcf05ffbbc0db302a29a27c35be263a0b81a7ebbc03e12c7047c1263a059acd in 212.429 s (256.367 s combined) before the subsequent brand adapter source change. Full pinned Windows verifier and glyph checks pass through the new adapter with all128pixel comparisons and four regressions; no manifest checks are omitted. Standalone Python tests initially hit sandbox temp permissions; all test temp directories now explicitly belong to repository .local and pass without elevation.

## Accepted hosted corrections

PASS all14elected checks on 1831abfb52c71eba111f26d2d9a58366143c71b15e3ea6821ecba53311da73d6 (1002files): preparation 42.789 s, qualification 213.719 s, combined 256.508 s; terminal 2026-10-26T01:06:59.001Z. Acceptance retains75Node,37core,45Full/45Lite,31nativegroups,6launchgroups,10normal extracted checks/edition,4Pythonpixel-equivalence regressions,128exact comparison pixels and all pinned verifier/manifest checks, ordinary-window exclusion,site/browser,measurements andsource/brandintegrity. Both initial hosted failures remain separately attributed; no corrected hosted acceptance claimed until its own terminal receipts pass.

## Second hosted Ubuntu failure and lock ownership

Run40252676385 Ubuntu passed core/app/strict brand checks, then failed two existing history expiry tests with history_unavailable/lock would block in their280-write loops (42shell tests passed,2failed). Preparation422.788s,qualification37.836s,combined460.624s. Preserve .local/s012-second-linux. Parallel child startup can inherit an open-file-description lock until exec even after the original owner closes its descriptor; this is consistent with the unique-fixture failures and documented fork/dup semantics. Two deterministic owner/early-error regressions failed to compile before the missing StateLock helper existed, then exercise release before a duplicate descriptor closes. Reuse explicit unlock on every return across all three state writers; preserve immediate real contention and all existing tests. Complete local and hosted qualification remain mandatory on this changed source.

## Second hosted macOS failure and SQLite ancestor aliases

Run40252676385 macOS15.7.9arm64 passed core/strict brand/frontend, then36shell tests passed and8failed on unable to open database paths under /var/folders. Preparation545.954s,qualification103.46s,combined649.414s. Preserve .local/s012-second-hosted. SQLite NOFOLLOW rejects symbolic-link components; resolve Unix ancestors before opening while rejecting final database symlinks and preserving missing-parent reads without creation. New missing-parent/resolver regression failed to compile before database_path existed; Unix native alias/final-link regression exercises the actual VFS boundary in hosted acceptance. No access check is removed.

The first StateLock local preparation failed Clippy redundant_closure_call in the new error-return regression before readiness (54.731s preparation,0s qualification). Replace the immediately invoked closure with a named test helper, retaining the actual early-return boundary and suppressing no lint. Nine focused Windows history tests, including missing-parent behavior, pass after the native SQLite resolver; Unix alias/final-link acceptance remains hosted.

## Accepted operation-owned locks and native SQLite parents

PASS all14checks on 812bc5c0109f7a16cef9b9d4ec523c3054e99e5c8b04a6be462871c717ec3086 (1003files). Preparation 42.94 s, qualification 207.945 s, combined 250.885 s; terminal 2026-10-26T01:30:02.092Z. Includes75Node,37core,48Full/48Lite shell/state,4Python and128exact comparison images,31rendered native groups,6launchgroups,10extracted checks/edition,ordinary artifact exclusion,site/browser,measurements andprovenance. Native Unix parent alias/final-link regressions remain elected in hosted acceptance; no platform result is inherited from Windows. This corrects the second hosted lock/SQLite failures without serialization, retries, skipped tests, disabled NOFOLLOW or changed governed bytes.
