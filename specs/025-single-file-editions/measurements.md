# S025 measurements

Native acceptance source: 1c9584e5e55636068f329950f59a5a937ebf2639. [Complete CI run](https://github.com/shruggietech/local-media-gallery/actions/runs/41487501722). Independent original Actions archive/source/native/static-site readback passed; complete local receipt is retained as .local/s025-readback-1c9584e5e556.json.

Preparation, qualification and combined durations use the retained terminal timestamps. Qualification target is 660 seconds (advisory), hard limit is 900 seconds, and the 15-second finalization reserve remains required. All elected checks passed.

| Scope | Preparation seconds | Qualification seconds | Combined seconds | Result |
| --- | ---: | ---: | ---: | --- |
| repository | 26.723 | 13.790 | 40.513 | pass |
| website | 86.270 | 72.688 | 158.958 | pass |
| product-windows | 341.895 | 468.924 | 810.819 | pass |
| product-linux | 1160.914 | 255.236 | 1416.150 | pass |
| product-macos | 757.450 | 209.058 | 966.508 | pass |
| windows-packages | 760.141 | 469.142 | 1229.283 | pass |
| linux-packages | 1254.199 | 287.816 | 1542.015 | pass |
| macos-packages | 638.724 | 639.092 | 1277.816 | pass |
| release-validation | 1224.601 | 239.217 | 1463.818 | pass |

| Platform | Edition | Product | Bytes | SHA256 |
| --- | --- | --- | ---: | --- |
| windows | lite | local-media-gallery-0.2.0-lite-x86_64-windows.exe | 24225095 | 11e1ed91bf186672512e1d819bea54908626acb305da36adc1ffc0883795adb2 |
| windows | full | local-media-gallery-0.2.0-full-x86_64-windows.exe | 308380160 | 232a9b5fd9deb2b6cea56732b40e65d6f35077b6cf8510acfe09474ab670e114 |
| macos | full | local-media-gallery-0.2.0-full-aarch64-macos.pkg | 28036012 | 99d3fa5ab08ac57d2449e651a5916d280a26b2671ec20c80c0e2eb0c6b3b5574 |
| macos | lite | local-media-gallery-0.2.0-lite-aarch64-macos | 19896728 | 2ac7ef5ea1ff3d0f2730da76103ac54859a62903e32be6dea811768f8929274c |
| linux | lite | local-media-gallery-0.2.0-lite-x86_64-linux | 21645439 | 223fe6fcf7195254fc1da7db5c870188961ed7feae1aa439327bb0265414650a |
| linux | full | local-media-gallery-0.2.0-full-x86_64-linux.run | 252589271 | b033f476e49b08fa44e2a7216e35a517fe18f13121b9e618a5ee85e7ca3564c1 |

The separate corresponding-runtime-source asset is not a third product choice. These are accepted unreleased 0.2.0 candidate bytes, not a published product release. The owner controls final merge; no tag or release was created.
