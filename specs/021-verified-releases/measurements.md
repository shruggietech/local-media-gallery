# Measurements: Verified releases

## 2026-10-31 local qualification

Logical source SHA-256: 2ab476cb2a368ebea1b69eebfe2a9c85e8fc5b6c085d2358738983a507e8990a. This is a local uncommitted-source qualification, distinct from hosted branch-head acceptance. Native GUI/input and installer operation remain on isolated hosted runners.

| Scope | Preparation seconds | Qualification seconds | Combined seconds | Result |
| --- | ---: | ---: | ---: | --- |
| Repository, tests, docs, application, site and baseline browser | 12.195 | 72.087 | 84.282 | pass |

Target660 seconds, hard limit900 seconds, provisional finalization reserve15 seconds. Terminal timestamps are authoritative. Prerequisites and the site build precede readiness; elected checks follow readiness. A browser callback regression was corrected before this passing qualification. An independent local launcher PATH-case error failed preparation without starting qualification, then was corrected.

The private publication campaign separately exercises complete controlled future documentation snapshots and both actual renderer/browser gates; it is fixture evidence and does not claim a real release. Hosted scope timings and exact-source native/package assembly readback will be recorded after CI terminal completion.
