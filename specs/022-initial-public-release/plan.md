# Implementation Plan: Initial public release

**Branch**: `codex/s022-initial-public-release` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

**Input**: S022 specification and #74, with initial-scope decisions #20/#21 and deferred #27.

## Summary

Prepare real0.1.0 software, complete retained docs/schema and six native Full/Lite rows using the existing release pipeline. Remove demonstrated baseline-only consumer/fixture assumptions, privately qualify the actual authored release docs, preserve public baseline selection until real publication, and complete PR/reviews before owner merge. The same slice publishes accepted trusted-main bytes after that merge.

## Technical Context

**Language/Version**: Pinned Node24.11.0 ESM/TypeScript, repository Rust toolchain and Python3.12 helpers.

**Primary Dependencies**: Existing Rust/Tauri native product, Next.js/Fumadocs/Shiki website, Ajv2020, GitHub Actions/Release/Pages APIs, locked Cargo/npm/Python dependencies. No dependency upgrades elected.

**Storage**: Existing product stores unchanged; new docs/v0.1.0, schemas/v0.1.0, site/snapshots/v0.1.0 and site/retained/v0.1.0.json. Native/archive receipts stay in ignored .local and hosted artifacts.

**Testing**: Meaningful nonzero-version/schema/default/matrix/fixture/candidate-gate regressions before fixes; npm run check, npm test, check:docs, check:app, build/check/test:site, controlled publication campaign and nine hosted scopes.

**Target Platform**: Existing Windows x86_64, Ubuntu24.04 x86_64 and macOS15 aarch64 elections, both editions. No expanded host/architecture claims.

**Project Type**: Native desktop application, maintainer release tooling and independent static website.

**Performance Goals**: Qualification target660 seconds, hard900,15-second reserve, terminal timestamp authority. Separate preparation/qualification/combined accounting. Target-only overrun remains advisory.

**Constraints**: Preserve every historical0.0.0 byte and accepted artifact byte; never local native GUI/input/installers; no signing/notarization/stapling; max two requested reviews; owner controls merge; no product publication before merge; no dependency or brand-kit refresh.

**Scale/Scope**: One initial product version, two complete docs snapshots, six primary package rows and supporting Linux descriptor, three scope/release issues, one official PR followed by publication.

## Constitution Check

Pre-research: PASS across I owner scope, II proportional implementation, III byte/brand integrity, IV truthful functional/native/source evidence, V owner publication boundary. Research agents are read-only as required by installed plan. No new architecture choices or unresolved clarifications remain.

Post-design: PASS. Existing release recovery/publication controls are reused; actual publication remains the post-owner-merge phase. All implementation/design/contracts stay in source identity. Only S022 tasks.md, verification.md and measurements.md are preregistered progress exclusions. Reviewer-owned release checklist is not implementation status.

## Design decisions

1. Version authority: VERSION plus existing readProductVersion; align package/workspace/native/lock identities to0.1.0, retaining immutable historical schemas. Current format1 release validation selects the current owned schema while retaining its compatible wire domain.
2. Native matrix: existing apps/gallery/src-tauri/build.rs stages schemas/v<CARGO_PKG_VERSION>/platform-matrix.json into OUT_DIR with rerun-if-changed; launch.rs embeds those exact bytes. Preparation acceptance uses readProductSchema.
3. Frontend/fixtures: shared src/lib/product-version.ts imports the app package version; initial snapshot/settings use it and ViewSettings.version is string. Routine native package/settings fixtures use elected productVersion. Historical/future refusal tests and foreign-package/runtime sentinels remain untouched.
4. Snapshot: complete new docs/schema/captured references, version-owned path/URI/example changes, ordinary vocabulary review and real sourceA -> captureB provenance. Source latest remainsv0.0.0 until actual canonical publication. Unpublished recapture is a reviewed authoring update only after no-publication verification.
5. Scope: current features retained; #20 richer previews/autoplay/extra criteria deferred and #21 no editing for0.1. #27 guided launcher acquisition deferred, independently usable existing optional jobs preserved. New docs are self-contained and do not link internal tracking. Landing wording derives from actual model.release, preserving existing brand/layout.
6. Candidate gate: separate .local/release-candidate-docs.json plus exact .local/release-candidate-site export qualifies actual0.1 content after native assembly. It does not replace canonical native assembly. CI retains both for independent readback; nonzero predecessor lookup uses read-only GH_TOKEN.
7. Controlled campaign: isolate baseline-only fixture manifest before adding controlled versions. Test pending real0.1 plus controlled same-name version so source additions cannot break the established recovery campaign.
8. Delivery: PR links #74 without closing publication prematurely; closes #20/#21 on owner merge. Two review rounds maximum; every finding gets response/fix/resolution. Final progress/evidence can be recorded in PR without further source changes.
9. Publication: after owner merge, require a new successful trusted-main Qualification run for0.1.0, independently inspect original outputs, execute existing release.yml with no previous_version and concise highlights, then verify exact tag/assets/release.json, both gates, current downloads/docs and Pages. No post-acceptance rebuild. #74 closes only after real publication readback.

## Project Structure

### Documentation (this feature)

`specs/022-initial-public-release/` contains spec, plan, research, data model, contracts, quickstart, tasks, requirements/release checklists and verification/measurements.

### Source Code (repository root)

- VERSION, package.json/package-lock.json, Cargo.toml/Cargo.lock, apps/gallery/package.json, apps/site/package.json, Tauri config: current identity.
- apps/gallery/src-tauri/build.rs and src/launch.rs: elected embedded platform matrix.
- apps/gallery/src/lib/product-version.ts, types.ts, use-gallery-state.ts and src/app/gallery.tsx: initial/default identity.
- scripts/preparation-acceptance.mjs, qualify.mjs and native/package campaigns: current schema/fixture identities.
- scripts/release-record.mjs, ci-release.mjs and release-candidate-docs.mjs; .github/workflows/ci.yml: current contract/private actual docs gate and retained outputs.
- tests/fixtures/releases/documentation.mjs plus targeted new tests: controlled fixture isolation and release regressions.
- docs/v0.1.0/, schemas/v0.1.0/, site/snapshots/v0.1.0/, site/retained/v0.1.0.json and site/versions.json: complete new release snapshot.
- apps/site/src/app/page.tsx, README.md, CONTRIBUTING.md and CHANGELOG.md: accurate current entry points, observed publication wording and history; AGENTS.md scopes product availability claims to actual verified releases.

**Structure Decision**: Extend existing modules; no new runtime service, package system, signing path or product feature is added. A small actual-candidate docs helper makes pre-merge rendering testable and its retained contract explicit.

## Execution phases

Setup/progress exclusions -> red regressions -> version/consumer fixes -> new snapshot/scope -> current-source capture -> local/hosted qualification and independent readback -> bounded reviews/owner handoff -> owner merge -> trusted-main publication and independent public readback. Actual capture and accepted native-source revisions remain separately recorded.
