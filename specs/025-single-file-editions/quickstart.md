# S025 validation guide

1. Verify prerequisites using existing preparation scripts. Keep builds/downloads outside qualification timing.
2. Run npm run check, npm test, npm run check:app and affected site checks using hidden/headless launchers on Windows.
3. Run each existing isolated native package campaign with the new builders. Copy only Lite into a fresh gallery, launch, relocate and Refresh; record actual native UI and binary identity.
4. Copy only Full onto the declared clean native host, record redistributable absence, disable networking, install at system scope and exercise browsing, playback, thumbnail helper and lifecycle including interruption/recovery/collision/data retention.
5. Verify all six final artifacts, dependency/source/notices inventories, release/download/update/preparation contracts and unchanged historical identities. Apply target 660s advisory/hard 900s and 15s reserve to qualification only.
6. Push and open official PR automatically; respond to every review finding and resolve threads, with at most initial plus one requested Codex round. Verify final head checks and ping owner for review/merge. Do not merge/tag/publish a release.
