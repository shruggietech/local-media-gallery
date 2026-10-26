# S012 Measurement and Proof Receipts

## Preliminary Windows integration (2026-10-25)

Preserved .local/s012-preliminary-proof.json and .local/s012-preliminary-launch.json. Both normal archives passed 10 extracted CLI/integrity checks under empty PATH; 6 actual  Windows native-test launch groups passed. Debug normal binary logical bytes 18,669,568 per edition, proof archive 7,921,405 Full / 7,921,013 Lite, extracted payload 22,886,133 Full / 22,886,138Lite. Shared WebView2 version-directory909,827,702 logical bytes, explicitly non-marginal and excluding system libraries. No embedded Authenticode certificate table; final installer/optional tool sizes unavailable/not applicable. These are preliminary method/integration receipts on the then-current source, not final S012 qualification or clean-machine/install evidence. Final source/binary/hosted receipts follow after qualification.

## Initial accepted local proof before hosted corrections

Source d7b7b19a787e8b008af321c52591189bfb7dcdd6a6c5aa212ef56c56f1b64dac, 1,000 files. Preparation 38.242 s, qualification 203.859 s, combined 242.101 s. Native Windows host; normal debug artifacts, not final installer sizes. Each archive passed 10 empty-PATH finite/integrity checks after exact extraction/relocation; both normal ordinary windows passed listener/private-hook exclusion.

| Edition | Executable bytes | Archive bytes | Extracted bytes | Binary SHA256 | Archive SHA256 |
| --- | --- | --- | --- | --- | --- |
| full | 18669056 | 7920057 | 22885797 | fc8af6a430a7aea933042c6054c190c977809f0fd47a34e21c631489be30916a | 7c291ffec42ad28bdeef660f99e6473030b52670d3aedab4eeee7c9bc8f07ffc |
| lite | 18669056 | 7921489 | 22885802 | 60e3b829ad7bd612693860c49b523f50465cf2ae78f0da0d6c8bedc1ad6e6ce7 | 52a79b621e995b9085888f954e7e673e009673dddb64853da3e96f68a1d04a2f |

Shared runtime observation: {"basis":"native version probe; GUI initialization not certified","bytes":null,"provider":"WebView2","status":"available","version":"155.0.4283.62"}. Footprint: {"status":"measured","bytes":"909827702","basis":"Logical installed WebView2 version-directory bytes; shared, excludes Windows system libraries, not marginal download"}. No embedded Authenticode certificate table observed; PE imports captured in the receipt. Final installer unavailable and optional tools not applicable. Preserve earlier preliminary/failed receipts separately.

## Accepted corrected local proof

Source 1831abfb52c71eba111f26d2d9a58366143c71b15e3ea6821ecba53311da73d6 (1002 files). Preparation 42.789 s; qualification 213.719 s; combined 256.508 s. All local checks pass, including corrected filesystem fixtures and strict comparison-pixel equivalence.

| Edition | Executable bytes | Archive bytes | Extracted bytes | Binary SHA256 | Archive SHA256 |
| --- | --- | --- | --- | --- | --- |
| full | 18669056 | 7920473 | 22885797 | 0eb08a8cd994d794e76bd2228547d789a4fa86fb5e8a819b3b977e8cc37ed1f4 | 62f57881ccf6189358a1fdab029c440d2ddfb32a08c0e8c1fa694109a1bdf35a |
| lite | 18669056 | 7921374 | 22885802 | 5524e1df3b276795b2104dca4f526eee41a1b9ec1b70f5e400fcbf8beb0c82cb | a43a87924f83af5c48b9e4c41663aa4a6eeb8b0a078c956e96793676960e0d93 |

Runtime remains separately observed shared WebView2, 909827702 logical bytes; not a marginal download or complete system-library inventory. No final installers or optional media tools.
