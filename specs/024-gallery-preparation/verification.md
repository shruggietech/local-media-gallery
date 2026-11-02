# S024 verification

## Qualified implementation

Implementation revision: 07adf79510d658a3f0290dbaa6780ee46a8fb95e. Logical source: 9f85ea82011203759fbe95df48a5c1d6a59c06562e9a323cbea7dfbe91f576d2 (1489 files). Run [41381517704](https://github.com/shruggietech/local-media-gallery/actions/runs/41381517704) passed all nine applicable scopes. Original evidence ZIPs were downloaded and checked against their GitHub API SHA256 digests before decoding. Independent assembly reproduced native candidate 25fcd50a389d0e6471dad67a287789479ea0fb0b89362e38a95648560c2e3318 and verified all 7 native artifacts, source/revision bindings, qualified clocks, package inventories, runtime/GUI evidence, actual candidate documentation and controlled publication gates. All 10 original ZIPs remain retained locally.

Each Windows x86_64, Linux x86_64 and macOS aarch64 preparation campaign used the canonical published v0.1.0 Lite package. Independent readback verified the published record, original archive, full extracted bundle, root launch copies, executable-mode metadata, original media and sidecars, repeated reuse, and actual in-place/relocated explicit Refresh observations. Lossless whole-gallery ZIP/tar evidence preserves modes through Actions artifact transport. The published release remains 0.1.0; software/docs/schema 0.2.0 are an unpublished candidate.

## Local checks

At the same implementation source, npm run check, npm test, npm run check:docs, npm run check:app, Full/Lite native shell and guided coordinator units, npm run check:site and npm run test:site passed. Website build, compiler checks and verified prerequisite readiness occurred during preparation. Local checks were headless; GUI, keyboard, media and accessibility observations ran on isolated hosted desktops.

Preparation: 16.888s. Qualification: 85.725s. Combined: 102.613s. Readiness: 2026-11-02T03:06:58.622Z. Terminal completion: 2026-11-02T03:08:24.347Z. Hosted timing is recorded in measurements.md. The 660s target is advisory; all accepted qualifications respect the 900s hard limit and 15s provisional finalization reserve. No required functional, integrity, provenance or elected check was removed.

## Corrections and retained failures

The first local preparation stopped on a Clippy prerequisite expression before qualification began (24.376s preparation, 0s qualification); its receipt/log were retained. Subsequent local qualifications passed after each correction.

Run 41372284388 at 85023de exposed shutdown-state access before Tauri setup managed the guided service. Initialization now populates an owned cell during setup and shutdown reads it after run_return. Failed native artifacts/logs were retained; obsolete runs were canceled or superseded.

Run 41373664391 at 7dc04a8 passed all package campaigns and native Linux/macOS products. Its Windows product acceptance read backend readiness before Apply rendered. The script now requires matching rendered/backend state and enabled visible buttons within bounded waits, with failure state/screenshots retained. Windows guided native acceptance subsequently passed.

Run 41376190407 at 9339e4c initially passed every Windows native package scenario but reached the 885s reserve boundary during independent readback (885.417s qualification, 802.855s preparation). Independent diagnostic validation of its retained native/package bytes passed, but that timed-out qualification was rejected. An unchanged-source Windows retry completed all elected checks in 712.740s after 595.483s preparation, with an advisory target overrun. Original failed Windows artifact 13112128943 (707065816 bytes, SHA256 b561ebaa8070977944832f72539384a1fdaddd5161017c977dd70a587c343791) and its full log were verified and retained before failed upload-slot cleanup.

The same source produced two macOS accessibility observations containing only windows/menus despite correct rendered media and settings, first on system Full and then on the unmodified published 0.1 recipient. Originals 13111023563 (105885511 bytes, SHA256 86fb33267874522189d581ab522bdbce66d2b96fb355e12fa3b2edcd6d9fac25) and 13113347143 (248363277 bytes, SHA256 e57fe5c8ef4c3a87a93d49fbd726ac0a924e096ae89564037a24f4a65284b3a3), full logs and attributed screenshots/trees were retained. The external observer now keeps its AX connection and notification run loop alive, waits for real WebKit descendants inside its existing 8s budget, and records activation/readiness metadata. All ten successful observations at 07adf79 required 4-5 scans and exposed real WebKit content; none recorded hash collisions. The campaign passed with 312.452s qualification and 457.115s preparation. CFEqual-based hash buckets also correct the former unique-hash assumption, and indexed BFS removes array-shift work.

## Reviews and handoff

Two authorized Codex rounds are complete. Round one at 85023de found stale no-op portable-settings reuse. Commit 407637c revalidates the actual regular, non-linked destination, detects external edit/deletion and preserves the external state; its thread is resolved. Round two at c68c4a4 reported no findings. Later changes affect native acceptance synchronization/observation and evidence, with no product implementation change after that reviewed source. No third round is requested.

This record pins the last changed implementation source. Only tasks.md, verification.md and measurements.md are excluded evidence updates in this slice. A subsequent record-only commit must retain the exact logical source above; the final PR handoff must pin that commit and its own terminal CI/readback. Issues 27/79 remain open in PR review until the owner merges [PR #81](https://github.com/shruggietech/local-media-gallery/pull/81). Merge and release publication remain owner-controlled.
