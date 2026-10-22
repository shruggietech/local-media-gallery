# Local Media Gallery

A lightweight, interactive gallery for browsing local images and videos.

Your media presented beautifully.

## Start here

Read the [documentation](docs/v0.0.0/index.md) and [contribution guide](CONTRIBUTING.md). The local development application uses Rust, Tauri and a bundled static Next.js interface. It opens a directory through a native chooser or launch argument, discovers current direct image/video files, and supports sorting, filtering, viewing and file information. Browsing is readonly and preferences are session-only. Windows is the first native verification host; Linux and macOS remain product targets.

Full installation, lightweight Lite sharing packages, persistent settings, sidecar inspection, optional thumbnails, and the independent landing page and versioned documentation website remain future work. No product package has been released.

## Local development

Use Node.js 24+, Rust 1.96.0 with the Windows MSVC build tools/SDK, Python 3.12+, FFmpeg for the small synthetic verification fixture, and the installed WebView2 runtime. Recipients do not need Node or a browser application to run the built native application. Installer and Lite prerequisite delivery remain separate work.

```text
npm ci
npm run prepare:local
npm run check
npm run check:docs
npm test
npm run build:app
npm run check:app
npm run qualify
```

`prepare:local` creates an ignored Python environment and downloads an official checksum-verified Node 24.11.0 proof-tool runtime on Windows x64. These exact brand verification prerequisites are separate from the application build runtime. It does not install the product. `qualify` prepares both normal and instrumented local builds, then times the required checks and real native acceptance with twelve media candidates. Native testing briefly operates the application window and folder chooser. It does not use a personal media collection or establish large-collection performance.

Launch the built application with `target/debug/local-media-gallery.exe`, optionally followed by one directory. With no directory it opens a selection screen. `npm run app -- DIRECTORY` rebuilds and runs it for development. Use **Close folder** before moving an open gallery on Windows; its directory capability deliberately holds the root while selected. No manifest needs rebuilding after reopening the moved directory.

Spec Kit is installed with Codex skills under `.agents/skills/`, templates and Python helpers under `.specify/`, and a [project constitution](.specify/memory/constitution.md). Start feature work with `$speckit-specify` after agreeing the intended behavior, then clarify, plan, generate tasks and analyze before implementation. Internal planning lives in `specs/`.

## Brand maintenance

The brand comes from [ShruggieTech's brand repository](https://github.com/shruggietech/shruggie-brand), which publishes [brand.shruggie.tech](https://brand.shruggie.tech/). The updater verifies archive and manifest hashes, records provenance in `brand/lock.json`, and preserves the delivered kit bytes.

```text
npm run brand:verify
npm run brand:check
npm run brand:update
```

`brand:check` is read-only. `brand:update` imports the newest stable release containing this project's kit. A supplied candidate can be imported explicitly with `node scripts/sync-brand-kit.mjs --import PATH_TO_ZIP`; its candidate status remains recorded until a formal release replaces it. See [brand integration](docs/v0.0.0/brand.md).

## Contributing and support

Use the local contribution workflow for now. GitHub Issues, milestones and Projects become the tracking system after repository publication is authorized. See [security reporting](SECURITY.md), [community conduct](CODE_OF_CONDUCT.md) and the [changelog](CHANGELOG.md).

## License

Source code and original documentation use [Apache 2.0](LICENSE). Upstream assets retain their own notices; see [NOTICE](NOTICE) and the kit's licensing files.

A [ShruggieTech](https://shruggie.tech/) project
