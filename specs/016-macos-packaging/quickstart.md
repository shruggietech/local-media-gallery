# Validation

1. On isolated macOS15 arm64, install maintainer prerequisites and npm ci.
2. Run npm run ci -- macos-packages. Preparation builds ordinary release apps, native helper and observer, signs completed bundles and creates containers. Qualification tests actual DMG/ZIP install/repeat/collisions/removal and native browsing.
3. Independently read uploaded source-bound receipts/containers; reconcile exact inventory/modes, binary/signature identity, red/green frames and retained content.
4. Retain all repository/product/site gates with separate preparation/qualification/combined time.
5. Confirm final PR checks and review threads, maximum two requested review rounds, then stop for owner merge.
