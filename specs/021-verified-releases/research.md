# S021 research and decisions

## 2026-10-31: Existing foundations

Decision: Reuse ordinary native build.records archives and passing build/result/CI validators. Windows embeds update helpers/descriptors; Linux Full retains an external descriptor whose installer basename must stay valid. Replacement, negative and runtime-proof artifacts are not product downloads. Alternative rejected: repack accepted archives or build from another source after qualification.

Decision: Read VERSION centrally; remove unrelated baseline literals in future-version builders/validation while preserving predecessor-version and legacy probe semantics. Existing native/update APIs use numeric triplets. MSI requires major/minor/build maxima255/255/65535; Debian and Apple need no conversion in that domain. Alternative rejected: silently advertising full prerelease SemVer support that the existing native/update contracts do not implement.

Primary references: [MSI ProductVersion](https://learn.microsoft.com/en-us/windows/win32/msi/productversion), [Debian Version](https://www.debian.org/doc/debian-policy/ch-controlfields.html#version), [Apple short version](https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleshortversionstring), [Apple build version](https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleversion).

## 2026-10-31: Publication service

Decision: Use authenticated staged drafts, exact tag/source validation and actual asset byte readback. target_commitish does not resolve an existing tag's identity; peel annotated tags. List drafts with authentication, paginate assets, reconcile lost acknowledgements, and refuse foreign/mismatched bytes. A502 can leave starter assets, so unknown outcomes are observed rather than blindly retried/deleted. Publish with make_latest:false until documentation/canonical promotion completes. Strip credentials on cross-origin asset redirects and never persist signed redirect URLs.

Primary references: [GitHub Releases](https://docs.github.com/en/rest/releases/releases), [release assets](https://docs.github.com/en/rest/releases/assets), [Git refs](https://docs.github.com/en/rest/git/refs), [Git tags](https://docs.github.com/en/rest/git/tags), [API guidance](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api).

Alternative rejected: a mutable published flag embedded in immutable accepted packages. Canonical externally observed release metadata owns publication authority.

## 2026-10-31: Documentation bootstrap and history

Decision: Reuse createModel and current structural/browser checks with explicit fixture inputs. Pre-publication gate binds complete candidate/all-version inputs and renderer; observed-publication projection is qualified separately before canonical/latest promotion. This resolves the cycle without calling a candidate published. A later site projection build never rebuilds accepted native packages.

Capture complete already authored version inputs, not blind baseline string replacement. Preserve per-snapshot historical identities, captured references and source inventories. Material changes require dated corrections. Vocabulary review is a bound inventory, not an unqualified boolean; semantic review remains an authored record rather than an automated claim.

Concrete gap: version navigation omits additional schema/contract topics even though the renderer creates those pages. Introduce one shared topic helper and cross-version present/missing schema tests.

Alternatives rejected: replacing the renderer, weakening public release validation to accept candidates, or storing competing mutable publication pointers in native packages/source metadata.

Both installed-plan research agents inspected sources and primary documentation without edits or GitHub mutation. No product ambiguity remains; all implementation decisions stay inside #26/#31.
