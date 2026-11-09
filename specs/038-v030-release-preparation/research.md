# S038 research

## 2026-11-09: Acquisition failure and scope

Post-merge run 42566703880 failed in prerequisite preparation: tool/WiX HTTP 504 and an unsuccessful media-tool response. Qualification had not started for those failed scopes. Shared source fingerprint was unchanged by the squash merge. These observations justify acquisition resilience, not retries of functional acceptance or release mutations.

Decision: use one complete acquisition policy across the observed paths and equivalent maintainer reads. Rationale: current fetch/header and body consumption are split, and the existing feature helper retries bare TypeError and all 5xx too broadly. Alternatives: scattered loops duplicate policy and miss body failures; whole-job retries discard useful prepared work; a new cache/service expands scope. Existing host-command/package-manager preparation remains separate.

Read-only download research identified prepare.mjs (not a nonexistent prepare-tools module), media gzip/notices, NVDA, feature source, WiX/WebView2, published predecessor artifacts, Linux canonical predecessor, brand acquisition, diagnostic predecessors and Actions readiness GET. Local driver/media fixtures, offline-negative probes, Cloudflare operations and publication mutations are excluded.

## 2026-11-09: Retry semantics and stream state

Decision: bounded whole-operation attempts, explicit temporary statuses and nested transport codes, caller abort/deadline propagation and Retry-After admission. Keep validation permanent and diagnostics free of raw secrets. Every body read shares the operation signal; success is complete content, not merely response headers.

[HTTP Semantics, idempotent methods and Retry-After](https://httpwg.org/specs/rfc9110.html) supports distinguishing idempotent acquisition from mutations and respecting a server's requested delay. [Pinned Node 24.11 abort documentation](https://nodejs.org/download/release/v24.11.0/docs/api/globals.html#class-abortsignal) provides composable cancellation and timeout primitives. [Undici error classes](https://undici.nodejs.org/api/Errors) distinguish transport timeout/socket errors from configuration and response-limit failures. Project policy deliberately selects a finite retry set; the standards do not prescribe the project's attempt count.

Decision: preserve GitHub origin/redirect credential checks, observation failure identity and existing 300/600-second transfer bounds. Recreate per-attempt digest/count. A custom irreversible sink is not replayed; the file helper owns truncate plus explicit-offset replay. Alternatives of returning Response outside the retry boundary or truncating without resetting output position were rejected because they miss body failure or create holes/duplicate output.

## 2026-11-09: Release version and historical preservation

Decision: prepare v0.3.0 using existing snapshot tooling. Inventory and test v0.2.2 history first; copy new trees and update only owned version rows. Keep authored latest and actual canonical selection unchanged. No dependency, framework, signing or public-role change is needed.

Read-only release research found hardcoded ordinary Windows expectations for 0.2.0/0.2.1. Add exact published 0.2.2 to that modern path while preserving separate advanced recovery/MSP inputs 0.1.0/0.2.0. Existing ordinary rows take about a minute each, while S037 final gate was 867.646 seconds and experience execution 665.677 seconds. Measure the full cohort instead of increasing clocks or dropping rows.

Prepared recipients intentionally elect the actual published canonical Lite. v0.3.0 sender proof may use the v0.2.2 receiver before publication; record both identities. New native candidate Full/Lite proof is a separate observation. Relabeling the canonical receiver or requiring nonexistent publication is rejected.

## Requirements-quality review

The independent release researcher approved CHK001–CHK012 (12/12) and explicitly requested the primary record reviewer-approved markers on its behalf. Approval concerns written requirement quality only. No blocking gap remained. Implementation and hosted acceptance remain outstanding.
