# Implementation Plan: S007 Website experience

**Branch**: codex/007-website-experience | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

## Summary

Complete epic #36 and children #37 through #45 in one delivery. Adopt Next.js 16.4.2, Fumadocs UI/Core 16.17.8 and Shiki 4.5.0. Preserve canonical Markdown, retained versions, escaped source rendering, confined publication, verified release metadata and the governed BrandBuilder AppFrame. Do not publish packages or change DNS.

## Technical context and architecture

TypeScript/React 19.3.1 static export on GitHub Pages. Node 24 build scripts retain MarkdownIt with raw HTML disabled. Fumadocs supplies the reading shell, chapter tree and active TOC without introducing executable MDX or duplicate source files. Shiki highlights at build time using a governed CSS-variable theme, unknown languages fall back to text. Copy controls progressively enhance exact source text and report clipboard failures.

The brand AppFrame retains its nested browser scroll owner. Fumadocs sticky surfaces inherit measured scroll height. Native anchors, heading scroll margins, history and focus remain browser behavior. Smooth movement and the TOC indicator obey reduced motion. Version-scoped search retains offline failure feedback. Mobile navigation must support keyboard dismissal and restored focus.

The landing page uses the approved headline and short description, a clearly labeled illustrative contact sheet, task-oriented reading links, truthful edition/status context and governed identity. Theme preference is system by default with explicit persisted light/dark choices. Consumer theme mappings use delivered brand tokens, fonts, spacing and motion; governed kit bytes remain unchanged.

Mermaid 12.2.0 renders during the build with local fonts and strict configuration, HTML labels disabled at both root and flowchart levels. Inline SVG pairs provide immediate light/dark diagrams. Each has unique IDs, local references, accessible titles/descriptions, readable native dimensions, source disclosure and a local overflow region. Invalid or unsafe output fails the build. Readers download neither Mermaid nor Shiki.

Route metadata uses localmedia.gallery and the governed 1280 by 640 social image. Explicit version routes are self-canonical; latest aliases canonicalize to their explicit target. Aliases are omitted from the sitemap without using noindex as a duplicate canonicalization mechanism. Error pages are noindex. Root icon/manifest dependencies are staged byte-for-byte. Public contracts describe the new architecture; documentation status distinguishes the live website from unpublished packages.

## Constitution check

Pre-research and post-design: PASS. Canonical sources and historical fidelity remain authoritative. Public pages exclude numbered planning; no release/schema version changes. Governed kit updates are unnecessary. Static export preserves provenance, exact artifact deployment, source confinement and approved squash workflow. Tests precede implementation of new rendering contracts. No owner-attended pre-release gate is introduced.

## Measured baseline and locked budgets

The retained S006 artifact contains 6,069,838 decoded JavaScript bytes. Cold home JavaScript is 453,040 decoded bytes; architecture is 2,783,243 decoded bytes. These are laboratory response sizes, not field transfer metrics.

Lock budgets before implementation: all emitted JS <=2,000,000 bytes; cold home JS <=650,000 decoded and <=200,000 gzip-9 bytes, initial responses <=900,000 decoded; cold representative docs JS <=900,000 decoded and <=300,000 gzip-9, initial responses <=1,500,000 decoded. Per-route CSS <=100,000 decoded. Fonts <=6 faces and <=220,000 bytes total. Illustrative home media <=350,000 bytes; each diagram SVG <=80,000 bytes. Initial home must not fetch search indexes or unrelated chapters.

Three isolated cold samples per home/long-doc route and viewport: desktop 1440 by 1000, CPU1x, 40ms latency, 10Mbps down/1Mbps up; mobile 390 by 844, CPU4x, 150ms latency, 1.6Mbps down/750Kbps up. Median lab LCP <=2.5s desktop/4s mobile; CLS <=0.1 each run. Field p75 LCP2.5s/INP200ms/CLS0.1 remain separate targets, not claimed measurements. Browser suite targets 120 seconds after readiness.

## Delivery phases and structure

1. Requirements, research, contracts, tasks and blocking consistency analysis.
2. Red tests for source fidelity, code controls, diagram invariants and metadata. Install pinned compatible dependencies.
3. Shared theme/rendering/asset foundation; landing, documentation shell and code/diagram reading experiences.
4. Metadata and public-contract correction; browser, accessibility, visual and performance evidence.
5. Full Windows qualification, exact-source artifact publication, CI and at most two external review rounds. Stop for owner merge.

Source areas: apps/site/src/app and components (site UI); apps/site/src/lib (route metadata); scripts/site-content.mjs and build-site.mjs (canonical adapter); scripts/site-diagrams.mjs (confined SVG build); scripts/stage-brand.mjs (governed assets); site/diagrams.json (descriptive diagram metadata); scripts/check-site.mjs and test-site.mjs plus tests/site.test.mjs (independent verification); docs/v0.0.0 and CHANGELOG.md (public contracts); specs/007-website-experience (internal evidence).

## Qualification and publication

Verify browser/fonts/tool readiness before preparation. Preserve preparation, qualification and combined timing, 660-second target, 900-second hard limit, 15-second finalization reserve, source digest and mandatory integrity/provenance/native checks. Test every route plus both themes at390/768/1440, 320 reflow, 200 percent text, keyboard navigation/history, code copy and failure, all diagrams, search/version failure, metadata/icons and missing routes. Axe scans and browser AX/keyboard checks do not claim attended screen-reader speech testing.

Automatically push and open an official PR closing #36 through #45 only when merged. Temporarily scope the existing Pages bootstrap to the exact S007 branch and PR environment ref for final live verification. Wait for all applicable checks, respond to every review comment and resolve each addressed thread. Initial automatic reviews count as round one; at most one additional @Codex request. No third review trigger. Final handoff requires exact-head checks and deployed artifact identity, without merging.

## Complexity

No constitution exceptions. Static SVG build removes a large reader dependency. Existing Markdown adapter is retained because it already enforces the source publication contract.

## Qualification repair

The first full run reproduced an existing picker-helper false failure: a completed hidden dialog retained a valid HWND. The actual gallery had reached the requested directory. The helper now tests dialog visibility, and native acceptance additionally compares the selected root to the exact requested path. This proportional test repair preserves all19 native groups and is included in the fresh complete qualification; no product behavior changes.
