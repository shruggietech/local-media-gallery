# S015 Measurements

Package production has been observed and independently inspected. Installed application/runtime footprint and recipient acceptance remain pending actual isolated qualification. Unknown values are not zero. Target660s, hard900s, provisional finalization reserve15s apply after verified readiness. Terminal completion timestamps are authoritative.

| Local headless snapshot | Source | Preparation seconds | Qualification seconds | Combined seconds | Terminal UTC |
| --- | --- | --- | --- | --- | --- |
| Initial | cc84f69a | 123.072 | 103.591 | 226.663 | 2026-10-27T22:53:15.022Z |
| Dependency/native observer refinement | 5cb4ca3c | 48.345 | 98.085 | 146.430 | 2026-10-27T22:58:12.076Z |
| Locked installer inputs | cffbbb6b | 49.064 | 101.540 | 150.604 | 2026-10-27T23:01:52.796Z |
| Install-location and runtime-scope corrections | c5503048 | 52.821 | 104.594 | 157.415 | 2026-10-27T23:15:28.963Z |
| Explicit MSI generations and shared authoring | 3731840e | 49.783 | 102.949 | 152.732 | 2026-10-27T23:32:31.307Z |
| Machine common Programs directory and caching | da8852f6 | 49.280 | 101.951 | 151.231 | 2026-10-28T00:01:22.735Z |
| Native MSI property and expandable PATH | 0c1c078d | 48.046 | 97.525 | 145.571 | 2026-10-28T01:38:51.962Z |

Every snapshot passed all eleven gates within the qualification target. A subsequent isolated harness/evidence-only change has its own passing repository/93-test check and must obtain exact-source hosted qualification. These local native archive footprints are exploratory debug proofs; they do not stand in for pending release-profile installer/Lite candidates.

## Hosted package campaigns

Failed preparation has no accepted readiness and records zero qualification seconds. Failed recipient campaigns remain failures despite producer success.

| Run | Terminal result | Preparation seconds | Qualification seconds | Combined seconds | Terminal UTC |
| --- | --- | --- | --- | --- | --- |
| 40599537122 | Support DLL dependency audit failed before readiness | 838.430 | 0 | 838.430 | 2026-10-27T23:18:49.829Z |
| 40602943972 | Machine shortcut MSI validation failed before readiness | 924.506 | 0 | 924.506 | 2026-10-27T23:50:24.854Z |
| 40606258001 | Machine entrypoint manifest link failed before readiness | 604.149 | 0 | 604.149 | 2026-10-28T00:13:38.727Z |
| 40608273613 | Recipient setup outer timeout | 627.687 | 192.861 | 820.548 | 2026-10-28T00:35:46.808Z |
| 40609740100 | Recipient setup outer timeout | 573.504 | 191.399 | 764.903 | 2026-10-28T00:49:41.992Z |
| 40611001068 | Unicode shortcut read-back after 15 recipient passes | 596.894 | 146.018 | 742.912 | 2026-10-28T01:02:53.574Z |
| 40612853094 | Combined PowerShell terminal execution probe failure | 567.687 | 88.393 | 656.080 | 2026-10-28T01:21:02.075Z |

The independently inspected producer from run 40608273613 (source e2409206, tested merge 9fc44896) has Full bundle download bytes 14,192,042 and Lite archive bytes 8,025,614. Both scope-specific MSIs contain 1,199 exact owned files. These observations do not certify installation. Installed/runtime bytes remain unknown until successful recipient qualification; they are not zero.

## Accepted hosted campaign

Run40618654876, tested mergec982516696829244d2ec79e17d54c10a4470d2b4, accepted source80f772b0912597303a2a42129070549d005e01d8d5e6469f532e429da359f4cf. Every scope passed and retained separate terminal accounting.

| Scope | Preparation seconds | Qualification seconds | Combined seconds | Terminal UTC |
| --- | ---: | ---: | ---: | --- |
| product-linux | 986.445 | 158.617 | 1145.062 | 2026-10-28T02:23:43.062Z |
| product-macos | 187.321 | 135.065 | 322.386 | 2026-10-28T02:09:57.386Z |
| product-windows | 267.463 | 387.369 | 654.832 | 2026-10-28T02:15:40.914Z |
| repository | 23.471 | 2.659 | 26.13 | 2026-10-28T02:05:01.130Z |
| website | 71.615 | 58.696 | 130.311 | 2026-10-28T02:06:43.311Z |
| windows-packages | 639.772 | 226.855 | 866.627 | 2026-10-28T02:19:10.035Z |

| Candidate | Download bytes | Extracted bytes | Installed application bytes |
| --- | ---: | ---: | ---: |
| Full | 14,197,234 | 24,572,700 | 21,268,522 in either scope |
| Lite | 8,025,621 | 21,268,010 | Not installed (portable) |

Shared native-verified machine Evergreen156.0.4314.50 directory:913,092,495 logical bytes, separate from application files. This is not marginal download or allocated-disk evidence. No optional tool payload is bundled; its measurement is null with that reason. All five package windows and six independent decoded frames passed. Footprints remain candidate/host observations and do not imply universal client or clean-runtime qualification.
