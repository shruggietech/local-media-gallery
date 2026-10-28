# Candidate interface

Full DMG contains Local Media Gallery Full.app, lmg-setup, metadata and prerequisites. No public release implied.

lmg-setup install|remove --scope user|system [--directory ABSOLUTE_APP_PATH] [--command-directory ABSOLUTE_DIRECTORY] emits JSON stdout, nonzero failures on stderr. --help is nondestructive. User defaults ~/Applications and ~/.local/bin. System explicit /Applications and /usr/local/bin requires root, never implicit sudo. No shell-profile edits or quarantine clearing. Keep matching helper for removal; close running apps first.

Install verifies host/runtime, embedded exact app, physical destinations and visible command collisions. Same owned candidate repeat is no-op, unsupported replacement fails. Removal retains foreign/changed files and external state with retained-path result.

Lite native ZIP preserves full app and notices. Extract, place beside gallery or select explicit root, move entire outer gallery/app/settings together, use explicit Refresh after media changes. Known translocation requires folder selection. Full never defaults to DMG root.
