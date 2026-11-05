# Research: v0.2.1 release preparation

## 2026-11-05: dependency compatibility

Decision: Pin minimatch 11.0.1 with a root override while retaining existing parent versions. The three installed consumers use retained Minimatch construction, match(path[, partial]) and minimatch(path, pattern, options). The major version removes other APIs, so actual lint/configuration checks remain elected. Parent upgrades alone retain affected 10.x requirements.

Rationale: The [upstream advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) identifies preprocessing amplification at optimization level 2; [the fix](https://github.com/isaacs/minimatch/commit/77a0f5c4b80bdc641c3c930a1d9edf5ad2db57f8) bounds generated patterns and replaces expensive pairwise processing. A memory/deadline-bounded child resolves the actual dependency through an affected installed parent and exercises thirty repeated split segments with an explicit cap of 64. Ordinary matching and actual repository lint/type checks detect compatibility regressions.

Alternatives considered: Waiting for parent releases leaves the advisory unresolved; broad upgrades add unrelated changes; a version-string-only test does not exercise the affected branch. Existing glib 0.18.5 has the recorded exact upstream iterator backport and remains unchanged.

## 2026-11-05: supporting Windows evidence

Decision: Extend actual publisher input retrieval to follow immutable supporting references from an accepted Windows gate, after binding that gate to the candidate's recorded qualification hash. Preserve eight canonical releaseScopes and the established legacy non-cohort path.

Rationale: CI release aggregation downloads all evidence artifacts, while production downloadInputs currently downloads only canonical scope names. S030 moved required raw Windows transaction evidence into experience/lifecycle packets. The observed lifecycle archive is approximately 5.064 GB, beyond the old 4-GiB downloader cap but below the existing 5-GiB extraction bound.

Alternatives considered: Re-adding raw duplicate trees to the gate increases transfer time and storage; wildcard/latest supporting selection loses immutable authority; promoting workers into public release scopes changes unrelated public contracts. Use an explicit 5-GiB support limit and exact API-declared size/digest, preserving current canonical bounds and archive extraction checks.

## 2026-11-05: snapshot and owner boundary

Decision: Follow established source-A/current-capture-B preparation, ordinary vocabulary review and exact-head qualification. Do not publish or tag in this slice.

Rationale: Source, docs and schema already target 0.2.1 while 0.2.0 remains canonical. The latest owner instruction explicitly halts at green CI for final merge. Release highlights will identify the MSI and private-state changes; later publication uses version 0.2.1, predecessor 0.2.0 and exact accepted trusted-main artifacts.

Alternatives considered: Bumping again would mislabel an unpublished patch; editing published snapshots violates immutable history; adding UI/legacy recovery work would combine unrelated contracts. No unresolved research questions remain.
