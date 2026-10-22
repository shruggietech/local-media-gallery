# Interface contract

Native: existing startup/open_gallery/choose_directory/refresh/close_gallery return explicit current snapshots after requested discovery. A completion event may synchronize native-triggered opens without timers; stale event/snapshot sessions must not supersede newer user intent. No automatic scans. Transport origin must be ready when startup returns. Existing media grant/Host/Origin/range/path rules remain.

Settings commands: load_settings returns {settings,revision,warning}; save_settings accepts {settings,expectedRevision} and returns updated envelope. Known fields match data-model.md and the master JSON Schema. Conflicting, malformed, unsupported and write-failed saves do not truncate a previous file. Production path is platform app configuration directory/settings.json. Native test configuration isolation is feature-gated; no user-input destination path command is exposed.

UI: page24/48/96 default48, labelled jump and Previous/Next, fully sorted/filtered order; test feature may elect4. Info button aria-expanded controls metadata panel; preference persisted on toggle. Settings expose page/card size, collapsed controls, indicator mode. Toolbar starts collapsed; all essential folder actions remain available. Gallery scroll owner remains AppFrame, position indicator pointer-inert and idle hidden. Full view keyboard order follows sorted DOM; card gaps12px.

Settings reads/writes are limited to one MiB; oversized stored data is preserved with a warning. Maintainer Windows child processes use ignored workspace temporary directories so privilege-sensitive fixture tests run within the writable workspace without weakening their assertions.
