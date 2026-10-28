# S015 Measurements

Candidate package, installed/runtime footprint and preparation/qualification/combined measurements are pending actual production and isolated qualification. Unknown values are not zero. Target660s, hard900s, provisional finalization reserve15s apply after verified readiness. Terminal completion timestamps are authoritative.

| Local headless snapshot | Source | Preparation seconds | Qualification seconds | Combined seconds | Terminal UTC |
| --- | --- | --- | --- | --- | --- |
| Initial | cc84f69a | 123.072 | 103.591 | 226.663 | 2026-10-27T22:53:15.022Z |
| Dependency/native observer refinement | 5cb4ca3c | 48.345 | 98.085 | 146.430 | 2026-10-27T22:58:12.076Z |
| Locked installer inputs | cffbbb6b | 49.064 | 101.540 | 150.604 | 2026-10-27T23:01:52.796Z |
| Install-location and runtime-scope corrections | c5503048 | 52.821 | 104.594 | 157.415 | 2026-10-27T23:15:28.963Z |
| Explicit MSI generations and shared authoring | 3731840e | 49.783 | 102.949 | 152.732 | 2026-10-27T23:32:31.307Z |
| Machine common Programs directory and caching | da8852f6 | 49.280 | 101.951 | 151.231 | 2026-10-28T00:01:22.735Z |

Every snapshot passed all eleven gates within the qualification target. A subsequent isolated harness/evidence-only change has its own passing repository/93-test check and must obtain exact-source hosted qualification. These local native archive footprints are exploratory debug proofs; they do not stand in for pending release-profile installer/Lite candidates.
