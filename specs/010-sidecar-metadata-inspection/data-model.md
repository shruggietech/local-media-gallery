# S010 Data Model

## JSON observation

Native direct-child OsString, opaque identity/signature, optional read issue and stale flag. Stored only in session. At most256 entries. Existing requested scan updates it incrementally; complete alone prunes. No JSON is parsed during observation.

## MetadataRead and result

Prepared read owns one admission permit, held directory, current media observation, bounded JSON observations, root cancellation and metadata revision. Its read runs outside authority locks. Result carries sessionId,itemId,itemRevision,metadataRevision,documents and limitations. Each document has source role, relative label, basis/rank, ambiguity/unconfirmed state, status/message, exact node or null, original UTF-8 source or null and index-record provenance.

## Exact node

Discriminated union: null; boolean(value); string(value); number(value lexical string); array(items); object(members ordered {key,value}). Duplicate keys remain multiple members. Decoded string/key values preserve JSON semantics; raw source preserves original escapes. Unsupported Unicode is an explicit parse result. Missing is not a node kind and is represented by failed selector resolution.

## SummaryField

source is a bounded semantic role (full-name-meta, full-name-json, stem-json, or index direct document label). path is an array (maximum64) of key/occurrence steps or array-index steps. At most32 unique choices; keys/source identifiers bounded within the1MiB settings document. Key occurrence counts only identical decoded keys, so unrelated object reordering does not change selection. Array positions are intentionally positional. Summary fields apply atomically as one ordinary settings field with default empty, including explicit empty override/inheritance.

## State transitions

Selection -> requested discovery invalidates metadata epoch -> catalog observations -> complete/partial/cancelled -> expanded focused information prepares read -> bounded read/parse -> final identity/epoch validation -> current result or attributable rejection. New Refresh/root/Close retires old read validity. A busy request is not queued and offers explicit retry. Partial discovery retains unconfirmed prior candidates; only complete prunes.
