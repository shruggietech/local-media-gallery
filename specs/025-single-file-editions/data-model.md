# S025 data model

ProductArtifact: version, edition(full|lite), platform(windows|linux|macos), architecture, format, filename, byte length, sha256, executable identity, embedded content inventory, source identity. Exactly one row per edition/platform/architecture; no duplicate product entrypoints.

EmbeddedMetadata: format version, product/version/edition/platform/architecture/source, notice text and applicable host prerequisites. Bound to final artifact identity by outer release record; avoid self-referential hash cycles.

DependencyInventory: feature, OS facility or bundled payload, exact version/hash/provenance/license/source/build configuration. Every implemented feature has coverage; Full helper selection verifies owned installed identity.

InstallationReceipt: system scope, managed destination, payload and native-package identity, retained internal update/recovery inputs. State: absent -> prepared -> installed -> upgrading -> installed/restored -> removed. Foreign collisions refuse transition. Media/settings are outside owned deletion scope.

Legacy records: v0.1 artifact/archive decoding remains explicit and unchanged; new0.2 direct-file consumption does not reinterpret historical hashes.
