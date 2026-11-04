# S029 validation guide

1. Use the verified hidden launcher on Windows. Complete fixture isolation before running updater/package Rust tests.
2. Run affected Rust unit/integration cases for storage contexts, private settings/history reset, preflight, coordination concurrency and scratch retention. All fixtures must own disposable roots.
3. Run npm run check, npm test, npm run check:docs and affected app/site checks. Retain terminal outputs, source identity and separate qualification clocks.
4. Confirm normal artifacts exclude tooling-state/private test redirection; actual ordinary-byte GUI/install checks remain on existing disposable isolated CI hosts.
5. Push/open the official PR closing #90, #91, #92 and #93. Handle CI and no more than two review rounds, then hand off unmerged to the owner.

Owner product testing follows actual release publication. No new attended verification gate, migration/backup or cleanup of the owner's already-removed directories is part of this procedure.
