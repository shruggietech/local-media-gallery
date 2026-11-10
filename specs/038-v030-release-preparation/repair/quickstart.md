# Repair validation

1. Run targeted Node tests for windows-package-cohort and windows-package-observer using the verified headless launcher. Real PowerShell tests use non-native fixtures and deny isolated CI.
2. Run npm run check and npm test using Node 24 through the verified hidden launcher. Inspect encoding and git diff.
3. Push the repair PR and wait for exact-head hosted qualification. Both native workers must complete their unchanged assertions inside the shared active deadline, with initialization proof and three ordered upgrade rows from lifecycle.
4. Resolve hosted findings and hand off green PR for owner merge. Wait for a new green push-to-main qualification before publication.
5. Update publication input to the accepted main run, publish only those exact artifacts, and verify metadata, all public hashes/downloads, docs and recipient evidence. Never dispatch against failed run 42694671875.

Transport-specific checks: run tests/windows-evidence-transport.test.mjs and verify packed-only inputs restore all original paths before release retainedPath preflight. Hosted validation must include full existing transaction validators after rehydration and exact support ZIP reconstruction. Retain raw successful snapshot trees locally; upload raw snapshots separately only if lifecycle qualification fails.
