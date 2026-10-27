# Browsing and playback

## Collection presentation

The gallery presents discovered images and videos as individually inspectable items. A shared collection view owns ordering, filtering, selection and navigation. The number of discovered items and the subset currently rendered must remain distinguishable, especially while discovery is incomplete.

**BP-01:** Users MUST be able to sort and filter by media type. Sorting must have a deterministic tie-breaker so repeated refreshes do not arbitrarily reorder equivalent items. Available criteria must identify whether values come from current file observations or optional metadata. A field's absence must be handled consistently without hiding the item.

On first use the local interface shows All media with filename ascending. Explicit filter and sort choices are retained as global user preferences. All/Images/Videos filters and filename, modified-time and byte-size sorting are available in both directions. Filename ordering is case-insensitive and natural for numeric chunks, with exact names breaking ties. Missing facts sort last in both directions. Additional dimensions/duration/sidecar-derived sorting and filters remain U-05. A sidecar timestamp must not be labelled as a current filesystem timestamp without attribution.

**BP-02:** A filter change or change in visible item count MUST retain a valid navigation state. The entire discovered collection is sorted and filtered before pagination. The default page contains at most 48 cards, with 24 and 96 available as user preferences. Previous/Next page controls and a labelled page jump expose the current page and total. Sort, filter and page-size changes return to page one; refresh clamps a page that no longer exists. Empty results retain one valid page and show an explicit empty state. No-match results must offer an understandable way to inspect or clear the active filters.

## Cards and layout

**BP-03:** Cards MUST accommodate media aspect ratios without unintended stretching. The gallery should obtain dimensions or useful placeholders early enough to reserve space, then replace placeholders without losing the user's location. Portrait, landscape, square and unusually long images must remain inspectable.

The local interface packs cards into the shortest available column, using intrinsic media proportions and uncropped previews. Horizontal and vertical gaps are 12 logical pixels at normal scale. Cards keep their logical sorted order in the document and keyboard sequence even though their vertical positions differ. Placeholder proportions may change when dimensions arrive, while the layout retains the user's valid position. Small, medium and large card-size preferences adjust the useful column width; the number of columns responds to available space. Narrow windows, display scaling and keyboard zoom must keep controls reachable and avoid horizontal overflow.

Cropping for a preview, if offered, must be distinguishable from full-media viewing. The focused viewer must provide access to the full content and identify the current item. Metadata visibility must not depend solely on hover.

The normal toolbar targets approximately 48 logical pixels in height and prioritizes folder identity, essential actions and a control expansion action. Fine-pointer desktop buttons and fields target approximately 32 logical pixels with restrained padding and icons. Coarse or mixed touch input retains at least 44 logical pixel targets; text scaling can increase controls naturally. Secondary controls are collapsed on first use. Enlarged text and narrow windows may increase its height to retain accessible controls. View settings expose global font size, page size, card size, control expansion and scrolling-indicator mode. Global font size retains the current size as Default (100%) and offers Small (90%) and Smaller (80%); it applies immediately across application text and focused information without changing media scale or the root layout scale.

The media canvas uses the available width with 12 logical pixel inner gutters. AppFrame owns gallery scrolling. The native gallery scrollbar and its reserved gutter are hidden. A non-interactive on-brand position indicator appears while scrolling and hides after idle by default; an always-visible preference is available. Wheel, touch and keyboard scrolling remain operational, visible keyboard focus remains available and reduced motion suppresses decorative fading.

## Item information

**BP-04:** Every media item MUST expose an information view. Basic information includes the current filename, gallery-relative location, detected media category and whatever file/media facts could be obtained. The interface must identify unavailable values and the source of sidecar values. Optional fields must not be a condition for opening the information view.

The focused asset is the dominant content. Information is collapsed on first use and opened through a labelled toggle that exposes its expanded state. Expanding information resizes the available asset canvas without cropping the content or replacing the active media element. A playing video must retain its playback position through the toggle. Disclosure is saved immediately as a global user preference and remains in that state through asset navigation, viewer reopening and application restart until explicitly changed. A save failure must remain visible while the current choice stays usable in memory.

The information view must accommodate arbitrary nested sidecar content and selectable field inclusion as defined in [metadata and sidecars](metadata-and-sidecars.md). A compact card can show chosen summary fields while the details view retains access to the remaining values. Unknown fields must not be dropped merely because there is no curated label for them.

## Playback and capability reporting

**BP-05:** Supported images and videos MUST be openable from their cards without depending on thumbnails. Videos must provide user-operable playback, pause and seeking when the format and media source support them. The host/media delivery path must be verified with partial reads and seeking, rather than assuming that a successful first frame establishes playback support.

An extension is a discovery hint, not proof of a codec. When a format cannot be displayed or played, the item should remain represented with an actionable explanation and inspectable information. Alternative opening or conversion actions require their own explicit behavior and remain U-04. The baseline does not promise every format accepted by an extension list will decode on every supported platform.

Loading many videos must not automatically create an unbounded set of active decoders. Only the active page mounts gallery cards. Visible and nearby cards share at most four concurrent image-load/decode or video-metadata preparation admissions, with automatic pressure reduction and manual loading choices defined in [loading policy](thumbnails-and-performance.md#adaptive-loading); cached unchanged facts can be reused. Video cards use placeholders and never autoplay. Leaving a page, changing sessions or opening the focused viewer cancels obsolete work and unloads media sources.

While the focused viewer is open, gallery media elements and probes are absent. Playback starts only by user action in the selected viewer; closing it or replacing the item/root stops playback and releases its source. Native controls and a named Play/Pause action provide playback. Previous/Next follow the complete filtered sort order across page boundaries. Changing the focused item announces its filename without moving navigation focus. Closing restores the corresponding gallery page and focused card. Escape closes the viewer. Richer previews and autoplay preferences remain U-05. Resource adaptation must not silently change an explicit playback choice or pretend a paused item has finished playing.

## Interaction, accessibility and feedback

**BP-06:** Interactive controls MUST be keyboard operable, visibly focused and named for assistive technology. Selection, focus and playback state must not be communicated only through color. Dialog/viewer transitions must preserve a meaningful focus destination on opening and closing. Reduced-motion preferences must be respected. In short or zoomed windows the viewer provides scrolling to reveal essential controls and information rather than clipping its footer.

Adopt WCAG AA as the accessibility target and follow the delivered brand's focus, contrast and component rules. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) supplies an external reference for evaluating relevant web interface behavior; conformance requires rendered checks, not a declaration in the source. See [brand integration](brand.md) for the governed visual vocabulary.

The UI must distinguish loading, unsupported media, missing files and recoverable read failures. Status updates should be informative without overwhelming assistive announcements during large scans. Exact announcement batching and keyboard shortcuts require interaction testing.

## Open decisions

The [native qualification rows](verification-and-compatibility.md#native-media-and-accessibility-campaign) define the initial measured format, orientation, SDR color and audio boundaries. Unsupported items remain inspectable with an explanation and explicit Refresh. U-04 retains additional formats/profiles and external opening or conversion actions beyond those rows. U-05 retains richer previews, autoplay policy and additional navigation/customization beyond the explicit defaults above. U-13 in [overview](overview.md#open-decisions) owns editing. Choosing a media library or layout dependency does not settle these choices by implication.

Return to the [index](index.md) or consult the [glossary](glossary.md).

## Media qualification boundaries

Original-image orientation and color are interpreted by the native runtime. Qualification records actual dimensions and known SDR pixel samples, including embedded sRGB metadata, rather than inferring support from filename extensions. The first/default frame of a static image observation does not qualify animation. Derived PNG previews retain their separate [unmanaged color policy](thumbnails-and-performance.md#cache-identity-and-freshness).

Video support is established independently for decoded frames, play/pause/seek and decoded audio graph behavior. A clip with an audio stream may contain silence; an unmuted player alone does not establish an audio signal. Physical speaker audibility, HDR and display calibration require separate observations. Elected system/format results and assistive limits are retained with [native qualification](verification-and-compatibility.md#native-media-and-accessibility-campaign).
