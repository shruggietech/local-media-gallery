# S012 Measurement and Proof Receipts

## Preliminary Windows integration (2026-10-25)

Preserved .local/s012-preliminary-proof.json and .local/s012-preliminary-launch.json. Both normal archives passed10extracted CLI/integrity checks under empty PATH;6actual Windows native-test launch groups passed. Debug normal binary logical bytes18,669,568 per edition, proof archive7,921,405Full/7,921,013Lite, extracted payload22,886,133Full/22,886,138Lite. Shared WebView2 version-directory909,827,702logical bytes, explicitly non-marginal and excluding system libraries. No embedded Authenticode certificate table; final installer/optional tool sizes unavailable/not applicable. These are preliminary method/integration receipts on the then-current source, not final S012 qualification or clean-machine/install evidence. Final source/binary/hosted receipts follow after qualification.

## Accepted final local proof

Source d7b7b19a787e8b008af321c52591189bfb7dcdd6a6c5aa212ef56c56f1b64dac, 1000files. Preparation38.242s,qualification203.859s,combined242.101s. Native Windows host; normal debug artifacts, not final installer sizes. Each archive passed10empty-PATH finite/integrity checks after exact extraction/relocation; both normal ordinary windows passed listener/private-hook exclusion.

| Edition | Executable bytes | Archive bytes | Extracted bytes | Binary SHA256 | Archive SHA256 |
| --- | --- | --- | --- | --- | --- |
| full | 18669056 | 7920057 | 22885797 | fc8af6a430a7aea933042c6054c190c977809f0fd47a34e21c631489be30916a | 7c291ffec42ad28bdeef660f99e6473030b52670d3aedab4eeee7c9bc8f07ffc |
| lite | 18669056 | 7921489 | 22885802 | 60e3b829ad7bd612693860c49b523f50465cf2ae78f0da0d6c8bedc1ad6e6ce7 | 52a79b621e995b9085888f954e7e673e009673dddb64853da3e96f68a1d04a2f |

Shared runtime observation: {"basis":"native version probe; GUI initialization not certified","bytes":null,"provider":"WebView2","status":"available","version":"155.0.4283.62"}. Footprint: {"status":"measured","bytes":"909827702","basis":"Logical installed WebView2 version-directory bytes; shared, excludes Windows system libraries, not marginal download"}. No embedded Authenticode certificate table observed; PE imports captured in the receipt. Final installer unavailable and optional tools not applicable. Preserve earlier preliminary/failed receipts separately.
