# S030 measurements

## Accepted implementation

Implementation revision: 5df79c3dad1ebe6a42e21060c1b5dbf5e11e7784. Source inventory: 6df7ea4e3a9205225d1b99d78d091a51b9d6a807b08f1bba707553933c4db857 (1627 files). [All nine CI jobs](https://github.com/shruggietech/local-media-gallery/actions/runs/41989184337) completed successfully. These are actual terminal receipts, with preparation and qualification accounted separately. The closing commit is checked independently; its final revision, run and artifact hashes belong in PR #96 to avoid a self-referencing commit.

| Scope | Artifact ID | Preparation seconds | Qualification seconds | Combined seconds |
| --- | --- | ---: | ---: | ---: |
| repository | 13397203705 | 41.722 | 16.227 | 57.949 |
| website | 13397228159 | 101.920 | 81.242 | 183.162 |
| product-windows | 13397966357 | 320.744 | 436.468 | 757.212 |
| product-linux | 13398075974 | 529.902 | 110.996 | 640.898 |
| product-macos | 13398180660 | 299.975 | 166.244 | 466.219 |
| windows-packages | 13399191363 | 842.307 | 841.774 | 1684.081 |
| linux-packages | 13398617680 | 1096.836 | 288.968 | 1385.804 |
| macos-packages | 13398502073 | 728.794 | 532.549 | 1261.343 |
| release-validation | 13398544640 | 437.002 | 174.813 | 611.815 |

The PR deployment job is expected to be skipped; no public Pages deployment or release publication was performed. Each scope retains the 660-second advisory target, 900-second hard limit and 15-second provisional finalization reserve. Windows packaging exceeded the advisory target and remained within the hard limit and reserve. No mandatory lifecycle case or actual elapsed preparation was omitted.

## Windows recipient evidence

The single unsigned Full recipient file is local-media-gallery-0.2.1-full-x86_64-windows.msi, 245469184 bytes, SHA-256 878ae93ea5873552de60371f180034128d21ef3e9437c84c6fa14efbc8d6c39a. Independent HTTP-range artifact readback hashed the entire MSI and checked its compound-file header. Fresh license, scope, options, success and cancellation screenshots were visually inspected. No installer or desktop input ran on the owner workstation.

The passing hosted campaign includes 29 lifecycle/subprocess checks, all eight scope/integration choices, both cached repairs, absent-runtime offline provisioning, real standard-user install/removal, observed runtime cancellation, repeated installation/replacement/repair/rollback/removal, actual Full/Lite and prepared-recipient use, and exact published v0.1.0/v0.2.0 update/rollback/recovery. Legacy compatibility copies retain independent hash, identity and ownership readback.

## Limits and deviations

The installer evidence comes from isolated hosted Windows Server. Windows 10/11 authorization prompts were not observed. The existing published v0.1.0 long-location component lookup defect remains tracked in #97; its exact affected threshold is unproved. Its published bytes and guards were not changed.

SC-005 review-cap exception: three external review rounds occurred against the requested maximum of two. All five received findings have fixes, replies and resolved GitHub threads. No further review requests are allowed; later implementation commits have no fresh external approval. Reviewer-owned checklist approval remains unclaimed.

Version 0.2.1 remains unpublished, and final merge and release publication belong to the owner.
