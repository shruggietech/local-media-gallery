# S017 verification

## Delivered scope

Spec Kit feature `017-dependency-closure`, branch `codex/s017-dependency-closure`, [PR #66](https://github.com/shruggietech/local-media-gallery/pull/66), issues #64, #57 and #58.

- Owned driver readiness now verifies a child-only nonce/PID/port, rejects unrelated listeners and retains bounded stdout/stderr, lifetime, listener and trial/source/edition diagnostics. Historical uninstrumented measurement baselines use the actual Windows TCP listener owner through the existing persistent observer, under the same deadline.
- Linux native qualification observes finite actual application-output PCM through the isolated PulseAudio monitor without modifying the media-element graph. Trusted input, advancing clocks, changing decoded/seek frames and tone/silent thresholds remain mandatory. Failure observations are retained before subsequent checks can fail.
- Formal BrandBuilder 3.1.1 and its separately published canonical Windows proof inventory support patched Pillow 13.0.0. The exact recovered verifier, kit bytes, manifests and pixel comparisons are preserved.
- The GTK3 GLib 0.18.5 family uses only the exact upstream mutable-output-pointer correction, with complete offline source provenance and a mandatory optimized Linux iterator regression.

## Local headless checks

Node 24.11.0, Python 3.12 and Rust 1.96 on Windows, using hidden noninteractive launchers. No local native GUI, focus, keyboard or screen-reader acceptance was run.

`npm run check`, `npm test`, `check:docs`, `check:app`, native-test-feature Clippy and full site build/link/rendered checks passed. The final local suite contains 110 passing Node tests, including real early exit, listener collision/unavailability, legacy baseline compatibility, actual Windows listener-PID attribution, PCM corruption/absence/ownership, canonical proof tampering, vendor changed/missing/extra bytes, stopped clocks, unchanged frames and contradictory success receipts.

The exact recovered verifier with Pillow 13 passed 36 checks with zero problems and zero skipped inputs; the glyph validator passed all 15 checks. Every one of the 128 comparison images is recomputed and checked for exact mode, dimensions and pixels while retaining its pinned encoding. Site checks passed 42 HTML pages, 2,887 local links/fragments, 31 exact raw sources and ten rendered groups. The UTF-8/LF, mojibake, local-link and version checks passed.

Local headless source checks are distinct from complete hosted native qualification and its accounting.

## Hosted campaigns

### Initial campaign

Head `7159178fd75a7f37511f331c7dd844c0298042f7`, tested merge `dad67470f64f2977c1f7c8cdab3168376fbf007f`, source `58ba0bb6416c0132979108ef06ce488f4a21d8e314658e28a39e07d0bbe928c6` (1,271 files), [run 40878652038](https://github.com/shruggietech/local-media-gallery/actions/runs/40878652038).

Six mandatory scopes passed. Native macOS failed final receipt validation because the new validator required numeric hashes while the existing VP9 snapshot uses SHA-256. Actual advancing video and tone/silent PCM observations remain in artifact 12899259141. The correction accepts only the actual numeric-canvas or exact native-snapshot hash forms and still rejects unchanged frames and stopped clocks. Every terminal exception now sets a fail result; contradictory pass/failure receipts are rejected.

The original failed receipt and campaign are retained. Diagnostic structural revalidation of those observations is separate from the successful native rerun below. The pending baseline-correction run 40880272970 was superseded before execution by the corrected source.

### Qualified implementation

Head `e52cf5d1de4886643e200e73b92db1b7ea248248`, tested merge `2f8a728753017e8e128c698d11b8c5450e631d98`, source `5e03ec9659f6b56240437ac4c6e59ff5d3f5afe888dbb61aeaa8f5afc0fa1060` (1,269 files), [run 40882201840](https://github.com/shruggietech/local-media-gallery/actions/runs/40882201840).

All seven mandatory scopes passed: repository, website, product-windows, native-proof product-linux, native-proof product-macos, windows-packages and macos-packages. PR deployment was skipped as intended. The Linux scope passed the real optimized GLib iterator regression. Windows passed the hosted baseline-listener regression, three measurement trials and all existing native browsing/preparation/launch/ordinary-build gates.

Independent readback verified all seven source-bound receipts, six native Full/Lite binary hashes, actual frame/clock/PCM observations and screenshot hashes. Linux captured 16,384 samples per fixture, audible RMS approximately 0.0882 at 439.45 Hz, and measured zero for silent controls. Package archive digests and complete Windows Full/Lite and macOS Lite ZIP CRC/inventory/mode checks passed, including both MSI archive identities. Hosted package campaigns passed 26 Windows and eight macOS cases. Local DMG verification covers its archive digest; native mount/interior/signature/frame readback remains the separately identified hosted observation.

See [measurements](measurements.md) for chronological terminal timestamps and separate preparation/qualification/combined accounting. Maximum qualification was 379.488 seconds, below the 660-second target and 900-second hard limit. The existing 15-second provisional finalization reserve remains enforced.

The first receipt-only commit records the initial qualified implementation. The explicit established exclusions cover this feature's tasks, verification and measurements; specification, plan, research, code, manifests and governed inventories remain included. Source identity was checked unchanged across that first receipt closeout; the later license-catalog correction has a new identity. The actual final PR commit still receives its own terminal CI, with the final live check receipt linked from the PR.

## External reviews

No more than two review rounds were requested.

| UTC | Round | Outcome |
| --- | --- | --- |
| 2026-10-29 13:06:43 | Initial code | One baseline compatibility finding |
| 2026-10-29 13:11:58 | Initial security | Completed; no additional comments posted |
| 2026-10-29 13:15:32 | Initial finding response | Fixed in 2a66bc6, replied with regression evidence, thread resolved |
| 2026-10-29 13:37:07 | Final code | Completed on e52cf5d with no findings |
| 2026-10-29 13:49:27 | Final security | Completed on e52cf5d; no additional comments posted |

All review threads are resolved. No further review request is authorized by this slice's cap.

## Dependency provenance

- Formal kit `localmedia-gallery-brand-1.0.0-bb3.1.1.zip`: SHA-256 `8dccfe8af1ccada6d683af5d3208bdcc4423e8efc0539f86d0233bfe21531095`, upstream source `65af667461798738b0cf381b7c8bc4487afd853a`. Exact delivered recovery SHA-256: `4bf6d5a1b02a59c08c37ba6b2fc8967b1f30b23d49cf049f505219f56800fde4`.
- Canonical [upstream run 40775877208](https://github.com/shruggietech/shruggie-brand/actions/runs/40775877208), job 123124909345, artifact 12855331534: archive SHA-256 `bbd3b90493b311c1ed5b5a6357fe03f371505cc7d307800961f255e6b10085e9`. Only 33 exact source-matched report/proof files, 133,675 bytes, were retained through the importer outside the immutable kit.
- GLib 0.18.5 crate: archive SHA-256 `233daaf6e83ae6a12a52055f568f9d7cf4671dabb78ff9560ab6da230ce00ee5`, upstream fix `b5a4071e439bef2b5eea76c3aa25e5ae84839e34`, corrected iterator SHA-256 `a0f5ee8acb8faa089bcdfbc9a57372609fce7654026ccef7d9a224d05a654ccc`. All other archive bytes and licenses are preserved; the truthful version remains 0.18.5.

## Convergence and handoff

The final assessment covers ten functional requirements, five success criteria, ten acceptance scenarios, five primary plan decisions plus two operational decisions, and five constitutional principles. No missing, partial, contradictory or unrequested implementation remains; no convergence tasks were appended. All 22 implementation, review-correction and artifact-inventory tasks are complete.

Owner final review and squash merge remain the publication boundary. Default-branch advisory closure requires post-merge scanner readback; a truthful GLib backport may remain a version-only finding. No advisory dismissal, product release or signing promotion is claimed. Physical speakers, additional platform baselines and historical baseline GUI measurements were not newly qualified by this slice.

## Recipient inventory follow-through

Artifact convergence found that the existing license selector treated every null Cargo source as owned code, omitting the newly vendored GLib catalog entry. The selector now uses actual workspace membership, with a regression for registered, vendored and owned packages. This correction preserves recipient LICENSE/COPYRIGHT inventory entries; it does not alter the governed kit or patched crate bytes. Final qualification and artifact readback bind this correction to its own source revision. The review cap remains two rounds; no additional review was requested.

On the receipt closeout head ff4b939, the Windows package preparation failed a 30-second rustc --version probe after release compilation. Its failed artifact12903501718 and log are retained, and one targeted same-head retry was requested. No packaging qualification ran in the failed attempt, and no assertion was changed.

### Qualified license catalog

The targeted unchanged-head ff4b939 Windows packaging retry passed, preserving the other six passing scopes. The subsequent license correction cf32eb99d76fd4049a2eb2cbd90571e0c0d374dc has source `4861353d4da5f8b601a557fdb33eaa4d7edf3250dc138b27467dbb3f2b0bae8c` (1,269 files), tested merge `e63e8ee54ab3e32309c7852e67d498157dd329b4`, [run 40891827017](https://github.com/shruggietech/local-media-gallery/actions/runs/40891827017). Its hosted Linux qualification passed. Independent readback verified both complete Full/Lite proof archives, every inventory hash, and exact normalized upstream `rust/glib-0.18.5/LICENSE` and `COPYRIGHT` bytes in both actual recipient catalogs. Windows and macOS correctly omit this Linux-only dependency. Local source/docs checks and all 110 tests passed.

Convergence rechecked ten FRs, five buildable success criteria, ten acceptance scenarios, eight plan/operational decisions and five constitutional principles. No further buildable gaps were found; no empty convergence phase was appended. The final metadata commit changes only excluded task/verification records and preserves this qualified source identity. Its own terminal complete CI and final artifact readback are linked from the live PR handoff, which is the final merge-readiness receipt.
