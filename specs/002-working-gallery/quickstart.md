# S002 local validation

## Prerequisites

Use Rust 1.96.0, Node 24+, Python 3.12+, MSVC and WebView2 on Windows. FFmpeg creates the small fixture only; recipients do not need Node/FFmpeg for ordinary gallery use. Run npm run prepare:local to provision the ignored Python environment and checksum-verified Node 24.11.0 brand proof runtime with Pillow 12.3.0. Verify prerequisites before qualification.

## Check and run

1. Run npm ci and npm run prepare:local, then fetch/build the pinned native dependencies.
2. Run npm run check, npm run check:docs, npm test and npm run check:app.
3. Run npm run build:app for a static export and native application without installers.
4. Run npm run qualify for prepared normal/instrumented builds, a fresh twelve-candidate fixture, actual Windows playback, updates, relocation, integrity and the timed full check set. The script records preparation and qualification separately.
5. For focused repetition after preparation, npm run test:native rebuilds the instrumented application and uses the existing small fixture. Inspect terminal results and ignored .local evidence before acceptance.

Use npm run app during development, or target/debug/local-media-gallery.exe with an optional quoted directory. Without one, choose a folder natively. All/Images/Videos, sort controls, item viewer/details, Escape and Refresh provide the specified journey. Changes reconcile automatically. Close folder releases selected-root handles before relocation on Windows, then reopen the moved root without any listing generation. Qualification keeps a normal binary at .local/bin/local-media-gallery.exe and a separate instrumented copy; the latter is test tooling.

See [native contract](contracts/native.md), [data model](data-model.md) and [acceptance](acceptance.md). Browser previews are not native playback evidence. This is a local development build, not a published Full/Lite package.
