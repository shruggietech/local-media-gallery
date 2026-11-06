# Validation guide

1. Use the pinned headless Node/Python toolchain. Keep installer, desktop/input and machine-policy work on isolated hosted machines.
2. Run the bounded minimatch advisory/caller regression, GitHub artifact transport tests and release-evidence negative/legacy cases. Timeout, changed authority and missing evidence must fail.
3. Run npm run check, npm test, npm run check:docs, npm run check:app and affected production site build/check/test. Preserve historical inventories and the existing glib backport.
4. After committing source A, use node scripts/release.mjs snapshot with explicit from/to/version/revision/reviewer/date/notes and --major false into a fresh ignored destination. Replace only the unpublished site/retained/v0.2.1.json and qualify final source B.
5. Push/open the official PR; collect all nine exact-head canonical receipts, every applicable terminal CI result and supporting original artifact identity. Inspect product bytes and current documentation outputs independently.
6. Count the automatic review as one; request at most one follow-up, address every received finding, then stop for owner final review and merge. Follow contracts/publication-handoff.md only after later publication authorization.
