# S013 Data Model

## Native preparation context

Captured root/session and exact source OsString entries with item/revision/signature and cancellation tokens. Display strings never authorize reopening. At most one active preview/generation job; preview storage is bounded to the latest request. No open file per item is retained. Provider selection carries absolute native path, SHA256, executable length, observed version/capabilities, origin and nullable download/extracted/runtime/associated-payload observations.

## Preview and job

Preview: formatVersion1, id, sessionId, sequence, destinationKind(local|portable), native destination, parameter policy, candidate counts, planned exact slots, reuse/collision/unavailable observations, nullable storage estimate and upper-bound bytes (decimal strings). No path/profile/cache creation.

Job: id, sessionId, sequence, kind(preview|generate|cleanup), phase(previewing|ready|running|cancelling|success|partial|cancelled|unavailable|failed), source/preview identity, current opaque itemId, exact candidate/completed/reused/failed/skipped/remaining counts, nullable bytes and helper lifetime, bounded recent item results and dropped count. Only job-owned events with increasing sequence apply. Cancel intent precedes final stopped outcome; unknown helper lifetime retains admission. Root/item retirement rejects late commits.

## Cache format1

Owner record identifies product/local-media-gallery, kind/thumbnail-cache and formatVersion1. Native directories and records are no-follow; records are regular, at most 6 MiB and deny unknown/future formats. SourceName uses UTF8 relative bytes where possible, otherwise tagged Windows UTF16LE/Unix bytes, never absolute roots. Source key hashes exact relative encoding/bytes. Content-policy key hashes full source SHA256, byte length and canonical output policy; each has16 immutable no-clobber slots. Provider identity is part of entry validation/reuse; compatible validated entries remain consumable without an installed encoder.

Entry: product, kind, formatVersion, sourceName, source SHA256, sourceBytes (decimal string), parameters/policy, provider identity, outputPNG base64, outputSHA256, width/height1..320, complete=true and opaque generation identity. Output bounded4MiB, decoded area<=102400pixels. Native still decode input dimension<=16384, area<=33554432pixels and decoded bytes<=134217728; allocation allowance201326592 is best-effort. Only validated complete envelopes are hits. Focused viewing always uses original grants. No automatic eviction; explicit cleanup validates ownership and retains unrecognized records.

## Diagnostics format1

DiagnosticContext: product/version/edition/OS/arch/target/runtime with unavailable facts null. Record: sequence/time, opaque operation/session/item/job identities, operation/boundary/status/category/code, internally defined message/recovery, allowlisted exact nullable counts. No arbitrary strings/paths/URLs/raw errors/stderr/sidecars/settings/recents. Retain at most 256 records and 262144 serialized-record bytes; evict oldest with decimal dropped count. Oversized or duplicate flood observations are bounded. Snapshot/report includes formatVersion/context/records/counts and export contents/redaction description. Memory lasts until process exit; explicit export uses native user-selected destination or requested CLI output.

Cleanup streams bounded per-file checks, with one worker and cancellation between entries. Its total candidates and remaining count are null while the directory total is unknown; completed/retained/failed observations stay exact even after interruption. Successful enumeration records its examined total and zero remaining. This is independent of the original-media candidate count.
