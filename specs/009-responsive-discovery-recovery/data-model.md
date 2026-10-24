# S009 data model

## Discovery request

Opaque ID plus monotonically increasing generation, kind open/refresh, native root or expected session, independent cancellation token. One host worker and one newest pending slot. Reservation is filesystem-free. Pending/failed selection may coexist with the prior usable session.

## Discovery state

Phase opening/scanning/complete/partial/cancelled/failed/unavailable, request kind/identity, decimal-string entriesSeen/mediaSeen, optional requested-root display label and message. Counts are observations, not a total. Cancelled/terminal operations cannot commit further observations.

## Snapshot

Retains version/sessionId/root/status/revision/mediaOrigin/items/issues. Adds globally monotonic decimal-string sequence and discovery state. Sequence orders all roots including close. Item revision identifies media bytes/metadata authority; progress must not remount unchanged focused media. UI rejects lower sequence before settings activation.

## Entry

Native OsString lookup, opaque item ID/revision, file signature including available opened-handle identity, media token and per-operation confirmation. A retained unconfirmed item has stale=true; complete enumeration alone deletes unseen entries. Incomplete operation never proves deletion.

## Root grant

Held Arc<Dir> plus canonical native path. Compare held and currently named directory identity before discovery commit. All media and state access remain capability-relative. New path identity requires explicit reopen; old grant is never silently replaced.

## Lifecycle

Reserve -> opening/queued -> validate root -> scanning -> complete/partial/unavailable/failed. Cancel may atomically move a live operation to cancelled; close/root replacement retires it. Completion already committed wins over later Cancel. Newest generation supersedes old admission. Existing S008 state lifetimes follow session identity, never progress generations.

## Profile preparation and root write authority

A RootGrant owns a cloned held directory and native path, captured under a short Hub lock. Read preparation may outlive retirement but cannot mutate the live session cache or history without revalidation. A separate state commit mutex serializes actual settings/history writes and root installation/retirement. State operations acquire state, commit gate, then short Hub; no path acquires state while owning Hub/commit gate. Envelopes and portable reads run outside the commit gate. Publication never initializes settings.
