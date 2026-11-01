# Research: Release recovery

## Decision: stage by authenticated identity

The real production draft exposed temporary browser URLs. GitHub's [asset API](https://docs.github.com/en/rest/releases/assets) supports authenticated binary GET by asset ID with 200 or 302 responses. Verify the exact repository asset API URL, positive ID, release membership, name, uploaded state, bytes and SHA-256. Final public URLs remain mandatory after publication. The API does not promise stable draft browser URLs.

## Decision: reconcile committed writes through reads

The release client and publisher currently read immediately after create/upload/delete/publish/promote. The controlled service wrongly exposes final URLs immediately. Add bounded pending-read observation after one mutation; do not repeat writes or retry validation conflicts. The [release API](https://docs.github.com/en/rest/releases/releases) limits draft visibility to push-authorized callers and makes no immediate-visibility guarantee. Keep credentials confined to exact API endpoints and approved binary redirects.

Spec Kit research agent inspected these paths read-only and confirmed the minimal integration points. Delays and committed lost acknowledgements belong in the fixture, with explicit write-count assertions.

## Decision: retain exact gated projections

The existing workflow uploads publication files but omits candidate-site. Retain candidate export, inventory and matching record at qualification time, then publication export and matching published record. The independent verifier uses existing gate recomputation and exact file inventories after extraction. Rebuilding a separate candidate is insufficient because projection hashes bind exact output.

## Alternatives

Unbounded retries, reissuing writes, swallowing every error, relaxing final URLs, or editing released snapshots were rejected. No unknown architecture decisions remain.

## Hosted navigation evidence

Two unchanged-head runs failed on overlapping controlled navigation. A delayed same-URL page reproduces premature URL-only completion deterministically (old wait returns the original document identity). Registering the main-frame navigation event before selecting, then waiting for that new document to load, passes same-version and cross-version replacement and immediate following navigation. This narrow acceptance fix is included as #78.
