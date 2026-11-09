# Application navigation

This contract describes unreleased source behavior. Published packages retain the interface documented for their own release.

## Gallery and menu

The application bar contains Menu, the current folder name (or Local Media Gallery when empty), and Refresh. Selecting the folder name opens Folder details. Its full, selectable, wrapping path includes a Copy path action and explicit clipboard failure feedback. Refresh checks the current directory again; browsing does not start a background scanner.

Menu opens a modal drawer with these destinations:

| Category | Destinations |
| --- | --- |
| Gallery | Open folder, Recent folders, Refresh, Folder details, Close folder |
| View | Sort and filter, Layout, Information display |
| Prepare & share | Prepare gallery, Thumbnails, Preparation progress |
| Settings | Appearance, Loading, Saved preferences and overrides, History |
| Help | Diagnostics, Documentation, About and licenses |

Back returns to the parent category or Menu. Escape or Close menu dismisses the drawer and returns focus to its invoking control. The drawer contains keyboard focus while open, including above a focused media viewer. Media playback continues when its menu opens.

An empty gallery offers Open folder and recent folders. The item count includes a Sort and filter shortcut. Optional inline sort and filter controls retain their saved Show controls/Hide controls preference. Layout controls page size, card size and scroll indication; Appearance controls global font size; Loading controls the existing automatic, conservative and standard strategies.

## Explicit persistence

Every settings mutation shows Save changes to before editing. Its destinations remain User defaults, Temporary session, Remember this folder and Portable gallery. The selected destination also appears beside the viewer Information control; changing Information remains persistent. Expanded information provides the destination selector before summary-field edits.

Saved preferences and overrides explains effective sources, inheritance and temporary choices. Recent folders and History provide reopening, forgetting and clearing history separately from preference provenance. These operations keep their existing persistence semantics.

## Work and help

Preparation progress and cancellation remain available after dismissing or changing drawer pages. Dismissing a page does not cancel admitted work. Thumbnail destination drafts survive navigation. Folder changes retire session-specific work according to the existing preparation contracts.

Diagnostics retains inspection and explicit native export. Documentation requests the fixed official documentation address in the default browser and provides a selectable address and copy action. A successful request does not establish that the browser loaded the page. About and licenses displays the compiled version, edition and host identity with embedded application, brand and font notices.

The drawer uses the existing brand controls, typography and tokens, supports narrow windows and enlarged text, and keeps media viewing and the application scroll container intact.
