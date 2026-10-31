# Recipient update contract

The companion lmg-update CLI accepts explicit supplied old/new candidate descriptors and an elected destination/scope, with selected read-only state operands. update prepares retained inputs, switches through the native adapter and verifies. recover reconciles a retained transaction and finishes the selected candidate or reports a specific conflict. rollback selects retained prior bytes only after compatibility preflight. status is read-only. Exact flags follow the implemented CLI and public installation guide.

Named durable boundaries and invariants are normative in plan.md: Prepared, Applying/PriorRetained (including Debian Unpacked), CandidateActivated/Verifying, Committed, Restoring/Restored, Incomplete/Conflict. Mutation-before-next-journal-write must be recoverable from actual old/new/absent inventory and retained hashes. Unknown content is a conflict. Only terminal native observation plus complete owned inventory and ordinary executable identity can certify complete/restored.

Exit0: verified complete/already-current/restored/status. Nonzero: incomplete/conflict/invalid invocation; structured JSON retains operation and recovery path. Unknown native service continuation stays incomplete until observed terminal state. No operation initializes or resets recipient data, removes gallery roots or shared runtime, or publishes a release.

## Process and filesystem boundary

A native supervisor owns a separate destination lease until the native client ends and its terminal record persists. Killing the coordinator can leave installation active; recovery must wait or report incomplete. Direct-file displacement remains beside live files with exclusive no-replace renames, independently verified old/new bytes and durable retained inputs on any selected volume. Unknown displaced content is preserved. Windows recovery storage is created with explicit private ACLs and trusted ancestry; existing untrusted storage is never silently repaired. macOS receipt reads require physical regular single-link files owned by the current effective installation user with no group/world write bits.
