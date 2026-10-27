# Contributing

## Current workflow

Read the [constitution](.specify/memory/constitution.md) and [documentation](docs/v0.0.0/index.md). The v0.0.0 specification records the selected Rust/Tauri and static Next.js direction, agreed behavior and remaining product decisions. Keep implementation proportional to that scope. Maintain authoritative open product decisions in the documentation and slice-specific planning in `specs/`; use Spec Kit for each implementation slice. Public documentation describes system contracts and does not link numbered planning artifacts.

Use [GitHub Issues](https://github.com/shruggietech/local-media-gallery/issues), milestones and the [repository Project](https://github.com/orgs/shruggietech/projects/8) as primary tracking, with Spec Kit artifacts for implementation decisions and tasks. Check existing issues before filing a report. Include the affected commit or version, operating system, reproduction steps, expected behavior and observed behavior. Remove private media, credentials and personal paths from reports. Follow [SECURITY.md](SECURITY.md) for vulnerability reports.

## Tracking conventions

[GitHub configuration](.github/bootstrap.json) records the repository settings, topics, label taxonomy and empty Project setup. Native issue types distinguish Bug, Feature and Task. Labels classify area, platform, priority, effort and triage needs; the Project Status field owns delivery progress. Milestones define agreed release commitments, and the Slice field groups issues delivered through one Spec Kit cycle. Do not duplicate lifecycle state in labels or populate delivery commitments merely to fill the board.

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
npm run qualify -- --headless
```

These validate repository integrity, documentation structure/references, importer and JSON contracts, pure view logic, Rust discovery/access/streaming, TypeScript, brand lint/proofs, static export and actual Windows WebView2 behavior. Native testing uses twelve candidates and real Windows input/picker controls; allow the automated app to finish its interaction. No personal collection or bulk fixture is needed. Native WebDriver is feature-gated out of the normal application. The independent website uses `npm run build:site`, `npm run check:site` and `npm run test:site`. Install its pinned Chromium runtime before rendered checks.

The exact pinned brand verifier runs in an ignored temporary copy with verified recovery bytes, Node 24.11.0 and Pillow 12.3.0, using the delivered approved proof matrix. It checks all 36 verifier conditions and the glyph validator without changing `brand/kit`. Other hosts may supply `GALLERY_PROOF_NODE` pointing to an actual native Node 24.11.0 runtime; no Linux/macOS native qualification is claimed.

For release qualification, verify prerequisites before starting the qualification clock. Target 660 seconds with a 900-second hard limit and a fifteen-second provisional finalization reserve. Target-only overruns are advisory. Report preparation, qualification and combined time separately; terminal completion timestamps govern acceptance. Functional, integrity, provenance and elected checks remain mandatory. User observations normally follow releases as issues; do not invent an attended pre-release verification gate.

## Style and integrity

Save authored text as UTF-8 without BOM with LF line endings. Use soft-wrapped Markdown, one H1 and language-labelled code fences. Mermaid flowcharts use TB or TD. Keep history in `CHANGELOG.md`. Keep software, versioned documentation and the master JSON Schema on the same release version once application/schema contracts exist. Refresh the glossary for major releases and explain breaking changes.

Read `brand/kit/enforcement/consumer-contract.json` and `brand/kit/enforcement/IMPLEMENTATION.md` before applying identity or UI rules. Update governed kit bytes only through `scripts/sync-brand-kit.mjs`. The kit's multiple platform adapters do not select the product stack.

Console children on Windows must use `CREATE_NO_WINDOW` or an equivalent guarantee, redirected noninteractive I/O and disabled prompts. Direct Git and GitHub operations through the headless command runner are permitted. Stop any launcher that produces visible windows.

## Commits and pull requests

Use focused conventional commits. Update Unreleased in the changelog for behavior or workflow changes. Link the related issue in each pull request and describe changed behavior, checks and unverified limits. Follow the owner's merge authorization, squash merge and delete merged branches. Release notes contain short highlights and end with a link to the master changelog. Repository publication does not create a product release; packages, signing, hosting and release automation remain separate work.

## Hosted checks

Required check names are `repository`, `product-windows` and `website`. Each uses `npm run ci -- <scope>` for readiness, terminal results and separate preparation/qualification/combined accounting. Hosted dependency installation is included from the workflow preparation timestamp. Site and product artifacts carry hashes tied to the exact revision. The public website is packaged after its checks and deployed through scoped Pages/OIDC credentials only after all three jobs pass. Publication follows main, plus an explicitly elected same-repository bootstrap branch restricted by the exact PR ref in the github-pages environment. Remove the bootstrap repository variable and environment ref during post-merge housekeeping. Production operations are serialized and retired revisions are rejected.

The separate `Windows desktop qualification` dispatch workflow requires a provisioned self-hosted Windows x64 worker labelled `gallery-desktop` in a logged-in desktop session. Install MSVC/Windows SDK, WebView2 and FFmpeg before registering the runner. Run the worker interactively in a dedicated desktop account, not as a Windows service; no owner walkthrough is needed. Do not run untrusted pull-request code on that worker. The workflow is manual-dispatch only and uses the selected trusted ref. Hosted compile checks and this native runtime path provide distinct evidence.

## Website deployment maintenance

Use `node scripts/configure-domain.mjs preflight`, then `plan` for scoped provider readback. Cloudflare credentials belong only in the existing environment (`CF_DNS_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_REGISTRAR_API_TOKEN`); GitHub CLI reuses its authenticated account. Private snapshots and journals stay under ignored `.local/site-deployment` and must not be uploaded. Never print credentials or registrar contacts.

1. Complete organization Pages domain verification using the generated TXT challenge and retain its record. Run `node scripts/configure-domain.mjs bind` to assign the custom Actions domain before traffic DNS.
2. Review the plan, then use `node scripts/configure-domain.mjs apply` for exact DNS-only apex reconciliation. Existing registration/delegation, lock, renewal, privacy, DNSSEC and unrelated records are preserved. Missing ownership/access or unexpected state is an attributable failure.
3. Download the actual successful run's static artifact and website evidence. Run `node scripts/verify-deployment.mjs ARTIFACT EVIDENCE REVISION`, then `node scripts/verify-live-site.mjs ARTIFACT EVIDENCE`. Set `GALLERY_SITE_ORIGIN=https://localmedia.gallery` when running `npm run test:site` for rendered live acceptance.
4. Repeat apply for zero writes. `node scripts/configure-domain.mjs drill` proves temporary TXT creation and rollback without disturbing production routing. `rollback JOURNAL` reverses only recorded unchanged-since-application web mutations; an uncertain write or concurrent edit requires readback and remains incomplete.

Retain the previously qualified artifact and successful run for content recovery; rerunning that run reuses its checked output. The same `rollback JOURNAL` command also accepts Pages-binding journals, compares current settings with the recorded applied state and restores the previous settings or removes newly created hosting. It requires provider and independent public DNS withdrawal before changing the domain binding, rejects concurrent changes and pending writes, and verifies the restored settings. Keep ownership TXT. Do not remove and re-add the domain during ordinary certificate polling. DNS/certificate readiness has bounded checks and may remain pending; only actual live acceptance is success.

If certificate provisioning remains stalled after verified DNS and bounded readiness checks, GitHub documents removing and re-saving the custom domain to restart provisioning. One controlled retry of the same organization-verified hostname may preserve DNS and the Pages site because the retained organization verification prevents another account from claiming it. Snapshot before/after state, restore the binding even on failure, and keep normal certificate validation. This operational retry does not remove hosting; permanent retirement and rollback still require DNS withdrawal.

Interactive native tests intentionally refuse the active workstation. Run them only on explicitly isolated CI desktops; do not opt the owner workstation into that context. Hosted product scopes elect the Full/Lite system-WebView media/accessibility campaign and preserve the existing Windows rendered/launch/measurement gates. Headless local qualification does not certify native interaction. NVDA is a pinned isolated maintainer tool for Windows semantic speech-generation checks, with silent output and no recipient payload. Native platform receipts identify the actual tested runtime/display/assistive conditions.
