# Data model: Website foundation

## Snapshot

Unique semantic version, specification/released status, source directory and ordered unique topic identifiers. Selected latest pointer must name a retained snapshot and may not imply a published product. Optional schema must match version and canonical identifier. Explicit reference inventory captures external sources for historical use.

## Generated page

Route, version/topic/title, escaped parsed HTML, heading index, source path/hash, raw URL, local asset inventory. Routes are unique and local references must resolve inside the allowlist. Query/fragment semantics survive rewriting.

## Search document

Version, topic/title, heading/anchor and plain text. Per-version index, deterministic matching, finite result count; no remote query service.

## Published release

Status published, matching version and source commit, artifacts with edition/platform/architecture/name/hash and canonical GitHub Release URL. Absent means development status. Invalid/candidate identities cannot create download claims.

## Evidence

Preparation start, readiness, per-step start/end/result/failure category, terminal completion, separate phase durations, source digest/revision and produced artifact hashes. Result is pass only when all elected steps pass within the hard deadline. Timeout signals termination uncertainty until the child has actually exited.
