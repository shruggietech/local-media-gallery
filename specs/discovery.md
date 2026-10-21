# Product discovery

## Approved direction

Local Media Gallery is a lightweight, interactive gallery for browsing local images and videos. GalleryGen is inspiration. Insonic demonstrates repository practices and is not product authority. Upstream owns the identity. This session authorizes basic local scaffolding and commits, with no remote repository creation or push.

## Existing inspiration

The sibling GalleryGen prototype scans a directory recursively with PowerShell, embeds a `galleryItems` JSON list into HTML, and renders a paginated grid with image/video previews, a lightbox, adjustable grid size and items per page. It also contains a browser-extension manifest and options page. These are observations, not approved requirements or a framework recommendation.

The prototype strips Windows drive letters, only escapes spaces in paths, constructs some markup with `innerHTML` and lists file extensions beyond demonstrated browser codec support. Any reused behavior needs proper path/URL handling, text-safe rendering and explicit format capability detection. Copying the old implementation as a scaffold would carry these defects forward.

## Owner decisions from brainstorming (2026-10-21)

### Platforms and launch experience

Support Windows, Linux and macOS. Provide an installed command that can open a given directory on demand without requiring initialization or changes to the collection's structure. An uninstalled native executable can be placed in a media directory and run there. Installation provides additional system integration and persistent user settings. The owner cites flask/ngrok as the command-oriented deployment mental model; this does not authorize adding tunneling or remote access.

The same product must support sharing a directory containing media and its portable launcher: the recipient extracts the archive and opens the appropriate native application without installing the product. The gallery must locate its media after relocation and discover additions/removals without manual manifest regeneration. A user-installed browser or particular browser brand must not be required. Electron is excluded. Small portable binaries are a goal alongside this install-free sharing requirement; runtime dependencies and complete distribution size still require feasibility verification.

### Optional gallery preparation

Offer a quick setup process that can generate thumbnails for better performance when the user accepts additional preparation and files. Thumbnails are recommended and optional; browsing must work without generating them first. The same setup should offer inclusion of native binaries for other supported platforms so, for example, a Windows sender can prepare a gallery for macOS or Linux recipients. Architecture variants, download/packaging behavior and runtime payloads remain to be determined.

### Browsing and metadata

Typical collections contain thousands of media files. Provide media-type sorting/filtering, persistent custom settings, adaptive resource loading and cards that accommodate actual media aspect ratios. Make metadata observable for every item, with permissive JSON sidecar inspection and selectable field presentation. Legacy MakeIndex compatibility is desired; an official gallery metadata schema must not become a prerequisite for displaying arbitrary sidecars. Sidecar association rules remain to be agreed.

Keep editing limited initially. Exact supported editing operations remain open; no broad file-management or metadata-rewriting feature set is implied.

### Settings and remembered locations

Portable galleries carry a persistent settings.json for custom presentation choices. For installed software, store settings under Windows AppData; platform-appropriate user locations are needed on macOS/Linux. Remembering absolute directory paths and per-directory choices in SQLite with an inactivity decay period is an owner-proposed direction. The earlier 90-day suggestion and settings precedence are agent proposals, not approved constants. Machine-local remembered paths must not be required to open a shared portable gallery.

### Self-installation

Provide built-in installation capability in each platform's native application. On Windows, the EXE is the installer entry point; avoid requiring an MSI. Installation must detect relevant collisions before changing an existing application, install location or command entry. Ownership/version checks, install scope, destinations, update behavior and uninstall behavior need design. The portable application must remain useful without invoking installation.

### Documentation

Use Next.js for the documentation site. Consider Next.js for the application interface if it fits the native host, offline operation and portable distribution requirements. This is not approval of the application framework or host.

## Proposed refinements to discuss

- Separate live filesystem observations from sidecar-reported metadata and preserve arbitrary sidecar fields.
- Reconcile the directory on opening and after missed filesystem events; any saved index is a rebuildable cache.
- Persist intentional settings while re-evaluating automatic performance budgets on each recipient machine.
- Offer direct per-user installation, with explicit treatment of owned upgrades, unrelated same-name commands and incomplete prior installs.
- Use Windows AppData for installed settings/state, macOS Library locations, and Linux XDG configuration/state/cache locations. Exact subdirectories are not yet selected.

## Decisions held open

Application language/runtime, application frontend framework, native host, rendering-runtime distribution, scanner, media processing and packaging remain unselected. SQLite is the proposed remembered-location store; its scope and lifecycle are not an approved database design. CPU architectures, minimum OS versions, recursive/folder navigation behavior, network/removable-drive guarantees, precise editing scope and thumbnail format/location remain open. The documentation renderer is Next.js. Node is currently only a repository-maintenance tool. No application schema is invented before its data contract is agreed.
