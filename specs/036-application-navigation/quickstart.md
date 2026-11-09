# Validation guide: S036

1. Use the repository's hidden noninteractive launcher on Windows. Run npm run check and npm test, then npm run check:app and node scripts/run.mjs export with verified prerequisites.
2. Run node scripts/test-gallery-navigation.mjs with the existing headless Chromium configuration. Browser host mocks are external test fixtures, not native evidence. Exercise all routes, path copying/failure, scopes, empty state, focus/keyboard, video lifetime, retained work and narrow/touch/zoomed layouts. Review recorded screenshots and axe results.
3. Run affected site build/check/browser checks. No released versioned documentation or governed bytes may change.
4. On the official PR, allow existing isolated hosted Windows/Linux/macOS native and package scopes to run. Observe real drawer traversal/focus alongside unchanged media/settings/preparation/public-recipient assertions. Verify exact-head receipts, source/clock and terminal statuses.
5. Handle the automatic hosted review and at most one additional round. Resolve every finding, finish all applicable checks green, post exact head/evidence and stop for owner merge. No release publication or owner-workstation native UI is part of this slice.
