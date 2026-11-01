# Implementation Plan: Verified releases and versioned documentation

**Branch**: codex/s021-verified-releases | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

## Summary

Close #26/#31 together. Extend the existing native package builders/validators and versioned renderer with a canonical immutable release identity, retained documentation inputs, two explicit documentation gates and a resumable GitHub Release client. Qualification uses controlled service/future-version fixtures and actual elected native package evidence. No real product release/tag is executed by S021 delivery.

## Technical Context

**Language/Version**: Node24 ESM maintainer tooling; existing Rust1.96 native helpers; existing Next.js/Fumadocs/Shiki site.

**Dependencies**: Existing Node fs/crypto/fetch, Ajv, Markdown-it, Playwright, archive helpers and native validators. No new service or signing dependency.

**Storage**: Strict bounded JSON records, immutable package/snapshot files, owned operation directories and observed remote release/assets. Publication state is external canonical release data, not mutable bytes embedded in accepted native packages.

**Testing**: Node contract/integration/failure tests; real local HTTP fixture through the production client; two-version renderer/browser fixtures; current eight native/repository/site scopes plus a dependent release-validation scope consuming exact retained artifacts.

**Platforms**: Maintainer Windows/Linux/macOS; existing six primary Full/Lite package rows and eight recipient scope observations. Existing numeric-triplet native version domain stays explicit; MSI bounds255.255.65535 are checked before build. VERSION remains0.0.0 now.

**Performance**: Same660s advisory target,900s hard limit,15s reserve and separate preparation/qualification/combined accounting. Archive readiness, native compilation and fixture site builds belong to preparation; elected validation remains timed.

**Constraints**: Headless local processes; GUI/input isolated CI only. No actual product publication, no new preview/editing/sharing behavior, no brand-kit mutation, no package rebuild after acceptance.

## Constitution Check

Pre-design PASS: owner-approved outcomes and existing targets preserved; source/bytes/native/publication claims separate; version/schema/docs alignment and current renderer retained; no paid credentials or new usage policy. Explicit push/PR authorization overrides the autopilot skill's default pre-push pause. Owner controls final merge. Post-design must repeat these checks before tasks/analyze.

## Architecture and decisions

1. **One release contract**: scripts/release-record.mjs and versioned release-record.schema.json validate exact candidate source/revision/version, six ordinary package rows, supporting update descriptor, prerequisites/optional tools, archive/inventory/notice and native qualification bindings. Candidate identity excludes later observed publication and documentation receipts to avoid circular self-hashes. Candidate, staged and verified-published views share immutable identity. The published record is the only download authority.
2. **Native assembly**: scripts/release-assembly.mjs maps downloaded CI paths into retained roots and invokes existing Windows/macOS/Linux package validators. It selects build.records ordinary archives, never replacement/negative/runtime-proof payloads. Windows Full already embeds its updater and two descriptors. Linux Full's external descriptor is an additional asset; preserve its installer basename and exact bytes. No accepted archive is renamed if embedded/sidecar identity depends on its filename.
3. **Version readiness**: scripts/product-version.mjs reads VERSION and checks aligned package/workspace/native schema identities. Builders and validators take their actual product version instead of unrelated0.0.0 literals; native helpers use compiled workspace identity or validated candidate identity as appropriate. Preserve explicit legacy0.0.0 compatibility exceptions and dpkg installed-predecessor semantics. Current unreleased baseline remains unchanged. Future package prose describes immutable build provenance and external publication verification, not fabricated embedded publication status.
4. **Complete snapshots**: scripts/release-docs.mjs captures already authored/elected docs and matching schema/example/navigation/assets/captured references into fresh retained snapshots with complete hashes. It never rewrites baseline prose into a claimed new release. Identical repeat is allowed; material historical changes require a dated old/new-digest correction and changelog reference. Vocabulary review binds document/glossary inventories; major review additionally binds terms, definitions and primary/local usage references.
5. **Existing renderer integration**: extend scripts/site-content.mjs, build-site.mjs, check-site.mjs and test-site.mjs with explicit content/manifest/output inputs for isolated fixtures. Use the same source/render/link/schema logic, not a second renderer. A shared snapshotTopics helper includes chapters, master schema, additional schemas and contracts in navigation/version selection/aliases. Historical release records remain per-snapshot rather than one latest-only assertion.
6. **Two documentation gates**: before product publication, qualify all retained versions against the immutable candidate and bind source/snapshot/renderer/output/required outcomes while production pointers stay unchanged. After actual release readback, qualify the observed published projection again before canonical record/latest promotion. The second site export is a separate explicitly qualified projection; accepted native packages are never rebuilt. Normal public consumers never accept candidate records.
7. **Resumable publication**: scripts/github-release.mjs provides bounded authenticated REST, paginated release/asset observation, safe binary redirects without cross-origin credentials and streamed byte verification. scripts/release-publication.mjs owns stage/publish/observe/promote transitions, exact source-tag resolution and owned draft identity. Reconcile lost acknowledgements by observation. Same-name mismatches/foreign content refuse, never clobber. Published release initially uses make_latest:false. Canonical release.json is uploaded/read back only after the second docs gate; native latest promotion follows comparison with prior selection. Serialized workflow execution and compare-before-mutation preserve observed conflicting changes; no filesystem/service-wide compare-and-swap claim is made.
8. **Website/publication boundary**: normal website CI resolves the actual latest canonical record from GitHub (absence preserves baseline), verifies its publication/assets and feeds a generated model without changing source provenance. Release snapshots are authored in source before execution. Production publication is manual workflow_dispatch only; it downloads exact qualified native inputs, gates publication, verifies remote bytes, qualifies the published site projection, promotes the canonical record/latest and deploys the retained static output. No source-commit rewrite or second mutable publication authority is needed. Pages keeps exact-artifact verification, serialized deployment and current-revision checks. Binaries never enter Pages.
9. **Verification**: scripts/ci-release.mjs and controlled HTTP fixtures test production client/state machine success, exact repeat, partial/lost acknowledgements, tag/asset conflicts, stale/forged gate bindings, failed publication and promotion, safe redirects/pagination and old-pointer retention. Website fixtures exercise two version/topic/schema/search/fallback states and glossary/correction rules. Final artifact readback includes all required native scopes and dependent release-validation evidence.

## Project Structure

- scripts/product-version.mjs, release-record.mjs, release-assembly.mjs: version/identity/assembly.
- scripts/release-docs.mjs: complete snapshots, review/correction and documentation gate bindings.
- scripts/github-release.mjs, release-publication.mjs, release.mjs: real transport, state machine and CLI.
- scripts/ci-release.mjs, test-release-campaign.mjs: dependent exact-artifact and hermetic publication qualification.
- scripts/site-content.mjs, build-site.mjs, check-site.mjs, test-site.mjs; apps/site/src/lib/navigation.mjs and app/[...route]/page.tsx: existing renderer/consumer integration.
- scripts/build-*-packages.mjs, *-packages.mjs, build-proof.mjs, linux-package-guard.sh and native helpers: future-version readiness without changing current version.
- schemas/v0.0.0/release-record.schema.json, site/versions.json: public contract and rendered reference.
- tests/release-*.test.mjs, tests/fixtures/releases/: meaningful controlled cases.
- .github/workflows/ci.yml, release.yml: read-only PR qualification and explicit production execution.
- docs/v0.0.0/: authoritative distribution/website/verification guidance; CHANGELOG.md: history/dated decisions.
- specs/021-verified-releases/: intent/design/tasks and internal evidence only.

## Delivery order

Identity/version/contracts -> native byte assembly -> snapshot/gate/renderer integration -> publication state machine -> hosted integration -> all-scope evidence/CI/reviews/convergence -> owner merge. Each story is independently testable with controlled inputs; production promotion requires every gate.

## Complexity Tracking

One canonical contract and two observation-gated transitions are needed to avoid false publication and the candidate/published docs bootstrap cycle. Reuse native and renderer validators. No new updater service, database, release signing or framework is introduced. Research agents are read-only, as required by the installed plan command; implementation remains coordinated in this checkout.

## Post-design constitution check

PASS: owner scope/targets/versions preserved; native/publication boundaries explicit; comparison/inventory integrity and failures tested; current product baseline remains truthful; all required checks and owner merge boundary retained. Reviewer-owned custom checklist markers are not implementation completion indicators and remain untouched by implement.

## Analysis refinement, 2026-10-31

A1: Before any production release mutation, revalidate the retained inputs against the real repository Qualification workflow: successful trusted main-branch run, exact elected native source SHA, passing required jobs and immutable artifact digests. Fixture/PR/mixed-source inputs cannot authorize production writes. Execute credentialed tooling from trusted main; historical accepted native source remains distinct from the current renderer source. Pages deploys only its current renderer revision and exact separately qualified static output. No source checkout from an unvalidated input is executed with publication credentials.

## Implementation refinement, 2026-10-31

Snapshot capture origin identifies the authored bytes; the external release gate binds the actual qualified native revision and current renderer separately. Requiring an embedded capture receipt to name its own containing final commit would create a self-reference, so capture revision is retained provenance rather than equated to the later qualification revision. Published canonical retries preserve an existing valid record for the same immutable candidate/publication while current documentation receipts still gate a new promotion attempt. Public source manifests inventory retained content; actual canonical release observations elect public released snapshots/latest, preventing pending source content from implying publication.
