# S023 verification

## Local qualification, 2026-11-01

- Installed Spec Kit specify, clarify, checklist, plan, tasks, analyze and implement workflows completed; no registered extension hooks.
- Red regressions reproduced the draft URL/observation/evidence failures before implementation.
- Final Node 24.11.0 qualification passed at terminal `2026-11-01T13:58:24.818Z`.
- `npm run check`: encoding/BOM/LF/mojibake, local links, version/lock alignment, provenance and governed assets passed.
- `npm test`: 200 cases, 199 passed, one Linux-only skipped on Windows.
- Full controlled release campaign: temporary draft URLs; delayed create/upload/delete/publish/tag/latest observations; committed lost acknowledgements; single-write assertions; foreign state, source, API identity, bytes, final URL and deadline refusals; retained starter recovery.
- Exact candidate/publication exports copied to independent readback locations and both projection gates recomputed. Missing, changed and extra file regressions fail as required.
- Actual current site build/integrity passed: 74 HTML pages, 5,454 local links/fragments, 65 exact raw sources, 495 artifact hashes.
- Ten headless website groups passed, including actual canonical package links with/without JavaScript, accessibility, version search/switching, diagrams, responsive/reduced-motion checks and cold-load budgets.
- Final source SHA-256 `9c7188fe071861dbf66860ef8e8a3a12f1c1d5714c750102871fdfe63fb6b734`, 1,438 files, unchanged at terminal. Evidence-only task/verification/measurement paths are excluded consistently.

## Retained failed attempts

1. 108.365 s qualification: old current-docs acceptance asserted the unpublished baseline wording after an actual release. Other steps passed. Npm child scripts used host Node 26, so the hidden launcher was corrected to pin Node 24 for all subprocesses.
2. 83.823 s qualification under Node 24: the same obsolete no-JavaScript landing assertion remained. Replaced both paths with canonical-selection-aware checks and exact package URL assertions.
3. 116.298 s qualification: all seven elected local steps passed.

These failures are retained in ignored original logs/receipts; they are not acceptance evidence. Shipped docs/schemas/tag/package bytes are unchanged.

## Hosted CI and review boundary

Official PR, exact-head CI, independent hosted artifact readback and at most two review rounds remain pending. No real release workflow, new tag or merge is performed by S023. Controlled HTTP fixtures establish pipeline behavior, not a new shipped release.
