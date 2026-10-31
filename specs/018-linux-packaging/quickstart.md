# S018 validation guide

1. On a verified headless maintainer environment run npm run check, npm test, npm run check:docs and npm run check:app. Windows tooling uses hidden noninteractive child processes.
2. On an explicitly isolated Ubuntu24.04 hosted desktop provision build, package and observer prerequisites, then run dbus-run-session with Xvfb and npm run ci -- linux-packages. All builds/downloads precede readiness; package operations/native assertions remain qualification.
3. Inspect .local/linux-package-build.json and linux-package-results.json, actual Full .deb and Lite tar.gz, source identity, exact inventories/modes, derived dependency/control metadata, native PNG/PCM/AT-SPI observations and complete retained failure diagnostics.
4. Confirm actual Full installation/repeat/collision/removal/purge/config-files reinstall, retained gallery/user/shared-runtime sentinels, and Lite in-place/explicit/relocated Refresh after Full removal with a fresh profile and minimal host PATH.
5. Confirm actual copied-ELF missing-library and empty-display negatives distinguish injected failure from real host support. No local GUI, developer-tool recipient dependency, silent different-candidate replacement or fabricated runtime footprint is accepted.
6. Run the complete existing platform/site matrix plus linux-packages. Resolve all review comments within two waves, verify final head/source/terminal checks and stop for owner merge. Actual product release remains separate.
