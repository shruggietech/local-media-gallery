# Tasks: Verified releases and versioned documentation

**Input**: [spec.md](spec.md), [plan.md](plan.md), research, data model and [pipeline contract](contracts/release-pipeline.md).

**Tests**: Required by the approved autopilot discipline and feature failure/qualification requirements. Write meaningful rejection/recovery tests before their implementation.

## Phase 1: Setup

- [x] T001 Resolve S021 artifacts, primary issue/project mapping and boundaries in specs/021-verified-releases/ and GitHub #26/#31.
- [x] T002 Register only S021 tasks/verification/measurements progress exclusions in scripts/provenance.mjs before qualification; implementation/design/contracts remain hashed.

## Phase 2: Foundation

- [x] T003 Write central-version and strict release-identity/schema tests in tests/product-version.test.mjs and tests/release-record.test.mjs, including mismatch, unsupported native version, duplicates and unsafe names.
- [x] T004 Implement scripts/product-version.mjs and native version readiness in crates/windows-package/src/lib.rs, crates/macos-package/src/lib.rs and package validators; constraint: canonical numeric triplet without leading zeros, Windows255/255/65535, current VERSION unchanged. Candidate version must not blindly equal helper build version; preserve predecessor/legacy compatibility.
- [x] T005 Define schemas/v0.0.0/release-record.schema.json and scripts/release-record.mjs; constraints: formatVersion1, product local-media-gallery,40-hex revision,64-hex hashes, positive source file count, decimal byte counts, unique portable asset names, unknown fields rejected, immutable candidateId excludes later observations/receipts.

## Phase 3: US1 Assemble an identified release (P1)

**Goal**: Exact qualified ordinary package assembly without rebuilding accepted bytes.

**Independent test**: Six elected package rows plus support assemble idempotently; missing/mixed/tampered inputs refuse without public promotion.

- [x] T006 [US1] Write assembly/input-path/native-evidence rejection tests in tests/release-assembly.test.mjs and tests/fixtures/releases/.
- [x] T007 [US1] Parametrize Windows builder/installer/native assertions in scripts/build-windows-packages.mjs, windows-packages.mjs, windows-package-evidence.mjs, test-windows-packages.mjs and packaging/windows/installer.wxs; preserve embedded updater/descriptors and neutral immutable future-build provenance.
- [x] T008 [US1] Parametrize Linux builder/guards/native assertions in scripts/build-linux-packages.mjs, linux-packages.mjs, linux-package-scripts.mjs, linux-package-guard.sh and test-linux-packages.mjs; preserve installed-predecessor upgrade arguments and external Full descriptor basename binding.
- [x] T009 [US1] Parametrize macOS/proof identities in scripts/build-macos-packages.mjs, macos-packages.mjs, build-proof.mjs and test-macos-packages.mjs without changing current version or native payload bytes after acceptance.
- [x] T010 [US1] Implement scripts/release-assembly.mjs using existing portable native validators and confined CI path mapping; constraint: six primary archives only from ordinary build.records, Linux Full descriptor additional, no replacement/negative/runtime-proof downloads.
- [x] T011 [US1] Exercise exact repeat, complete inventories/notices/native scope binding and changed/missing/mixed artifact refusal in tests/release-assembly.test.mjs and scripts/test-release-campaign.mjs.

## Phase 4: US2 Retain and qualify documentation (P1)

**Goal**: Complete historical snapshots and two exact-input documentation gates through the existing renderer.

**Independent test**: Two private future fixture versions exercise topics/schema/search/assets/corrections/reviews and refuse mismatched gates without changing public selection.

- [x] T012 [US2] Write snapshot/path/idempotence/correction/glossary/gate tests in tests/release-docs.test.mjs; constraint: complete sorted relative-path/byte/hash inventory, existing snapshot unchanged unless dated old/new-digest correction.
- [x] T013 [US2] Implement capture/review/correction and qualification records in scripts/release-docs.mjs; bind ordinary document/glossary inventories and major term/definition/primary/local-reference coverage without claiming automated semantic review.
- [x] T014 [US2] Write additional-schema/contract topic-preservation and explicit missing-topic tests in tests/site-navigation.test.mjs.
- [x] T015 [US2] Add shared snapshotTopics in apps/site/src/lib/navigation.mjs and use it in apps/site/src/app/[...route]/page.tsx and alias/version navigation.
- [x] T016 [US2] Expose explicit content/manifest/output roots in scripts/site-content.mjs, build-site.mjs and check-site.mjs while retaining normal production defaults and source/asset/schema rules.
- [x] T017 [US2] Prepare two complete controlled version fixtures and private exports in tests/fixtures/releases/ and scripts/test-release-campaign.mjs with shared/missing schema topics, assets/fragments, examples, references and glossary records.
- [x] T018 [US2] Add actual headless browser version/search/fallback acceptance through scripts/test-site.mjs or shared callable checks, preserving baseline production assertions.
- [x] T019 [US2] Implement candidate pre-publication and observed-publication promotion gates in scripts/release-docs.mjs and strict canonical consumer integration in scripts/site-content.mjs; constraint: exact candidate/source/snapshot/renderer/output/outcome binding, historical source separate, candidates never public download authority.

## Phase 5: US3 Publish and promote observed releases (P1)

**Goal**: Recoverable production transport/state machine with complete observed byte identity and old-pointer preservation.

**Independent test**: Production client against controlled HTTP service demonstrates success/repeat, partial/lost acknowledgement, conflicts, failed publication and promotion.

- [x] T020 [US3] Write real HTTP transport tests in tests/github-release.test.mjs for pagination, bounded errors/deadlines, direct/redirected binaries and cross-origin credential stripping.
- [x] T021 [US3] Implement scripts/github-release.mjs for exact repository/tag/draft/asset observation, annotated-tag resolution, authenticated raw uploads and streamed independent download digest checks.
- [x] T022 [US3] Write state-machine/service fixture tests in tests/release-publication.test.mjs and tests/fixtures/releases/ for lost create/upload/publish acknowledgements, owned starter assets, foreign same-name conflicts, stale gate bindings and prior-pointer changes.
- [x] T023 [US3] Implement stage/publish/observe/retry in scripts/release-publication.mjs; constraint: no foreign/published overwrite, no blind retry, make_latest:false until promotion, uncertain mutation remains observed incomplete.
- [x] T024 [US3] Implement post-docs canonical release.json upload/readback, compared latest promotion and actual published-record resolution in scripts/release-publication.mjs and scripts/release.mjs; preserve prior selection on observed conflicts and fail private fixtures closed for production publication.
- [x] T025 [US3] Add explicit CLI and manual-only .github/workflows/release.yml execution from trusted main, revalidating successful Qualification workflow/repository/event/main-branch/elected source/required jobs/artifact digests before writes and rejecting fixture/PR/mixed-source inputs, both documentation gates and unchanged native bytes; deploy the separately qualified static artifact through existing Pages controls, never product binaries.

## Phase 6: Integration and delivery

- [x] T026 Add scripts/ci-release.mjs, release fixture campaign and dependent .github/workflows/ci.yml job consuming source-bound native/site artifacts; retain eight existing scopes and release-validation evidence, qualification660/900/15 and separated clocks.
- [x] T027 Update authoritative docs/v0.0.0/installation-and-distribution.md, website-and-documentation.md, verification-and-compatibility.md and schema reference in site/versions.json; record short feature/dated pipeline decisions in CHANGELOG.md.
- [x] T028 Run npm run check, npm test, affected Rust/app/site and headless fixture checks; verify UTF8/LF/mojibake and record concrete outcomes in specs/021-verified-releases/verification.md.
- [ ] T029 Push the official S021 PR closing #26/#31, attach tracking and handle every finding within at most two review rounds; retain exact review heads/results in specs/021-verified-releases/verification.md.
- [ ] T030 Complete terminal green existing/native/release-validation scopes and independent exact-source/archive/snapshot/gate/fixture readback; record separated accounting in specs/021-verified-releases/measurements.md.
- [x] T031 Run installed Spec Kit convergence against present spec/plan/tasks; append only real remaining build work and complete it in specs/021-verified-releases/tasks.md.
- [ ] T032 Verify clean pushed final head, all terminal checks, source/evidence/tracking and review state, then request owner final review/merge; no actual product release/tag during S021 delivery.

## Dependencies and execution order

Setup -> foundation -> US1 -> US2 -> US3 -> integration/delivery. US2 pure snapshot/navigation tests may be developed after foundation while assembly adapters are inspected; both publication gates depend on strict candidate identity. Production publication requires all stories. Shared package/native/source/version/renderer files remain sequential.

## Parallel examples

Read-only release/API and documentation integration research use separate agents under the installed plan command. Native descriptor and renderer inspections are independent. Test files for snapshot and HTTP behavior are separable after the shared contract; implementation remains coordinated in this checkout.

## Implementation strategy

US1 supplies the identified-byte MVP, but acceptance requires all three P1 stories. Test failure paths before mutation logic. Preserve source/runtime/proof/publication distinctions, current unreleased baseline and existing native/viewing behavior. Reviewer-owned checklist markers are not implementation task status.

## Phase 7: Convergence

- [x] T033 Retain both exact private fixture exports, their complete source snapshots and canonical fixture record in release-validation CI artifacts so final independent gate/output readback can recompute accepted identities per FR-007, FR-015, SC-002 and plan decision9 (partial, HIGH).
- [x] T034 Return nonmutating usage/help when the release CLI has no command or an explicit help flag, matching the pipeline command contract per plan delivery tooling and T025 (partial, LOW).

## Phase 8: Qualification follow-up

- [x] T035 Separate measured CI evidence expansion from the existing build-tool archive cap, share strict raw ZIP path/member/physical-root validation, and verify actual retained Windows evidence plus traversal/alias/link/bound regressions per FR-002, FR-015 and US1/AC1.
