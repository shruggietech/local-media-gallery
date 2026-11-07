# Measurements: ordinary Windows MSI upgrade repair

## 2026-11-06: planning

No new runtime acceptance or qualification timing is claimed. Retain preparation, readiness, terminal and combined accounting from original scoped observations. Baseline diagnostic collection is not product acceptance; failed observations remain diagnostic history.

## 2026-11-06: diagnostic and first candidate observations

| Observation | Preparation seconds | Qualification seconds | Combined seconds | Result |
| --- | ---: | ---: | ---: | --- |
| Published pair terminal diagnostic 42233181775 | Not a qualification run | Not a qualification run | 43.030 collection | Exact reported error 267, native exit 1603, predecessor retained |
| Experience worker 42233072194 / 8d2722d | 1102.491 | 596.729 | 1699.220 | Pass; ordinary cancel/refusal/upgrade exits 1602/1603/0 |
| Windows product 42233072194 / 8d2722d | 560.291 | 0 | 560.291 | Preparation failed at ABI-declaration lint; no runtime acceptance |

Experience readiness was 2026-11-06T14:39:17.000Z; terminal completion was 2026-11-06T14:49:13.729Z. Worker timing does not grant combined Windows acceptance. Full PR qualification, final-head actor/byte readback and review closeout remain pending.

## 2026-11-06: complete Windows candidate gate

Revision d1db5c12ce8e3ef2d17f4dd5ffcab9804ae9ec92, run 42251687143, source caa686c4eb6cf149eb4ae91f5189efda2e24b5fbcdfbd16fa1fe5ddd52e07050. These are completed scoped results; macOS and aggregate release validation remain pending.

| Scope | Preparation seconds | Qualification seconds | Combined seconds | Result |
| --- | ---: | ---: | ---: | --- |
| repository | 24.086 | 17.171 | 41.257 | Pass |
| website | 106.825 | 91.587 | 198.412 | Pass |
| product-linux | 688.618 | 135.010 | 823.628 | Pass |
| product-windows | 454.152 | 492.711 | 946.863 | Pass |
| linux-packages | 1236.266 | 340.403 | 1576.669 | Pass |
| windows-packages | 1623.649 | 698.791 | 2322.440 | Pass |
| Windows lifecycle worker | 1623.649 | 430.558 | 2054.207 | Pass |
| Windows experience worker | 1623.649 | 677.510 | 2301.159 | Pass; target advisory |

The shared Windows clock begins qualification at 2026-11-06T16:49:22.000Z. The complete gate ends at 2026-11-06T17:01:00.791Z. Qualification exceeds the 660-second advisory target by 38.791 seconds, remains within the 900-second hard limit and retains the fifteen-second provisional reserve. Preparation is reported separately and is not charged as product qualification. Queue time is not a passing result.

## 2026-11-06: completed cross-platform and aggregate qualification

All remaining scopes are terminal-successful for run 42251687143 at d1db5c12ce8e3ef2d17f4dd5ffcab9804ae9ec92. Independent canonical receipt readback passed.

| Scope | Preparation seconds | Qualification seconds | Combined seconds | Terminal timestamp (UTC) |
| --- | ---: | ---: | ---: | --- |
| product-macos | 689.931 | 218.708 | 908.639 | 2026-11-06T17:23:14.639Z |
| macos-packages | 938.174 | 549.700 | 1487.874 | 2026-11-06T17:34:23.874Z |
| release-validation | 165.404 | 242.165 | 407.569 | 2026-11-06T17:43:34.569Z |

The subsequent records-only PR head requires its own terminal complete CI before final handoff. Its live checks and readback are linked from PR #103; this earlier source qualification is not relabeled as that later revision.
