# Tasks: S007 Website experience

Branch: codex/007-website-experience. Complete #36 and all children #37 through #45. All stories are P1 and required for final delivery. Tests are required by this slice and precede implementation. No independent MVP is the completion boundary.

## Phase 1: Setup and shared foundation

- [x] T001 Finalize plan/research/model/contracts, requirements-quality review and blocking analysis in specs/007-website-experience (FR-001..015, SC-001..009).
- [x] T002 Add failing rendering/copy/metadata/diagram regression contracts in tests/site.test.mjs and preserve confinement/version/release tests (FR-001/007/008/010, SC-001/004/006).
- [x] T003 Pin compatible Fumadocs/Shiki/theme/Tailwind/axe dependencies in package.json, apps/site/package.json and package-lock.json; configure apps/site/postcss.config.mjs (FR-001/003, #37/#42).
- [x] T004 Implement build highlighting and progressively enhanced code controls in scripts/site-content.mjs and apps/site/src/components/code-tools.tsx (FR-007, #40).
- [x] T005 Implement shared theme/font/token/AppFrame mapping in apps/site/src/app/layout.tsx, site.css and components/site-provider.tsx (FR-003/004/006/009, #42).

## Phase 2: US1 Understand the gallery

- [x] T006 [US1] Build the composed hero, labeled contact sheet, workflow, editions and useful actions in apps/site/src/app/page.tsx and site.css (FR-002/003, SC-002, #38).
- [x] T007 [US1] Verify responsive themes, no-script content and truthful availability in scripts/test-site.mjs (FR-012, SC-002/005).

## Phase 3: US2 Read retained documentation

- [x] T008 [US2] Integrate manual Fumadocs page tree/TOC with retained routes/headings in apps/site/src/app/[...route]/page.tsx and lib/model.ts (FR-001/005/006, #37/#39).
- [x] T009 [US2] Preserve version-scoped search and provide keyboard compact navigation, native anchors/history and reduced-motion active indicator in components/docs-controls.tsx, components/site-provider.tsx and site.css (FR-001/004/005/006, SC-003).
- [x] T010 [US2] Extend scripts/check-site.mjs and test-site.mjs for source equality, every fragment, final-section activation, history and missing-topic/search failure (SC-001/003).

## Phase 4: US3 Examples, diagrams and links

- [x] T011 [US3] Add descriptive corpus metadata in site/diagrams.json and deterministic strict SVG generation in scripts/site-diagrams.mjs, integrated by scripts/build-site.mjs after local-font staging (FR-008, #41).
- [x] T012 [US3] Remove reader Mermaid runtime and style native-size themed SVG/source/code/link presentations in apps/site/src/components/diagrams.tsx and app/site.css (FR-007/008/009, #40/#41/#42).
- [x] T013 [US3] Verify exact-copy/failure/unknown-language/no-script, all diagram semantics/references/contrast and wrapped underline states in tests/site.test.mjs and scripts/test-site.mjs (SC-004/005).

## Phase 5: US4 Identity and discovery

- [x] T014 [US4] Stage exact governed icons/manifest dependencies/social image in scripts/stage-brand.mjs (FR-003/010, #43).
- [x] T015 [US4] Implement route-aware metadata, explicit alias canonicalization, sitemap/robots and error indexing in apps/site/src/lib/metadata.ts and app route files (FR-010, SC-006).
- [x] T016 [US4] Correct stale deployment status and authoritative website/rendering contracts in docs/v0.0.0/index.md, website-and-documentation.md and verification-and-compatibility.md; update CHANGELOG.md (FR-011, #45).
- [x] T017 [US4] Verify all head tags and asset resources/inventory in scripts/check-site.mjs and test-site.mjs (SC-006).

## Phase 6: US5 Quality and delivery

- [x] T018 [US5] Add measured axe, keyboard/zoom/reflow/theme/motion and before-after screenshot matrix in scripts/test-site.mjs (FR-012/013, SC-005, #44).
- [x] T019 [US5] Enforce preimplementation cold-response/output/font/SVG budgets and throttled lab samples in scripts/test-site.mjs and check-site.mjs, retaining evidence in .local (SC-007).
- [x] T020 [US5] Reorder browser readiness before SVG builds in scripts/ci.mjs, preserve qualification accounting and upload visual/performance evidence in .github/workflows/ci.yml (FR-014, SC-008).
- [x] T021 [US5] Run full repository, source, site and Windows product qualification; inspect screenshots and record concrete coverage/limits in specs/007-website-experience/verification.md (SC-001..008).
- [x] T022 [US5] Commit, automatically push and publish/attach official PR closing #36..45 on merge; update Project8 slice/status (FR-015).
- [x] T023 [US5] Scope existing Pages bootstrap to the exact branch/PR, wait for final-head hosted CI and verify live source/artifact identity/bytes/rendered behavior (FR-014, SC-009).
- [x] T024 [US5] Respond to every review comment, implement necessary fixes and resolve threads with at most one second-round @Codex request, then confirm final-head CI/live and hand off for owner review/merge (FR-015, SC-009).

## Dependencies and execution

T001 is a blocking gate. T002 must fail before T003–T005. Shared foundation precedes all UI stories. US1 and US2 are independently verifiable after it. T011 follows T004/T005 and font staging T014; execute T014 early when preparing the SVG builder. T013 follows T004/T011/T012. US4 metadata follows route integration; documentation edits preserve version/source fidelity. T018–T020 extend the verification harness as features land; T021 requires all story checks. T022 follows successful qualification, T023 follows PR creation, T024 follows actual reviews and exact-head checks. Any review changes require affected local checks and fresh final-head CI/live verification. No merge, release, unrelated dependency PR or DNS change is authorized by this slice.

No tasks are marked parallel because the shared rendering/layout/test files make sequential implementation clearer. Research was separately delegated as explicitly required by speckit-plan.

Qualification repair under T021: scripts/native-input.ps1 checks completed dialog visibility rather than HWND lifetime; scripts/test-native.mjs verifies the exact selected root. All native groups remain mandatory.
