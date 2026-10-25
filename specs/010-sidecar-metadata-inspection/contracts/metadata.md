# S010 Metadata Interface

## inspect_metadata

Main-window native command accepts request {sessionId,itemId,itemRevision,metadataRevision}. Renderer supplies opaque observed references, no file path. Admission occurs before blocking execution and allows one inspection. A busy/stale request returns a structured GalleryError. Responses bind all request identities, and frontend discards results after effect retirement.

Each associated document reports relative label, source role, rank, basis, ambiguity, stale/unconfirmed flag, status/message, node and optional source text. Index records carry their document path separately. Matching precedence is full-name _meta.json, full-name .json, stem .json, then explicit current-item index records. Every source remains distinct. StorageName is preferred when present; otherwise Name and elected simple filename/reference keys can match direct observed native identities. Absolute/traversal/nested/URI references never open resources or become basename matches. Nested directory records are data only.

Resource limits:1MiB/document,8MiB/inspection,32documents,256 observed JSON,depth64,20,000nodes/document. Overrun is an explicit limitation; raw UTF-8 source remains available within source bounds when parse fails. Invalid UTF8/UTF16/UTF32 are encoding results. One UTF8 BOM is accepted and annotated. Duplicate members remain ordered and numbers are lexical strings. No HTML/URL/command execution from data.

## summaryFields

Optional new known presentation field, default [], maximum32 unique {source,path} selectors. Path steps distinguish object key with occurrence from array index; maximum64 steps. Existing settings revision, sparse precedence, destination authority, failed-save-temporary and unknown-field preservation apply unchanged. No absolute paths, media URLs or opaque session IDs are stored.

## Playback and work

JSON catalog revisions are independent of media revisions. Sidecar-only Refresh cannot replace the current media node. Inspector reads occur only for focused expanded information after discovery settles, never on cards. Native tree/file work and frontend sibling display are finite. Retry is explicit; no automatic polling or directory enumeration is introduced.

Non-Unicode index component identity uses index-native:windows:UTF16HEX or index-native:unix:BYTEHEX. These are inert relative source identities, distinct from lossy display labels and arbitrary paths; selector byte bounds still apply.
