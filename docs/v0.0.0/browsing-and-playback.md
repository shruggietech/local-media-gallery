# Browsing and playback

## Collection presentation

The gallery presents discovered images and videos as individually inspectable items. A shared collection view owns ordering, filtering, selection and navigation. The number of discovered items and the subset currently rendered must remain distinguishable, especially while discovery is incomplete.

**BP-01:** Users MUST be able to sort and filter by media type. Sorting must have a deterministic tie-breaker so repeated refreshes do not arbitrarily reorder equivalent items. Available criteria must identify whether values come from current file observations or optional metadata. A field's absence must be handled consistently without hiding the item.

The local interface initially shows All media with filename ascending. All/Images/Videos filters and filename, modified-time and byte-size sorting are available in both directions. Filename ordering is case-insensitive and natural for numeric chunks, with exact names breaking ties. Missing facts sort last in both directions. Additional dimensions/duration/sidecar-derived sorting and filters remain U-05. A sidecar timestamp must not be labelled as a current filesystem timestamp without attribution.

**BP-02:** A filter change or change in visible item count MUST retain a valid navigation state. If a previously selected page or position no longer exists, the interface must move to a defined valid state and show the resulting item count. No-match results must offer an understandable way to inspect or clear the active filters.

## Cards and layout

**BP-03:** Cards MUST accommodate media aspect ratios without unintended stretching. The gallery should obtain dimensions or useful placeholders early enough to reserve space, then replace placeholders without losing the user's location. Portrait, landscape, square and unusually long images must remain inspectable.

The local interface uses a responsive grid with stable row-by-row order, intrinsic media proportions and uncropped previews. The layout must work at narrow and wide window sizes, varying display scale and keyboard zoom. Future card-size controls must describe a meaningful visual choice rather than exposing a hardcoded pixel value that breaks a small viewport. Alternate layout and density controls remain U-05.

Cropping for a preview, if offered, must be distinguishable from full-media viewing. The larger viewer must provide access to the full content and identify the current item. Metadata visibility must not depend solely on hover.

## Item information

**BP-04:** Every media item MUST expose an information view. Basic information includes the current filename, gallery-relative location, detected media category and whatever file/media facts could be obtained. The interface must identify unavailable values and the source of sidecar values. Optional fields must not be a condition for opening the information view.

The information view must accommodate arbitrary nested sidecar content and selectable field inclusion as defined in [metadata and sidecars](metadata-and-sidecars.md). A compact card can show chosen summary fields while the details view retains access to the remaining values. Unknown fields must not be dropped merely because there is no curated label for them.

## Playback and capability reporting

**BP-05:** Supported images and videos MUST be openable from their cards without depending on thumbnails. Videos must provide user-operable playback, pause and seeking when the format and media source support them. The host/media delivery path must be verified with partial reads and seeking, rather than assuming that a successful first frame establishes playback support.

An extension is a discovery hint, not proof of a codec. When a format cannot be displayed or played, the item should remain represented with an actionable explanation and inspectable information. Alternative opening or conversion actions require their own explicit behavior and remain U-04. The baseline does not promise every format accepted by an extension list will decode on every supported platform.

Loading many videos must not automatically create an unbounded set of active decoders. Current cards use bounded viewport admission and media-type placeholders for video, with metadata probes for proportions. Playback starts only by user action in the selected viewer; closing it or replacing the item/root stops playback and releases its source. Native controls and a named Play/Pause action provide playback, with Previous/Next following the filtered order and Escape closing the viewer. Richer previews and autoplay preferences remain U-05. Resource adaptation must not silently change an explicit playback choice or pretend a paused item has finished playing.

## Interaction, accessibility and feedback

**BP-06:** Interactive controls MUST be keyboard operable, visibly focused and named for assistive technology. Selection, focus and playback state must not be communicated only through color. Dialog/viewer transitions must preserve a meaningful focus destination on opening and closing. Reduced-motion preferences must be respected.

Adopt WCAG AA as the accessibility target and follow the delivered brand's focus, contrast and component rules. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) supplies an external reference for evaluating relevant web interface behavior; conformance requires rendered checks, not a declaration in the source. See [brand integration](brand.md) for the governed visual vocabulary.

The UI must distinguish loading, unsupported media, missing files and recoverable read failures. Status updates should be informative without overwhelming assistive announcements during large scans. Exact announcement batching and keyboard shortcuts require interaction testing.

## Open decisions

U-04 owns format/codec support, orientation and color behavior, and unsupported-media actions. U-05 owns layout, sort/filter defaults, preview/playback defaults and keyboard bindings. U-13 in [overview](overview.md#open-decisions) owns editing. Choosing a media library or layout dependency does not settle these choices by implication.

Return to the [index](index.md) or consult the [glossary](glossary.md).
