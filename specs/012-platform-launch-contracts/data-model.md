# S012 Data Model

- ArtifactIdentity: product local-media-gallery, version0.0.0, edition full/lite, OS, architecture, target/build flavor and exact binary/source hashes in proof receipts. Edition is compiled, not read from a mutable manifest.
- NativePath: encoding windows-utf16le or unix-bytes, exact bytes array; separate display string is never authority. Windows bytes must be even length; bytes0..255. Existing history storage reuses the codec.
- LaunchRequest: operation open/resolve/prepare/install/capabilities/help/version, optional native root, wait/detach, JSON flag. Invalid/duplicate/conflicting options reject before profile/gallery changes. Explicit root resolves with native absolute semantics.
- OperationResult: formatVersion1, product/version/edition/OS/arch, nonempty operationId, operation/boundary, status accepted/success/running/partial/cancelled/unavailable/failed, nullable error/processId/sessionId/discoveryOperationId/root/progress/data. PIDs/counters decimal strings. Explicit null retains absence.
- StartupReceipt: private nonce, operationId, child PID and result, max16KiB, absolute30s deadline across connection/payload. Matching receipt consumed once; accepted confirms bridge/root submission only. Child-exit/timeout remain attributable, with unknown child lifetime on timeout.
- PlatformMatrix: per-row OS/arch, intended baseline and dependency/package/scope/signing rules. Qualification status names actual observations and unqualified dimensions. Normative matrix never labels an unexecuted future runner result as passed.
- ProofReceipt: source/revision/host/image/toolchain, normal Full/Lite binary/archive/payload inventory, exact logical sizes with basis, runtime observation and unknowns, check outcomes and separate timings. Archive hash is external to its own manifest.

Transitions: parsed request → resolved intent → finite result OR waiting UI → startup acceptance → independent UI lifetime. Discovery uses existing reserved operation ID/generation, running/terminal transitions and stale rejection. Finite unavailable providers never enter a write phase.
