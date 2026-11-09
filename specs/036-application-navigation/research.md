# Research: S036

## 2026-11-08: navigation, brand and verification audits

Three read-only Spec Kit research agents audited current actions, brand/docs contracts and test dependencies. No GUI or native application was launched. All twelve UX requirements-quality criteria have sufficient coverage; no unresolved owner decision remains.

- Decision: one stable product-owned native modal drawer. Rationale: current Viewer uses showModal; the governed Dialog has no controlled/open/route/container API, and a sibling Radix portal is below the native top layer. Alternatives: patching governed kit or duplicating shell ownership rejected as unnecessary. References: apps/gallery/src/app/gallery.tsx Viewer; brand/kit/web/react/client.tsx; [modal interaction guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and [native top-layer behavior](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal).
- Decision: stable Gallery-level settings and operation controllers with presentational route panels. Rationale: GuidedPreparation currently owns polling locally, so conditional route mounting would lose work/preview state. Preserve thumbnail destination draft as well.
- Decision: preserve controlsExpanded through actual optional inline controls, with contextual scope. Alternatives: deleting a live saved setting or replacing its portable proof with another setting would narrow #94.
- Decision: preserve persistent Information behavior and show its selected scope before mutation. Summary-field editors retain a contextual destination selector.
- Decision: explicit current-candidate drawer evidence; retain legacy public recipient behavior by source/role. Current source and actual published v0.2.2 cannot be distinguished by version alone.
- Decision: source-only unreleased navigation documentation. Rationale: site/retained/v0.2.2.json and verifySnapshotHistory freeze actual released documentation. A new behavior is not a correction to old v0.2.2. Alternatives: editing released bytes or expanding S036 into a complete version/release-preparation slice rejected.
- Decision: retain governed controls, semantic colors, spacing, radii, typography, 32px fine-pointer existing density and 44px coarse/mixed targets. Product screens and navigation trees are explicitly outside shared recipe grammar. Governed bytes remain untouched.
- Decision: external Tauri mocks in a headless browser harness, plus existing hosted native tests. A new browser harness provides fast rendered regression without stealing workstation focus; it does not substitute for native runtime/AX/package evidence.
- Decision: keep final hosted receipts on the PR. Repeated native rebuilds solely for completion bookkeeping add no implementation evidence; GitHub remains the primary delivery tracker.

No new runtime framework, storage format or brand migration is needed.
