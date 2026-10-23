# Verification: Website foundation and hosted qualification

**Local result**: Passed Windows x64 and rendered website qualification on 2026-10-23. Hosted CI/review/policy status is tracked in the official PR and must pass on its final revision before owner handoff.

## Spec Kit gates

Installed specify, clarify, checklist, plan, tasks, analyze and implement workflows were applied in order. Python setup/prerequisite helpers selected specs/005-website-foundation. Both quality checklists passed; separate research and analysis found 100% FR/SC coverage and no HIGH/CRITICAL findings. Explicit owner authorization includes push/official PR and one possible additional bot round; merge remains owner-controlled.

## Test-first evidence

Website contract tests failed on the missing content module before implementation, and qualification tests failed on the missing accounting module. Nine new tests now cover parsed Markdown, unsafe/unpublished links, shared actual version/search semantics, composed schema pointers, release/manifest validation, complete historical snapshots with retained captured references/assets, failure accounting, readiness failure and deadline admission/terminal behavior. Existing regressions remain green.

## Local qualification

| Measurement | Result |
| --- | --- |
| Preparation started | 2026-10-23T07:09:48.914Z |
| Verified readiness | 2026-10-23T07:10:35.990Z |
| Terminal completion | 2026-10-23T07:12:06.904Z |
| Preparation | 47.076 seconds |
| Qualification | 90.914 seconds |
| Combined | 137.99 seconds |
| Target / hard limit / reserve | 660 / 900 / 15 seconds |
| Target advisory | None |

Every elected step passed: repository integrity, thirty Node tests, documentation (fifteen chapters, 71 requirements, 144 source links, four top-down blocks), Rust formatting/eleven core tests/Clippy, native shell tests, frontend type/lint/style checks, brand verifier/glyph checks, static build/crawl, browser acceptance, Windows WebView2 small-fixture acceptance, normal-binary behavior and final source/kit integrity.

Website evidence covers 39 exported HTML pages, 1,620 local links/fragments, 28 exact raw sources and 328 artifact hashes. Browser acceptance exercised landing availability, keyboard/focus, local search/navigation, rendered Mermaid SVG, missing-topic explanation, static aliases, schema-reference anchors, narrow/wide reading and reduced motion. Browser runtime was Chromium 156.0.8078.4, explicitly supplied from an existing local installation after an attempted download stalled. The Playwright driver is pinned; CI prepares its corresponding Chromium separately. Screenshots were inspected for landing and documentation layout.

Native evidence used twelve synthetic candidates and retained the existing Windows input/picker/codec/settings coverage. Normal binary SHA-256 is ee5c7c59f5c1396476048b05d8bb59ffbd875fbd857e88ebda4007eed453ff60. The test binary hash is 0b9feca60ad8e4fa4c9c454ab046774058ecc02bd4b22c1262aebb07d0040811.

Source identity: 30e5a730ae3d5b84cdb5dd4e4d334123eb33e4179206d5c624129a32e2524805, 887 files. Only this verification file and tasks.md are excluded for evidence finalization. Governed kit bytes remain unchanged. Terminal JSON records and all website artifact hashes are retained under ignored .local output and uploaded by the hosted workflow.

## Retained failed attempt

A later full run passed repository/product/site checks but failed the native picker test because the input helper sent Enter without confirming process-scoped foreground activation. Preparation was 49.156 seconds, qualification 44.376 seconds and combined 93.532 seconds. Its terminal failed step and not-run follow-up checks remain recorded. The helper now confirms foreground activation before sending keyboard input, preserving inner control focus, and the final complete run above passed all nineteen native acceptance groups. No failing result was accepted as a pass.

## Evidence limits and delivery boundaries

Hosted product-windows certifies compilation, unit/frontend and brand checks, not interactive native acceptance. The dispatch-only gallery-desktop worker path requires a provisioned logged-in Windows desktop and is not claimed provisioned or exercised. Linux/macOS native runtime, physical touch, assistive technology, installers, Lite packages, large collections, live Pages/domain/TLS and product publication remain unqualified or separate issues. No package or domain is advertised as published.

No implementation scope deviation remains against #28/#29/#30. Issue #6 additionally requires real hosted success and required-check policy readback, which are post-push gates. PR review resolution and final-head CI remain required before owner merge handoff.
