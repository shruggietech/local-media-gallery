# Measurements: Verified releases

## 2026-10-31 local qualification

Logical source SHA-256: 2ab476cb2a368ebea1b69eebfe2a9c85e8fc5b6c085d2358738983a507e8990a. This is a local uncommitted-source qualification, distinct from hosted branch-head acceptance. Native GUI/input and installer operation remain on isolated hosted runners.

| Scope | Preparation seconds | Qualification seconds | Combined seconds | Result |
| --- | ---: | ---: | ---: | --- |
| Repository, tests, docs, application, site and baseline browser | 12.195 | 72.087 | 84.282 | pass |

Target660 seconds, hard limit900 seconds, provisional finalization reserve15 seconds. Terminal timestamps are authoritative. Prerequisites and the site build precede readiness; elected checks follow readiness. A browser callback regression was corrected before this passing qualification. An independent local launcher PATH-case error failed preparation without starting qualification, then was corrected.

The private publication campaign separately exercises complete controlled future documentation snapshots and both actual renderer/browser gates; it is fixture evidence and does not claim a real release. Hosted scope timings and exact-source native/package assembly readback will be recorded after CI terminal completion.

## 2026-10-31 hosted qualification and independent readback

Run [41251491273](https://github.com/shruggietech/local-media-gallery/actions/runs/41251491273) passes all nine scopes at branch revision23606c920ce3cf5766667161f97321665f776ad8. Every retained receipt binds logical source SHA-256 b0a77b8cf39949f510f3c5b820c18e2d04884520c9a4c86936bf936d98f7eb9c and1379 files. The PR artifact suffix961e5bb is the GitHub merge identity; native qualification records explicitly identify the branch head.

| Scope | Preparation seconds | Qualification seconds | Combined seconds | Result |
| --- | ---: | ---: | ---: | --- |
| repository | 27.735 | 8.406 | 36.141 | pass |
| website | 77.379 | 65.533 | 142.912 | pass |
| product-windows | 291.431 | 424.211 | 715.642 | pass |
| product-linux | 470.407 | 98.897 | 569.304 | pass |
| product-macos | 165.896 | 103.512 | 269.408 | pass |
| windows-packages | 1029.658 | 823.934 | 1853.592 | pass |
| linux-packages | 536.252 | 502.280 | 1038.532 | pass |
| macos-packages | 523.552 | 306.773 | 830.325 | pass |
| release-validation | 100.150 | 119.347 | 219.497 | pass |

Windows package qualification exceeds the660-second advisory target, remains below the885-second provisional deadline and900-second hard limit, and passes every elected check. Preparation is reported separately and does not change qualification acceptance.

Independent readback downloads ten immutable artifact ZIPs through the production transport, compares GitHub digests, verifies all nine terminal/source receipts and original native archive hashes, reassembles the complete canonical candidate unchanged, validates all351 public static files, recomputes both retained private snapshot/renderer/output gates and runs the actual headless publication fixture browser. All pass. Native candidateId: f665663a6fb73c5c9ecec715afa8fde57a3a1edce523c76a3ed339b45581cbc1. Fixture candidateId: 1db03365bd73dd0a408d81338644a42a5e5d0b1dd50aadc61e8b97dcddd9d4dd. Controlled versions: v0.0.0, v0.1.0, v0.2.0. Original accepted archives remain unchanged.

| Artifact ID | Evidence | ZIP SHA-256 |
| --- | --- | --- |
| 13061800221 | repository | 4c917e5893540f166807c10f70f23bd5f962da9a24f9675a63520ae1a4593495 |
| 13061328186 | website | 0428959c74ba0c8e5ba0f22303a07e2e760223d7630cdb6e5849c03a15270eb1 |
| 13062180437 | product-windows | 422273408832ebec535a14a029c83ac29182c20c1d899a61b160f1322b81eb46 |
| 13061716267 | product-linux | e30b2259ecec16109615282495b5cecf1bc42ccb5dc98797e6d6cc373cbc52b0 |
| 13061413112 | product-macos | caa414a6ec5f5e52d209547fbcee5a0a0ba6ab20b4fd31c6aebf33db17722da8 |
| 13062362573 | windows-packages | e22f9a644bb32d00eccddd94ab0714c477d318d5fdbaee3574b7287a4806e79c |
| 13062350674 | linux-packages | 65f150f1e63498f905539bfe1ffc133bef84ced6424519dbbedb2c72d31f2407 |
| 13061726815 | macos-packages | 475441699ed33bdb2fafa1d49087da00325a09b3a2adc6aebf6b610d846a385a |
| 13062726773 | release-validation | a8ade403bc4c58b4ef251eab9b71b13d6bc1702f3a238f01b9f6ebbc381d8d66 |
| 13061213619 | website-static | 7369b86a7f3b4136a8521ffd5a19a4668c97bd9f9d6f22cd67562fa18fcd8c31 |

This is qualification of delivery tooling and retained candidate/fixture bytes. No actual product release or tag is created; the public specification baseline remains0.0.0. Final progress-only closeout is confined to the three preregistered exclusions, with final-head CI verified separately in the PR.
