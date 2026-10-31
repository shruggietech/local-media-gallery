# S020 verification

## Planning gate, 2026-10-31

Installed Spec Kit specify/clarify/checklist/plan/tasks/analyze prerequisites completed. Requirements8/8 and reviewer-owned recovery10/10 PASS. Read-only cross-artifact analysis: 18 buildable requirements/success criteria,24 tasks,100% task coverage,0 critical/high/medium findings,0 unmapped tasks and0 constitution conflicts.

Coverage: FR001-003 T003-T011; FR004-006 T012-T015; FR007-008 T016-T018; FR009 T006/T020; FR010 T003/T005/T011/T012/T015/T016/T018; FR011 T002/T020/T021; FR012 T019/T021/T023; FR013 T001/T022/T024. SC001 T010/T011/T018; SC002 T012-T015; SC003 T003/T011/T012/T016-T018; SC004 T019/T021/T023; SC005 T022-T024.

No extension hooks are installed. Implementation has not yet been qualified. External review rounds used:0/2.

## Local implementation checks, 2026-10-31

PASS: npm run check; npm test (132 tests,131 pass,1 expected POSIX-only Windows skip); full app check (workspace formatting, core/native units, workspace/all-target Clippy warnings denied, TypeScript/ESLint/Stylelint and brand contracts); website production build and exact raw-source/site check. Rust app55, transaction11, Windows ownership7 and macOS applicable3 unit cases pass. Cross-compilation checks for gallery-update and gallery-macos-package pass on x86_64-unknown-linux-gnu and aarch64-apple-darwin. Builder/campaign module syntax checks pass. Local commands remained hidden/headless; no local GUI, keyboard or screen-reader campaign was run.

Convergence inspected13FRs,5buildableSCs,9acceptance scenarios,8implementation decisions and5constitution principles. One partial high-priority regression coverage gap became T025; staging-collision, wrong-target/edition and actual held/running executable cases were added and the Windows transaction suite passes11/11. No additional implementation gap was identified in that bounded inspection. Native hosted execution and delivery tasks remain pending; this is not final convergence or native acceptance.

Native supervisor/private Windows ACL and same-filesystem exclusive displacement refinements are recorded in plan/research/data-model/contracts. No release/tag or merge is performed. External review rounds used:0/2.

## Initial publication and review, 2026-10-31

Official PR72 opened automatically at df72ac85dd0371940cdfc47e1893b3aebed453a7; #25 Project status is PR review, SliceS020. Initial hosted run41182586278 passed repository and website scopes. Linux package preparation identified five SC2015 guard expressions; replaced them with explicit if branches. Cross-platform Clippy identified the macOS update argument list; grouped optional transaction settings in UpdateOptions and Linux/macOS all-target Clippy then passed. Artifact upload now retains descriptors and complete copied transaction evidence for independent post-run readback.

Review round1 completed on df72ac8 with one P1 finding (comment4431023410): a native supervisor incorrectly required an executable after native uninstall. Both prior/next checks now call the shared existence-aware Transaction::active helper. The missing-live recovery and active-executable regressions pass in the transaction11/11 suite. Actual MSI/dpkg qualification remains required. No second review has been requested yet. External review rounds used:1/2.

## Native preparation follow-up, 2026-10-31

Initial macOS lifecycle unit failure was the test temp root /var alias, refused by the physical receipt reader. The fixture now uses its canonical root; product CLI destinations already canonicalize their physical parent. Windows actual package execution reached the first update and returned access denied before activation. Retained MSI flushing reopened an owned file read-only; the flush now uses a writable retained-file handle as required by FlushFileBuffers, while supplied MSI inputs remain read-only and locked against substitution.

The macOS paired campaign now mounts the actual replacement DMG read-only or extracts its actual ZIP and verifies the replacement helper/container files before executing update. Windows installer/process tools resolve through GetSystemDirectoryW rather than a caller environment path. Local transaction/macOS applicable units, workspace Clippy and package/campaign syntax checks pass after these corrections. Hosted acceptance is still pending. Review rounds remain1/2; no extra review triggered.

## Second hosted pass and final review request, 2026-10-31

Run41183802933 on b3008b8 passed repository, website, Windows product and Linux product scopes. macOS product reached54/55 passing app tests; the remaining compatibility fixture used the /var alias and now canonicalizes its root (local probe test passes). macOS package user update/rollback/all three interruption boundaries passed, including actual replacement DMG execution. The subsequent system replacement ordinary browsing check did not discover the fixture; retained bytes/transaction diagnostics remain available and acceptance is not claimed. Windows package baseline browsing failed before the update campaign. Preserve actual observer stderr/app output and macOS last AX tree/failure window captures on the next pass, without weakening deadlines/assertions. Linux package execution is still pending.

Second and final Codex round was requested on b3008b8 at issuecomment6541074444. Review rounds used:2/2. Do not trigger another review. The first finding4431023410 remains replied to and its thread resolved.

## Debian ownership query correction, 2026-10-31

The cold Linux package preparation completed in905.372s, separately from qualification. Its baseline APT reinstall hit the finite native capture deadline at115.920s qualification, before update cases. Incoming/recovery ownership checks introduced one full dpkg database search per file. Those checks now batch all observed physical paths into one dpkg-query invocation and retain nonzero-query, foreign-owner and diversion rejection. No timeout or acceptance assertion was relaxed. Existing Node regressions pass131/132 with the expected Windows POSIX skip. Hosted package acceptance remains pending.

Final Codex review receipt6541101439 completed on b3008b8 with no major issues and no unresolved findings; two rounds total are complete. Subsequent pending changes concern fixture/diagnostic corrections and the measured Debian query inefficiency; no further bot trigger is authorized.

## Windows event classification correction, 2026-10-31

Run41185020293 passed repository, website, all three product scopes and the complete macOS package campaign. macOS qualification333.306s after487.371s preparation, combined820.677s. Windows passed actual installed Full browsing and reached recovery, where the observer incorrectly required clientPid on an MSI administrative-extraction event. Extraction now emits native-preparation-client; native-client remains reserved for the independently recorded active replacement client. Asynchronous malformed-event assertions now fail through the retained diagnostic path. Local Clippy and builder/campaign syntax pass. This is not Windows package acceptance. No review round beyond the completed2/2 is triggered.

## Final regression and readiness correction, 2026-10-31

Convergence added T026 for two previously implicit rejection cases. Replaced live-parent directories preserve both original and foreign bytes; Unix linked-parent recovery refuses; a Windows recovery-file DACL altered to grant Everyone is rejected twice without repair or content change. Local Windows transaction12/12 and ownership8/8 pass with warnings denied; Unix adds the linked-parent case under hosted verification.

Current Windows product readiness failed with a live child and answering /status listener while session creation was repeatedly aborted after2s. A real child-server regression with2.4s session creation reproduced the failure under the old code. Session creation now consumes only the remaining original absolute readiness deadline, preventing duplicate session creation after a premature client abort. The regression and existing nonce/PID/absolute-deadline tests pass; the15s readiness limit and identity requirements are unchanged. No new review trigger is issued after the completed2/2 rounds.

## Windows prepared-boundary wait correction, 2026-10-31

The retained run41186711156 failure capsule independently shows the ordinary Full user transaction restored with a terminal native worker code0; the interrupted case was prepared with its administrative-extraction record already terminal/code0. The harness unnecessarily queried that exited PID, and PowerShell returned silent exit1 despite catching ArgumentException. Prepared/activated cases now use their explicit terminal receipt; a genuinely nonterminal supervisor still receives a bounded process wait. That wait explicitly returns0 for an already-exited PID and1 with diagnostics for other errors/timeouts. The absent-PID PowerShell check and module syntax pass. Recovery still independently refuses active/indeterminate native state; no acceptance deadline or state verification is skipped.
