# S017 qualification measurements

Implementation head `e52cf5d1de4886643e200e73b92db1b7ea248248`, tested merge `2f8a728753017e8e128c698d11b8c5450e631d98`, [run 40882201840](https://github.com/shruggietech/local-media-gallery/actions/runs/40882201840).

Exact source digest: `5e03ec9659f6b56240437ac4c6e59ff5d3f5afe888dbb61aeaa8f5afc0fa1060`, 1269 files. Records are ordered by terminal completion time. Durations are seconds per parallel scope; adding them does not measure workflow wall time. Preparation includes workflow dependency readiness. Terminal receipt timestamps are authoritative.

| Scope | Preparation | Qualification | Combined | Terminal UTC |
| --- | ---: | ---: | ---: | --- |
| repository | 27.506 | 3.671 | 31.177 | 2026-10-29T13:29:26.177Z |
| website | 71.218 | 60.878 | 132.096 | 2026-10-29T13:31:08.096Z |
| product-macos | 183.935 | 96.459 | 280.394 | 2026-10-29T13:33:36.394Z |
| macos-packages | 449.341 | 60.910 | 510.251 | 2026-10-29T13:37:30.251Z |
| product-linux | 468.901 | 93.177 | 562.078 | 2026-10-29T13:38:18.078Z |
| product-windows | 252.885 | 379.488 | 632.373 | 2026-10-29T13:39:37.192Z |
| windows-packages | 621.441 | 242.596 | 864.037 | 2026-10-29T13:43:27.475Z |

Every qualification is below the 660-second advisory target and 900-second hard limit. The existing controller retains its 15-second provisional finalization reserve. These figures are distinct from the initial failed campaign and from local source checks.

## Independent readback

All seven source-bound receipts and six native Full/Lite binary hashes passed independent readback. Each native corpus retains actual changing frames and advancing clocks, tone/silent observations, trusted input and accessibility evidence. Linux captures 16,384 PCM samples per fixture from the selected app stream or the verified input-free silent-control sink. Audible RMS ranges from 0.08818 to 0.08830 at approximately 439.45 Hz; silent controls are measured zero. Physical speakers are not qualified.

Package archive digests, ZIP CRCs and complete Windows Full/Lite and macOS Lite ZIP inventories/modes passed local independent readback. Both MSI archive hashes match the bundle records. Hosted package campaigns passed 26 Windows cases and eight macOS cases, including ordinary native frame/payload/signature readback. This local audit verifies the DMG archive digest; native mounting/interior readback remains the separately identified hosted observation.

The initial macOS native failure remains retained as failed evidence. Its corrected structural interpretation and successful final native rerun are distinct observations. All interactive tests ran on isolated hosted desktops.
