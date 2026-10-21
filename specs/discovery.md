# Product discovery

## Approved direction

Local Media Gallery is a lightweight, interactive gallery for browsing local images and videos. GalleryGen is inspiration. Insonic demonstrates repository practices and is not product authority. Upstream owns the identity. This session authorizes basic local scaffolding and commits, with no remote repository creation or push.

## Existing inspiration

The sibling GalleryGen prototype scans a directory recursively with PowerShell, embeds a `galleryItems` JSON list into HTML, and renders a paginated grid with image/video previews, a lightbox, adjustable grid size and items per page. It also contains a browser-extension manifest and options page. These are observations, not approved requirements or a framework recommendation.

The prototype strips Windows drive letters, only escapes spaces in paths, constructs some markup with `innerHTML` and lists file extensions beyond demonstrated browser codec support. Any reused behavior needs proper path/URL handling, text-safe rendering and explicit format capability detection. Copying the old implementation as a scaffold would carry these defects forward.

## Owner decisions from brainstorming (2026-10-21)

### Platforms and launch experience

Support Windows, Linux and macOS. Provide an installed command that can open a given directory on demand without requiring initialization or changes to the collection's structure. An uninstalled native executable can be placed in a media directory and run there. Installation provides additional system integration and persistent user settings. The owner cites flask/ngrok as the command-oriented deployment mental model; this does not authorize adding tunneling or remote access.

The same product must support sharing a directory containing media and its Lite launcher. Lite is a lightweight, on-demand convenience for opening and sharing galleries on supported hosts. It runs in place without installing the full application. The gallery must locate its media after relocation and discover additions/removals without manual manifest regeneration. A user-installed browser or particular browser brand must not be required. Electron is excluded.

The owner subsequently clarified that full installation can be heavy and Lite should stay lightweight. Do not require every Lite copy to carry all dependencies of the full installation or turn Lite into a universal clean-machine runtime bundle. Document the actual supported-host requirements without presenting Lite as equivalent to a complete installation.

### Application stack and editions

Choose Rust, taking the Rust/Tauri option from the host comparison, with a statically exported Next.js application interface. This records the selected direction; no application implementation or measured package sizes exist yet.

The full edition provides installed application capabilities, system integration and persistent user state. Its installer may provision the dependencies it needs, and its real installation footprint must be stated honestly. Lite binaries prioritize lightweight on-demand browsing and gallery sharing. Both editions retain the shared gallery behavior and portable media/settings model. Exact feature boundaries remain to be specified without inventing arbitrary Lite restrictions.

### Optional gallery preparation

Offer a quick setup process that can generate thumbnails for better performance when the user accepts additional preparation and files. Thumbnails are recommended and optional; browsing must work without generating them first. The same setup should offer inclusion of native binaries for other supported platforms so, for example, a Windows sender can prepare a gallery for macOS or Linux recipients. Architecture variants, download/packaging behavior and runtime payloads remain to be determined.

### Browsing and metadata

Typical collections contain thousands of media files. Provide media-type sorting/filtering, persistent custom settings, adaptive resource loading and cards that accommodate actual media aspect ratios. Make metadata observable for every item, with permissive JSON sidecar inspection and selectable field presentation. Legacy MakeIndex compatibility is desired; an official gallery metadata schema must not become a prerequisite for displaying arbitrary sidecars. Sidecar association rules remain to be agreed.

Keep editing limited initially. Exact supported editing operations remain open; no broad file-management or metadata-rewriting feature set is implied.

### Settings and remembered locations

Portable galleries carry a persistent settings.json for custom presentation choices. For installed software, store settings under Windows AppData; platform-appropriate user locations are needed on macOS/Linux. Remembering absolute directory paths and per-directory choices in SQLite with an inactivity decay period is an owner-proposed direction. The earlier 90-day suggestion and settings precedence are agent proposals, not approved constants. Machine-local remembered paths must not be required to open a shared portable gallery.

### Installation

Full installation may use appropriate platform installers, including MSI on Windows. The owner has removed the earlier MSI restriction. Built-in installation entry points may use the platform installer rather than reimplementing all installation machinery. Installation must detect relevant collisions before changing an existing application, install location or command entry. Ownership/version checks, install scope, destinations, update behavior and uninstall behavior need design. Lite remains useful without full installation and does not need to carry a complete installer payload.

### Documentation

Use Next.js for the documentation site and a static Next.js export for the Rust/Tauri application interface. Keep gallery discovery and runtime operations in the native host so media changes do not require rebuilding the interface.

## Proposed refinements to discuss

- Separate live filesystem observations from sidecar-reported metadata and preserve arbitrary sidecar fields.
- Reconcile the directory on opening and after missed filesystem events; any saved index is a rebuildable cache.
- Persist intentional settings while re-evaluating automatic performance budgets on each recipient machine.
- Prefer conventional installation behavior, with explicit treatment of owned upgrades, unrelated same-name commands and incomplete prior installs; per-user scope remains a proposal.
- Use Windows AppData for installed settings/state, macOS Library locations, and Linux XDG configuration/state/cache locations. Exact subdirectories are not yet selected.

## Decisions held open

Rust/Tauri and Next.js are selected. Rendering-runtime distribution for full and Lite editions, scanner, media processing and exact packaging remain to be specified. MSI is allowed, not mandated. SQLite is the proposed remembered-location store; its scope and lifecycle are not an approved database design. CPU architectures, minimum OS versions, recursive/folder navigation behavior, network/removable-drive guarantees, precise editing scope and thumbnail format/location remain open. Node is currently only a repository-maintenance tool. No application schema is invented before its data contract is agreed.
