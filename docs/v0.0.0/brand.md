# Brand integration

ShruggieTech maintains the identity in [shruggietech/shruggie-brand](https://github.com/shruggietech/shruggie-brand) and publishes guidance at [brand.shruggie.tech](https://brand.shruggie.tech/).

The project consumes the `localmedia-gallery` kit. `brand/lock.json` records its archive SHA-256, manifest hash, source revision, versions, origin kind and publication status. `brand/kit/` contains the exact delivered bytes, including asset and font licensing.

## Import and update

Run `npm run brand:verify` to check installed bytes offline. Run `npm run brand:check` to inspect the latest stable upstream release containing this kit without changing files. Run `npm run brand:update` to download, verify and stage a new official kit before replacing the installed copy. The updater checks GitHub release asset provenance, archive SHA-256 and every file listed in the manifest. It rejects path traversal, links, ambiguous paths and corrupt payloads, and restores the previous kit if replacement fails.

When the owner supplies an archive before its release is available, import it with `node scripts/sync-brand-kit.mjs --import PATH_TO_ZIP`. Manifest integrity is checked, but this does not authenticate it as a hosted release. The lock records `supplied-archive` and the kit's actual publication status. A formal release can replace a supplied candidate with the same version. A published version cannot silently change bytes.

If upstream has no stable release containing this kit, `brand:check` reports `awaiting-release`; `brand:update` reports the missing release and leaves the installed copy intact. Checks and tests otherwise run offline.

## Apply the kit

Read [the consumer contract](../../brand/kit/enforcement/consumer-contract.json) and [implementation guidance](../../brand/kit/enforcement/IMPLEMENTATION.md) before writing UI. Choose the relevant adapter after the product stack is agreed. Do not edit governed bytes directly. The kit contains adapters for multiple environments; their presence is not a product architecture decision.
