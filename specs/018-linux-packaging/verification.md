# S018 implementation and qualification evidence

**Date**: 2026-10-29

## Scope and current state

Implements Linux Full Debian and Lite tar.gz candidate delivery for issue #24. Installed/extracted native acceptance and real package-manager operations require the isolated hosted Linux package scope; those results are pending the initial PR campaign. No local GUI/input or product release was performed.

## Local headless verification

- Installed Spec Kit specify/clarify/checklist/plan/tasks/analyze/implement workflows executed. Requirements checklists8/8 and9/9 pass;13FRs/5SCs map to17tasks with no blocking findings. Three read-only research agents resolved Debian lifecycle, recipient runtime/brand and isolated native evidence.
- Initial package tests failed for missing implementation, then passed. The real reused TAR extractor regression reproduced acceptance of raw777 permissions; the corrected reader rejects raw mode/special-bit drift before extraction normalization. A second actual ar/tar regression reproduced acceptance of an unlisted empty privileged directory; the Debian reader now permits only root or actual inventory parents, while valid parent entries still pass. Original red and green logs remain under ignored .local.
- Latest Node suite has121tests:120pass and one Linux-only actual launcher test skipped on Windows. The Linux-only actual launcher test is intentionally skipped on Windows and executes on hosted Ubuntu. All other current-source tests pass; no local Linux native behavior is inferred.
- npm run check, npm test, check:docs and check:app passed. Rust format/units/Clippy, TypeScript/style/brand checks passed through the established app gate. Generated shell syntax and Python compilation/pixel/archive regressions passed headlessly.
- Full site build, source/link checks and10rendered groups passed:43HTML pages,2,952local links/fragments and32exact raw sources. The new Linux schema is published through the existing version registry. Later exact-source CI rebuilds all surfaces on the committed head.

## Acceptance boundaries

Full uses explicit APT --reinstall and normal dpkg transactions with embedded file/candidate authority, root ownership, mode/parent/link and registered ownership checks. Package-manager failure paths retain diagnostics and do not claim rollback beyond actual state. Ordinary candidates receive independent external native frame/PCM evidence; existing instrumented core media/clock/seek/accessibility gates remain unchanged. APT verifies dependencies on the prepared supported host; no clean-machine provisioning or physical-speaker claim is made.

## Hosted CI and reviews

Official [PR #67](https://github.com/shruggietech/local-media-gallery/pull/67) is open. First code review found one P1 missing GALLERY_PROOF_NODE export, confirmed by the hosted preparation failure; ab63ef8 fixes it and the replied thread is resolved. First security review completed with no findings on35c0ad1. Campaign40961023135 built actual ordinary Full/Lite artifacts and passed container/prerequisite checks, then the positive install refused the hosted image's writable /usr/share/applications. The next retry records and normalizes shared-parent permissions only during disposable CI preparation, preserves recipient guards, and requires each negative collision's specific diagnostic. New Python regression children also explicitly disable Windows console windows and stdin. Linux core qualification passed in105.617s (preparation423.954s, combined529.571s); this distinct core receipt does not qualify the new package campaign. Keep at most two code/security review waves, respond to every comment, preserve failed receipts, and bind final acceptance to exact source/artifact/current PR head. Record terminal preparation/qualification/combined accounting,660/900/15s enforcement and final archive/native readback here and in the live PR handoff. Owner final review and squash merge remain the boundary.
