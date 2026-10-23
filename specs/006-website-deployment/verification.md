# Verification: Public website deployment

Spec Kit specify, clarify, checklist, plan, tasks and blocking analyze passed before implementation. Test-first deployment contracts failed on the missing module before implementation. Nine initial contracts passed after correction; a metadata-conflict regression was then added. Actual Windows junction coverage passes outside the restricted sandbox without skipped tests.

Provider preflight found an existing active Cloudflare zone and owned locked/auto-renewing registration, no pre-existing DNS records and disabled DNSSEC with no DS. Organization Pages ownership was verified through the authenticated UI, the generated TXT retained, repository Pages configured for custom Actions and the apex bound before eight DNS-only address records were created. Repeat apply performed zero writes; a temporary TXT rollback drill restored the exact original record inventory. Detailed private snapshots/journals remain ignored.

## Local qualification

Full Windows qualification passed all forty Node tests, eleven Rust core tests, native shell tests, frontend/brand checks, nineteen small-fixture WebView2 groups, normal-binary exclusion, site build/crawl and four rendered browser groups. Preparation 45.811 seconds, qualification 83.784 seconds, combined 129.595 seconds. Target 660 seconds, hard limit 900 seconds, reserve fifteen seconds; no overrun.

The static crawl verified 39 HTML pages, 1,620 local links/fragments, 28 exact raw sources and 329 file hashes. Qualified source SHA256 is 12d386e2c84fc98e73c09a8821ec1a3f2bb63f05b7c9a630104233e3829f3854 across 904 files, excluding only this verification record and tasks.md. Governed kit bytes are unchanged. Windows junction regression ran without skips. Syntax and workflow YAML parsing passed.

Hosted deployment, final live acceptance and actual review results are pending.

## Review correction and repeated qualification

Round one reported one P2: Pages-binding journals could not be passed to rollback. The command now dispatches DNS and Pages journals separately, restores exact prior Pages settings or removes newly created hosting, compares applied state before restoring, verifies provider and independent public DNS withdrawal before unbinding, preserves ownership TXT, and handles idempotent or uncertain restore readback. Three test-first Pages regressions cover restoration, creation/deletion, DNS preservation, concurrency and uncertainty.

Named public DNS-over-HTTPS endpoints were unavailable through host name resolution. The same providers' normal certificate-validated IP endpoints were verified and added as fallback only for name-resolution failures. Certificate failures remain fatal; a regression verifies this and rejects mismatched DNS questions. No credential or trust setting changed.

A repeated full run stopped at the native picker navigation guard and withheld selection. Preparation 46.460 seconds, qualification 75.165 seconds; the failed terminal record and not-run follow-up steps remain retained under ignored local evidence. No failing run was accepted. The following fresh full run passed all forty-four Node tests, fourteen deployment regressions, the existing Rust/frontend/brand checks and all nineteen native groups. Preparation 47.903 seconds, qualification 95.909 seconds, combined 143.812 seconds. Current qualified source 6c86973851b16d6dc0d7cb975e22a45cc81add074082feedddb90e36189bef7b across 904 files; only this record and tasks.md remain excluded.

Initial hosted run 39954406652 passed repository, product-windows, website and deploy-pages for head 1cf458e and synthetic checkout d93c9972cbae6180e31194189511c7859e7cdbaf. Its source digest matched initial local qualification. Complete final live acceptance awaits custom-domain certificate readiness and the corrected final revision.
