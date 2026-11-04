# S030 verification

## Delivery boundary

PR #96 implements issue #89 on codex/s030-windows-msi-installer. Source version 0.2.1 remains unpublished; v0.2.0 is the latest existing public release. Final merge and publication belong to the owner. No local installer, native GUI/input driver, temporary account or machine-policy fixture was executed.

## Performed local checks

Hidden repository checks, 274 passing Node tests with two platform skips, documentation validation, installer/update Rust units and strict Clippy passed. The affected site build, link and rendered accessibility checks passed. Read-only linked-MSI regressions reject the limited-privilege flag, same-GUID custom-action/Binary/CAB substitutions and source replacement after preflight. These authoring tests do not install the MSI.

## Hosted observations

- Earlier isolated runs exposed and retained actual failures in native MSI control automation, scope resolution, effective-user process launch, repeated native-input compilation, and the Windows Server non-admin MSI-policy fixture. Corrections are in the branch; earlier failures are diagnostic evidence, not successful acceptance.
- Run 41882070375 at e12d5a80a0a2378b00fdb0da852e124e631be599 completed Windows Full/Lite media and native accessibility successfully. Artifact 13349843601 binds that revision and source. Preparation was 365.635 seconds, qualification 381.765 seconds and combined elapsed time 747.400 seconds. Repository, website, Linux native and macOS native checks also passed. Installer and remaining package results were pending at this observation.
- Commit fa79a40f75fb99c57e5138a8b9c1e218126de3dc tightens cancellation acceptance to the post-launch vendor-install phase. Its superseded run was cancelled.
- The e12d5a8 non-admin campaign completed bundled runtime provisioning but failed during final MSI privilege-summary inspection. Commit 02fd15c327d30363b0bb3b76e8d888e10a979ef4 supplies complete API output buffers for the service boundary and separates native read errors from the limited-privilege check. Run 41886652796 subsequently confirmed successful real standard-user MSI installation, including offline bundled runtime, writer-state validation and source-authenticated retention. The post-install observer exceeded the credentialed Windows command limit. Commit 4232f13 moves that fixture readback into a UTF-8 script file; subsequent complete lifecycle CI remains pending.

- Runs 41890683513 and 41897541784 completed all seven non-MSI scopes successfully, but did not yield accepted MSI lifecycle evidence. The former was cancelled after prolonged execution. The latter reported main-step failure, then lost hosted-runner communication during evidence upload; its missing finalized job log/artifact leaves the underlying main-step failure unobserved. These runs are not MSI acceptance.
- Commit de94398 centralizes native quoted MSI arguments for exact published predecessor recovery and adds property-free cached repair readback with both optional features absent. Commit 269cd10 writes the original campaign failure before diagnostic copies, reuses complete snapshots, publishes a small status artifact first, and preserves the full required payload evidence without recompression.
- Run 41910304024 completed Linux/macOS native checks successfully. Its Windows Full runtime failed the 20-second initial driver-readiness deadline; the same owned process emitted complete WebView2/setup readiness while failure diagnostics ran. Commit 5f1273b allows 30 seconds for hosted Windows startup while retaining the aggregate qualification deadline. All 29 lifecycle/subprocess regressions pass locally. Its fresh run 41913040907 remains pending at this observation.

- Run 41910304024 subsequently finalized Windows installer failure evidence: artifact 13363998987 (small status) and 13364343544 (complete package evidence). Preparation was 1870.802 seconds and qualification 400.635 seconds. Native ownership units passed. Runtime cancellation and real standard-user offline installation/removal completed. The machine wizard MSI server returned 0, but the observer crashed on an unnamed progress-control label before completion readback; remaining lifecycle cases were not run. Commit 9f4b88a normalizes absent labels at the native boundary and handles them in wizard matching, with a focused regression. It also starts an existing 400-ms readiness-rejection test only after the fixture listener is ready. Hidden repository checks, 268 applicable Node tests (2 platform skips), documentation and observer syntax checks pass. Run 41917249172 is pending.

- At 9f4b88a, repository, website, all three native platform checks and Linux packaging passed. Native artifact IDs are Windows 13365478791, Linux 13365951779 and macOS 13366595652. Linux package artifact 13368335511 records 1433.009 seconds of preparation and 355.820 seconds of qualification. Windows MSI was still active without a terminal receipt at this observation.
- The macOS package attempt at 9f4b88a (artifact 13367651207) passed user/system lifecycle, update/rollback recovery, and collisions/retention. Its PKG interruption observer could not stop the discovered coordinator; the retained Installer output ends in successful installation. The intended interruption was not proved, so that case remains pending a fresh campaign. The failure is retained in its original artifact.
- Inspection of deadline handling found an independent fallback gap: a nonzero or stalled taskkill process could leave the owned child alive after the qualification deadline. The runner now bounds its own termination helper to three seconds and attempts direct termination through the original child handle. Six targeted regressions include a real owned Node child and failed/stalled helper observations. Hidden repository checks, 274 applicable Node tests (2 platform skips) and documentation checks pass. This correction is not evidence of the active hosted job's root cause.

## Reviews

All five received findings have code fixes, replies and resolved GitHub review threads. The initial automatic review and requested second code review were followed by a security-specific request that the service routed to an additional code-review job. This exceeded the requested two-round limit and was disclosed to the owner. No further reviews will be triggered. Resolved findings do not imply approval of an unreviewed later commit.

## Pending completion

Final-head successful installer lifecycle, independent evidence readback, terminal applicable CI, final task closeout and owner handoff remain required.
