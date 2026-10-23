# Implementation Plan: Public website deployment

**Slice**: S006 | **Branch**: `codex/006-website-deployment` | **Date**: 2026-10-23 | **Spec**: [Specification](spec.md)

## Summary

Complete #32 using the existing checked static website, an Actions Pages deployment gated by all three qualification jobs, narrowly scoped domain reconciliation and exact live byte verification. Publish the explicitly authorized S006 PR artifact before owner merge; ordinary publication follows main. Remove superseded S005 notes without rewriting history.

## Technical Context

**Language/Version**: Node 24+, existing Next/React static export and PowerShell/Python maintainer helpers.
**Primary Dependencies**: Node built-ins; existing Playwright browser acceptance; pinned official GitHub Actions.
**Storage**: Public deployment policy in site/deployment.json; ignored private provider snapshots/journal and qualification records in .local; source-owned static deployment identity.
**Testing**: Test-first Node fixtures for DNS planning/rollback, artifact trust/path/hash validation and live HTTP behavior; existing repository/product/site checks and actual provider/DNS/TLS/browser acceptance.
**Target Platform**: GitHub Pages Actions, Cloudflare authoritative DNS, modern browsers.
**Constraints**: Existing registrar/zone, DNS-only apex, no secrets/contact data in evidence, no wildcard, no product release; hidden noninteractive console children; 660/900/15-second qualification accounting.
**Scale/Scope**: One owned apex, its verification TXT, eight address records and all retained site files/routes.

## Constitution Check

Pre-design PASS. Owner-approved hosting, publication and final merge boundary are explicit. Existing product contracts and brand bytes remain unchanged. Generic provider tooling is limited to the owned site; no new application service, dependencies or policy gates.

Post-design PASS. The pre-merge deployment is explicitly authorized and restricted to an exact same-repository PR ref by both workflow condition and deployment environment. All existing checks remain mandatory. Live/provider results remain separate from CI.

## Project Structure

- scripts/deployment.mjs: DNS normalization/planning/compare-before-write/rollback and artifact/live verification primitives.
- scripts/configure-domain.mjs: bounded scoped preflight, plan/apply/readback/rollback commands using existing environment credentials and hidden gh child calls.
- scripts/verify-deployment.mjs: reject unqualified/source-mismatched/static-byte-mismatched artifacts before deployment.
- scripts/verify-live-site.mjs: bounded public DNS/TLS/HTTP and complete live inventory checks; local acceptance record.
- scripts/build-site.mjs: emit deployment identity before final static inventory hashing.
- site/deployment.json: repository, canonical address and officially verified address destinations.
- .github/workflows/ci.yml: upload checked Pages artifact; deploy only after all qualifications through github-pages environment and serialized production concurrency.
- tests/deployment.test.mjs: actual helper contracts with small provider and HTTP fixtures.
- docs/v0.0.0/website-and-documentation.md, README.md, CONTRIBUTING.md and CHANGELOG.md: authoritative publication contract, runnable maintenance and dated tooling decision.

## Decisions and execution order

1. Reuse the existing active full zone and owned Cloudflare registration. Verified preflight finds no DNS records and disabled DNSSEC with no registrar DS. Preserve that state and verify public delegation, DS and both authoritative nameservers. No registrar write is required.
2. Use organization Pages verification through the authenticated GitHub UI because the connector/official REST API does not expose challenge management. Use API readback for repository Pages and Cloudflare. Retain the generated TXT. No routine human dashboard handoff.
3. Use apex-only initial routing; www is absent and optional. Eight official A/AAAA values use DNS-only and TTL300. Existing CAA is absent; do not impose a new CAA policy.
4. Extend existing Qualification instead of adding an untriggerable new dispatch workflow. Website uploads the exact checked output to a Pages artifact. Deploy needs repository, product-windows and website, validates the downloaded static/evidence inventory and uses OIDC. A repository variable selects the authorized bootstrap branch and the environment allows main plus the exact S006 PR merge ref. Remove bootstrap permission during post-merge housekeeping.
5. Publish a static deployment identity file before inventory hashing. Verify every file against the same successful website evidence and exact checkout revision. Reject unsafe paths, symlinks, extra/missing files and altered bytes. Do not rebuild in the deploy job.
6. Use minimal DNS set differences, per-write precondition readback and a persisted local journal. Rollback compares current applied values before restoring/removing only owned changes. Retain the challenge TXT and record exact Pages before/after for recovery. Test actual small live reversible DNS record rollback and artifact recovery, without deliberately interrupting working website traffic.
7. Use bounded provider/DNS/TLS readiness with terminal pending/failure evidence. Network preparation waits are accounted separately from local qualification. Final live crawl compares every checked file and browser behavior; no insecure certificate bypass.
8. Run test-first fixtures, all local parity checks and existing native acceptance where elected. Push/open official PR automatically, let automatic reviews form round one, fix/respond/resolve all actual comments, optionally invoke one second `@codex review`, and stop before merge.

## Complexity Tracking

No exceptions. Public deployment metadata is separate from product release metadata, preserving #31/#26's release-publication boundary.
