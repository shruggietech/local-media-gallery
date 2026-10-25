# S010 Research

Three read-only research agents were dispatched by the installed speckit-plan Phase0 workflow for native/legacy association, JSON fidelity and UI/state integration. No external private payload is copied into product source or public docs.

## Native catalog and association

**Decision**: Extend existing requested directory enumeration with a separate bounded JSON catalog. Capability capture follows RootGrant/open_media, with post-read named/opened/root checks and final epoch validation.

**Rationale**: Reading directories from the inspector would violate manual discovery. Parsing during discovery would delay first media and controls. A separate metadata revision avoids resetting media playback on sidecar-only edits.

**Alternatives considered**: Ambient paths (reject: authority expansion), lowercasing all Windows names (reject: case-sensitive directories exist), bump media revision (reject: resets playback), eager parse every document (reject: unbounded unsolicited work).

**Legacy compatibility**: Independently authored records use optional Name, StorageName, IsDirectory, IsLink, Items and nested Metadata source/type/data values. Exact full-name suffix _meta.json is included. StorageName wins over original Name. Nested directory Items retain context and do not match root siblings.

## Exact JSON

**Decision**: Ordered tagged nodes and quoted lexical numeric strings; raw UTF-8 source available explicitly. Preserve duplicate members with decoded-key occurrence addresses. Reject unsupported Unicode decoding as an attributable document result with raw lexical source retained.

**Rationale**: serde_json Value objects are maps and cannot preserve duplicate members. RawValue sent as JSON numbers would still lose precision in JavaScript. No numeric conversion is needed to inspect arbitrary JSON.

**Alternatives considered**: serde_json arbitrary_precision Value (reject: duplicate loss), RawValue plus second span scanner (viable but redundant grammar pass), new general JSON framework (unnecessary).

**Primary references**: [RFC8259](https://www.rfc-editor.org/rfc/rfc8259.html) sections4/6/8/9 discuss duplicate members, number precision, Unicode/BOM and resource limits; [serde_json Value](https://docs.rs/serde_json/latest/serde_json/value/enum.Value.html) documents map/value semantics; [RawValue](https://docs.rs/serde_json/latest/serde_json/value/struct.RawValue.html) preserves original JSON text but must cross IPC as a quoted string for this contract.

**Bounds decision**: 1MiB/document,8MiB/inspection,32documents,256catalog entries,depth64,20,000values/document; finite visible siblings50. These are reversible resource limits, not scale guarantees or content schema requirements. Exhaustion is visible and does not hide media.

## UI and persistence

**Decision**: Dedicated inspector inside existing viewer information; effect lifetime and metadata revision gate demand results. Summary selections go through existing settings fields and sparse layers.

**Rationale**: The viewer media key already preserves playback. Existing resolver handles explicit defaults, sparse inheritance, failure-as-temporary and portable relocation.

**Alternatives considered**: New metadata store (reject: duplicates precedence), eager card inspection (reject: unsolicited work), flattening into JS objects (reject: duplicate and provenance loss), selectors based on absolute filenames or global member position (reject: relocation/reordering).

**Regression seams**: Existing full-field precedence test needs a summaryFields alternative; schema duplicates field lists in settings/choices/patch/sources/savedTo. Old flat settings require serde default and optional new schema field. Actual WebView tests must cover IPC exactness, same-video continuity, lazy tree keyboard/text scale, stale responses and persisted portable choices.

## Final audit (2026-10-25)

Charged failed decoding/read bytes to the aggregate source budget after a reproduced12-versus8-document regression. Added actual filesystem alias/exact observed-hardlink precedence tests and cached association ranks before sorting. Capability canonicalization returns relative paths ([Dir documentation](https://docs.rs/cap-std/latest/cap_std/fs/struct.Dir.html)) and did not normalize filename case in the elected Windows test; native lookup identity with exact observed-name precedence is used instead. Mixed-type repeated reference members and multiple matching records remain explicitly ambiguous.

A final native filename corpus reproduced distinct invalid-UTF16 index names collapsing to the same display-derived source key. Valid Unicode index names retain index:name; non-Unicode names now use tagged native component hex (Windows UTF16 units or Unix bytes), with an explicit label annotation. This avoids a second source identity collision without adding path authority or a new persistence store.
