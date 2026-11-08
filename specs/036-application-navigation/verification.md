# Verification: S036

## 2026-11-08: implementation gate

Installed Spec Kit specify/clarify/checklist/plan/tasks/analyze/implement prerequisite workflows completed. Requirements 16/16 and reviewer UX quality 12/12 pass. Read-only analysis maps 18/18 functional requirements and all six outcomes across 20 implementation tasks plus the explicit hosted PR gate, with zero blocking findings or constitution conflicts. Three read-only research audits informed the plan. No GUI/native application was launched on the workstation. No implementation or native acceptance is claimed by this planning record.

Final hosted CI/review receipts are recorded on the PR after push, without a completion-only rebuild.

## 2026-11-08: implementation and local verification

Implemented all 18 destinations with one stable native modal drawer and the existing AppFrame overlay/scroll ownership. Settings retain one authority and all four destinations; inline controls retain controlsExpanded. Viewer Information retains metadataExpanded and summary scopes. Guided polling and thumbnail drafts live above route pages. Help embeds existing notices and requests only the fixed official documentation URL. Published documentation, versions, canonical release metadata and governed brand bytes are unchanged.

Meaningful red observations preceded implementation: missing typed route module and crowded app bar/missing drawer; new receipt tests rejected missing candidate hierarchy evidence. An initial generated browser video fixture was empty and produced DEMUXER_ERROR. That fixture failure was corrected with the existing pinned FFmpeg prerequisite, a real WebM header and decoded playback assertion; it was not counted as product acceptance.

Local checks passed:
- npm run check: UTF-8/no BOM/LF/mojibake, links, dependency/version and governed brand checks.
- npm test: 347 tests, 345 pass, two existing platform-specific skips, no failures.
- npm run check:app: TypeScript, ESLint, governed style rules, Rust formatting/clippy and application/unit checks.
- Production gallery export and eight synthetic-host rendered groups, including 15 task pages, clipboard selection/denial, four scopes, persistent Information, unchanged playing media node, retained thumbnail destination draft and dismissed guided polling/cancellation.
- Website production build, check and ten rendered groups: 140 HTML pages, 10,663 local links/fragments, 158 exact raw sources and 921 artifact hashes.
- Documentation checks: five version sets, 1,004 links/fragments and 22 top-down diagrams.
- Source test-script syntax and git diff whitespace checks.

Native acceptance remains outstanding until hosted CI. The active workstation was not used for native application, installer, trusted input or screen-reader qualification. Current candidate receipt validation requires drawer-v1 hierarchy, trusted keyboard containment/focus return and actual native accessibility observations. Historical public recipients and unchanged baseline measurements explicitly retain legacy-controls-v1 based on their campaign role, not version. Existing discovery, persistence, metadata, playback, package lifecycle and portable settings assertions remain elected.

Wide and 320px screenshots were inspected. The 200-percent text capture exposed split Back/Close words; the header now wraps whole buttons instead. Browser checks verify coarse-pointer targets of at least 44px and axe in both themes. These are browser observations, not physical touch or native screen-reader claims.

Final hosted checks and up to two review rounds are recorded on the PR, with the owner final merge boundary. No completion-only evidence commit is required after CI.

## 2026-11-08: hosted keyboard correction

Initial head 986241d passed hosted repository, website and rendered navigation checks and received a clean first Codex review. Windows and macOS native playback/image checks passed, then both observed trusted Tab move from the menu heading to Gallery, skipping the earlier Close control. A new browser assertion reproduced that exact mismatch before the fix. The drawer now explicitly moves forward Tab from the focused heading to its first available control. The meaningful red assertion and complete eight-group browser suite passed after correction, with frontend/export, syntax, integrity and encoding checks. This replaces no native assertion and preserves the failed first-run receipts under run 42522452074.

## 2026-11-08: ordinary macOS observer correction

The first ordinary macOS package campaign captured a closed drawer after its external observer reported pressing Menu. The native AX tree contained both an AXButton named Menu and a later AXGroup named Menu; its traversal overwrote the button with the container. Press selection now requires an enabled AXButton and retains the first matching button, excluding headings, containers and native menu-bar items. Four compiled observer self-test cases cover the decoy container, menu bar, disabled button and genuine labelled button. These Swift cases execute in hosted macOS CI, not on Windows. Existing pixel, portable settings, lifecycle and historical recipient assertions remain intact.

## 2026-11-08: post-focus native acceptance migration

At 547d17a, both Windows editions passed all native media, trusted keyboard, navigation accessibility, screen-reader, presentation and integrity checks. macOS native qualification also passed. Windows then reached the preserved extended browsing campaign and found a stale toolbar-only Close folder selector before discovery cancellation. That assertion now opens the real Gallery submenu, verifies Close folder is enabled during scanning, dismisses the drawer, and uses the relocated active-work Cancel discovery control for the existing trusted Enter cancellation. No discovery outcome, state or source-integrity assertion was removed.

## 2026-11-08: explicit test return to browsing

At 4ecfb61, hosted Windows Full/Lite native media, keyboard, accessibility, NVDA, presentation and integrity checks again passed. Extended browsing progressed through cancellation and partial/unavailable recovery, then its Retry discovery action remained scoped to the Sort and filter drawer opened by earlier edits. The test driver now explicitly dismisses navigation before named gallery/discovery and viewer actions; drawer-only inheritance/history actions retain their task scope. This does not add a missing-button fallback or change product behavior. Both authorized hosted reviews completed cleanly; subsequent driver corrections are validated through local syntax/integrity checks and hosted CI without requesting a third round.

## 2026-11-08: empty-gallery native expectations

At 42f2cd2, extended Windows acceptance passed discovery/cancellation/recovery, settings-read retirement, focused discovery, anchored pagination, contextual scope visibility, native picker cancellation, sorting, image/video decode, focused playback, trusted keyboard, explicit Refresh, errors and empty filtering. Relocation then encountered the former No directory selected copy. All three empty-selection assertions now require the implemented Open a media directory heading and an enabled Open folder action in main content. Native session retirement, relocated media, revoked old grants, unavailable startup and original-byte integrity assertions remain unchanged.
