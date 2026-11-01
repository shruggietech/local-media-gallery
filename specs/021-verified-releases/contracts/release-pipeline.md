# Release pipeline contract

Maintainer commands expose explicit assembly, snapshot capture/qualification, stage, publish, observe and promote operations. Commands default to help, not mutation. Input/output records use strict formatVersion1 structures, exact source/bytes and phase-specific gate receipts. Production credentials come from the process environment and never enter records, redirect logs or asset URLs.

1. Prepare/qualify all ordinary native packages and retain exact archive/update material.
2. Capture already authored matching docs/schema/navigation/assets and record vocabulary review.
3. Assemble an identified candidate from passing source-bound evidence; qualify every retained version against that candidate without changing public pointers.
4. Stage an owned draft and upload exact bytes. Observe existing assets to reconcile partial/uncertain results. No foreign asset overwrite or accepted-native rebuild.
5. Require the exact pre-publication docs gate, publish with latest unchanged, then read actual tag/source/asset bytes back.
6. Qualify every retained version against the observed published projection. Only that matching gate authorizes canonical release.json creation/readback and latest selection.
7. Deploy the separately qualified exact static output using existing Pages integrity/current-source/concurrency controls. Failed promotion retains prior pointers and retry observes the already-published native bytes.

Current delivery runs these operations against controlled service/future-version fixtures. Real publication is a separately explicit manual workflow invocation with an elected version/source and successful retained qualification; S021 performs no real release/tag.

Canonical filename/repository/source/asset identity is validated before I/O. HTTP mutation redirects are not followed implicitly. Authenticated binary redirects strip credentials on origin change; signed redirect URLs are transient. Required JSON and diagnostic output are bounded, and unknown outcomes retain recoverable state rather than becoming success.
