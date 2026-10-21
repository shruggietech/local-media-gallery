# Brand integration

## Identity and authority

ShruggieTech maintains the identity in [shruggietech/shruggie-brand](https://github.com/shruggietech/shruggie-brand) and publishes guidance at [brand.shruggie.tech](https://brand.shruggie.tech/). The consumed brand slug is `localmedia-gallery`; the display name is Local Media Gallery. The reusable slogan is "Your media presented beautifully." The approved description is "A lightweight, interactive gallery for browsing local images and videos."

The local authority is the exact delivered [consumer contract](../../brand/kit/enforcement/consumer-contract.json) and [implementation guidance](../../brand/kit/enforcement/IMPLEMENTATION.md), together with their referenced source/bundle/interface/recipe/version documents. Hosted guidance describes current upstream output and must not silently replace the contract for pinned local bytes. Product requirements remain owner-directed; a brand rule does not authorize unrelated usage restrictions.

The ownership endorsement is "A ShruggieTech project" and must remain outside logo clear space. Use delivered logo, icon, wordmark, social-image and font assets for their intended roles rather than recreating them from screenshots or drawing substitutes.

## Delivered version tuple

The installed integration lock records the current locally consumed archive and its identity. These are brand-system versions, independent of the product release number.

| Domain | Delivered version |
| --- | --- |
| Brand | 1.0.0 |
| BrandBuilder | 3.1.0 |
| Brand Canon | 2.1.0 |
| Interface Canon | 1.0.1 |
| Component recipes | 1.1.0 |
| Web/React adapter | 1.1.0 |
| egui adapter | 1.0.2 |
| WordPress adapter | 1.0.0 |

The included egui and WordPress bindings do not change the selected Rust/Tauri and Next.js product architecture. The local archive is recorded as supplied-archive origin with candidate publication status. This describes its actual provenance; it is not evidence of a formal hosted download or a product release candidate.

## Applying the interface binding

The delivered semantic token and component contracts own colors, spacing, radii, typography and shared-control behavior. Space Grotesk supplies display typography, Geist supplies body typography and Geist Mono supplies code/metadata typography at the delivered weights. Jade/Deep Jade roles follow the actual light/dark semantic bindings. Avoid substituting a stock framework palette or synthesizing undeclared font weights.

Use the [web adapter](../../brand/kit/web/adapter.json), [component recipes](../../brand/kit/enforcement/component-recipes.json) and [interface tokens](../../brand/kit/tokens/interface.css) before composing shared controls. React consumers must honor the selected delivered adapter's dependency pins and static/client boundaries. The presence of an adapter does not require installing all optional framework bindings.

AppFrame and its selected native-host profile must have a single owner for safe areas, scrolling, fixed chrome, titlebar avoidance and focus. Do not apply the same inset in both native and web layers. The gallery's domain screens, item layout and navigation remain product code within the applicable brand vocabulary.

Keyboard operability, visible focus, adequate contrast, non-color status cues and reduced-motion behavior apply across the application, landing page and docs. See [browsing and playback](browsing-and-playback.md#interaction-accessibility-and-feedback) and [website and documentation](website-and-documentation.md#accessibility-and-content-quality) for product interaction requirements.

## Provenance and updates

`brand/lock.json` records archive SHA-256, manifest hash, source revision, versions, origin kind and publication status. `brand/kit/` contains exact delivered bytes, including licensing and the consumer instructions. Governed bytes must be updated through `scripts/sync-brand-kit.mjs`, not edited by hand.

The current maintainer commands are:

```text
npm run brand:verify
npm run brand:check
npm run brand:update
```

Verification checks installed bytes offline. Checking is read-only and inspects stable upstream releases containing this project's kit. Updating verifies the release source, archive digest and manifest inventory, stages a replacement and restores the prior kit if replacement fails. Ordinary application startup must not be made dependent on a maintainer brand-update operation.

A supplied archive can be imported explicitly with `node scripts/sync-brand-kit.mjs --import PATH_TO_ZIP`. Manifest integrity is checked, while the lock retains supplied origin and the archive's actual publication status. A formal release may replace a supplied candidate of the same version. An already formalized version must not silently change bytes. If no matching stable release exists, checking reports awaiting-release and updating preserves the installed copy while reporting the missing release.

## Licensing and validation

Brand assets and bundled dependencies retain the kit's [source license](../../brand/kit/LICENSE), [brand license](../../brand/kit/LICENSE-BRAND.md) and [notices](../../brand/kit/NOTICE), including font attribution. Copies staged into the application or website must preserve applicable notices and remain traceable to the pinned kit.

Manifest verification establishes byte identity, not rendered accessibility or UI correctness. Applying the kit requires the relevant delivered verifier/linter checks and rendered inspections for the affected surface. Recovery tooling must follow the exact archive/hash instructions in the bundled contract; extracting or modifying governed files outside the updater is not a substitute for a recorded integration update.

No unapproved identity redesign is part of this specification. A missing visual/component capability should be identified against the delivered contract and resolved explicitly rather than invented locally.

Return to the [index](index.md) or consult the [glossary](glossary.md).
