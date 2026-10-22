# Local Media Gallery

Your media presented beautifully.

A lightweight desktop gallery for browsing local images and videos, built with Rust, Tauri and a bundled static Next.js interface. Open a folder, browse its contents and focus on an asset without preparing a manifest.

The application is in active development. No installable product package has been released. Windows is the first native verification host; Linux and macOS remain product targets.

## Available in development

- Open a directory through a native folder chooser or launch argument. Browse direct image/video files without modifying originals.
- Sort and filter the discovered collection, with bounded pages of 24, 48 or 96 items and tightly packed, aspect-aware columns.
- Focus on an image or video while gallery media work is suspended. Expand file information when needed without interrupting playback.
- Keep controls out of the way with a compact collapsible toolbar, an information panel that starts collapsed and a scroll indicator that appears while scrolling.
- Save view preferences immediately in per-user `settings.json` beneath the platform application configuration directory (AppData on Windows). Global font size offers Default (100%), Small (90%) and Smaller (80%).
- Discover additions, removals and changes with **Refresh**. Opening and explicit refresh are the only directory scans; no background scanner runs.

Settings are global for now; the application does not write settings into the media directory. Malformed or unsupported settings remain intact with a visible warning and usable in-memory defaults.

## Build and run on Windows

Install Node.js 24+, Python 3.12+, Rust 1.96.0, the MSVC C++ build tools/Windows SDK and the WebView2 runtime. The Rust toolchain is pinned in this repository. FFmpeg is also needed for the small synthetic native-verification fixture.

```text
git clone https://github.com/shruggietech/local-media-gallery.git
cd local-media-gallery
npm ci
npm run prepare:local
npm run build:app
```

Launch `target/debug/local-media-gallery.exe`, optionally followed by one directory. With no directory, it opens a selection screen. `npm run app -- DIRECTORY` rebuilds and runs it for development. The built application uses WebView2 and does not require Node.js or a separate browser application.

`prepare:local` creates an ignored Python environment and downloads an official checksum-verified Node 24.11.0 runtime for brand proof tools on Windows x64. It does not install the product. Installer and Lite prerequisite delivery remain future work.

Use **Close folder** before moving an open gallery on Windows; its directory capability holds the selected root while open. Reopen the moved directory to discover its current contents without rebuilding a manifest.

## Documentation and development

The [technical specification](docs/v0.0.0/index.md) defines the product contracts and unresolved decisions. The [contribution guide](CONTRIBUTING.md) covers required checks, small-fixture Windows verification, Spec Kit and brand maintenance. Read the [changelog](CHANGELOG.md) for implemented changes.

Full installation, lightweight Lite sharing packages, portable gallery settings, remembered-directory history, sidecar inspection, optional thumbnails and adaptive calibration remain planned work. The independent landing page and versioned documentation website have not been built.

## Brand maintenance

The brand comes from [ShruggieTech's brand repository](https://github.com/shruggietech/shruggie-brand), which publishes [brand.shruggie.tech](https://brand.shruggie.tech/). The updater verifies archive and manifest hashes, records provenance in `brand/lock.json` and preserves the delivered kit bytes.

```text
npm run brand:verify
npm run brand:check
npm run brand:update
```

`brand:check` is read-only. `brand:update` imports the newest stable release containing this project's kit. A supplied candidate can be imported explicitly with `node scripts/sync-brand-kit.mjs --import PATH_TO_ZIP`; its candidate status remains recorded until a formal release replaces it. See [brand integration](docs/v0.0.0/brand.md).

## Contributing and support

Report bugs and propose features through [GitHub Issues](https://github.com/shruggietech/local-media-gallery/issues). Follow the [contribution guide](CONTRIBUTING.md) for changes. GitHub Issues, milestones and the [repository Project](https://github.com/orgs/shruggietech/projects/8) provide primary work tracking; Spec Kit records implementation decisions and tasks.

Report vulnerabilities through the [security policy](SECURITY.md). See the [community conduct policy](CODE_OF_CONDUCT.md).

## License

Source code and original documentation use [Apache 2.0](LICENSE). Upstream assets retain their own notices; see [NOTICE](NOTICE) and the kit's licensing files.

A [ShruggieTech](https://shruggie.tech/) project
