# Research: v0.2.1 publication and verification

## 2026-11-06: publication operation

Decision: reuse `release.yml` on remote main, qualification run 42174731987, version 0.2.1 and predecessor 0.2.0. Rationale: the client requires successful push-to-main qualification and the publisher reassembles and compares accepted artifacts, qualification and documentation before mutation. Current-main checks occur before work, staging, promotion and Pages deployment. Alternative rejected: direct ad hoc release creation or PR artifact reuse would bypass existing evidence authority.

Decision: retain 4-GiB/300-second canonical and 5-GiB/600-second support transport classes, 5-GiB expanded extraction, 30-minute input deadline and existing 885-second active publication allowance. Rationale: the actual 5.1-GB transport was verified during S031 and the bounds preserve qualification policy. No time limit is changed here.

Decision: keep S032 planning off main and replay exact source gates against clean f9bd. Rationale: local planning changes logical source identity and cannot substitute for the elected renderer. Alternative rejected: merging planning before publication would retire the executing main renderer and require new qualification.

## 2026-11-06: independent acceptance

Decision: adapt prior `s027-published-readback.mjs` and `s027-live-readback.mjs` only as private orchestration, replacing historical versions, IDs, three-version assumptions and paths with actual current metadata and four versions. Rationale: their public-byte and original-gate checks are useful; their old receipts and hardcoded 4-GiB helper are not current evidence.

Decision: dispatch a new post-publication `ci.yml` run on unchanged main. Rationale: `releasePredecessor()` supports current published version matching source version, and every package campaign calls `exercisePreparedRecipient()`. Pre-publication campaigns selected v0.2.0, so they cannot prove v0.2.1 acquisition. The new run's diagnostic candidate differs by run ID; only downloaded recipient identity is compared with the published candidate.

Decision: retrieve actual recipient receipts, original approximately 7-MB gallery archives and PNGs through the existing bounded ZIP64 member reader, preserving their paths, then use `validatePreparedRecipient()`. Windows originals come from the exact lifecycle supporting artifact. Rationale: this replays original operands without downloading multi-gigabyte transaction trees unnecessarily or inventing current runtime evidence from metadata alone.

No unresolved research question remains. Both research agents were read-only and dispatched no workflow.

## 2026-11-06: retained-packet retry defect

The initial publication route did not qualify. Attempt 1 failed a native UI-observer request after successful MSI install/repair. The supported input-root rerun created fresh attempt-2 workers, but the gate's wait lookup immediately selected retained attempt-1 packets by name. The old failed lifecycle archive has no completed fragment, producing ENOENT before fresh workers finished. Thus latest-name selection alone is insufficient while a new attempt is still running.

Decision: require artifact creation within the current shared clock and download the exact elected ID. The pinned download-artifact action supports artifact-ids and extracts one selected ID directly to the requested path. Its digest mismatch default remains error. Preserve old artifacts and every final cohort/source/build/byte guard. Research confirms there is no supported same-attempt gate retry or environment override, and manual dispatch cannot replace required push-main provenance. A source repair, owner merge and new main qualification are necessary; the original fixed-f9bd publication assumption is retired.
