# Implementation Plan: Organized application navigation

**Branch**: codex/s036-application-navigation | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)
**Input**: S036 / #94, owner-authorized push and PR, maximum two hosted review rounds, owner final merge.

## Summary

Replace the crowded header with Menu, folder identity and Refresh. Reuse current gallery/settings authorities and governed controls. One product-owned native modal drawer provides the five-category hierarchy and inline task panels. Keep active media and long-running operation controllers mounted independently of routes.

## Technical Context

**Language/Version**: Existing TypeScript 6.0.3, React 19.3.1, Next 16.4.3; existing Rust/Tauri host.
**Primary Dependencies**: Existing governed Web/React adapter, radix-ui 1.6.7 and lucide-react. No new UI library, shell or persistence dependency.
**Storage**: Existing user/session/remembered/portable settings, history and preparation contracts. Drawer route, focus target and copy/help result are transient.
**Testing**: Node contract tests, headless Playwright gallery harness with external Tauri mocks, current native WebDriver/AX/ordinary package campaigns, existing repository/site/native/release CI.
**Target Platform**: Windows, Linux and macOS Full/Lite using the existing renderer and native hosts.
**Project Type**: Local desktop gallery and maintainer verification.
**Performance Goals**: No media remount, discovery restart or operation restart on route changes; bounded existing native admissions retained.
**Constraints**: Governed bytes unchanged, owner workstation focus untouched, public v0.2.2 unchanged, no attended pre-release step; 660/900/15 and provenance/elected-byte checks preserved.
**Scale/Scope**: Five categories, eighteen named destinations, current settings and operations; #97 legacy MSI recovery excluded.

## Constitution Check

Before research: owner scope, proportionality, integrity, truthful verification and publication boundaries pass. After design: same result. Native drawer is product navigation outside shared component grammar; no governed kit change. Browser mocks are verification-only and never imported into shipped code. Versioned documentation remains frozen; new behavior is clearly source-only and unreleased. User authorization replaces the protocol's default pre-push pause; final merge/publication remain outside scope.

## Project Structure

### Documentation

specs/036-application-navigation contains spec, plan, research, data-model, contracts/navigation.md, quickstart, tasks, requirements and UX quality checklists, and local verification records. Final hosted review/CI receipts live on the PR, the primary delivery tracker, so completion bookkeeping alone does not require another native build.

### Source Code

- apps/gallery/src/lib/navigation.ts: typed static hierarchy, route relationships and folder identity helper.
- apps/gallery/src/lib/application-navigation.tsx: stable native modal drawer with route/focus ownership.
- apps/gallery/src/app/gallery.tsx and gallery.css: compact bar, count shortcut, contextual editors, stable viewer integration and governed layout.
- apps/gallery/src/lib/state-controls.tsx: distinct sources/recents and uniquely identified contextual scope selector.
- apps/gallery/src/lib/guided-preparation.tsx and preparation.tsx: stable controllers and inline panel bodies, compact task status, preserved drafts and cancellation.
- apps/gallery/src/lib/diagnostics.tsx and application-help.tsx: inline diagnostic/help panels, visible error feedback and local notices.
- apps/gallery/src-tauri/src/help.rs and main.rs if needed: fixed documentation browser request using hidden noninteractive platform launch, no arbitrary URL/shell interface. Existing application_info supplies About facts.
- scripts/stage-brand.mjs: stage local notices with existing asset preparation where necessary; no governed source edits.
- scripts/test-gallery-navigation.mjs: externally mocked headless rendered behavior; screenshots/axe, never workstation native UI.
- scripts/test-native.mjs, test-runtime.mjs, runtime-driver.mjs, runtime-evidence.mjs, test-preparation.mjs, measure-native.mjs, diagnose-runtime.mjs: explicit new routes/topmost modal/AX evidence while preserving prior assertions.
- scripts/test-{linux,macos,windows}-packages.mjs: current-candidate native navigation smoke alongside unchanged public-recipient and portable-choice proof where appropriate.
- docs/unreleased/application-navigation.md, README.md and CHANGELOG.md: accurate source contract and public availability distinction.

**Structure Decision**: Small product-owned components around existing authorities. No additional application shell, routing framework or settings provider.

## Decisions and dependencies

1. Native dialog.showModal is required to compose above the existing native viewer; a sibling Radix portal cannot overtake the browser top layer. Inline preparation/diagnostic bodies avoid nested incompatible modal ownership. Route changes use heading focus, Back restores the prior menu item, Escape closes only the drawer, and close restores the actual invoker or a surviving Menu/main fallback.
2. Keep controlsExpanded as a real persisted optional inline sort/filter expansion near the collection count, preserving the existing Show controls/Hide controls behavior and portable/native proof. Drawer route changes do not mutate that preference.
3. Keep a visible selected save-scope cue before the viewer Information toggle persists metadataExpanded; place a destination selector beside summary-field editing. All settings forms show scope before mutation and reuse one useGalleryState authority.
4. Lift guided preparation state/polling to Gallery lifetime. Preserve thumbnail destination draft across route changes. Dismissal has no cancellation side effect; explicit cancellation and progress remain reachable outside the drawer.
5. Native candidate navigation evidence explicitly describes drawer hierarchy; published public binaries retain their legacy UI contract. Never choose UI protocol solely from product version, as source and published product may share the version while having different identities.
6. Keep published docs/v0.2.2 and all retained/version/schema/publication metadata unchanged. New docs/unreleased/application-navigation.md states source-only behavior; integrate it into the next elected version during later release preparation. Update stale README public availability facts.
7. Documentation is a real Help destination with the official URL and a user-requested external browser action or explicit supported fallback/error. Local About/licenses remain usable offline. No dependency or generic external-command interface is added merely for navigation.
8. Spec Kit tasks cover implementation and local verification, including preparing the delivery packet. Hosted CI/review acceptance is tracked on the official PR after push. Every final-head finding/check still must be satisfied; do not make a documentation-only commit merely to acknowledge an already recorded hosted result.

## Complexity Tracking

No constitution violations. Existing capability restrictions, storage authority and process ownership remain unchanged. Implement all three stories before delivery; each has its own independent regression boundary.
