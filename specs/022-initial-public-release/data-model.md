# S022 data model

## Product version

Canonical numeric triplet0.1.0, shared by VERSION, workspace/package/native identities and current schema metadata. Windows bounds remain255/255/65535. Historical0.0.0 contracts and strict stored-version refusal semantics remain unchanged.

## Snapshot and capture

The new manifest entry owns docs/v0.1.0, schemas/v0.1.0 and captured references under site/snapshots/v0.1.0. Complete sorted relative path/byte/hash inventory and ordinary vocabulary review are retained in site/retained/v0.1.0.json. Capture sourceRevision points to the real committed authored source; later native accepted revision is independent. Pending source status uses the existing released vocabulary while canonical service observations decide public visibility.

## Actual candidate docs receipt

A separate formatVersion1 receipt stores result pass, version, output directory, exact assembled native candidate with its candidate gate, and source manifest projection. Gate binds candidateId, actual native source revision/hash, all retained snapshot identities, current renderer hash, exact export inventory/projection and complete check outcomes. Native assembly remains unchanged. No actual publication is asserted by this private candidate output.

## Delivery state

Specified -> implemented/versioned -> authored source committed -> snapshot captured -> PR qualified/reviewed -> owner merge pending -> trusted-main qualified -> observed actual publication -> matching canonical/latest/Pages readback -> #74 complete. A source/evidence mismatch refuses advancement. Interrupted publication follows existing attributable journal/state reconciliation; it is never reported as completed until readback passes.

## Scope decisions

#20 and #21 are recorded as0.1 deferrals without permanent prohibition. #27 stays open for guided preparation using actually published Lite artifacts. No new editing/write action is authorized by browsing.
