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

Hosted qualification exposes repository, product-windows, website, native-proof (product-linux) and native-proof (product-macos). They reuse the repository's npm commands with pinned Actions, read-only repository permissions and credential-free checkout. Each record identifies the exact Git revision, source digest, terminal outcomes and produced artifact hashes. Dependency installation and build readiness belong to preparation; timed qualification starts after readiness.

The Windows Server 2025 x64, Ubuntu 24.04 x64 and macOS 15 arm64 jobs compile normal Full/Lite artifacts, exercise native unit/state tests, assemble source-bound inventories and extract/relocate the resulting archives. Minimal-PATH recipients run finite commands against exact compiled identities and root/result contracts with no maintainer tools on PATH. The macOS proof preserves an actual app bundle and executable modes. Receipts identify native dependencies, signing observations and separate archive/extracted/runtime footprints. These CLI proofs do not certify interactive browsing, assistive technology, media decoding, AppImage mounting, macOS quarantine/translocation, installer/update/uninstall behavior or clean-machine independence. The separate desktop qualification workflow targets a provisioned Windows x64 runner labelled gallery-desktop, started in an isolated logged-in desktop session with MSVC/SDK/WebView2, Python and FFmpeg available. Running that worker as a Windows service does not provide an interactive desktop. The workflow drives existing small-fixture native automation without an attended owner walkthrough. No self-hosted runner availability is implied by defining this path.

Apply the actual passing check names to the repository policy after hosted success; preserve squash-only merge and merged-branch deletion. Native evidence remains identified separately from hosted evidence and requires its actual elected environment.

The pinned brand verifier recomputes all comparison images in an isolated copy. A consumer adapter checks exact image mode, dimensions and every pixel before retaining the original checksum-verified PNG encoding; this prevents platform-specific compression bytes from falsely changing the pinned manifest. Any image difference fails. The recovered verifier, all report/manifest checks and installed kit bytes remain unchanged. A separately published upstream canonical proof set is retained with exact source/artifact provenance and an offline inventory; its report and original proof hashes remain authoritative when the release kit was generated on a different renderer.

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

The initial U-01/U-02 policy is [explicitly bounded by its platform rows](installation-and-distribution.md#initial-platform-and-dependency-matrix). Retained unbuilt architectures and untested runtime/installer combinations remain unqualified. Initial media claims follow the native rows below; U-04 retains additional profiles/formats and external opening/conversion. Retain measured U-10 scenario limits for numerical performance claims. Other open decisions must be resolved before their affected contracts are presented as complete. This allows scoped implementation to proceed without substituting a plan for delivered behavior.

Return to the [index](index.md) or consult the [glossary](glossary.md).

## Persistent state qualification

Native tests exercise sparse precedence, explicit defaults/false, compatible unknown values, competing revisions, invalid and oversized portable documents, linked destinations, exact 90-day expiry, clock rollback, the 20-entry recent limit and bounded cleanup. Rendered Windows acceptance exercises independent folder choices, portable conflict warnings, inheritance removal, row-only forgetting, unavailable recent folders and relocation into a fresh user/history profile. Original media bytes are compared. Normal builds exclude private history/settings test redirection. Linux/macOS runtime paths and very large history stores require separate platform/scale qualification. These functional fixtures do not establish power-loss durability or a filesystem-wide compare-and-swap against arbitrary editors.

## Requested discovery and storage qualification

Small deterministic barriers exercise intermediate publication, cancellation during running/queued work, replacement/close retirement, partial iterator results, explicit unavailable/internal-failure recovery and globally ordered snapshots. Rendered Windows checks cover visible progress with collapsed controls, keyboard/viewer cancellation, focused media-node continuity and retained preferences/source bytes. Pure collection tests cover full sorting/filtering and stable page anchors. Ordinary artifacts exclude discovery control commands and failure/delay hooks.

Local Windows native paths and close-then-relocate behavior are distinct from simulated root/iterator failures. Physical removable disconnection, real network outage/provider identity behavior, native Linux/macOS runtime and large collections remain separately unqualified. No simulation or successful build substitutes for those observations. See [the traversal and storage policy](gallery-lifecycle.md#open-decisions).

## Sidecar and summary qualification

Small source-neutral fixtures cover exact numeric tokens and repeated members, direct/stem/index association, native filename identity, malformed/encoding/depth/node/source budgets, unavailable or replaced sidecars, explicit Refresh and retired reads. Rendered Windows checks use the real inspection command, lazy keyboard disclosure, active-looking inert text, all four summary destinations, fresh-profile relocation and same-video continuity through sidecar changes/failures. Aggregate source accounting includes failed decoding reads. Normal artifacts exclude the metadata test barrier. These cases establish functional boundaries on the elected Windows environment; other native runtimes and physical storage/provider behavior require their own evidence.

## Measured loading acceptance

A shared native harness measures the unchanged and final identified artifacts with the same small synthetic corpus and operation boundaries. Retain all three samples, explicit OS-cache uncertainty, bounded animation-callback gaps, per-process native/WebView private bytes and working sets, source/binary identity, separated footprint categories and unavailable observations. Native before/after endpoints are not guaranteed peaks; callback gaps are not presented FPS. Preserve the ordinary preparation/qualification/combined accounting separately from these operation observations.

Deterministic loading tests cover sustained latency/failure/frame pressure, held work before completion, finite histories, gradual recovery, idle/hidden behavior, stale observations, dynamic caps, priority and throwing/synchronous cleanup. Rendered native checks cover the actual Loading strategy control, all four destinations, portable relocation/fresh calibration, hidden source retirement and unchanged focused video identity. Instrumented native counters observe actual permit ownership without granting new filesystem authority; normal artifacts exclude the private counter action. Source inventory remains unchanged outside explicitly requested settings writes. These observations apply to the elected native reference environment, with other platforms/providers and practical scale requiring separate evidence.

## Launch and edition qualification

Windows rendered acceptance exercises both compiled editions: Full chooser and normal close/lifetime result, Lite adjacent root from an unrelated working directory, explicit override, relocation with fresh recipient state, acknowledged detach with a surviving child, discovery failure/recovery, cancellation, stale-operation rejection and independent simultaneous sessions. Exact native roots and actual machine/native results validate against the owned schema. Normal Full/Lite binaries must open ordinary windows while excluding private test hooks and the automation listener. These results remain distinct from the three hosted CLI archive proofs. Original fixture media and extracted payload bytes are compared before and after acceptance. Adversarial receipt tests cover nonce/PID mismatches, size/deadline bounds, slow input, known child exit, timeout without killing the child and rejected late acknowledgement.

## Native media and accessibility campaign

Native media/interaction acceptance uses each elected system WebView, separately from normal extracted CLI proof and website Chromium checks. The campaign covers Windows x86_64/WebView2, Ubuntu 24.04 x86_64/WebKitGTK on an isolated X11 virtual display, and macOS 15 arm64/WKWebView. Every row requires its own source/artifact/runtime receipt. An unavailable display, accessibility provider or audio graph is a failed/unavailable check, never a codec result.

The small separate corpus contains PNG, JPEG, static GIF, WebP, BMP, TIFF and AVIF candidates, all eight EXIF orientations, alpha and tagged sRGB SDR samples, damaged data, moving H264/AAC and VP9/Opus tone clips and a silent control. Actual image samples, changing decoded frames, trusted playback/pause/seek, exact original partial reads and decoded audio samples establish independent observations. A successful capability hint or unmuted element is insufficient. These observations do not qualify animation, HDR/wide-gamut output, physical display calibration or speaker audibility.

Native UI Automation, AT-SPI and WebKit/ApplicationServices provider-tree observations are recorded independently of DOM/axe checks. The elected Windows screen-reader campaign uses actual NVDA 2026.3 focus/item speech with an isolated profile and silence synthesizer. This establishes semantic speech generation, not audible voice quality. The macOS test-only client uses WebKit's remote accessibility token bridge to query the actual web-content provider; private API availability is checked and never replaced by DOM labels. That observation does not establish external VoiceOver speech; Linux AT-SPI client results do not establish Orca speech. Coarse/mixed stylesheet-condition emulation is identified separately from physical touch. Native default DPI/scale observations and explicit zoom/window conditions remain distinct.

### Observed image and color boundaries

| Elected native environment | Decoded original image samples | Retained unsupported samples |
| --- | --- | --- |
| Windows Server 2025 x86_64, WebView2/Chromium 155 | PNG, JPEG, static GIF, WebP, BMP, AVIF | TIFF and damaged JPEG |
| Ubuntu 24.04 x86_64, WebKitGTK 2.52.6, X11/Xvfb | PNG, JPEG, static GIF, WebP, BMP | AVIF, TIFF and damaged JPEG |
| macOS 15 arm64, WKWebView framework 20621.3.11.11.3 | PNG, JPEG, static GIF, WebP, BMP, TIFF, AVIF | Damaged JPEG |

All three environments interpret the eight synthetic JPEG EXIF orientations with the expected dimensions/corner order and decode the known alpha, tagged sRGB SDR and panorama samples. These are finite representative original-image observations. They do not qualify every file variation within a format, animated images, wide-gamut/HDR output or a physical display's profile/calibration. Unsupported and damaged items retain their identity and information; a transport failure cannot certify unsupported decoding.

### Audio and presentation boundaries

| Elected runtime | Moving playback, pause, seek and original partial reads | Audio observation |
| --- | --- | --- |
| Windows Server 2025/WebView2 | MP4/H264 with AAC, MP4/H264 without audio, WebM/VP9 with Opus | Media-element tone graphs and no-audio control |
| Ubuntu 24.04/WebKitGTK with the recorded GStreamer plugins | Same three finite samples | Finite actual application-output PCM through an isolated PulseAudio sink monitor; no-audio control |
| macOS 15/WKWebView | Same three finite samples, with explicit post-mount source initialization | AAC media-element graph and no-audio control; independent exact-original Opus buffer graph |

These rows require the corresponding exact-source per-edition runtime receipt. Builds, mixed-source diagnostics and another platform's result cannot qualify a row. Mac WebM frame comparisons use native-view snapshots with a central decoded-video crop because this WebKit version blocks canvas read-back. Blank or grayscale activity and changes outside that crop cannot pass the known colored-pattern observation.

Video observations distinguish changing native frames and seeking from audio measurement. The finite clips use 160x96 YUV420 video at 12 frames per second for four seconds: H264/AAC and VP9/Opus with a mono 48kHz 440Hz tone, plus an H264 control without an audio track. Media-element graph samples identify native decoded tone behavior and the no-audio control where that observer works. On macOS, the elected VP9/Opus audio observation instead hashes the exact granted original and measures a native decoded-buffer graph after closing its ordinary video viewer. That independent graph cannot certify media-element audio output or synchronized audio seeking. Graph observers route through silent gain; Linux output is captured from an isolated PulseAudio null sink. Neither establishes physical speaker audibility. [WebKit's WebM audio observer issue](https://bugs.webkit.org/show_bug.cgi?id=276813) describes a relevant engine boundary; actual runtime receipts, rather than that report, establish each result.

Presentation observations identify native reduced-motion preferences, both rendered themes, the host's reported default scale/DPR, and native zoom 2 in a 480x600 logical window. Controls can be scrolled into view without footer clipping. Coarse/mixed stylesheet branches retain 44 CSS-pixel targets at the 80% text preset, while fine-pointer desktop controls keep their compact defaults. These conditions do not qualify physical touch hardware, every system display-scale setting or every assistive reader configuration.

All focus-changing acceptance is restricted to explicitly isolated CI desktops. Local `npm run qualify -- --headless` runs repository, app, website, unit, integrity and finite normal-archive checks without opening the gallery or injecting input. Its receipt is headless evidence only. Existing Windows rendered browsing, preparation/export, launch, measurements and ordinary-build exclusion remain mandatory on the isolated Windows runner; the new runtime campaign runs both editions on each elected OS. No active owner workstation or attended owner walkthrough is required.

## Native observation integrity

Driver availability requires both a responsive listener and an owned-process nonce/PID proof through the native-test-only channel. The expected nonce travels only in the child environment. Unrelated listeners, early exit and unavailable listeners fail within the original readiness deadline, retaining bounded stdout/stderr, exit/signal, listener and trial/source/edition context. Ordinary artifacts exclude this identity channel. Historical measurement artifacts that lack the identity command instead require the Windows TCP listener table to identify the exact owned child PID, through the existing persistent process observer and within the same readiness deadline. They remain unchanged compiled baselines.

Linux audio qualification captures finite float PCM from the selected application stream on an isolated PulseAudio sink monitor. Stream process ancestry, sink identity and stream continuity are checked before and after capture. It observes actual playback output without inserting an analyser into the media-element path. Tone amplitude/frequency and silent-control thresholds remain mandatory, alongside trusted input, advancing media time and changing decoded frames. Missing capture is a failure; measured silence qualifies only the silent control. Windows/macOS retain their declared native graph methods. Physical speakers remain untested.

The GTK3 dependency family uses the exact upstream mutable-output-pointer correction in its GLib string iterator. Every vendored byte and permitted patch is checked against retained provenance before qualification, and Linux runs the real iterator regression with optimization. The corrected implementation and a version-based advisory scanner disposition are separate observations.

## Ordinary Linux package acceptance

The Linux package scope uses ordinary release binaries without the private native driver. Actual APT/dpkg operations cover fresh and identical-candidate installation, registered/foreign/modified/missing/mode/link/candidate conflicts, documented maintainer fallback/unwind paths, config-files reinstall, removal and purge. Exact gallery, sidecar, recipient settings/history, foreign-extra and shared-runtime observations establish retention. Package-manager success requires exact installed-file/mode/identity readback.

Full installed and Lite extracted sessions use an external bounded AT-SPI/X11 observer, real focused keyboard input and actual native image/video snapshots. Lite also requires explicit/in-place roots, unrelated CWD, space/non-ASCII paths, relocation, portable settings and explicit Refresh after Full removal with fresh recipient state. Ordinary H264/AAC and no-audio samples require changing central decoded-frame hashes plus finite PID-attributed PulseAudio PCM with the same tone/silence thresholds. Native control values are retained only when available; these package observations do not claim a measured media clock or replace the separate instrumented core playback/pause/seek gates. No ordinary candidate contains private automation hooks.

Every archive/ELF/source identity, executable mode, dependency/license inventory, governed icon mapping and container/application/runtime footprint basis is checked. Missing-library injection modifies only a copied ELF and is labelled as injected evidence. Actual installation verifies APT dependencies on the prepared supported host; clean-machine provisioning, physical speakers, Wayland and additional distro/architecture baselines are not inferred. All GUI/input stays on isolated hosted desktops, with unchanged 660/900/15-second qualification controls and separate preparation/qualification/combined accounting.
