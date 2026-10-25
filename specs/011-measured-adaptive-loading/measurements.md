# S011 Native Measurements

## Unchanged baseline (2026-10-25)

Measured debug/native-test binary SHA256 1316bdda17deb24f1208231d124eacee3459defdbebd2362a68dc2ac19ec72e0, preserved qualified source da459c15f126e1156529c1b012818c9105522b269cb85afa5ebfdbba9983b78e, merged main a0b85881fdf6b9db080d67d70bd7b25bb4a5839a. Terminal 2026-10-25T13:27:06.441Z. Raw report: .local/s011-baseline-measurement.json. The initial preliminary report is retained separately as .local/s011-initial-baseline-measurement.json; this final baseline uses the corrected shared environment reader and actual lazy nested rendering.

Reference environment: Microsoft Windows 11 Pro, build 26300, X64; Intel(R) Core(TM) Ultra 9 285K, 24 logical processors; 102403461120 visible RAM bytes. Local NTFS volume, physical storage medium and power conditions unknown. Requested outer window1200x840; observed CSS viewport1184x801, devicePixelRatio 1. Shared WebView runtime version 155.0.4283.62.

Three independent fresh app/WebView profiles, with warm requested reopen and interactions in each process. Fixture already generated/read/hashed, OS cache unknown. Twelve media candidates (ten image candidates including TIFF/damaged JPEG, two synthetic H.264 clips), plus optional JSON; total logical fixture bytes 180553. Raw report records every file/hash, dimensions and media composition. Source inventory unchanged after the exercise.

| Operation (driver elapsed ms) | Baseline median / maximum | Final median / maximum |
| --- | ---: | ---: |
| startup | 730.217 / 767.262 | 692.018 / 734.243 |
| discovery | 158.301 / 159.268 | 165.556 / 169.918 |
| scroll | 547.961 / 549.545 | 549.437 / 550.119 |
| sortSizeDesc | 39.408 / 40.305 | 47.179 / 58.708 |
| filterImage | 22.330 / 27.862 | 28.749 / 31.548 |
| filterVideo | 28.884 / 29.559 | 23.095 / 32.724 |
| playback | 934.066 / 990.114 | 780.207 / 922.613 |
| seek | 75.119 / 76.162 | 75.848 / 76.991 |
| metadataIPC | 73.283 / 75.713 | 72.287 / 72.363 |
| metadataRender | 75.959 / 76.410 | 76.350 / 76.353 |

Three observations per operation per binary. Baseline harness preparation 0.435 s, observation 14.472 s, combined 14.907 s. Final preparation 0.441 s, observation 15.012 s, combined 15.452 s. These are separate from full qualification accounting.

Driver round trips, polling and native Play input are included; renderer sub-timings remain separately recorded. Three samples do not justify operation p95 values (null in both reports). Visible rAF gaps: baseline 177 samples, median 8.300 ms, p95 8.500 ms, maximum 8.500 ms; final 177 samples, median 8.300 ms, p95 8.400 ms, maximum 8.500 ms. These are callback gaps, not compositor FPS or presented frames.

All six memory endpoints per report are complete with no observer errors: native root1 and WebView6 before exercise/7 after, no other children. Before/after endpoints may miss peaks. Private bytes are committed private memory; summed working sets may double-count shared pages. Ranges across endpoints, MiB:

| Category | Baseline private / working set | Final private / working set |
| --- | --- | --- |
| Native | 9.25–10.41 / 42.51–43.34 | 9.05–10.29 / 42.33–43.41 |
| WebView descendants | 193.63–349.66 / 352.05–549.22 | 197.49–343.41 / 350.28–547.16 |

Footprints are logical bytes: development native-test executable baseline 21365248, final 21386240; shared installed WebView runtime 909827702; fixture-only FFmpeg 154390528. Three isolated WebView profiles baseline 30775756, final 30740390, both zero omitted entries at capture (runtime may still finalize temporary files). Product download/extracted distribution remain unavailable because unpublished; optional thumbnail tools/cache are not implemented. Do not combine these into product installation size.

Baseline native stream/sidecar occupancy is unavailable (no counter action). Final post-exercise snapshots report discovery0/1, metadata0/1, media responses0/32. Actual permit acquisition/body/drop lifetimes are tested separately; endpoints are not occupancy peaks. Scrolling sees at most8 attached gallery sources in both reports; focused view has1 media element and0 gallery sources. Preparation slots, attached sources and native permits remain separate from opaque browser hardware decoder/read counts.

Baseline-derived tuning rationale and normative values are retained in the hashed [research](research.md) and [loading contract](contracts/loading.md). This file records measurement receipts only.

## Final comparison

Accepted final source 893d4a98a2f25ef9ab7f14768cb1a62d4c151c28099cab1feee01f5a5ebcb322 (981 files), measured binary 2de9e02e7503154a1994771f4210bf222550b7dbb21eee7faf22dced71233716, terminal 2026-10-25T13:26:26.758Z. Raw final report is nested in .local/s011-final-qualified.json and retained as .local/measurement.json. The unchanged preserved baseline was remeasured with the identical final observer at 2026-10-25T13:27:06.441Z; the initial pre-implementation report remains preserved. Exact fixture records/hashes and all three browser/viewport conditions match.

These small-fixture observations show mixed timing variation, not a universal speedup. Automatic pressure reduction and healthy recovery are demonstrated by policy regressions and controlled held-decode Windows WebView tests, rather than inferred from a fast idle fixture. Linux/macOS native, large or slow/provider-backed corpora, OS-cold storage, field behavior and published installer footprint remain unverified. Normative tuning is in hashed research/contracts; this file contains receipts only.
