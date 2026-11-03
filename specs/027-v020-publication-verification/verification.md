# S027 verification

## 2026-11-03: Specification and preparation

Slice S027 maps to issue [#85](https://github.com/shruggietech/local-media-gallery/issues/85), branch `codex/s027-v020-publication-verification` and this feature directory. Specification, clarification, reviewer checklist, research, plan, contracts, tasks and blocking analysis completed before publication operations. Analysis found nine requirements covered by eleven tasks, with no blocking conflict.

Local preparation installed locked dependencies through a hidden launcher. `npm run check` passed for 714 authored/configuration text files and 572 brand files. `npm test` completed 257 tests: 255 passed, 2 skipped, 0 failed. No local native GUI, installer or input campaign was run.

## 2026-11-03: Approved publication baseline

Owner-approved S026 merged main: `7d714ed723483d6bdb1a2286fb89fcbe8550cd40`. Logical source SHA256: `630d8e871ff64a38b0f31c2afe72fb9eb1f00f3a0aafb90ff5f4c93d12d14489`, 1539 files. The baseline checkout remains clean; this separate audit worktree is not the release producer.

Exact-main qualification [run 41595557848](https://github.com/shruggietech/local-media-gallery/actions/runs/41595557848) completed successfully, including all nine required qualification jobs and Pages. Independent readback passed against the pristine source: all original ZIP digests, nine receipts, native artifacts/literal acceptance, exact repeated assembly, actual candidate documentation export/browser, controlled publication fixture and both retained fixture gate exports. Candidate ID: `0a9e9d665f554b9534725a8de86f0b2799ee9b6b4e0b3cdc73294c79e25354a4`. The pre-publication normal website export has 493 files and correctly selects v0.1.0. Pre-publication prepared-recipient receipts likewise select v0.1.0 and are not claimed as v0.2.0 acquisition evidence.

Predecessor capture passed: release v0.1.0 ID 430364965, 8 assets; canonical SHA256 `079615f3ff8434b32c3c632190b544c6c32e17513fa125ec7e07f679a1c65f1f`; frozen documentation/schema/snapshot inventory SHA256 `51f6c5e87ce03c2986548d492d8c46fb5d610d905e24dbe3986219a53d82f3a2`. Direct anonymous hashes of all eight predecessor assets also passed before publication. Retained private receipt: `.local/s027-predecessor.json`. Post-publication API identities, frozen inventories and direct anonymous byte hashes of all eight predecessor assets later matched exactly.

## 2026-11-03: Final-main measured qualification

All terminal qualification clocks are below the 660-second target and 900-second hard limit. Preparation is separate and is not part of the qualification limit. The original receipts preserve readiness, terminal and finalization-reserve authority.

| Scope | Preparation (s) | Qualification (s) | Combined (s) |
| --- | ---: | ---: | ---: |
| repository | 46.040 | 16.587 | 62.627 |
| website | 101.196 | 72.395 | 173.591 |
| product-windows | 626.425 | 417.688 | 1044.113 |
| product-linux | 779.948 | 167.586 | 947.534 |
| product-macos | 1015.105 | 219.095 | 1234.200 |
| windows-packages | 1973.371 | 595.592 | 2568.963 |
| linux-packages | 1607.392 | 337.607 | 1944.999 |
| macos-packages | 1014.640 | 518.945 | 1533.585 |
| release-validation | 160.664 | 259.857 | 420.521 |

## Original qualification archives

| Artifact ID | Archive bytes | SHA256 |
| --- | ---: | --- |
| 13212051983 | 1100 | `ed5690bd6099fb2d13faca85c7e8efac7d09619c2b9bf35e0dd1b389cfb89d89` |
| 13211633843 | 2692545 | `37a6b80d8033ad5893c974b1d8536307e3ca0ac7c5f4b487dc35ade1ed031a2f` |
| 13212583903 | 41792848 | `61c3f4c7e85fdc19ae739113b87bcbed960fe4717a2e7f0e3c2cbfcce931ae26` |
| 13212039407 | 165525242 | `26ac8e100edf2ab08243de775a3fdfcd24987dd698e38d403ef550b3eb005390` |
| 13212189683 | 60866602 | `f51096122a8109284aa9315a2bf6d0c4d863a2bf076d63dd97d28034aaad7c9f` |
| 13214163700 | 3113069361 | `bd8e3ff7b96db88249a228d5b8435404feb09e6fd011fd80c299e7624a2c75bb` |
| 13214196339 | 2414906459 | `6ea027ef33c5a9d00aed5c90b3dfc53c50a029a6a5fcf62b9e2ea780b30a9e1e` |
| 13214080272 | 710107873 | `3d12ef1675a682ed9ed192a7fcf3b5e9d7d5ee4d4de7a26bf0a4dde507881e6b` |
| 13214274200 | 19340148 | `ace9d979dfccef456233f3f51fb858b5f9d80078e6681e93c01ff073340855f9` |
| 13212571088 | 4861906 | `8424ad15a0b89c3bd2f4e218d77b66301531f9853bf40aa6ac24308ca83bd101` |

## Accepted publication inventory

| Name | Bytes | SHA256 |
| --- | ---: | --- |
| local-media-gallery-0.2.0-full-aarch64-macos.pkg | 28036040 | `febe4e171d4a93de01a70a362360e80321fd4cc0e0999b49adb07024532b0d18` |
| local-media-gallery-0.2.0-full-x86_64-linux-runtime-sources.tar.xz | 1293157616 | `8123b5f5782ff7b851b2623a7b0f4f7ac6f4191da29f79bbd075dc95abcdaf44` |
| local-media-gallery-0.2.0-full-x86_64-linux.run | 252591583 | `cda98ecfbe76b695a3f9a3b5030c14bde72cf011034ea6d36fc8fa5b1d5f4f6f` |
| local-media-gallery-0.2.0-full-x86_64-windows.exe | 308380160 | `afb5ea8c1e8d27f06a2ae9ffddccef61b9f841dcf612228ef374c1e2bfc0ed0b` |
| local-media-gallery-0.2.0-lite-aarch64-macos | 19896728 | `4dd94165ba91c3d36cde27f970da06b96695d7b15e2ac0c46843c178838fe4be` |
| local-media-gallery-0.2.0-lite-x86_64-linux | 21645439 | `3e0060103110b19475ecec035df52e9095f78c7690652957907eedeee11febfa` |
| local-media-gallery-0.2.0-lite-x86_64-windows.exe | 24225095 | `f5d8780884e5d0180b07fcd64ae856472d62005d92d5550d2f7a11593b9e0b05` |

The actual publication and public readback below bind this inventory to canonical public URLs. Private replay receipt: `.local/s027-readback-7d714ed72348.json`. No product bytes were rebuilt during independent readback.

## 2026-11-03: Actual publication

Trusted-main [release run 41602586724](https://github.com/shruggietech/local-media-gallery/actions/runs/41602586724) attempt 1 passed both release and deploy-pages jobs. Published [v0.2.0](https://github.com/shruggietech/local-media-gallery/releases/tag/v0.2.0) at 2026-11-03T08:29:53Z, release ID 432433408, expected predecessor v0.1.0. The tag resolves to the approved source revision above; canonical/latest selection agrees. Accepted native packages and corresponding-source bytes were reused without rebuilding. Release notes contain short highlights ending with the master changelog link.

Canonical [release.json](https://github.com/shruggietech/local-media-gallery/releases/download/v0.2.0/release.json): 12128 bytes, SHA256 `9f95fbfce0b46fc946f38a2bad6f22fa8284451bccfb258e82d667603cfec039`. Anonymous downloads of all seven product/source assets match the accepted inventory exactly.

Release workflow accounting: preparation 294.499s, qualification 317.903s, combined 612.402s. Workflow started 2026-11-03T08:20:51Z; readiness 2026-11-03T08:25:45.499Z; terminal 2026-11-03T08:31:03.402Z. Producer clocks remain separate above; the qualification limit/reserve was preserved.

Both exact production exports were retained and independently replayed, including their source, manifests, complete inventories and projection hashes:

| Phase | Export files | Projection SHA256 |
| --- | ---: | --- |
| candidate | 635 | `edd2f3eb55367c44451bdddfa1f3b38f2a5ca09457635e3a15ac48ab8eef7802` |
| publication | 635 | `f279ada4027a63a57a90ba0fc1cdb770507bf16673aca9f9c798e93a945d020b` |

Original publication archives:

| Artifact ID | Name | Bytes | SHA256 |
| --- | --- | ---: | --- |
| 13214818520 | release-execution-41602586724-1 | 12540169 | `33bc71c889f9d61e3a0ca6830e9a6372125b3523e38e111e9229c56e36e207a2` |
| 13214574751 | verified-release-static-7d714ed723483d6bdb1a2286fb89fcbe8550cd40-1 | 6142893 | `f213448ddd84b3ae7ef6d8bf06f82e244db353f9a0017bdb61873f0c96da4842` |
| 13215003459 | verified-release-site-evidence-7d714ed723483d6bdb1a2286fb89fcbe8550cd40-1 | 26726 | `7375fb1d09892722b3c9a2b3c702f0e71d68966cd9703098e22ecb54857acbc4` |

## 2026-11-03: Public site and predecessor readback

At 2026-11-03T08:33:43.440Z, independent HTTPS readback of [localmedia.gallery](https://localmedia.gallery) matched all 635 files in the retained publication export. deployment.json binds renderer revision/source and published candidate 0a9e9d665f554b9534725a8de86f0b2799ee9b6b4e0b3cdc73294c79e25354a4. Live headless browsing verified latest v0.2.0, six actual package URLs, version roots v0.0.0/v0.1.0/v0.2.0, scoped glossary search, version switching and no page errors.

Predecessor comparison passed after publication: release ID, tag, canonical SHA256, asset IDs/sizes/digests, immutable source inventories and anonymous hashes of all eight v0.1.0 assets were unchanged. Rendered historical pages use the current renderer; preserved source snapshots are checked separately from the complete current deployment.

Private baseline receipts: `.local/s027-publication-readback.json`, `.local/s027-live-readback.json`, `.local/s027-predecessor-after.json` and `.local/s027-predecessor-bytes-before.json`/`after.json`. All report pass. No local native application or focus-taking test was run.

## Pre-push audit snapshot and remaining handoff

Actual publication, public assets, production gate exports, deployed site and predecessor preservation are verified. The audit PR records operations performed from already approved main; it does not publish its own candidate builds. CHANGELOG.md now records the actual publication date and chronological process history.

Post-publication prepared-recipient acceptance, exact-head audit PR CI, review dispositions, issue/M3/project closeout and owner handoff are post-push tasks T008/T010/T011. Their completion is recorded in the official PR closeout comment and GitHub tracking, preserving this pre-push snapshot and avoiding a record-only native rebuild. Final owner merge remains pending until explicitly performed by the owner.

## 2026-11-03: Post-publication site acceptance correction

Initial audit head `53346da0c0dcaec1ac959336a73bb6c3b3456c32` website CI failed on scripts/test-site.mjs:330: its current-documentation check required the exact retained v0.1.0 introductory sentence, while the canonical latest document is now v0.2.0 with different wording. Rendering and local integrity checks had passed. The assertion now requires the common canonical-release authority term and preserves the independent exact version/title and actual package-link checks. No product behavior, published assets or frozen documentation changes. Retain failed website artifact 13216360599, SHA256 `bb965e1416871d2e191d4d7130e0b2631af88587554d624a424b10f21100a015`. Re-run complete website acceptance and exact-head CI after this demonstrated test correction.

The corrected local acceptance passed `npm run check`, `npm test` (255 pass, 2 skip, 0 fail), `npm run check:docs`, `npm run build:site`, `npm run check:site` (96 HTML pages, 7194 local links/fragments, 96 exact raw sources, 637 audit-export hashes) and `npm run test:site` (all 10 rendered groups in 55.515s). This audit export differs from the 635-file published export because it renders the updated master changelog and audit source; it is not a replacement release.

## 2026-11-03: Windows evidence and post-publication preparation contract

At head 870cb89 attempt 1, product-windows failed on a missing portable font-size inheritance button and windows-packages returned Windows sharing error 32 during Lite rollback. Original ZIPs 13217671285 (SHA256 76d672825c9ffe1c994c2040813b82becc5d9a6899296f600296755ad2ad5b51) and 13219657806 (SHA256 53976ef884aa0173475aea4c90452e89329d592d8593149916f177826f8629a3) are retained. Six producer jobs passed.

The unchanged Windows-native retry passed the prior missing-control step and reached test-preparation.mjs, which still asserted the historical unversioned local-media-gallery.exe name. Canonical 0.2.0 direct delivery uses the declared versioned artifact name. The acceptance now derives the root launcher, binds preview to retained canonical release metadata and verifies actual acquired bytes/size/hash. Legacy archive naming and portable settings version 0.1.0 remain intentional compatibility checks. Related references in launch/runtime/package scripts were audited and distinguish controlled fixture names from actual canonical delivery. Native click now waits for the requested enabled rendered button within the existing 10-second helper budget, preserving one-click behavior and the existing React frame settlement. No local native run is elected; qualification remains isolated CI.

Local syntax checks for both affected native harnesses, repository checks, 255 Node tests (two platform-specific skips) and documentation checks pass. The native contract audit keeps deliberately renamed launch fixtures, canonical direct delivery and historical portable settings distinct. Native GUI acceptance remains an isolated CI requirement, not a local claim.

Internal Spec Kit research rechecked the canonical v0.2.0 record and remaining Windows acceptance scripts: only the guided recipient assumptions were stale. Portable settings version 0.1.0 and deliberately renamed local launch fixtures are existing contracts. Native click polling passes only its remaining 10-second budget to each driver request; the former 15-second request default and existing post-click React settlement remain unchanged for other calls.
