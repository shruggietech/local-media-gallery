# S007 verification

Status: implementation, full-source qualification, two review rounds and exact live acceptance passed. Official PR #46 remains open for owner final review and squash merge.

## Delivered scope

The slice implements epic36 and all children37 through45 with Next.js16.4.2, Fumadocs UI/Core16.17.8 and Shiki4.5.0. Canonical Markdown remains inert; no executable MDX or request-time service is introduced. The landing has a clearly labeled illustrative contact sheet, approved headline/description, workflow/edition context and truthful package status. Reading uses the governed AppFrame, explicit version tree/search, native anchors/history, active animated TOC, native modal compact navigation, exact-source code-copy feedback and strict described static light/dark SVG diagrams. Governed favicon/manifest/social bytes and per-route discovery metadata are staged from the unchanged kit.

## Design and regression evidence

Two new renderer tests failed against the previous implementation before the Shiki/copy and source-hash adapters were written. Existing source confinement, version fallback, captured-reference, schema and verified-release tests remain intact. SVG regressions exercise duplicate instance IDs, label preservation, meaningful names and executable/external-resource rejection. Source checks compare authored output independently of added diagram presentation, and still hash every raw source.

The responsive review found and corrected mobile grid utility omissions, invisible drawer focus timing and an enlarged-text implicit-grid overflow. Native dialog behavior now owns compact modal interaction, with explicit keyboard cycling. Consumer CSS fixes the frame column while preserving root scroll ownership and governed bytes. Wide diagrams center on first scripted reading, retain native label sizes and expose a clear local-scroll/source instruction.

Before screenshots and measurements are retained under ignored .local/s007-before-* and the original S006 static artifact. After screenshots are in .local/site-visual and are uploaded with hosted website evidence. The sibling comparison uses go-schedule's hero/workflow hierarchy, brand's reading/link/identity vocabulary and fragcap's diagram/contrast checks, adapted to this site's actual contracts. No sibling runtime qualification is claimed.

The Clipboard API payload retains exact source text, including whitespace and final LF. Native Windows text clipboard readback normalizes newlines to CRLF; the browser test separately asserts the exact API payload and platform-native readback.

## Acceptance limits

Browser checks use Chromium, axe AA rules, browser accessibility semantics, real keyboard/history/copy interactions, geometry/contrast measurements, no-script/failure cases, local fonts and fixed cold laboratory profiles. They do not establish attended NVDA/VoiceOver speech behavior, physical touch or field Core Web Vitals. Unchanged product behavior receives the existing small synthetic Windows fixture; Linux/macOS native runtime, package releases and large-collection performance are outside this slice.

No package, tag, DNS or unrelated dependency change is included. The PR remains open for owner final review and squash merge after all required checks and bounded reviews.

## Qualification repair and fresh run

The first full receipt failed after the website stage because the existing native picker helper mistook a retained hidden HWND for an open picker. A scoped diagnostic demonstrated completed selection and a hidden system dialog. The helper now tests visibility, including during navigation wait, and acceptance compares the exact Windows namespaced root. The failed receipt is retained as .local/s007-qualification-attempt1.json; it is not a passing qualification. A fresh complete run follows this repair.

## Final-source local acceptance

Terminal pass: 2026-10-23T16:08:07.517Z. Source SHA256: 8506ffc4b26b98dbd104d0518aeed0fc4d89a796a988e6a15c4f26606f284f44 (924 files; only the explicitly named S006/S007 task and verification records are excluded). Preparation 63.085s, qualification 161.837s, combined 224.922s. All mandatory checks passed within660/900 seconds with the15-second reserve retained.

49 Node tests, 11 Rust core tests, native shell arguments, frontend lint/types/brand proof,19 native WebView2 groups, normal-binary automation exclusion, source provenance and unchanged governed kit passed. The exact-picker-root assertion passed. The final status regression exercises canonical rendering and all three public entry aliases. Current public documentation/support/landing metadata was scanned for the previously stale assertions; no such current-status claims remain.

Website: 39 HTML pages, 2516 local links/fragments, 28 exact raw sources, 282 artifact hashes. 10 rendered groups and 14 axe scans passed in 46.06s. All eight diagram/theme cases passed: minimum text contrast16.91:1 and relationship contrast5.72:1, 16px labels, distinct SVG names/descriptions and native dimensions. Directed actual Fumadocs chapter navigation from a scrolled page also passed, revealing the target heading.

The final output contains 1358641 decoded JavaScript bytes versus6,069,838 before this slice. Cold home JS455,586 decoded/135,612 gzip-9 bytes; representative docs JS692,040 decoded/219,900 gzip-9 bytes. All asset/runtime and fixed-profile lab LCP/CLS budgets passed; precise samples remain in .local/site-browser.json and hosted evidence. No field data is claimed.

## First review and follow-up qualification

Round one reviewed2f204cd8bf764c98d4854f020d2cac5733f08131 and raised one P2 in PR #46, comment4361674173: future snapshots missing a workflow topic would receive a manually constructed unavailable route. Landing workflow targets now come from landingDocs and the existing switchTopic fallback. The real two-snapshot regression failed before the adapter change and passes afterward.

A directed compact-to-wide resize test also reproduced a zero-height active TOC marker. Marker measurement now observes list/viewport geometry; permanent browser checks cover resizing and reopening compact contents.

Fresh complete qualification passed at 2026-10-23T16:19:43.957Z: preparation53.669s, qualification161.231s, combined214.9s. Source SHA256 25545c3f89d25cf4019a2e320d57b0a6bd7fa30cccbbdb7b3272591a5f29eeae. All49 Node tests, 11 Rust core tests, 19 native groups and all mandatory site/product/provenance checks passed. Browser matrix 46.267s with 14 clean axe scans and all fixed budgets.

Initial hosted run39984536330 passed repository, product-windows, website and deploy-pages. Its checked merge artifact3648bab2b32d04f155a4eb42bca9bff6aa12c790 matched local qualified source8506ffc4b26b98dbd104d0518aeed0fc4d89a796a988e6a15c4f26606f284f44. Live authoritative/public DNS, trusted HTTPS, redirect and all 280 hosted artifact files passed exact-byte acceptance. This initial receipt does not substitute for final follow-up-head CI/live checks.

## Second and final review correction

The second review of83a1d8a completed on2026-10-23 and raised one P2 (comment4361808310): the missing-topic notice was inside the closed mobile sidebar. A browser regression failed against that build without opening the menu. The notice now has one owner in visible article content and uses the current URL query through a localized Suspense boundary. The sidebar retains only version/search controls; the notice is not duplicated.

Fresh full qualification passed at 2026-10-23T16:31:22.148Z, source SHA256 2dcea7be62f1c325163d50fbd9ad7717449947a55ae38bdde6b3268a81f05900: preparation48.17s, qualification138.748s, combined186.918s. All49 Node tests, 11 Rust core tests, 19 native groups and all repository/product/site/provenance gates passed. The browser matrix passed in46.435s, including closed-drawer notice visibility and14 clean axe scans.

Hosted follow-up run39986062598 passed all four jobs; merge artifactbab498a118cc457abe719203f4e255a3dda90a4c matched source25545c3f89d25cf4019a2e320d57b0a6bd7fa30cccbbdb7b3272591a5f29eeae. Its DNS/HTTPS/redirect and280-file live-byte acceptance passed. Final correction-head hosted/live checks follow. Exactly two review rounds were requested; no third request will be made.

## Hosted prerequisite download correction

Run39987631772 passed repository and product-windows, but its website preparation repeatedly stalled on large font archives from azure.archive.ubuntu.com on two separate runners. Both preparation attempts were cancelled; neither is a website qualification pass. The cancelled log is retained under ignored .local/s007-stalled-website-log.json. The workflow now selects Ubuntu's primary HTTPS archive in the runner mirror list and bounds APT network timeouts/retries. Package signature verification, Playwright's complete --with-deps installation and all qualification stages remain enabled. This follows the [Ubuntu archive configuration](https://ubuntu.com/server/docs/package-management/) and [Playwright CI prerequisites](https://playwright.dev/docs/ci). Fresh source qualification and hosted acceptance follow this workflow correction.

Full qualification after the runner correction passed at 2026-10-23T16:53:07.094Z, source SHA256 66f1c36acc8a8a00bf03acdadbf13c8e4f06949e9463af04a12348cca52b8c32: preparation 50.477s, qualification 138.978s, combined 189.455s. All mandatory checks, including49 Node tests, 11 Rust core tests, 19 native groups and the complete website browser matrix, passed within the qualification limits.

## Source-head hosted and live acceptance

[Run 39990602010](https://github.com/shruggietech/local-media-gallery/actions/runs/39990602010) passed repository, product-windows, website and deploy-pages for branch head f25146df1879f8926ae00d94fe2ca13cbdc53b3e. Checked merge artifact baa19155057fdc73e1548b09db6aa0f02601c4ac and local full qualification share source SHA256 66f1c36acc8a8a00bf03acdadbf13c8e4f06949e9463af04a12348cca52b8c32. Website preparation 67.179s, qualification 55.408s, combined 122.587s. Windows preparation 440.708s, qualification 68.436s, combined 509.144s. Terminal receipts are authoritative; the runner dependency downloads are preparation, separate from qualification.

Live acceptance passed at 2026-10-23T17:03:17.070Z: two independent public resolvers and both authoritative nameservers, unchanged delegation baseline, ownership TXT, trusted HTTPS and HTTP redirect, exact deployment identity and all 280 published artifact files. The full live Chromium interaction suite passed all 10 groups with 14 clean axe scans in 16.356s. Identity before and after rendering remained baa19155057fdc73e1548b09db6aa0f02601c4ac. Cold throttled laboratory metrics are checked separately in CI, rather than claimed as field measurements. Receipts are retained in ignored .local/s007-run-39990602010, .local/s007-live-runner-fix.json and .local/s007-live-rendered-runner-fix.json.

[PR #46](https://github.com/shruggietech/local-media-gallery/pull/46) closes #36 through #45 on merge. Two review rounds completed, with one explicit second-round request (comment 6369533370). Both findings were fixed, individually replied to and resolved: thread PRRT_kwDOVUAZgc6vrinb/comment4361674173/reply4361752920; thread PRRT_kwDOVUAZgc6vr2cG/comment4361808310/reply4361887651. No third review is requested. Later fixes and this delivery record have local/hosted verification; they are not represented as an additional independent review.

All 24 tasks are complete. Project 8 issue and PR status is PR review with Slice S007; milestone 4 and issues remain open until owner acceptance/merge. The existing Pages bootstrap is restricted to codex/007-website-experience and refs/pull/46/merge. Remove those temporary bootstrap selectors during post-merge housekeeping. No merge, tag, package release or DNS mutation was performed.

This final record-only commit changes tasks.md and verification.md, the two explicitly excluded S007 delivery records. It preserves the qualified source digest. Required CI and exact-artifact live acceptance for that final commit must pass before the owner handoff; their final receipts are linked from the PR.
