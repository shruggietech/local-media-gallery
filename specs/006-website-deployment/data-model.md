# Data Model

- Deployment policy: version1, repository shruggietech/local-media-gallery, canonical HTTPS origin, exact apex address sets and managed hostname. Reject other repositories/hosts.
- Deployment identity: version1, exact Git revision and qualified source digest, retained documentation versions. Written into the static output before inventory hashing.
- Qualified inventory: relative POSIX path, byte length and SHA256 per regular file. Paths are unique, confined, nonempty and contain no traversal, NUL or backslash. No symlinks or unlisted files.
- DNS record: provider id plus type, canonical name, normalized content, TTL and proxy flag. Unknown provider fields do not become update payloads.
- DNS plan: creates/updates/deletes with exact before and desired values; unrelated records form a preservation snapshot. Execution transitions planned → applied → verified or failed; a local journal is persisted after each applied mutation.
- Rollback: only applied journal entries, reversed in order, with current-state equality checked before mutation. Conflict transitions to incomplete with preserved current state. Verification TXT is retained.
- Live acceptance: origin, deployment revision/source, started/terminal timestamps, DNS/TLS/provider observations and per-file hash/count outcome. Pending external readiness is never pass.
