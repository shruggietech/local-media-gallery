# S028 verification

## Scope and protocol

S028 completes #87 in the shared native-driver allocator and its regression suite. Branch `codex/s028-fetch-compatible-driver-ports`, feature directory and active selector agree. The existing managed checkout is reused; its older filesystem name does not select a feature.

Spec Kit sequence: specify -> clarify (no critical ambiguities) -> allocation requirements checklist -> plan/research -> tasks -> read-only analyze -> implement. No extension hooks are configured. Analysis found zero inconsistencies or critical issues, all 8 functional requirements mapped to 11 tasks, no unmapped tasks. Built-in requirements checklist: 16/16. Custom checklist: eight reviewer-owned unchecked items, implementation continues under explicit owner autopilot authorization.

## Local results (2026-11-03)

- Pinned Node 24.11.0, existing dependencies, hidden noninteractive launcher; no owner-desktop GUI/input.
- Red allocator regression: 8 tests, 1 pass and 7 expected failures before implementation.
- Focused full native-driver suite: 25 passed, zero failures/skips. Includes every one of the 82 pinned restricted ports, allowed boundaries, exact 1/3/32-attempt exhaustion, invalid controls/addresses, factory/bind/close errors, cleanup and actual owned HTTP child/fixture readiness.
- Full `npm test`: 265 tests, 263 passed, two existing skips, zero failures.
- `npm run check`: authored text/local-link/version/Spec Kit and 572 governed brand-file checks passed; encoding includes UTF-8 without BOM, LF and mojibake checks.
- `npm run check:docs`: passed for 3 versions, 15 baseline documents, 212 requirement definitions, 598 local links/fragments and 14 top-down diagram blocks.
- `git diff --check`: passed.

Existing no-argument consumers inherit the helper policy. Nonce/PID and historical listener attribution, child cleanup and readiness code remain unchanged. The test-owned foreign-identity fixture now gets its OS candidate through the helper while retaining its actual ownership-rejection assertion. No network probe is used for selection, and no dependency, product version, user port configuration or published release asset is changed.

## Hosted acceptance and handoff

Post-push work is pending in this snapshot. The official PR will record final commit/source, applicable CI terminal results, review receipts and resolution state, and task T010/T011 completion. This prevents a record-only rebuild after acceptance. Reviews are capped at two total rounds. Final owner review and merge remain pending until those records are complete.

Hosted native GUI/media/install acceptance runs only on isolated CI. Preserve existing 660-second target, 900-second hard limit, fifteen-second provisional finalization reserve and separate preparation/qualification/combined clocks. Passing local mocks does not establish native platform acceptance or a product release.
