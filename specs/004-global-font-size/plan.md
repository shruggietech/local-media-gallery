# Implementation Plan: Global font size

**Branch**: local `main` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

## Summary

Add a global fontScale preference to the existing native settings and View settings selector. Scale inherited body text, keeping the rem root and media geometry fixed. Reuse ordered saves and existing warnings.

## Technical Context

**Language/Version**: Existing Rust1.96/TypeScript/React static Next.js application.
**Primary Dependencies**: Existing Tauri and pinned brand adapter; no new dependencies.
**Storage**: Per-user format1 settings.json, product version0.0.0.
**Testing**: Rust compatibility/validation, JSON Schema, rendered Windows WebView2 font/geometry/restart checks with12 candidates, existing qualification.
**Target Platform**: Windows native qualification; Linux/macOS runtime deferred.
**Project Type**: Native gallery.
**Performance Goals**: Immediate text updates through inherited CSS; existing bounded media admission unchanged.
**Constraints**: Current size default, old settings accepted without rewriting, kit unchanged, local only.
**Scale/Scope**: One preference, UI field, additive schema property and documentation.

## Constitution Check

Before research and after design: PASS. Scope follows owner; reuse existing preference lifecycle. No architecture, dependency, publication or bulk-test expansion. UTF-8/LF and exact brand identity retained. Existing security tests remain mandatory.

## Project Structure

- `apps/gallery/src-tauri/src/settings.rs`: optional-on-read field/default100, supported-value validation and compatibility tests.
- `apps/gallery/src/lib/types.ts`, `src/app/gallery.tsx`, `gallery.css`: typed scale, selector and inherited text factor.
- `schemas/v0.0.0/local-media-gallery.schema.json`, `tests/contracts.test.mjs`: additive optional property.
- `scripts/test-native.mjs`: font ratios, text surfaces, stable geometry, restart and reset.
- `docs/v0.0.0/`, README and CHANGELOG: preference contract; `scripts/provenance.mjs`: current evidence exclusions.

## Decisions and rationale

- Presets100/90/80 provide gradual reduction with a clear original-size reset; a continuous slider adds unnecessary state/validation complexity.
- Native numeric fontScale uses serde default100, not a format bump; old files remain compatible and untouched until an explicit save. The schema property is optional with default100.
- A root CSS custom property supplies a unitless factor to body font-size based on1rem. Do not change documentElement font-size: doing so would shrink rem spacing, control targets and media geometry. Inherited application text and portal content scale together; OS/native media controls remain host-owned.
- The existing settings selector and immediate serialized save pipeline are reused. Save failures retain active choices and warnings.
- Source provenance excludes only current slice tasks/evidence; previous records remain source inputs. This routine harness adjustment is noted in the changelog.

## Complexity Tracking

No constitutional violations or new subsystems.
