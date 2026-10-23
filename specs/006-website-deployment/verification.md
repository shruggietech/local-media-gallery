# Verification: Public website deployment

Spec Kit specify, clarify, checklist, plan, tasks and blocking analyze passed before implementation. Test-first deployment contracts failed on the missing module before implementation. Nine initial contracts passed after correction; a metadata-conflict regression was then added. Actual Windows junction coverage passes outside the restricted sandbox without skipped tests.

Provider preflight found an existing active Cloudflare zone and owned locked/auto-renewing registration, no pre-existing DNS records and disabled DNSSEC with no DS. Organization Pages ownership was verified through the authenticated UI, the generated TXT retained, repository Pages configured for custom Actions and the apex bound before eight DNS-only address records were created. Repeat apply performed zero writes; a temporary TXT rollback drill restored the exact original record inventory. Detailed private snapshots/journals remain ignored.

## Local qualification

Full Windows qualification passed all forty Node tests, eleven Rust core tests, native shell tests, frontend/brand checks, nineteen small-fixture WebView2 groups, normal-binary exclusion, site build/crawl and four rendered browser groups. Preparation 45.811 seconds, qualification 83.784 seconds, combined 129.595 seconds. Target 660 seconds, hard limit 900 seconds, reserve fifteen seconds; no overrun.

The static crawl verified 39 HTML pages, 1,620 local links/fragments, 28 exact raw sources and 329 file hashes. Qualified source SHA256 is 12d386e2c84fc98e73c09a8821ec1a3f2bb63f05b7c9a630104233e3829f3854 across 904 files, excluding only this verification record and tasks.md. Governed kit bytes are unchanged. Windows junction regression ran without skips. Syntax and workflow YAML parsing passed.

Initial qualification was followed by hosted deployment, live acceptance and review corrections recorded below.

## Review correction and repeated qualification

Round one reported one P2: Pages-binding journals could not be passed to rollback. The command now dispatches DNS and Pages journals separately, restores exact prior Pages settings or removes newly created hosting, compares applied state before restoring, verifies provider and independent public DNS withdrawal before unbinding, preserves ownership TXT, and handles idempotent or uncertain restore readback. Three test-first Pages regressions cover restoration, creation/deletion, DNS preservation, concurrency and uncertainty.

Named public DNS-over-HTTPS endpoints were unavailable through host name resolution. The same providers' normal certificate-validated IP endpoints were verified and added as fallback only for name-resolution failures. Certificate failures remain fatal; a regression verifies this and rejects mismatched DNS questions. No credential or trust setting changed.

A repeated full run stopped at the native picker navigation guard and withheld selection. Preparation 46.460 seconds, qualification 75.165 seconds; the failed terminal record and not-run follow-up steps remain retained under ignored local evidence. No failing run was accepted. The following fresh full run passed all forty-four Node tests, fourteen deployment regressions, the existing Rust/frontend/brand checks and all nineteen native groups. Preparation 47.903 seconds, qualification 95.909 seconds, combined 143.812 seconds. Current qualified source 6c86973851b16d6dc0d7cb975e22a45cc81add074082feedddb90e36189bef7b across 904 files; only this record and tasks.md remain excluded.

Initial hosted run 39954406652 passed repository, product-windows, website and deploy-pages for head 1cf458e and synthetic checkout d93c9972cbae6180e31194189511c7859e7cdbaf. Its source digest matched initial local qualification. Complete final live acceptance awaits custom-domain certificate readiness and the corrected final revision.

## Second review and provider readiness

The second and final review found that DNS rollback performed an unrelated GitHub preflight. Pages reads are now deferred to preflight, bind, apply and Pages-journal recovery. A real child-process regression removes GitHub from PATH, provides only fixture Cloudflare responses, reproduces the prior spawn-gh failure and proves rollback now completes. Its Windows preload uses a proper file URL. All fifteen deployment regressions pass. The failed preload-fixture qualification remains retained separately; no failing result is accepted.

Before the operational documentation clarification, full qualification passed forty-five Node tests, eleven Rust core tests and nineteen native groups: preparation 43.485 seconds, qualification 91.413 seconds, combined 134.898 seconds, source 4b795be0962434e9e000a04dd3103b2d319f77d65437ba0693ff2dbef6fe384f across 904 files.

Run 39957114183 on 44b78b7 retained completed repository/Windows success, then its website dependency installation was cancelled after eleven minutes of slow Ubuntu mirror preparation. The unfinished jobs were retried on the same source and the run passed all four jobs. This is infrastructure retry evidence, not a software-fix claim.

GitHub confirmed valid DNS, Pages routing and HTTPS eligibility but did not issue the certificate during bounded readiness. At 2026-10-23T13:23:56Z, a single documented same-hostname provisioning reset retained organization verification, DNS and the deployed site and verified the restored binding. The resulting trusted public TLS acceptance is recorded below.

## Final implementation qualification

The final code and operational contract passed full local qualification: forty-five Node tests, fifteen deployment regressions, eleven Rust core tests, native shell/frontend/brand checks, nineteen WebView2 acceptance groups and all static/rendered website checks. Preparation 51.8 seconds, qualification 100.562 seconds, combined 152.362 seconds. Qualified source 5739319adbc3568bc1cef7be7eadb80146622b11ed004ba2d7ebbd9a74f53e7b across 904 files, excluding only this record and tasks.md.

The single provider-supported reset immediately produced a new certificate request. At 2026-10-23T13:24:18Z GitHub reported the certificate approved for localmedia.gallery, expiring 2027-01-21. A normal trusted HTTPS request succeeded, HTTPS enforcement was enabled and read back true. The organization verification and deployed site remained intact. Live acceptance then passed both authoritative servers, independent public DNS, unchanged unsigned delegation/CAA baseline, trusted HTTPS, HTTP redirection and all 327 files of the successfully hosted 44b78b7 artifact (synthetic checkout 6c883649cd3708116476ff3abce592544931852b). The final implementation revision will be requalified and redeployed before owner handoff.

## Production acceptance and review completion

The public HTTPS browser acceptance passed all four groups, with no mixed content, at 2026-10-23T13:36:34Z. A separate rendered check passed each of the eight diagram pages (four topics in both versioned and latest documentation) at 13:43:39Z. These checks used the real public origin and normal certificate validation.

Final provider preflight confirmed active delegation, nine records (eight web records and retained ownership TXT), registrar lock/auto-renew, unchanged disabled DNSSEC, custom Actions hosting, the verified custom domain and HTTPS enforcement. Repeat apply at 13:44Z performed zero writes. The configured repository homepage points to the live site.

Exactly two actual review rounds produced two P2 findings. Both were corrected, individually replied to and resolved: PRRT_kwDOVUAZgc6vmkKo (Pages-binding recovery) and PRRT_kwDOVUAZgc6vnRze (DNS recovery independent of GitHub). No third review was requested.

The delivery-record commit changes only tasks.md and this record, both explicitly excluded from qualified source identity. Final-head CI/deployment status and the exact live artifact are authoritative in PR #34 before owner handoff. The issue stays open in PR review until the owner performs the final review and squash merge. No product release or merge is performed by this slice.

Hosted implementation run 39962401722 passed repository and product-windows at synthetic checkout 425d366585f33c6340539fb4e9beb6c68c56e691. Browser dependency preparation remained slow before website qualification; final publication is gated on the subsequent delivery-record head completing all four jobs.
