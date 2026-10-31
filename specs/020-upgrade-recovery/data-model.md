# S020 data model

## Candidate

Strict formatVersion1, product local-media-gallery, software version, edition full|lite, native OS/architecture/target, generation, source sha256/files, ordinary executable path, complete owned file records (portable relative path, bytes as decimal string, sha256, executable mode), native strategy and scoped installation identity. Artifact paths are physical supplied inputs, copied and rehashed into retained transaction storage. Unknown fields, traversal, duplicates, aliases, reserved state/gallery paths and excessive sizes/counts fail validation.

## Transaction

formatVersion1; unique operationId; canonical elected destination/scope; old/new descriptors and their document hashes; retained artifact/stage/backup inventories; selected target; durable phase; terminal observations. Transaction storage is outside application-owned paths and Lite media, with physical owner-only write authority and a persistent OS lock. Never trust a phase without physical reconciliation.

## Phase

Prepared -> Applying/PriorRetained -> CandidateActivated/Verifying -> Committed; failure may enter Incomplete/Conflict or Restoring -> Restored. Native Debian Unpacked is a named applying boundary. Every destructive action is preceded by durable intent and verified retention. A crash after rename but before journal update is recovered by old/new/absent path classification and retained hashes, not blind replay.

## Compatibility result

Selected settings, portable and history operands; each absent|compatible|incompatible|unreadable. Current writer supports existing format1 and product version0.0.0. Incompatible/unreadable blocks activation; missing state is observed without creation. Other profiles remain untouched and are checked by their normal writer on launch.

## Terminal result

operationId, old/selected candidate identities, destination/scope, status complete|already-current|restored|incomplete|conflict, actual native registration/inventory/integration observations and diagnostic/recovery path. Native process termination and actual installed verification are required independently; launch/download/timeout alone cannot certify success.

## Durable native supervision and displacement

Immutable identity.json binds destination, both complete candidates and selected state; its digest binds journal.json. Native intent/job/process records bind the same transaction and selected native action. The native-process terminal fact is independent of coordinator liveness and phase. Deterministic same-parent displacement names include the identity binding and live-path digest, and only old/new owned bytes are eligible for cleanup. Complete prior/new files and native archives remain in private transaction storage after success or recovery.

Native MSI recaching retains per-job source directories and source receipts. A receipt binds the immutable transaction header, prior/next side, installed source filename, relative private path and complete archive bytes/hash. The source filename is an actual native PackageName leaf, not a caller-selected directory. Unknown staging contents or changed copies refuse before native client launch; copies remain retained after completion.
