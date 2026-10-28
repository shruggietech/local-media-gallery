# S015 Data Model

## Application payload manifest

- product: literal `local-media-gallery`; kind: `windows-application-payload`; formatVersion:1; version:0.0.0.
- edition: `full` or `lite`; os:`windows`; arch:`x86_64`; targetTriple:`x86_64-pc-windows-msvc`; buildProfile:`release`.
- source: exact SHA256/file count from the source producer; revision:40 hexadecimal characters. Internal receipts retain the complete source identity.
- generation:32 lowercase hexadecimal characters from a fresh128-bit build nonce, shared by paired artifacts. Rebuilding an identical revision produces new package identities; same-artifact repetition uses the original generation. This prevents distinct MSI byte streams sharing a Windows Installer PackageCode.
- files:1..4096 unique portable relative paths, no traversal/root/drive/Windows aliases or case collisions; each has decimal byte count and lowercase64-hex SHA256. Totals are bounded to1GiB. The manifest does not hash itself; its containing inventory does.
- binary: payload member; native imports/signing/prerequisite disposition and notices are independently recorded. Optional bundled tools remain empty.

## Full bundle manifest

- kind:`windows-full-bundle`, candidate publication, shared version/source/target/release identity.
- two MSI records: scope `user`/`machine`, known product/package/component identities, exact file bytes/hash and application-payload identity.
- trusted vendor input: immutable URL, bytes/hash, version, signature observation and signer. Bootstrapper architecture is distinct from runtime architecture.
- scoped entrypoints: user-default/asInvoker and explicit-machine/administrator; each compiled entrypoint binds immutable input hashes. The outer distribution inventory hashes the entrypoints themselves, avoiding a self-hash cycle.

## Installation observation

- requested/actual scope, native destination, registered product/package/component identity and actual installed file/integration observations.
- Paths preserve native Windows identity; display text is not used as a lossless identity. Native UTF-16 bytes remain available in receipts.
- Ownership: registered installation plus matching package/source identity and actual targeted files/registrations. Loose display names/markers alone are insufficient.
- User state, gallery media/sidecars, unrelated extras and shared runtime remain outside application removal ownership.
- Unsupported replacement/recovery states are explicit. Same-artifact repetition is required; broader migration is not implied.

## Runtime observation

- native available/unavailable/error result, version/guidance, actual observed scope/path where attributable, logical bytes or null plus reason.
- Vendor invocation has exact input identity/signature, process exit and before/after observations. Exit alone is not verified success.
- Controlled native lookup failure, existing-runtime verification and actual bootstrapper execution are separate from physically clean provisioning.

## Package campaign receipt

- formatVersion1, candidate version/target, exact source/revision/producer inputs and artifact inventories/hashes.
- Host, privileges, package/entrypoint/installed identities, all terminal operation observations, native UIA/pixel evidence, fixture/state/sentinel hashes and footprints.
- Preparation, readiness, qualification, terminal timestamps and combined accounting follow the existing common qualification contract.
- Acceptance requires every elected scenario and binding. Diagnostics have acceptancefalse and cannot be promoted into passing qualification.
