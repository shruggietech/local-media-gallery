# S016 measurements

## First package campaign (diagnostic predecessor)

Run40650965407, tested merge a219f2815e5e0e4f9e4d78c326ba47cd38c74f2b, source72675b55aadcd7404a2b6dc921755319088406bf11ad522db9c87381ca83a9bd. Preparation565.350s, qualification67.540s, combined632.890s. Subsequent corrected source still requires final receipts.

| Candidate | Download logical bytes | Extracted container logical bytes | Signed app logical bytes |
| --- | ---: | ---: | ---: |
| Full DMG | 9306181 | 19299922 | 17991596 |
| Lite ZIP | 8129415 | 18287015 | 18008129 |

Shared OS WKWebView attributable marginal bytes unavailable (null with reason); no optional tools bundled. Ad-hoc signatures verify native integrity. Candidate quarantine attribute applied; spctl assessment returns3/rejected. Functional native launch was separate and unquarantined, not a Developer ID/notarization or actual-translocation claim. Independent HFS/ZIP/file/pixel readback passes.

Final accepted source/artifact and per-scope timing remain pending.

## Accepted final campaign

Head6595873a6930ef42f0b9deb72d152fed0d459945; tested merge45cda2456e90be8691d80e08ee6f4ba5c19bfbe4; source0d2a026cbd0156db76e37659f26188ade97cfb0241869eba443d9e7646386bea. Run40654622171 attempt2 retains six successful scopes and replaces only the failed Mac package attempt.

| Scope | Preparation seconds | Qualification seconds | Combined seconds | Terminal UTC |
| --- | ---: | ---: | ---: | --- |
| product-linux | 274.174 | 93.197 | 367.371 | 2026-10-28T08:30:13.371Z |
| product-macos | 216.884 | 147.031 | 363.915 | 2026-10-28T08:30:11.915Z |
| product-windows | 267.861 | 402.479 | 670.340 | 2026-10-28T08:35:24.496Z |
| repository | 29.295 | 3.239 | 32.534 | 2026-10-28T08:24:36.534Z |
| website | 52.816 | 50.074 | 102.890 | 2026-10-28T08:25:46.890Z |
| windows-packages | 610.629 | 236.373 | 847.002 | 2026-10-28T08:38:20.414Z |
| macos-packages | 334.646 | 51.442 | 386.088 | 2026-10-28T08:46:28.088Z |

All qualification durations satisfy the660second target and900second hard limit;15second provisional finalization reserve remains enforced. Preparation and runner post-processing are not qualification.

| Final macOS candidate | Download logical bytes | Extracted container logical bytes | Signed application logical bytes |
| --- | ---: | ---: | ---: |
| Full DMG | 9308973 | 19299970 | 17991596 |
| Lite ZIP | 8129274 | 18287015 | 18008129 |

Shared OS WKWebView attributable marginal bytes remain null with reason; no optional payload. Actual ad-hoc native signature integrity passes; marked-candidate spctl assessment rejects, while functional launch is separately unquarantined. Native screenshot independent Pillow counts exceed500000known red/green pixels in elected frames; complete hashes and inventories pass. First-attempt AX discovery failure is preserved as a diagnostic observation, without a root-cause claim or assertion reduction.
