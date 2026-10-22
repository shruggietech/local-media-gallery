# Contributing

## Current workflow

Read the [constitution](.specify/memory/constitution.md) and [documentation](docs/v0.0.0/index.md). The v0.0.0 specification records the selected Rust/Tauri and static Next.js direction, agreed behavior and remaining product decisions. Keep implementation proportional to that scope. Maintain authoritative open product decisions in the documentation and slice-specific planning in `specs/`; use Spec Kit for each implementation slice. Public documentation describes system contracts and does not link numbered planning artifacts.

The repository is local. Local commits are authorized. Remote creation, first push, GitHub tracking setup and publication require owner authorization. Once published, use GitHub Issues, milestones and Projects as primary tracking, with Spec Kit artifacts for implementation decisions and tasks.

## Checks

Use Node.js 24+, Python 3.12+, and the pinned Rust 1.96.0 toolchain. Windows native work requires the MSVC C++ build tools, Windows SDK and WebView2. FFmpeg creates the short synthetic clips used by acceptance. See the README for local prerequisites and launch behavior.

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

These validate repository integrity, documentation structure/references, importer and JSON contracts, pure view logic, Rust discovery/access/streaming, TypeScript, brand lint/proofs, static export and actual Windows WebView2 behavior. Native testing uses twelve candidates and real Windows input/picker controls; allow the automated app to finish its interaction. No personal collection or bulk fixture is needed. Native WebDriver is feature-gated out of the normal application. The independent landing page and documentation-site build remain future work.

The exact pinned brand verifier runs in an ignored temporary copy with verified recovery bytes, Node 24.11.0 and Pillow 12.3.0, using the delivered approved proof matrix. It checks all 36 verifier conditions and the glyph validator without changing `brand/kit`. Other hosts may supply `GALLERY_PROOF_NODE` pointing to an actual native Node 24.11.0 runtime; no Linux/macOS native qualification is claimed.

For release qualification, verify prerequisites before starting the qualification clock. Target 660 seconds with a 900-second hard limit and a fifteen-second provisional finalization reserve. Target-only overruns are advisory. Report preparation, qualification and combined time separately; terminal completion timestamps govern acceptance. Functional, integrity, provenance and elected checks remain mandatory. User observations normally follow releases as issues; do not invent an attended pre-release verification gate.

## Style and integrity

Save authored text as UTF-8 without BOM with LF line endings. Use soft-wrapped Markdown, one H1 and language-labelled code fences. Mermaid flowcharts use TB or TD. Keep history in `CHANGELOG.md`. Keep software, versioned documentation and the master JSON Schema on the same release version once application/schema contracts exist. Refresh the glossary for major releases and explain breaking changes.

Read `brand/kit/enforcement/consumer-contract.json` and `brand/kit/enforcement/IMPLEMENTATION.md` before applying identity or UI rules. Update governed kit bytes only through `scripts/sync-brand-kit.mjs`. The kit's multiple platform adapters do not select the product stack.

Console children on Windows must use `CREATE_NO_WINDOW` or an equivalent guarantee, redirected noninteractive I/O and disabled prompts. Direct Git and GitHub operations through the headless command runner are permitted. Stop any launcher that produces visible windows.

## Commits and eventual pull requests

Use focused conventional commits. Update Unreleased in the changelog for behavior or workflow changes. For pull requests, describe changed behavior, checks and unverified limits. Follow the owner's merge authorization, squash merge and delete merged branches. Release notes contain short highlights and end with a link to the master changelog. Hosting and release automation will be configured when publication is authorized.
