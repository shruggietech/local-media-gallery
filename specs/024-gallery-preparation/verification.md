# S024 verification

## Local qualification

Qualified revision: 3e192c7b8758c3bbc1b524f4b7d1e6ec5ab7151b. Logical source: eb20b052384cdba4592e87aabf185e11f5d0f722a539fbd5d2fd7fbe60b60a1d (1488 files; evidence exclusions are defined in scripts/provenance.mjs).

All required local checks passed: npm run check, npm test, npm run check:docs, npm run check:app, Full/Lite native shell and guided coordinator units, npm run check:site and npm run test:site. The affected website built during prerequisite preparation. Node regressions include the expected-state Windows startup case; Rust coverage includes seven recipient-acquisition cases, guided option/cancellation/stale-state cases and idle thumbnail root release.

Preparation: 20.554s. Qualification: 94.126s. Combined: 114.68s. Readiness: 2026-11-02T01:20:53.493Z. Terminal completion: 2026-11-02T01:22:27.619Z. Target 660s, hard 900s and 15s reserve were preserved; the target was met.

The first preparation attempt stopped on a Clippy expression before qualification began (24.376s preparation,0s qualification). Its receipt/log remain in ignored local evidence. The corrected native checks and full local qualification passed.

## Actual published acquisition

The native implementation downloaded, verified and extracted the real canonical v0.1.0 Lite archives for Windows x86_64, Linux x86_64 and macOS aarch64. Complete archive and canonical inventory identities matched. Repeated acquisition classified every retained output as reuse. Retained logical bytes including complete packages, original archives, records and root launch copies: Windows 48,957,243; Linux 42,484,360; macOS 46,049,510. These were headless Windows sender checks; native Unix executable-mode and launch behavior require hosted recipient observations.

## Hosted CI and reviews

Hosted native candidate qualification, actual prepared-recipient launch/relocation/Refresh and guided UI acceptance are pending PR CI. Original archives and matching receipts must be independently read back before handoff. At most two review rounds are authorized. Merge and release publication remain owner-controlled.
