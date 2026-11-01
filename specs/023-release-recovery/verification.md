# S023 verification

## Initial local qualification, 2026-11-01

- Installed Spec Kit specify, clarify, checklist, plan, tasks, analyze and implement workflows completed; no registered extension hooks.
- Red regressions reproduced the draft URL/observation/evidence failures before implementation.
- Initial Node 24.11.0 qualification passed at terminal `2026-11-01T13:58:24.818Z`.
- `npm run check`: encoding/BOM/LF/mojibake, local links, version/lock alignment, provenance and governed assets passed.
- `npm test`: 200 cases, 199 passed, one Linux-only skipped on Windows.
- Full controlled release campaign: temporary draft URLs; delayed create/upload/delete/publish/tag/latest observations; committed lost acknowledgements; single-write assertions; foreign state, source, API identity, bytes, final URL and deadline refusals; retained starter recovery.
- Exact candidate/publication exports copied to independent readback locations and both projection gates recomputed. Missing, changed and extra file regressions fail as required.
- Actual current site build/integrity passed: 74 HTML pages, 5,454 local links/fragments, 65 exact raw sources, 495 artifact hashes.
- Ten headless website groups passed, including actual canonical package links with/without JavaScript, accessibility, version search/switching, diagrams, responsive/reduced-motion checks and cold-load budgets.
- Initial source SHA-256 `9c7188fe071861dbf66860ef8e8a3a12f1c1d5714c750102871fdfe63fb6b734`, 1,438 files, unchanged at terminal. Evidence-only task/verification/measurement paths are excluded consistently.

## Retained failed attempts

1. 108.365 s qualification: old current-docs acceptance asserted the unpublished baseline wording after an actual release. Other steps passed. Npm child scripts used host Node 26, so the hidden launcher was corrected to pin Node 24 for all subprocesses.
2. 83.823 s qualification under Node 24: the same obsolete no-JavaScript landing assertion remained. Replaced both paths with canonical-selection-aware checks and exact package URL assertions.
3. 116.298 s qualification: all seven elected local steps passed.

These failures are retained in ignored original logs/receipts; they are not acceptance evidence. Shipped docs/schemas/tag/package bytes are unchanged.

## Hosted CI and review boundary

Official PR, exact-head CI, independent hosted artifact readback and at most two review rounds remain pending. No real release workflow, new tag or merge is performed by S023. Controlled HTTP fixtures establish pipeline behavior, not a new shipped release.

## Hosted navigation refinement

Two hosted release-validation attempts at initial head `4782744f277e598476b525a4d098e7db2afabab3` failed on overlapping browser navigation. All eight prerequisite scopes passed. Original failed artifact ZIPs: `13087895270` / SHA-256 `5f9e6fb0469cf2d689f042e4c22eebab6350577842b366e55ab69268caba253e`; `13087104786` / SHA-256 `880c4a064f71cb8e83cb75d1b6b1cd70f6fe76cd54c746a615dfc1053f39664f`. Both original ZIPs and job logs are retained.

The delayed real-browser same-URL regression reproduced the old wait returning its original document. The helper now registers expected main-frame navigation before selection and waits for the new document load; five same/cross-version replacements and immediate following navigation pass. #78 is included in this narrow CI acceptance refinement. No original assertions were dropped.

Final refined qualification passed at `2026-11-01T14:41:52.564Z`: preparation 0.277 s, qualification 120.653 s, combined 120.930 s. Repository checks, all 200 tests (199 pass/one Linux-only skip), complete release/evidence/navigation campaign, actual site build/integrity and all ten browser groups passed. Exact source `7302f9755192956865795c2d519e78359e81ef5d0619a4b1f088bd1957d3263a`, 1,439 files, unchanged at terminal.

Both authorized reviews completed without findings on the initial head. The navigation refinement follows those reviews and is verified by red/green reproduction, the full local qualification and the pending fresh hosted run. No third review request is permitted. Owner final review/merge remains the boundary.
