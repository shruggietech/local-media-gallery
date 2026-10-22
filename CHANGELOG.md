# Changelog

All notable changes are documented here using [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Persistent global font-size presets: Default (100%, unchanged), Small (90%) and Smaller (80%), applied across application text without scaling media or control minimums. Existing user settings default to the current size.

- Bounded gallery pages, shared media-load admission, variable-height masonry with 12px gaps, compact collapsible controls, a scrolling-only position indicator and a focused viewer that suspends gallery media work.
- Immediate per-user view preferences in validated `settings.json`, including persistent information disclosure, atomic writes, conflict detection and non-destructive invalid-settings recovery.
- Working local Rust/Tauri gallery with bundled static Next.js UI, native folder selection and launch paths, current direct-file discovery, type filters, deterministic sorting, aspect-aware images, controlled video playback, item facts and keyboard navigation.
- Version-aligned readonly snapshot schema, session-scoped streaming with byte ranges and stale-resource cancellation, source-preservation/access tests, and Windows native acceptance using twelve synthetic media candidates.
- Hidden local build, fixture, brand-proof and qualification tooling with separate prerequisite/qualification accounting and a feature-gated native automation driver excluded from normal builds.
- Local Git foundation on main, authentic Spec Kit 1.0.8 Codex integration, constitution 1.0.0, versioned Markdown documentation and an internal discovery agenda.
- Dependency-free Node maintainer commands with text/link/version/integration checks and brand importer regression tests.
- Verified import of the supplied Local Media Gallery brand 1.0.0 / BrandBuilder 3.1.0 candidate, with recorded hashes and publication status, offline verification and a manual official-release updater.
- Complete v0.0.0 technical specification: twelve contract chapters, an index with thirteen open-decision groups, a glossary, refreshed brand guidance and a behavioral acceptance matrix.
- Documentation checks for the approved chapter set, requirement families, decision references, Markdown structure and local links/fragments.
- Internal Spec Kit specification for the first working gallery, proposed behavior defaults and small-fixture functional acceptance coverage.

### Changed

- Reduced fine-pointer desktop buttons, inputs and selects to compact 32px controls with quieter action borders after owner feedback; coarse or mixed pointer capability retains at least 44px targets. Long folder labels truncate within the 48px toolbar; a full-width 12px media canvas and quieter ghost actions leave more room for content.
- Directory discovery now runs only when opening a gallery or selecting Refresh. Removed automatic watchers, periodic reconciliation and collection-snapshot polling. Future automatic refresh remains an advanced feature that defaults off.
- Focused information starts collapsed, expands by resizing the asset canvas and retains playback and disclosure state. Sorting/filtering apply before pagination, and viewer navigation crosses page boundaries.
- Reconciled official documentation, preference schema, native acceptance and source-provenance finalization with the current browsing and persistence contracts.
- Tailored imported contribution, security, release and issue guidance to this project, removing inherited application, platform, schema and website claims.

### Decisions

- 2026-10-21: Keep application and documentation-site architecture open for owner brainstorming. Node is maintenance tooling only. Do not create a remote repository or publish during local setup. Adopt constitution 1.0.0 from the owner directives without selecting product technologies.
- 2026-10-21: Record the owner's Windows/Linux/macOS platform requirement, on-demand and portable launch models, install-free sharing, optional thumbnail and cross-platform gallery preparation, limited initial editing, typical scale of thousands, installed settings in AppData and native self-installation with collision detection. Select Next.js for documentation; keep the application host and framework open. Record remembered-location SQLite state and its decay policy as a proposed direction without adopting an unapproved expiry constant.
- 2026-10-21: Select the Rust/Tauri direction with a static Next.js interface. Distinguish a full installation with an honest dependency footprint from lightweight, on-demand Lite binaries for browsing and sharing. Allow platform installers, including Windows MSI, superseding the earlier MSI restriction. Remove the proposed obligation for every Lite copy to carry a complete clean-machine runtime bundle. Application implementation remains pending.
- 2026-10-21: Author the approved v0.0.0 specification before product implementation. Define an independent Next.js landing page and release-versioned documentation with retained version selection, rebuild/check requirements and aligned application-schema versioning. Keep unresolved product decisions explicit and retain the local-only publication boundary.
- 2026-10-21: Specify the first working gallery locally before implementation. The owner selected Windows-first native validation while retaining Windows/Linux/macOS product targets, and rejected the proposed 1,000-image test. Propose a small representative fixture without a bulk-media or synthetic stress prerequisite; performance at thousands remains unverified.
- 2026-10-22: Execute the owner-authorized local gallery slice autonomously. Adopt a capability-relative readonly Rust core, an ephemeral IPv4-loopback media transport, bundled static Next.js/Tauri presentation, session-only controls, direct-file discovery without linked descendants, and Draft 2020-12 owned snapshot schema at version 0.0.0. Add Close folder to release Windows root handles before relocation. Pin native/JavaScript build dependencies, exact offline BrandBuilder recovery and compatible proof tools; keep governed brand bytes unchanged. Defer Linux/macOS runtime qualification, persistent state, sidecars, thumbnails, installers/Lite packages and both website surfaces. Create no remote, push, tag or publication.

- 2026-10-22: Execute the responsive gallery slice locally under owner-authorized autopilot. Replace automatic discovery with explicit open/Refresh and remove the unused filesystem-notification dependency. Keep page sizes 24/48/96 (default 48), shared gallery media admission at four, shortest-column packing with 12px gaps, compact controls and no gallery media behind the focused viewer. Persist global view preferences immediately in native per-user format-1 settings; keep information collapsed on first use and preserve the active asset during disclosure changes. Preserve malformed/future settings and compatible unknown fields; reject stale writes. Update qualification fixtures and current-slice evidence exclusions while retaining historical evidence. Windows maintainer children use an ignored workspace temporary directory for reproducible local fixture permissions. These process changes do not introduce a bulk-media gate, change the Windows-first native verification scope or authorize publication.

- 2026-10-22: Refine the responsive gallery interface after the owner observed oversized native controls. Apply a product-scoped 32px fine-pointer minimum with existing 4px/8px spacing,8px radius and 16px readable type/icons; retain at least 44px for coarse/mixed pointer capability. This explicitly overrides the pinned 44px control invariant for precise desktop input because the delivered adapter exposes no compact-density prop. Keep governed kit bytes and enforcement unchanged, record local density and disclosure-ARIA capability gaps, and update native geometry acceptance. Keep AppFrame as the sole scroll/inset/focus owner while using a full-width 12px product media canvas instead of reading gutters. No upstream submission or publication is authorized.
- 2026-10-22: Add optional-on-read `fontScale` to the current settings format with a default of 100, preserving prior preference files. Scale inherited body text while retaining the root rem baseline, existing media geometry and governed brand bytes. Extend small-fixture native qualification for text ratios, geometry, persistence and default restoration; move current evidence exclusions to this slice. Keep all work local.
