# Tasks: Initial public release

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contract](contracts/initial-release.md).

**Tests**: Required by the approved autopilot discipline and release identity/qualification requirements. Meaningful current/nonzero rejection regressions precede their fixes. No native GUI/input/installation runs on the local workstation.

## Phase 1: Setup

- [x] T001 Resolve S022 selector/branch/spec and #74/#20/#21 tracking in specs/022-initial-public-release/ and GitHub; keep #27 deferred.
- [x] T002 Register only S022 tasks.md, verification.md and measurements.md exclusions in scripts/provenance.mjs before qualification; retain all design/implementation in source identity and record baseline byte inventory.

## Phase 2: Foundation

- [x] T003 Write nonzero current-schema/UI/controlled-manifest and immutable-baseline regressions in tests/initial-release.test.mjs, tests/fixtures/releases/ and relevant existing tests; keep historical/refusal fixture meanings intact.
- [x] T004 Seed complete docs/v0.1.0/, schemas/v0.1.0/ and site/snapshots/v0.1.0/ with version-owned paths/URIs/examples and exact captured reference bytes; add the pending manifest entry in site/versions.json with latest stillv0.0.0.
- [x] T005 Align VERSION, root/app/site package metadata, package-lock.json, Cargo.toml/Cargo.lock and Tauri config at canonical numeric triplet0.1.0 without dependency changes.

## Phase 3: US1 Obtain an identifiable first release (P1)

**Goal**: Real nonzero compiled/contract identities without changing archived baseline or runtime persistence policy.

**Independent test**: Current-schema/default/matrix regressions and actual native Full/Lite identities agree with0.1.0; historical bytes and refusal cases remain unchanged.

- [x] T006 [US1] Select elected schemas in scripts/preparation-acceptance.mjs and scripts/release-record.mjs, and elected receipt version in scripts/qualify.mjs using existing product-version authority.
- [x] T007 [US1] Add a native capabilities matrix/version regression, then stage the elected matrix in apps/gallery/src-tauri/build.rs and embed it in src/launch.rs through OUT_DIR with exact rerun-if-changed input.
- [x] T008 [US1] Derive app initial Snapshot/settings versions from app metadata in apps/gallery/src/lib/product-version.ts, use-gallery-state.ts, types.ts and src/app/gallery.tsx; preserve existing branded UI and behavior.
- [x] T009 [US1] Update only routine current settings fixtures in scripts/test-native.mjs and test-windows/macOS/linux-packages.mjs to productVersion; retain strict native settings/portable stored-version refusal and deliberate legacy updater exceptions.
- [x] T010 [US1] Run focused product-version/proof/preparation/frontend and native unit/build checks through hidden tooling; record actual outcomes in specs/022-initial-public-release/verification.md.

## Phase 4: US2 Understand supported initial scope (P1)

**Goal**: Complete accurate0.1 documentation and explicit optional deferrals, retaining all0.0 content unchanged.

**Independent test**: Both complete versions and all contracts/examples pass private renderer/browser checks; public baseline selection stays unchanged before real publication.

- [x] T011 [US2] Author initial-scope decisions and current entry points in docs/v0.1.0/index.md, overview.md, browsing-and-playback.md, gallery-lifecycle.md, README.md and CONTRIBUTING.md; map #20/#21 deferrals and later #27 without public tracking links.
- [x] T012 [US2] Correct AGENTS.md availability guidance and new-version distribution/installation/verification/interface prose and version-owned references in docs/v0.1.0/, retaining measured host/runtime limits, no-signing policy and strict writer compatibility.
- [x] T013 [US2] Make landing/edition availability wording conditional on actual canonical publication in apps/site/src/app/page.tsx using existing layout/brand; retain unpublished baseline wording before publication.
- [x] T014 [US2] Isolate the controlled documentation fixture manifest to copied baseline before adding private future versions in tests/fixtures/releases/documentation.mjs; pass the pending-real-version regression without changing real snapshots.
- [x] T015 [US2] Write actual-candidate docs gate identity/output refusal tests in tests/initial-release.test.mjs or dedicated candidate-docs tests before adding the helper and CI integration.
- [x] T016 [US2] Add callable scripts/release-candidate-docs.mjs and scripts/ci-release.mjs step using the complete source manifest, exact native candidate and private output; keep native assembly unchanged and store separate gated receipt.
- [x] T017 [US2] Retain actual candidate receipt/export in .github/workflows/ci.yml release-validation artifacts and supply the existing read-only GH_TOKEN for nonzero predecessor lookup.
- [x] T018 [US2] Record concise release history/dated decisions in CHANGELOG.md and commit complete authored docs/schema/sourceA, then use existing reviewVocabulary/retainSnapshot to record the ordinary review and real capture revision in site/retained/v0.1.0.json; commit receiptB separately.

## Phase 5: US3 Publish after owner merge (P1), pre-merge delivery

**Goal**: Fully qualified official PR ready for owner merge, with exact post-merge publication instructions and no premature product publication.

**Independent test**: All nine terminal CI scopes and independent readback agree with the clean pushed head; all findings resolved within two review rounds.

- [ ] T019 [US3] Run npm run check, npm test, check:docs, check:app and affected public/private renderer/browser checks; inspect UTF8/LF/mojibake and baseline hashes, recording preparation/qualification/combined clocks in specs/022-initial-public-release/measurements.md.
- [ ] T020 [US3] Push/open the official S022 PR closing #20/#21 and referencing #74 without prematurely closing publication; set primary project items to S022/PR review.
- [ ] T021 [US3] Complete all nine hosted qualification scopes and independently read exact native/proof ZIPs, assembly, public static output, actual candidate docs receipt/export and controlled publication gates; retain immutable IDs/digests and separated clocks in PR evidence.
- [ ] T022 [US3] Respond to every actual review finding with changes/tests or a substantive resolution, resolve every thread and request no more than a second total round; record reviewed/fix heads in specs/022-initial-public-release/verification.md and PR.
- [ ] T023 [US3] Run installed Spec Kit convergence, append/complete only real remaining build gaps in specs/022-initial-public-release/tasks.md, and verify final clean pushed head, terminal checks and tracking before owner final review/merge.

## Phase 6: US3 Publish after owner merge (P1), post-merge execution

**Owner merge is required before this phase. These tasks stay pending at the current turn's merge handoff.**

- [ ] T024 [US3] After owner merge, synchronize main and require a new successful trusted push-to-main0.1.0 Qualification run; independently retain/read original native package inputs and elected documentation identity, recording accepted source/run in #74.
- [ ] T025 [US3] Dispatch existing .github/workflows/release.yml on main with version0.1.0, empty previous_version, accepted qualification_run and short highlights, with the publisher appending the final master changelog link; observe existing attributable recovery without rebuilding accepted bytes.
- [ ] T026 [US3] Independently read actual public tag/source, six primary assets/support metadata, hashes/URLs/canonical release.json, both docs gates and exact Pages/latest/download selection; close #74 only after complete public verification.

## Dependencies and execution order

Setup -> red foundation -> versioned source -> US1 native/default fixes -> US2 accurate snapshots/private gates -> committed sourceA/captureB -> local/hosted qualification -> bounded reviews -> owner merge -> trusted-main qualification/publication/readback. Shared manifests/version/source/schema files are sequential.

## Parallel opportunities

The installed planning command dispatches read-only native/version and docs/publication research agents. Schema and controlled-manifest pure regressions may be evaluated independently once fixture roots are explicit. Implementation remains coordinated in this checkout; no parallel mutation of version/snapshot/source identity is elected.

## Implementation strategy

US1 is the identified-candidate MVP; initial release acceptance also requires US2 and pre-merge US3. Do not claim actual release completion at owner handoff. Post-merge US3 uses newly accepted main artifacts and retains the same S022 scope/authorization. Custom reviewer checklist markers remain unchanged; only implementation task markers track delivery.
