# S022 research

## 2026-10-31: Nonzero release identity

Decision: Derive current runtime/qualification schemas from the existing product version authority, align root/app/site/Cargo/lock metadata, and stage the matching platform matrix through the existing Rust build script. Frontend initial state derives from app package metadata through one small shared module; the current ViewSettings version is a string carried by native envelopes, not a baseline literal.

Rationale: Mandatory preparation acceptance still loads schemas/v0.0.0; native capabilities embed the baseline matrix; frontend initial/default state and generic qualification receipts hard-code0.0.0. These must not describe a real0.1 build as the specification baseline. Existing readProductSchema and build.rs avoid a parallel staging architecture.

Alternatives: Global replacement would corrupt historical fixtures and retained contracts. Generated tracked version source adds unnecessary mutation and drift. Runtime lookup for the native matrix would introduce an installation dependency. Read-only planning research identifies exact mandatory call sites and intentional exceptions.

## 2026-10-31: Settings compatibility and fixture scope

Decision: Keep existing strict product-version writer compatibility. Routine current native/package fixture settings use productVersion; deliberate old/future refusal fixtures remain historical. The first public product has no shipped predecessor. Preserve existing updater baseline-writer exceptions rather than expanding compatibility implicitly.

Rationale: Native settings and portable readers reject a version different from CARGO_PKG_VERSION; baseline literals in routine campaigns would be ignored after the version bump. Calling these compatibility tests would be inaccurate. Format1 persistence semantics are unchanged.

Alternatives: Broadening writer compatibility is a separate behavior change with migration implications and is unnecessary for a first public release. Rewriting every historical unit fixture would weaken retained regression meaning.

## 2026-10-31: Complete snapshot and capture provenance

Decision: Copy all15 baseline chapters, complete schema/example and captured-reference trees to0.1.0, author only the new version, and preserve every0.0.0 byte. Keep source latest atv0.0.0 and use the existing released snapshot vocabulary with canonical-publication filtering. Commit complete authored sourceA before retainSnapshot records its real capture revision; commitB adds the ordinary vocabulary/capture receipt. Native/renderer qualification binds the final accepted revision independently.

Rationale: Capture provenance and later qualified source are distinct. The existing documentationIdentity validates complete inventories without a self-referential commit equality requirement. PublicSiteInputs hides pending snapshots until actual canonical release publication exists.

Alternatives: Editing the baseline violates retention. Advancing source latest announces an unpublished product. A new snapshot status would require an unnecessary protocol change. If later review changes pending docs, first verify no actual published0.1 canonical record, commit amended content, recapture to disposable output and replace only the unpublished receipt as normal reviewed authoring; never create false published correction history.

## 2026-10-31: Actual candidate versus controlled publication checks

Decision: Add private actual-current-candidate documentation qualification after native assembly, retaining a separate gated record and exact export. Keep the canonical native assembly record unchanged. Retain the controlled current-renderer/publication recovery campaign, but explicitly isolate its manifest to the copied baseline before adding controlled0.1/0.2 versions. Give release-validation its existing read-only job token for actual predecessor lookup.

Rationale: Normal website CI correctly hides unpublished0.1 content; the existing campaign only renders controlled content, so actual new documentation otherwise waits until post-merge execution to be tested. A separate receipt avoids changing the native assembly/rebuild comparison contract. The real publication context is qualified again after actual publication in the main-only release workflow.

Alternatives: Showing pending docs publicly violates selection rules. Fabricating observed native publication evidence is unnecessary. Replacing native assembly with fixture-only data would not qualify the real packages. Anonymous GitHub lookup needlessly risks shared rate limits.

## 2026-10-31: First public scope and UI wording

Decision: Close #20/#21 through explicit0.1 scope decisions, retaining current viewing behavior and deferring richer previews/autoplay/extra criteria and media editing. #27 remains subsequent guided preparation. New docs correct baseline-only distribution prose and an obsolete signed-inventory phrase; measured host/runtime limitations stay intact. Landing/edition copy becomes conditional on actual canonical release presence, using existing layout and brand vocabulary.

Rationale: The owner adopted the proposed first release scope. No existing capability is removed, and pending product publication must not be claimed in the website before observed release metadata exists.

Alternatives: Building optional additions would expand the accepted release slice. Leaving all release copy as intended/unpublished would misdescribe the actual published product. Brand identity/version remains independent; no kit bytes are edited.

## 2026-10-31: Delivery and publication boundary

Decision: PR phase closes scope decisions, completes CI/readback and at most two review rounds, then stops at owner merge. #74 remains open for the same slice's post-merge trusted-main qualification and actual publication/readback. Pre-merge CI artifacts identify the candidate; publication uses newly accepted main-run bytes, never rebuilt after that acceptance.

Rationale: The existing release workflow is main-only, and the owner's final review/merge ritual is explicit. Reuse S021 recovery and canonical selection controls; no signing, local native desktop campaign, extra attended gate or review round is introduced.
