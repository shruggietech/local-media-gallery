# S024 research decisions

## 2026-11-01: Existing service and release analysis

Decision: retain the thumbnail worker and add a session-bound guided coordinator. Rationale: its preview/progress/cancel/helper-exit semantics already exist. Alternatives: duplicating its worker would diverge admission and cleanup behavior. Native lifecycle cancels both services and waits before shutdown; no discovery gate is held across network or thumbnail waits.

Decision: acquire complete published Lite artifacts using native HTTPS and bounded ZIP/tar.gz readers. Rationale: gallery-update is offline and validates only the current native host, so it cannot select foreign recipient payloads. Node maintainer scripts define the canonical record/inventory contract but are not a sender dependency. Canonical JSON+LF, immutable candidate hash, published/native provenance, gate/publication binding and exact artifact/inventory hashes are mandatory. Primary APIs: [reqwest](https://docs.rs/reqwest/0.13.5/reqwest/), [ZIP reader](https://docs.rs/zip/9.2.1/zip/read/struct.ZipArchive.html), [tar reader](https://docs.rs/tar/0.4.46/tar/struct.Archive.html). Extract only regular files/directories in private staging, retaining executable modes and rejecting links/special/duplicate/traversal paths.

Decision: preserve complete packages in per-platform folders and expose root launch entrypoints. Rationale: published0.1 Lite placement resolves executable parent or outer app parent, while packages have conflicting support-file names. Root Windows executable is a byte-identical copy; root macOS app is a complete copy; Linux relative shell entrypoint explicitly passes its outer gallery. Alternatives: merging support files causes collisions; placing all executables in subfolders silently opens wrong roots. Preview accounts for retained bundles and duplicated entrypoints.

Decision: advance unreleased contracts to 0.2.0, retain shipped0.1 snapshots and prepare compatible0.1 presentation. Rationale: recipients are existing0.1 binaries and reject other release labels. Current sender adds explicit compatible0.1 portable-state acceptance, while unrelated future formats remain preserved. Public current release remains0.1 until separately authorized publication.

Decision: require expected expanded controls in the Windows startup predicate. Rationale: current generic settingsControlsReady accepts both Show and Hide and permits a transient default to reach a later immediate assertion. Keep25000ms startup deadline and retain root/settings/last UIA diagnostics for persistent mismatch.

Research was dispatched to recipient-contract and native-integration agents during Spec Kit planning. No unresolved architecture choices remain.

Native HTTPS uses the existing locked reqwest 0.13.5 family with host native TLS, async send/body cancellation and bounded redirects. ZIP central-directory counts and tar decompression/extension sizes are checked before convenience-parser allocations. Complete original archives retain Unix mode metadata on sender filesystems that cannot represent those modes. Native recipient qualification checks actual executable modes on the elected Unix hosts.
