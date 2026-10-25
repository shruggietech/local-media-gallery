# Verification and compatibility

## Evidence model

**VC-01:** Verification claims MUST identify what was exercised, the exact source/artifact version, the environment and the observed result. A source-level check, synthetic fixture, native runtime test, hosted check and user observation are different forms of evidence. Passing one must not be represented as completion of another.

A release's acceptance scope must identify its supported platform/architecture/runtime combinations, edition behavior and elected checks before results are evaluated. The open-decision register identifies choices that must be settled for affected claims. An untested combination must not inherit a support claim merely because the code compiled elsewhere.

## Behavioral acceptance matrix

The matrix gives each chapter's requirements a verification home. It specifies expected outcomes, not reports of completed tests.

| Contract | Representative positive scenario | Boundary or failure scenario |
| --- | --- | --- |
| [OV-01 through OV-05](overview.md) | Open unprepared media, browse common functionality, inspect item information | No thumbnails/sidecars/history; filtered empty versus inaccessible root; editing never implied by viewing |
| [AR-01 through AR-05](architecture.md) | Static interface reads live native results; background work remains cancellable | Replace gallery during scan; stale results cannot update the new session; no frontend rebuild per collection |
| [DI-01 through DI-06](installation-and-distribution.md) | Install Full; launch Lite on a supported host; include another platform's artifact | Unrelated command collision, incompatible runtime, interrupted update, wrong architecture and removal preserving media |
| [GL-01 through GL-06](gallery-lifecycle.md) | Extract under a different root; discover additions/removals through explicit Refresh | Non-ASCII/reserved-character names, changing files, unreadable children, unavailable drive and traversal cycle |
| [BP-01 through BP-06](browsing-and-playback.md) | Whole-collection sorting/filtering, bounded pages, masonry cards, collapsed information and seekable video | Missing sort values, cross-page focus, toggling information during playback, unsupported codec and narrow keyboard-only navigation |
| [MD-01 through MD-06](metadata-and-sidecars.md) | Inspect arbitrary nested JSON and chosen summary fields with provenance | Ambiguous naming, duplicate keys under chosen policy, malformed/large JSON, stale reads and large exact numbers |
| [CS-01 through CS-06](configuration-and-state.md) | Restore user preferences after restart and immediately retain information disclosure | Malformed/future settings, stale writes and write failures preserve files; future portable/history scopes require separate evidence |
| [IF-01 through IF-07](interfaces-and-contracts.md) | Equivalent GUI/command operations and attributable job results | Invalid/stale identifiers, cancellation, partial outcomes, timeout uncertainty and machine-output separation |
| [PF-01 through PF-06](thumbnails-and-performance.md) | Browse originals; optionally generate and reuse thumbnails; adapt bounded work | No cache, changed source, full disk, cancelled generation, slow storage and mixed image/video load |
| [SR-01 through SR-07](security-and-reliability.md) | Scoped access, verified artifacts, recoverable writes and useful diagnostics | Traversal attempts, active-looking JSON text, interrupted writes, unrelated-file collision and hidden helper failure |
| [WD-01 through WD-06](website-and-documentation.md) | Independent landing; explicit documentation versions; rendered changelog/contracts | Missing target topic, old snapshot with current site renderer, absent download and incorrect latest-version pointer |
| [VC-01 through VC-05](verification-and-compatibility.md) | Exact-version evidence and successful elected release checks | Late terminal outcome, mismatched versions, unsupported downgrade and unverified claim |

Structural loading checks must count mounted cards and active gallery admissions, confirm that focused viewing removes gallery media/probes, and verify that metadata toggling keeps the same playing media element. Layout checks cover the 12-pixel card gap, shorter-column packing, compact collapsed toolbar, keyboard order and scrolling-only indicator. Manual-refresh checks must show that idle directory mutations leave the snapshot unchanged, then converge after explicit Refresh. Preference checks include immediate saves, restart restoration and non-destructive malformed/conflict/write-failure behavior.

Small synthetic fixtures with a reduced test page size can exercise these boundaries without a bulk-media prerequisite. They establish the tested work limits, not responsiveness for an arbitrary collection containing thousands of files. Platform-native runtime and owner-collection performance claims require their own measurements.

Fixtures should use self-contained synthetic media and metadata where practical. Representative files must include several aspect ratios, images/videos, missing optional facts and varied native path spellings. Actual format support requires real decode/playback checks for the advertised formats, not only extension-based fixtures.

## Source, product and website checks

The repository's maintainer workflow includes:

```text
npm ci
npm run check
npm run check:docs
npm test
```

These checks cover repository integrity, documentation structure/references and the maintainer tooling exercised by tests. Product acceptance additionally requires applicable Rust/native checks, artifact launches, directory/media behavior and rendered interface checks when those surfaces are implemented. Website acceptance requires a complete static build, route/link/asset validation and rendered landing/documentation interaction checks. Source link checks cannot prove a future renderer or native media transport works.

**VC-02:** Every new release MUST compile the corresponding documentation and check all retained documentation versions through the site's current build. Schema examples must be validated against their stated schema version when those contracts exist. The vocabulary/glossary and exact release/download identity must be reviewed, with a complete vocabulary rescan for major releases.

The independent landing page must be tested for its own content, release pointers, navigation and runtime payload. Documentation checks include topic-preserving version changes, explicit missing-topic fallback, version-scoped search and historical asset/fragment resolution.

Website presentation checks include both themes, mobile/tablet/desktop screenshots, 320 CSS-pixel reflow, enlarged text, native anchors/history, active final-section navigation, copy success/failure, described diagrams, icon/social resources and route canonicalization. Automated accessibility scans supplement directed keyboard, focus and contrast checks; they do not establish complete assistive-technology coverage. Cold laboratory samples record fixed viewport/network/CPU conditions and decoded/gzip asset budgets. Field Core Web Vitals require actual field observations and are reported separately.

## Hosted and native automation

Hosted qualification exposes three stable required checks: repository, product-windows and website. They reuse the repository's npm commands with pinned Actions, read-only repository permissions and credential-free checkout. Each record identifies the exact Git revision, source digest, terminal outcomes and produced artifact hashes. Dependency installation and build readiness belong to preparation; timed qualification starts after readiness.

The Windows hosted job establishes native compilation, Rust/unit, frontend and brand evidence. It does not certify interactive desktop input or assistive technology. The separate desktop qualification workflow targets a provisioned Windows x64 runner labelled gallery-desktop, started in an isolated logged-in desktop session with MSVC/SDK/WebView2, Python and FFmpeg available. Running that worker as a Windows service does not provide an interactive desktop. The workflow drives existing small-fixture native automation without an attended owner walkthrough. No self-hosted runner availability is implied by defining this path.

Apply the actual passing check names to the repository policy after hosted success; preserve squash-only merge and merged-branch deletion. Native evidence remains identified separately from hosted evidence and requires its actual elected environment.

## Qualification accounting

**VC-03:** Release qualification MUST begin after verified prerequisite readiness, target 660 seconds and enforce a 900-second hard limit. Target-only overruns are advisory. Provisional finalization must retain fifteen seconds for terminal results and final acceptance. Functional, integrity, provenance and elected checks remain mandatory; a timing target does not waive a required failure.

Preparation includes required dependency/tool/artifact readiness. Qualification includes its relevant queues and checks after readiness. Combined accounting includes both phases and must not conceal time spent waiting. A terminal completion timestamp is authoritative: requesting cancellation or beginning finalization before a deadline does not convert a late result into an on-time pass.

The result should record preparation start/readiness, qualification start, each required terminal outcome, final completion and separate preparation/qualification/combined elapsed time. Failed, cancelled, missing and timed-out outcomes must remain distinguishable. Repeating an unchanged check does not improve verification unless a new failure or uncertainty warrants it.

User observations normally follow releases and arrive as versioned issues. This policy does not add a mandatory attended pre-release session. Controlled automated and native checks still verify the behaviors and artifacts a release claims.

## Compatibility and version identity

**VC-04:** Software, release-versioned documentation and the master application JSON Schema MUST use the same release identity when released together. Brand-kit and optional tool versions remain separately recorded. A format revision may differ from product version but must have an explicit migration relationship. [Semantic Versioning](https://semver.org/spec/v2.0.0.html) supplies release-version terminology; breaking changes must be explained in the changelog and concise release notes.

Prefer compatible readers/writers where practical. Document what older configurations can be read, what newer fields can be preserved and when migration prevents downgrade. Do not promise unrestricted forward/backward compatibility. Reading an unknown field without loss does not establish that its behavior is understood. External sidecars remain governed by their own flexible inspection contract.

Retained documentation must continue to describe its corresponding release even when the website renderer is updated. Selecting an older documentation version does not run an older application or change support status for that binary.

## Release acceptance and remaining work

**VC-05:** A release MUST NOT be accepted or advertised as published solely because source checks passed. The evidence must bind the final source revision, artifact identities/hashes, required terminal results and documentation/schema references. Download availability and current-version pointers require verification of actual publication when publication is authorized.

Release notes contain short user-relevant highlights, any necessary migration action and a final link to the master changelog. Repository workflow follows the contribution/merge policy.

Resolve U-01/U-02 before asserting a full platform/edition matrix, U-04 before codec claims and U-10 before numerical performance claims. Other open decisions must be resolved before their affected contracts are presented as complete. This allows scoped implementation to proceed without substituting a plan for delivered behavior.

Return to the [index](index.md) or consult the [glossary](glossary.md).

## Persistent state qualification

Native tests exercise sparse precedence, explicit defaults/false, compatible unknown values, competing revisions, invalid and oversized portable documents, linked destinations, exact 90-day expiry, clock rollback, the 20-entry recent limit and bounded cleanup. Rendered Windows acceptance exercises independent folder choices, portable conflict warnings, inheritance removal, row-only forgetting, unavailable recent folders and relocation into a fresh user/history profile. Original media bytes are compared. Normal builds exclude private history/settings test redirection. Linux/macOS runtime paths and very large history stores require separate platform/scale qualification. These functional fixtures do not establish power-loss durability or a filesystem-wide compare-and-swap against arbitrary editors.

## Requested discovery and storage qualification

Small deterministic barriers exercise intermediate publication, cancellation during running/queued work, replacement/close retirement, partial iterator results, explicit unavailable/internal-failure recovery and globally ordered snapshots. Rendered Windows checks cover visible progress with collapsed controls, keyboard/viewer cancellation, focused media-node continuity and retained preferences/source bytes. Pure collection tests cover full sorting/filtering and stable page anchors. Ordinary artifacts exclude discovery control commands and failure/delay hooks.

Local Windows native paths and close-then-relocate behavior are distinct from simulated root/iterator failures. Physical removable disconnection, real network outage/provider identity behavior, native Linux/macOS runtime and large collections remain separately unqualified. No simulation or successful build substitutes for those observations. See [the traversal and storage policy](gallery-lifecycle.md#open-decisions).

## Sidecar and summary qualification

Small source-neutral fixtures cover exact numeric tokens and repeated members, direct/stem/index association, native filename identity, malformed/encoding/depth/node/source budgets, unavailable or replaced sidecars, explicit Refresh and retired reads. Rendered Windows checks use the real inspection command, lazy keyboard disclosure, active-looking inert text, all four summary destinations, fresh-profile relocation and same-video continuity through sidecar changes/failures. Aggregate source accounting includes failed decoding reads. Normal artifacts exclude the metadata test barrier. These cases establish functional boundaries on the elected Windows environment; other native runtimes and physical storage/provider behavior require their own evidence.
