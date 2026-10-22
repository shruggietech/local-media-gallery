# Validation guide

1. Use documented Windows prerequisites and `npm run prepare:local`.
2. Run `npm run check`, `npm test`, `npm run check:docs` and `npm run check:app`.
3. Run `npm run qualify` for source-bound Windows qualification with isolated small fixtures. The harness elects small pages without adding bulk assets.
4. Inspect results for manual-only refresh, page bounds, focused playback/disclosure continuity, persistence and geometry, plus retained access-security and normal binary exclusion checks.
5. Run `.local/bin/local-media-gallery.exe <directory>` for normal use. Open/Refresh discovers; no idle scans. Settings are per-user. No installation or publication is implied.

Acceptance must report preparation, qualification and combined elapsed time; Linux/macOS runtime and private dataset frame rates remain unverified.
