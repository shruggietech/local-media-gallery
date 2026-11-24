# S039 Portable gallery successor

## User stories

- Open a directory directly and browse its nested photos and videos without a build step. Narrow the gallery with the folder tree, search, media filters, sort, and grid, tiled, or list layout.
- Open a focused viewer with the keyboard, navigate results, see file details, and play or seek supported video. Keep favorites and basic appearance on this device.
- Refresh an open gallery or switch to another. The UI reports empty, filtered, incomplete, and unavailable states. Original media, sidecars, and previous settings stay intact.
- Receive and run a portable archive on Windows x64, Linux x64, or Apple Silicon macOS with a supported installed browser.

## Acceptance

The same extracted-archive functional checks pass on all three hosts. They include actual fixture pixels, MP4 seek, cancellation or error handling, scoped media access, read-only input, favorite persistence, and clean exit. Reports bind each binary and archive digest to the exact source and record which desktop interactions were exercised.

The v0.3.0 release remains the published baseline. The candidate omits edition tiers, installers, updaters, distributed media tooling, preparation and recipient download workflows, settings migration, slideshow, and advanced sidecar inspection.
