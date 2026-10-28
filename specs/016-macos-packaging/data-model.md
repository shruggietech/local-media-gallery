# Package entities

Payload: formatVersion1, kind macos-application-payload, product local-media-gallery, version0.0.0, full/lite, macos/aarch64/aarch64-apple-darwin/release, source/revision/generation, bundle and relative binary. Exact files have unique normal relative paths, decimal lengths, lowercase64hex SHA256 and executable/data modes; no links/special entries.

Installation receipt: user/system scope, physical absolute app/command paths and embedded payload identity. Stored beside app, outside signed bundle. Exact command symlink points at installed executable. Transition absent → staged verified → app/command/receipt. Failed new integration rolls back owned staging/files.

Removal: validate receipt/path/integration, remove unchanged owned files, remove directories only if empty, retain changed/foreign files and external gallery/profile data, report retained paths.

Evidence: source/revision/host/container/payload/native signature/deployment identities, lifecycle operations, AX/pixel frames, retained hashes and measured archive/extracted/installed bytes. OS runtime bytes null with attribution reason. Separate preparation/readiness/terminal timestamps and durations.
