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

## Windows qualification cost correction, 2026-10-31

Run41188348478 on6a827c4 passed seven scopes; Windows package qualification terminated at885.146s to preserve the15s finalization reserve. Preparation829.746s is separately recorded. Full user update/rollback and all three actual interruptions completed, with four restored retained transactions and terminal native code0. Machine interruption execution was still underway; complete Windows acceptance is not claimed. Failed artifacts remain retained.

Independent readback passed for the seven completed scopes, all six product runtime archives/binaries/media records/notices, the exact310-file website export, actual Linux Debian/TAR interiors and macOS ZIP/container digests, Linux native15 frames/four media observations, and20 retained macOS/Linux transactions bound to their original source/manifests. macOS qualification353.893s after535.929s preparation; Linux qualification603.860s after687.077s preparation.

The Windows trace showed repeated directory ancestry traversal and effective-owner lookup over1212-file inventories. Per-pass physical namespaces now retain no-delete directory handles and reuse each checked ancestor; every leaf hash and ACL remains freshly inspected. Final local1200-notice verification improved435ms to266ms and retained staging16.99s to12.25s. New wide-inventory and shared-parent-pin lifetime regressions preserve changed bytes and reject parent replacement; altered-ACL rejection reuses the same validator to prove file ACL results are not cached. Native process cases, selected-state checks, per-file flushes and the660/900/15 qualification accounting remain unchanged. No further review trigger is issued after2/2 completed rounds.

Local follow-up PASS: npm run check; npm test132pass/1expectedskip; Windows transaction13/13, ownership9/9; warnings-denied all-target Clippy on Windows plus Linux/macOS coordinator targets. Installer payload and allowed-union inventory checks also reuse pinned physical ancestry, removing duplicate full-path traversals while validating each present leaf and redirected missing path. All qualification scopes must rerun on the changed source before acceptance.

## Native same-layout reinstall correction, 2026-10-31

Run41191236523 on20a4a00 again passed seven scopes. Windows preparation1025.401s was separate from qualification885.156s; the preserved15s reserve stopped the campaign during machine recovery after complete user recovery. Local ancestry batching improved measured work but did not bound the full hosted campaign. Failed artifacts remain retained, and no Windows acceptance is claimed.

The native adapter unnecessarily removed an installed product before every same-layout PackageCode exchange. Following the already researched Windows Installer small-update path, compatible same-version protocol1 packages now use native recaching reinstall. Actual read-only Component/File/Feature/FeatureComponents/Directory/ProductVersion rows must match under hash-locked installer handles; version/product/scope/layout/legacy differences retain native remove/install. The local metadata regression passes against the retained real pair, detects a deliberately changed component GUID in a disposable copy and verifies the original layout is unchanged. No MSI installation or GUI was run locally. Hosted user/machine actual-pair regression and all elected recovery cases remain required. Two review rounds stay complete; no further trigger is issued.

Local follow-up PASS: repository check; Node132pass/1expectedskip; transaction13/13 and ownership9/9; explicitly elected actual native MSI layout proof1/1 (with the actual user pair and hash-locked inputs); Windows/Linux/macOS warnings-denied target checks; website production build/raw-source check; CI module syntax. The ordinary Rust test pass explicitly marks the prepared-MSI fixture test ignored until separately elected with supplied actual archives; the Windows package CI scope elects it for both user and machine pairs.

## Native source filename correction, 2026-10-31

Run41194471361 on65cb11e passed the actual-MSI layout regression for both user/machine pairs, then Windows qualification failed at165.638s after692.573s preparation. Windows Installer source resolution requested local-media-gallery-user.msi beside the renamed next-package.msi. It returned1603 before replacement. This is a missing source filename, not a demonstrated signature requirement; no signing or machine policy change is elected. The incomplete transaction and native log remain retained.

Native reinstall now reads the existing scope's actual PackageName with MsiSourceListGetInfoW, stages the verified candidate under that basename in a per-job private source directory, writes its header/side/archive binding and keeps input/parent handles until the native client terminates. The companion does not modify the Windows Installer cache or source list directly. Source leaf validation refuses traversal/streams/invalid names and accepts Unicode names. Local Windows transaction13/13 and ownership10/10 pass, alongside the previously elected real-layout proof. Hosted completion/readback remains pending and review rounds remain2/2.

## Command integrity pass correction, 2026-10-31

Run41196280401 on8ec0487 passed seven scopes. Actual source-name-preserving MSI reinstalls, user update/rollback and all user interruption cases passed. Windows again reached the885.165s reserve boundary during machine recovery, after736.257s preparation. The source-name fix is functional, but complete Windows acceptance remains pending.

Recovery commands previously performed the same complete retained-input scan during open and again before the command. The fused resume API keeps the standalone open contract and performs every command integrity check once before observation/mutation, with authority ACL checks before parsing on Windows. Up to eight bounded read-only inventory workers stream64KiB hashes, validate all modes/ownership/private ACLs and join before effects. Windows registration/integration checks reuse the already verified candidate bytes. Native supervisors retain independent validation. New regression: status/recover/rollback each reject tampered retained bytes and preserve the live installation. Local Windows transaction14/14, package10/10 and applicable macOS3/3 pass; benchmark1200-notice verification197.6ms versus266ms before this refinement. Retained staging remains measured separately and is not claimed faster. The harness logs command/boundary durations for further diagnosis; no deadline, functional case or integrity requirement is dropped. Review rounds remain2/2.
