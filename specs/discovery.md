# Product discovery

## Approved direction

Local Media Gallery is a lightweight, interactive gallery for browsing local images and videos. GalleryGen is inspiration. Insonic demonstrates repository practices and is not product authority. Upstream owns the identity. This session authorizes basic local scaffolding and commits, with no remote repository creation or push.

## Existing inspiration

The sibling GalleryGen prototype scans a directory recursively with PowerShell, embeds a `galleryItems` JSON list into HTML, and renders a paginated grid with image/video previews, a lightbox, adjustable grid size and items per page. It also contains a browser-extension manifest and options page. These are observations, not approved requirements or a framework recommendation.

The prototype strips Windows drive letters, only escapes spaces in paths, constructs some markup with `innerHTML` and lists file extensions beyond demonstrated browser codec support. Any reused behavior needs proper path/URL handling, text-safe rendering and explicit format capability detection. Copying the old implementation as a scaffold would carry these defects forward.

## Brainstorm before architecture

- What is the first user journey: open a folder immediately, generate a portable gallery, or maintain an ongoing library?
- What should launch the gallery: a browser page, local service, desktop application, browser extension, CLI, or a combination?
- Which platforms and offline behavior matter first? How should files be selected and accessed?
- Which GalleryGen interactions should carry forward, and what browsing, sorting, filtering or playback behavior is missing?
- How large are typical collections? Are thumbnails, caching, background scanning or persistence needed?
- Should the app ever change original files? What configuration, saved views and portability should exist?
- What sharing/export, installation and update experience should the first release provide?

## Decisions held open

Application language/runtime, frontend framework, host shell, browser model, database, scanner, media processing, packaging and documentation-site renderer are unselected. Node is currently only a repository-maintenance tool. No application schema is invented before its data contract is agreed.
