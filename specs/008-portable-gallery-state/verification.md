# S008 verification

## Planning and baseline

2026-10-24: actual branch codex/008-portable-gallery-state, selector specs/008-portable-gallery-state, issues #8/#9. Installed Spec Kit phases completed through blocking analysis (30 requirements/success criteria mapped to 22 tasks). The checklist helper required a plan earlier than the protocol; resolved its installed template through the paths-only helper without changing phase order. Clarified interrupted writes as a valid prior document or a fully committed replacement.

Real baseline regressions: the portable contract test failed because $defs/portableSettings did not exist; the qualified prior native app failed the rendered assertion that [data-save-destination] exists with controls collapsed. Existing startup/contract checks passed before that assertion. These were feature regressions, separate from subsequent implementation checks.

## Incremental evidence

2026-10-24: five schema tests passed. The first native implementation run passed 20/21 tests; its Windows hard-link fixture was denied by the filesystem sandbox. Re-running the same tests through the approved hidden launcher without that restriction passed 21/21. Later expanded persistence tests passed 23/23; rendered Windows acceptance passed all 21 groups, including retained media/viewer/geometry checks and the A/B/portable/conflict/inheritance/forget/unavailable/fresh-profile relocation journey. These incremental runs precede the final source identity and do not substitute for final qualification.

A hidden check-app run passed core tests, Clippy, TypeScript, ESLint, Stylelint and exact governed brand/glyph checks. Additional final persistence/identity fixtures were then added; final qualification remains pending.

## Delivery

No S008 push or PR yet. Review rounds used: 0. Owner final review and merge remain the delivery boundary. Native Linux/macOS runtime, large collections, installers and Lite dependency closure are not qualified by these Windows functional fixtures.

The first full preparation attempt stopped at Clippy before readiness (122.089s preparation, 0s qualification). The Windows read-only fixture reset permissions with set_readonly(false); it now restores the original permissions exactly. No qualification pass was claimed. Final review also added an incompatible-native-encoding preservation regression before activity writes and bounded selected JSON retrieval.

The expanded unit run passed 27/28. Windows correctly denied renaming a root while its capability handle remained open; the fixture now asserts that Windows behavior, checks a distinct directory identity, then proves post-close stale writes cannot alter the relocated settings. The Unix held-root rename test remains platform-gated for native Unix execution.

## Final local qualification

Terminal pass at 2026-10-24T19:36:59.805Z. Preparation began 2026-10-24T19:32:57.906Z; readiness verified 2026-10-24T19:34:03.770Z. Preparation 65.864s, qualification 176.035s, combined 241.899s. Target 660s, hard limit 900s, provisional finalization reserve 15s; no target overrun. All ten elected steps passed.

Qualified source SHA-256 1118c20ec004c708c645aee431d3e44306b231f8f191a549e6b471a06af55ea3, 939 files. Only the explicit current/prior delivery-record exclusions in scripts/provenance.mjs are excluded. Repository integrity (UTF-8/no BOM/LF/mojibake/local links/version), 51 Node tests, documentation, Rust formatting/Clippy, 12 core tests, TypeScript/ESLint/Stylelint, unchanged brand proof, generated-site integrity, rendered site accessibility/performance, 28 native shell/state tests, 21 rendered Windows groups, normal binary/test-hook exclusion and final provenance all passed.

Native acceptance started 2026-10-24T19:35:41.068Z, finished 2026-10-24T19:36:52.992Z, binary SHA-256 ba2b5501d35e6735f9ca5a94f94b9bdd1d19d8054b0bee859d9a28cf35065d4b. Normal binary SHA-256 b48c84e9b2b12ebd39b1b68dd04a0c0dad33f91db1b8db28a46f7116ce41063b. The normal test launches selection without touching owner history. The native fixture isolates both user settings and machine history. Media fixture bytes remained unchanged. Windows-held-root rename denial and post-close stale writes are verified; the Unix held-root rename case is not claimed as Windows evidence.

Changes in tasks.md and this verification record finalize delivery evidence without changing the qualified source digest. Hosted exact-head CI and review acceptance remain pending.
