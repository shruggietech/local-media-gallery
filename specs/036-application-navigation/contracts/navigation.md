# Navigation interaction contract

The app bar has Menu, current folder details/title and Refresh. Empty content offers Open folder and Recent folders. Root categories and ordered children exactly follow spec FR-003.

A native modal drawer is mounted independently of Viewer and active tasks. It opens above the existing native Viewer. Title has initial focus; category/task transitions focus their heading, Back restores the menu entry, and dismissal restores the invoker or surviving logical fallback. Keyboard focus cannot escape to background controls. Escape closes only the active drawer. All modal controls and active task content are descendants of its dialog.

Contextual setting forms expose the selected write destination before changes. Information toggle has a visible selected-scope cue; summary editing includes a destination selector. Existing controlsExpanded continues to expose inline sort/filter controls through Show controls/Hide controls near the count.

Gallery selection, sorted pagination, viewer keys/media lifetime, native choosers, saved settings, guided preparation, thumbnail generation/cleanup, history and diagnostics retain existing authorities and errors. Modal dismissal never implicitly cancels work. Active work has a compact progress/cancel surface outside navigation and a details route.

Folder details show the full selectable wrapping path, copy with explicit success/failure and existing discovery details. Help exposes official documentation, application facts and bundled license/notice text. Failed external/clipboard actions retain an actionable local result.

Native candidate runtime receipts explicitly demonstrate Menu/category/Back/task reachability in addition to original media, keyboard and screen-reader acceptance. Source-bound public recipient tests continue to use the actual published UI; product version alone is not a selector.
