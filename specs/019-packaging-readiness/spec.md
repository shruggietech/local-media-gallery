# Feature Specification: Packaging readiness and no-signing policy

**Feature Branch**: `codex/s019-packaging-readiness`

**Created**: 2026-10-30

**Status**: Specified and analyzed

**Input**: S019, complete issues #69 and #70, validate/consolidate compatible updates from PR #68, publish an official PR automatically, resolve CI and at most two review rounds, then stop for owner final review and squash merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build packages without a warm cache (Priority: P1)

As a maintainer, I can prepare the complete pinned package inputs on a fresh worker and assemble all required dependency notices without relying on a previous build's cache.

**Why this priority**: The merged main branch cannot complete Linux package preparation or promote its documentation deployment.

**Independent Test**: Begin with an empty dependency store and no restored compiler output, establish all locked inputs, then complete offline dependency/notice collection and actual package assembly.

**Acceptance Scenarios**:

1. **Given** a fresh worker, **When** preparation completes, **Then** every dependency needed by package metadata and notices is available before package assembly and qualification.
2. **Given** a partial cache or missing locked test dependency, **When** readiness runs, **Then** the missing pinned inputs are acquired and verified, or a specific preparation failure is retained before qualification starts.
3. **Given** completed readiness, **When** metadata/notices are collected without network access, **Then** the complete expected inventory is produced without changing locked resolution or omitting dependencies.

### User Story 2 - Deliver without project signing work (Priority: P1)

As the owner, I receive working native candidates without project signing commands, credentials, notarization or release prerequisites contingent on them. Artifact integrity remains independently verifiable.

**Why this priority**: Existing macOS packaging steps and future-credential wording contradict the owner's permanent policy.

**Independent Test**: Build ordinary native apps/helpers without project signing steps; verify exact inventories and actual Full/Lite installation, browsing and removal on the elected platforms.

**Acceptance Scenarios**:

1. **Given** the package builders, **When** candidates and helpers are produced, **Then** no project signing/notarization action or credential is used.
2. **Given** an owned candidate without a bundle-signature resource, **When** it is validated, **Then** complete file/hash/mode/ownership evidence determines payload integrity and actual native operation still passes.
3. **Given** modified, missing, linked or unlisted payload bytes, **When** validation/install/removal runs, **Then** the existing conflict and integrity failures remain effective.
4. **Given** public delivery guidance and release metadata, **When** reviewed, **Then** absence of signing is the intended policy, while untested environments and host assessments are described plainly and historical observations remain unchanged.

### User Story 3 - Review one coherent qualified change (Priority: P1)

As the owner, I can review a source-bound candidate that includes the compatible maintenance updates, all existing platform evidence and resolved external reviews.

**Why this priority**: The next feature slice must start from a reliable packaging baseline.

**Independent Test**: Run all eight applicable scopes on the exact pushed candidate, independently read back artifacts and complete at most two code/security review rounds.

**Acceptance Scenarios**:

1. **Given** the compatible dependency refresh, **When** incorporated, **Then** the declared versions and lockfile agree and applicable app/site/package checks pass.
2. **Given** qualified source, **When** final artifacts are read back, **Then** source, revision, edition, target, notices, modes and native outcomes agree without substituting older receipts.
3. **Given** completed checks/reviews, **When** delivery finishes, **Then** an official PR is pushed with no unresolved review comments and the owner retains final merge authority.

### Edge Cases

- Empty dependency store, absent registry index/archive/source, partial/evicted cache, wrong target or changed lockfile; network or extraction failure is preparation failure.
- A production build succeeds while metadata also requires test/optional/target dependencies; a partial notices inventory must not pass.
- Missing bundle-signature resources must not bypass inventory checks or become a reason to add signing credentials. Compiler/linker output must be described accurately without silently dropping native support.
- Tampered archives, changed modes, foreign or redirected destinations and retained user/gallery state remain governed by existing integrity/lifecycle checks.
- A compatible maintenance update or cache hit must not certify an older source revision; failed attempts remain retained.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Preparation MUST establish the complete locked dependency graph needed by package assembly, metadata and notices before their offline use, including non-production dependencies required by that graph.
- **FR-002**: The readiness path MUST pass on an empty dependency store without restored compiler output and MUST NOT depend on cache availability for correctness.
- **FR-003**: Missing/unavailable/mismatched inputs MUST produce a retained preparation failure; locked resolution, complete notices and offline collection after readiness MUST remain enforced.
- **FR-004**: Builders, helpers and CI MUST perform no project-authored artifact signing or notarization actions and MUST require no signing identities, certificates, services or related publication gates.
- **FR-005**: Payload authority MUST use complete version/source/file/hash/mode/ownership checks without requiring signature resources; changed, missing, linked, unlisted and foreign content MUST still fail as specified.
- **FR-006**: Ordinary native Full/Lite apps and helpers MUST retain their existing elected platform behavior, including macOS bundle launch and lifecycle, without silently reducing support or replacing native verification with build success.
- **FR-007**: Documentation, platform matrix, release guidance and artifact observations MUST reflect the permanent no-signing policy; mandatory native toolchain output, host assessments and historical receipts MUST be distinguished from project signing work. Use plain not-yet-tested wording for absent observations.
- **FR-008**: The compatible parser/icon updates from PR #68 MUST be incorporated or resolved with justified evidence; manifests and lockfile MUST agree before final qualification.
- **FR-009**: Existing gallery data, portable/user settings, retained history, installation collisions, notices and branding MUST remain intact; upgrades/recovery (#25) and release publication (#26/#31) are outside this slice.
- **FR-010**: All eight applicable scopes and independent source/binary/archive/native readback MUST pass on the pushed candidate. Preserve 660s qualification target,900s hard limit,15s reserve and separate preparation/qualification/combined accounting. GUI/input MUST remain on isolated hosted desktops; local work remains headless.
- **FR-011**: Cache handling MUST remain a bounded preparation optimization, preserve compiler/input validation and avoid expanding paid storage or deleting retained qualification artifacts.
- **FR-012**: Spec Kit analysis/convergence, issue/project tracking, automatic push/official PR and all external review responses MUST complete within at most two code/security review rounds; stop for owner final review and merge without publishing a product release.

### Key Entities

- **Readiness receipt**: target, locked graph identity, fresh/cache basis, preparation outcome and offline metadata/notices verification.
- **Payload authority**: exact candidate identity and complete physical file/hash/mode/ownership inventory, independent of signature resources.
- **Policy observation**: no project signing action, actual compiler/native metadata or host assessment, and explicit untested scope.
- **Qualified delivery**: source/revision/artifact identities, required terminal outcomes, separate accounting and capped review receipts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Fresh and partial-store scenarios complete the required offline metadata/notices graph after readiness; the previously missing dependency case is reproduced and corrected.
- **SC-002**: All elected ordinary apps/helpers build and run with zero project signing/notarization invocations, and removal/collision/data-retention checks continue to pass.
- **SC-003**: Every elected integrity and readiness negative fails specifically; no incomplete inventory, absent observation or failed preparation certifies success.
- **SC-004**: Compatible declared dependencies and lockfile agree; all eight scopes and final source/artifact readback pass within the preserved qualification hard deadline.
- **SC-005**: All review comments are handled in no more than two rounds, the clean pushed official PR has terminal green checks, and the owner receives an accurate final-review handoff.

## Assumptions

- Retain the existing Windows x86_64, Ubuntu24.04 x86_64/X11 and macOS15 arm64 baselines; no new platform or application architecture is elected.
- Preserve ordinary compiler/linker output and report mandatory native metadata accurately; add no project signing command or credential workflow and do not strip native loader data merely to change labels.
- Compatible inputs are parser8.72.1 and lucide-react1.62.0 from PR #68. No unrelated dependency upgrade or paid cache expansion is requested.
- Source-bound CI candidates and official PR publication are authorized. Product release and final merge remain outside this authorization.

## Clarifications

### Session 2026-10-30

- Q: Does a missing cache permit weaker or online-only notice validation? A: No. Fetch/verify the complete locked graph during preparation, then retain offline notice collection and cold-readiness evidence.
- Q: Does the no-signing policy remove payload integrity or native-platform checks? A: No. Remove project signing actions and signature-resource requirements, preserve complete inventory/physical authority and native verification, and describe ordinary compiler output accurately.
- Q: Should this publish a product release or implement upgrades? A: No. Complete #69/#70 and the compatible #68 refresh, then stop for owner PR review and merge.
