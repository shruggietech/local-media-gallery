# S038 qualification repair verification

2026-11-09, pre-push source checks:

- Test-first regression run failed for the intentionally missing assignment and initialization exports.
- Targeted regressions passed (29 tests), followed by full repository suite with an additional unknown-marker case.
- npm run check passed: 973 authored/configuration text files, local links, version alignment, Spec Kit integration and 572 governed brand files.
- npm test passed: 390 tests, 388 passed, two platform-dependent skips, no failures. Non-native real PowerShell fixture/denial tests passed on Windows. No product GUI or installers executed on the owner workstation.
- Source inspection confirms all three ordinary campaigns and all final byte/native validators remain; qualification constants unchanged. Existing MSI requests retain their default 20-second allowance.

Hosted native qualification, review, owner merge, fresh trusted-main acceptance and publication are pending. Local checks do not substitute for those observations. Run 42694671875 attempts 1 and 2 remain failed diagnostic history and cannot authorize publication.

2026-11-09 transport supplement: original native workers passed at 614.124/649.423 seconds, but the 5.14 GB lifecycle snapshot transfer remained in progress after the shared hard deadline. Both worker artifacts remain server-retained. ZIP64 directory metadata is recorded locally; the large lifecycle ZIP was not independently downloaded/hashed locally. Replaced repeated successful-snapshot transport with complete SHA-256 blob/manifest transport, keeping all original worker files and raw failure diagnostics. Targeted transport/cohort/release-preflight tests passed; final full suite passed 401 tests (399 passed, two platform skips), with no native owner-workstation execution. Repository checks and encoding/link/version checks passed. New exact-head hosted qualification remains required; old native observations are diagnostic, not acceptance for the new transport source.

Second/final hosted review on abe816b identified missing transport production for the supported standalone all profile. Moved packing from the cohort-only controller into the shared native receipt producer after native update validation and before profile-specific serialization. Both all and lifecycle now execute the same producer code; experience still has no update snapshots. Existing transport round-trip/preflight regressions exercise the all-style receipt shape. No third hosted review will be requested. New exact-head CI is required after this correction.


## Post-merge Linux bootstrap timeout

After PR #119 merged, main qualification run 42739628829 failed Linux recipient preparation twice. Both debootstrap children were killed at the 900000 ms command timeout while retrieving Ubuntu baseline packages. Qualification readiness was never reached and no Linux package test ran. Failed original ZIP artifacts 13730491431 and 13731593747 were retained and independently SHA-256 checked. All other native platform and Windows cohort scopes passed.

Owner direction is to increase a specific timing limit directly when timing is the issue. Increase only debootstrap preparation from 15 to 30 minutes. Keep the same command, mirror, signature/integrity checks, campaign, qualification accounting and existing 90-minute Linux CI job ceiling. No new retry mechanism or fixture is introduced. Fresh exact-source CI remains required before merge and a successful new main run remains required before publication.


## Repeated main Ubuntu download failures

Main run 42756879341 at revision 32e7b5c failed preparation twice with terminal debootstrap download errors, not command timeouts. Attempt 1 could not retrieve passwd; the fresh-host retry could not retrieve ca-certificates, libaudit-common and openssl. Original ZIP artifacts 13737897696 and 13738709581 were retained and SHA-256 verified. No Linux qualification assertions ran. Every other platform scope passed.

Use Wget's existing per-download configuration through an invocation-owned WGETRC: five attempts, 30-second DNS/connect/read timeouts, connection-refusal recovery, transient HTTP retries and bounded retry waits. Retain the 30-minute outer bootstrap allowance and all native/integrity/provenance checks. Copy the complete debootstrap log on failure and retain it with the configuration. A real local HTTP fixture on Linux verifies recovery on the fifth attempt, five-attempt exhaustion and one-attempt permanent 404 refusal. The production closure fixture proves that only this bootstrap invocation receives its own configuration.

Primary references: [debootstrap delegates retrieval to Wget](https://sources.debian.org/src/debootstrap/1.0.128%2Bnmu2%2Bdeb12u2/functions/) and [Wget 1.21 startup-file configuration](https://sources.debian.org/src/wget/1.21-1%2Bdeb11u1/doc/wget.texi).


The first download-recovery candidate a002f00 failed before retrieval because Ubuntu's unprivileged downloader could not read the private WGETRC. Artifact 13740516834 (SHA-256 7f8e198454aa147efd5dcad3b667da091bf4af1bae5e501fe7209923b13d3e4d) retained the exact permission-denied log. Move the live configuration into a per-invocation traversable temporary directory with a readable file, retain a private evidence copy and remove the temporary configuration afterward. Execute the real HTTP regression as the same _apt account so configuration access is covered alongside recovery and finite refusal.
