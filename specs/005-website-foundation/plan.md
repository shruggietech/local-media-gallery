# Implementation Plan: Website foundation and hosted qualification

**Branch**: `codex/005-website-foundation` | **Date**: 2026-10-23 | **Spec**: [Specification](spec.md)

## Summary

Deliver #28/#29/#30 through one independent static Next.js website and #6 through hosted qualification of existing repository/product checks plus the new site. No domain deployment, package release or merge. Explicit owner authorization includes push/official PR and one possible additional bot review round.

## Technical Context

**Language/Version**: Node 24+, TypeScript 5.9.3, existing Rust 1.96.0 product checks.

**Primary Dependencies**: Existing Next 16.4.2 / React 19.3.1; Markdown-it for CommonMark/GFM tables with raw HTML disabled, Highlight.js for fenced code, Mermaid for docs-only diagrams, Playwright for rendered acceptance. Exact package versions locked after registry verification.

**Storage**: Authored site/versions.json plus existing docs/schema/changelog sources; ignored generated build model and raw assets. No user data or service backend.

**Testing**: Node contract tests, full exported route/link/fragment/raw hash checks, Playwright keyboard/responsive/search/diagram checks; existing repository/app/brand checks and Windows native qualification.

**Target Platform**: Static browsers / eventual GitHub Pages. Existing Windows x64 native runtime evidence remains separate.

**Project Type**: Independent website workspace plus CI.

**Performance Goals**: No docs-only JS on landing; prebuilt local search per version, finite result display; no numerical product performance promise.

**Constraints**: 660-second advisory qualification target, 900-second hard limit and 15-second reserve after verified prerequisites; UTF-8/LF; immutable governed bytes; hidden noninteractive children.

**Scale/Scope**: All fifteen current chapters plus arbitrary retained manifest snapshots; synthetic second version for historical edge cases. Full #6/#28/#29/#30 acceptance.

## Constitution Check

Pre-research and post-design: PASS. Approved Next/static direction preserved. Detailed library choices are implementation decisions under issue #29. No product capability narrowing. Source meanings, brand provenance, exact evidence and publication boundaries remain explicit. No constitution exceptions.

## Project Structure

### Documentation (this feature)

Spec, requirements/custom checklists, plan, research, data model, interface contracts, quickstart, tasks and verification live in this directory only.

### Source Code

- apps/site/src/app: independent landing and generated docs/reference routes.
- apps/site/src/components: docs-only search/version/diagram behaviors and generic schema tree.
- site/versions.json: explicit snapshot/nav/schema/alias metadata.
- scripts/site-content.mjs: parser, source allowlist/link mapping, search and reference model.
- scripts/build-site.mjs, check-site.mjs, test-site.mjs: staging, export, crawl and rendered acceptance.
- scripts/ci.mjs: prerequisite preparation and shared timed qualification/evidence runner.
- .github/workflows: pinned hosted qualification and separately elected desktop workflow.
- tests/site.test.mjs, tests/qualification.test.mjs: meaningful positive/failure contracts.

## Decisions and execution order

1. Reuse Next/React and approved server components/tokens; no full docs framework or gallery import.
2. Parse Markdown through Markdown-it; derive safe heading IDs and search text from parsed tokens, rewrite resolved paths through an explicit source inventory. Raw HTML disabled. No regex Markdown renderer.
3. Render Mermaid only in documentation pages, with strict security, local bundled runtime, labelled output and source fallback; code highlighting happens at build time using semantic-token CSS.
4. Validate versions/topic/schema metadata, copy raw sources and assets with hashes, and make static aliases real pages. Explicit topic-missing fallback remains visible after switching. Historical assets are snapshot-owned; external governed references use a captured per-version inventory.
5. Render schema JSON generically, preserving every key/value and linkable JSON-pointer anchors; local references point to actual nodes. Validate examples through AJV 2020.
6. Reuse existing checks with pinned least-privilege Actions jobs; source/artifact hashes and terminal failures are mandatory. Desktop-only interactions stay in local/separately provisioned desktop evidence.
7. Apply actual passing required-check names only after terminal hosted success. Do not merge. Keep the existing milestones; set Project Slice to S005 where authorized access permits.

## Complexity Tracking

No constitution violations. A separate website workspace is required to keep marketing/docs payloads outside the desktop application. Shared staging/check primitives avoid duplicate validation definitions.
