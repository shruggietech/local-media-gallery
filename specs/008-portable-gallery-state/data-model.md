# S008 data model

## Presentation fields

Existing fields: fontScale(80/90/100), pageSize(24/48/96, test-only4), cardSize(small/medium/large), controlsExpanded(Boolean), scrollIndicator(auto/always), metadataExpanded(Boolean), filter(all/image/video), sort(name/modified/size), direction(asc/desc). Metadata version/format is not a presentation patch. Missing sparse fields inherit; explicit defaults remain real choices; null/invalid known values fail. Unknown stored nested values survive edits.

## Documents

User document remains its current flat version0.0.0/formatVersion1 JSON with unknown fields retained. Portable document: product=local-media-gallery, kind=gallery-settings, version=0.0.0, formatVersion=1, choices=sparse object, plus compatible unknown root properties. One-MiB total bound. Read does not create or migrate a file. Unsupported envelope or invalid known data yields preserved bytes, blocked writes and visible fallback. A document read tracks original bytes and revision for coordinated compare-before-commit.

## Root state

Native current grant (held Dir and canonical PathBuf), session ID, sparse session choices, per-field source, persisted destinations/unsaved outcomes, portable document state, remembered row content revision and effective-state revision. Precedence is defaults < user < remembered < portable < session. Root replacement clears session choices and resets frontend destination to user. Save response identity must match both current session and state operation ordering.

## History

One locations table: id TEXT primary key; path_encoding TEXT; native_path BLOB unique; display_path TEXT; choices_json TEXT; last_activity_ms INTEGER; revision TEXT. IDs/revisions are opaque UUIDs. Native BLOB uses unix-bytes-v1 or windows-utf16le-v1 and never comes from frontend labels. Expose times as decimal strings across JSON. Bound choices_json to one MiB and validate selected rows. Schema app identity/user_version1 must match before mutation; initialize only owned new store atomically, preserve other/future/damaged files.

Successful opens update activity without changing stored choices; remembered writes conditionally merge sparse choices/unknowns and advance their revision. Use MAX(previous,now), nonnegative epoch milliseconds, exact90-day expiry with rollback retention. Cleanup deletes at most256 indexed expired rows per requested operation. Recents select unexpired rows by last_activity_ms DESC,id ASC LIMIT20. A moved path may be a new entry. Forget/clear delete only rows and re-resolve current remembered contribution while retaining session choices. Failed opens never delete a retained record or replace a usable root.

## State transitions

No-root -> successful open -> root-attached resolved state -> temporary field edit -> optional destination write -> resolved state plus persisted/unsaved attribution. Root close/replacement retires old requests. Remove-field -> selected sparse layer removes key and session removes key -> re-resolve. Forget/clear/expiry -> remembered layer may disappear -> re-resolve without touching portable/media/cache data. Read/save failure -> warning and usable fallback/in-memory choices; no destructive reset.
