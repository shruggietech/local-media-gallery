# S008 native state contracts

All commands are main-window-only, blocking IO runs on spawn_blocking, root-bound commands validate expected optional sessionId through the Engine grant gate. Inputs cannot supply a portable filesystem path. Native error codes distinguish invalid input, stale session/state, conflict and unavailable storage. Durable failures retain active explicit choices and expose destination-aware warnings.

## Effective settings

load_settings(sessionId) returns existing settings/revision/warning/testPageSize plus sessionId, sources per presentation field, sparse layer presence, saved-to/unsaved attribution and available destination descriptions. Source enum: default,user,remembered,portable,session. No metadata envelope key is an editable field. Initial startup and every accepted new root load this state only for that native session. Older results or warnings are discarded in the frontend after root replacement; pending saves serialize and never materialize other inherited fields.

save_settings(request) accepts one camelCase object: sessionId, expectedRevision, destination, patch, remove (one field or null), clear (boolean). Destinations are session/user/remembered/portable. A patch contains one or more known presentation fields only. Removal requires an empty patch, applies only to remembered/portable, and clears the matching temporary field after a successful save. Clear requires an empty patch and null removal, and resets temporary fields. Invalid combinations, wrong sessions and stale revisions are rejected before mutation. Current edits apply as session choices; successful selected-target persistence is separately attributable. Existing flat user-file compatibility remains behind this sparse patch boundary.

## History

Recents are included in load_settings results (at most20 opaque id/displayPath/lastActivityMs rows). Reads never touch activity or probe media paths. Requested history writes may expire at most256 rows. reopen_recent(id) resolves the native stored path and uses ordinary Engine::open; only success records activity and attaches settings. Missing/expired IDs produce an attributable error. Failed opens preserve the usable gallery and retained record. forget_history(sessionId,expectedRevision,id) is idempotent and row-only; null id clears all history. It immediately re-resolves the active remembered contribution without clearing explicit temporary fields or recreating forgotten entries.

## File invariants

Portable envelope: product local-media-gallery, kind gallery-settings, release version0.0.0, formatVersion1, sparse choices. Preserve unknown compatible root/choice data. No sender native paths, recents, timestamps, caches or device observations are emitted. Only fixed settings.json, product coordination lock and random temporary names may be used under the current held root. Reading absent settings creates zero gallery files. Links/reparse/multiply-linked or unrelated destination data are preserved and rejected for writes. Ordinary browsing remains read-only with manual discovery.

## Clock and migration

Native tests inject time for just-before/exact/after90day cases and rollback. Timestamps are stored as INTEGER and serialized as decimal strings. Initial owned v0-to-v1 history creation is transactional; future/foreign/corrupt stores are preserved. Busy wait250ms, immediate conditional writes, normal rollback journal. No reset/rename-on-corruption or background maintenance process.

Interruption semantics: pre-commit failure retains original bytes; after durable commit, the complete validated replacement may be present. A timeout is not proof that an operation stopped. Corrupt/future/unrelated/read-only/conflicting originals are never reset or partially overwritten.
