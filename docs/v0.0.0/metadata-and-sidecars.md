# Metadata and sidecars

## Metadata model

Metadata has distinct sources: current filesystem observations, facts obtained from media, and nearby external documents. The gallery presents them with provenance so that disagreement can be inspected. **MD-01:** Source metadata MUST be optional. A media item with no sidecar or incomplete metadata remains browsable.

External JSON need not implement a Local Media Gallery schema. Objects, arrays, strings, numbers, booleans and null values can carry useful information. Existing index-style documents may include original/stored names, identifiers, hashes, timestamps, nested directory entries and arrays containing source/type/data records. Recognizing these conventions must not require them from every document.

Application-owned settings and internal messages may use versioned structures. Their validation must not be applied as an eligibility check to arbitrary media sidecars. [Interfaces and contracts](interfaces-and-contracts.md) defines this separation.

## Association and discovery

The application inspects candidate JSON documents close to a media item. **MD-02:** Each association MUST have an explainable basis, such as an exact filename convention, an explicit reference or an agreed legacy mapping. Proximity alone must not attach all JSON in a directory to every item. Multiple candidates and uncertain matches must remain distinguishable.

Possible conventions include `harbor.jpg_meta.json`, `harbor.jpg.json` and `harbor.json`; these are association examples, not a finalized matching order. Full filenames distinguish `harbor.jpg` from `harbor.png`, while basename-only matches can be ambiguous. Case-sensitive and case-insensitive filesystems must be handled using actual filesystem semantics.

Directory-wide indexes may contain records for several files. Their matching, recursion, stored-name interpretation and stale-entry policy are U-06. Such indexes must not become authoritative proof that a deleted media file still exists or that an unrelated external path should be opened.

## Inspection and field inclusion

**MD-03:** The information view MUST expose recognized and unrecognized fields without silently discarding valid content. Nested objects and arrays need an expandable or equivalent navigable presentation. Users must be able to select useful fields for summary inclusion, with their choices persisted through the configuration contract.

An illustrative sidecar can contain ordinary JSON such as:

```json
{
  "Title": "Harbor at dusk",
  "Tags": ["water", "evening"],
  "Metadata": [
    {
      "Source": "camera",
      "Type": "capture",
      "Data": {"Exposure": "1/125", "Notes": null}
    }
  ],
  "Custom": {"reviewed": true, "sequence": 4}
}
```

This example does not establish required keys, casing, types or nesting. A future adapter may offer friendly labels and convenient projections, while retaining the original document and its source attribution. Formatting a date or joining a tag array is a view transformation, not authorization to rewrite the source.

**MD-04:** Display and transport MUST distinguish missing, null, false, zero and empty values. JSON numbers must not silently lose precision when passed through JavaScript. Where an exact value cannot be represented natively by the chosen frontend type, a lossless display/transport representation or original lexical value is required. Exact transport encoding remains U-08.

## Conflicts and freshness

Current file facts and sidecar-reported facts may disagree. Both can be useful, and the interface must attribute them. A stale stored path must not override the active gallery root. A timestamp must retain its source and available offset/unit information; an ambiguous value must not be silently interpreted as a verified capture date.

**MD-05:** A sidecar change observed during opening or explicit Refresh MUST invalidate affected metadata views and derived sort/filter values. Sidecar inspection must follow the manual discovery policy rather than introduce a background scan. The application must avoid applying results from an older sidecar read after a newer read has completed. File deletion, replacement and partial writes must be recoverable without corrupting the rest of the gallery.

## Parsing, limits and source preservation

[RFC 8259](https://www.rfc-editor.org/rfc/rfc8259.html) defines JSON syntax and interoperability considerations. The gallery needs bounded parsing and display work for large or deeply nested inputs. Limits must be described as resource constraints, with a clear result for the affected document, rather than a new metadata schema or content-usage restriction.

**MD-06:** Invalid, unreadable or oversized sidecars MUST produce an attributable metadata result while the media item remains usable. The application must not repair or overwrite an external document during ordinary inspection. Source text that resembles HTML, scripts or executable commands must be displayed as data.

Duplicate keys, nonstandard encodings and non-JSON values require explicit policy. Until that policy is fixed, an implementation must not claim that a lossy parse preserves every source value. A raw-source inspection fallback should identify its limitations and avoid rendering the source as active markup.

## Open decisions

U-06 owns naming/precedence, ambiguous associations, directory-wide indexes, curated mappings and duplicate-key/encoding policy. U-08 owns exact value transport. Parser and display budgets belong to U-10. The requirements to preserve source documents, attribute values and allow schema-free inspection are already settled.

See [configuration and state](configuration-and-state.md), the [index](index.md) and the [glossary](glossary.md).
