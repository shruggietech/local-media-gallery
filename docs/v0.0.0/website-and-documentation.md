# Website and documentation

## Independent website surfaces

The public website uses Next.js. It has a landing page that introduces the product and a documentation surface that explains version-specific behavior. **WD-01:** The landing page MUST have its own content, layout and navigation entry points outside the versioned documentation source tree. It must be usable without mounting the documentation layout or loading documentation-only search/diagram/highlighting runtimes.

Shared brand tokens, assets and selected components are appropriate. Independent composition does not require separate domains or infrastructure. The landing page can provide product explanation, edition/platform choices, download information, documentation links and support/license access. Its release/download assertions must come from verified release records; absent or unpublished packages must not receive fabricated download destinations.

The website does not provide a mandatory runtime service for local galleries. Native application assets and optional sharing payloads remain governed by their own distribution contracts.

## Documentation sources and routes

**WD-02:** A documentation version MUST have a complete Markdown source snapshot and identifiable navigation order. Each chapter has one semantic topic path. Relative chapter links must resolve within the selected snapshot, rather than accidentally directing readers into the current release.

| Route | Contract |
| --- | --- |
| `/` | Independent landing page |
| `/docs/` | Documentation entry with visible version context |
| `/docs/v0.0.0/` | This baseline's documentation index when published |
| `/docs/<version>/<topic>/` | Stable topic within an explicit retained version |
| `/docs/latest/` | Alias or generated route for the latest published documentation snapshot |

When product releases exist, latest documentation must correspond to the current published product release. A pre-product documentation snapshot must retain its specification context and must not imply downloadable product artifacts. Alias mechanics may use generated static pages or supported routing; the static hosting target must not depend on unsupported server-only redirect behavior.

Source names such as `overview.md` are authored files; rendered topic URLs omit implementation-only source details. The renderer must correctly rewrite chapter, image, fragment and reference links for their versioned output location. The exact navigation/version metadata representation is U-12.

## Version selection and historical behavior

**WD-03:** Readers MUST be able to choose a retained documentation version. Switching should preserve the current topic when it exists in the target snapshot. If it does not, the UI must explicitly say so and provide the selected version's index or an appropriate mapped topic. It must not silently display latest content beneath an older version label.

Version context must remain visible in navigation and search results. Search must identify its scope, and a result must identify the documentation version it opens. Cross-version links may be explicit, but ordinary within-chapter navigation must not escape a selected snapshot accidentally.

Older documentation describes its corresponding release. Retention is not a promise that every old binary remains supported or that every old settings format can be written by the latest software. Those compatibility claims belong to [verification and compatibility](verification-and-compatibility.md#compatibility-and-version-identity).

## Release-linked build and checks

**WD-04:** Every product release MUST recompile its documentation and check the retained documentation snapshots against the current website build. Checks must cover source rendering, navigation, local links/fragments, static assets, version selection and application-owned JSON references/examples. A previously published snapshot must not disappear because the latest chapter set changed.

The release record must bind software version, documentation snapshot and master application schema version when released together. Historical schema examples must continue to use their matching schema snapshots. Latest aliases and landing downloads must not advance to a candidate before the corresponding publication is verified.

Website build compatibility may require renderer adapters for old Markdown conventions. Such adaptations must preserve the historical meaning. Material corrections to an archived contract require an explicit correction policy under U-12; they must not silently rewrite what a release claimed. Historical/version-change prose remains in the master changelog.

## Changelog, JSON and public boundaries

**WD-05:** The site MUST render the master `CHANGELOG.md` and application-owned JSON contracts as readable pages, with source/raw access where appropriate. The changelog has one authored source; avoid divergent manual copies for the landing page and docs. Versioned schema pages must expose their version and structured content, not only offer an opaque download.

The master schema's structure should be rendered generically, including nested objects and composition where used, rather than maintaining a hand-written field list that can drift. A version with no application schema must not receive a fabricated contract. User sidecars are not uploaded into this public reference.

Public navigation must exclude internal planning, issue-tracking artifacts and implementation evidence. Public pages must be understandable without access to private design material, local machine paths or another project's requirements. Build staging and asset-copy operations must honor the brand contract and licenses.

## Accessibility and content quality

**WD-06:** Landing and documentation navigation MUST be keyboard usable and expose meaningful headings, links, focus and version labels. Markdown examples must distinguish specified behavior from commands a user can run. Diagrams explain relationships or meaningful branches; linear procedures use numbered steps. Responsive layouts must preserve navigation and readable code/reference content.

Glossary terms must have precise definitions, primary learning references and relevant local usage links. Major releases require a documentation vocabulary rescan and glossary refresh. A change in site tooling is not permission to change historical product semantics.

## Open decisions

U-12 owns the Markdown/docs framework, search integration, navigation/version metadata, alias implementation and archived-correction policy. Next.js, independent landing composition, retained version selection and release-linked recompilation/checking are agreed requirements. Site implementation and external publication are separate delivery work.

Return to the [index](index.md) or consult the [glossary](glossary.md).
