# Metadata and sidecars

## Metadata model

Metadata has distinct sources: current filesystem observations, facts obtained from media, and nearby external documents. The gallery presents them with provenance so disagreement can be inspected. **MD-01:** Source metadata MUST be optional. A media item with no sidecar or incomplete metadata remains browsable.

External JSON does not need a Local Media Gallery schema. Objects, arrays, strings, numbers, booleans and null roots are accepted within the resource/encoding policy. Recognized conventions provide association, while unfamiliar nested keys and values remain inspectable. Application-owned settings and native messages use their own [contracts](interfaces-and-contracts.md); these do not impose a schema on external documents.

## Association and discovery

**MD-02:** Each association MUST have an explainable basis. Proximity alone must not attach every JSON document to every item. The interface retains competing sources, identifies ambiguous matches and shows matching basis in this order:

| Rank | Convention for harbor.jpg | Source role |
| --- | --- | --- |
| 0 | harbor.jpg_meta.json | full-name-meta |
| 1 | harbor.jpg.json | full-name-json |
| 2 | harbor.json | stem-json |
| 3 | Explicit matching index record in another observed JSON document | index:document-name.json |

Ranking orders sources without merging or hiding lower-ranked values. A stem document shared by harbor.jpg and harbor.png is labelled ambiguous. Exact observed native names match first, including separately named hardlinks; a lookup alias must also resolve to the same native resource. The application does not blindly lowercase all Windows paths. Native filenames remain authority internally; lossy display labels never supply file paths.

Existing requested opening/Refresh observes visible direct JSON files using the same held-root/no-link policy as media. It does not parse them during discovery. Expanded focused Information reads those observations on demand; cards, closed information and snapshots do not read sidecar contents or enumerate directories. There is no background metadata scan or watcher.

### Index and explicit-reference conventions

Optional index records may be a top-level object, entries of a top-level array, or direct entries of a top-level Items, items or files array. StorageName is preferred when present; Name is considered only when StorageName is absent. Otherwise the first present filename, file or path field supplies explicit references. Key names are case-sensitive JSON keys. Repeated reference members remain visible and make a matching association ambiguous. A present invalid reference does not silently fall back to another field.

Only a single direct-child native filename can match an already observed media item. Absolute, traversing, nested and URI references are not reduced to basenames or opened. Stale/deleted entries cannot manufacture media. Records marked IsDirectory or IsLink true are not file matches. Direct Items of the root index may describe the selected directory; nested directory Items retain their context as data and are not flattened onto root siblings. Several matching records remain separate attributed sources with an ambiguity label. A count explains stale or out-of-scope records. Unrelated documents are not attached; failures that prevent index matching appear as inspection limitations.

For example, this independently authored index can describe a currently observed harbor.jpg:

```json
{
  "Items": [
    {
      "Name": "camera-original.jpg",
      "StorageName": "harbor.jpg",
      "Metadata": [
        {"Source": "camera", "Type": "capture", "Data": {"Exposure": "1/125"}}
      ],
      "Custom": {"reviewed": true, "sequence": 4}
    }
  ]
}
```

These are optional recognition conventions. No key, casing, type or nesting becomes mandatory for a filename-associated sidecar. Unknown fields and remaining index source text stay available for inspection.

## Inspection and field inclusion

**MD-03:** Information MUST expose accepted recognized and unknown fields without silently discarding valid content. Nested objects and arrays expand with keyboard or pointer. Descendants mount only on disclosure; siblings appear in steps of 50. Long scalar values have a 256-character preview and explicit full-value disclosure. Original UTF-8 source is available on demand, including when parsing or a tree resource limit prevents structured inspection.

Each source shows its relative document label, association basis, ambiguity and unconfirmed status. Index sources also show their record location. Current filesystem/runtime facts stay separate from sidecar-reported values; arbitrary names such as size or date do not replace authoritative facts or imply a verified timestamp interpretation.

Include in summary selects a field; Remove from summary removes that choice. Up to 32 source-role/field-address choices use the existing Save changes to destination. Key addresses use decoded key plus zero-based duplicate occurrence; array addresses use zero-based position. Unrelated object-member reordering does not change a key address. Array reordering intentionally changes what that positional address finds. Choices contain no sender absolute paths or session/media URLs. A non-Unicode index filename uses index-native:windows: followed by UTF-16 code-unit hex, or index-native:unix: followed by native-byte hex. This keeps distinct sources distinguishable when their display labels contain replacement characters. These identifiers are relative filename identities, never file-access authority; a filename that cannot transfer between native encodings may remain Missing on another platform.

All existing temporary, user, remembered and portable precedence/inheritance rules apply to the complete summaryFields array. An explicit empty array overrides a lower layer; omission inherits. Missing fields are labelled Missing, while unavailable documents retain their status. A source absent from an incomplete inspection is distinguished by the reported limits. Selector addresses have at most 64 steps, with source/key strings bounded to 1,024 UTF-8 bytes; very long keys remain inspectable even when they cannot be persisted as a selector.

**MD-04:** Transport and display MUST distinguish missing, null, false, zero and empty values. Ordered tagged nodes preserve repeated object members and numeric lexical text (including -0, 1.00 and large exponents) without converting numbers into JavaScript numbers. Strings/keys decode their JSON escapes; retained original source preserves spelling and whitespace. The owned metadata tree/result schema documents this representation without constraining the external document.

## Conflicts and freshness

**MD-05:** Opening and explicit Refresh MUST reconcile candidate observations and invalidate affected information/summary results. A separate metadata revision changes independently of media identity. A sidecar-only Refresh keeps healthy media URLs, the current media element and playback position. Only complete discovery removes unobserved JSON candidates; incomplete/cancelled discovery retains prior candidates with unconfirmed attribution.

Requests identify session, item observation and metadata revision. The host captures held-root/read authority briefly, performs file/parser work outside discovery/state-write authority, and checks observed/opened/named resource identity before and after reading. It revalidates current authority before returning. The interface also rejects completion after navigation, Close or a newer request. A changed document returns a changed/Refresh result rather than silently scanning. A busy inspection offers explicit Retry; it is not queued or polled. Closing or selecting another root does not wait behind a sidecar read.

## Parsing, limits and source preservation

[RFC 8259](https://www.rfc-editor.org/rfc/rfc8259.html) defines JSON syntax and interoperability considerations, including duplicate names, number precision, Unicode and permitted resource limits.

**MD-06:** Invalid, unreadable or oversized metadata MUST produce attributable results while media remains usable. Inspection never repairs or overwrites external documents. HTML, scripts, links and command-looking strings are displayed as data.

| Resource | Initial bound |
| --- | --- |
| Observed JSON catalog | 256 direct documents per session |
| Inspection search | 32 observed documents, exact naming candidates first |
| Source bytes | One MiB/document, eight MiB/inspection |
| Tree depth and values | 64 levels and 20,000 values/document |
| Result representation | 32 attributed sources and eight MiB of represented document data |
| Visible siblings | 50 per disclosure step |

Limits are resource policies, not content schemas or demonstrated collection-scale guarantees. Exhausted search/catalog/result budgets report incompleteness. Parsing failures within the byte budget retain raw UTF-8 source; oversized/unreadable files are not presented as fully parsed. Explicit Refresh can recover after repair or removal.

One leading UTF-8 BOM is accepted with an annotation. Invalid UTF-8, UTF-16 and UTF-32 produce encoding results without replacement decoding. Invalid escapes and unpaired surrogate escapes produce an invalid/unsupported-Unicode result with original UTF-8 source available. Duplicate keys remain ordered repeated members; no last-value overwrite occurs. Number tokens are validated lexically and retained exactly, without imposing floating-point range limits.

## Open decisions

U-06 association, duplicate-key and encoding choices are defined here. No curated reinterpretation is required for generic inspection. The metadata part of U-08 transport and U-10 parsing/display limits is settled above; command/job interfaces remain with their owning chapter, while [measured loading policy](thumbnails-and-performance.md#adaptive-loading) defines initial adaptation and evidence limits.

See [configuration and state](configuration-and-state.md), the [index](index.md) and the [glossary](glossary.md).
