# S038 qualification repair verification

2026-11-09, pre-push source checks:

- Test-first regression run failed for the intentionally missing assignment and initialization exports.
- Targeted regressions passed (29 tests), followed by full repository suite with an additional unknown-marker case.
- npm run check passed: 973 authored/configuration text files, local links, version alignment, Spec Kit integration and 572 governed brand files.
- npm test passed: 390 tests, 388 passed, two platform-dependent skips, no failures. Non-native real PowerShell fixture/denial tests passed on Windows. No product GUI or installers executed on the owner workstation.
- Source inspection confirms all three ordinary campaigns and all final byte/native validators remain; qualification constants unchanged. Existing MSI requests retain their default 20-second allowance.

Hosted native qualification, review, owner merge, fresh trusted-main acceptance and publication are pending. Local checks do not substitute for those observations. Run 42694671875 attempts 1 and 2 remain failed diagnostic history and cannot authorize publication.

2026-11-09 transport supplement: original native workers passed at 614.124/649.423 seconds, but the 5.14 GB lifecycle snapshot transfer remained in progress after the shared hard deadline. Both worker artifacts remain server-retained. ZIP64 directory metadata is recorded locally; the large lifecycle ZIP was not independently downloaded/hashed locally. Replaced repeated successful-snapshot transport with complete SHA-256 blob/manifest transport, keeping all original worker files and raw failure diagnostics. Targeted transport/cohort/release-preflight tests passed; final full suite passed 401 tests (399 passed, two platform skips), with no native owner-workstation execution. Repository checks and encoding/link/version checks passed. New exact-head hosted qualification remains required; old native observations are diagnostic, not acceptance for the new transport source.
