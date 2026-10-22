# Implementation Plan: Responsive, content-first gallery browsing

**Branch**: local `main` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: S003 revised outline and owner-authorized autopilot. No publication.

## Summary

Replace periodic discovery and collection polling with explicit completion-driven native commands. Keep the static Next.js interface and Rust/Tauri shell. Paginate before mounting cards, bound media probes, suspend the gallery during focused viewing, and keep compact controls and disclosure preferences in per-user JSON. Update official contracts with the implemented behavior.

## Technical Context

**Language/Version**: Rust 1.96.0, TypeScript 5.9.3, Node maintainer tooling24+.
**Primary Dependencies**: Existing Tauri2, Next.js static export, React and pinned BrandBuilder adapter. Remove unused notify after eliminating watchers; no new UI framework.
**Storage**: Native per-user `settings.json`, application preference format1, release version0.0.0; no media-directory writes. Existing in-memory collection/facts cache.
**Testing**: Node tests, Rust tests, existing actual Windows WebView2 acceptance, repository/brand/schema checks.
**Target Platform**: Windows acceptance; Linux/macOS product targets, runtime deferred.
**Project Type**: Native desktop shell with bundled static interface.
**Performance Goals**: Mounted cards <=page size (24/48/96); <=4 active gallery probes; zero gallery media/probes in viewer; no idle scans/IPC snapshot polling.
**Constraints**: Read-only media, no source thumbnails required, no bulk fixture gate, no remote/publication, governed kit unchanged.
**Scale/Scope**: Thousands target; structural bounds and small fixtures prove work limits rather than certify all asset codecs/frame rates.

## Constitution Check

Before research: PASS. Scope follows owner feedback; current explicit manual-refresh requirement supersedes old automatic-refresh docs. Reuse architecture, keep media access/security tests and evidence distinction. UTF-8/LF, governed brand and local-only preserved.

After design: PASS. All decisions below reversible, no framework/distribution expansion. AppFrame remains scroll/focus owner; semantic tokens are retained. The owner requested smaller controls after observing the native candidate, so fine-pointer desktop controls use a 32px minimum with 4px/8px padding and 8px radius; coarse or mixed pointer capability restores at least 44px. This deliberate product override supersedes the pinned 44px invariant for precise desktop input and leaves the governed kit unchanged. Qualification checks include docs and normal binary exclusion. No constitutional exceptions.

## Project Structure

### Documentation (this feature)

`specs/003-responsive-gallery/`: spec, requirements/custom checklist, research, plan, data model, contracts, quickstart, tasks, analysis and verification records.

### Source Code (repository root)

- `crates/gallery-core/src/lib.rs`: explicit discovery, cached snapshots and session serialization.
- `apps/gallery/src-tauri/src/main.rs`, `settings.rs`: transport readiness, explicit command completion, per-user settings validation/persistence.
- `apps/gallery/src/lib/types.ts`, `view.ts`: typed preferences, paging and masonry helpers.
- `apps/gallery/src/app/gallery.tsx`, `gallery.css`: compact chrome, settings, bounded media, viewer and scroll indicator.
- `schemas/`: master settings contract and validation tests.
- `tests/`, `crates/gallery-core/tests/`, `scripts/test-native.mjs`: test-first regressions.
- `docs/v0.0.0/`, README, CHANGELOG: authoritative contract reconciliation.
- `scripts/provenance.mjs`: update evidence exclusions to this slice; previous evidence is immutable source input.

**Structure Decision**: Extend existing layers, no new subsystem or general settings service beyond the native validated file.

## Decisions and rationale

| Choice | Alternatives | Decision and rationale |
| --- | --- | --- |
| Discovery | watcher, interval, explicit | Explicit open/Refresh only; owner request removes idle work. Serialize scans and recheck session after locks. |
| Native delivery | poll, completion events/returns | Command returns plus explicit completion event for native-triggered changes; establish media origin before initial snapshot. No periodic polling. |
| Browsing | infinite virtualization, bounded pages | 48 default,24/96 choices; deterministic bounds and accessible page jump. Private test election4 uses same paging code. |
| Masonry | CSS columns, dense grid, positions | Shortest-column placement with sorted DOM order; measured dimensions and placeholder ratio until known. 12px gaps. |
| Media admission | all lazy nodes, queue | Visible/near-view demand queue maximum4; unload/cancel on page/viewer/session transition, cache id/revision facts. No autoplay gallery video. |
| Preference scope | directory overrides, global | Global now; directory history/SQLite remains future. Immediate serialized native writes with conflict detection. |
| Settings format | browser localStorage, native JSON | Native per-user JSON to meet AppData contract and avoid web-origin persistence dependency. Defaults false info/controls,48 page,medium cards,auto indicator,all/name/asc. |
| Recovery | overwrite invalid, preserve | Keep malformed/future files, warn and use memory defaults; unknown compatible fields retained; atomic replacement and stale write rejection. |
| Desktop density | unchanged 44px, smaller visible surface within 44px, product compact | Owner observed oversized buttons in the native candidate. Use 32px fine-pointer controls with existing token spacing, 16px readable type/icons and 8px radius; coarse/mixed capability retains 44px. The delivered adapter declares compact density but exposes no density prop, so record a local capability gap and scope geometry to this Tauri product. |
| Viewer | hide background CSS, unmount | Remove background media/probes, preserve scroll placeholder and return focus; information toggle never keys/replaces focused media. |
| Verification | bulk dataset, small boundary fixtures | Existing12 candidates with test page4; native geometry/work/persistence checks. Keep access-security corpus unchanged. |

## Complexity Tracking

No constitutional violations. Cross-process settings conflict checks are proportional to the installed-command multiple-window use case; no database introduced. Process artifact changes are limited to regression harness/provenance and recorded in the changelog.

## Owner refinement after native candidate

2026-10-22: The owner reported that buttons remained substantially too large across the interface. Reduce fine-pointer desktop button, input and select geometry to a 32px minimum and use quiet ghost actions, while retaining at least 44px for coarse/mixed pointer capability and visible focus. The first native candidate also measured an 84px header because the directory label forced wrapping; give that label a zero flex basis so it truncates within the remaining width. These reversible product changes preserve the 48px normal toolbar goal and require updated geometry checks. No kit bytes or lint rules change.

The delivered native Button attributes support disclosure ARIA, but its generated legacy ESLint allow-list omits aria-expanded and aria-controls. A local typed DisclosureButton forwards exactly those standard attributes through the delivered Button. Record this second capability gap without changing enforcement or submitting anything upstream.

The same refinement uses a 12px full-width media canvas within the existing contained AppFrame. Its default reading gutter is 24px/48px with a 1200px content cap; the full-bleed variant instead disables root overflow and would require another scroller. A product-scoped content-width/padding override keeps the existing scroll element and leaves outer safe-area, titlebar, viewport and focus handling unchanged. Quiet ghost actions omit painted borders until interaction, retaining labelled controls and visible focus.
