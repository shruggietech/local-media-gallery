# S018 implementation and qualification evidence

**Date**: 2026-10-29

## Completed scope

[PR #67](https://github.com/shruggietech/local-media-gallery/pull/67) delivers issue #24: ordinary Linux Full Debian and portable Lite tar.gz candidates for Ubuntu 24.04 x86_64/X11. All17 tasks and all six issue acceptance criteria are complete. The issue remains open for owner final review and squash merge; no product release or local GUI/input was performed.

## Spec Kit and convergence

Installed specify/clarify/checklist/plan/tasks/analyze/implement workflows executed. Three read-only research agents resolved Debian lifecycle, recipient runtime/brand and isolated native evidence. Requirements checklists 8/8 and 9/9 pass;13 FRs/5 SCs map to17 tasks. Convergence checked18 requirements/success criteria,11 acceptance scenarios, eight design decisions andfive constitutional principles, with0 missing/partial/contradicting/unrequested findings and no appended phase. Converge itself left tasks unchanged; completion bookkeeping follows it. No extension hooks are registered.

## Verification performed

- Local headless check/test/docs/app and affected site gates pass. Node suite:121 tests,120 pass and one Linux-only actual launcher test skipped on Windows. Rust formatting/units/Clippy, TypeScript/style/brand, generated POSIX shell syntax, Python PNG/archive regressions and all source integrity checks pass. Hosted Ubuntu executes the actual launcher case.
- Site build/source/link checks and10 rendered groups pass:43 HTML pages,2,952 local links/fragments and32 exact raw sources. The additional Linux schema renders through the version registry.
- [Campaign 40964243851](https://github.com/shruggietech/local-media-gallery/actions/runs/40964243851) passed all eight scopes: repository, website, product-windows, product-linux, product-macos, windows-packages, macos-packages, linux-packages. Substantive head 7d5ba0e4042be8fe4838a3c14489a3dc5f3992fa and CI merge 93f9848a9e6411eb37885044f70cfc2cecec4e16 have equal trees. All receipts and current source bind SHA-256 0122b8add9ce23600779f7c26666ab74df37761b7b083a5786328127879f5701 (1,295 files).
- Actual Linux qualification passes all 11 cases: container/readback, prerequisite diagnostics, fresh ownership collisions, Full install/repeat, changed/missing/mode/Unix-owner/link/parent/candidate conflicts, removal/retention, config-files reinstall/purge, Lite in-place/explicit/relocation/Refresh and ordinary media. Same-candidate APT explicitly uses --reinstall. Failed-upgrade fallback and non-mutating abort-remove are exercised; no autoremove or user-data cleanup runs.
- Four ordinary release sessions use fresh XDG profiles and a system-only PATH, with exact ELF identities and no private candidate hooks. Actual AT-SPI/X11 input verifies portable settings, red/green native pixels, relocation/Refresh and Full/Lite tone/silent MP4. Thirteen PNGs were independently remeasured. Four PID-owned PulseAudio receipts show changing decoded crops,440 Hz-class tone and explicit silent/no-input results. No native clock, clean-machine provision or physical-speaker observation is inferred. Existing instrumented core clock/seek/media/accessibility gates remain unchanged and pass.
- Independent eight-scope readback verifies terminal accounting, source/revision identities, six native binaries and their media/screenshot receipts, six complete proof archive/license inventories, Windows/macOS package archive identities and new Debian ar/tar plus Lite TAR file/hash/mode/notice/footprint inventories. Exact governed icons and vendored GLib notices are checked.

## Failures retained and corrected

The initial missing implementation regression failed before code. The reused TAR reader accepted raw0777 modes after extraction normalization; a real red-to-green regression now rejects raw/special-bit drift before extraction. A second real ar/tar regression reproduced acceptance of an unlisted empty privileged directory; Debian directory entries are now limited to root or actual inventory parents. Valid parents still pass. New Python regression children explicitly use hidden Windows processes and closed stdin.

Campaign 40959952694 failed preparation before qualification because GALLERY_PROOF_NODE was missing. ab63ef8 fixes the export; artifact12934394828 and logs are retained. Campaign 40961023135 built actual candidates, then positive install refused the hosted image's writable shared parents; artifact12934734708 is retained. Its generic earlier negative reasons do not count as accepted collision evidence. The passing retry records eleven hosted directories normalized from0777 to 0755 during disposable CI readiness, retains root ownership, keeps recipient guards unchanged and asserts each intended conflict reason. Superseded pending campaign 40963271611 ran no qualification.

## Reviews, tracking and handoff boundary

Round 1 code review found one P1 missing interpreter export; ab63ef8 fixes it, the response is posted and the thread is resolved. Round 1 security reported no findings. Round 2 code and security completed on 7d5ba0e with no findings; security receipt 6509943425 and the review summary confirm completion. Zero unresolved threads remain. Both permitted rounds are consumed; no third review is triggered.

Linux packages is now an Actions-bound required status check in repository ruleset 25705117, preserving prior checks, strictness, conditions and bypass settings. GitHub issue #24 acceptance is checked and linked to the PR; closure/Done remains the owner's merge boundary.

Only `tasks.md`, `verification.md` and `measurements.md` receive record-only closeout changes. They are the same three progress exclusions registered before qualification; code, spec, plan, contracts, manifests and notices remain included. Final pushed-head checks and the terminal run/head are also required and are recorded in the live PR handoff, bound to this unchanged qualified source.

## Actual limits

Candidates are unsigned and unpublished. APT verified declared prerequisites on a prepared Ubuntu 24.04 host; clean-machine provisioning, other distributions/architectures and Wayland remain unqualified. Runtime footprint attribution is explicitly unavailable because those libraries are shared. [Measurements](measurements.md) distinguishes preparation, qualification and combined time and exact logical-byte bases. Owner final review and squash merge are the next publication boundary.
