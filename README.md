# Local Media Gallery

Your media presented beautifully.

A lightweight desktop gallery for local images and videos. Open a directory and browse current media without importing a library, generating a manifest or preparing thumbnails. Rust and Tauri host the application with a bundled static Next.js interface.

The current product version is 0.1.0. Package availability, exact download hashes and supported native rows come from the matching canonical [GitHub Release](https://github.com/shruggietech/local-media-gallery/releases) and [official website](https://localmedia.gallery). The retained [v0.0.0 specification](docs/v0.0.0/index.md) is not a shipped product.

## Browsing and editions

- Browse direct images/videos with natural filename, modified-time or byte-size sorting, media filters, bounded pages and aspect-aware cards.
- Focus an image or manually play/pause/seek a video. Inspect arbitrary JSON sidecars, nested fields and optional card summaries.
- Save user, remembered-directory, portable gallery or temporary presentation choices; metadata and media originals remain unchanged by viewing.
- Use explicit **Refresh** for additions, removals and changed observations. No background directory scanner runs.
- Optionally generate validated still/video thumbnails, inspect progress/diagnostics or clean owned cache outputs. An external video helper must be selected explicitly; none is bundled.
- Full supplies installed integration. Lite runs in place on its declared supported host without installing Full or depending on a sender profile.

The elected package targets are Windows x86_64, Ubuntu 24.04 x86_64 and macOS 15 Apple Silicon. Runtime prerequisites, actual tested hosts and limits are explicit in [installation and distribution](docs/v0.1.0/installation-and-distribution.md). These are not universal clean-machine or every-architecture packages. Project signing and notarization are not performed.

Richer previews/autoplay/additional browsing criteria and media editing are deferred for 0.1.0. Existing settings/thumbnail operations remain available; guided preparation that fetches recipient launchers is subsequent work. Moving a closed gallery and reopening or explicitly refreshing it does not require manifest regeneration.

## Obtain and use a package

1. Select an actually published Full or Lite artifact for the required OS/architecture from the verified release record. Compare the exact filename, size and SHA-256; a repository checkout or CI proof archive is not a published download.
2. Read the matching [platform prerequisites and installation operations](docs/v0.1.0/installation-and-distribution.md). Full may provision declared dependencies. Lite uses declared host facilities and preserves its complete extracted payload.
3. Open the application with a directory. Full starts with a chooser when no directory is supplied; Lite uses its external containing gallery. Use **Close folder** before relocating an open gallery on Windows, then reopen it at its new location.

Recipients need no Node, Python, Rust, FFmpeg executable or separate browser for ordinary browsing. Host libraries/webview/codecs remain the declared prerequisites.

## Build and contribute

Maintainer setup uses Node 24+, Python 3.12+, the pinned Rust 1.96.0 toolchain and platform native build prerequisites. Windows additionally needs MSVC/Windows SDK and WebView2. FFmpeg creates the small synthetic acceptance clips.

```text
npm ci
npm run prepare:local
npm run build:app
npm run check
npm test
npm run check:docs
npm run check:app
```

`prepare:local` prepares ignored maintainer tools; it does not install the product. `npm run app -- DIRECTORY` rebuilds and runs the development app. Native interactive/input/installer acceptance runs only on isolated CI desktops, never the active workstation.

The [current documentation](docs/v0.1.0/index.md), [contribution guide](CONTRIBUTING.md), [changelog](CHANGELOG.md), [GitHub Issues](https://github.com/shruggietech/local-media-gallery/issues) and [Project](https://github.com/orgs/shruggietech/projects/8) describe contracts and development. Report vulnerabilities through [SECURITY.md](SECURITY.md); follow the [community conduct policy](CODE_OF_CONDUCT.md).

## Website and brand maintenance

Use `npm run build:site`, `npm run check:site` and `npm run test:site` for the independent website. Its version manifest retains complete documentation/schema/reference snapshots. Only observed canonical publication elects current downloads and latest docs; Pages deploys exact qualified output.

The upstream [brand repository](https://github.com/shruggietech/shruggie-brand) supplies the pinned kit. `npm run brand:verify` checks installed bytes, `brand:check` is read-only and `brand:update` imports the newest stable matching kit. Supplied candidates keep their provenance until a formal release replaces them. See [brand integration](docs/v0.1.0/brand.md).

## Release execution evidence

The manual release workflow issues each mutation once and observes explicitly pending state with bounded reads. Draft assets are checked through their exact authenticated API identities and content hashes; published assets must also expose their expected final URLs. Foreign state fails immediately. Accepted native bytes are reused unchanged.

The always-retained execution artifact includes `candidate-evidence/` and `publication-evidence/` beneath the execution directory. Each contains its exact export, complete inventory, matching gate record and version manifest. After verifying the original Actions ZIP digest and extracting it, use the exact qualified renderer checkout and run:

```text
node scripts/release-evidence.mjs PATH_TO_CANDIDATE_EVIDENCE
node scripts/release-evidence.mjs PATH_TO_PUBLICATION_EVIDENCE
```

An optional second argument selects the retained documentation source root when it differs from that checkout. Verification reads the retained output without rebuilding and rejects missing, extra or changed files, stale source/renderer identities and mismatched gate projections. The existing `resume_execution_run` workflow input restores attributable interrupted-upload journals; it never authorizes replacing a published package.

## License

Source and original documentation use [Apache 2.0](LICENSE). Upstream assets retain their notices in [NOTICE](NOTICE) and kit licensing files.

A [ShruggieTech](https://shruggie.tech/) project.
