# Research: Responsive gallery

## Discovery and state

Decision: Remove watcher and one-second reconcile loop plus half-second full snapshot polling. Rationale: explicit user requirement and source-confirmed recurring enumerate/probe/clone/sort work. Alternative periodic coalescing rejected because it still violates manual-only discovery. Existing media-request access validation continues without rescanning.

Decision: Native validated settings in app configuration directory, formatVersion1 with release version0.0.0. Rationale: portable state is future; current global preference persistence must not write the media root. Preserve malformed/future files and compatible unknown fields; serialized atomic writes detect conflicts. Alternative localStorage rejected because origin/host storage is not the specified settings.json contract.

## Interface

Decision: Bounded page before card mounting, queue4, shortest-column layout with sorted DOM order. Rationale: row grid wastes height, CSS columns reorder reading and infinite scrolling needs more anchoring complexity. Facts cache remains per revision; viewer removes gallery work.

Initial decision: 48px compact bar,44px minimum targets,12px gaps, collapsed secondary controls and info. The owner then observed the native candidate and requested substantially smaller buttons.

Owner-directed refinement: Keep the 48px bar but use 32px fine-pointer desktop buttons/inputs/selects,4px block and 8px inline padding,8px radius and 16px type/icons. Coarse or mixed pointer capability retains 44px minimum targets. The component recipe lists comfortable/compact densities, but the delivered Web/React adapter exposes no density prop and its CSS always uses 12px/16px padding and 44px minimum targets. A product-scoped geometry override is necessary to meet the current owner direction; it deliberately differs from the pinned 44px invariant while preserving kit bytes, existing tokens, keyboard semantics and visible focus. A32px painted surface within a 44px element was rejected because it retains bulky layout and cannot reduce native select geometry. See the local desktop-compact-controls capability-gap record.

The native candidate also showed an 84px bar: the long directory span had an auto flex basis and moved actions onto a second line. Giving the directory span a zero flex basis allows truncation before wrapping; increased text scale and narrow windows may still grow the toolbar.

The delivered Button inherits native ButtonHTMLAttributes, including aria-expanded and aria-controls, but its generated ESLint selector omits those two names. A local typed DisclosureButton forwards their native semantics through the governed component; no enforcement rule is disabled. The local disclosure-aria capability-gap record documents the mismatch.

## Primary authority

- [Pinned consumer contract](../../brand/kit/enforcement/consumer-contract.json) and [implementation guide](../../brand/kit/enforcement/IMPLEMENTATION.md) govern delivered tokens/recipes; kit bytes are unchanged.
- [ShruggieTech interface implementation](https://brand.shruggie.tech/docs/11-interface-implementation/) and [references](https://brand.shruggie.tech/docs/references/) explain role and authority boundaries; hosted guidance does not silently upgrade pinned kit.
- [Nielsen usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) support essential content, control and feedback.
- [Microsoft scroll controls](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/scroll-controls) distinguish position indicators from manipulable scrollbars; default overlay here is informational, standard input retained.

No new dependency API is selected. Research agents inspected current native lifecycle, interface and docs. Source observations identify avoidable work, not measured causality on the owner's private collection.

## Media canvas refinement

The delivered contained AppFrame applies a 1200px reading width and 24px/48px gutters; full-bleed applies overflow:hidden to its scroll/content elements. For a full-width scrolling media canvas, use the existing contained frame and override only its product content width and padding to100% and the 12px spacing token. The frame remains the sole owner of scrolling, outer safe areas, titlebar avoidance, viewport behavior and focus. This avoids introducing a second scrolling region. Keep the local gallery-canvas capability gap available for a future upstream decision.
