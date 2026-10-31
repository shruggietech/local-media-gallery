# Linux package operation contract

## Full

Use explicit administrator invocation of the host APT package manager to install the complete .deb, for example sudo apt install --reinstall ./local-media-gallery-0.0.0-full-x86_64-linux-candidate.deb. Normal dpkg registration identifies local-media-gallery0.0.0amd64. Dependencies derive from actual ELF plus elected media plugins. dpkg scripts never call apt recursively or elevate. Success requires verified actual installed payload/integration and headless native identity. Repeat exact candidate is supported; other candidate/version and modified/foreign files reject with recovery details.

Remove with sudo apt remove local-media-gallery; purge affects remaining package-manager metadata, not user/gallery state. Guard prerm remove/upgrade/failed-upgrade before deletion; abort-remove is a non-mutating unwind. No recursive package cleanup or autoremove. Package-manager transaction errors do not certify rollback beyond observed state; retain diagnostics and inspect before retry.

## Lite and launch

Extract complete tar.gz preserving modes. local-media-gallery and its ordinary local-media-gallery.bin are adjacent to external gallery files. Wrapper resolves its own location independent of CWD/symlinks and execs the existing native CLI unchanged. Explicit root wins; no-argument Lite uses ELF parent; Full without root opens selection. No Full/toolchain/chosen browser dependency. Pre-ELF host/library diagnostics use stderr and exit2; native CLI JSON/status/error codes apply after exec. Headless finite commands do not require a display. GUI missing/empty display uses native display_unavailable behavior.

## Identity and trust

Version0.0.0 is the common specification/development baseline, not a published product release. Candidates are unsigned and have no repository-signature trust claim. Exact archive/payload/source hashes and modes bind qualification, including preserved upstream notices and governed icon source mapping. Recipient runtime/shared-library footprint is unavailable when complete attributable bytes cannot be measured, never0 by assumption.
