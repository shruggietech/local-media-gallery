# S018 data model

## Linux payload

Product local-media-gallery, formatVersion1, version0.0.0, edition full|lite, os linux, arch x86_64, targetTriple x86_64-unknown-linux-gnu, buildProfile release, random32hex generation, source64hex/files and revision40hex. Relative binary/entrypoint, prerequisite dependency string and fixed Full package destinations. Files are unique safe relative regular files with decimal-string byte counts, SHA256 and mode644|755. Candidate metadata is separately hashed and included in final container inventory; its own recursive hash is not embedded in itself.

## Full registered installation

Package local-media-gallery, Debian version0.0.0 and architecture amd64. Own /usr/lib/local-media-gallery, one /usr/bin command, one /usr/share/applications entry and exact hicolor icon files. Embedded maintainer authority binds metadata hash, exact fixed file list/bytes/modes and expected registered candidate. Fresh/config-files requires absent destinations; same candidate verifies all owned files before replacement/removal; foreign/modified/link states reject. dpkg owns copying/removal; no application-owned destructive transaction.

## Artifact and evidence

Archive path/SHA256/decimal bytes, complete regular-file inventory/modes, raw derived dependency/control metadata, source/revision and signing disposition. Native observations bind exact ordinary ELF hash/PID/edition, external root, bounded AT-SPI tree, actual screenshot/crop hash, changing decoded video frames and finite owned PCM. Unknown observations remain unavailable, never fabricated0. Download/extracted/application/runtime/optional-tool footprint records retain distinct basis and nullable bytes with explicit status.

## Lifecycle

Absent/config-files -> collision checks -> unpack -> configure/readback -> installed -> same-candidate verify/reinstall OR pre-removal ownership check -> remove -> config-files -> purge. Any collision/modified state stops destructive work. Documented dpkg abort handlers unwind without pretending install succeeded. Gallery/user data never enters owned package inventory.
