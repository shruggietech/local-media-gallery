# S027 research

## 2026-11-03: Approved source and publication authority

Decision: Use reviewed and merged main 7d714ed723483d6bdb1a2286fb89fcbe8550cd40 and successful exact-main run 41595557848. Record S027 in a separate worktree.

Rationale: Source identity includes planning files. Separating audit changes preserves the previously approved source and accepted artifact identity without exclusions. S026 owner merge plus accepted S027 publication scope supplies release authority.

Alternatives considered: Rebuild a release candidate from an unmerged audit branch or add planning exclusions. Both add unnecessary identity changes and delay publication.

## 2026-11-03: Release execution and recovery

Decision: Dispatch release.yml on main with qualification_run, version 0.2.0, previous_version0.1.0 and short highlights. Keep main unchanged until release/Pages succeeds. Recovery supplies resume_execution_run only for the same retained candidate.

Rationale: Existing execution validates nine required jobs and raw artifact digests, runs candidate gate, stages owned draft, publishes without latest, runs publication gate, uploads canonical record, promotes latest and deploys verified Pages. Journal recovery rejects foreign assets and preserves qualified canonical records.

Alternatives considered: Manual asset uploads, retagging, rebuilt packages or forced replacement. These bypass existing provenance/ownership controls and are unnecessary.

## 2026-11-03: Independent verification

Decision: Adapt prior private readback helpers for 0.2.0 and previousVersion0.1.0; independently recompute both exact production gate exports using verifyGateEvidence, verify all public asset bytes with explicit size bounds/300-second download deadlines, and compare the complete live exported inventory.

Rationale: Older helpers assumed0.1.0, null predecessor and absent gate exports. Current implementation retains both exports. Large source assets require the current production-compatible streamed bounds, not old default 1 GiB/30-second settings.

Alternatives considered: Trust only green workflow labels or API asset metadata. Neither proves public bytes or deployed content.

## 2026-11-03: Acquisition evidence and handoff

Decision: Verify prepared-gallery acquisition against published 0.2.0 through the audit PR's existing isolated native campaign and independent retained-archive replay. Before-publication main receipts correctly select 0.1.0 and are not claimed as 0.2.0 acquisition evidence.

Rationale: Existing exercisePreparedRecipient and validatePreparedRecipient already cover canonical download, digest/inventory, reuse, relocation and literal launch. Audit branch builds remain separate from immutable published assets.

Alternatives considered: New local attended/native gate or bespoke acquisition-only workflow. Neither is needed.

Phase0 research used two read-only research agents as required by speckit-plan, reviewing production code, workflow, tests and prior private helpers. All technical unknowns resolved.
